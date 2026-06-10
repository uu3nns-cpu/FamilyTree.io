/**
 * AutoLayout — GenealogyLayoutEngine 래퍼
 *
 * ▸ 이 파일은 더 이상 레이아웃 로직을 직접 보유하지 않는다.
 *   실제 계산은 모두 GenealogyLayoutEngine.js 에서 수행한다.
 *
 * ▸ 외부 호출 인터페이스는 기존과 동일하게 유지된다.
 *   - canvas.js  → this.autoLayout.layout()
 *   - canvas.js  → this.autoLayout.autoArrange()   [레거시 별칭]
 *   - 테스트 코드 → AutoLayout.compute(persons, relationships)
 *
 * ▸ 기존 nextFreeCol 기반 배치 로직은 완전히 제거되었다.
 *   GenealogyLayoutEngine 의 Buchheim-Walker 알고리즘이 대체한다.
 */

import { GenealogyLayoutEngine } from './GenealogyLayoutEngine.js';

export class AutoLayout {

  // ─── 상수 (하위 호환용 — 실제 값은 GenealogyLayoutEngine 에서 관리) ────
  static get H_SPACING() { return GenealogyLayoutEngine.H_GAP; }
  static get V_SPACING() { return GenealogyLayoutEngine.V_GAP; }
  static get GRID()      { return GenealogyLayoutEngine.GRID;  }
  static get GAP()       { return 1; } // 레거시 참조 호환

  constructor(canvasState) {
    this.canvasState = canvasState;
  }

  // ─── 외부 진입점 ──────────────────────────────────────────────────────────

  /**
   * 자동정렬 & 템플릿 정렬 공통 진입점.
   * canvasState.persons / relationships 를 읽어 각 person.x, person.y 를 갱신한다.
   */
  layout() {
    const { persons, relationships } = this.canvasState;
    if (!persons || persons.length === 0) return;

    const posMap = GenealogyLayoutEngine.compute(persons, relationships);

    persons.forEach(p => {
      const pos = posMap.get(p.id);
      if (pos) { p.x = pos.x; p.y = pos.y; }
    });
  }

  /**
   * [레거시 호환] canvas.js 가 autoArrange() 를 직접 호출하는 경우를 위한 별칭.
   */
  autoArrange() { this.layout(); }

  // ─── 정적 API (테스트 / 외부 직접 호출 호환) ─────────────────────────────

  /**
   * persons / relationships 를 받아 Map<id, {x, y}> 를 반환한다.
   * GenealogyLayoutEngine.compute 의 직접 위임.
   */
  static compute(persons, relationships) {
    return GenealogyLayoutEngine.compute(persons, relationships);
  }
}
