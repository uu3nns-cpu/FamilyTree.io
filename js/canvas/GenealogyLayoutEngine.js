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
 *   Phase 3. 노드 생성 (CoupleNode / SingleNode)
 *   Phase 4. 세대별 X 배치
 *            4-a. 최하단 세대부터 Bottom-Up 으로 각 세대를 좌→우 순서로 배열
 *            4-b. 부모는 자신의 혈연 자녀 앵커 중앙에 위치
 *            4-c. 같은 세대 노드 간 최소 간격(H_GAP) 보장
 *   Phase 5. 픽셀 변환 + 그리드 스냅 + 전체 중앙 이동
 *
 * ▸ 설계 원칙
 *   - CoupleNode(남편-아내)는 두 개의 부모 트리에 동시에 속할 수 있다.
 *     트리 구조가 아닌 "세대별 플랫 리스트 + 부모-자녀 앵커 보정" 방식으로
 *     이 문제를 회피한다.
 *   - 친가(할아버지 가계)는 왼쪽, 외가(외할아버지 가계)는 오른쪽에 자연스럽게
 *     배치되도록 루트 노드 순서를 x 기준으로 정렬한다.
 *
 * ▸ 상수
 *   H_GAP      = 160px  인물(노드) 간 최소 수평 간격
 *   V_GAP      = 200px  세대 간 수직 간격
 *   COUPLE_GAP =  10px  부부 사이 추가 간격
 *   GRID       =  50px  그리드 스냅 단위
 *
 * ▸ 수정 이력
 *   2026-06-10  BUG-01~06  초기 구현
 *   2026-06-10  BUG-07     다중 루트 트리 배치 오류 수정 (1차)
 *   2026-06-10  BUG-08     CoupleNode 공유 문제로 인한 구조적 재설계
 *                           증상: 할아버지 가계가 왼쪽 끝, 남편-아내가 중간,
 *                                 외할아버지 가계가 오른쪽 끝으로 분리됨
 *                           원인: _buildTree 에서 남편-아내 CoupleNode를
 *                                 할아버지 트리에만 자녀로 등록하고
 *                                 외할아버지 트리에서는 alreadyLinked 로 차단됨.
 *                                 → 외할아버지 트리가 고아 루트가 됨.
 *                           수정: 트리 구조 대신 "세대별 플랫 배치" 방식으로
 *                                 알고리즘 전면 재설계.
 *                                 각 세대를 독립적으로 정렬하고,
 *                                 부모는 "자신의 혈연 자녀들의 앵커 x 중앙"에
 *                                 위치시키는 Bottom-Up 보정을 반복 적용.
 */

export class GenealogyLayoutEngine {

  static H_GAP      = 160;
  static V_GAP      = 200;
  static COUPLE_GAP =  10;
  static GRID       =  50;

  static get H_SPACING() { return GenealogyLayoutEngine.H_GAP; }
  static get V_SPACING() { return GenealogyLayoutEngine.V_GAP; }
  static get GAP()       { return 1; }

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

    // Phase 1: 관계 파싱
    const { p2c, c2p, couples } =
      GenealogyLayoutEngine._parseRelationships(relationships);

    // Phase 2: 세대 배정
    const lvMap = GenealogyLayoutEngine._assignLevels(persons, p2c, c2p, couples);

    // Phase 3: 노드 생성
    const { nodes, nodeById } =
      GenealogyLayoutEngine._buildNodes(persons, couples, lvMap, pMap);

    // Phase 4: 세대별 X 배치
    GenealogyLayoutEngine._placeNodes(nodes, nodeById, p2c, c2p, lvMap);

    // Phase 5: 픽셀 변환
    return GenealogyLayoutEngine._toPositions(persons, nodeById, lvMap);
  }

  // ─── Phase 1. 관계 파싱 ──────────────────────────────────────────────────

  static _parseRelationships(relationships) {
    const p2c     = new Map(); // 부모id → [자녀id]
    const c2p     = new Map(); // 자녀id → [부모id]
    const couples = new Map(); // id    → Set<배우자id>

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
    const seenSpouse = new Set();
    const rootIds    = [];

    persons.forEach(p => {
      if (c2p.has(p.id) || seenSpouse.has(p.id)) return;
      rootIds.push(p.id);
      (couples.get(p.id) || new Set()).forEach(sp => {
        if (!c2p.has(sp)) seenSpouse.add(sp);
      });
    });

    if (rootIds.length === 0) {
      const ct = persons.find(p => p.isCT) || persons[0];
      if (ct) rootIds.push(ct.id);
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

    rootIds.forEach(id => enqueue(id, 0));

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

  // ─── Phase 3. 노드 생성 ──────────────────────────────────────────────────
  //
  // 각 인물(또는 부부 쌍)을 레이아웃 노드로 변환한다.
  // CoupleNode: 부부 쌍을 하나의 유닛으로 취급 (남성 왼쪽, 여성 오른쪽)
  // SingleNode: 배우자 없는 단독 인물
  //
  // ⚠️ 이 단계에서는 부모-자녀 트리 구조를 만들지 않는다.
  //    부모-자녀 관계는 Phase 4의 X 배치에서만 참조한다.
  //    이렇게 해야 "남편-아내 CoupleNode가 할아버지 트리와
  //    외할아버지 트리 양쪽의 자녀"인 구조를 올바르게 처리할 수 있다.

  static _buildNodes(persons, couples, lvMap, pMap) {
    const coupleKey = new Map(); // id → 'idA|idB' (정렬된 키)
    couples.forEach((spSet, id) => {
      spSet.forEach(sp => {
        const key = [id, sp].sort().join('|');
        coupleKey.set(id, key);
        coupleKey.set(sp, key);
      });
    });

    const nodeByKey = new Map(); // coupleKey or personId → node
    const nodeById  = new Map(); // personId → node

    const getOrCreate = (id) => {
      const key = coupleKey.get(id) || id;
      if (nodeByKey.has(key)) return nodeByKey.get(key);

      let ids;
      if (coupleKey.has(id)) {
        const [a, b] = key.split('|');
        const pa = pMap.get(a), pb = pMap.get(b);
        // 남성이 왼쪽(ids[0])
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

      const node = { ids, lv, width, x: 0 };
      nodeByKey.set(key, node);
      ids.forEach(pid => nodeById.set(pid, node));
      return node;
    };

    persons.forEach(p => getOrCreate(p.id));

    // 중복 제거된 노드 목록
    const nodes = Array.from(nodeByKey.values());

    return { nodes, nodeById };
  }

  // ─── Phase 4. 세대별 X 배치 ──────────────────────────────────────────────
  //
  // [BUG-08 핵심 수정]
  // 트리 순회 대신 "세대별 플랫 배치" 전략을 사용한다.
  //
  // 알고리즘:
  //   1. 노드를 세대별로 그룹화한다.
  //   2. 최하단(가장 높은 lv) 세대부터 Bottom-Up으로 처리한다.
  //      a. 해당 세대의 노드들을 좌→우 순서로 H_GAP 간격으로 배치한다.
  //         (이미 x가 설정된 노드가 있으면 그 순서와 상대 위치를 최대한 유지)
  //      b. 한 세대 위의 부모 노드들을 "혈연 자녀들의 앵커 x 중앙"으로 이동시킨다.
  //         앵커 x: 자녀가 SingleNode이면 node.x,
  //                 자녀가 CoupleNode이면 혈연 개인이 left/right 어느 쪽인지에 따라
  //                 node.x ± half.
  //   3. 위로 올라가면서 반복. 동일 세대 내 겹침이 발생하면 오른쪽으로 민다.
  //   4. 마지막으로 전체를 한 번 더 Bottom-Up sweep하여 최종 정렬한다.

  static _placeNodes(nodes, nodeById, p2c, c2p, lvMap) {
    const H      = GenealogyLayoutEngine.H_GAP;
    const half   = H / 2 + GenealogyLayoutEngine.COUPLE_GAP / 2;

    // 세대별 노드 그룹
    const byLevel = new Map();
    const seen    = new Set();
    nodes.forEach(n => {
      if (seen.has(n)) return;
      seen.add(n);
      if (!byLevel.has(n.lv)) byLevel.set(n.lv, []);
      byLevel.get(n.lv).push(n);
    });

    const maxLv = Math.max(...byLevel.keys());

    // ── 초기 X 배치: 각 세대를 좌→우로 균등 배치 ──────────────────────────
    // 최하단부터 초기 위치 설정
    for (let lv = maxLv; lv >= 0; lv--) {
      const levelArr = byLevel.get(lv) || [];
      // 초기에는 단순히 인덱스 순서로 배치 (이후 보정됨)
      let cursor = 0;
      levelArr.forEach(n => {
        n.x = cursor + n.width / 2;
        cursor += n.width + H;
      });
    }

    // ── Bottom-Up 부모 중앙 보정 (3회 반복으로 수렴) ──────────────────────
    for (let pass = 0; pass < 3; pass++) {
      // Bottom-Up: 아래에서 위로 부모를 자녀 중앙으로 이동
      for (let lv = maxLv - 1; lv >= 0; lv--) {
        const levelArr = byLevel.get(lv) || [];

        levelArr.forEach(parentNode => {
          // 이 부모 노드의 혈연 자녀 앵커 x 목록
          const anchorXs = [];
          parentNode.ids.forEach(pid => {
            (p2c.get(pid) || []).forEach(cid => {
              const childNode = nodeById.get(cid);
              if (!childNode) return;
              if (childNode.lv <= lv) return; // 역방향 무시

              // 앵커 x 계산: CoupleNode일 때 혈연 위치 반영
              if (childNode.ids.length === 1) {
                anchorXs.push(childNode.x);
              } else {
                const [leftId, rightId] = childNode.ids;
                if (cid === leftId)       anchorXs.push(childNode.x - half);
                else if (cid === rightId) anchorXs.push(childNode.x + half);
                else                      anchorXs.push(childNode.x);
              }
            });
          });

          if (anchorXs.length > 0) {
            const center = (Math.min(...anchorXs) + Math.max(...anchorXs)) / 2;
            parentNode.x = center;
          }
        });

        // 같은 세대 내 겹침 해소 (정렬 후 오른쪽으로 밀기)
        GenealogyLayoutEngine._sweepLevel(levelArr);
      }

      // Top-Down: 위에서 아래로 자녀 위치를 부모 기준으로 미세 조정
      // (선택적 — 수렴 속도 향상용)
      for (let lv = 0; lv <= maxLv; lv++) {
        const levelArr = byLevel.get(lv) || [];
        GenealogyLayoutEngine._sweepLevel(levelArr);
      }
    }

    // ── 최종 Bottom-Up sweep: 부모 중앙 재보정 후 겹침 해소 ───────────────
    for (let lv = maxLv - 1; lv >= 0; lv--) {
      const levelArr = byLevel.get(lv) || [];

      levelArr.forEach(parentNode => {
        const anchorXs = [];
        parentNode.ids.forEach(pid => {
          (p2c.get(pid) || []).forEach(cid => {
            const childNode = nodeById.get(cid);
            if (!childNode || childNode.lv <= lv) return;
            if (childNode.ids.length === 1) {
              anchorXs.push(childNode.x);
            } else {
              const [leftId, rightId] = childNode.ids;
              if (cid === leftId)       anchorXs.push(childNode.x - half);
              else if (cid === rightId) anchorXs.push(childNode.x + half);
              else                      anchorXs.push(childNode.x);
            }
          });
        });
        if (anchorXs.length > 0) {
          parentNode.x = (Math.min(...anchorXs) + Math.max(...anchorXs)) / 2;
        }
      });

      GenealogyLayoutEngine._sweepLevel(levelArr);
    }
  }

  // 동일 세대 내 노드들을 x 순서로 정렬 후 겹침을 오른쪽으로 밀기
  static _sweepLevel(nodes) {
    if (nodes.length < 2) return;
    nodes.sort((a, b) => a.x - b.x);
    for (let i = 1; i < nodes.length; i++) {
      const prev = nodes[i - 1];
      const curr = nodes[i];
      const minX = prev.x + prev.width / 2
                 + GenealogyLayoutEngine.H_GAP / 2
                 + curr.width / 2;
      if (curr.x < minX) curr.x = minX;
    }
  }

  // ─── Phase 5. 픽셀 변환 + 스냅 + 중앙 이동 ──────────────────────────────

  static _toPositions(persons, nodeById, lvMap) {
    const posMap = new Map();
    const snap   = GenealogyLayoutEngine._snap;
    const seen   = new Set();
    const half   = GenealogyLayoutEngine.H_GAP / 2
                 + GenealogyLayoutEngine.COUPLE_GAP / 2;

    // 각 노드를 개인 좌표로 변환
    nodeById.forEach((node, pid) => {
      if (seen.has(pid)) return;

      const lv = lvMap.get(node.ids[0]) ?? 0;
      const y  = snap(lv * GenealogyLayoutEngine.V_GAP);

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

    // 고립 인물 처리
    const maxX = posMap.size > 0
      ? Math.max(...[...posMap.values()].map(p => p.x)) : 0;
    let orphanX = snap(maxX + GenealogyLayoutEngine.H_GAP * 2);
    persons.forEach(p => {
      if (!posMap.has(p.id)) {
        const lv = lvMap.get(p.id) ?? 0;
        posMap.set(p.id, { x: orphanX, y: snap(lv * GenealogyLayoutEngine.V_GAP) });
        orphanX = snap(orphanX + GenealogyLayoutEngine.H_GAP);
      }
    });

    // 전체 중앙 정렬
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
