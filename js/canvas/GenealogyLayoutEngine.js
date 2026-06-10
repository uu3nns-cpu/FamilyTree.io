/**
 * GenealogyLayoutEngine — 가계도 레이아웃 단일 진입점
 *
 * ▸ 이 파일이 레이아웃에 관한 유일한 진실의 원천(Single Source of Truth)이다.
 *   레이아웃 관련 다른 파일들은 모두 이 파일로 통폐합되었다.
 *
 * ▸ 외부 호출 인터페이스 (canvas.js 기준)
 *   - new GenealogyLayoutEngine(canvasState)   → 인스턴스 생성
 *   - instance.layout()                        → 자동정렬 실행 (persons.x/y 갱신)
 *   - GenealogyLayoutEngine.compute(persons, relationships) → 순수 함수 (Map 반환)
 *
 * ▸ 알고리즘 개요 (Buchheim-Walker 단순화 버전)
 *   Phase 1. 관계 파싱   → p2c / c2p / couples
 *   Phase 2. BFS 세대 배정
 *   Phase 3. 가상 트리 구축  (CoupleNode / SingleNode)
 *   Phase 4. Post-order  prelim X 계산 (각 노드에 prelim, mod 부여)
 *   Phase 5. Pre-order   final X 계산  (modifier 누적 전파)
 *   Phase 6. 겹침 해소  (세대별 sweep + 부모 중앙 보정)
 *   Phase 7. 픽셀 변환 + 그리드 스냅 + 전체 중앙 이동
 *
 * ▸ 레이아웃 규칙 (S-1 ~ S-6)
 *   S-1  같은 세대는 동일 Y
 *   S-2  위가 오래된 세대 (lv 0 = 최상위)
 *   S-3  부부: 남성 왼쪽, 여성 오른쪽
 *   S-4  형제: 왼쪽이 첫째 (relationship 배열 순서)
 *   S-5  부모는 자녀 중앙 위
 *   S-6  겹침 금지
 *
 * ▸ 상수
 *   H_GAP      = 160px — 인물 간 최소 수평 간격
 *   V_GAP      = 200px — 세대 간 수직 간격
 *   COUPLE_GAP =  10px — 부부 사이 추가 간격
 *   GRID       =  50px — 그리드 스냅 단위
 *
 * ▸ 삭제된 파일 목록 (이 파일로 통폐합)
 *   - js/canvas/AutoLayout.js           (래퍼, 불필요)
 *   - js/render.js                      (미사용 레거시, canvas.html에 로드 안 됨)
 *
 * ▸ 수정 이력
 *   2026-06-10  TASK-01  _assignLevels: stale BFS 조건 수정 (BUG-04)
 *   2026-06-10  TASK-02  _buildTree: 자녀 이중 등록 방지 (BUG-05)
 *   2026-06-10  TASK-03  _firstWalk / _secondWalk: 절대 좌표 변환 (BUG-01, BUG-02)
 *   2026-06-10  TASK-04  _resolveOverlaps: 부모 보정 후 재sweep (BUG-03)
 *   2026-06-10  REFACTOR AutoLayout.js 흡수, render.js 레거시 제거
 *   2026-06-10  BUG-06   CoupleNode 혈연 앵커 수정
 *                        증상: 외조부모가 아내(자녀) 기준이 아닌 남편-아내 쌍 중심으로 정렬됨
 *                        원인 A (_buildTree): 아내가 남편-아내 CoupleNode로 흡수되면서
 *                                CoupleNode 전체가 외조부모의 자녀로 등록됨.
 *                                부모-자녀 링크에 실제 혈연 개인id(anchorId) 기록 필요.
 *                        원인 B (_resolveOverlaps): 부모 중앙 보정 시 자녀 CoupleNode.x
 *                                (쌍 전체 중심)를 쓰므로 실제 혈연 자녀 위치와 어긋남.
 *                        수정: parentNode.children 항목에 { node, anchorIds } 구조 추가.
 *                              _parentAnchorX() 헬퍼로 실제 혈연 id 기준 x 계산.
 *                              _resolveOverlaps, _firstWalk 에서 앵커 x 사용.
 */

export class GenealogyLayoutEngine {

  // ─── 상수 ────────────────────────────────────────────────────────────────
  static H_GAP      = 160;
  static V_GAP      = 200;
  static COUPLE_GAP =  10;
  static GRID       =  50;

  static get H_SPACING() { return GenealogyLayoutEngine.H_GAP; }
  static get V_SPACING() { return GenealogyLayoutEngine.V_GAP; }
  static get GAP()       { return 1; }

  // ─── 인스턴스 ────────────────────────────────────────────────────────────

  constructor(canvasState) {
    this.canvasState = canvasState;
  }

  layout() {
    const { persons, relationships } = this.canvasState;
    if (!persons || persons.length === 0) return;
    const posMap = GenealogyLayoutEngine.compute(persons, relationships);
    persons.forEach(p => {
      const pos = posMap.get(p.id);
      if (pos) { p.x = pos.x; p.y = pos.y; }
    });
  }

  // ─── 공개 정적 API ────────────────────────────────────────────────────────

  static compute(persons, relationships) {
    if (!persons || persons.length === 0) return new Map();

    const pMap = new Map(persons.map(p => [p.id, p]));

    const { p2c, c2p, couples } =
      GenealogyLayoutEngine._parseRelationships(relationships);

    const lvMap = GenealogyLayoutEngine._assignLevels(persons, p2c, c2p, couples);

    const { roots, nodeMap } = GenealogyLayoutEngine._buildTree(
      persons, p2c, c2p, couples, lvMap, pMap
    );

    roots.forEach(root => GenealogyLayoutEngine._firstWalk(root));

    let nextRootX = 0;
    roots.forEach(root => {
      GenealogyLayoutEngine._secondWalk(root, nextRootX, null);
      nextRootX = GenealogyLayoutEngine._treeRightEdge(root)
                + GenealogyLayoutEngine.H_GAP;
    });

    GenealogyLayoutEngine._resolveOverlaps(nodeMap, lvMap);

    return GenealogyLayoutEngine._toPositions(persons, nodeMap, lvMap);
  }

  // ─── Phase 1. 관계 파싱 ──────────────────────────────────────────────────

  static _parseRelationships(relationships) {
    const p2c     = new Map();
    const c2p     = new Map();
    const couples = new Map();

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
      if ((lvMap.get(id) ?? Infinity) < lv) continue;
      (p2c.get(id) || []).forEach(cid => enqueue(cid, lv + 1));
    }

    const maxLv = lvMap.size > 0 ? Math.max(...lvMap.values()) : 0;
    persons.forEach(p => {
      if (!lvMap.has(p.id)) lvMap.set(p.id, maxLv + 1);
    });

    const minLv = Math.min(...lvMap.values());
    if (minLv !== 0) lvMap.forEach((lv, id) => lvMap.set(id, lv - minLv));

    return lvMap;
  }

  // ─── Phase 3. 가상 트리 구축 ─────────────────────────────────────────────
  //
  // [BUG-06 수정]
  // parentNode.children を 단순 Node[] 에서 { node, anchorIds }[] 로 변경.
  //
  //   anchorIds: 이 부모→자녀 링크의 실제 혈연 자녀 id 목록.
  //              자녀 노드가 CoupleNode일 때, 쌍 전체가 아닌
  //              혈연이 있는 개인(들)의 id만 포함한다.
  //
  // 예) 외조부모 → 아내(아내는 남편-아내 CoupleNode 소속)
  //     anchorIds = ['아내id']   ← 남편id 는 포함하지 않음
  //
  // 이 정보를 _firstWalk, _resolveOverlaps 에서 활용하여
  // 부모 정렬 기준 x 를 "쌍 전체 중심" 이 아닌 "혈연 자녀 x" 로 계산한다.

  static _buildTree(persons, p2c, c2p, couples, lvMap, pMap) {
    const coupleKey = new Map();
    couples.forEach((spSet, id) => {
      spSet.forEach(sp => {
        const key = [id, sp].sort().join('|');
        coupleKey.set(id, key);
        coupleKey.set(sp, key);
      });
    });

    const nodeByKey = new Map();
    const nodeById  = new Map();

    const getOrCreateNode = (id) => {
      const key = coupleKey.get(id) || id;
      if (nodeByKey.has(key)) return nodeByKey.get(key);

      let ids;
      if (coupleKey.has(id)) {
        const [a, b] = key.split('|');
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

      // children: { node: Node, anchorIds: string[] }[]
      const node = { ids, lv, children: [], parent: null,
                     prelim: 0, mod: 0, x: 0, width };

      nodeByKey.set(key, node);
      ids.forEach(pid => nodeById.set(pid, node));
      return node;
    };

    persons.forEach(p => getOrCreateNode(p.id));

    // 부모→자녀 연결. anchorIds 에 실제 혈연 자녀 id 기록.
    const processedParents = new Set();
    nodeByKey.forEach((parentNode) => {
      if (processedParents.has(parentNode)) return;
      processedParents.add(parentNode);

      // 이 parentNode 에서 실제로 혈연 관계가 있는 자녀 id 집합
      const childrenWithAnchor = new Map(); // childNode → anchorIds(Set)

      parentNode.ids.forEach(pid => {
        (p2c.get(pid) || []).forEach(cid => {
          const childNode = nodeById.get(cid);
          if (!childNode || childNode === parentNode) return;
          if (childNode.lv <= parentNode.lv) return;

          if (!childrenWithAnchor.has(childNode)) {
            childrenWithAnchor.set(childNode, new Set());
          }
          // cid 가 이 부모와 직접 혈연인 자녀 id
          childrenWithAnchor.get(childNode).add(cid);
        });
      });

      childrenWithAnchor.forEach((anchorSet, childNode) => {
        // 이미 다른 부모에 의해 children 에 등록됐을 수 있으므로 중복 방지
        const alreadyLinked = parentNode.children.some(e => e.node === childNode);
        if (alreadyLinked) return;

        parentNode.children.push({
          node:      childNode,
          anchorIds: Array.from(anchorSet),
        });
        if (!childNode.parent) childNode.parent = parentNode;
      });
    });

    const roots = [];
    const seen  = new Set();
    nodeByKey.forEach(node => {
      if (!node.parent && !seen.has(node)) {
        roots.push(node);
        seen.add(node);
      }
    });

    roots.sort((a, b) => a.lv - b.lv);

    return { roots, nodeMap: nodeById };
  }

  // ─── 헬퍼: 자녀 entry 에서 앵커 x 계산 ──────────────────────────────────
  //
  // [BUG-06] CoupleNode 자녀의 경우 node.x 는 쌍 전체 중심이지만,
  // 실제 혈연으로 연결된 개인이 CoupleNode 안에서 left / right 어느 쪽인지에
  // 따라 오프셋을 더해야 한다.
  //
  //   CoupleNode ids = [leftId, rightId]
  //   left  x = node.x - half
  //   right x = node.x + half
  //
  // anchorIds 가 모두 left 쪽이면 → node.x - half
  // anchorIds 가 모두 right 쪽이면 → node.x + half
  // 혼합(두 명 모두 혈연) 또는 SingleNode → node.x

  static _anchorX(childEntry) {
    const { node, anchorIds } = childEntry;
    if (!anchorIds || anchorIds.length === 0 || node.ids.length === 1) {
      return node.x;
    }
    const half = GenealogyLayoutEngine.H_GAP / 2
               + GenealogyLayoutEngine.COUPLE_GAP / 2;
    const [leftId, rightId] = node.ids;
    const hasLeft  = anchorIds.includes(leftId);
    const hasRight = anchorIds.includes(rightId);

    if (hasLeft && !hasRight)  return node.x - half;   // 혈연=왼쪽(남성)
    if (hasRight && !hasLeft)  return node.x + half;   // 혈연=오른쪽(여성)
    return node.x;                                      // 둘 다 혈연 → 중심
  }

  // ─── Phase 4. Post-order: prelim X 계산 ──────────────────────────────────
  //
  // [BUG-06] children 구조가 { node, anchorIds }[] 로 바뀌었으므로
  // child 참조를 entry.node 로, 폭 계산도 entry.node.width 로 변경.
  // 부모의 prelim 은 자녀 앵커 x 스팬의 중앙으로 결정한다.

  static _firstWalk(node) {
    if (node.children.length === 0) {
      node.prelim = 0;
      node.mod    = 0;
      return;
    }

    node.children.forEach(entry => GenealogyLayoutEngine._firstWalk(entry.node));

    // 자녀 노드들을 로컬 0 기준으로 왼쪽부터 배치
    let cursor = 0;
    node.children.forEach(entry => {
      const child = entry.node;
      child.prelim = cursor + child.width / 2;
      cursor += child.width + GenealogyLayoutEngine.H_GAP;
    });

    // 부모 prelim = 자녀 앵커 스팬의 중앙
    // anchorIds 가 있으면 앵커 오프셋을 prelim 에 반영한다.
    //
    // 각 자녀의 "앵커 로컬 x":
    //   SingleNode → child.prelim
    //   CoupleNode (혈연=왼쪽) → child.prelim - half
    //   CoupleNode (혈연=오른쪽) → child.prelim + half
    //   CoupleNode (둘다 혈연) → child.prelim

    const anchorPrelims = node.children.map(entry => {
      const child = entry.node;
      if (!entry.anchorIds || entry.anchorIds.length === 0 || child.ids.length === 1) {
        return child.prelim;
      }
      const half = GenealogyLayoutEngine.H_GAP / 2
                 + GenealogyLayoutEngine.COUPLE_GAP / 2;
      const [leftId, rightId] = child.ids;
      const hasLeft  = entry.anchorIds.includes(leftId);
      const hasRight = entry.anchorIds.includes(rightId);
      if (hasLeft  && !hasRight) return child.prelim - half;
      if (hasRight && !hasLeft)  return child.prelim + half;
      return child.prelim;
    });

    const minAnchor = Math.min(...anchorPrelims);
    const maxAnchor = Math.max(...anchorPrelims);
    node.prelim = (minAnchor + maxAnchor) / 2;
    node.mod    = 0;
  }

  // ─── Phase 5. Pre-order: final X 계산 ────────────────────────────────────

  static _secondWalk(node, parentAbsX, parentNode) {
    if (parentNode === null) {
      node.x = parentAbsX;
    } else {
      node.x = parentAbsX - parentNode.prelim + node.prelim;
    }
    node.children.forEach(entry =>
      GenealogyLayoutEngine._secondWalk(entry.node, node.x, node)
    );
  }

  static _treeRightEdge(node) {
    let maxX = node.x + node.width / 2;
    node.children.forEach(entry => {
      const e = GenealogyLayoutEngine._treeRightEdge(entry.node);
      if (e > maxX) maxX = e;
    });
    return maxX;
  }

  static _treeLeftEdge(node) {
    let minX = node.x - node.width / 2;
    node.children.forEach(entry => {
      const e = GenealogyLayoutEngine._treeLeftEdge(entry.node);
      if (e < minX) minX = e;
    });
    return minX;
  }

  // ─── Phase 6. 겹침 해소 ──────────────────────────────────────────────────
  //
  // [BUG-06] 부모 중앙 보정 시 _anchorX() 를 사용하여
  // 자녀 CoupleNode 의 실제 혈연 위치를 기준으로 부모를 이동.

  static _resolveOverlaps(nodeMap, lvMap) {
    const levelNodes = new Map();
    const seen = new Set();
    nodeMap.forEach(node => {
      if (seen.has(node)) return;
      seen.add(node);
      const lv = node.lv;
      if (!levelNodes.has(lv)) levelNodes.set(lv, []);
      levelNodes.get(lv).push(node);
    });

    const sortedLevs = Array.from(levelNodes.keys()).sort((a, b) => a - b);

    // 1차 sweep
    sortedLevs.forEach(lv => {
      GenealogyLayoutEngine._sweepLevel(levelNodes.get(lv));
    });

    // 부모 중앙 보정 + 재sweep (최대 2회)
    const reversedLevs = [...sortedLevs].reverse();
    for (let pass = 0; pass < 2; pass++) {
      reversedLevs.forEach(lv => {
        const nodes = levelNodes.get(lv);
        nodes.forEach(node => {
          if (node.children.length === 0) return;

          // [BUG-06] 자녀 앵커 x 목록 — CoupleNode 자녀는 혈연 개인 x 사용
          const anchorXs = node.children.map(entry =>
            GenealogyLayoutEngine._anchorX(entry)
          );
          const center = (Math.min(...anchorXs) + Math.max(...anchorXs)) / 2;
          node.x = center;
        });
        GenealogyLayoutEngine._sweepLevel(nodes);
      });
    }
  }

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

  static _shiftSubtree(node, delta) {
    node.x += delta;
    node.children.forEach(entry =>
      GenealogyLayoutEngine._shiftSubtree(entry.node, delta)
    );
  }

  // ─── Phase 7. 픽셀 변환 + 스냅 + 중앙 이동 ──────────────────────────────

  static _toPositions(persons, nodeMap, lvMap) {
    const posMap = new Map();
    const snap   = GenealogyLayoutEngine._snap;
    const seen   = new Set();

    nodeMap.forEach((node) => {
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

    // 고립 인물
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
