/**
 * ExportModal - 내보내기 모달
 *
 * 레이아웃:
 *   [좌] 4:3 미리보기 캔버스
 *   [우] 파일명 · 포맷 · 내보내기 버튼
 *
 * 미리보기 버튼 → 별도 팝업 창에서 전체 크기로 확인
 */

import { Modal } from '../Modal.js';
import { Toast } from '../Toast.js';
import { ExportManager } from '../../export/ExportManager.js';

import { GenogramPreviewRenderer } from './renderers/GenogramPreviewRenderer.js';
import { LegendPreviewRenderer } from './renderers/LegendPreviewRenderer.js';

import { FileNameInput } from './components/FileNameInput.js';
import { FormatSelector } from './components/FormatSelector.js';
import { ExportSection } from './components/ExportSection.js';

import { ExportValidator } from './utils/ExportValidator.js';

export class ExportModal {
  constructor(canvasState) {
    this.canvasState = canvasState;
    this.exportManager = new ExportManager(canvasState);
    this.modal = null;

    this.genogramRenderer  = new GenogramPreviewRenderer(canvasState);
    this.legendRenderer    = new LegendPreviewRenderer(canvasState);

    this.fileNameInput  = new FileNameInput();
    this.formatSelector = new FormatSelector();

    this.genogramSection = new ExportSection('genogram', canvasState, this.genogramRenderer);

    const hasEmotionalLines = canvasState.relationships.some(r => r.type === 'emotional');
    this.legendSection = hasEmotionalLines
      ? new ExportSection('legend', canvasState, this.legendRenderer)
      : null;

    // stacked 레이아웃: 탭 없이 두 미리보기 동시 표시
    // (하위 호환용으로 필드는 유지)
    this._activeTab = 'genogram';
  }

  open() {
    const content = this._generateContent();

    this.modal = new Modal({
      title: '📤 내보내기',
      content,
      footer: '',          // footer 없음 (닫기 버튼 제거)
      className: 'export-modal export-modal--split',
      onClose: () => this._cleanup()
    });

    this.modal.render();
    this.modal.open();
    this._bindEvents();

    setTimeout(() => {
      this._updatePreview();
    }, 200);
  }

  // ─────────────────────────────── HTML 생성 ────────────────────────────────

  _generateContent() {
    const hasLegend = !!this.legendSection;

    return `
      <div class="export-split">

        <!-- ── 상단: 미리보기 2열 + 설정 ── -->
        <div class="export-top">

          <!-- 가계도 미리보기 -->
          <div class="export-preview-block">
            <div class="export-preview-block__header">
              <span class="export-preview-block__label">🌳 가계도</span>
              <button class="btn btn--ghost btn--sm" data-action="open-preview-genogram">
                🔍 크게 보기
              </button>
            </div>
            <div class="export-preview-wrap">
              <canvas id="exportPreviewCanvas" class="export-preview-canvas"></canvas>
            </div>
            <div class="export-preview-footer">
              <span id="exportPreviewStats" class="export-preview-stats"></span>
            </div>
          </div>

          <!-- 감정선 기호 미리보기 (있을 때만) -->
          ${hasLegend ? `
          <div class="export-preview-block">
            <div class="export-preview-block__header">
              <span class="export-preview-block__label">💛 감정선 기호</span>
              <button class="btn btn--ghost btn--sm" data-action="open-preview-legend">
                🔍 크게 보기
              </button>
            </div>
            <div class="export-preview-wrap">
              <canvas id="exportPreviewLegendCanvas" class="export-preview-canvas"></canvas>
            </div>
            <div class="export-preview-footer">
              <span id="exportPreviewLegendStats" class="export-preview-stats"></span>
            </div>
          </div>` : '<div class="export-preview-block export-preview-block--empty"></div>'}

          <!-- 공통 설정 -->
          <div class="export-split__right">
            ${this.fileNameInput.render()}
            <div class="export-divider"></div>
            ${this.formatSelector.render()}
          </div>

        </div>

        <!-- ── 하단: 내보내기 버튼 풀폭 ── -->
        <div class="export-bottom">
          <div class="export-divider"></div>
          <div class="export-actions export-actions--row">
            <button class="btn btn--primary export-btn-export" data-action="do-export">
              📥 가계도 내보내기
            </button>
            ${hasLegend ? `
            <button class="btn btn--secondary export-btn-export" data-action="do-export-legend">
              📥 감정선 기호 내보내기
            </button>` : ''}
          </div>
          <p class="export-note">확장자(.png / .svg)는 자동으로 추가됩니다.</p>
        </div>

      </div>
    `;
  }

  // ─────────────────────────────── 이벤트 ──────────────────────────────────

  _bindEvents() {
    const el = this.modal.element;

    // 가계도 미리보기 창 열기
    el.querySelector('[data-action="open-preview-genogram"]')
      ?.addEventListener('click', () => {
        this._activeTab = 'genogram';
        this._openPreviewWindow();
      });

    // 감정선 기호 미리보기 창 열기
    el.querySelector('[data-action="open-preview-legend"]')
      ?.addEventListener('click', () => {
        this._activeTab = 'legend';
        this._openPreviewWindow();
      });

    // 포맷 변경
    this.formatSelector.bindEvents();
    this.formatSelector.setOnChange(() => this._updatePreview());

    // 가계도 내보내기
    el.querySelector('[data-action="do-export"]')
      ?.addEventListener('click', () => this._handleExportGenogram());

    // 기호 설명 내보내기
    el.querySelector('[data-action="do-export-legend"]')
      ?.addEventListener('click', () => this._handleExportLegend());
  }

  // ─────────────────────────────── 미리보기 ────────────────────────────────

  _updatePreview() {
    // 가계도 미리보기
    const gCanvas = document.getElementById('exportPreviewCanvas');
    if (gCanvas) {
      const wrap = gCanvas.closest('.export-preview-wrap');
      const w    = wrap ? wrap.clientWidth || 480 : 480;

      // 바운딩 박스 비율에 맞춰 높이 동적 계산 (padding 20 기준)
      const bounds = this.genogramRenderer.calculateBounds
        ? this.genogramRenderer.calculateBounds()
        : null;
      let h;
      if (bounds && bounds.width > 0 && bounds.height > 0) {
        const contentRatio = bounds.height / bounds.width;
        // 비율 기반 높이, 최소 160px ~ 최대 w*0.75 콤일
        h = Math.min(Math.max(Math.round(w * contentRatio) + 40, 160), Math.round(w * 0.75));
      } else {
        h = Math.round(w * (3 / 4));
      }

      if (wrap) {
        wrap.style.aspectRatio = 'unset';
        wrap.style.height = h + 'px';
      }
      this.genogramRenderer.render(gCanvas, { displayWidth: w, displayHeight: h, pixelRatio: 2 });
    }

    // 감정선 기호 미리보기 (있을 때만)
    const lCanvas = document.getElementById('exportPreviewLegendCanvas');
    if (lCanvas && this.legendRenderer) {
      const wrap = lCanvas.closest('.export-preview-wrap');
      const w    = wrap ? wrap.clientWidth || 480 : 480;
      const h    = Math.round(w * (3 / 4));
      this.legendRenderer.render(lCanvas, { displayWidth: w, displayHeight: h, pixelRatio: 2 });
    }

    this._updateStats();
  }

  _updateStats() {
    // 가계도 통계
    const gStats = document.getElementById('exportPreviewStats');
    if (gStats) {
      const p = this.canvasState.persons.length;
      const r = this.canvasState.relationships.filter(r => r.type !== 'emotional').length;
      gStats.textContent = `인물 ${p}명 · 관계 ${r}개`;
    }

    // 감정선 기호 통계
    const lStats = document.getElementById('exportPreviewLegendStats');
    if (lStats && this.legendRenderer) {
      const cnt = this.legendRenderer.getUsedSubtypes().length;
      lStats.textContent = `감정선 타입 ${cnt}개`;
    }
  }

  /** 별도 팝업 창에서 미리보기 */
  _openPreviewWindow() {
    const srcCanvas = document.getElementById('exportPreviewCanvas');
    if (!srcCanvas) return;

    // 팝업 크기: 4:3, 최대 1200×900
    const pw = Math.min(window.screen.availWidth  * 0.85, 1200);
    const ph = Math.round(pw * (3 / 4));

    const popup = window.open(
      '', '_blank',
      `width=${Math.round(pw)},height=${Math.round(ph)},resizable=yes,scrollbars=yes`
    );
    if (!popup) {
      Toast.error('팝업이 차단되었습니다. 팝업 허용 후 다시 시도해주세요.');
      return;
    }

    // 팝업 HTML
    popup.document.write(`<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8"/>
  <title>미리보기</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body {
      background: #1a1a2e;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      min-height: 100vh;
      padding: 24px;
      gap: 16px;
      font-family: sans-serif;
    }
    h1 {
      color: #e2e8f0;
      font-size: 15px;
      font-weight: 600;
      letter-spacing: 0.05em;
    }
    img {
      max-width: 100%;
      border-radius: 8px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
      background: #fff;
    }
    .hint {
      color: #94a3b8;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <h1>${this._activeTab === 'legend' ? '감정선 기호 설명 미리보기' : '가계도 미리보기'}</h1>
  <img id="previewImg" src="" alt="미리보기"/>
  <p class="hint">이미지를 우클릭하면 저장할 수 있습니다.</p>
  <script>
    // 부모 창에서 dataURL 수신
    window.addEventListener('message', function(e) {
      if (e.data && e.data.type === 'PREVIEW_IMAGE') {
        document.getElementById('previewImg').src = e.data.dataURL;
      }
    });
  </script>
</body>
</html>`);
    popup.document.close();

    // 고해상도 렌더링 후 팝업에 전송
    const tmpCanvas = document.createElement('canvas');
    if (this._activeTab === 'legend' && this.legendRenderer) {
      this.legendRenderer.render(tmpCanvas, {
        displayWidth:  Math.round(pw),
        displayHeight: Math.round(ph),
        pixelRatio: 3
      });
    } else {
      this.genogramRenderer.render(tmpCanvas, {
        displayWidth:  Math.round(pw),
        displayHeight: Math.round(ph),
        pixelRatio: 3
      });
    }

    const dataURL = tmpCanvas.toDataURL('image/png');

    // 팝업 로드 완료 후 이미지 전달
    const tryPost = (attempts = 0) => {
      if (!popup || popup.closed) return;
      try {
        popup.postMessage({ type: 'PREVIEW_IMAGE', dataURL }, '*');
      } catch (_) {
        if (attempts < 10) setTimeout(() => tryPost(attempts + 1), 150);
      }
    };
    setTimeout(() => tryPost(), 300);
  }

  // ─────────────────────────────── 내보내기 ────────────────────────────────

  async _handleExportGenogram() {
    let filename = this.fileNameInput.getValue();
    const validation = ExportValidator.validateFilename(filename);
    if (!validation.valid) { Toast.error(validation.error); return; }
    filename = ExportValidator.sanitizeFilename(filename);

    const format = this.formatSelector.getSelectedFormat();
    try {
      if (format === 'png') {
        await this.exportManager.exportToPNG(
          ExportValidator.ensureExtension(filename, 'png'), 5
        );
      } else {
        await this.exportManager.exportToSVG(
          ExportValidator.ensureExtension(filename, 'svg')
        );
      }
    } catch (err) {
      console.error('내보내기 실패:', err);
      Toast.error('내보내기에 실패했습니다');
    }
  }

  async _handleExportLegend() {
    let filename = this.fileNameInput.getValue();
    const validation = ExportValidator.validateFilename(filename);
    if (!validation.valid) { Toast.error(validation.error); return; }
    filename = ExportValidator.sanitizeFilename(filename) + '_감정선기호';

    const format = this.formatSelector.getSelectedFormat();
    try {
      if (format === 'png') {
        await this._exportLegendToPNG(filename);
      } else {
        await this._exportLegendToSVG(filename);
      }
    } catch (err) {
      console.error('기호 설명 내보내기 실패:', err);
      Toast.error('기호 설명 내보내기에 실패했습니다');
    }
  }

  async _exportLegendToPNG(filename) {
    Toast.info('PNG 생성 중...');
    const canvas = document.createElement('canvas');
    this.legendRenderer.render(canvas, { pixelRatio: 5 });
    this._download(canvas.toDataURL('image/png'), ExportValidator.ensureExtension(filename, 'png'));
    Toast.success('PNG 내보내기 완료!');
  }

  async _exportLegendToSVG(filename) {
    Toast.info('SVG 생성 중...');
    const usedSubtypes = this.legendRenderer.getUsedSubtypes();
    if (usedSubtypes.length === 0) { Toast.error('감정선이 없습니다'); return; }

    const itemHeight    = 40;
    const itemsPerCol   = Math.ceil(usedSubtypes.length / 2);
    const width         = 800;
    const height        = 100 + itemsPerCol * itemHeight;

    let svg = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    svg += `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">\n`;
    svg += `  <rect width="${width}" height="${height}" fill="white"/>\n`;
    svg += `  <text x="${width/2}" y="40" text-anchor="middle" font-family="sans-serif" font-size="20" font-weight="bold" fill="black">감정선 기호 설명</text>\n`;

    const startY = 80, columnWidth = width / 2, padding = 40;
    usedSubtypes.forEach((subtype, index) => {
      const data = this.legendRenderer.legendData[subtype];
      if (!data) return;
      const col = index % 2, row = Math.floor(index / 2);
      const x = padding + col * columnWidth, y = startY + row * itemHeight;
      svg += this._generateLegendSampleSVG(subtype, x, y, data.color);
      svg += `  <text x="${x+70}" y="${y+5}" font-family="sans-serif" font-size="14" fill="black">${data.label}</text>\n`;
    });
    svg += `</svg>`;

    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url  = URL.createObjectURL(blob);
    this._download(url, ExportValidator.ensureExtension(filename, 'svg'));
    URL.revokeObjectURL(url);
    Toast.success('SVG 내보내기 완료!');
  }

  _generateLegendSampleSVG(subtype, x, y, color) {
    const fromX = x, toX = x + 60;
    let svg = '';
    switch (subtype) {
      case 'close': case 'conflict':
        svg += `  <line x1="${fromX}" y1="${y-2}" x2="${toX}" y2="${y-2}" stroke="${color}" stroke-width="2"/>\n`;
        svg += `  <line x1="${fromX}" y1="${y+2}" x2="${toX}" y2="${y+2}" stroke="${color}" stroke-width="2"/>\n`;
        break;
      case 'love':
        svg += `  <line x1="${fromX}" y1="${y}" x2="${toX}" y2="${y}" stroke="${color}" stroke-width="2"/>\n`;
        svg += `  <circle cx="${(fromX+toX)/2}" cy="${y}" r="3" fill="${color}"/>\n`;
        break;
      case 'distant': case 'neglect':
        svg += `  <line x1="${fromX}" y1="${y}" x2="${toX}" y2="${y}" stroke="${color}" stroke-width="2" stroke-dasharray="5,5"/>\n`;
        break;
      case 'cutoff':
        svg += `  <line x1="${fromX}" y1="${y}" x2="${toX}" y2="${y}" stroke="${color}" stroke-width="2" stroke-dasharray="5,5"/>\n`;
        svg += `  <line x1="${(fromX+toX)/2-3}" y1="${y-6}" x2="${(fromX+toX)/2-3}" y2="${y+6}" stroke="${color}" stroke-width="2"/>\n`;
        svg += `  <line x1="${(fromX+toX)/2+3}" y1="${y-6}" x2="${(fromX+toX)/2+3}" y2="${y+6}" stroke="${color}" stroke-width="2"/>\n`;
        break;
      case 'hostile':
        svg += `  <polyline points="${fromX},${y} ${fromX+15},${y-4} ${fromX+30},${y+4} ${fromX+45},${y-4} ${toX},${y}" stroke="${color}" stroke-width="2" fill="none"/>\n`;
        break;
      case 'fused':
        svg += `  <line x1="${fromX}" y1="${y-3}" x2="${toX}" y2="${y-3}" stroke="${color}" stroke-width="2"/>\n`;
        svg += `  <line x1="${fromX}" y1="${y}" x2="${toX}" y2="${y}" stroke="${color}" stroke-width="2"/>\n`;
        svg += `  <line x1="${fromX}" y1="${y+3}" x2="${toX}" y2="${y+3}" stroke="${color}" stroke-width="2"/>\n`;
        break;
      default:
        svg += `  <line x1="${fromX}" y1="${y}" x2="${toX}" y2="${y}" stroke="${color}" stroke-width="2"/>\n`;
    }
    return svg;
  }

  _download(dataURL, filename) {
    const a = document.createElement('a');
    a.href = dataURL; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }

  _cleanup() {}
}
