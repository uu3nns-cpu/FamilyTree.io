/**
 * GenealogyLayoutEngine — 가계도 레이아웃 단일 진입점
 *
 * ▸ 외부 호출 인터페이스 (canvas.js 기준)
 *   - new GenealogyLayoutEngine(canvasState)   → 인스턴스 생성
 *   - instance.layout()                        → 자동정렬 실행 (persons.x/y 갱신)
 *   - GenealogyLayoutEngine.compute(persons, relationships) → 순수 함수 (Map 반환)
 *
 * ▸ 알고리즘 개요
 *   Phase 1. 관계 파싱   → p2c / c2p / couples
 *   Phase 2. BFS 세대 배정
 *   Phase 3. 가상 트리 구축  (CoupleNode / SingleNode)
 *   Phase 4. Post-order  prelim X 계산
 *   Phase 5. Pre-order   final X 계산 (루트별 독립 배치)
 *   Phase 6. 겹침 해소  (세대별 sweep + 부모 중앙 보정)
 *   Phase 7. 픽셀 변환 + 그리드 스냅 + 전체 중앙 이동
 *
 * ▸ 수정 이력
 *   2026-06-10  초기 구현 (BUG-01 ~ BUG-06)
 *   2026-06-10  BUG-07  다중 루트 트리 배치 오류 수정
 *                        증상: 할아버지/외할아버지 등 복수 루트일 때 위치가 섞임
 *                        원인 A: _secondWalk 루트 오프셋이 이전 트리 실제 폭을 반영 못함
 *                        원인 B: _resolveOverlaps sweep이 독립 서브트리를 고려 안 하고
 *                                 전체 레벨을 한꺼번에 밀어 서로 다른 가계가 충돌
 *                        원인 C: 부모 중앙 보정 후 재sweep이 타 가계 노드를 밀어버림
 *                        수정:
 *                          1. _secondWalk: 루트마다 절대 오프셋(rootOffset)을 prelim에
 *                             더하는 방식으로 변경. 이전 트리 실제 오른쪽 끝 + H_GAP.
 *                          2. _resolveOverlaps: 각 루트 서브트리를 독립 단위로
 *                             내부 sweep → 이후 루트 간 간격 보정 순서로 처리.
 *                          3. 부모 중앙 보정을 루트별로 격리하여 타 트리 노드를 침범
 *                             하지 않도록 함.
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

    // Phase 4: 각 루트 서브트리의 prelim X 계산 (로컬 좌표계)
    roots.forEach(root => GenealogyLayoutEngine._firstWalk(root));

    // Phase 5: 루트별 독립 배치 (BUG-07 수정 핵심)
    // 각 루트를 로컬 prelim 기준으로 절대 좌표로 변환하되,
    // 이전 루트 트리의 실제 오른쪽 끝 + H_GAP 을 오프셋으로 적용한다.
    let nextRootOffset = 0;
    roots.forEach(root => {
      // 루트의 로컬 좌표계에서 트리 왼쪽 끝 계산
      GenealogyLayoutEngine._secondWalk(root, nextRootOffset, null);
      // 실제 배치 후 이 트리의 오른쪽 끝을 계산해서 다음 루트 시작점 결정
      const rightEdge = GenealogyLayoutEngine._treeRightEdge(root);
      nextRootOffset = rightEdge + GenealogyLayoutEngine.H_GAP;
    });

    // Phase 6: 겹침 해소 (루트별 독립 처리 + 루트 간 간격 보정)
    GenealogyLayoutEngine._resolveOverlaps(roots, nodeMap, lvMap);

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

      const node = { ids, lv, children: [], parent: null,
                     prelim: 0, mod: 0, x: 0, width };

      nodeByKey.set(key, node);
      ids.forEach(pid => nodeById.set(pid, node));
      return node;
    };

    persons.forEach(p => getOrCreateNode(p.id));

    const processedParents = new Set();
    nodeByKey.forEach((parentNode) => {
      if (processedParents.has(parentNode)) return;
      processedParents.add(parentNode);

      const childrenWithAnchor = new Map();

      parentNode.ids.forEach(pid => {
        (p2c.get(pid) || []).forEach(cid => {
          const childNode = nodeById.get(cid);
          if (!childNode || childNode === parentNode) return;
          if (childNode.lv <= parentNode.lv) return;

          if (!childrenWithAnchor.has(childNode)) {
            childrenWithAnchor.set(childNode, new Set());
          }
          childrenWithAnchor.get(childNode).add(cid);
        });
      });

      childrenWithAnchor.forEach((anchorSet, childNode) => {
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

    if (hasLeft && !hasRight)  return node.x - half;
    if (hasRight && !hasLeft)  return node.x + half;
    return node.x;
  }

  // ─── Phase 4. Post-order: prelim X 계산 ──────────────────────────────────

  static _firstWalk(node) {
    if (node.children.length === 0) {
      node.prelim = 0;
      node.mod    = 0;
      return;
    }

    node.children.forEach(entry => GenealogyLayoutEngine._firstWalk(entry.node));

    // 자녀들을 로컬 0 기준으로 왼쪽부터 배치
    let cursor = 0;
    node.children.forEach(entry => {
      const child = entry.node;
      child.prelim = cursor + child.width / 2;
      cursor += child.width + GenealogyLayoutEngine.H_GAP;
    });

    // 부모 prelim = 자녀 앵커 스팬의 중앙
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
  //
  // [BUG-07 수정]
  // parentNode === null 인 루트의 경우, rootOffset(절대 오프셋)을 prelim에 더해
  // 절대 좌표를 결정한다.
  // 이렇게 하면 각 루트 트리가 독립된 좌표 공간을 갖게 되어,
  // 이전 트리의 실제 폭이 다음 트리 배치에 정확히 반영된다.

  static _secondWalk(node, rootOffset, parentNode) {
    if (parentNode === null) {
      // 루트: 절대 x = prelim + rootOffset
      node.x = node.prelim + rootOffset;
    } else {
      // 비루트: 부모의 절대 x 를 기준으로 자신의 prelim 오프셋 적용
      node.x = parentNode.x - parentNode.prelim + node.prelim;
    }
    node.children.forEach(entry =>
      GenealogyLayoutEngine._secondWalk(entry.node, rootOffset, node)
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
  // [BUG-07 수정]
  // 기존: 전체 세대를 한 번에 sweepLevel → 서로 다른 루트 트리의 노드가 섞여 밀림
  // 수정:
  //   Step A. 각 루트 서브트리 내부에서 독립적으로 sweep + 부모 중앙 보정 수행
  //   Step B. 루트 간 간격 보정: 루트 트리 전체를 블록으로 취급하여 좌→우 배치

  static _resolveOverlaps(roots, nodeMap, lvMap) {
    // Step A: 루트별 독립 sweep
    roots.forEach(root => {
      GenealogyLayoutEngine._resolveSubtreeOverlaps(root);
    });

    // Step B: 루트 간 간격 보정 (루트 트리 블록을 좌→우 순서로 이격)
    // 각 루트 트리의 실제 leftEdge / rightEdge 를 계산한 후
    // 앞 트리의 rightEdge + H_GAP 이 뒷 트리의 leftEdge 가 되도록 shift
    if (roots.length > 1) {
      // 루트들을 현재 x 기준으로 정렬 (왼→오른)
      const sortedRoots = [...roots].sort(
        (a, b) => GenealogyLayoutEngine._treeLeftEdge(a)
                - GenealogyLayoutEngine._treeLeftEdge(b)
      );

      let prevRight = GenealogyLayoutEngine._treeRightEdge(sortedRoots[0]);
      for (let i = 1; i < sortedRoots.length; i++) {
        const root = sortedRoots[i];
        const leftEdge = GenealogyLayoutEngine._treeLeftEdge(root);
        const needed   = prevRight + GenealogyLayoutEngine.H_GAP;
        if (leftEdge < needed) {
          GenealogyLayoutEngine._shiftSubtree(root, needed - leftEdge);
        }
        prevRight = GenealogyLayoutEngine._treeRightEdge(root);
      }
    }
  }

  // 단일 서브트리 내부 겹침 해소
  // 해당 루트 아래의 노드들만 대상으로 세대별 sweep + 부모 중앙 보정
  static _resolveSubtreeOverlaps(root) {
    // 이 서브트리에 속한 노드들을 세대별로 수집
    const levelNodes = new Map();
    const collect = (node) => {
      const lv = node.lv;
      if (!levelNodes.has(lv)) levelNodes.set(lv, []);
      levelNodes.get(lv).push(node);
      node.children.forEach(entry => collect(entry.node));
    };
    collect(root);

    const sortedLevs = Array.from(levelNodes.keys()).sort((a, b) => a - b);

    // 1차 sweep: 위→아래
    sortedLevs.forEach(lv => {
      GenealogyLayoutEngine._sweepLevel(levelNodes.get(lv));
    });

    // 부모 중앙 보정 + 재sweep (최대 2회, 아래→위)
    const reversedLevs = [...sortedLevs].reverse();
    for (let pass = 0; pass < 2; pass++) {
      reversedLevs.forEach(lv => {
        const nodes = levelNodes.get(lv);
        nodes.forEach(node => {
          if (node.children.length === 0) return;
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
