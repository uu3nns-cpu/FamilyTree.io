/**
 * AutoLayout - 가계도 자동 정렬 시스템
 *
 * 기준 명세: LAYOUT_ALGORITHM_SPEC.md (최우선 적용)
 * 알고리즘:  Top-Down 열 배정 + nextFreeCol 겹침 방지
 * 표준:      McGoldrick-Gerson (2020), Reingold-Tilford (1981)
 *
 * 구현 원칙:
 *   - Step 1~8은 LAYOUT_ALGORITHM_SPEC.md §4 흐름을 그대로 따름
 *   - 세대값: BFS top-down only (역방향 없음, 더 낮은 lv 갱신 허용)
 *   - 열 배정: 최상위 세대부터 Top-Down (명세 §7)
 *   - 겹침 방지: nextFreeCol 전진 방식 (명세 §3-6)
 *   - 배우자: Map<id, Set<id>> 다중 배우자 지원
 *   - 부부 순서: 남성 왼쪽, 여성 오른쪽 (S-3)
 *   - 형제 순서: 출생순 왼쪽→오른쪽 (S-4)
 */

export class AutoLayout {
  constructor(canvasState) {
    this.canvasState = canvasState;

    this.GRID      = 50;  // 그리드 단위 (px)
    this.H_COLS    = 3;   // 인물 1명 = 3그리드 → H_SPACING = 150px
    this.V_ROWS    = 4;   // 세대 간격 = 4그리드 → V_SPACING = 200px
  }

  get H_SPACING() { return this.H_COLS * this.GRID; } // 150px
  get V_SPACING() { return this.V_ROWS * this.GRID; } // 200px

  /** px → 가장 가까운 GRID 배수로 스냅 */
  _snap(px) { return Math.round(px / this.GRID) * this.GRID; }

  // ===========================================================================
  // 진입점
  // ===========================================================================

  /**
   * 자동정렬 실행 (LAYOUT_ALGORITHM_SPEC.md §4 Step 1~8)
   */
  autoArrange() {
    const { persons, relationships } = this.canvasState;
    if (!persons || persons.length === 0) return;

    // Step 1. 그래프 구축
    const { personLevel, parentToChildren, childToParents, marriages } =
      this._buildGraph(persons, relationships);

    // Step 2. 세대값 정규화 (min → 0)
    const minLv = Math.min(...personLevel.values());
    personLevel.forEach((lv, id) => personLevel.set(id, lv - minLv));

    // Step 3. 세대별 그룹화
    const genMap = new Map(); // lv → id[]
    personLevel.forEach((lv, id) => {
      if (!genMap.has(lv)) genMap.set(lv, []);
      genMap.get(lv).push(id);
    });

    // 각 세대 내 형제 정렬 (S-4: 출생순)
    genMap.forEach((ids, lv) => {
      genMap.set(lv, this._sortByBirth(ids));
    });

    // Step 4. 열 배정 (Top-Down: lv 0 → max)
    const colMap = this._assignAllColumns(genMap, parentToChildren, childToParents, marriages);

    // Step 5. col 범위 0-based 정규화
    const minCol = Math.min(...colMap.values());
    colMap.forEach((col, id) => colMap.set(id, col - minCol));

    // Step 6. 픽셀 좌표 적용
    //   person.x = col × H_SPACING  (H_SPACING = 3×GRID → 자동으로 GRID 배수)
    //   person.y = lv  × V_SPACING  (V_SPACING = 4×GRID → 자동으로 GRID 배수)
    colMap.forEach((col, id) => {
      const person = this.canvasState.getPersonById(id);
      if (!person) return;
      person.x = col * this.H_SPACING;
      person.y = personLevel.get(id) * this.V_SPACING;
    });

    // Step 7. 미배치 인물 처리 (colMap에 없는 고립 인물)
    const maxCol = colMap.size > 0 ? Math.max(...colMap.values()) : -1;
    let orphanCol = maxCol + 2;
    persons.forEach(p => {
      if (!colMap.has(p.id)) {
        p.x = orphanCol * this.H_SPACING;
        p.y = (personLevel.get(p.id) ?? 0) * this.V_SPACING;
        orphanCol++;
      }
    });

    // Step 8. 전체 (0,0) 중앙 이동
    this._centerAll(persons);
  }

  // ===========================================================================
  // Step 1. 그래프 구축 (LAYOUT_ALGORITHM_SPEC.md §5)
  // ===========================================================================

  /**
   * 관계 데이터로부터 parentToChildren / childToParents / marriages 맵을 구축하고
   * BFS top-down으로 personLevel을 계산한다.
   *
   * 핵심 규칙:
   *   - "더 낮은 lv로 갱신 허용" → 증조부모 나중 추가 시 전체 재계산
   *   - 역방향 BFS(childToParents) 없음 → 루트 탐색에서 처리
   *   - 배우자는 항상 같은 lv
   */
  _buildGraph(persons, relationships) {
    const parentToChildren = new Map(); // id → id[]
    const childToParents   = new Map(); // id → id[]
    const marriages        = new Map(); // id → Set<id>

    // 관계 분류
    relationships.forEach(rel => {
      const isParentChild = ['biological', 'adopted', 'foster'].includes(rel.type);
      const isMarriage    = rel.type === 'marriage';

      if (isParentChild) {
        if (!parentToChildren.has(rel.from)) parentToChildren.set(rel.from, []);
        if (!parentToChildren.get(rel.from).includes(rel.to))
          parentToChildren.get(rel.from).push(rel.to);

        if (!childToParents.has(rel.to)) childToParents.set(rel.to, []);
        if (!childToParents.get(rel.to).includes(rel.from))
          childToParents.get(rel.to).push(rel.from);
      }

      if (isMarriage) {
        if (!marriages.has(rel.from)) marriages.set(rel.from, new Set());
        if (!marriages.has(rel.to))   marriages.set(rel.to,   new Set());
        marriages.get(rel.from).add(rel.to);
        marriages.get(rel.to).add(rel.from);
      }
    });

    // 루트 탐색: childToParents에 없는 인물이 최상위 세대
    // 단, 이미 다른 루트의 배우자로 처리된 인물은 중복 제외
    const addedAsSpouseRoot = new Set();
    const roots = [];

    persons.forEach(p => {
      if (childToParents.has(p.id)) return;    // 자녀가 있으면 루트 아님
      if (addedAsSpouseRoot.has(p.id)) return; // 이미 배우자 루트로 추가됨

      roots.push(p.id);

      // 이 루트의 배우자들도 같은 레벨이므로 중복 방지 처리
      const spSet = marriages.get(p.id);
      if (spSet) {
        spSet.forEach(sp => {
          if (!childToParents.has(sp)) addedAsSpouseRoot.add(sp);
        });
      }
    });

    // 루트가 없으면 (순환 참조 등): CT 또는 첫 번째 인물을 루트로
    if (roots.length === 0) {
      const ct = persons.find(p => p.isCT) || persons[0];
      if (ct) roots.push(ct.id);
    }

    // BFS top-down: 더 낮은 lv로 갱신 허용 + stale entry skip
    const personLevel = new Map();

    const enqueue = (() => {
      const queue = [];
      let head = 0;

      const push = (id, lv) => {
        const cur = personLevel.get(id);
        // 이미 더 좋은(낮은) lv를 갖고 있으면 스킵
        if (cur !== undefined && cur <= lv) return;
        personLevel.set(id, lv);
        queue.push({ id, lv });

        // 배우자 동기화 (항상 같은 lv)
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

      const process = () => {
        while (head < queue.length) {
          const { id, lv } = queue[head++];
          // stale entry: 이미 더 낮은 lv로 갱신됐으면 무시
          if ((personLevel.get(id) ?? Infinity) < lv) continue;

          // 자녀에게 lv+1 전파
          (parentToChildren.get(id) || []).forEach(cid => push(cid, lv + 1));
        }
      };

      roots.forEach(id => push(id, 0));
      process();
    })();

    // 고립 인물(BFS에 포함 안 된 인물): 현재 max lv + 1에 배치
    const currentMax = personLevel.size > 0 ? Math.max(...personLevel.values()) : 0;
    persons.forEach(p => {
      if (!personLevel.has(p.id)) personLevel.set(p.id, currentMax + 1);
    });

    return { personLevel, parentToChildren, childToParents, marriages };
  }

  // ===========================================================================
  // Step 3-helper. 형제 정렬 (S-4: 출생순)
  // ===========================================================================

  /**
   * 출생일 → birthOrder → id 순으로 정렬한 새 배열을 반환.
   */
  _sortByBirth(ids) {
    return [...ids].sort((a, b) => {
      const pa = this.canvasState.getPersonById(a);
      const pb = this.canvasState.getPersonById(b);
      if (!pa || !pb) return 0;

      // 1순위: birthDate
      if (pa.birthDate && pb.birthDate) {
        const diff = new Date(pa.birthDate) - new Date(pb.birthDate);
        if (diff !== 0) return diff;
      } else if (pa.birthDate) return -1;
      else if (pb.birthDate) return  1;

      // 2순위: birthOrder
      if (pa.birthOrder != null && pb.birthOrder != null) {
        if (pa.birthOrder !== pb.birthOrder) return pa.birthOrder - pb.birthOrder;
      } else if (pa.birthOrder != null) return -1;
      else if (pb.birthOrder != null) return  1;

      // 3순위: id 사전순
      return a < b ? -1 : a > b ? 1 : 0;
    });
  }

  // ===========================================================================
  // Step 4. 열 배정 — Top-Down (LAYOUT_ALGORITHM_SPEC.md §7)
  // ===========================================================================

  /**
   * 세대 0부터 max까지 순서대로 각 세대의 인물에 열 번호를 배정한다.
   *
   * Case A (lv 0, 최상위): 커플 쌍 단위로 왼쪽부터 순서대로
   * Case B (lv 1+): 부모 평균 col 기준 ideal_start + nextFreeCol 겹침 방지
   *
   * @returns {Map<id, col>} colMap
   */
  _assignAllColumns(genMap, parentToChildren, childToParents, marriages) {
    const colMap     = new Map();
    const sortedLevs = Array.from(genMap.keys()).sort((a, b) => a - b);

    sortedLevs.forEach((lv, i) => {
      const ids = genMap.get(lv) || [];

      if (i === 0) {
        // === Case A: 최상위 세대 ===
        // 커플 쌍 단위로 묶어 왼쪽부터 순서대로 배치
        let col = 0;
        const groups = this._coupleGroups(ids, marriages);
        groups.forEach(group => {
          group.forEach(id => {
            colMap.set(id, col);
            col++;
          });
          // 그룹 간 1열 여백
          col++;
        });
      } else {
        // === Case B: 이후 세대 ===
        // 미배치 인물만 처리 (이미 윗 세대에서 배치된 배우자 등 예외)
        const unplaced = ids.filter(id => !colMap.has(id));
        if (unplaced.length === 0) return;

        this._assignChildLevel(
          unplaced, colMap, parentToChildren, childToParents, marriages
        );
      }
    });

    return colMap;
  }

  /**
   * 자녀 세대 열 배정 (Case B 상세 구현, §7 Case B)
   *
   * 1) 각 자녀를 부모키(정렬된 부모 id 조합)로 그룹화
   * 2) 그룹을 부모 평균 col 기준으로 왼쪽→오른쪽 정렬
   * 3) 각 그룹: ideal_start 계산 → nextFreeCol과 max → 배치
   * 4) 부모 없는 고아: 맨 오른쪽에 배치
   */
  _assignChildLevel(ids, colMap, parentToChildren, childToParents, marriages) {
    // 부모키 → { parentIds, childIds } 맵 구성
    const parentKeyMap = new Map(); // parentKey → { parentIds, childIds, avgParentCol }
    const orphans      = [];

    ids.forEach(id => {
      const myParents = (childToParents.get(id) || [])
        .filter(pid => colMap.has(pid)); // 이미 배치된 부모만

      if (myParents.length === 0) {
        orphans.push(id);
        return;
      }

      const key = [...myParents].sort().join('|');

      if (!parentKeyMap.has(key)) {
        const avgCol = myParents.reduce((s, pid) => s + colMap.get(pid), 0) / myParents.length;
        parentKeyMap.set(key, { parentIds: myParents, childIds: [], avgParentCol: avgCol });
      }
      parentKeyMap.get(key).childIds.push(id);
    });

    // 그룹을 부모 평균 col 기준 오름차순 정렬
    const groups = Array.from(parentKeyMap.values())
      .sort((a, b) => a.avgParentCol - b.avgParentCol);

    // nextFreeCol 전진 방식으로 배치
    let nextFreeCol = 0;

    groups.forEach(({ childIds, avgParentCol }) => {
      // 커플 그룹화 포함한 실제 배치 순서
      const coupleGroups = this._coupleGroups(childIds, marriages);
      const span = coupleGroups.reduce((s, g) => s + g.length, 0);

      // ideal_start: 부모 중심 아래 균등 배치 (§3-4)
      const idealStart = Math.round(avgParentCol - (span - 1) / 2);
      const startCol   = Math.max(idealStart, nextFreeCol); // 겹침 방지

      let col = startCol;
      coupleGroups.forEach(group => {
        group.forEach(id => {
          colMap.set(id, col);
          col++;
        });
        // 같은 그룹 내 커플 쌍 사이에는 여백 없음 (연속 배치)
      });

      nextFreeCol = startCol + span + 1; // 1열 여백
    });

    // 고아 처리: colMap에 현재 배치된 인물 중 최대 col 오른쪽에 배치
    if (orphans.length > 0) {
      const currentMax = colMap.size > 0 ? Math.max(...colMap.values()) : -1;
      let col = Math.max(nextFreeCol, currentMax + 2);

      const orphanGroups = this._coupleGroups(orphans, marriages);
      orphanGroups.forEach(group => {
        group.forEach(id => {
          colMap.set(id, col);
          col++;
        });
        col++; // 그룹 간 1열 여백
      });
    }
  }

  // ===========================================================================
  // 부부 그룹화 유틸 (§7 Case A, _coupleGroups)
  // ===========================================================================

  /**
   * ids 목록을 부부 쌍 우선으로 그룹화한다.
   * 각 그룹은 [남성, 여성] 또는 [단독] 순서.
   * marriages는 Map<id, Set<id>> 구조.
   *
   * @param  {string[]} ids       - 배치할 인물 id 목록
   * @param  {Map}      marriages - id → Set<id>
   * @returns {string[][]}        - [[id, id], [id], ...] 그룹 배열
   */
  _coupleGroups(ids, marriages) {
    const result    = [];
    const processed = new Set();
    const idSet     = new Set(ids);

    ids.forEach(id => {
      if (processed.has(id)) return;

      const spSet = marriages.get(id);
      let paired  = false;

      if (spSet) {
        for (const sp of spSet) {
          // 같은 ids 배치 목록 안에 있는 배우자만 쌍으로
          if (idSet.has(sp) && !processed.has(sp)) {
            result.push(this._orderCouple([id, sp]));
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
   * 두 인물을 [남성, 여성] 순으로 정렬 (S-3).
   * 동성이면 id 사전순.
   *
   * @param  {string[]} pair - [id, id]
   * @returns {string[]}
   */
  _orderCouple(pair) {
    if (pair.length !== 2) return pair;
    const [a, b] = pair;
    const pa = this.canvasState.getPersonById(a);
    const pb = this.canvasState.getPersonById(b);

    const isMale = p => p?.gender === 'male';

    if (isMale(pa) && !isMale(pb)) return [a, b]; // 남-여 → 그대로
    if (!isMale(pa) && isMale(pb)) return [b, a]; // 여-남 → 뒤집기
    return a <= b ? [a, b] : [b, a];              // 동성 → id 사전순
  }

  // ===========================================================================
  // Step 8. 전체 (0,0) 중앙 이동 (LAYOUT_ALGORITHM_SPEC.md §3-5)
  // ===========================================================================

  /**
   * 모든 인물을 (0, 0) 기준으로 중앙 이동.
   * cx, cy를 먼저 snap → 이동 결과도 GRID 배수 유지 (§9).
   */
  _centerAll(persons) {
    if (persons.length === 0) return;

    const xs = persons.map(p => p.x);
    const ys = persons.map(p => p.y);

    // snap 먼저 → 이후 빼기는 단순 `-` (재snap 불필요)
    const cx = this._snap((Math.min(...xs) + Math.max(...xs)) / 2);
    const cy = this._snap((Math.min(...ys) + Math.max(...ys)) / 2);

    persons.forEach(p => {
      p.x -= cx;
      p.y -= cy;
    });
  }
}
