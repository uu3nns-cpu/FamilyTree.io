/**
 * ExportModal - 내보내기 모달 (모듈화된 버전)
 * 
 * 책임:
 * - UI 조립 및 이벤트 라우팅
 * - 컴포넌트 간 조율
 * 
 * 기능:
 * 1. 파일명 입력
 * 2. PNG/SVG 포맷 선택
 * 3. 가계도 미리보기 / 내보내기
 * 4. 감정선 기호 설명 미리보기 / 내보내기
 */

import { Modal } from '../Modal.js';
import { Toast } from '../Toast.js';
import { ExportManager } from '../../export/ExportManager.js';

// Renderers
import { GenogramPreviewRenderer } from './renderers/GenogramPreviewRenderer.js';
import { LegendPreviewRenderer } from './renderers/LegendPreviewRenderer.js';

// Components
import { FileNameInput } from './components/FileNameInput.js';
import { FormatSelector } from './components/FormatSelector.js';
import { ExportSection } from './components/ExportSection.js';

// Utils
import { ExportValidator } from './utils/ExportValidator.js';

export class ExportModal {
  constructor(canvasState) {
    console.log('📤 ExportModal created (모듈화):', {
      persons: canvasState.persons.length,
      relationships: canvasState.relationships.length
    });

    this.canvasState = canvasState;
    this.exportManager = new ExportManager(canvasState);
    this.modal = null;

    // Renderers
    this.genogramRenderer = new GenogramPreviewRenderer(canvasState);
    this.legendRenderer = new LegendPreviewRenderer(canvasState);

    // Components
    this.fileNameInput = new FileNameInput();
    this.formatSelector = new FormatSelector();
    
    // Sections
    this.genogramSection = new ExportSection('genogram', canvasState, this.genogramRenderer);
    
    // 감정선이 있는 경우만 legend section 생성
    const hasEmotionalLines = canvasState.relationships.some(r => r.type === 'emotional');
    this.legendSection = hasEmotionalLines 
      ? new ExportSection('legend', canvasState, this.legendRenderer)
      : null;
  }

  /**
   * 모달 열기
   */
  open() {
    const content = this._generateContent();
    const footer = this._generateFooter();

    this.modal = new Modal({
      title: '📤 내보내기',
      content: content,
      footer: footer,
      className: 'export-modal export-modal--redesigned',
      onClose: () => this._cleanup()
    });

    this.modal.render();
    this.modal.open();

    // 이벤트 바인딩
    this._bindEvents();

    // 초기 미리보기
    this._initializePreviews();
  }

  /**
   * 콘텐츠 생성 (컴포넌트 조립)
   */
  _generateContent() {
    return `
      <div class="export-form">
        <!-- 파일명 입력 -->
        ${this.fileNameInput.render()}

        <!-- 포맷 선택 -->
        ${this.formatSelector.render()}

        <!-- 내보내기 섹션들 -->
        <div class="export-sections">
          <!-- 가계도 섹션 -->
          ${this.genogramSection.render()}

          <!-- 감정선 기호 설명 섹션 (있는 경우만) -->
          ${this.legendSection ? this.legendSection.render() : ''}
        </div>
      </div>
    `;
  }

  /**
   * 푸터 생성
   */
  _generateFooter() {
    return `
      <button class="btn btn--secondary" data-action="cancel">취소</button>
    `;
  }

  /**
   * 이벤트 바인딩
   */
  _bindEvents() {
    const element = this.modal.element;

    // 취소 버튼
    const cancelBtn = element.querySelector('[data-action="cancel"]');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        this.modal.close();
      });
    }

    // 포맷 선택기 이벤트
    this.formatSelector.bindEvents();
    this.formatSelector.setOnChange((format) => {
      console.log('📝 포맷 변경:', format);
      // 미리보기 재생성
      this._updateAllPreviews();
    });

    // 가계도 섹션 이벤트
    this.genogramSection.bindEvents();
    this.genogramSection.setOnPreview(() => {
      Toast.info('가계도 미리보기');
    });
    this.genogramSection.setOnExport(() => {
      this._handleExportGenogram();
    });

    // 감정선 기호 섹션 이벤트 (있는 경우만)
    if (this.legendSection) {
      this.legendSection.bindEvents();
      this.legendSection.setOnPreview(() => {
        Toast.info('감정선 기호 설명 미리보기');
      });
      this.legendSection.setOnExport(() => {
        this._handleExportLegend();
      });
    }
  }

  /**
   * 초기 미리보기 생성
   */
  _initializePreviews() {
    // 모달이 DOM에 완전히 렌더링된 후 미리보기 그리기
    setTimeout(() => {
      console.log('🖌️ 초기 미리보기 렌더링 시작');
      this.genogramSection.updatePreview();
      
      if (this.legendSection) {
        this.legendSection.updatePreview();
      }
    }, 200);
  }

  /**
   * 모든 미리보기 업데이트
   */
  _updateAllPreviews() {
    this.genogramSection.updatePreview();
    
    if (this.legendSection) {
      this.legendSection.updatePreview();
    }
  }

  /**
   * 가계도 내보내기 처리
   */
  async _handleExportGenogram() {
    // 파일명 가져오기 및 검증
    let filename = this.fileNameInput.getValue();
    
    const validation = ExportValidator.validateFilename(filename);
    if (!validation.valid) {
      Toast.error(validation.error);
      return;
    }

    // 파일명 정제
    filename = ExportValidator.sanitizeFilename(filename);

    // 포맷에 따라 내보내기
    const format = this.formatSelector.getSelectedFormat();
    
    try {
      if (format === 'png') {
        filename = ExportValidator.ensureExtension(filename, 'png');
        await this.exportManager.exportToPNG(filename, 5); // 5배 해상도
      } else if (format === 'svg') {
        filename = ExportValidator.ensureExtension(filename, 'svg');
        await this.exportManager.exportToSVG(filename);
      }
    } catch (error) {
      console.error('❌ 내보내기 실패:', error);
      Toast.error('내보내기에 실패했습니다');
    }
  }

  /**
   * 감정선 기호 설명 내보내기 처리
   */
  async _handleExportLegend() {
    // 파일명 가져오기
    let filename = this.fileNameInput.getValue();
    
    const validation = ExportValidator.validateFilename(filename);
    if (!validation.valid) {
      Toast.error(validation.error);
      return;
    }

    filename = ExportValidator.sanitizeFilename(filename);
    filename = filename + '_감정선기호';

    // 포맷에 따라 내보내기
    const format = this.formatSelector.getSelectedFormat();
    
    try {
      if (format === 'png') {
        await this._exportLegendToPNG(filename);
      } else if (format === 'svg') {
        await this._exportLegendToSVG(filename);
      }
    } catch (error) {
      console.error('❌ 기호 설명 내보내기 실패:', error);
      Toast.error('기호 설명 내보내기에 실패했습니다');
    }
  }

  /**
   * 감정선 기호 설명을 PNG로 내보내기
   */
  async _exportLegendToPNG(filename) {
    Toast.info('PNG 생성 중...');

    // 임시 캔버스 생성
    const canvas = document.createElement('canvas');
    
    // 렌더링
    this.legendRenderer.render(canvas, { pixelRatio: 5 });

    // 다운로드
    const dataURL = canvas.toDataURL('image/png');
    this._download(dataURL, ExportValidator.ensureExtension(filename, 'png'));

    Toast.success('PNG 내보내기 완료!');
  }

  /**
   * 감정선 기호 설명을 SVG로 내보내기
   */
  async _exportLegendToSVG(filename) {
    Toast.info('SVG 생성 중...');

    const usedSubtypes = this.legendRenderer.getUsedSubtypes();
    if (usedSubtypes.length === 0) {
      Toast.error('감정선이 없습니다');
      return;
    }

    // SVG 생성
    const itemHeight = 40;
    const itemsPerColumn = Math.ceil(usedSubtypes.length / 2);
    const width = 800;
    const height = 100 + itemsPerColumn * itemHeight;

    let svg = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    svg += `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">\n`;
    svg += `  <rect width="${width}" height="${height}" fill="white"/>\n`;

    // 제목
    svg += `  <text x="${width / 2}" y="40" text-anchor="middle" font-family="sans-serif" font-size="20" font-weight="bold" fill="black">감정선 기호 설명</text>\n`;

    // 항목들
    const startY = 80;
    const columnWidth = width / 2;
    const padding = 40;

    usedSubtypes.forEach((subtype, index) => {
      const data = this.legendRenderer.legendData[subtype];
      if (!data) return;

      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = padding + col * columnWidth;
      const y = startY + row * itemHeight;

      // 샘플 선 (SVG)
      svg += this._generateLegendSampleSVG(subtype, x, y, data.color);

      // 라벨
      svg += `  <text x="${x + 70}" y="${y + 5}" font-family="sans-serif" font-size="14" fill="black">${data.label}</text>\n`;
      svg += `  <text x="${x + 70}" y="${y + 20}" font-family="sans-serif" font-size="12" fill="#666666">(${data.style})</text>\n`;
    });

    svg += `</svg>`;

    // 다운로드
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    this._download(url, ExportValidator.ensureExtension(filename, 'svg'));
    URL.revokeObjectURL(url);

    Toast.success('SVG 내보내기 완료!');
  }

  /**
   * SVG용 샘플 선 생성
   */
  _generateLegendSampleSVG(subtype, x, y, color) {
    const fromX = x;
    const toX = x + 60;
    let svg = '';

    switch (subtype) {
      case 'close':
      case 'conflict':
        svg += `  <line x1="${fromX}" y1="${y - 2}" x2="${toX}" y2="${y - 2}" stroke="${color}" stroke-width="2"/>\n`;
        svg += `  <line x1="${fromX}" y1="${y + 2}" x2="${toX}" y2="${y + 2}" stroke="${color}" stroke-width="2"/>\n`;
        break;
      case 'love':
        svg += `  <line x1="${fromX}" y1="${y}" x2="${toX}" y2="${y}" stroke="${color}" stroke-width="2"/>\n`;
        svg += `  <circle cx="${(fromX + toX) / 2}" cy="${y}" r="3" fill="${color}"/>\n`;
        break;
      case 'distant':
      case 'neglect':
        svg += `  <line x1="${fromX}" y1="${y}" x2="${toX}" y2="${y}" stroke="${color}" stroke-width="2" stroke-dasharray="5,5"/>\n`;
        break;
      case 'cutoff':
        svg += `  <line x1="${fromX}" y1="${y}" x2="${toX}" y2="${y}" stroke="${color}" stroke-width="2" stroke-dasharray="5,5"/>\n`;
        const midX = (fromX + toX) / 2;
        svg += `  <line x1="${midX - 3}" y1="${y - 6}" x2="${midX - 3}" y2="${y + 6}" stroke="${color}" stroke-width="2"/>\n`;
        svg += `  <line x1="${midX + 3}" y1="${y - 6}" x2="${midX + 3}" y2="${y + 6}" stroke="${color}" stroke-width="2"/>\n`;
        break;
      case 'hostile':
        svg += `  <polyline points="${fromX},${y} ${fromX + 15},${y - 4} ${fromX + 30},${y + 4} ${fromX + 45},${y - 4} ${toX},${y}" stroke="${color}" stroke-width="2" fill="none"/>\n`;
        break;
      case 'fused':
        svg += `  <line x1="${fromX}" y1="${y - 3}" x2="${toX}" y2="${y - 3}" stroke="${color}" stroke-width="2"/>\n`;
        svg += `  <line x1="${fromX}" y1="${y}" x2="${toX}" y2="${y}" stroke="${color}" stroke-width="2"/>\n`;
        svg += `  <line x1="${fromX}" y1="${y + 3}" x2="${toX}" y2="${y + 3}" stroke="${color}" stroke-width="2"/>\n`;
        break;
      default:
        svg += `  <line x1="${fromX}" y1="${y}" x2="${toX}" y2="${y}" stroke="${color}" stroke-width="2"/>\n`;
    }

    return svg;
  }

  /**
   * 다운로드 헬퍼
   */
  _download(dataURL, filename) {
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * 정리
   */
  _cleanup() {
    console.log('🧹 ExportModal cleanup');
  }
}
