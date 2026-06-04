/**
 * AutoLayout - Genogram 자동 정렬 시스템
 * js/pages/canvas.js에서 import하여 사용합니다.
 * 하위 세대를 고려한 동적 간격 조정
 */

export class AutoLayout {
  constructor(canvasState) {
    this.canvasState = canvasState;

    this.H_SPACING = 160; // 인물 간 수평 간격
    this.V_SPACING = 180; // 세대 간 수직 간격
    this.START_X  = 100;
    this.START_Y  = 100;
  }

  // =========================================================================
  // 진입점
  // =========================================================================

  autoArrange() {
    const persons       = this.canvasState.persons;
    const relationships = this.canvasState.relationships;

    if (!persons || persons.length === 0) return;

    // 1) 세대 맵 구축
    const { personLevel, parentToChildren, marriages } =
      this._buildGraph(persons, relationships);

    // 2) 최소 레벨을 0 으로 정규화
    const levels = Array.from(personLevel.values());
    const minLv  = Math.min(...levels);
    personLevel.forEach((lv, id) => personLevel.set(id, lv - minLv));

    // 3) 세대별 그룹
    const genMap = new Map(); // level → personId[]
    personLevel.forEach((lv, id) => {
      if (!genMap.has(lv)) genMap.set(lv, []);
      genMap.get(lv).push(id);
    });

    // 4) 각 세대 순서대로 X 좌표 배정
    const posX = new Map(); // personId → x
    const sortedLevels = Array.from(genMap.keys()).sort((a, b) => a - b);

    sortedLevels.forEach(lv => {
      const ids = genMap.get(lv);
      // 부모 그룹별로 묶어서 배치
      this._assignX(ids, posX, parentToChildren, marriages, personLevel, lv === sortedLevels[0]);
    });

    // 5) 좌표 적용
    posX.forEach((x, id) => {
      const person = this.canvasState.getPersonById(id);
      if (person) {
        person.x = this.START_X + x;
        person.y = this.START_Y + personLevel.get(id) * this.V_SPACING;
      }
    });

    // 6) 전체 레이아웃 가운데 정렬
    this._centerAll(persons);
  }

  // =========================================================================
  // 내부 메서드
  // =========================================================================

  /**
   * 관계 그래프 구축 → personLevel(BFS), parentToChildren, marriages 반환
   */
  _buildGraph(persons, relationships) {
    const parentToChildren = new Map(); // parentId → childId[]
    const childToParents   = new Map(); // childId  → parentId[]
    const marriages        = new Map(); // personId → spouseId

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

    // 루트 찾기: 부모가 없는 인물 (배우자 중복 제거)
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

    // BFS 로 레벨 부여
    const personLevel = new Map();
    const visited     = new Set();
    const queue       = [];

    const enqueue = (id, lv) => {
      if (visited.has(id)) return;
      visited.add(id);
      personLevel.set(id, lv);
      queue.push({ id, lv });
      // 배우자는 같은 레벨
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

    // 방문 못한 인물은 가장 아래 세대에 배치
    const maxLv = personLevel.size > 0 ? Math.max(...personLevel.values()) : 0;
    persons.forEach(p => {
      if (!personLevel.has(p.id)) personLevel.set(p.id, maxLv + 1);
    });

    return { personLevel, parentToChildren, childToParents, marriages };
  }

  /**
   * 한 세대의 인물들에게 X 픽셀 위치를 부여한다.
   * 이미 위 세대(posX)가 채워진 경우, 부모 중심 아래에 자녀를 배치한다.
   */
  _assignX(ids, posX, parentToChildren, marriages, personLevel, isFirstGen) {
    // 이미 posX 에 들어간 인물 제외
    const unplaced = ids.filter(id => !posX.has(id));
    if (unplaced.length === 0) return;

    if (isFirstGen || posX.size === 0) {
      // 첫 세대: 왼쪽부터 순서대로
      const groups = this._coupleGroups(unplaced, marriages);
      let cursor = 0;
      groups.forEach(group => {
        group.forEach(id => {
          posX.set(id, cursor);
          cursor += this.H_SPACING;
        });
      });
      return;
    }

    // 이후 세대: 부모 X 중심 아래 배치
    // 부모별 자녀 그룹 구성
    const parentKeys = new Map(); // sortedParentKey → childId[]
    const orphans    = [];

    unplaced.forEach(cid => {
      // 이 인물의 부모 중 posX 에 있는 부모들 수집
      const myParents = [];
      parentToChildren.forEach((children, pid) => {
        if (children.includes(cid) && posX.has(pid)) myParents.push(pid);
      });

      if (myParents.length === 0) {
        orphans.push(cid);
        return;
      }

      const key = myParents.slice().sort().join('|');
      if (!parentKeys.has(key)) parentKeys.set(key, []);
      parentKeys.get(key).push(cid);
    });

    // 배우자(부모 없는 쪽)를 자녀 그룹에 합류
    parentKeys.forEach((childIds, key) => {
      const toAdd = [];
      childIds.forEach(cid => {
        const sp = marriages.get(cid);
        if (sp && !posX.has(sp) && !childIds.includes(sp) && unplaced.includes(sp)) {
          toAdd.push(sp);
        }
      });
      toAdd.forEach(id => childIds.push(id));
    });

    // 부모 그룹을 부모 중심 X 순으로 정렬
    const sortedGroups = Array.from(parentKeys.entries())
      .map(([key, childIds]) => {
        const parentIds  = key.split('|');
        const parentXAvg = parentIds.reduce((s, pid) => s + (posX.get(pid) || 0), 0)
                         / parentIds.length;
        return { parentXAvg, childIds };
      })
      .sort((a, b) => a.parentXAvg - b.parentXAvg);

    // 충돌 없이 배치
    let cursor = 0;
    sortedGroups.forEach(({ parentXAvg, childIds }) => {
      const groups    = this._coupleGroups(childIds, marriages);
      const totalW    = (childIds.length - 1) * this.H_SPACING;
      let   startX    = parentXAvg - totalW / 2;

      // 이전 그룹과 겹치면 오른쪽으로 밀기
      if (startX < cursor) startX = cursor;

      groups.forEach(group => {
        group.forEach(id => {
          posX.set(id, startX);
          startX += this.H_SPACING;
        });
      });

      cursor = startX + this.H_SPACING * 0.25; // 그룹 간 여유
    });

    // 고아 처리: 가장 오른쪽에 배치
    if (orphans.length > 0) {
      let maxX = posX.size > 0 ? Math.max(...posX.values()) : 0;
      maxX += this.H_SPACING;
      this._coupleGroups(orphans, marriages).forEach(group => {
        group.forEach(id => {
          posX.set(id, maxX);
          maxX += this.H_SPACING;
        });
      });
    }
  }

  /**
   * personId 배열을 부부 쌍 우선으로 그룹화.
   * 반환: [[id, spouseId], [id], ...] 형태
   */
  _coupleGroups(ids, marriages) {
    const result    = [];
    const processed = new Set();

    ids.forEach(id => {
      if (processed.has(id)) return;
      const sp = marriages.get(id);
      if (sp && ids.includes(sp) && !processed.has(sp)) {
        // 남성 왼쪽, 여성 오른쪽
        const person = this.canvasState.getPersonById(id);
        const spouse = this.canvasState.getPersonById(sp);
        const left  = (person?.gender === 'female' && spouse?.gender !== 'female') ? sp : id;
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

  /**
   * 전체 레이아웃을 (0,0) 기준으로 재중심 정렬
   */
  _centerAll(persons) {
    if (persons.length === 0) return;
    const xs = persons.map(p => p.x);
    const ys = persons.map(p => p.y);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    // 캔버스 중심(0,0 월드 좌표)에 맞추기 — canvas.js centerView() 가 뷰포트를 조정함
    persons.forEach(p => {
      p.x -= cx;
      p.y -= cy;
    });
  }
}
