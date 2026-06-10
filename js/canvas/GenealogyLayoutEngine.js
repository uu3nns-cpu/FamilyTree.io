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
    roots.forEach((root, i) => {
      // 여러 루트 트리는 순서대로 오른쪽에 배치
      const offset = i === 0 ? 0 :
        GenealogyLayoutEngine._treeRightEdge(roots[i - 1]) +
        GenealogyLayoutEngine.H_GAP;
      GenealogyLayoutEngine._secondWalk(root, -root.prelim + offset);
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
      if ((lvMap.get(id) ?? Infinity) < lv) continue; // stale
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
  //     prelim:   number     — 1st walk 결과 (단위: px)
  //     mod:      number     — modifier (자손 전체에 누적)
  //     x:        number     — 2nd walk 결과 (단위: px)
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

    // 3) 부모-자녀 연결
    //    관계: p2c[parentId] = [childId, ...]
    //    부모 노드 → 자녀 노드 연결 (중복 방지)
    persons.forEach(p => {
      const childIds = p2c.get(p.id) || [];
      const parentNode = nodeById.get(p.id);
      childIds.forEach(cid => {
        const childNode = nodeById.get(cid);
        if (!childNode || childNode === parentNode) return;
        if (childNode.lv <= parentNode.lv) return; // 세대 역전 방지
        // 이미 연결됐으면 스킵
        if (parentNode.children.includes(childNode)) return;
        parentNode.children.push(childNode);
        // 자녀 노드의 부모 설정 (여러 부모 중 먼저 연결된 쪽 우선)
        if (!childNode.parent) childNode.parent = parentNode;
      });
    });

    // 4) 루트 노드 = parent 없는 노드 (+ lv=0)
    //    단, 여러 독립 가계가 있을 수 있으므로 lv 상관없이 parent 없는 것 모두
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

  static _firstWalk(node) {
    if (node.children.length === 0) {
      // 리프: prelim = 형제 중 왼쪽 노드 기준 (호출 전 형제 순서 정렬됨)
      node.prelim = 0;
      node.mod    = 0;
      return;
    }

    node.children.forEach(child => GenealogyLayoutEngine._firstWalk(child));

    // 자녀들을 왼쪽부터 간격을 두고 배치
    let cursor = 0;
    node.children.forEach((child, i) => {
      child.prelim = cursor + child.width / 2;
      cursor += child.width + GenealogyLayoutEngine.H_GAP;
    });

    // 마지막 커서 보정: 실제 자녀 폭 합산
    const firstChild = node.children[0];
    const lastChild  = node.children[node.children.length - 1];
    const childrenCenter =
      (firstChild.prelim - firstChild.width / 2 +
       lastChild.prelim  + lastChild.width  / 2) / 2;

    node.prelim = childrenCenter;
    node.mod    = node.prelim - childrenCenter; // 0 (자신이 중앙)
  }

  // ─── Phase 5. Pre-order: final X 계산 (Buchheim-Walker 2nd walk) ─────────

  static _secondWalk(node, modSum) {
    node.x = node.prelim + modSum;
    node.children.forEach(child =>
      GenealogyLayoutEngine._secondWalk(child, modSum + node.mod)
    );
  }

  // 트리의 오른쪽 끝 x 좌표 (루트 병렬 배치용)
  static _treeRightEdge(node) {
    let maxX = node.x + node.width / 2;
    node.children.forEach(c => {
      const e = GenealogyLayoutEngine._treeRightEdge(c);
      if (e > maxX) maxX = e;
    });
    return maxX;
  }

  // ─── Phase 6. 겹침 해소 ──────────────────────────────────────────────────
  //
  // Buchheim-Walker의 contour 병합 대신 단순하고 안정적인 방식 사용:
  // 각 세대(lv)별로 노드를 x 오름차순 정렬 후,
  // 왼쪽에서 오른쪽으로 sweep하여 겹치는 구간을 오른쪽으로 밀어냄.
  // 부모는 자녀 중앙으로 소급 보정.

  static _resolveOverlaps(nodeMap, lvMap) {
    // 세대별로 노드 목록 구성 (중복 제거)
    const levelNodes = new Map();  // lv → Set<Node>
    const seen = new Set();
    nodeMap.forEach(node => {
      if (seen.has(node)) return;
      seen.add(node);
      const lv = node.lv;
      if (!levelNodes.has(lv)) levelNodes.set(lv, []);
      levelNodes.get(lv).push(node);
    });

    const sortedLevs = Array.from(levelNodes.keys()).sort((a, b) => a - b);

    sortedLevs.forEach(lv => {
      const nodes = levelNodes.get(lv);
      // x 오름차순 정렬
      nodes.sort((a, b) => a.x - b.x);

      // sweep: 겹치면 오른쪽으로 밀기
      for (let i = 1; i < nodes.length; i++) {
        const prev = nodes[i - 1];
        const curr = nodes[i];
        const minX = prev.x + prev.width / 2 + GenealogyLayoutEngine.H_GAP / 2
                   + curr.width / 2;
        if (curr.x < minX) {
          const shift = minX - curr.x;
          GenealogyLayoutEngine._shiftSubtree(curr, shift);
        }
      }
    });

    // 부모 중앙 보정: 아래 세대부터 위로 올라가며 수행
    const reversedLevs = [...sortedLevs].reverse();
    reversedLevs.forEach(lv => {
      const nodes = levelNodes.get(lv);
      nodes.forEach(node => {
        if (node.children.length === 0) return;
        const childXs = node.children.map(c => c.x);
        const center = (Math.min(...childXs) + Math.max(...childXs)) / 2;
        node.x = center;
      });
    });
  }

  // 노드와 그 모든 자손을 delta만큼 이동
  static _shiftSubtree(node, delta) {
    node.x += delta;
    node.children.forEach(c => GenealogyLayoutEngine._shiftSubtree(c, delta));
  }

  // ─── Phase 7. 픽셀 변환 + 스냅 + 중앙 이동 ──────────────────────────────

  static _toPositions(persons, nodeMap, lvMap) {
    const posMap = new Map();
    const snap   = GenealogyLayoutEngine._snap;

    // 노드 x → 개별 인물 x 변환
    // 부부 노드: [남, 여] → x - H_GAP/2, x + H_GAP/2
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
