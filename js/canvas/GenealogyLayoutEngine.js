/**
 * GenealogyLayoutEngine — 가계도 레이아웃 단일 진입점
 *
 * ▸ 외부 호출 인터페이스
 *   - new GenealogyLayoutEngine(canvasState)
 *   - instance.layout()
 *   - GenealogyLayoutEngine.compute(persons, relationships) → Map
 *
 * ▸ 배치 규칙 (2026-06-16 v6 수정)
 *   규칙 1. 자녀세대 형제자매는 서로 2그리드 간격으로 배치된다.
 *   규칙 2. 부(父) X = 자녀들 중심 X - 1그리드
 *   규칙 3. 모(母) X = 자녀들 중심 X + 1그리드
 *   규칙 4. 조부(祖父) X = 부 X - 1그리드
 *   규칙 5. 조모(祖母) X = 부 X + 1그리드
 *   규칙 6. 외조부(外祖父) X = 모 X - 1그리드
 *   규칙 7. 외조모(外祖女) X = 모 X + 1그리드
 *
 *   ※ 부부는 항상 1그리드(50px) 간격으로 인접하며, 자녀 중심 위에 배치된다.
 *     (v5의 오류: 부=min(자녀X)-1그리드, 모=max(자녀X)+1그리드 → 자녀 수만큼 부부 간격 벌어짐)
 *
 * ▸ 상수
 *   V_GAP = 100px  세대 간 수직 간격 (2그리드)
 *   GRID  =  50px  그리드 단위
 *   H_GAP = 160px  무관계 그룹 간 최소 수평 간격
 *
 * ▸ 수정 이력
 *   2026-06-10  BUG-01~06   초기 구현
 *   2026-06-10  BUG-07      다중 루트 트리 배치 오류 수정
 *   2026-06-10  BUG-08      CoupleNode 공유 문제 → 세대별 플랫 배치로 재설계
 *   2026-06-11  BUG-09      _assignLevels 세대 배정 오류 수정 (Bellman-Ford 방식)
 *   2026-06-15  RULE-A~D    자녀 2그리드 / 부모 ±1그리드 / 조부모 ±4그리드 (폐기)
 *   2026-06-16  REWRITE     규칙 1~7 직접 적용 방식으로 전면 재작성 (v5)
 *   2026-06-16  BUG-10      부모 X를 자녀 끝 기준 → 자녀 중심 기준으로 수정 (v6)
 *                            외할아버지/외할머니가 조부모 세대로 정렬 안 되는 버그 해결
 */

export class GenealogyLayoutEngine {

  // ── 버전 식별 (캐시 확인용) ─────────────────────────────────────────────
  static VERSION = '2026-06-16-v6';
  static { console.log('[GenealogyLayoutEngine] loaded, version:', GenealogyLayoutEngine.VERSION); }

  static H_GAP = 160;
  static V_GAP = 100;
  static GRID  =  50;

  static SIBLING_GRIDS = 2;

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

    // Phase 1: 관계 파싱
    const { p2c, c2p, couples } =
      GenealogyLayoutEngine._parseRelationships(relationships);

    // Phase 2: 세대 배정
    const lvMap = GenealogyLayoutEngine._assignLevels(persons, p2c, c2p, couples);

    // 디버그: 세대 배정 결과 출력
    const lvDebug = {};
    persons.forEach(p => { lvDebug[p.name || p.id] = lvMap.get(p.id); });
    console.log('[GLE v6] _assignLevels 결과:', lvDebug);

    // Phase 3: 규칙 1~7 직접 적용으로 X 좌표 계산
    const posMap = GenealogyLayoutEngine._applyRules(persons, pMap, p2c, c2p, couples, lvMap);

    // Phase 4: 전체 중앙 정렬
    GenealogyLayoutEngine._centerPositions(posMap);

    return posMap;
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
  //
  // 알고리즘: 자녀→부모 역산 방식 (Bottom-Up)
  //   1단계) 자녀-부모 체인에서 lv를 아래→위로 역산:
  //          자녀 lv가 확정되면 부모 lv = min(현재값, 자녀lv - 1)
  //          이를 수렴할 때까지 반복 (Bellman-Ford)
  //   2단계) 부부 동기화: lv가 큰 쪽으로 맞춤
  //   3단계) 정규화: 최솟값 → 0

  static _assignLevels(persons, p2c, c2p, couples) {
    const lvMap = new Map();

    // 초기값: 자녀 관계가 있는 사람은 깊이를 모르므로 일단 0,
    // 이후 Bottom-Up으로 역산
    persons.forEach(p => lvMap.set(p.id, 0));

    const maxIter = persons.length + 5;

    // 1단계: Top-Down — 자녀는 반드시 부모보다 lv 크게
    for (let iter = 0; iter < maxIter; iter++) {
      let changed = false;
      p2c.forEach((children, parentId) => {
        const parentLv = lvMap.get(parentId) ?? 0;
        children.forEach(cid => {
          const cur = lvMap.get(cid) ?? 0;
          const needed = parentLv + 1;
          if (cur < needed) { lvMap.set(cid, needed); changed = true; }
        });
      });
      if (!changed) break;
    }

    // 2단계: Bottom-Up — 부모는 반드시 자녀보다 lv 작게 (역산)
    for (let iter = 0; iter < maxIter; iter++) {
      let changed = false;
      c2p.forEach((parents, childId) => {
        const childLv = lvMap.get(childId) ?? 0;
        parents.forEach(pid => {
          const cur = lvMap.get(pid) ?? 0;
          const max = childLv - 1;
          if (cur > max) { lvMap.set(pid, max); changed = true; }
        });
      });
      if (!changed) break;
    }

    // 3단계: 1·2 수렴할 때까지 교대 반복 (상충 해소)
    for (let round = 0; round < maxIter; round++) {
      let changed = false;
      p2c.forEach((children, parentId) => {
        const parentLv = lvMap.get(parentId) ?? 0;
        children.forEach(cid => {
          const cur = lvMap.get(cid) ?? 0;
          if (cur < parentLv + 1) { lvMap.set(cid, parentLv + 1); changed = true; }
        });
      });
      c2p.forEach((parents, childId) => {
        const childLv = lvMap.get(childId) ?? 0;
        parents.forEach(pid => {
          const cur = lvMap.get(pid) ?? 0;
          if (cur > childLv - 1) { lvMap.set(pid, childLv - 1); changed = true; }
        });
      });
      if (!changed) break;
    }

    // 4단계: 부부 동기화 — lv 큰 쪽으로 맞춤
    // (단, 동기화 후 부모-자녀 제약 재검증)
    for (let iter = 0; iter < maxIter; iter++) {
      let changed = false;
      couples.forEach((spSet, id) => {
        const lv = lvMap.get(id) ?? 0;
        spSet.forEach(sp => {
          const spLv = lvMap.get(sp) ?? 0;
          if (lv > spLv) { lvMap.set(sp, lv); changed = true; }
          else if (spLv > lv) { lvMap.set(id, spLv); changed = true; }
        });
      });
      if (!changed) break;
    }

    // 5단계: 부부 동기화 이후 부모-자녀 제약 재검증
    for (let round = 0; round < maxIter; round++) {
      let changed = false;
      c2p.forEach((parents, childId) => {
        const childLv = lvMap.get(childId) ?? 0;
        parents.forEach(pid => {
          const cur = lvMap.get(pid) ?? 0;
          if (cur >= childLv) { lvMap.set(pid, childLv - 1); changed = true; }
        });
      });
      // 부모가 내려가면 그 부모의 부모도 연쇄적으로 내려가야 함
      p2c.forEach((children, parentId) => {
        const parentLv = lvMap.get(parentId) ?? 0;
        children.forEach(cid => {
          const cur = lvMap.get(cid) ?? 0;
          if (cur < parentLv + 1) { lvMap.set(cid, parentLv + 1); changed = true; }
        });
      });
      if (!changed) break;
    }

    // 정규화: 최솟값 → 0
    const minLv = Math.min(...lvMap.values());
    if (minLv !== 0) lvMap.forEach((lv, id) => lvMap.set(id, lv - minLv));

    return lvMap;
  }

  // ─── Phase 3. 규칙 1~7 직접 적용 ────────────────────────────────────────
  //
  // 접근 방식:
  //   1. 최하위 세대(maxLv)의 자녀들을 2그리드 간격으로 순서대로 배치 (규칙 1)
  //   2. 각 부모 노드:
  //      - 자녀들의 중심 X = (min(자녀X) + max(자녀X)) / 2
  //      - 부(male) X = 중심 - 1그리드  (규칙 2)
  //      - 모(female) X = 중심 + 1그리드  (규칙 3)
  //      → 부부는 항상 2그리드(100px) 간격으로 인접, 자녀 중심 위에 배치
  //   3. 조부모도 동일 규칙 적용 (규칙 4~7은 규칙 2~3의 재귀적 적용)
  //
  // ※ v5 버그: 부=min(자녀X)-GRID, 모=max(자녀X)+GRID 로 계산하면
  //   자녀가 4명일 때 부모 간격 = 자녀 스팬 + 2그리드 → 400px 이상으로 벌어짐
  //   외조부모가 조부모와 같은 세대(lv=1)인데 X 충돌/겹침 발생

  static _applyRules(persons, pMap, p2c, c2p, couples, lvMap) {
    const G    = GenealogyLayoutEngine.GRID;
    const H    = GenealogyLayoutEngine.H_GAP;
    const snap = GenealogyLayoutEngine._snap;
    const posX = new Map(); // id → x (픽셀)

    // 세대별 그룹화
    const byLevel = new Map();
    persons.forEach(p => {
      const lv = lvMap.get(p.id) ?? 0;
      if (!byLevel.has(lv)) byLevel.set(lv, []);
      byLevel.get(lv).push(p.id);
    });
    const maxLv = Math.max(...byLevel.keys());
    const minLv = Math.min(...byLevel.keys());

    // 배우자 찾기 헬퍼
    const spouseOf = (id) => {
      const sp = couples.get(id);
      return sp ? [...sp][0] : null;
    };

    // 성별 헬퍼
    const isMale = (id) => pMap.get(id)?.gender === 'male';

    // 자녀 X들의 중심 계산 헬퍼
    const childrenCenter = (childXs) => {
      const minX = Math.min(...childXs);
      const maxX = Math.max(...childXs);
      return snap((minX + maxX) / 2);
    };

    // ── 스텝 1: 최하위 세대를 2그리드 간격으로 배치 (규칙 1) ────────────
    // 같은 부모를 가진 형제자매 그룹을 묶어서 배치
    {
      const bottomIds = byLevel.get(maxLv) || [];

      // 부모별로 자녀를 그룹화
      const groups   = [];   // [{ parentKey, children: [id,...] }]
      const assigned = new Set();

      bottomIds.forEach(id => {
        if (assigned.has(id)) return;
        const parents = c2p.get(id) || [];
        // 같은 부모 집합을 가진 형제자매 묶기
        const parentKey = parents.slice().sort().join('|') || `solo_${id}`;
        let g = groups.find(g => g.parentKey === parentKey);
        if (!g) {
          g = { parentKey, children: [] };
          groups.push(g);
        }
        g.children.push(id);
        assigned.add(id);
      });

      // 각 그룹 내에서 2그리드 간격으로 X 배치
      const sibGap = GenealogyLayoutEngine.SIBLING_GRIDS * G; // 100px
      let cursor = 0;
      groups.forEach((g, gi) => {
        if (gi > 0) cursor += H; // 무관계 그룹 사이 여백
        g.children.forEach((id, idx) => {
          if (idx > 0) cursor += sibGap;
          posX.set(id, snap(cursor));
        });
      });
    }

    // ── 스텝 2~N: Bottom-Up으로 위 세대를 순서대로 배치 ─────────────────
    // maxLv-1 → minLv 순으로 올라가며 규칙 2~7 적용
    // 핵심 수정: 부모 X = 자녀 중심 ± 1그리드 (v5: 자녀 끝 ± 1그리드 → 버그)
    for (let lv = maxLv - 1; lv >= minLv; lv--) {
      const ids = byLevel.get(lv) || [];

      // 이미 배치된 사람은 건너뜀
      const unplaced = ids.filter(id => !posX.has(id));

      unplaced.forEach(id => {
        // 이 사람의 자녀들 (이미 배치되었을 것)
        const children = (p2c.get(id) || []).filter(cid => posX.has(cid));

        if (children.length > 0) {
          const childXs = children.map(cid => posX.get(cid));
          const center  = childrenCenter(childXs);

          if (isMale(id)) {
            // 규칙 2: 부 X = 자녀 중심 - 1그리드
            posX.set(id, snap(center - G));
          } else {
            // 규칙 3: 모 X = 자녀 중심 + 1그리드
            posX.set(id, snap(center + G));
          }
        }
        // 자녀가 없으면 이 패스에서 배치하지 않음 → 아래 배우자 기준 처리
      });

      // 이 레벨에서 배우자가 있는데 한쪽만 배치된 경우,
      // 배우자 기준으로 배치
      ids.forEach(id => {
        if (posX.has(id)) return;
        const sp = spouseOf(id);
        if (sp && posX.has(sp)) {
          // 자녀 기준 배치 가능하면 적용, 아니면 배우자 ±1
          const children = (p2c.get(id) || []).filter(cid => posX.has(cid));
          if (children.length > 0) {
            const childXs = children.map(cid => posX.get(cid));
            const center  = childrenCenter(childXs);
            posX.set(id, snap(isMale(id) ? center - G : center + G));
          } else {
            // 자녀 없음 → 배우자 기준 ±1그리드
            const spX = posX.get(sp);
            posX.set(id, snap(isMale(id) ? spX - G : spX + G));
          }
        }
      });
    }

    // ── 스텝 3: 미배치 인물 처리 ─────────────────────────────────────────
    // 자녀가 없어서 스텝 2에서 못 배치한 사람 (배우자 관계로만 연결된 경우 등)
    {
      let changed = true;
      let safety = persons.length + 5;
      while (changed && safety-- > 0) {
        changed = false;
        persons.forEach(p => {
          if (posX.has(p.id)) return;
          const children = (p2c.get(p.id) || []).filter(cid => posX.has(cid));
          if (children.length > 0) {
            const childXs = children.map(cid => posX.get(cid));
            const center  = childrenCenter(childXs);
            const x = isMale(p.id) ? snap(center - G) : snap(center + G);
            posX.set(p.id, x);
            changed = true;
          } else {
            const sp = spouseOf(p.id);
            if (sp && posX.has(sp)) {
              const spX = posX.get(sp);
              posX.set(p.id, snap(isMale(p.id) ? spX - G : spX + G));
              changed = true;
            }
          }
        });
      }
    }

    // ── 스텝 4: 완전 고립 노드 ───────────────────────────────────────────
    {
      const maxX = posX.size > 0 ? Math.max(...posX.values()) : 0;
      let cursor = snap(maxX + H * 2);
      persons.forEach(p => {
        if (!posX.has(p.id)) {
          posX.set(p.id, cursor);
          cursor = snap(cursor + H);
        }
      });
    }

    // ── Y 좌표 계산 + posMap 생성 ─────────────────────────────────────────
    const posMap = new Map();
    persons.forEach(p => {
      const lv = lvMap.get(p.id) ?? 0;
      posMap.set(p.id, {
        x: posX.get(p.id) ?? 0,
        y: snap(lv * GenealogyLayoutEngine.V_GAP),
      });
    });

    return posMap;
  }

  // ─── 전체 중앙 정렬 ──────────────────────────────────────────────────────

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
