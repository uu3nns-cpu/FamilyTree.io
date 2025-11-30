/**
 * ExportSection - 내보내기 섹션 컴포넌트 (가계도/기호 설명)
 * 
 * 책임:
 * - 개별 내보내기 섹션 UI 렌더링
 * - 미리보기 캔버스 관리
 * - 미리보기/내보내기 버튼 이벤트 처리
 */

export class ExportSection {
  constructor(type, canvasState, previewRenderer) {
    this.type = type; // 'genogram' or 'legend'
    this.canvasState = canvasState;
    this.previewRenderer = previewRenderer;
    this.onPreview = null;
    this.onExport = null;
  }

  /**
   * HTML 렌더링
   */
  render() {
    const config = this._getConfig();
    
    return `
      <div class="export-section">
        <div class="export-section__header">
          <h3 class="export-section__title">${config.icon} ${config.title}</h3>
          <div class="export-section__stats">${this._getStats()}</div>
        </div>
        <div class="export-section__preview">
          <canvas id="${config.canvasId}" class="export-preview-canvas"></canvas>
        </div>
        <div class="export-section__actions">
          <button class="btn btn--secondary btn--sm" data-action="preview-${this.type}">
            👁️ 미리보기
          </button>
          <button class="btn btn--primary btn--sm" data-action="export-${this.type}">
            📥 ${config.exportLabel}
          </button>
        </div>
      </div>
    `;
  }

  /**
   * 설정 가져오기
   */
  _getConfig() {
    if (this.type === 'genogram') {
      return {
        icon: '📊',
        title: '가계도',
        canvasId: 'genogramPreviewCanvas',
        exportLabel: '가계도 내보내기'
      };
    } else {
      return {
        icon: '🔤',
        title: '감정선 기호 설명',
        canvasId: 'legendPreviewCanvas',
        exportLabel: '기호 설명 내보내기'
      };
    }
  }

  /**
   * 통계 정보 가져오기
   */
  _getStats() {
    if (this.type === 'genogram') {
      const hasEmotionalLines = this.canvasState.relationships.some(r => r.type === 'emotional');
      const emotionalCount = this.canvasState.relationships.filter(r => r.type === 'emotional').length;
      
      let stats = `인물: ${this.canvasState.persons.length} · 관계: ${this.canvasState.relationships.length}`;
      if (hasEmotionalLines) {
        stats += ` · 감정선: ${emotionalCount}`;
      }
      return stats;
    } else {
      const emotionalRels = this.canvasState.relationships.filter(r => r.type === 'emotional');
      const usedTypes = [...new Set(emotionalRels.map(r => r.subtype))];
      return `사용된 감정선 타입: ${usedTypes.length}개`;
    }
  }

  /**
   * 이벤트 바인딩
   */
  bindEvents() {
    const config = this._getConfig();

    // 미리보기 버튼
    const previewBtn = document.querySelector(`[data-action="preview-${this.type}"]`);
    if (previewBtn) {
      previewBtn.addEventListener('click', () => {
        this.updatePreview();
        if (this.onPreview) {
          this.onPreview();
        }
      });
    }

    // 내보내기 버튼
    const exportBtn = document.querySelector(`[data-action="export-${this.type}"]`);
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        if (this.onExport) {
          this.onExport();
        }
      });
    }
  }

  /**
   * 미리보기 업데이트
   */
  updatePreview() {
    const config = this._getConfig();
    const canvas = document.getElementById(config.canvasId);
    
    if (canvas && this.previewRenderer) {
      this.previewRenderer.render(canvas);
    }
  }

  /**
   * 미리보기 콜백 설정
   */
  setOnPreview(callback) {
    this.onPreview = callback;
  }

  /**
   * 내보내기 콜백 설정
   */
  setOnExport(callback) {
    this.onExport = callback;
  }

  /**
   * 캔버스 ID 가져오기
   */
  getCanvasId() {
    return this._getConfig().canvasId;
  }
}
