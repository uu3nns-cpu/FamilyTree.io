/**
 * GenealogyLayoutEngine — 가계도 레이아웃 단일 진입점
 *
 * ▸ 외부 호출 인터페이스
 *   - new GenealogyLayoutEngine(canvasState)
 *   - instance.layout()
 *   - GenealogyLayoutEngine.compute(persons, relationships) → Map
 *
 * ▸ 알고리즘 개요
 *   Phase 1. 관계 파싱 → p2c / c2p / couples
 *   Phase 2. 세대 배정 (BFS, 위가 lv 0)
 *   Phase 3. 노드 생성 (부부는 하나의 CoupleNode로 묶음)
 *   Phase 4. 세대별 X 배치 (Bottom-Up, 그리드 확장 규칙)
 *   Phase 5. 픽셀 변환 + 그리드 스냅 + 전체 중앙 이동
 *
 * ▸ 그리드 확장 규칙
 *   규칙 1. 최하위 자녀세대(형제자매)는 서로 2그리드 간격으로 배치된다.
 *   규칙 2. 부모세대: 아버지 X = 맨 왼쪽 자녀 X - 1그리드,
 *                    어머니 X = 맨 오른쪽 자녀 X + 1그리드
 *   규칙 3. 조부모세대(lv-2) 및 그 위 세대는, 바로 아래 세대(부모) 범위의
 *           좌우로 각각 4그리드씩 확장한 위치에 맞춘다.
 *
 * ▸ 상수
 *   H_GAP  = 160px  서로 무관한 그룹 간 최소 수평 간격
 *   V_GAP  = 100px  세대 간 수직 간격 (2그리드)
 *   GRID   =  50px  그리드 스냅 단위 / 간격 기준 단위
 *
 * ▸ 수정 이력
 *   2026-06-10  BUG-01~06   초기 구현
 *   2026-06-10  BUG-07      다중 루트 트리 배치 오류 수정
 *   2026-06-10  BUG-08      CoupleNode 공유 문제 → 세대별 플랫 배치로 재설계
 *   2026-06-10  RULE-1,2    (구) 부부 간격 규칙 적용 — 2026-06-15 폐기
 *   2026-06-11  BUG-09      _assignLevels 세대 배정 오류 수정 (Bellman-Ford 방식)
 *   2026-06-15  RULE-A,B,C  자녀 2그리드 / 부모 ±1그리드 / 조부모 ±4그리드
 *   2026-06-15  RULE-D      친가/외가 조부모 클러스터링 버그 수정
 *   2026-06-15  REQ-1,2     V_GAP = 100px(2그리드), 아버지 X = 맨 왼쪽 자녀 -1그리드,
 *                            어머니 X = 맨 오른쪽 자녀 +1그리드 (Phase 5에서 개별 적용)
 *   2026-06-15  BUG-10      _childGroupLeft/Right를 groupCenter 기준 상대값으로 저장하도록 수정.
 *                            Phase 5에서 _absRangeCenter + 상대값으로 올바르게 절대좌표 환산.
 */

export class GenealogyLayoutEngine {

  // ── 버전 식별 (캐시 확인용) ─────────────────────────────────────────────
  static VERSION = '2026-06-16-v1';
  static { console.log('[GenealogyLayoutEngine] loaded, version:', GenealogyLayoutEngine.VERSION); }

  static H_GAP = 160;
  static V_GAP = 100;   // 2그리드
  static GRID  =  50;

  // 그리드 확장 규칙 상수
  static SIBLING_GRIDS   = 2; // 규칙1: 동세대(형제/부부) 간격 = 2그리드
  static PARENT_EXPAND   = 1; // 규칙2: 부모세대 좌우 확장 = 1그리드
  static ANCESTOR_EXPAND = 4; // 규칙3: 조부모 이상 세대 좌우 확장 = 4그리드

  // 하위 호환용 getter
  static get H_SPACING() { return GenealogyLayoutEngine.H_GAP; }
  static get V_SPACING() { return GenealogyLayoutEngine.V_GAP; }
  static get GAP()       { return 1; }
  static get MIN_COUPLE_GRIDS() { return GenealogyLayoutEngine.SIBLING_GRIDS; }
  static get COUPLE_GAP() {
    return GenealogyLayoutEngine.SIBLING_GRIDS * GenealogyLayoutEngine.GRID;
  }

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

    // Phase 1
    const { p2c, c2p, couples } =
      GenealogyLayoutEngine._parseRelationships(relationships);

    // Phase 2
    const lvMap = GenealogyLayoutEngine._assignLevels(persons, p2c, c2p, couples);

    // Phase 3
    const { nodes, nodeById } =
      GenealogyLayoutEngine._buildNodes(persons, couples, lvMap, pMap);

    // Phase 4
    GenealogyLayoutEngine._placeNodes(nodes, nodeById, p2c, c2p, lvMap);

    // Phase 5
    return GenealogyLayoutEngine._toPositions(persons, nodeById, lvMap);
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

  // ─── Phase 2. 세대 배정 ──────────────────────────────────────────────────

  static _assignLevels(persons, p2c, c2p, couples) {
    const lvMap = new Map();
    persons.forEach(p => lvMap.set(p.id, 0));

    const maxIter = persons.length + 2;
    for (let iter = 0; iter < maxIter; iter++) {
      let changed = false;

      p2c.forEach((children, parentId) => {
        const parentLv = lvMap.get(parentId) ?? 0;
        children.forEach(cid => {
          const needed = parentLv + 1;
          if ((lvMap.get(cid) ?? 0) < needed) {
            lvMap.set(cid, needed);
            changed = true;
          }
        });
      });

      couples.forEach((spSet, id) => {
        const lv = lvMap.get(id) ?? 0;
        spSet.forEach(sp => {
          const spLv = lvMap.get(sp) ?? 0;
          if (lv > spLv) {
            lvMap.set(sp, lv);
            changed = true;
          } else if (spLv > lv) {
            lvMap.set(id, spLv);
            changed = true;
          }
        });
      });

      if (!changed) break;
    }

    const maxLv = lvMap.size > 0 ? Math.max(...lvMap.values()) : 0;
    persons.forEach(p => { if (!lvMap.has(p.id)) lvMap.set(p.id, maxLv + 1); });

    const minLv = Math.min(...lvMap.values());
    if (minLv !== 0) lvMap.forEach((lv, id) => lvMap.set(id, lv - minLv));

    return lvMap;
  }

  // ─── Phase 3. 노드 생성 ──────────────────────────────────────────────────

  static _buildNodes(persons, couples, lvMap, pMap) {
    const G = GenealogyLayoutEngine.GRID;

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

    persons.forEach(p => {
      const id  = p.id;
      const key = coupleKey.get(id) || id;
      if (nodeByKey.has(key)) return;

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

      const lv = lvMap.get(ids[0]) ?? 0;
      const coupleGap = ids.length === 2
        ? GenealogyLayoutEngine.SIBLING_GRIDS * G
        : 0;
      const width = coupleGap;

      const node = { ids, lv, width, coupleGap, x: 0, left: 0, right: 0 };
      nodeByKey.set(key, node);
      ids.forEach(pid => nodeById.set(pid, node));
    });

    const nodes = Array.from(nodeByKey.values());
    return { nodes, nodeById };
  }

  // ─── Phase 4. 세대별 X 배치 ──────────────────────────────────────────────
  //
  // node._childRelLeft / node._childRelRight :
  //   자녀 그룹의 좌/우 끝을 "groupCenter 기준 상대값"으로 저장.
  //   Phase 5에서 아버지/어머니 X를 구할 때:
  //     absChildLeft  = node._absRangeCenter + node._childRelLeft
  //     absChildRight = node._absRangeCenter + node._childRelRight
  //   (_absRangeCenter == groupCenter의 절대 픽셀 위치)

  static _placeNodes(nodes, nodeById, p2c, c2p, lvMap) {
    const G = GenealogyLayoutEngine.GRID;
    const H = GenealogyLayoutEngine.H_GAP;

    const byLevel = new Map();
    nodes.forEach(n => {
      if (!byLevel.has(n.lv)) byLevel.set(n.lv, []);
      byLevel.get(n.lv).push(n);
    });
    const maxLv = Math.max(...byLevel.keys());
    const minLv = Math.min(...byLevel.keys());

    const childNodesOf = (node) => {
      const set = new Set();
      node.ids.forEach(pid => {
        (p2c.get(pid) || []).forEach(cid => {
          const cn = nodeById.get(cid);
          if (cn && cn.lv > node.lv) set.add(cn);
        });
      });
      return Array.from(set);
    };

    const gap = GenealogyLayoutEngine.SIBLING_GRIDS * G;

    for (let lv = maxLv; lv >= minLv; lv--) {
      const arr = byLevel.get(lv) || [];

      const clusters = [];
      const clusterByKidsKey = new Map();

      arr.forEach(node => {
        const kids = childNodesOf(node);

        if (kids.length === 0) {
          const half = node.width / 2;
          node.left  = -half;
          node.right = +half;
          node.children = [];
          return;
        }

        const kidsKey = kids.map(k => k.ids.join(',')).sort().join('|');
        let cluster = clusterByKidsKey.get(kidsKey);
        if (!cluster) {
          cluster = { kids, members: [] };
          clusterByKidsKey.set(kidsKey, cluster);
          clusters.push(cluster);
        }
        cluster.members.push(node);
      });

      clusters.forEach(cluster => {
        const { kids, members } = cluster;

        // 자녀 서브트리들을 gap 간격으로 가로 나열
        let cursor = 0;
        const placed = [];
        kids.forEach((kn, idx) => {
          const w = kn.right - kn.left;
          if (idx > 0) cursor += gap;
          const subtreeLeft = cursor;
          const center = subtreeLeft - kn.left;
          placed.push({ node: kn, center });
          cursor = subtreeLeft + w;
        });

        const groupLeft   = placed[0].center + kids[0].left;
        const groupRight  = placed[placed.length - 1].center + kids[kids.length - 1].right;
        const groupCenter = (groupLeft + groupRight) / 2;

        // ★ 자녀 그룹 범위를 groupCenter 기준 상대값으로 저장
        const childRelLeft  = groupLeft  - groupCenter;
        const childRelRight = groupRight - groupCenter;

        const childLv = kids[0].lv;
        const diff = childLv - members[0].lv;
        const expandGrids = diff <= 1
          ? GenealogyLayoutEngine.PARENT_EXPAND
          : GenealogyLayoutEngine.ANCESTOR_EXPAND;
        const expand = expandGrids * G;

        const childrenMap = placed.map(pl => ({
          node: pl.node,
          relCenter: pl.center - groupCenter
        }));

        if (members.length === 1) {
          const node = members[0];
          const selfW = node.width;

          let left  = groupLeft  - expand;
          let right = groupRight + expand;

          if (selfW > (right - left)) {
            const extra = (selfW - (right - left)) / 2;
            left  -= extra;
            right += extra;
          }

          node.left  = left  - groupCenter;
          node.right = right - groupCenter;
          node.selfCenter = 0;
          node.children = childrenMap;

          // ★ groupCenter 기준 상대값으로 저장
          node._childRelLeft  = childRelLeft;
          node._childRelRight = childRelRight;

        } else {
          const n = members.length;
          const leftCount = n - Math.floor(n / 2);

          let leftCursor  = groupLeft  - expand;
          let rightCursor = groupRight + expand;

          for (let i = 0; i < leftCount; i++) {
            const node = members[i];
            const w = node.width;
            const right = leftCursor;
            const left  = right - w;
            node.left  = left  - groupCenter;
            node.right = right - groupCenter;
            node.selfCenter = (left + right) / 2 - groupCenter;
            node.children = childrenMap;
            node._childRelLeft  = childRelLeft;
            node._childRelRight = childRelRight;
            leftCursor = left - gap;
          }

          for (let i = leftCount; i < n; i++) {
            const node = members[i];
            const w = node.width;
            const left  = rightCursor;
            const right = left + w;
            node.left  = left  - groupCenter;
            node.right = right - groupCenter;
            node.selfCenter = (left + right) / 2 - groupCenter;
            node.children = childrenMap;
            node._childRelLeft  = childRelLeft;
            node._childRelRight = childRelRight;
            rightCursor = right + gap;
          }

          const clusterLeftAbs  = Math.min(groupLeft  - expand, ...members.map(m => m.left + groupCenter));
          const clusterRightAbs = Math.max(groupRight + expand, ...members.map(m => m.right + groupCenter));

          members.forEach(node => {
            node.left  = clusterLeftAbs  - groupCenter;
            node.right = clusterRightAbs - groupCenter;
          });
        }
      });
    }

    // Step 1.5: 역방향 부모 맵
    nodes.forEach(n => { n.parents = []; });
    nodes.forEach(node => {
      if (!node.children) return;
      node.children.forEach(({ node: cn, relCenter }) => {
        cn.parents.push({ node, relCenter });
      });
    });

    // Step 2: 최상위 노드 절대 x 배치
    const topArr = (byLevel.get(minLv) || []).filter(n => n.children && n.children.length > 0);

    {
      let prevRight = null;
      topArr.forEach((node, idx) => {
        const w = node.right - node.left;
        let absLeft;
        if (idx === 0) {
          absLeft = 0;
        } else {
          absLeft = prevRight + H;
        }
        const absCenter = absLeft - node.left;
        node.x = absCenter + (node.selfCenter !== undefined ? node.selfCenter : 0);
        node._absRangeCenter = absCenter;
        node._rangeLeft  = absLeft;
        node._rangeRight = absLeft + w;
        node._placed = true;
        prevRight = node._rangeRight;
      });
    }

    // Step 3: top-down 자식 절대 x 배치
    for (let lv = minLv; lv <= maxLv; lv++) {
      const arr = byLevel.get(lv) || [];
      arr.forEach(node => {
        if (!node.children) return;
        node.children.forEach(({ node: cn, relCenter }) => {
          if (cn._placed) return;
          cn.x = node._absRangeCenter + relCenter;
          cn._absRangeCenter = cn.x - (cn.selfCenter !== undefined ? cn.selfCenter : 0);
          cn._placed = true;
        });
      });
    }

    // Step 4: 미배치 노드 역추적
    const unresolved = nodes.filter(n => !n._placed);
    let safety = unresolved.length + 5;
    while (unresolved.some(n => !n._placed) && safety-- > 0) {
      let progressed = false;
      unresolved.forEach(node => {
        if (node._placed) return;
        const readyParents = (node.parents || []).filter(p => p.node._placed);
        if (readyParents.length === 0) return;

        const selfCenter = node.selfCenter !== undefined ? node.selfCenter : 0;
        const xs = readyParents.map(p => p.node.x + (selfCenter - p.relCenter));
        node.x = xs.reduce((a, b) => a + b, 0) / xs.length;
        node._absRangeCenter = node.x - selfCenter;
        node._placed = true;
        progressed = true;

        if (node.children) {
          node.children.forEach(({ node: cn, relCenter }) => {
            if (cn._placed) return;
            cn.x = node._absRangeCenter + relCenter;
            cn._absRangeCenter = cn.x - (cn.selfCenter !== undefined ? cn.selfCenter : 0);
            cn._placed = true;
            progressed = true;
          });
        }
      });
      if (!progressed) break;
    }

    // Step 5: 완전 고립 노드
    const stillUnplaced = nodes.filter(n => !n._placed);
    if (stillUnplaced.length > 0) {
      let maxRight = -Infinity;
      nodes.forEach(n => {
        if (n._placed) {
          const selfCenter = n.selfCenter !== undefined ? n.selfCenter : 0;
          const right = n.x + (n.right - selfCenter);
          if (right > maxRight) maxRight = right;
        }
      });
      if (maxRight === -Infinity) maxRight = 0;

      let cursor = maxRight + H;
      stillUnplaced.forEach(node => {
        const selfCenter = node.selfCenter !== undefined ? node.selfCenter : 0;
        const w = node.right - node.left;
        const absLeft = cursor;
        const absCenter = absLeft - node.left;
        node.x = absCenter + selfCenter;
        node._absRangeCenter = absCenter;
        node._placed = true;
        cursor = absLeft + w + H;

        if (node.children) {
          node.children.forEach(({ node: cn, relCenter }) => {
            if (cn._placed) return;
            cn.x = node._absRangeCenter + relCenter;
            cn._absRangeCenter = cn.x - (cn.selfCenter !== undefined ? cn.selfCenter : 0);
            cn._placed = true;
          });
        }
      });
    }
  }

  // ─── Phase 5. 픽셀 변환 + 스냅 + 중앙 이동 ──────────────────────────────
  //
  // 부부(CoupleNode) X 배치 규칙:
  //   자녀가 있는 경우:
  //     absChildLeft  = node._absRangeCenter + node._childRelLeft   ← groupCenter 기준 상대값
  //     absChildRight = node._absRangeCenter + node._childRelRight
  //     아버지(ids[0]) X = absChildLeft  - 1그리드
  //     어머니(ids[1]) X = absChildRight + 1그리드
  //   자녀가 없는 경우: 기존 ±half 방식 유지

  static _toPositions(persons, nodeById, lvMap) {
    const posMap = new Map();
    const snap   = GenealogyLayoutEngine._snap;
    const G      = GenealogyLayoutEngine.GRID;
    const seen   = new Set();

    nodeById.forEach((node, pid) => {
      if (seen.has(pid)) return;

      const lv = lvMap.get(node.ids[0]) ?? 0;
      const y  = snap(lv * GenealogyLayoutEngine.V_GAP);

      if (node.ids.length === 2) {
        const [id0, id1] = node.ids;

        // 모든 세대 부부: node.x 기준 ±1그리드(50px) 고정 — 2026-06-16 REQ-3
        // (자녀 범위 기준 확장 방식 폐기)
        const half = GenealogyLayoutEngine.SIBLING_GRIDS * G / 2; // 1그리드 = 50px
        const xLeft  = snap(node.x - half);
        const xRight = snap(node.x + half);

        posMap.set(id0, { x: xLeft,  y });
        posMap.set(id1, { x: xRight, y });
        seen.add(id0);
        seen.add(id1);
      } else {
        posMap.set(node.ids[0], { x: snap(node.x), y });
        seen.add(node.ids[0]);
      }
    });

    // 고립 인물
    const H = GenealogyLayoutEngine.H_GAP;
    const maxX = posMap.size > 0
      ? Math.max(...[...posMap.values()].map(p => p.x)) : 0;
    let orphanX = snap(maxX + H * 2);
    persons.forEach(p => {
      if (!posMap.has(p.id)) {
        const lv = lvMap.get(p.id) ?? 0;
        posMap.set(p.id, { x: orphanX, y: snap(lv * GenealogyLayoutEngine.V_GAP) });
        orphanX = snap(orphanX + H);
      }
    });

    GenealogyLayoutEngine._centerPositions(posMap);
    return posMap;
  }

  static _centerPositions(posMap) {
    const vals = [...posMap.values()];
    const xs   = vals.map(p => p.x);
    const ys   = vals.map(p => p.y);
    const cx   = GenealogyLayoutEngine._snap((Math.min(...xs) + Math.max(...xs)) / 2);
    const cy   = GenealogyLayoutEngine._snap((Math.min(...ys) + Math.max(...ys)) / 2);
    posMap.forEach(pos => { pos.x -= cx; pos.y -= cy; });
  }

  static _snap(px) {
    const g = GenealogyLayoutEngine.GRID;
    return Math.round(px / g) * g;
  }
}
