/**
 * AutoLayout - Genogram 자동 정렬 시스템
 * js/pages/canvas.js에서 import하여 사용합니다.
 */

export class AutoLayout {
  constructor(canvasState) {
    this.canvasState = canvasState;

    this.GRID     = 50;   // 그리드 단위 (canvas.js 와 동일)
    this.H_COLS   = 3;    // 인물 1명당 차지하는 그리드 열 수 (150px)
    this.V_ROWS   = 4;    // 세대 간 그리드 행 수 (200px)
  }

  // 그리드 단위 → 픽셀
  get H_SPACING() { return this.H_COLS * this.GRID; } // 150
  get V_SPACING() { return this.V_ROWS * this.GRID; } // 200

  // 픽셀 → 가장 가까운 그리드 스냅
  _snap(px) {
    return Math.round(px / this.GRID) * this.GRID;
  }

  // =========================================================================
  // 진입점
  // =========================================================================

  autoArrange() {
    const persons       = this.canvasState.persons;
    const relationships = this.canvasState.relationships;
    if (!persons || persons.length === 0) return;

    // 1) 그래프 구축
    const { personLevel, parentToChildren, childToParents, marriages } =
      this._buildGraph(persons, relationships);

    // 2) 최소 레벨 → 0 정규화
    const minLv = Math.min(...personLevel.values());
    personLevel.forEach((lv, id) => personLevel.set(id, lv - minLv));

    // 3) 세대별 id 목록
    const genMap = new Map();
    personLevel.forEach((lv, id) => {
      if (!genMap.has(lv)) genMap.set(lv, []);
      genMap.get(lv).push(id);
    });

    // 4) 탑-다운으로 각 세대 X(그리드 열 단위) 배정
    const colMap = new Map(); // personId → gridColumn (정수)
    const sortedLevels = Array.from(genMap.keys()).sort((a, b) => a - b);

    sortedLevels.forEach((lv, idx) => {
      this._assignColumns(
        genMap.get(lv), colMap,
        parentToChildren, childToParents, marriages,
        idx === 0
      );
    });

    // 5) 전체 열 범위를 0-based로 정규화
    const minCol = Math.min(...colMap.values());
    colMap.forEach((col, id) => colMap.set(id, col - minCol));

    // 6) 픽셀 좌표 적용 (그리드 스냅 보장)
    colMap.forEach((col, id) => {
      const person = this.canvasState.getPersonById(id);
      if (!person) return;
      person.x = this._snap(col * this.H_SPACING);
      person.y = this._snap(personLevel.get(id) * this.V_SPACING);
    });

    // 7) 전체를 (0,0) 중심으로 이동 — centerView()가 뷰포트 맞춤
    this._centerAll(persons);
  }

  // =========================================================================
  // 그래프 구축
  // =========================================================================

  _buildGraph(persons, relationships) {
    const parentToChildren = new Map();
    const childToParents   = new Map();
    const marriages        = new Map();

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

    // 루트: 부모가 없는 인물 (배우자 중복 제거)
    const roots = [];
    const addedAsSpouse = new Set();
    persons.forEach(p => {
      if (!childToParents.has(p.id) && !addedAsSpouse.has(p.id)) {
        roots.push(p.id);
        const sp = marriages.get(p.id);
        if (sp && !childToParents.has(sp)) addedAsSpouse.add(sp);
      }
    });
    if (roots.length === 0) {
      const ct = persons.find(p => p.isCT) || persons[0];
      roots.push(ct.id);
    }

    // BFS 레벨 부여
    const personLevel = new Map();
    const visited     = new Set();
    const queue       = [];

    const enqueue = (id, lv) => {
      if (visited.has(id)) return;
      visited.add(id);
      personLevel.set(id, lv);
      queue.push({ id, lv });
      const sp = marriages.get(id);
      if (sp && !visited.has(sp)) {
        visited.add(sp);
        personLevel.set(sp, lv);
        queue.push({ id: sp, lv });
      }
    };

    roots.forEach(id => enqueue(id, 0));
    while (queue.length > 0) {
      const { id, lv } = queue.shift();
      (parentToChildren.get(id) || []).forEach(cid => enqueue(cid, lv + 1));
      (childToParents.get(id)   || []).forEach(pid => enqueue(pid, lv - 1));
    }

    // 미방문 인물: 최하위 + 1
    const maxLv = personLevel.size > 0 ? Math.max(...personLevel.values()) : 0;
    persons.forEach(p => {
      if (!personLevel.has(p.id)) personLevel.set(p.id, maxLv + 1);
    });

    return { personLevel, parentToChildren, childToParents, marriages };
  }

  // =========================================================================
  // 열(column) 배정
  // =========================================================================

  /**
   * 한 세대의 인물들에게 그리드 열 번호를 부여한다.
   * - 최상위 세대: 순서대로 배치
   * - 이후 세대: 부모 중심 아래에 자녀 배치, 겹침 방지
   */
  _assignColumns(ids, colMap, parentToChildren, childToParents, marriages, isFirstGen) {
    const unplaced = ids.filter(id => !colMap.has(id));
    if (unplaced.length === 0) return;

    if (isFirstGen || colMap.size === 0) {
      // 최상위 세대: 왼쪽부터 1열씩
      const groups = this._coupleGroups(unplaced, marriages);
      let col = 0;
      groups.forEach(group => {
        group.forEach(id => { colMap.set(id, col); col++; });
      });
      return;
    }

    // ----- 부모 그룹별 자녀 분류 -----
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

    // 배우자(부모 없는 쪽)를 자녀 그룹에 포함
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

    // ----- 부모 그룹을 부모 중심 열 기준으로 정렬 -----
    const groups = Array.from(parentKeyToChildren.entries())
      .map(([key, childIds]) => {
        const pids  = key.split('|');
        const avgCol = pids.reduce((s, pid) => s + (colMap.get(pid) ?? 0), 0) / pids.length;
        return { avgCol, childIds };
      })
      .sort((a, b) => a.avgCol - b.avgCol);

    // ----- 각 그룹을 부모 중심 아래에 배치, 겹침 방지 -----
    let nextFreeCol = 0; // 다음 그룹이 시작할 수 있는 최소 열

    groups.forEach(({ avgCol, childIds }) => {
      const cGroups = this._coupleGroups(childIds, marriages);
      const span    = childIds.length; // 이 그룹이 차지하는 열 수
      // 자녀 그룹 전체의 중심이 부모 중심 아래가 되도록 시작 열 계산
      let startCol  = Math.round(avgCol - (span - 1) / 2);

      // 이전 그룹과 겹치지 않도록 오른쪽으로 밀기
      if (startCol < nextFreeCol) startCol = nextFreeCol;

      let col = startCol;
      cGroups.forEach(group => {
        group.forEach(id => { colMap.set(id, col); col++; });
      });

      nextFreeCol = startCol + span + 1; // 그룹 간 1열 여백
    });

    // ----- 부모 없는 고아: 맨 오른쪽에 배치 -----
    if (orphans.length > 0) {
      let maxCol = colMap.size > 0 ? Math.max(...colMap.values()) : -1;
      maxCol += 2; // 고아 그룹과 기존 그룹 사이 1열 여백
      this._coupleGroups(orphans, marriages).forEach(group => {
        group.forEach(id => { colMap.set(id, maxCol); maxCol++; });
      });
    }
  }

  // =========================================================================
  // 부부 그룹화
  // =========================================================================

  /**
   * ids 배열을 부부 쌍 우선으로 그룹화.
   * 반환: [[남편id, 아내id], [id], ...]
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
        // 남성 왼쪽, 여성 오른쪽
        const isMale = (p) => p?.gender === 'male';
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
  // 전체 중앙 정렬
  // =========================================================================

  _centerAll(persons) {
    if (persons.length === 0) return;
    const xs = persons.map(p => p.x);
    const ys = persons.map(p => p.y);
    const cx = this._snap((Math.min(...xs) + Math.max(...xs)) / 2);
    const cy = this._snap((Math.min(...ys) + Math.max(...ys)) / 2);
    // (0,0) 중심으로 이동 후 스냅 재적용
    persons.forEach(p => {
      p.x = this._snap(p.x - cx);
      p.y = this._snap(p.y - cy);
    });
  }
}
