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
 * ▸ 그리드 확장 규칙 (2026-06-15 개정, 절대 우선 규칙)
 *   규칙 1. 최하위 자녀세대(형제자매)는 서로 2그리드 간격으로 배치된다.
 *           (CoupleNode 내부 부부 간격도 동일하게 2그리드)
 *   규칙 2. 부모세대(lv-1)의 CoupleNode 좌우 끝은,
 *           자녀세대 전체 범위(최좌측 ~ 최우측)의 좌우로
 *           각각 1그리드씩 확장한 위치에 맞춘다.
 *           즉 부모 CoupleNode 영역 width = 자녀범위width + 2그리드
 *   규칙 3. 조부모세대(lv-2) 및 그 위 세대는, 바로 아래 세대(부모) 범위의
 *           좌우로 각각 4그리드씩 확장한 위치에 맞춘다.
 *           즉 조부모 CoupleNode 영역 width = 부모범위width + 8그리드
 *
 *   ※ 한 세대에 여러 가족(서로 무관한 자손 그룹)이 존재하면,
 *     각 그룹은 위 규칙으로 산출된 자기 영역(width)을 갖고,
 *     그룹들은 H_GAP만큼 띄워 가로로 나열한다.
 *
 *   ※ 한 세대에서 같은 자식(CoupleNode)을 공유하는 노드가 둘 이상이면
 *     (예: 친가 조부모와 외가 조부모가 둘 다 '부모' CoupleNode를
 *      공통 자식으로 갖는 경우), 이들은 독립된 그룹으로 분리되지 않고
 *     하나의 클러스터로 묶여 공유 자식의 좌/우에 expand만큼 띄워
 *     나란히 배치된다.
 *
 * ▸ 상수
 *   H_GAP  = 160px  서로 무관한 그룹 간 최소 수평 간격
 *   V_GAP  = 200px  세대 간 수직 간격
 *   GRID   =  50px  그리드 스냅 단위 / 간격 기준 단위
 *
 * ▸ 수정 이력
 *   2026-06-10  BUG-01~06   초기 구현
 *   2026-06-10  BUG-07      다중 루트 트리 배치 오류 수정
 *   2026-06-10  BUG-08      CoupleNode 공유 문제 → 세대별 플랫 배치로 재설계
 *   2026-06-10  RULE-1,2    (구) 부부 간격 규칙 적용 — 2026-06-15 폐기
 *   2026-06-11  BUG-09      _assignLevels 세대 배정 오류 수정 (Bellman-Ford 방식)
 *   2026-06-15  RULE-A,B,C  자녀 2그리드 / 부모 ±1그리드 / 조부모 ±4그리드
 *                            확장 규칙으로 배치 알고리즘 전면 재작성.
 *                            CoupleNode 영역(width)을 자손 범위 기반
 *                            bottom-up 계산으로 변경, 좌/우 가족 그룹이
 *                            서로 멀어지지 않도록 그룹 단위 정렬로 수정.
 *   2026-06-15  RULE-D      "같은 자식을 공유하는 부모/조부모 노드"가
 *                            서로 다른 최상위 그룹으로 분리되어 H_GAP만큼
 *                            멀어지는 버그 수정. 동일 자식 집합을 갖는
 *                            노드들을 클러스터로 묶어 공유 자식의 좌/우에
 *                            나란히 배치하도록 Phase 4 Step1 재작성.
 */

export class GenealogyLayoutEngine {

  // ── 버전 식별 (캐시 확인용) ─────────────────────────────────────────────
  static VERSION = '2026-06-15-v5';
  static { console.log('[GenealogyLayoutEngine] loaded, version:', GenealogyLayoutEngine.VERSION); }

  static H_GAP = 160;
  static V_GAP = 200;
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

    // Phase 3: 노드 생성 (CoupleNode 묶기)
    const { nodes, nodeById } =
      GenealogyLayoutEngine._buildNodes(persons, couples, lvMap, pMap);

    // Phase 4: 세대별 X 배치 (그리드 확장 규칙)
    GenealogyLayoutEngine._placeNodes(nodes, nodeById, p2c, c2p, lvMap);

    // Phase 5: 픽셀 변환
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
    // Bellman-Ford 방식 최장경로:
    //   1. 라운드마다 모든 부모→자녀 엣지를 스캔해
    //      lv[child] = max(lv[child], lv[parent] + 1)
    //   2. 부부끼리 lv 동기화: lv[spouse] = max(lv[A], lv[B])
    //   3. 변화가 없을 때까지 반복

    const lvMap = new Map();
    persons.forEach(p => lvMap.set(p.id, 0));

    const maxIter = persons.length + 2;
    for (let iter = 0; iter < maxIter; iter++) {
      let changed = false;

      // Step A: 부모 → 자녀 엣지 확장
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

      // Step B: 부부 동기화 (두 사람 중 높은 레벨로 통일)
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

    // 미연결 인물 처리
    const maxLv = lvMap.size > 0 ? Math.max(...lvMap.values()) : 0;
    persons.forEach(p => { if (!lvMap.has(p.id)) lvMap.set(p.id, maxLv + 1); });

    // 0 기준 정규화
    const minLv = Math.min(...lvMap.values());
    if (minLv !== 0) lvMap.forEach((lv, id) => lvMap.set(id, lv - minLv));

    return lvMap;
  }

  // ─── Phase 3. 노드 생성 ──────────────────────────────────────────────────
  //
  // 부부는 하나의 CoupleNode([leftId, rightId])로 묶는다.
  // CoupleNode 자체의 폭(coupleGap)은 SIBLING_GRIDS × GRID 로 고정한다.
  // 각 노드가 차지하는 전체 영역(left/right)은 Phase 4에서
  // 자손 범위를 기반으로 bottom-up 계산한다.

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

      // CoupleNode 자체 폭 = 2그리드 (규칙1), 단독 인물은 0
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

  // ─── Phase 4. 세대별 X 배치 (그리드 확장 규칙) ──────────────────────────
  //
  // 핵심 아이디어:
  //   각 노드(개인 또는 CoupleNode)는 "이 노드를 루트로 하는 서브트리가
  //   가로로 차지하는 범위 [left, right]"를 갖는다 (노드 자신의 중심 x=0
  //   기준 상대 좌표).
  //
  //   - 자식(아래 세대 직계 자손)이 없는 노드:
  //       left = -width/2, right = +width/2
  //       (width: CoupleNode면 2그리드, 단독이면 0)
  //
  //   - 자식이 있는 노드(부모/조부모 등):
  //       1) 자식 서브트리들을 SIBLING_GRIDS(=2그리드) 간격으로
  //          가로로 이어붙여 나열한다 (각 자식의 [left,right] 범위 기준).
  //       2) 자식 그룹 전체 범위 [groupLeft, groupRight]를 구한다.
  //       3) 자식 레벨과 자신의 레벨 차이가 1이면 PARENT_EXPAND(1그리드),
  //          2 이상이면 ANCESTOR_EXPAND(4그리드)만큼 좌우로 확장하여
  //          자신의 [left, right]를 정한다.
  //       4) 자신(CoupleNode)의 폭(width)이 확장된 범위보다 크면
  //          범위를 자신의 폭에 맞춰 추가 확장한다(겹침 방지).
  //       5) 자신의 위치(상대 중심)는 자식 그룹의 중심에 맞춘다.
  //
  //   같은 자식 집합을 공유하는 노드가 여러 개면(친가/외가 조부모 등),
  //   이들을 하나의 클러스터로 묶어 공유 자식의 좌/우에 expand만큼
  //   띄워 나란히 배치한다.
  //
  //   여러 개의 독립적인 최상위 루트(서로 연결되지 않은 가족)는
  //   H_GAP 간격으로 가로 나열한다.

  static _placeNodes(nodes, nodeById, p2c, c2p, lvMap) {
    const G = GenealogyLayoutEngine.GRID;
    const H = GenealogyLayoutEngine.H_GAP;

    // 세대별 노드 그룹
    const byLevel = new Map();
    nodes.forEach(n => {
      if (!byLevel.has(n.lv)) byLevel.set(n.lv, []);
      byLevel.get(n.lv).push(n);
    });
    const maxLv = Math.max(...byLevel.keys());
    const minLv = Math.min(...byLevel.keys());

    // 노드의 "혈연 자녀 CoupleNode 목록" (중복 제거, lv 보다 큰 것만)
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

    // ── Step 1: 각 노드의 [left, right] 범위를 bottom-up(lv 큰 것부터) 계산 ──
    const gap = GenealogyLayoutEngine.SIBLING_GRIDS * G;

    for (let lv = maxLv; lv >= minLv; lv--) {
      const arr = byLevel.get(lv) || [];

      // ── 같은 자식 집합(kids)을 공유하는 노드끼리 클러스터링 ──
      //   친가 조부모와 외가 조부모가 둘 다 '부모' CoupleNode를
      //   공통 자식으로 가지면, 독립된 두 최상위 그룹으로 분리되어
      //   H_GAP만큼 멀어지는 문제를 막기 위해 하나의 클러스터로 묶는다.
      const clusters = []; // [{ kids, members: [node...] }]
      const clusterByKidsKey = new Map();

      arr.forEach(node => {
        const kids = childNodesOf(node);

        if (kids.length === 0) {
          // 최하위 노드 또는 자손 없는 노드
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

      // ── 클러스터별로 자식 그룹 범위 계산 후, 멤버들을 좌/우로 배치 ──
      clusters.forEach(cluster => {
        const { kids, members } = cluster;

        // 자식 서브트리들을 SIBLING_GRIDS 간격으로 가로 나열
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

        const groupLeft  = placed[0].center + kids[0].left;
        const groupRight = placed[placed.length - 1].center + kids[kids.length - 1].right;
        const groupCenter = (groupLeft + groupRight) / 2;

        // 확장량: 자식 레벨과의 차이에 따라 1그리드 또는 4그리드
        const childLv = kids[0].lv;
        const diff = childLv - members[0].lv;
        const expandGrids = diff <= 1
          ? GenealogyLayoutEngine.PARENT_EXPAND
          : GenealogyLayoutEngine.ANCESTOR_EXPAND;
        const expand = expandGrids * G;

        // children 매핑: relCenter는 groupCenter 기준 상대값
        const childrenMap = placed.map(pl => ({
          node: pl.node,
          relCenter: pl.center - groupCenter
        }));

        if (members.length === 1) {
          // ── 단일 부모(그룹): 자식 그룹의 좌우로 expand만큼 확장 ──
          const node = members[0];
          const selfW = node.width;

          let left  = groupLeft  - expand;
          let right = groupRight + expand;

          // 자신의 폭이 확장된 범위보다 크면, 범위를 자신의 폭에 맞춰 확장
          if (selfW > (right - left)) {
            const extra = (selfW - (right - left)) / 2;
            left  -= extra;
            right += extra;
          }

          // 모두 groupCenter 기준 상대좌표로 통일
          node.left  = left  - groupCenter;
          node.right = right - groupCenter;
          node.selfCenter = 0; // groupCenter 자체가 자신의 중심
          node.children = childrenMap;
        } else {
          // ── 다중 부모(예: 친가/외가 조부모가 같은 자식을 공유) ──
          //   members를 자식 그룹의 좌/우에 expand만큼 띄워 나란히 배치한다.
          //   left/right/selfCenter는 모두 groupCenter 기준 상대좌표로 통일.
          //   → member.x - member.selfCenter == groupCenter의 절대위치로
          //     모든 멤버가 동일해지므로, 공유 자식이 어느 멤버를 통해
          //     배치되어도 동일한 결과를 얻는다.
          const n = members.length;
          const leftCount = n - Math.floor(n / 2); // 홀수면 좌측에 1개 더

          let leftCursor  = groupLeft  - expand; // 좌측 배치의 "오른쪽 끝"
          let rightCursor = groupRight + expand;  // 우측 배치의 "왼쪽 끝"

          for (let i = 0; i < leftCount; i++) {
            const node = members[i];
            const w = node.width;
            const right = leftCursor;
            const left  = right - w;
            node.left  = left  - groupCenter;
            node.right = right - groupCenter;
            node.selfCenter = (left + right) / 2 - groupCenter;
            node.children = childrenMap;
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
            rightCursor = right + gap;
          }

          // 클러스터 전체 범위(절대) → groupCenter 기준 상대로 환산해
          // 모든 멤버에 동일하게 부여 (상위 레벨에서 동일 폭 서브트리로 인식)
          const clusterLeftAbs  = Math.min(groupLeft  - expand, ...members.map(m => m.left + groupCenter));
          const clusterRightAbs = Math.max(groupRight + expand, ...members.map(m => m.right + groupCenter));

          members.forEach(node => {
            node.left  = clusterLeftAbs  - groupCenter;
            node.right = clusterRightAbs - groupCenter;
          });
        }
      });
    }

    // ── Step 1.5: 역방향 부모 맵 구성 ──
    //   각 노드가 "누구의 자식(children 목록)"으로 등록되어 있는지 역추적.
    //   한 노드(예: 부모 CoupleNode)는 여러 조상 라인(친가/외가)에서
    //   동시에 "자식"으로 참조될 수 있다 (parents 배열).
    nodes.forEach(n => { n.parents = []; });
    nodes.forEach(node => {
      if (!node.children) return;
      node.children.forEach(({ node: cn, relCenter }) => {
        cn.parents.push({ node, relCenter });
      });
    });

    // ── Step 2: 최상위 레벨(minLv) 중 "자기 자손 트리를 갖는" 노드만
    //   H_GAP 간격으로 가로 나열, 절대 x 부여 ──
    //   (자손이 없어 다른 노드의 children으로 배치되어야 하는 노드는 제외)
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

    // ── Step 3: top-down으로 자식들의 절대 x 부여 (이미 배치된 노드는 건너뜀) ──
    for (let lv = minLv; lv <= maxLv; lv++) {
      const arr = byLevel.get(lv) || [];
      arr.forEach(node => {
        if (!node.children) return;
        node.children.forEach(({ node: cn, relCenter }) => {
          if (cn._placed) return; // 이미 다른 조상 라인에서 배치됨
          // relCenter 는 부모의 "범위 중심(absRangeCenter)" 기준 상대값
          cn.x = node._absRangeCenter + relCenter;
          cn._placed = true;
        });
      });
    }

    // ── Step 4: 아직 배치되지 않은 노드 처리 ──
    //   이런 노드는 보통 "자기 자손은 없지만 다른 노드의 children으로도
    //   등록되지 않은 minLv 노드"(예: 외조부모처럼 두 라인이 한 자손에서
    //   합쳐지는 경우 한쪽 라인) 이다.
    //   자신을 "자식"으로 등록한 부모 노드(parents)가 이미 배치되었다면,
    //   그 부모 기준으로 자신의 x 를 역산한다:
    //     자신.x = 부모.x + (자신.selfCenter - relCenter)
    //   (단일 자식 관계라면 selfCenter == relCenter 이므로 자신.x == 부모.x,
    //    즉 조상 CoupleNode가 바로 아래 자손과 같은 중심 x를 갖게 된다.)
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
            cn._placed = true;
            progressed = true;
          });
        }
      });
      if (!progressed) break;
    }

    // ── Step 5: 그래도 배치되지 않은 완전 고립 노드 → H_GAP로 가로 나열 ──
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
            cn._placed = true;
          });
        }
      });
    }
  }

  // ─── Phase 5. 픽셀 변환 + 스냅 + 중앙 이동 ──────────────────────────────

  static _toPositions(persons, nodeById, lvMap) {
    const posMap = new Map();
    const snap   = GenealogyLayoutEngine._snap;
    const seen   = new Set();

    nodeById.forEach((node, pid) => {
      if (seen.has(pid)) return;

      const lv   = lvMap.get(node.ids[0]) ?? 0;
      const y    = snap(lv * GenealogyLayoutEngine.V_GAP);
      const half = node.coupleGap / 2;

      if (node.ids.length === 2) {
        const [leftId, rightId] = node.ids;
        posMap.set(leftId,  { x: snap(node.x - half), y });
        posMap.set(rightId, { x: snap(node.x + half), y });
        seen.add(leftId);
        seen.add(rightId);
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
