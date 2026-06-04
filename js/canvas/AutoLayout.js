/**
 * AutoLayout - Genogram 자동 정렬 시스템
 * js/pages/canvas.js에서 import하여 사용합니다.
 *
 * 기준 명세: LAYOUT_ALGORITHM_SPEC.md
 * 알고리즘:  Reingold-Tilford (1981) 단순화 + McGoldrick-Gerson (2020) 표준
 *
 * 핵심 수식:
 *   Y = lv  × V_SPACING   (V_SPACING = 4 × GRID = 200px → 항상 GRID 배수)
 *   X = col × H_SPACING   (H_SPACING = 3 × GRID = 150px → 항상 GRID 배수)
 *   _snap() 은 좌표 적용 후 불필요 — 수식 자체가 GRID 배수를 보장함
 */

export class AutoLayout {
  constructor(canvasState) {
    this.canvasState = canvasState;

    this.GRID   = 50;  // 그리드 단위 (LAYOUT_ALGORITHM_SPEC.md §6)
    this.H_COLS = 3;   // 인물 1명 = 3 그리드열 → H_SPACING = 150px
    this.V_ROWS = 4;   // 세대 간격 = 4 그리드행 → V_SPACING = 200px
  }

  /** 수평 간격: 150px (= 3 × 50) — GRID 배수 자동 보장 */
  get H_SPACING() { return this.H_COLS * this.GRID; }

  /** 수직 간격: 200px (= 4 × 50) — GRID 배수 자동 보장 */
  get V_SPACING() { return this.V_ROWS * this.GRID; }

  /**
   * 픽셀 → 가장 가까운 그리드 스냅
   * ※ 열·행 기반 좌표 계산에는 사용하지 않는다.
   *    _centerAll()의 cx/cy 계산에만 사용한다.
   */
  _snap(px) {
    return Math.round(px / this.GRID) * this.GRID;
  }

  // =========================================================================
  // 진입점
  // =========================================================================

  /**
   * 자동정렬 실행
   * LAYOUT_ALGORITHM_SPEC.md §4 (전체 배치 흐름) 참조
   */
  autoArrange() {
    const persons       = this.canvasState.persons;
    const relationships = this.canvasState.relationships;
    if (!persons || persons.length === 0) return;

    // Step 1. 그래프 구축 (parentToChildren, childToParents, marriages, personLevel)
    const { personLevel, parentToChildren, childToParents, marriages } =
      this._buildGraph(persons, relationships);

    // Step 2. 최소 레벨 → 0 정규화
    const minLv = Math.min(...personLevel.values());
    personLevel.forEach((lv, id) => personLevel.set(id, lv - minLv));

    // Step 3. 세대별 id 목록
    const genMap = new Map();
    personLevel.forEach((lv, id) => {
      if (!genMap.has(lv)) genMap.set(lv, []);
      genMap.get(lv).push(id);
    });

    // Step 4. 탑-다운으로 각 세대 열(column) 배정
    const colMap = new Map(); // personId → gridColumn (정수)
    const sortedLevels = Array.from(genMap.keys()).sort((a, b) => a - b);

    sortedLevels.forEach((lv, idx) => {
      this._assignColumns(
        genMap.get(lv), colMap,
        parentToChildren, childToParents, marriages,
        idx === 0  // isFirstGen
      );
    });

    // Step 5. 전체 열 범위를 0-based로 정규화
    const minCol = Math.min(...colMap.values());
    colMap.forEach((col, id) => colMap.set(id, col - minCol));

    // Step 6. 픽셀 좌표 적용
    //   col × H_SPACING: H_SPACING = H_COLS × GRID → 항상 GRID 배수 → _snap() 불필요
    //   lv  × V_SPACING: V_SPACING = V_ROWS × GRID → 항상 GRID 배수 → _snap() 불필요
    colMap.forEach((col, id) => {
      const person = this.canvasState.getPersonById(id);
      if (!person) return;
      person.x = col * this.H_SPACING;
      person.y = personLevel.get(id) * this.V_SPACING;
    });

    // Step 7. 전체를 (0, 0) 중심으로 이동
    //   _centerAll() 내부에서 cx/cy에 _snap() 적용 → 이동 후도 GRID 배수 유지
    this._centerAll(persons);
  }

  // =========================================================================
  // Step 1. 그래프 구축
  // =========================================================================

  /**
   * 관계 데이터에서 parentToChildren / childToParents / marriages Map을 구성하고
   * BFS top-down으로 personLevel(세대값)을 계산한다.
   *
   * LAYOUT_ALGORITHM_SPEC.md §5 참조
   *
   * [핵심 변경] visited Set 제거 → "더 낮은 lv로 갱신 허용 + stale entry skip" 방식
   *   - 증조부모처럼 나중에 추가된 최상위 세대가 올바른 lv를 받도록 보장
   *   - 역방향 BFS(childToParents 탐색) 없음 → 루트 탐색에서 이미 처리됨
   */
  _buildGraph(persons, relationships) {
    const parentToChildren = new Map();
    const childToParents   = new Map();
    const marriages        = new Map();

    // 관계 분류
    relationships.forEach(rel => {
      if (['biological', 'adopted', 'foster'].includes(rel.type)) {
        if (!parentToChildren.has(rel.from)) parentToChildren.set(rel.from, []);
        parentToChildren.get(rel.from).push(rel.to);

        if (!childToParents.has(rel.to)) childToParents.set(rel.to, []);
        childToParents.get(rel.to).push(rel.from);
      }
      if (rel.type === 'marriage') {
        marriages.set(rel.from, rel.to);
        marriages.set(rel.to,   rel.from);
      }
    });

    // 루트 탐색: 부모가 없는 인물 (배우자 중복 제거)
    const addedAsSpouse = new Set();
    const roots = [];
    persons.forEach(p => {
      if (!childToParents.has(p.id) && !addedAsSpouse.has(p.id)) {
        roots.push(p.id);
        const sp = marriages.get(p.id);
        if (sp && !childToParents.has(sp)) addedAsSpouse.add(sp);
      }
    });
    // 루트가 없으면 (모든 인물이 서로 연결된 순환 구조 등) CT 또는 첫 인물을 루트로
    if (roots.length === 0) {
      const ct = persons.find(p => p.isCT) || persons[0];
      roots.push(ct.id);
    }

    // BFS top-down: 더 낮은 lv로 갱신 허용 (stale entry skip)
    const personLevel = new Map();
    const queue = [];

    const enqueue = (id, lv) => {
      const current = personLevel.get(id);
      if (current !== undefined && current <= lv) return; // 이미 더 좋은(작은) lv 보유
      personLevel.set(id, lv);
      queue.push({ id, lv });

      // 배우자는 항상 같은 lv
      const sp = marriages.get(id);
      if (sp) {
        const spCurrent = personLevel.get(sp);
        if (spCurrent === undefined || spCurrent > lv) {
          personLevel.set(sp, lv);
          queue.push({ id: sp, lv });
        }
      }
    };

    roots.forEach(id => enqueue(id, 0));

    while (queue.length > 0) {
      const { id, lv } = queue.shift();

      // stale entry: 이 항목보다 더 낮은 lv로 이미 갱신되었으면 skip
      if (personLevel.get(id) < lv) continue;

      // 자녀 방향으로만 전파 (역방향 BFS 없음)
      (parentToChildren.get(id) || []).forEach(cid => enqueue(cid, lv + 1));
    }

    // 미방문 고립 인물: 최하위 + 1
    const maxLv = personLevel.size > 0 ? Math.max(...personLevel.values()) : 0;
    persons.forEach(p => {
      if (!personLevel.has(p.id)) personLevel.set(p.id, maxLv + 1);
    });

    return { personLevel, parentToChildren, childToParents, marriages };
  }

  // =========================================================================
  // Step 4. 열(column) 배정
  // =========================================================================

  /**
   * 한 세대의 인물들에게 그리드 열 번호를 부여한다.
   *
   * LAYOUT_ALGORITHM_SPEC.md §7 (열 배정 규칙) 참조
   *
   * [겹침 방지 수식]
   *   ideal_start = round(parent_avg_col - (span - 1) / 2)
   *   start_col   = max(ideal_start, nextFreeCol)
   *   nextFreeCol = start_col + span + 1  ← 1열 여백 확보
   *
   * @param {string[]} ids            - 이번 세대 인물 id 목록
   * @param {Map}      colMap         - id → 열번호 (결과 누적)
   * @param {Map}      parentToChildren
   * @param {Map}      childToParents
   * @param {Map}      marriages
   * @param {boolean}  isFirstGen     - true이면 최상위 세대 (단순 순차 배치)
   */
  _assignColumns(ids, colMap, parentToChildren, childToParents, marriages, isFirstGen) {
    const unplaced = ids.filter(id => !colMap.has(id));
    if (unplaced.length === 0) return;

    // ── Case A: 최상위 세대 ─────────────────────────────────────────────────
    if (isFirstGen || colMap.size === 0) {
      const groups = this._coupleGroups(unplaced, marriages);
      let col = 0;
      groups.forEach(group => {
        group.forEach(id => { colMap.set(id, col); col++; });
      });
      return;
    }

    // ── Case B: 이후 세대 ───────────────────────────────────────────────────

    // 각 자녀를 부모 쌍 키로 분류
    const parentKeyToChildren = new Map(); // "p1|p2" → childId[]
    const orphans = [];

    unplaced.forEach(cid => {
      const myParents = (childToParents.get(cid) || [])
        .filter(pid => colMap.has(pid));

      if (myParents.length === 0) {
        orphans.push(cid);
        return;
      }

      const key = myParents.slice().sort().join('|');
      if (!parentKeyToChildren.has(key)) parentKeyToChildren.set(key, []);
      parentKeyToChildren.get(key).push(cid);
    });

    // 각 자녀 그룹에 배우자(미배치)도 포함
    parentKeyToChildren.forEach((childIds) => {
      const toAdd = [];
      childIds.forEach(cid => {
        const sp = marriages.get(cid);
        if (sp && !colMap.has(sp) && !childIds.includes(sp) && unplaced.includes(sp)) {
          toAdd.push(sp);
        }
      });
      toAdd.forEach(id => childIds.push(id));
    });

    // 부모 평균 열 기준으로 그룹 정렬 (왼쪽→오른쪽)
    const groups = Array.from(parentKeyToChildren.entries())
      .map(([key, childIds]) => {
        const pids    = key.split('|');
        const avgCol  = pids.reduce((s, pid) => s + (colMap.get(pid) ?? 0), 0) / pids.length;
        // [BUG-2 수정] span = cGroups에서 실제 인물 수로 계산 (childIds.length 아님)
        const cGroups = this._coupleGroups(childIds, marriages);
        return { avgCol, cGroups };
      })
      .sort((a, b) => a.avgCol - b.avgCol);

    // 각 그룹을 부모 중심 아래에 배치, 겹침 방지
    let nextFreeCol = 0;

    groups.forEach(({ avgCol, cGroups }) => {
      // 실제 배치될 인물 수 = span
      const span = cGroups.reduce((s, g) => s + g.length, 0);

      // 이상적 시작 열: 부모 중심 아래 중앙
      let startCol = Math.round(avgCol - (span - 1) / 2);

      // 이전 그룹과 겹치지 않도록 오른쪽으로 밀기
      if (startCol < nextFreeCol) startCol = nextFreeCol;

      let col = startCol;
      cGroups.forEach(group => {
        group.forEach(id => { colMap.set(id, col); col++; });
      });

      // 다음 그룹 시작 가능 위치 = 현재 그룹 끝 + 1열 여백
      nextFreeCol = startCol + span + 1;
    });

    // 고아(부모 없는 인물): 맨 오른쪽에 배치
    if (orphans.length > 0) {
      let maxCol = colMap.size > 0 ? Math.max(...colMap.values()) : -1;
      maxCol += 2; // 기존 그룹과 여백 확보
      this._coupleGroups(orphans, marriages).forEach(group => {
        group.forEach(id => { colMap.set(id, maxCol); maxCol++; });
      });
    }
  }

  // =========================================================================
  // 부부 그룹화
  // =========================================================================

  /**
   * ids 배열을 부부 쌍 우선으로 그룹화한다.
   * 남성 왼쪽, 여성 오른쪽 (McGoldrick-Gerson S-3 규칙)
   *
   * @param {string[]} ids
   * @param {Map}      marriages
   * @returns {Array<string[]>}  [[남편id, 아내id], [id], ...]
   */
  _coupleGroups(ids, marriages) {
    const result    = [];
    const processed = new Set();

    ids.forEach(id => {
      if (processed.has(id)) return;
      const sp = marriages.get(id);

      if (sp && ids.includes(sp) && !processed.has(sp)) {
        const person = this.canvasState.getPersonById(id);
        const spouse = this.canvasState.getPersonById(sp);
        const isMale = (p) => p?.gender === 'male';
        // 남성 왼쪽, 여성 오른쪽; 둘 다 같은 성별이면 id 순서 유지
        const left  = isMale(person) || (!isMale(person) && !isMale(spouse)) ? id : sp;
        const right = left === id ? sp : id;
        result.push([left, right]);
        processed.add(id);
        processed.add(sp);
      } else {
        result.push([id]);
        processed.add(id);
      }
    });

    return result;
  }

  // =========================================================================
  // Step 7. 전체 중앙 이동
  // =========================================================================

  /**
   * 모든 인물을 (0, 0) 중심으로 이동한다.
   *
   * LAYOUT_ALGORITHM_SPEC.md §3-5, §4 Step 8 참조
   *
   * [BUG-3 수정] 이중 스냅 제거
   *   - cx, cy 계산 시에만 _snap() 적용 → cx/cy가 GRID 배수
   *   - 각 인물의 x/y는 이미 GRID 배수(col × H_SPACING, lv × V_SPACING)
   *   - x - cx, y - cy 모두 GRID 배수끼리의 차 → 결과도 GRID 배수
   *   - 재snap 불필요
   */
  _centerAll(persons) {
    if (persons.length === 0) return;
    const xs = persons.map(p => p.x);
    const ys = persons.map(p => p.y);

    // 중심 계산 후 snap → cx/cy가 GRID 배수임을 보장
    const cx = this._snap((Math.min(...xs) + Math.max(...xs)) / 2);
    const cy = this._snap((Math.min(...ys) + Math.max(...ys)) / 2);

    // 단순 빼기: GRID 배수 - GRID 배수 = GRID 배수 → 재snap 없음
    persons.forEach(p => {
      p.x = p.x - cx;
      p.y = p.y - cy;
    });
  }
}
