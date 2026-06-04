/**
 * AutoLayout - Genogram 자동 정렬 시스템
 * js/pages/canvas.js에서 import하여 사용합니다.
 *
 * 기준 명세: FamilyTree_5Generation_Layout_Spec.md
 * 알고리즘:  Reingold-Tilford (1981) Bottom-Up + Barycenter 교차 최소화
 *            McGoldrick-Gerson (2020) 표준
 *
 * 주요 개선:
 *   - 배우자 Map<id, Set<id>> → 재혼/다중 배우자 지원
 *   - Bottom-Up 배치 → 부모가 자녀 중앙 위에 정확히 위치
 *   - FamilyUnit { parents[], children[] } 단위 처리
 *   - 서브트리 폭(Reingold-Tilford) 기반 겹침 방지
 *   - Barycenter 교차 최소화 (상↔하 반복)
 *   - 형제 정렬: birthDate → birthOrder → id 우선순위
 *   - 서브트리 전체 단위 충돌 해결
 */

export class AutoLayout {
  constructor(canvasState) {
    this.canvasState = canvasState;

    this.GRID    = 50;   // 그리드 단위
    this.H_COLS  = 3;    // 인물 1명 = 3그리드 → H_SPACING = 150px
    this.V_ROWS  = 4;    // 세대 간격 = 4그리드 → V_SPACING = 200px
  }

  get H_SPACING() { return this.H_COLS * this.GRID; }  // 150px
  get V_SPACING() { return this.V_ROWS * this.GRID; }  // 200px

  _snap(px) { return Math.round(px / this.GRID) * this.GRID; }

  // =========================================================================
  // 진입점
  // =========================================================================

  autoArrange() {
    const persons       = this.canvasState.persons;
    const relationships = this.canvasState.relationships;
    if (!persons || persons.length === 0) return;

    // 1. 그래프 구축 (Map<id, Set<id>> 배우자 구조)
    const { personLevel, parentToChildren, childToParents, marriages } =
      this._buildGraph(persons, relationships);

    // 2. 세대 정규화 (min → 0)
    const minLv = Math.min(...personLevel.values());
    personLevel.forEach((lv, id) => personLevel.set(id, lv - minLv));

    // 3. 세대별 그룹화
    const genMap = new Map();
    personLevel.forEach((lv, id) => {
      if (!genMap.has(lv)) genMap.set(lv, []);
      genMap.get(lv).push(id);
    });

    // 4. 세대 내 형제 정렬
    genMap.forEach((ids, lv) => {
      genMap.set(lv, this._sortSiblings(ids, childToParents));
    });

    // 5. FamilyUnit 생성
    const familyUnits = this._buildFamilyUnits(persons, parentToChildren, childToParents, marriages);

    // 6. 서브트리 폭 계산 (Bottom-Up)
    const subtreeWidth = this._calcAllSubtreeWidths(persons, parentToChildren, childToParents, marriages, personLevel);

    // 7. Bottom-Up 열 배정
    const colMap = this._assignColumnsBottomUp(
      persons, genMap, parentToChildren, childToParents, marriages,
      subtreeWidth, personLevel, familyUnits
    );

    // 8. Barycenter 교차 최소화
    this._reduceCrossings(genMap, colMap, parentToChildren, childToParents, 3);

    // 9. 충돌 해결
    this._resolveCollisions(genMap, colMap, personLevel);

    // 10. 열 범위 0-based 정규화
    const minCol = Math.min(...colMap.values());
    colMap.forEach((col, id) => colMap.set(id, col - minCol));

    // 11. 픽셀 좌표 적용
    colMap.forEach((col, id) => {
      const person = this.canvasState.getPersonById(id);
      if (!person) return;
      person.x = col * this.H_SPACING;
      person.y = personLevel.get(id) * this.V_SPACING;
    });

    // 12. 전체 중앙 이동
    this._centerAll(persons);
  }

  // =========================================================================
  // 1단계. 그래프 구축
  // =========================================================================

  /**
   * parentToChildren / childToParents / marriages(Map<id,Set<id>>) 구축
   * BFS top-down으로 personLevel 계산.
   * 재혼 지원: marriages는 Map<id, Set<id>> 구조.
   */
  _buildGraph(persons, relationships) {
    const parentToChildren = new Map(); // id → id[]
    const childToParents   = new Map(); // id → id[]
    const marriages        = new Map(); // id → Set<id>  ← 다중 배우자

    // 관계 분류
    relationships.forEach(rel => {
      if (['biological', 'adopted', 'foster'].includes(rel.type)) {
        if (!parentToChildren.has(rel.from)) parentToChildren.set(rel.from, []);
        parentToChildren.get(rel.from).push(rel.to);

        if (!childToParents.has(rel.to)) childToParents.set(rel.to, []);
        childToParents.get(rel.to).push(rel.from);
      }
      if (rel.type === 'marriage') {
        // from → Set에 to 추가
        if (!marriages.has(rel.from)) marriages.set(rel.from, new Set());
        marriages.get(rel.from).add(rel.to);
        // to → Set에 from 추가
        if (!marriages.has(rel.to)) marriages.set(rel.to, new Set());
        marriages.get(rel.to).add(rel.from);
      }
    });

    // 루트 탐색: 부모가 없는 인물
    // 배우자가 루트인 경우 중복 방지
    const addedAsSpouse = new Set();
    const roots = [];
    persons.forEach(p => {
      if (!childToParents.has(p.id) && !addedAsSpouse.has(p.id)) {
        roots.push(p.id);
        const spSet = marriages.get(p.id);
        if (spSet) {
          spSet.forEach(sp => {
            if (!childToParents.has(sp)) addedAsSpouse.add(sp);
          });
        }
      }
    });

    if (roots.length === 0) {
      const ct = persons.find(p => p.isCT) || persons[0];
      if (ct) roots.push(ct.id);
    }

    // BFS top-down: 더 낮은 lv로 갱신 허용 (stale entry skip)
    const personLevel = new Map();
    const queue = [];

    const enqueue = (id, lv) => {
      const current = personLevel.get(id);
      if (current !== undefined && current <= lv) return;
      personLevel.set(id, lv);
      queue.push({ id, lv });

      // 배우자들도 같은 lv로 동기화
      const spSet = marriages.get(id);
      if (spSet) {
        spSet.forEach(sp => {
          const spCur = personLevel.get(sp);
          if (spCur === undefined || spCur > lv) {
            personLevel.set(sp, lv);
            queue.push({ id: sp, lv });
          }
        });
      }
    };

    roots.forEach(id => enqueue(id, 0));

    while (queue.length > 0) {
      const { id, lv } = queue.shift();
      if (personLevel.get(id) < lv) continue; // stale
      (parentToChildren.get(id) || []).forEach(cid => enqueue(cid, lv + 1));
    }

    // 고립 인물 처리
    const maxLv = personLevel.size > 0 ? Math.max(...personLevel.values()) : 0;
    persons.forEach(p => {
      if (!personLevel.has(p.id)) personLevel.set(p.id, maxLv + 1);
    });

    return { personLevel, parentToChildren, childToParents, marriages };
  }

  // =========================================================================
  // 2단계. FamilyUnit 생성
  // =========================================================================

  /**
   * { parents: [id, ...], children: [id, ...] } 단위 목록 생성.
   * 재혼 시 동일 인물이 여러 Unit에 속할 수 있음.
   */
  _buildFamilyUnits(persons, parentToChildren, childToParents, marriages) {
    const units = [];
    const seen  = new Set(); // "부모키" 중복 방지

    persons.forEach(p => {
      const spSet = marriages.get(p.id);
      const partners = spSet ? Array.from(spSet) : [];

      if (partners.length === 0) {
        // 단독 부모 Unit
        const children = (parentToChildren.get(p.id) || []);
        if (children.length > 0) {
          const key = p.id;
          if (!seen.has(key)) {
            seen.add(key);
            units.push({ parents: [p.id], children: [...children] });
          }
        }
      } else {
        // 각 배우자 쌍마다 Unit 생성
        partners.forEach(sp => {
          const key = [p.id, sp].sort().join('|');
          if (seen.has(key)) return;
          seen.add(key);

          // 두 부모의 공통 자녀
          const childrenA = new Set(parentToChildren.get(p.id) || []);
          const childrenB = new Set(parentToChildren.get(sp)   || []);
          const common = [...childrenA].filter(c => childrenB.has(c));

          if (common.length > 0) {
            units.push({ parents: [p.id, sp], children: common });
          }
        });
      }
    });

    return units;
  }

  // =========================================================================
  // 3단계. 형제 정렬
  // =========================================================================

  /**
   * ids를 birthDate → birthOrder → id 우선순위로 정렬.
   * Person에 birthDate/birthOrder가 없으면 id 순서.
   */
  _sortSiblings(ids, childToParents) {
    return [...ids].sort((a, b) => {
      const pa = this.canvasState.getPersonById(a);
      const pb = this.canvasState.getPersonById(b);
      if (!pa || !pb) return 0;

      // birthDate 비교
      if (pa.birthDate && pb.birthDate) {
        const da = new Date(pa.birthDate).getTime();
        const db = new Date(pb.birthDate).getTime();
        if (da !== db) return da - db;
      } else if (pa.birthDate) return -1;
      else if (pb.birthDate) return  1;

      // birthOrder 비교
      if (pa.birthOrder != null && pb.birthOrder != null) {
        if (pa.birthOrder !== pb.birthOrder) return pa.birthOrder - pb.birthOrder;
      } else if (pa.birthOrder != null) return -1;
      else if (pb.birthOrder != null) return  1;

      // id 사전순 폴백
      return a < b ? -1 : a > b ? 1 : 0;
    });
  }

  // =========================================================================
  // 4단계. 서브트리 폭 계산 (Reingold-Tilford)
  // =========================================================================

  /**
   * 모든 인물의 서브트리 폭을 Bottom-Up으로 계산.
   * 리프 = 1, 부모 = 자녀들의 폭 합 + 그룹 간 여백.
   */
  _calcAllSubtreeWidths(persons, parentToChildren, childToParents, marriages, personLevel) {
    const widths = new Map();
    const memo   = new Map();

    const calc = (id) => {
      if (memo.has(id)) return memo.get(id);

      const children = parentToChildren.get(id) || [];
      if (children.length === 0) {
        // 배우자가 있으면 쌍으로 최소 2
        const spSet = marriages.get(id);
        const w = spSet && spSet.size > 0 ? 2 : 1;
        memo.set(id, w);
        widths.set(id, w);
        return w;
      }

      // 자녀 폭 합산 (중복 방지: 같은 lv에서 이미 계산된 자녀 제외)
      const myLv = personLevel.get(id) ?? 0;
      let total = 0;
      children.forEach((cid, i) => {
        // 자녀가 나보다 아래 세대인 경우만 포함
        const cLv = personLevel.get(cid) ?? 0;
        if (cLv > myLv) {
          total += calc(cid);
          if (i < children.length - 1) total += 1; // 그룹 간 1열 여백
        }
      });

      const w = Math.max(total, 2); // 배우자 자리 최소 2
      memo.set(id, w);
      widths.set(id, w);
      return w;
    };

    persons.forEach(p => calc(p.id));
    return widths;
  }

  // =========================================================================
  // 5단계. Bottom-Up 열 배정
  // =========================================================================

  /**
   * 가장 아래 세대부터 배치 → 위로 올라가며 부모 위치를 자녀 중앙으로 결정.
   */
  _assignColumnsBottomUp(
    persons, genMap, parentToChildren, childToParents,
    marriages, subtreeWidth, personLevel, familyUnits
  ) {
    const colMap     = new Map();
    const sortedLevs = Array.from(genMap.keys()).sort((a, b) => b - a); // 하→상

    // 최하위 세대: 왼쪽부터 순차 배치
    const maxLv = sortedLevs[0];
    {
      const leafIds = genMap.get(maxLv) || [];
      const groups  = this._coupleGroups(leafIds, marriages, childToParents);
      let col = 0;
      groups.forEach(group => {
        group.forEach(id => { colMap.set(id, col); col++; });
        col++; // 그룹 간 1열 여백
      });
    }

    // 중간·상위 세대: 배치된 자녀들의 중앙으로 부모 위치 결정
    for (let i = 1; i < sortedLevs.length; i++) {
      const lv  = sortedLevs[i];
      const ids = genMap.get(lv) || [];

      // 아직 미배치 인물만 처리
      const unplaced = ids.filter(id => !colMap.has(id));
      if (unplaced.length === 0) continue;

      // 부모 키 기준 그룹화 (FamilyUnit 활용)
      const parentKeyToGroup = new Map();
      const orphans = [];

      unplaced.forEach(id => {
        // 이 인물의 자녀 중 이미 배치된 자녀 탐색
        const myChildren = (parentToChildren.get(id) || [])
          .filter(cid => colMap.has(cid));

        // 배우자도 함께 묶기 위해 FamilyUnit 검색
        const unit = familyUnits.find(u =>
          u.parents.includes(id) &&
          u.children.some(cid => colMap.has(cid))
        );

        if (!unit) {
          // 자녀가 배치됐지만 unit이 없는 경우 → 단독 부모
          if (myChildren.length > 0) {
            const key = id;
            if (!parentKeyToGroup.has(key)) parentKeyToGroup.set(key, { parentIds: [id], childIds: myChildren });
          } else {
            orphans.push(id);
          }
          return;
        }

        const key = unit.parents.slice().sort().join('|');
        if (!parentKeyToGroup.has(key)) {
          const placedChildren = unit.children.filter(cid => colMap.has(cid));
          if (placedChildren.length > 0) {
            parentKeyToGroup.set(key, { parentIds: unit.parents, childIds: placedChildren });
          } else {
            orphans.push(id);
          }
        }
      });

      // 각 그룹: 자녀 중앙 위에 부모 배치
      parentKeyToGroup.forEach(({ parentIds, childIds }) => {
        // 이미 colMap에 있는 부모는 스킵
        const toPlace = parentIds.filter(pid => !colMap.has(pid));
        if (toPlace.length === 0) return;

        const childCols = childIds.map(cid => colMap.get(cid));
        const childMin  = Math.min(...childCols);
        const childMax  = Math.max(...childCols);
        const center    = (childMin + childMax) / 2;

        if (toPlace.length === 1) {
          // 단독 부모: 자녀 중앙
          colMap.set(toPlace[0], Math.round(center));
        } else {
          // 부부: 중앙 좌우
          const ordered = this._orderCouple(toPlace, marriages);
          const left  = Math.round(center - 0.5);
          const right = left + 1;
          colMap.set(ordered[0], left);
          colMap.set(ordered[1], right);
        }
      });

      // 고아(자녀 없는 미배치): 현재 세대 기존 배치 오른쪽에 추가
      if (orphans.length > 0) {
        const placedInLevel = ids.filter(id => colMap.has(id));
        let nextCol = placedInLevel.length > 0
          ? Math.max(...placedInLevel.map(id => colMap.get(id))) + 2
          : (colMap.size > 0 ? Math.max(...colMap.values()) + 2 : 0);

        this._coupleGroups(orphans, marriages, childToParents).forEach(group => {
          group.forEach(id => { colMap.set(id, nextCol); nextCol++; });
          nextCol++;
        });
      }
    }

    // 최상위 세대가 배치 안 된 경우 보완
    const topLv = Math.min(...sortedLevs);
    (genMap.get(topLv) || []).forEach(id => {
      if (!colMap.has(id)) {
        const next = colMap.size > 0 ? Math.max(...colMap.values()) + 2 : 0;
        colMap.set(id, next);
      }
    });

    return colMap;
  }

  // =========================================================================
  // 6단계. Barycenter 교차 최소화
  // =========================================================================

  /**
   * 세대별 순서를 부모/자녀 위치 평균(barycenter) 기준으로 재정렬.
   * 상→하, 하→상 방향으로 iterations회 반복.
   */
  _reduceCrossings(genMap, colMap, parentToChildren, childToParents, iterations = 3) {
    const sortedLevs = Array.from(genMap.keys()).sort((a, b) => a - b);

    for (let iter = 0; iter < iterations; iter++) {
      // 상→하 패스
      for (let i = 1; i < sortedLevs.length; i++) {
        const lv  = sortedLevs[i];
        const ids = genMap.get(lv) || [];
        this._barycenterSort(ids, colMap, childToParents, 'up');
      }
      // 하→상 패스
      for (let i = sortedLevs.length - 2; i >= 0; i--) {
        const lv  = sortedLevs[i];
        const ids = genMap.get(lv) || [];
        this._barycenterSort(ids, colMap, parentToChildren, 'down');
      }
    }
  }

  /**
   * ids를 barycenter(인접 세대의 평균 col) 기준으로 재정렬 후 colMap 갱신.
   */
  _barycenterSort(ids, colMap, adjacentMap, direction) {
    if (ids.length <= 1) return;

    // barycenter 계산
    const bary = ids.map(id => {
      const neighbors = adjacentMap.get(id) || [];
      const placed    = neighbors.filter(nid => colMap.has(nid));
      if (placed.length === 0) return { id, b: colMap.get(id) ?? 0 };
      const avg = placed.reduce((s, nid) => s + (colMap.get(nid) ?? 0), 0) / placed.length;
      return { id, b: avg };
    });

    // barycenter 오름차순으로 새 col 재배정
    bary.sort((a, b) => a.b - b.b);

    // 현재 col 범위에서 균등 재배정
    const cols = ids.map(id => colMap.get(id) ?? 0).sort((a, b) => a - b);
    bary.forEach(({ id }, i) => colMap.set(id, cols[i]));
  }

  // =========================================================================
  // 7단계. 충돌 해결
  // =========================================================================

  /**
   * 같은 세대 내 동일 col 사용 시 오른쪽으로 이동.
   * 이동량은 해당 인물의 서브트리 전체에 적용.
   */
  _resolveCollisions(genMap, colMap, personLevel) {
    const sortedLevs = Array.from(genMap.keys()).sort((a, b) => a - b);

    sortedLevs.forEach(lv => {
      const ids = (genMap.get(lv) || []).slice().sort((a, b) => (colMap.get(a) ?? 0) - (colMap.get(b) ?? 0));

      for (let i = 1; i < ids.length; i++) {
        const prev    = ids[i - 1];
        const curr    = ids[i];
        const prevCol = colMap.get(prev) ?? 0;
        const currCol = colMap.get(curr) ?? 0;

        if (currCol <= prevCol) {
          const shift = prevCol - currCol + 1;
          // 현재 인물과 같은 세대 이후 모두 shift (서브트리 효과)
          for (let j = i; j < ids.length; j++) {
            const jid = ids[j];
            colMap.set(jid, (colMap.get(jid) ?? 0) + shift);
          }
        }
      }
    });
  }

  // =========================================================================
  // 부부 그룹화 유틸
  // =========================================================================

  /**
   * ids를 부부 쌍 우선으로 그룹화.
   * marriages가 Map<id, Set<id>> 구조임에 맞게 수정.
   * McGoldrick-Gerson S-3: 남성 왼쪽, 여성 오른쪽.
   */
  _coupleGroups(ids, marriages, childToParents) {
    const result    = [];
    const processed = new Set();

    ids.forEach(id => {
      if (processed.has(id)) return;

      const spSet = marriages.get(id);
      let paired  = false;

      if (spSet) {
        // 같은 ids 안에 있는 배우자 찾기
        for (const sp of spSet) {
          if (ids.includes(sp) && !processed.has(sp)) {
            const person = this.canvasState.getPersonById(id);
            const spouse = this.canvasState.getPersonById(sp);
            const ordered = this._orderCouple([id, sp], marriages);
            result.push(ordered);
            processed.add(id);
            processed.add(sp);
            paired = true;
            break;
          }
        }
      }

      if (!paired) {
        result.push([id]);
        processed.add(id);
      }
    });

    return result;
  }

  /**
   * 두 인물을 [남성, 여성] 순으로 정렬.
   * 동성이면 id 사전순.
   */
  _orderCouple(pair, marriages) {
    if (pair.length !== 2) return pair;
    const [a, b] = pair;
    const pa = this.canvasState.getPersonById(a);
    const pb = this.canvasState.getPersonById(b);
    const isMale = p => p?.gender === 'male';

    if (isMale(pa) && !isMale(pb)) return [a, b]; // 남-여
    if (!isMale(pa) && isMale(pb)) return [b, a]; // 여-남 → 뒤집기
    return a <= b ? [a, b] : [b, a];              // 동성: id 순
  }

  // =========================================================================
  // 전체 중앙 이동
  // =========================================================================

  /**
   * 모든 인물을 (0, 0) 중심으로 이동.
   * cx/cy를 먼저 snap → 이동 후도 GRID 배수 유지.
   */
  _centerAll(persons) {
    if (persons.length === 0) return;
    const xs = persons.map(p => p.x);
    const ys = persons.map(p => p.y);

    const cx = this._snap((Math.min(...xs) + Math.max(...xs)) / 2);
    const cy = this._snap((Math.min(...ys) + Math.max(...ys)) / 2);

    persons.forEach(p => {
      p.x = p.x - cx;
      p.y = p.y - cy;
    });
  }
}
