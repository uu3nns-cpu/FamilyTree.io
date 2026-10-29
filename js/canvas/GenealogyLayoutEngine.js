/**
 * GenealogyLayoutEngine — 가계도 레이아웃 단일 진입점
 *
 * ▸ 외부 호출 인터페이스 (기존과 동일)
 *   - new GenealogyLayoutEngine(canvasState)
 *   - instance.layout({ keepCenter })   keepCenter=true 면 정렬 전 도형의 중심을 유지
 *   - GenealogyLayoutEngine.compute(persons, relationships) → Map<id,{x,y}>
 *
 * ▸ 알고리즘 (2026-10-28 v7 재작성)
 *   1. 부부(혼인·공동 부모) 단위로 "블록"을 만든다. 블록 = 같은 세대의 부부 묶음(재혼 포함).
 *   2. 세대 배정: 블록 간 "자녀 ≥ 부모 + 1" 제약의 최장 경로 + 뿌리(부모 없는 블록)를
 *      자녀 세대 바로 위로 끌어내림 → 배우자 쪽 조상이 맨 위에 떠 있지 않다.
 *   3. 세대별 순서: DFS 초기 순서 → 바리센터 정렬(형제는 나이순/입력순 유지).
 *   4. X 좌표: 자녀 위 부모 중앙정렬 ↔ 부모 아래 자녀 정렬을 반복 완화하고,
 *      매 단계마다 세대 내 최소 간격 제약(PAV 등위회귀)을 풀어 겹침을 원천 차단.
 *   5. 전체 중앙 정렬.
 *
 * ▸ 보장 사항
 *   - 같은 세대의 두 인물은 항상 GRID×2(100px) 이상 떨어진다 (노드 크기 60px).
 *   - 자녀·배우자가 없는 형제/삼촌/고모도 부모 가족 옆에 배치된다.
 *   - 성별이 같거나 미상이어도 부부가 겹치지 않는다. (남성 → 미상 → 여성 순으로 좌→우)
 *
 * ▸ 상수
 *   V_GAP = 100px 세대 간 수직 간격 / GRID = 50px / H_GAP = 160px(→150) 다른 가족 간 최소 간격
 */

export class GenealogyLayoutEngine {

  static VERSION = '2026-10-29-v8';
  static { console.log('[GenealogyLayoutEngine] loaded, version:', GenealogyLayoutEngine.VERSION); }

  static H_GAP = 160;
  static V_GAP = 100;
  static GRID  =  50;

  static SIBLING_GRIDS = 2;

  // ── 인원 비례 간격 (v8) ─────────────────────────────────────────────
  //  s = clamp(1 + (인원 − SCALE_FROM) × SCALE_STEP, 1, SCALE_MAX)
  //  가로(형제·가족 블록 간격)에 s 를 곱하고, 세로는 s 변화량의 절반만 반영(GRID 단위로 반올림).
  //  인원이 늘수록 완만하게 벌어지며 최대 1.35배를 넘지 않는다.
  //  ※ 부부 간격(COUPLE_GAP=100)은 격자 정렬 때문에 고정.
  static BASE_SIB_GAP = 150;   // 같은 부모를 둔 형제 블록 사이 (반폭 제외)
  static BASE_FAM_GAP = 200;   // 서로 다른 가족 블록 사이 (반폭 제외)
  static BASE_V_GAP   = 150;   // 세대 간 수직 간격
  static SCALE_FROM   = 6;     // 이 인원까지는 배율 1.0
  static SCALE_STEP   = 0.03;  // 인원 1명당 배율 증가량
  static SCALE_MAX    = 1.35;  // 배율 상한

  static ITERATIONS      = 16;  // 완화 반복 횟수
  static SORT_ITERATIONS = 6;   // 앞의 N회만 순서 재정렬 허용 (이후 순서 고정 → 진동 방지)

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

  /**
   * @param {{keepCenter?: boolean}} [options]
   */
  layout(options = {}) {
    const { persons, relationships } = this.canvasState;
    if (!persons || persons.length === 0) return;
    const G = GenealogyLayoutEngine;
    const posMap = G.compute(persons, relationships);

    let dx = 0, dy = 0;
    if (options && options.keepCenter) {
      const xs = persons.map(p => p.x || 0);
      const ys = persons.map(p => p.y || 0);
      dx = G._snap((Math.min(...xs) + Math.max(...xs)) / 2);
      dy = G._snap((Math.min(...ys) + Math.max(...ys)) / 2);
    }

    persons.forEach(p => {
      const pos = posMap.get(p.id);
      if (pos) { p.x = pos.x + dx; p.y = pos.y + dy; }
    });
  }

  // ─── 공개 정적 API ────────────────────────────────────────────────────────

  static compute(persons, relationships) {
    if (!persons || persons.length === 0) return new Map();
    const G = GenealogyLayoutEngine;

    const rel = G._parseRelationships(persons, relationships);
    const { blocks, blockOf } = G._buildBlocks(persons, rel);
    G._assignLevels(blocks, rel, blockOf);
    G._linkBlocks(blocks, rel, blockOf);
    const scale = G._spacingScale(persons.length);
    const posX = G._placeBlocks(blocks, rel, blockOf, scale);

    // 세로 간격: 배율 변화량의 절반만 반영하고 GRID 단위로 맞춰 세대 간격을 균일하게 유지
    const vGap = Math.max(G.GRID, Math.round(G.BASE_V_GAP * (1 + (scale - 1) * 0.5) / G.GRID) * G.GRID);

    const posMap = new Map();
    persons.forEach(p => {
      const b = blockOf.get(p.id);
      posMap.set(p.id, { x: posX.get(p.id), y: b.level * vGap });
    });

    G._centerPositions(posMap);
    return posMap;
  }

  // ─── Phase 1. 관계 파싱 ──────────────────────────────────────────────────

  static _parseRelationships(persons, relationships) {
    const ids   = new Set(persons.map(p => p.id));
    const index = new Map(persons.map((p, i) => [p.id, i]));
    const pMap  = new Map(persons.map(p => [p.id, p]));
    const p2c = new Map(), c2p = new Map(), partners = new Map();
    const ended = new Set();

    const push = (map, k, v) => {
      if (!map.has(k)) map.set(k, []);
      if (!map.get(k).includes(v)) map.get(k).push(v);
    };
    const key = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);

    (relationships || []).forEach(r => {
      if (!r || !ids.has(r.from) || !ids.has(r.to) || r.from === r.to) return;
      if (['biological', 'adopted', 'foster'].includes(r.type)) {
        push(p2c, r.from, r.to);
        push(c2p, r.to,   r.from);
      } else if (r.type === 'marriage') {
        push(partners, r.from, r.to);
        push(partners, r.to,   r.from);
        if (r.subtype === 'divorced' || r.subtype === 'separated' || r.status === 'ended') {
          ended.add(key(r.from, r.to));
        }
      }
    });

    // 혼인 관계가 없어도 자녀를 공유하는 두 부모는 한 쌍으로 취급
    c2p.forEach(ps => {
      if (ps.length === 2) {
        push(partners, ps[0], ps[1]);
        push(partners, ps[1], ps[0]);
      }
    });

    return { ids, index, pMap, p2c, c2p, partners, ended, key };
  }

  // ─── Phase 2. 부부 블록 구성 ─────────────────────────────────────────────

  static _buildBlocks(persons, rel) {
    const G = GenealogyLayoutEngine;

    // union-find
    const root = new Map(persons.map(p => [p.id, p.id]));
    const find = (x) => { while (root.get(x) !== x) { root.set(x, root.get(root.get(x))); x = root.get(x); } return x; };
    rel.partners.forEach((set, a) => set.forEach(b => {
      const ra = find(a), rb = find(b);
      if (ra !== rb) root.set(rb, ra);
    }));

    const groups = new Map();
    persons.forEach(p => {
      const r = find(p.id);
      if (!groups.has(r)) groups.set(r, []);
      groups.get(r).push(p.id);
    });

    const COUPLE = G.COUPLE_GAP;
    const blocks = [];
    const blockOf = new Map();

    groups.forEach(members => {
      const ordered = G._orderMembers(members, rel);
      const k = ordered.length;
      const off = new Map();
      ordered.forEach((id, j) => off.set(id, (j - (k - 1) / 2) * COUPLE));
      const blk = {
        idx: blocks.length,
        members: ordered,
        off,
        half: ((k - 1) / 2) * COUPLE,
        level: 0,
        x: 0,
        parentBlocks: [],
        childBlocks: [],
        kids: [],
        firstIndex: Math.min(...ordered.map(id => rel.index.get(id)))
      };
      blocks.push(blk);
      ordered.forEach(id => blockOf.set(id, blk));
    });

    return { blocks, blockOf };
  }

  /** 블록 내부 좌→우 순서: 남성 → 미상 → 여성. 3명 이상(재혼)은 중심 인물 기준 전/현 배우자 좌우 배치 */
  static _orderMembers(members, rel) {
    if (members.length === 1) return members.slice();

    const rank = (id) => {
      const g = rel.pMap.get(id)?.gender;
      return g === 'male' ? 0 : g === 'female' ? 2 : 1;
    };
    const byIndex = (a, b) => rel.index.get(a) - rel.index.get(b);

    if (members.length === 2) {
      return members.slice().sort((a, b) => rank(a) - rank(b) || byIndex(a, b));
    }

    const inComp = new Set(members);
    const nb = (id) => [...(rel.partners.get(id) || [])].filter(x => inComp.has(x)).sort(byIndex);
    const hub = members.reduce((best, m) => (nb(m).length > nb(best).length ? m : best), members[0]);

    const used = new Set([hub]);
    const leftNear = [], right = [];
    nb(hub).forEach(p => {
      if (used.has(p)) return;
      used.add(p);
      (rel.ended.has(rel.key(hub, p)) ? leftNear : right).push(p);
    });
    const rest = members.filter(m => !used.has(m)).sort(byIndex);
    return [...leftNear.reverse(), hub, ...right, ...rest];
  }

  // ─── Phase 3. 세대 배정 ──────────────────────────────────────────────────

  static _assignLevels(blocks, rel, blockOf) {
    const out = blocks.map(() => new Set());
    rel.p2c.forEach((kids, parent) => {
      const bp = blockOf.get(parent);
      kids.forEach(k => {
        const bc = blockOf.get(k);
        if (bp !== bc) out[bp.idx].add(bc.idx);
      });
    });

    blocks.forEach(b => { b.level = 0; });
    const maxIter = blocks.length + 2;
    for (let it = 0; it < maxIter; it++) {
      let changed = false;
      out.forEach((set, i) => set.forEach(j => {
        if (blocks[j].level < blocks[i].level + 1) { blocks[j].level = blocks[i].level + 1; changed = true; }
      }));
      if (!changed) break;
    }

    // 뿌리(부모 없는 블록)는 자녀 바로 윗세대로 끌어내림
    blocks.forEach((b, i) => {
      if (out[i].size === 0) return;
      if (b.members.some(m => (rel.c2p.get(m) || []).length > 0)) return;
      const target = Math.min(...[...out[i]].map(j => blocks[j].level)) - 1;
      if (target > b.level) b.level = target;
    });

    const minLv = Math.min(...blocks.map(b => b.level));
    blocks.forEach(b => { b.level -= minLv; });
  }

  // ─── Phase 4. 블록 간 부모/자녀 연결 ─────────────────────────────────────

  static _linkBlocks(blocks, rel, blockOf) {
    const { p2c, c2p, pMap, index } = rel;

    blocks.forEach(blk => {
      const memberIdx = new Map(blk.members.map((m, i) => [m, i]));

      // 부모 블록
      const pbs = new Set();
      blk.members.forEach(m => (c2p.get(m) || []).forEach(p => {
        const pb = blockOf.get(p);
        if (pb !== blk) pbs.add(pb);
      }));
      blk.parentBlocks = [...pbs];

      // 자녀 (블록 밖) — 왼쪽 부모의 자녀가 먼저, 같으면 나이순(전원 나이 입력 시) 또는 입력순
      const kidSet = new Set();
      blk.members.forEach(m => (p2c.get(m) || []).forEach(k => {
        if (blockOf.get(k) !== blk) kidSet.add(k);
      }));
      const kids = [...kidSet];
      const keyOf = (k) => {
        const ps = (c2p.get(k) || []).filter(p => memberIdx.has(p));
        return ps.reduce((s, p) => s + memberIdx.get(p), 0) / Math.max(ps.length, 1);
      };
      const allAge = kids.every(k => typeof pMap.get(k).age === 'number' && !Number.isNaN(pMap.get(k).age));
      kids.sort((a, b) =>
        keyOf(a) - keyOf(b) ||
        (allAge ? pMap.get(b).age - pMap.get(a).age : 0) ||
        index.get(a) - index.get(b));
      blk.kids = kids;

      const cbs = [];
      kids.forEach(k => { const cb = blockOf.get(k); if (!cbs.includes(cb)) cbs.push(cb); });
      blk.childBlocks = cbs;
    });
  }

  // ─── Phase 5. X 좌표 ─────────────────────────────────────────────────────

  static _placeBlocks(blocks, rel, blockOf, scale = 1) {
    const G = GenealogyLayoutEngine;
    const { p2c, c2p } = rel;
    const SIB = G.BASE_SIB_GAP * scale;        // 형제 블록 사이 간격 (기본 150, 인원 비례)
    const FAM = G.BASE_FAM_GAP * scale;        // 다른 가족 블록 사이 간격 (기본 200, 인원 비례)

    const maxLv = Math.max(...blocks.map(b => b.level));
    const order = Array.from({ length: maxLv + 1 }, () => []);

    // 초기 순서: 뿌리부터 DFS (자녀 순서 보존)
    const placed = new Set();
    const place = (b) => {
      if (placed.has(b)) return;
      placed.add(b);
      order[b.level].push(b);
      b.childBlocks.forEach(place);
    };
    blocks
      .filter(b => b.parentBlocks.length === 0)
      .sort((a, b) => a.level - b.level || a.firstIndex - b.firstIndex)
      .forEach(place);
    blocks.forEach(place);   // 순환 등으로 빠진 블록 보정

    const share = (a, b) => a.parentBlocks.some(p => b.parentBlocks.includes(p));
    const sep   = (a, b) => a.half + b.half + (share(a, b) ? SIB : FAM);

    // 초기 배치: 세대별 순차 배치
    order.forEach(list => {
      let cursor = 0;
      list.forEach((b, i) => {
        if (i > 0) cursor += sep(list[i - 1], b);
        b.x = cursor;
      });
      const mid = list.length ? (list[0].x + list[list.length - 1].x) / 2 : 0;
      list.forEach(b => { b.x = G._snap(b.x - mid); });
    });

    const mean = (arr) => arr.reduce((s, v) => s + v, 0) / arr.length;
    const px = (id) => { const b = blockOf.get(id); return b.x + b.off.get(id); };

    // 부모 기준 희망 위치: 혈육 구성원이 부모 중점 바로 아래에 오도록
    const parentAnchor = (b) => {
      const anchors = [], desires = [];
      b.members.forEach(m => {
        const ps = c2p.get(m) || [];
        if (!ps.length) return;
        const mid = mean(ps.map(px));
        anchors.push(mid);
        desires.push(mid - b.off.get(m));
      });
      return anchors.length ? { a: mean(anchors), d: mean(desires) } : null;
    };
    // 자녀 기준 희망 위치: 부모 구성원의 중점이 자녀 중앙 위에 오도록
    const childAnchor = (b) => {
      if (!b.kids.length) return null;
      const a = mean(b.kids.map(px));
      const parentMembers = b.members.filter(m =>
        (p2c.get(m) || []).some(k => blockOf.get(k) !== b));
      const mo = mean(parentMembers.map(m => b.off.get(m)));
      return { a, d: a - mo };
    };

    const calc = (b, mode, dir) => {
      const cp = childAnchor(b), pp = parentAnchor(b);
      let d, w;
      if (mode === 'child') {
        if (cp)      { d = cp.d; w = 4; }
        else if (pp) { d = pp.d; w = 1; }
        else         { d = b.x;  w = 0.5; }
      } else if (cp && pp) { d = (2 * cp.d + pp.d) / 3; w = 3; }
      else if (cp)         { d = cp.d; w = 3; }
      else if (pp)         { d = pp.d; w = 1; }
      else                 { d = b.x;  w = 0.5; }
      const sa = dir === 'down' ? (pp ? pp.a : null) : (cp ? cp.a : null);
      return { d, w, sa };
    };

    // 세대 내 최소 간격 제약 하에서 가중 최소제곱 해 (Pool-Adjacent-Violators)
    const resolve = (list, info) => {
      const n = list.length;
      const c = new Array(n).fill(0);
      for (let i = 1; i < n; i++) c[i] = c[i - 1] + sep(list[i - 1], list[i]);
      const stack = [];
      for (let i = 0; i < n; i++) {
        const { d, w } = info.get(list[i]);
        stack.push({ sw: w, swt: w * (d - c[i]), from: i, to: i });
        while (stack.length > 1) {
          const q = stack[stack.length - 1], p = stack[stack.length - 2];
          if (p.swt / p.sw <= q.swt / q.sw) break;
          p.sw += q.sw; p.swt += q.swt; p.to = q.to;
          stack.pop();
        }
      }
      stack.forEach(s => {
        const y = s.swt / s.sw;
        for (let i = s.from; i <= s.to; i++) list[i].x = G._snap(y + c[i]);
      });
    };

    const sweep = (lv, mode, dir, allowSort) => {
      const list = order[lv];
      if (!list.length) return;
      const info = new Map(list.map(b => [b, calc(b, mode, dir)]));
      if (allowSort) {
        const slots = [], keyed = [];
        list.forEach((b, i) => {
          const sa = info.get(b).sa;
          if (sa !== null) { slots.push(i); keyed.push({ b, sa, i }); }
        });
        keyed.sort((p, q) => p.sa - q.sa || p.i - q.i);
        keyed.forEach((k, n) => { list[slots[n]] = k.b; });
      }
      resolve(list, info);
    };

    const down = Array.from({ length: maxLv + 1 }, (_, i) => i);
    const up   = down.slice().reverse();

    for (let it = 0; it < G.ITERATIONS; it++) {
      const sortable = it < G.SORT_ITERATIONS;
      down.forEach(lv => sweep(lv, 'mix', 'down', sortable));
      up.forEach(lv   => sweep(lv, 'mix', 'up',   sortable));
    }
    // 마무리: 부모는 자녀 중앙 위에 정확히
    up.forEach(lv => sweep(lv, 'child', 'up', false));

    const posX = new Map();
    blocks.forEach(b => b.members.forEach(id => posX.set(id, b.x + b.off.get(id))));
    return posX;
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

  /** 전체 인원 기준 간격 배율: 6명 이하 1.0 → 인원당 +0.03, 최대 1.35 */
  static _spacingScale(count) {
    const G = GenealogyLayoutEngine;
    const s = 1 + (count - G.SCALE_FROM) * G.SCALE_STEP;
    return Math.min(G.SCALE_MAX, Math.max(1, s));
  }

  static _snap(px) {
    const g = GenealogyLayoutEngine.GRID;
    return Math.round(px / g) * g;
  }
}
