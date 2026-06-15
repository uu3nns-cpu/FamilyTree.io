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
 *   Phase 3. 노드 생성 + 부부 간격 계산 (규칙 1, 규칙 2)
 *   Phase 4. 세대별 X 배치 (Bottom-Up 플랫 배치)
 *   Phase 5. 픽셀 변환 + 그리드 스냅 + 전체 중앙 이동
 *
 * ▸ 부부 간격 규칙 (절대 우선 규칙)
 *   규칙 1. 부부 간격 = max(MIN_COUPLE_GRIDS, 공동자녀수 + 1) × GRID
 *           최소 5그리드, 자녀가 늘수록 1그리드씩 증가
 *           예) 자녀 0 → 5그리드, 자녀 4 → 5그리드, 자녀 6 → 7그리드
 *
 *   규칙 2. 조부모 세대(lv-1)에 양쪽 조부모 쌍이 모두 있을 때,
 *           부모(남편-아내) 쌍의 간격을 양쪽 조부모 총 너비를 수용하도록 확장.
 *           부모 간격 = max(규칙1 간격, 좌측조부모너비/2 + 우측조부모너비/2 + H_GAP)
 *
 * ▸ 상수
 *   H_GAP             = 160px  인물 간 최소 수평 간격
 *   V_GAP             = 200px  세대 간 수직 간격
 *   GRID              =  50px  그리드 스냅 단위
 *   MIN_COUPLE_GRIDS  =   5    부부 간격 최솟값 (그리드 단위)
 *
 * ▸ 수정 이력
 *   2026-06-10  BUG-01~06   초기 구현
 *   2026-06-10  BUG-07      다중 루트 트리 배치 오류 수정
 *   2026-06-10  BUG-08      CoupleNode 공유 문제 → 세대별 플랫 배치로 재설계
 *   2026-06-10  RULE-1,2    부부 간격 규칙 적용
 *                            규칙1: 부부 간격 = max(5, N+1) × GRID (N=공동자녀수)
 *                            규칙2: 조부모 2쌍 존재 시 부모 간격 자동 확장
 *   2026-06-11  BUG-09      _assignLevels 세대 배정 오류 수정
 *                            기존 BFS enqueue() "cur <= lv" 조건으로 인해
 *                            조부모 추가 시 부모가 lv=0 에 고정되는 버그 발생.
 *                            → Bellman-Ford 최장경로 방식으로 전면 재작성.
 *                              lv[child] = max(lv[child], lv[parent]+1) 반복 수렴.
 */

export class GenealogyLayoutEngine {

  // ── 버전 식별 (캐시 확인용) ─────────────────────────────────────────────
  static VERSION = '2026-06-11-v3';
  static { console.log('[GenealogyLayoutEngine] loaded, version:', GenealogyLayoutEngine.VERSION); }

  static H_GAP             = 160;
  static V_GAP             = 200;
  static GRID              =  50;
  static MIN_COUPLE_GRIDS  =   5;  // 부부 최소 간격 (그리드 수)

  // 하위 호환용 getter
  static get H_SPACING() { return GenealogyLayoutEngine.H_GAP; }
  static get V_SPACING() { return GenealogyLayoutEngine.V_GAP; }
  static get GAP()       { return 1; }

  // COUPLE_GAP 은 더 이상 고정값이 아님 — _coupleGap() 으로 동적 계산
  // 하위 호환을 위해 getter 유지
  static get COUPLE_GAP()  { return GenealogyLayoutEngine.MIN_COUPLE_GRIDS
                                   * GenealogyLayoutEngine.GRID; }

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

    // Phase 3: 노드 생성 (부부 간격 규칙 1, 2 적용)
    const { nodes, nodeById } =
      GenealogyLayoutEngine._buildNodes(persons, couples, lvMap, pMap, p2c, c2p);

    // Phase 4: 세대별 X 배치
    GenealogyLayoutEngine._placeNodes(nodes, nodeById, p2c, c2p, lvMap);

    // Phase 5: 픽셀 변환
    return GenealogyLayoutEngine._toPositions(persons, nodeById, lvMap);
  }

  // ─── 부부 간격 헬퍼 ──────────────────────────────────────────────────────

  /**
   * 규칙 1: 부부 간격(px) = max(MIN_COUPLE_GRIDS, 공동자녀수 + 1) × GRID
   * @param {string[]} ids       CoupleNode의 [leftId, rightId]
   * @param {Map}      p2c       부모→자녀 맵
   * @returns {number}           간격(px)
   */
  static _coupleGap(ids, p2c) {
    if (ids.length < 2) return 0;
    const [leftId, rightId] = ids;

    // 두 사람의 공동 자녀 수 계산
    const leftChildren  = new Set(p2c.get(leftId)  || []);
    const rightChildren = new Set(p2c.get(rightId) || []);
    let sharedCount = 0;
    leftChildren.forEach(cid => { if (rightChildren.has(cid)) sharedCount++; });

    const grids = Math.max(
      GenealogyLayoutEngine.MIN_COUPLE_GRIDS,
      sharedCount + 1
    );
    return grids * GenealogyLayoutEngine.GRID;
  }

  /**
   * 규칙 2: 조부모 2쌍이 있을 때 부모 간격 확장(px)
   * 부모(남편-아내) 노드를 기준으로,
   *   - 남편의 부모 쌍(할아버지-할머니) 너비
   *   - 아내의 부모 쌍(외할아버지-외할머니) 너비
   * 양쪽이 모두 존재하면, 그 너비를 수용할 최솟값으로 간격을 확장한다.
   *
   * 확장 간격 = max(규칙1 간격, pLeft.width/2 + pRight.width/2 + H_GAP)
   *
   * @param {string[]} ids        CoupleNode의 [leftId, rightId]
   * @param {Map}      c2p        자녀→부모 맵
   * @param {Map}      nodeById   personId → node
   * @param {number}   rule1Gap   규칙1에서 계산된 간격(px)
   * @returns {number}            최종 간격(px)
   */
  static _coupleGapWithGrandparents(ids, c2p, nodeById, rule1Gap) {
    if (ids.length < 2) return rule1Gap;
    const [leftId, rightId] = ids;

    // 남편(leftId)의 부모 노드들
    const leftParentNodes  = new Set(
      (c2p.get(leftId)  || []).map(pid => nodeById.get(pid)).filter(Boolean)
    );
    // 아내(rightId)의 부모 노드들
    const rightParentNodes = new Set(
      (c2p.get(rightId) || []).map(pid => nodeById.get(pid)).filter(Boolean)
    );

    // 양쪽에 부모 노드가 모두 있어야 규칙 2 적용
    if (leftParentNodes.size === 0 || rightParentNodes.size === 0) return rule1Gap;

    // 각 부모 노드의 총 너비 합산
    const leftTotalW  = [...leftParentNodes ].reduce((s, n) => s + n.width, 0);
    const rightTotalW = [...rightParentNodes].reduce((s, n) => s + n.width, 0);

    // 부모를 부부 각자의 앵커 위에 배치하려면,
    // 좌측 앵커(남편x)에서 leftTotalW/2 왼쪽, 우측 앵커(아내x)에서 rightTotalW/2 오른쪽
    // 이 두 영역이 겹치지 않으려면:
    //   아내x - 남편x ≥ leftTotalW/2 + H_GAP + rightTotalW/2
    const neededGap = leftTotalW / 2
                    + GenealogyLayoutEngine.H_GAP
                    + rightTotalW / 2;

    return Math.max(rule1Gap, neededGap);
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
    // ── BUG-FIX (BUG-09 rev2): 세대 배정 로직 ───────────────────────
    //
    // 가장 빠른 정확한 알고리즘:
    //   1. 라운드마다 모든 부모→자녀 엣지를 스캔해
    //      lv[child] = max(lv[child], lv[parent] + 1)
    //   2. 부부끼리 lv 동기화
    //      lv[spouse] = max(lv[A], lv[B])
    //   3. 라운드에서 변화가 없을 때까지 반복
    //
    // 주의: syncSpouses 안에서도 changed 를 표시해야
    //   부부 레벨이 올라가면 그 자녀를도 다음 라운드에 재처리해야 하므로.

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
  // [RULE-1, RULE-2 적용]
  // CoupleNode의 width 를 고정값이 아닌 동적 계산으로 결정한다.
  //
  //   width = personWidth(left) + coupleGap + personWidth(right)
  //         = H_GAP + coupleGap + H_GAP
  //         = 2 × H_GAP + coupleGap
  //
  // coupleGap 은 먼저 규칙1로 계산한 뒤, 규칙2로 확장 여부를 결정한다.
  // 단, 규칙2 확장은 nodeById 가 완성된 후에 재계산해야 하므로
  // 2패스로 처리한다:
  //   패스1: 규칙1만 적용하여 노드 생성
  //   패스2: 규칙2 조건 충족 노드의 coupleGap 재계산 및 width 갱신

  static _buildNodes(persons, couples, lvMap, pMap, p2c, c2p) {
    const G   = GenealogyLayoutEngine.GRID;
    const H   = GenealogyLayoutEngine.H_GAP;

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

    // ── 패스 1: 노드 생성 + 규칙1 width 계산 ────────────────────────────
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

      // 규칙 1 적용
      const gap1  = ids.length === 2
        ? GenealogyLayoutEngine._coupleGap(ids, p2c)
        : 0;
      const width = ids.length === 2 ? 2 * H + gap1 : H;

      const node = { ids, lv, width, coupleGap: gap1, x: 0 };
      nodeByKey.set(key, node);
      ids.forEach(pid => nodeById.set(pid, node));
    });

    // ── 패스 2: 규칙2 — 조부모 2쌍 존재 시 부모 width 확장 ─────────────
    nodeByKey.forEach(node => {
      if (node.ids.length < 2) return;

      const gap2 = GenealogyLayoutEngine._coupleGapWithGrandparents(
        node.ids, c2p, nodeById, node.coupleGap
      );

      if (gap2 > node.coupleGap) {
        // 그리드 단위로 올림 (홀수 그리드 수 보장: ceil 후 홀수로 보정)
        let grids = Math.ceil(gap2 / G);
        if (grids % 2 === 0) grids += 1; // 홀수 강제
        const snappedGap = grids * G;

        node.coupleGap = snappedGap;
        node.width     = 2 * H + snappedGap;
      } else {
        // 규칙1 결과도 홀수 그리드 보장
        let grids = Math.ceil(node.coupleGap / G);
        if (grids % 2 === 0) grids += 1;
        const snappedGap = grids * G;
        node.coupleGap = snappedGap;
        node.width     = 2 * H + snappedGap;
      }
    });

    const nodes = Array.from(nodeByKey.values());
    return { nodes, nodeById };
  }

  // ─── Phase 4. 세대별 X 배치 ──────────────────────────────────────────────

  static _placeNodes(nodes, nodeById, p2c, c2p, lvMap) {
    const H = GenealogyLayoutEngine.H_GAP;

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

    // 앵커 x 계산 헬퍼 (CoupleNode 내 혈연 위치 반영)
    const anchorX = (childNode, cid) => {
      if (childNode.ids.length === 1) return childNode.x;
      const half = childNode.coupleGap / 2 + H / 2;
      const [leftId, rightId] = childNode.ids;
      if (cid === leftId)       return childNode.x - half;
      if (cid === rightId)      return childNode.x + half;
      return childNode.x;
    };

    // ── 초기 X 배치 ────────────────────────────────────────────────────────
    for (let lv = maxLv; lv >= 0; lv--) {
      const arr = byLevel.get(lv) || [];
      let cursor = 0;
      arr.forEach(n => {
        n.x = cursor + n.width / 2;
        cursor += n.width + H;
      });
    }

    // ── Bottom-Up 부모 중앙 보정 (3회 반복) ───────────────────────────────
    for (let pass = 0; pass < 3; pass++) {
      for (let lv = maxLv - 1; lv >= 0; lv--) {
        const arr = byLevel.get(lv) || [];

        arr.forEach(parentNode => {
          const axs = [];
          parentNode.ids.forEach(pid => {
            (p2c.get(pid) || []).forEach(cid => {
              const cn = nodeById.get(cid);
              if (!cn || cn.lv <= lv) return;
              axs.push(anchorX(cn, cid));
            });
          });
          if (axs.length > 0) {
            parentNode.x = (Math.min(...axs) + Math.max(...axs)) / 2;
          }
        });

        GenealogyLayoutEngine._sweepLevel(arr);
      }

      for (let lv = 0; lv <= maxLv; lv++) {
        GenealogyLayoutEngine._sweepLevel(byLevel.get(lv) || []);
      }
    }

    // ── 최종 Bottom-Up sweep ───────────────────────────────────────────────
    for (let lv = maxLv - 1; lv >= 0; lv--) {
      const arr = byLevel.get(lv) || [];
      arr.forEach(parentNode => {
        const axs = [];
        parentNode.ids.forEach(pid => {
          (p2c.get(pid) || []).forEach(cid => {
            const cn = nodeById.get(cid);
            if (!cn || cn.lv <= lv) return;
            axs.push(anchorX(cn, cid));
          });
        });
        if (axs.length > 0) {
          parentNode.x = (Math.min(...axs) + Math.max(...axs)) / 2;
        }
      });
      GenealogyLayoutEngine._sweepLevel(arr);
    }
  }

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
    const H      = GenealogyLayoutEngine.H_GAP;

    nodeById.forEach((node, pid) => {
      if (seen.has(pid)) return;

      const lv   = lvMap.get(node.ids[0]) ?? 0;
      const y    = snap(lv * GenealogyLayoutEngine.V_GAP);
      const half = node.ids.length === 2
        ? (node.coupleGap / 2 + H / 2)
        : 0;

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
