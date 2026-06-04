/**
 * AutoLayout — 가계도 통합 정렬 엔진
 *
 * ▸ 사용처
 *   - 자동정렬 버튼: canvas.js → this.autoLayout.layout()
 *   - 템플릿 적용:   canvas.js → loadProject() → this.autoLayout.layout()
 *   두 경우 모두 동일한 단일 메서드를 호출한다. 별도 경로 없음.
 *
 * ▸ 알고리즘 (Reingold-Tilford 변형, McGoldrick-Gerson 2020 표준)
 *   1. 관계 파싱  → parentToChildren / childToParents / couples
 *   2. BFS 세대 배정  → 루트(최상위)=0, 자녀=+1 … 최대 5세대 이상 지원
 *   3. 서브트리 폭 계산 (Bottom-Up 재귀)
 *   4. X 열 배정 (Top-Down, 부모 중앙 정렬, nextFreeCol 겹침 방지)
 *   5. 부모 X 소급 보정  → 자녀가 옆으로 밀린 만큼 부모도 따라 이동
 *   6. Y 픽셀 적용  → lv × V_SPACING
 *   7. 전체 (0,0) 중앙 이동
 *
 * ▸ 상수
 *   H_SPACING = 150px (인물 1명 폭)
 *   V_SPACING = 200px (세대 간격)
 *   GAP       =   1열 (형제 그룹 간 여백)
 *
 * ▸ 표준 규칙
 *   S-1  같은 세대는 동일 Y
 *   S-2  위가 오래된 세대
 *   S-3  부부: 남성 왼쪽, 여성 오른쪽
 *   S-4  형제: 왼쪽이 첫째
 *   S-5  부모는 자녀 중앙 위
 *   S-6  겹침 금지
 */

export class AutoLayout {

  // ─── 상수 ────────────────────────────────────────────────────────────────
  static H_SPACING = 150;   // 열 1칸 픽셀 폭
  static V_SPACING = 200;   // 세대 1칸 픽셀 높이
  static GRID      =  50;   // 스냅 단위
  static GAP       =   1;   // 형제 그룹 간 빈 열 수

  constructor(canvasState) {
    this.canvasState = canvasState;
  }

  // ─── 외부 진입점 ──────────────────────────────────────────────────────────

  /**
   * 자동정렬 & 템플릿 정렬 공통 진입점.
   * canvasState.persons / relationships 를 읽어 각 person.x, person.y 를 갱신한다.
   */
  layout() {
    const persons       = this.canvasState.persons;
    const relationships = this.canvasState.relationships;
    if (!persons || persons.length === 0) return;

    const result = AutoLayout.compute(persons, relationships);

    // 결과를 person 객체에 기록
    persons.forEach(p => {
      const pos = result.get(p.id);
      if (pos) { p.x = pos.x; p.y = pos.y; }
    });
  }

  /**
   * [레거시 호환] canvas.js 가 autoArrange() 를 직접 호출하는 경우를 위한 별칭.
   */
  autoArrange() { this.layout(); }

  // ─── 핵심 계산 (순수 함수, 외부에서도 직접 호출 가능) ───────────────────

  /**
   * persons / relationships 를 받아
   * Map<id, {x, y}> 를 반환한다. (person 객체를 직접 수정하지 않음)
   *
   * @param {Array}  persons       - Person 객체 배열 (id, gender 필수)
   * @param {Array}  relationships - Relationship 객체 배열 (from, to, type 필수)
   * @returns {Map<string,{x:number,y:number}>}
   */
  static compute(persons, relationships) {
    // ── Step 1. 관계 파싱 ─────────────────────────────────────────────────
    const { p2c, c2p, couples } = AutoLayout._parseRelationships(relationships);

    // ── Step 2. BFS 세대 배정 ─────────────────────────────────────────────
    const lvMap = AutoLayout._assignLevels(persons, p2c, c2p, couples);

    // ── Step 3. 세대 → id 목록 맵 ────────────────────────────────────────
    const genMap = new Map();   // lv → id[]
    lvMap.forEach((lv, id) => {
      if (!genMap.has(lv)) genMap.set(lv, []);
      genMap.get(lv).push(id);
    });

    // ── Step 4. 서브트리 폭 계산 (Bottom-Up) ──────────────────────────────
    const widths = AutoLayout._subtreeWidths(persons, p2c, couples, lvMap);

    // ── Step 5. X 열 배정 (Top-Down) ──────────────────────────────────────
    const colMap = AutoLayout._assignColumns(persons, genMap, p2c, c2p, couples, widths, lvMap);

    // ── Step 6. col 0-based 정규화 ────────────────────────────────────────
    if (colMap.size === 0) return new Map();
    const minCol = Math.min(...colMap.values());
    colMap.forEach((col, id) => colMap.set(id, col - minCol));

    // ── Step 7. 픽셀 좌표 → Map<id, {x,y}> ───────────────────────────────
    const posMap = new Map();
    colMap.forEach((col, id) => {
      posMap.set(id, {
        x: AutoLayout._snap(col * AutoLayout.H_SPACING),
        y: AutoLayout._snap(lvMap.get(id) * AutoLayout.V_SPACING)
      });
    });

    // 미배치 인물 (고립) 처리
    const maxCol = Math.max(...colMap.values());
    let orphanCol = maxCol + 2;
    persons.forEach(p => {
      if (!posMap.has(p.id)) {
        posMap.set(p.id, {
          x: AutoLayout._snap(orphanCol * AutoLayout.H_SPACING),
          y: AutoLayout._snap((lvMap.get(p.id) ?? 0) * AutoLayout.V_SPACING)
        });
        orphanCol++;
      }
    });

    // ── Step 8. 전체 (0,0) 중앙 이동 ─────────────────────────────────────
    AutoLayout._centerPositions(posMap);

    return posMap;
  }

  // ─── Step 1. 관계 파싱 ───────────────────────────────────────────────────

  /**
   * relationships 배열을 분석해 세 가지 맵을 반환한다.
   *
   * p2c : Map<parentId, childId[]>   (parent→children)
   * c2p : Map<childId,  parentId[]>  (child→parents)
   * couples: Map<id, Set<id>>        (marriage 쌍, 양방향)
   *
   * 지원 타입: biological / adopted / foster → 부모-자녀
   *            marriage                      → 부부
   *            emotional 등 나머지           → 무시
   */
  static _parseRelationships(relationships) {
    const p2c     = new Map();
    const c2p     = new Map();
    const couples = new Map();

    const addToMap = (map, key, val) => {
      if (!map.has(key)) map.set(key, []);
      if (!map.get(key).includes(val)) map.get(key).push(val);
    };

    relationships.forEach(rel => {
      if (['biological', 'adopted', 'foster'].includes(rel.type)) {
        // from → parent, to → child
        addToMap(p2c, rel.from, rel.to);
        addToMap(c2p, rel.to,   rel.from);
      } else if (rel.type === 'marriage') {
        if (!couples.has(rel.from)) couples.set(rel.from, new Set());
        if (!couples.has(rel.to))   couples.set(rel.to,   new Set());
        couples.get(rel.from).add(rel.to);
        couples.get(rel.to).add(rel.from);
      }
    });

    return { p2c, c2p, couples };
  }

  // ─── Step 2. BFS 세대 배정 ───────────────────────────────────────────────

  /**
   * 루트(최상위 조상)를 찾아 BFS Top-Down 으로 세대값(lv)을 배정한다.
   *
   * 규칙:
   * - c2p 에 없는 인물 = 루트 후보
   * - 배우자는 항상 같은 lv
   * - 더 낮은 lv 로 갱신 허용 (증조부모 추가 대응)
   * - stale entry 는 처리 시점에 skip
   *
   * @returns {Map<id, lv>} lv는 0-based (최상위=0)
   */
  static _assignLevels(persons, p2c, c2p, couples) {
    // 루트 탐색
    const seenAsSpouse = new Set();
    const roots = [];

    persons.forEach(p => {
      if (c2p.has(p.id))       return;   // 자녀가 있는 인물은 루트 아님
      if (seenAsSpouse.has(p.id)) return;

      roots.push(p.id);
      // 이 루트의 배우자들도 루트 세대이므로 중복 방지
      (couples.get(p.id) || new Set()).forEach(sp => {
        if (!c2p.has(sp)) seenAsSpouse.add(sp);
      });
    });

    // 루트가 없으면(순환 등) CT 또는 첫 번째 인물
    if (roots.length === 0) {
      const ct = persons.find(p => p.isCT) || persons[0];
      if (ct) roots.push(ct.id);
    }

    const lvMap = new Map();
    const queue = [];

    const enqueue = (id, lv) => {
      const cur = lvMap.get(id);
      if (cur !== undefined && cur <= lv) return;
      lvMap.set(id, lv);
      queue.push({ id, lv });
      // 배우자 동기화
      (couples.get(id) || new Set()).forEach(sp => {
        const spCur = lvMap.get(sp);
        if (spCur === undefined || spCur > lv) {
          lvMap.set(sp, lv);
          queue.push({ id: sp, lv });
        }
      });
    };

    roots.forEach(id => enqueue(id, 0));

    let head = 0;
    while (head < queue.length) {
      const { id, lv } = queue[head++];
      if ((lvMap.get(id) ?? Infinity) < lv) continue; // stale
      (p2c.get(id) || []).forEach(cid => enqueue(cid, lv + 1));
    }

    // 고립 인물
    const maxLv = lvMap.size > 0 ? Math.max(...lvMap.values()) : 0;
    persons.forEach(p => {
      if (!lvMap.has(p.id)) lvMap.set(p.id, maxLv + 1);
    });

    // 정규화 (min → 0)
    const minLv = Math.min(...lvMap.values());
    if (minLv !== 0) lvMap.forEach((lv, id) => lvMap.set(id, lv - minLv));

    return lvMap;
  }

  // ─── Step 3. 서브트리 폭 계산 ────────────────────────────────────────────

  /**
   * 각 인물의 서브트리가 차지하는 열 수를 Bottom-Up 재귀로 계산한다.
   * 리프 노드 = 1 (배우자 있으면 2)
   * 내부 노드 = max(자신+배우자, 자녀 서브트리 합 + 그룹간 GAP)
   *
   * @returns {Map<id, width>}
   */
  static _subtreeWidths(persons, p2c, couples, lvMap) {
    const widths = new Map();
    const memo   = new Map();

    const calcWidth = (id) => {
      if (memo.has(id)) return memo.get(id);
      memo.set(id, 0); // 재귀 중 순환 방지용 임시값

      const spouseCount = (couples.get(id) || new Set()).size;
      const selfWidth   = 1 + spouseCount; // 본인 + 배우자 수

      const children = (p2c.get(id) || []).filter(cid => {
        const cLv = lvMap.get(cid) ?? 0;
        const pLv = lvMap.get(id)  ?? 0;
        return cLv > pLv; // 진짜 자녀만 (같은 세대나 위 세대 제외)
      });

      if (children.length === 0) {
        memo.set(id, selfWidth);
        widths.set(id, selfWidth);
        return selfWidth;
      }

      // 자녀 폭 합산: 중복 없이 (양부모인 경우 한 번만 카운트)
      const countedChildren = new Set();
      let childrenTotal = 0;
      children.forEach((cid, i) => {
        if (countedChildren.has(cid)) return;
        countedChildren.add(cid);
        childrenTotal += calcWidth(cid);
        if (i < children.length - 1) childrenTotal += AutoLayout.GAP;
      });

      const w = Math.max(selfWidth, childrenTotal);
      memo.set(id, w);
      widths.set(id, w);
      return w;
    };

    persons.forEach(p => calcWidth(p.id));
    return widths;
  }

  // ─── Step 4. X 열 배정 (Top-Down) ────────────────────────────────────────

  /**
   * 세대 0(최상위)부터 순서대로 각 인물의 열 번호를 결정한다.
   *
   * ■ 최상위 세대 (lv=0)
   *   - 부부 쌍을 단위로 [남, 여] 순 배치
   *   - 독신은 개별 배치
   *   - 그룹 간 GAP 열 여백
   *
   * ■ 이후 세대 (lv>0)
   *   - 각 인물을 '공통 부모 키' 기준으로 형제 그룹화
   *   - 그룹 정렬: 부모 평균 col 오름차순 (왼쪽 가계 먼저)
   *   - ideal_start = round(부모평균col - (span-1)/2)
   *   - 실제 start  = max(ideal_start, nextFreeCol)
   *   - 배치 후 nextFreeCol = start + span + GAP
   *   - 부모 소급 보정: 자녀 배치가 이상적 위치와 차이나면 부모 이동
   *
   * @returns {Map<id, col>}
   */
  static _assignColumns(persons, genMap, p2c, c2p, couples, widths, lvMap) {
    const colMap     = new Map();
    const sortedLevs = Array.from(genMap.keys()).sort((a, b) => a - b);

    sortedLevs.forEach((lv, lvIdx) => {
      const ids = genMap.get(lv) || [];

      if (lvIdx === 0) {
        // ── 최상위 세대 ────────────────────────────────────────────────────
        let col = 0;
        AutoLayout._coupleGroups(ids, couples).forEach(group => {
          group.forEach(id => { colMap.set(id, col++); });
          col += AutoLayout.GAP;
        });

      } else {
        // ── 이후 세대 ──────────────────────────────────────────────────────
        const unplaced = ids.filter(id => !colMap.has(id));
        if (unplaced.length === 0) return;

        AutoLayout._placeChildLevel(
          unplaced, colMap, p2c, c2p, couples, widths, lvMap
        );
      }
    });

    return colMap;
  }

  /**
   * 자녀 세대의 열 배정 (nextFreeCol 전진 방식 + 부모 소급 보정).
   */
  static _placeChildLevel(ids, colMap, p2c, c2p, couples, widths, lvMap) {
    // ── 1) 형제 그룹화: 공통 부모 키 기준 ─────────────────────────────────
    const groupMap  = new Map(); // parentKey → { parentIds, childIds, avgParentCol }
    const orphans   = [];

    ids.forEach(id => {
      const myParents = (c2p.get(id) || []).filter(pid => colMap.has(pid));
      if (myParents.length === 0) { orphans.push(id); return; }

      const key = [...myParents].sort().join('|');
      if (!groupMap.has(key)) {
        const avg = myParents.reduce((s, pid) => s + colMap.get(pid), 0) / myParents.length;
        groupMap.set(key, { parentIds: myParents, childIds: [], avgParentCol: avg });
      }
      groupMap.get(key).childIds.push(id);
    });

    // ── 2) 그룹 정렬: 부모 평균 col 오름차순 ──────────────────────────────
    const groups = Array.from(groupMap.values())
      .sort((a, b) => a.avgParentCol - b.avgParentCol);

    // ── 3) 각 그룹 배치 ───────────────────────────────────────────────────
    let nextFreeCol = 0;

    groups.forEach(({ parentIds, childIds, avgParentCol }) => {
      // 커플 그룹화 포함 배치 순서
      const cGroups = AutoLayout._coupleGroups(childIds, couples);
      const span    = cGroups.reduce((s, g) => s + g.length, 0);

      const idealStart = Math.round(avgParentCol - (span - 1) / 2);
      const startCol   = Math.max(idealStart, nextFreeCol);

      let col = startCol;
      cGroups.forEach(group => {
        group.forEach(id => { colMap.set(id, col++); });
      });

      nextFreeCol = startCol + span + AutoLayout.GAP;

      // ── 4) 부모 소급 보정 ────────────────────────────────────────────────
      // 자녀들이 실제로 배치된 중앙 col
      const placedChildCols = childIds.map(id => colMap.get(id));
      const actualCenter = (Math.min(...placedChildCols) + Math.max(...placedChildCols)) / 2;

      // 부모들을 actualCenter 기준으로 이동
      AutoLayout._nudgeParents(parentIds, actualCenter, colMap, couples, lvMap);
    });

    // ── 5) 고아 배치 ──────────────────────────────────────────────────────
    if (orphans.length > 0) {
      const maxUsed = colMap.size > 0 ? Math.max(...colMap.values()) : -1;
      let col = Math.max(nextFreeCol, maxUsed + 1 + AutoLayout.GAP);

      AutoLayout._coupleGroups(orphans, couples).forEach(group => {
        group.forEach(id => { colMap.set(id, col++); });
        col += AutoLayout.GAP;
      });
    }
  }

  /**
   * 부모들을 자녀 중앙에 맞게 이동시킨다 (소급 보정).
   * 단, 이미 배치된 다른 인물과 충돌하지 않는 경우에만 이동한다.
   *
   * @param parentIds    - 보정할 부모 id[]
   * @param targetCenter - 자녀 중앙 col
   * @param colMap       - 현재 colMap (수정됨)
   * @param couples      - 부부 맵
   * @param lvMap        - 세대 맵 (충돌 검사용)
   */
  static _nudgeParents(parentIds, targetCenter, colMap, couples, lvMap) {
    if (parentIds.length === 0) return;

    // 현재 부모 중앙
    const parentCols = parentIds.map(pid => colMap.get(pid));
    const currentCenter = (Math.min(...parentCols) + Math.max(...parentCols)) / 2;
    const delta = targetCenter - currentCenter;
    if (Math.abs(delta) < 0.5) return; // 이동 불필요

    const shift = Math.round(delta);

    // 이동할 인물 집합 (부모 + 부모의 배우자)
    const toMove = new Set(parentIds);
    parentIds.forEach(pid => {
      (couples.get(pid) || new Set()).forEach(sp => toMove.add(sp));
    });

    // 충돌 검사: 같은 세대에 이미 배치된 다른 인물과 겹치는지 확인
    const targetLv = lvMap.get(parentIds[0]);
    const wouldConflict = Array.from(toMove).some(pid => {
      const newCol = (colMap.get(pid) ?? 0) + shift;
      for (const [oid, ocol] of colMap) {
        if (toMove.has(oid)) continue;
        if ((lvMap.get(oid) ?? -1) !== targetLv) continue;
        if (ocol === newCol) return true;
      }
      return false;
    });

    if (!wouldConflict) {
      toMove.forEach(pid => {
        if (colMap.has(pid)) colMap.set(pid, colMap.get(pid) + shift);
      });
    }
  }

  // ─── 유틸 ────────────────────────────────────────────────────────────────

  /**
   * ids 배열을 부부 쌍 우선으로 그룹화한다.
   * 각 그룹: [남성, 여성] 또는 [단독]
   *
   * @param  {string[]}          ids
   * @param  {Map<id,Set<id>>}   couples
   * @returns {string[][]}
   */
  static _coupleGroups(ids, couples) {
    const result    = [];
    const processed = new Set();
    const idSet     = new Set(ids);

    ids.forEach(id => {
      if (processed.has(id)) return;

      let paired = false;
      const spSet = couples.get(id);
      if (spSet) {
        for (const sp of spSet) {
          if (idSet.has(sp) && !processed.has(sp)) {
            result.push(AutoLayout._orderCouple(id, sp));
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
   * 두 인물을 [남성, 여성] 순으로 반환한다. (S-3)
   * 동성이면 id 사전순.
   */
  static _orderCouple(a, b) {
    // canvasState 없이 gender 를 직접 알 수 없으므로
    // 호출 측에서 Person 객체를 조회하여 gender 를 비교한다.
    // 여기서는 id 문자열만 갖고 있으므로 정적 맵을 통해 조회한다.
    const pa = AutoLayout._personCache?.get(a);
    const pb = AutoLayout._personCache?.get(b);
    const isMale = p => p?.gender === 'male';

    if (isMale(pa) && !isMale(pb)) return [a, b];
    if (!isMale(pa) && isMale(pb)) return [b, a];
    return a <= b ? [a, b] : [b, a];
  }

  /**
   * 인물 캐시를 설정한다.
   * compute() 내부에서 _orderCouple 이 gender 정보에 접근하기 위해 사용.
   * (정적 메서드가 canvasState 에 접근하지 않도록 캐시로 분리)
   */
  static _buildPersonCache(persons) {
    AutoLayout._personCache = new Map(persons.map(p => [p.id, p]));
  }

  /**
   * 전체 posMap 을 (0,0) 중앙으로 이동한다.
   */
  static _centerPositions(posMap) {
    const xs = [...posMap.values()].map(p => p.x);
    const ys = [...posMap.values()].map(p => p.y);
    const cx = AutoLayout._snap((Math.min(...xs) + Math.max(...xs)) / 2);
    const cy = AutoLayout._snap((Math.min(...ys) + Math.max(...ys)) / 2);
    posMap.forEach(pos => { pos.x -= cx; pos.y -= cy; });
  }

  /** px → GRID 배수로 스냅 */
  static _snap(px) {
    return Math.round(px / AutoLayout.GRID) * AutoLayout.GRID;
  }
}

// 정적 캐시 초기화
AutoLayout._personCache = null;

// ─── compute() 에서 _personCache 주입 패치 ───────────────────────────────────
// compute 를 호출하기 전에 캐시를 설정해야 _orderCouple 이 gender 를 참조할 수 있다.
// 원본 compute 를 래핑하여 캐시 설정을 자동화한다.
const _origCompute = AutoLayout.compute.bind(AutoLayout);
AutoLayout.compute = function(persons, relationships) {
  AutoLayout._buildPersonCache(persons);
  return _origCompute(persons, relationships);
};
