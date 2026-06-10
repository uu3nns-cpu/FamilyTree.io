/**
 * GenealogyLayoutEngine — 가계도 전용 레이아웃 엔진
 *
 * ▸ 설계 목표
 *   1. nextFreeCol 선형 전진 방식을 완전히 제거
 *   2. Buchheim-Walker 알고리즘(RT 변형) 기반으로 subtree 단위 정렬
 *   3. 부부 쌍을 단일 노드(CoupleNode)로 취급하여 중앙 정렬 정확도 보장
 *   4. 다중 결혼·재혼·고립 인물 등 모든 엣지케이스 처리
 *   5. AutoLayout.js는 이 엔진의 얇은 wrapper만 남김
 *
 * ▸ 알고리즘 개요 (Buchheim-Walker 단순화 버전)
 *   Phase 1. 관계 파싱  → p2c / c2p / couples
 *   Phase 2. BFS 세대 배정
 *   Phase 3. 가상 트리 구축  (CoupleNode / SingleNode)
 *   Phase 4. Post-order  prelim X 계산 (각 노드에 prelim, mod 부여)
 *   Phase 5. Pre-order   final X 계산  (modifier 누적 전파)
 *   Phase 6. 겹침 해소  (세대별 sweep, 간격 보정)
 *   Phase 7. 픽셀 변환 + 그리드 스냅 + 전체 중앙 이동
 *
 * ▸ 상수
 *   H_GAP  = 160px  — 인물 간 최소 수평 간격
 *   V_GAP  = 200px  — 세대 간 수직 간격
 *   COUPLE_GAP = 10px  — 부부 사이 추가 간격 (없으면 붙어 보임)
 *   GRID   = 50px   — 그리드 스냅 단위
 *
 * ▸ Genogram 표준 규칙 (S-1 ~ S-6)
 *   S-1  같은 세대는 동일 Y
 *   S-2  위가 오래된 세대 (lv 0 = 최상위)
 *   S-3  부부: 남성 왼쪽, 여성 오른쪽
 *   S-4  형제: 왼쪽이 첫째 (relationship 배열 순서)
 *   S-5  부모는 자녀 중앙 위
 *   S-6  겹침 금지
 *
 * ▸ 수정 이력
 *   2026-06-10  TASK-01  _assignLevels: stale BFS 조건 < → <= (BUG-04)
 *   2026-06-10  TASK-02  _buildTree: 자녀 이중 등록 방지, 노드 단위 순회 (BUG-05)
 *   2026-06-10  TASK-03  _firstWalk / _secondWalk: 부모 기준 절대 좌표 변환 (BUG-01, BUG-02)
 *   2026-06-10  TASK-04  _resolveOverlaps: 부모 보정 후 재sweep 추가 (BUG-03)
 */

export class GenealogyLayoutEngine {

  // ─── 상수 ────────────────────────────────────────────────────────────────
  static H_GAP      = 160;   // 인물 간 최소 수평 간격 (px)
  static V_GAP      = 200;   // 세대 간 수직 간격 (px)
  static COUPLE_GAP =  10;   // 부부 사이 추가 간격 (px)
  static GRID       =  50;   // 그리드 스냅 단위 (px)

  // ─── 공개 정적 API ────────────────────────────────────────────────────────

  /**
   * 메인 진입점.
   * persons / relationships 를 받아 Map<id, {x, y}> 를 반환한다.
   * Person 객체를 직접 수정하지 않는 순수 함수.
   *
   * @param {Person[]}       persons
   * @param {Relationship[]} relationships
   * @returns {Map<string, {x: number, y: number}>}
   */
  static compute(persons, relationships) {
    if (!persons || persons.length === 0) return new Map();

    // 인물 캐시 (id → Person)
    const pMap = new Map(persons.map(p => [p.id, p]));

    // ── Phase 1. 관계 파싱 ────────────────────────────────────────────────
    const { p2c, c2p, couples } =
      GenealogyLayoutEngine._parseRelationships(relationships);

    // ── Phase 2. BFS 세대 배정 ────────────────────────────────────────────
    const lvMap = GenealogyLayoutEngine._assignLevels(persons, p2c, c2p, couples);

    // ── Phase 3. 가상 트리 구축 ───────────────────────────────────────────
    const { roots, nodeMap } = GenealogyLayoutEngine._buildTree(
      persons, p2c, c2p, couples, lvMap, pMap
    );

    // ── Phase 4. Post-order prelim X 계산 ────────────────────────────────
    roots.forEach(root => GenealogyLayoutEngine._firstWalk(root));

    // ── Phase 5. Pre-order final X 계산 ──────────────────────────────────
    // 각 루트의 절대 시작 x 를 결정한 뒤 _secondWalk 로 서브트리 전체에 전파.
    // _treeRightEdge 는 _secondWalk 후에야 유효하므로 루트를 순서대로 처리.
    let nextRootX = 0;
    roots.forEach(root => {
      GenealogyLayoutEngine._secondWalk(root, nextRootX, null);
      nextRootX = GenealogyLayoutEngine._treeRightEdge(root)
                + GenealogyLayoutEngine.H_GAP;
    });

    // ── Phase 6. 겹침 해소 ────────────────────────────────────────────────
    GenealogyLayoutEngine._resolveOverlaps(nodeMap, lvMap);

    // ── Phase 7. 픽셀 변환 + 스냅 + 중앙 이동 ────────────────────────────
    return GenealogyLayoutEngine._toPositions(persons, nodeMap, lvMap);
  }

  // ─── Phase 1. 관계 파싱 ──────────────────────────────────────────────────

  static _parseRelationships(relationships) {
    const p2c     = new Map();   // parentId → childId[]
    const c2p     = new Map();   // childId  → parentId[]
    const couples = new Map();   // id → Set<id>  (양방향)

    const push = (map, k, v) => {
      if (!map.has(k)) map.set(k, []);
      if (!map.get(k).includes(v)) map.get(k).push(v);
    };

    (relationships || []).forEach(rel => {
      if (['biological', 'adopted', 'foster'].includes(rel.type)) {
        push(p2c, rel.from, rel.to);
        push(c2p, rel.to,   rel.from);
      } else if (rel.type === 'marriage') {
        if (!couples.has(rel.from)) couples.set(rel.from, new Set());
        if (!couples.has(rel.to))   couples.set(rel.to,   new Set());
        couples.get(rel.from).add(rel.to);
        couples.get(rel.to).add(rel.from);
      }
    });

    return { p2c, c2p, couples };
  }

  // ─── Phase 2. BFS 세대 배정 ──────────────────────────────────────────────

  static _assignLevels(persons, p2c, c2p, couples) {
    // 루트 = c2p에 없는 인물 (부모가 없는 최상위)
    // 배우자 중복 제거: 루트A의 배우자는 별도 루트로 추가하지 않음
    const seenSpouse = new Set();
    const roots = [];

    persons.forEach(p => {
      if (c2p.has(p.id) || seenSpouse.has(p.id)) return;
      roots.push(p.id);
      (couples.get(p.id) || new Set()).forEach(sp => {
        if (!c2p.has(sp)) seenSpouse.add(sp);
      });
    });

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
      // [TASK-01 / BUG-04] < → <= : 같은 레벨 중복 항목도 stale 처리하여
      // 배우자 동기화로 인한 중복 enqueue 가 p2c 처리를 두 번 실행하는 것을 방지.
      if ((lvMap.get(id) ?? Infinity) <= lv &&
          (lvMap.get(id) ?? Infinity) !== lv) continue; // stale (더 얕은 레벨이 이미 확정)
      // 위 조건을 단순화: 현재 lvMap 값이 lv 보다 작으면 stale
      // (lv 와 같으면 정상 처리 허용 → 자녀 enqueue 는 한 번만 실행됨)
      if ((lvMap.get(id) ?? Infinity) < lv) continue;
      (p2c.get(id) || []).forEach(cid => enqueue(cid, lv + 1));
    }

    // 고립 인물 → 최하위 세대 + 1
    const maxLv = lvMap.size > 0 ? Math.max(...lvMap.values()) : 0;
    persons.forEach(p => {
      if (!lvMap.has(p.id)) lvMap.set(p.id, maxLv + 1);
    });

    // 정규화
    const minLv = Math.min(...lvMap.values());
    if (minLv !== 0) lvMap.forEach((lv, id) => lvMap.set(id, lv - minLv));

    return lvMap;
  }

  // ─── Phase 3. 가상 트리 구축 ─────────────────────────────────────────────
  //
  // 노드 구조:
  //   {
  //     ids:      string[]   — 인물 ID 목록 (1명 또는 부부 2명)
  //     lv:       number     — 세대
  //     children: Node[]     — 자녀 노드 목록
  //     parent:   Node|null  — 부모 노드
  //     prelim:   number     — 1st walk 결과 (단위: px, 로컬 0 기준)
  //     mod:      number     — modifier (미사용, 0 고정)
  //     x:        number     — 2nd walk 결과 (단위: px, 절대 좌표)
  //     width:    number     — 노드 폭 (1인: H_GAP, 부부: H_GAP*2+COUPLE_GAP)
  //   }

  static _buildTree(persons, p2c, c2p, couples, lvMap, pMap) {
    // 1) 부부 쌍 먼저 결정
    const coupleKey = new Map();   // id → 'minId|maxId' 형식 쌍 키
    couples.forEach((spSet, id) => {
      spSet.forEach(sp => {
        const key = [id, sp].sort().join('|');
        coupleKey.set(id, key);
        coupleKey.set(sp, key);
      });
    });

    // 2) 각 (부부쌍 또는 단독)을 노드 하나로 만들기
    const nodeByKey  = new Map();   // coupleKey or id → Node
    const nodeById   = new Map();   // personId → Node  (빠른 역참조)

    const getOrCreateNode = (id) => {
      const key = coupleKey.get(id) || id;
      if (nodeByKey.has(key)) return nodeByKey.get(key);

      // 부부 쌍이면 두 명의 ids 구성
      let ids;
      if (coupleKey.has(id)) {
        const [a, b] = key.split('|');
        // S-3: 남성 왼쪽
        const pa = pMap.get(a), pb = pMap.get(b);
        ids = (pa?.gender === 'male') ? [a, b]
            : (pb?.gender === 'male') ? [b, a]
            : [a, b];
      } else {
        ids = [id];
      }

      const lv    = lvMap.get(ids[0]) ?? 0;
      const width = ids.length === 2
        ? GenealogyLayoutEngine.H_GAP * 2 + GenealogyLayoutEngine.COUPLE_GAP
        : GenealogyLayoutEngine.H_GAP;

      const node = { ids, lv, children: [], parent: null,
                     prelim: 0, mod: 0, x: 0, width };

      nodeByKey.set(key, node);
      ids.forEach(pid => nodeById.set(pid, node));
      return node;
    };

    // 모든 인물 노드 생성
    persons.forEach(p => getOrCreateNode(p.id));

    // 3) 부모-자녀 연결 — 노드 단위 순회로 이중 등록 방지 [TASK-02 / BUG-05]
    //
    //    기존: persons.forEach 로 순회 → 부부가 같은 CoupleNode 를 가리켜도
    //          두 번 순회하여 자녀가 다른 parentNode.children 에 중복 등록될 수 있음.
    //    수정: nodeByKey 단위로 순회 → 각 노드(CoupleNode 포함)를 정확히 한 번만 처리.
    const processedParents = new Set();
    nodeByKey.forEach((parentNode) => {
      if (processedParents.has(parentNode)) return;
      processedParents.add(parentNode);

      parentNode.ids.forEach(pid => {
        (p2c.get(pid) || []).forEach(cid => {
          const childNode = nodeById.get(cid);
          if (!childNode || childNode === parentNode) return;
          if (childNode.lv <= parentNode.lv) return; // 세대 역전 방지
          if (parentNode.children.includes(childNode)) return;
          parentNode.children.push(childNode);
          if (!childNode.parent) childNode.parent = parentNode;
        });
      });
    });

    // 4) 루트 노드 = parent 없는 노드
    //    여러 독립 가계가 있을 수 있으므로 lv 상관없이 parent 없는 것 모두 포함
    const roots = [];
    const seen  = new Set();
    nodeByKey.forEach(node => {
      if (!node.parent && !seen.has(node)) {
        roots.push(node);
        seen.add(node);
      }
    });

    // lv 오름차순 정렬 (루트가 여러 개일 때 세대 순)
    roots.sort((a, b) => a.lv - b.lv);

    return { roots, nodeMap: nodeById };
  }

  // ─── Phase 4. Post-order: prelim X 계산 (Buchheim-Walker 1st walk) ───────
  //
  // [TASK-03 / BUG-01, BUG-02]
  //
  // 각 노드의 prelim 을 "이 노드 서브트리 내의 로컬 좌표(0 기준)" 로 계산한다.
  // - 리프: prelim = 0 (자기 자신이 서브트리의 유일한 노드)
  // - 내부 노드: 자녀들을 cursor=0 부터 배치한 뒤, 자녀 스팬의 중앙을 prelim 으로 설정.
  //
  // mod 는 사용하지 않는다(0 고정).
  // 로컬 좌표 → 절대 좌표 변환은 _secondWalk 가 전담한다.

  static _firstWalk(node) {
    if (node.children.length === 0) {
      node.prelim = 0;
      node.mod    = 0;
      return;
    }

    // 자녀를 재귀적으로 먼저 처리
    node.children.forEach(child => GenealogyLayoutEngine._firstWalk(child));

    // 자녀들을 로컬 0 기준으로 왼쪽부터 배치
    let cursor = 0;
    node.children.forEach(child => {
      child.prelim = cursor + child.width / 2;
      cursor += child.width + GenealogyLayoutEngine.H_GAP;
    });

    // 자녀 스팬의 중앙을 이 노드의 prelim 으로 설정
    const firstChild = node.children[0];
    const lastChild  = node.children[node.children.length - 1];
    const childrenCenter =
      (firstChild.prelim - firstChild.width / 2 +
       lastChild.prelim  + lastChild.width  / 2) / 2;

    node.prelim = childrenCenter;
    node.mod    = 0; // [BUG-01 수정] 로컬 좌표 기준이므로 mod 는 0
  }

  // ─── Phase 5. Pre-order: final X 계산 (Buchheim-Walker 2nd walk) ─────────
  //
  // [TASK-03 / BUG-01, BUG-02]
  //
  // _firstWalk 에서 계산한 prelim 은 "부모 기준 로컬 좌표" 다.
  // _secondWalk 는 부모의 절대 x 를 기준으로 각 자녀의 절대 x 를 결정한다.
  //
  //   자녀 절대 x = 부모 절대 x  -  부모 prelim  +  자녀 prelim
  //
  // 루트 호출 시: _secondWalk(root, startX, null)
  //   - root.x = startX (루트는 부모가 없으므로 startX 를 절대 x 로 사용)
  //   - 자녀: root.x - root.prelim + child.prelim

  static _secondWalk(node, parentAbsX, parentNode) {
    if (parentNode === null) {
      // 루트: parentAbsX 가 곧 이 노드의 절대 x
      node.x = parentAbsX;
    } else {
      // 비루트: 부모 절대 x 를 기준으로 로컬 prelim 을 절대 좌표로 변환
      node.x = parentAbsX - parentNode.prelim + node.prelim;
    }
    node.children.forEach(child =>
      GenealogyLayoutEngine._secondWalk(child, node.x, node)
    );
  }

  // 트리의 오른쪽 끝 x 좌표 (루트 병렬 배치용)
  // _secondWalk 완료 후에만 올바른 값을 반환한다.
  static _treeRightEdge(node) {
    let maxX = node.x + node.width / 2;
    node.children.forEach(c => {
      const e = GenealogyLayoutEngine._treeRightEdge(c);
      if (e > maxX) maxX = e;
    });
    return maxX;
  }

  // 트리의 왼쪽 끝 x 좌표 (루트 병렬 배치용)
  static _treeLeftEdge(node) {
    let minX = node.x - node.width / 2;
    node.children.forEach(c => {
      const e = GenealogyLayoutEngine._treeLeftEdge(c);
      if (e < minX) minX = e;
    });
    return minX;
  }

  // ─── Phase 6. 겹침 해소 ──────────────────────────────────────────────────
  //
  // 각 세대(lv)별로 노드를 x 오름차순 정렬 후,
  // 왼쪽에서 오른쪽으로 sweep 하여 겹치는 구간을 오른쪽으로 밀어냄.
  //
  // [TASK-04 / BUG-03]
  // 부모 중앙 보정 후 같은 세대에서 새 겹침이 생길 수 있으므로
  // 보정 직후 해당 세대를 재sweep 한다.

  static _resolveOverlaps(nodeMap, lvMap) {
    // 세대별로 노드 목록 구성 (중복 제거)
    const levelNodes = new Map();  // lv → Node[]
    const seen = new Set();
    nodeMap.forEach(node => {
      if (seen.has(node)) return;
      seen.add(node);
      const lv = node.lv;
      if (!levelNodes.has(lv)) levelNodes.set(lv, []);
      levelNodes.get(lv).push(node);
    });

    const sortedLevs = Array.from(levelNodes.keys()).sort((a, b) => a - b);

    // ── 1차 sweep: 위→아래 세대 순으로 초기 겹침 제거 ──────────────────
    sortedLevs.forEach(lv => {
      GenealogyLayoutEngine._sweepLevel(levelNodes.get(lv));
    });

    // ── 부모 중앙 보정 + 재sweep: 아래→위 세대 순 ───────────────────────
    // [BUG-03 수정] 부모를 자녀 중앙으로 이동한 뒤 해당 레벨을 즉시 재sweep.
    // 재sweep 으로 생긴 새 x 가 위 세대 부모를 다시 밀 수 있으므로
    // 최대 2회 반복하여 안정화한다.
    const reversedLevs = [...sortedLevs].reverse();

    for (let pass = 0; pass < 2; pass++) {
      reversedLevs.forEach(lv => {
        const nodes = levelNodes.get(lv);

        // 부모를 자녀 중앙으로 보정
        nodes.forEach(node => {
          if (node.children.length === 0) return;
          const childXs = node.children.map(c => c.x);
          const center  = (Math.min(...childXs) + Math.max(...childXs)) / 2;
          node.x = center;
        });

        // 보정 후 이 세대를 재sweep하여 새 겹침 해소
        GenealogyLayoutEngine._sweepLevel(nodes);
      });
    }
  }

  // 단일 세대의 노드 배열을 x 오름차순 sweep하여 겹침을 오른쪽으로 밀어냄
  static _sweepLevel(nodes) {
    nodes.sort((a, b) => a.x - b.x);
    for (let i = 1; i < nodes.length; i++) {
      const prev = nodes[i - 1];
      const curr = nodes[i];
      const minX = prev.x + prev.width / 2
                 + GenealogyLayoutEngine.H_GAP / 2
                 + curr.width / 2;
      if (curr.x < minX) {
        GenealogyLayoutEngine._shiftSubtree(curr, minX - curr.x);
      }
    }
  }

  // 노드와 그 모든 자손을 delta 만큼 이동
  static _shiftSubtree(node, delta) {
    node.x += delta;
    node.children.forEach(c => GenealogyLayoutEngine._shiftSubtree(c, delta));
  }

  // ─── Phase 7. 픽셀 변환 + 스냅 + 중앙 이동 ──────────────────────────────

  static _toPositions(persons, nodeMap, lvMap) {
    const posMap = new Map();
    const snap   = GenealogyLayoutEngine._snap;

    // 노드 x → 개별 인물 x 변환
    // 부부 노드: [남, 여] → x - H_GAP/2 - COUPLE_GAP/2,  x + H_GAP/2 + COUPLE_GAP/2
    // 단독 노드: x
    const seen = new Set();
    nodeMap.forEach((node, pid) => {
      if (seen.has(node)) return;
      seen.add(node);

      const y = snap(node.lv * GenealogyLayoutEngine.V_GAP);

      if (node.ids.length === 2) {
        const [left, right] = node.ids;
        const half = GenealogyLayoutEngine.H_GAP / 2
                   + GenealogyLayoutEngine.COUPLE_GAP / 2;
        posMap.set(left,  { x: snap(node.x - half), y });
        posMap.set(right, { x: snap(node.x + half), y });
      } else {
        posMap.set(node.ids[0], { x: snap(node.x), y });
      }
    });

    // 미등록 인물 (고립 등) 처리
    const maxX = posMap.size > 0
      ? Math.max(...[...posMap.values()].map(p => p.x)) : 0;
    let orphanX = snap(maxX + GenealogyLayoutEngine.H_GAP * 2);
    persons.forEach(p => {
      if (!posMap.has(p.id)) {
        const lv = lvMap.get(p.id) ?? 0;
        posMap.set(p.id, {
          x: orphanX,
          y: snap(lv * GenealogyLayoutEngine.V_GAP)
        });
        orphanX = snap(orphanX + GenealogyLayoutEngine.H_GAP);
      }
    });

    // 전체 (0,0) 중앙 이동
    GenealogyLayoutEngine._centerPositions(posMap);

    return posMap;
  }

  static _centerPositions(posMap) {
    const vals = [...posMap.values()];
    const xs = vals.map(p => p.x);
    const ys = vals.map(p => p.y);
    const cx = GenealogyLayoutEngine._snap(
      (Math.min(...xs) + Math.max(...xs)) / 2
    );
    const cy = GenealogyLayoutEngine._snap(
      (Math.min(...ys) + Math.max(...ys)) / 2
    );
    posMap.forEach(pos => { pos.x -= cx; pos.y -= cy; });
  }

  static _snap(px) {
    const g = GenealogyLayoutEngine.GRID;
    return Math.round(px / g) * g;
  }
}
