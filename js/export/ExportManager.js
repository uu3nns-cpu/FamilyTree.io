/**
 * ExportManager - 내보내기 관리 (GenogramRenderer 사용)
 * ✨ Trim 기능 강화: 그림이 있는 영역만 정확히 자르기
 */

import { Toast } from '../ui/Toast.js';
import { GenogramRenderer } from '../canvas/GenogramRenderer.js';
import { renderParentChildGroupToSVG, renderEmotionalToSVG } from './ExportManager_SVG_Helper.js';

export class ExportManager {
  constructor(canvasState) {
    this.canvasState = canvasState;
  }

  /**
   * PNG로 내보내기 (Trim 적용)
   */
  async exportToPNG(filename = 'genogram.png', scale = 1) {
    try {
      Toast.info(`PNG 생성 중... (${scale}x)`);

      // 디버깅: 현재 상태 로그
      console.log('📊PNG Export Debug:');
      console.log('- Scale:', scale);
      console.log('- Persons:', this.canvasState.persons.length);
      console.log('- Relationships:', this.canvasState.relationships.length);

      // 새 캔버스 생성
      const exportCanvas = document.createElement('canvas');
      const ctx = exportCanvas.getContext('2d');

      // 바운딩 박스 계산
      const bounds = this._calculateBounds();
      const padding = 20 * scale; // ✨ Trim 모드: 최소 패딩

      // 캔버스 크기 설정 (고해상도)
      exportCanvas.width = (bounds.width + (padding * 2)) * scale;
      exportCanvas.height = (bounds.height + (padding * 2)) * scale;

      // 배경색 (투명 - 주석 처리)
      // ctx.fillStyle = '#ffffff';
      // ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

      // 원점 조정 및 스케일 적용
      ctx.save();
      ctx.scale(scale, scale);
      ctx.translate(padding / scale - bounds.minX, padding / scale - bounds.minY);

      // 🔥 GenogramRenderer 사용하여 관계선 그리기
      const renderer = new GenogramRenderer(ctx, this.canvasState);
      renderer.renderAllRelationships(this.canvasState.relationships);

      // 인물 그리기
      console.log('👤 Drawing persons:', this.canvasState.persons.length);
      this.canvasState.persons.forEach(person => {
        this._drawPerson(ctx, person, scale);
      });

      ctx.restore();

      // 다운로드
      const dataURL = exportCanvas.toDataURL('image/png');
      this._download(dataURL, filename);

      Toast.success(`PNG 내보내기 완료! (${scale}x)`);
    } catch (error) {
      console.error('PNG 내보내기 오류:', error);
      Toast.error('PNG 내보내기에 실패했습니다');
    }
  }

  /**
   * PDF로 내보내기 (Trim 적용)
   */
  async exportToPDF(filename = 'genogram.pdf', scale = 1) {
    try {
      Toast.info(`PDF 생성 중... (${scale}x)`);

      // jsPDF 라이브러리 체크
      if (typeof window.jspdf === 'undefined') {
        Toast.error('PDF 라이브러리를 로드할 수 없습니다');
        return;
      }

      const { jsPDF } = window.jspdf;

      // 바운딩 박스 계산
      const bounds = this._calculateBounds();
      const padding = 10 * scale; // ✨ Trim 모드: 최소 패딩

      // PDF 크기 계산 (mm 단위)
      const pxScale = 0.264583; // px to mm
      const pdfWidth = ((bounds.width + padding * 2) * scale) * pxScale;
      const pdfHeight = ((bounds.height + padding * 2) * scale) * pxScale;

      // PDF 생성
      const orientation = pdfWidth > pdfHeight ? 'landscape' : 'portrait';
      const pdf = new jsPDF({
        orientation: orientation,
        unit: 'mm',
        format: [Math.max(pdfWidth, pdfHeight), Math.min(pdfWidth, pdfHeight)]
      });

      // 임시 캔버스 생성
      const exportCanvas = document.createElement('canvas');
      const ctx = exportCanvas.getContext('2d');

      exportCanvas.width = (bounds.width + (padding * 2)) * scale;
      exportCanvas.height = (bounds.height + (padding * 2)) * scale;

      // 배경색
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

      // 원점 조정
      ctx.save();
      ctx.scale(scale, scale);
      ctx.translate(padding / scale - bounds.minX, padding / scale - bounds.minY);

      // 관계선 그리기
      const renderer = new GenogramRenderer(ctx, this.canvasState);
      renderer.renderAllRelationships(this.canvasState.relationships);

      // 인물 그리기
      this.canvasState.persons.forEach(person => {
        this._drawPerson(ctx, person, scale);
      });

      ctx.restore();

      // PDF에 이미지 추가
      const imgData = exportCanvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

      // 저장
      pdf.save(filename);

      Toast.success(`PDF 내보내기 완료! (${scale}x)`);
    } catch (error) {
      console.error('PDF 내보내기 오류:', error);
      Toast.error('PDF 내보내기에 실패했습니다');
    }
  }

  /**
   * SVG로 내보내기 (Trim 적용)
   */
  async exportToSVG(filename = 'genogram.svg') {
    try {
      Toast.info('SVG 생성 중...');

      // 바운딩 박스 계산
      const bounds = this._calculateBounds();
      const padding = 15; // ✨ Trim 모드: 최소 패딩
      const width = bounds.width + (padding * 2);
      const height = bounds.height + (padding * 2);
      const offsetX = padding - bounds.minX;
      const offsetY = padding - bounds.minY;

      // SVG 생성 (투명 배경)
      let svg = `<?xml version="1.0" encoding="UTF-8"?>\n`;
      svg += `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">\n`;
      // svg += `  <rect width="${width}" height="${height}" fill="white"/>\n`; // 투명 배경을 위해 주석 처리
      svg += `  <g transform="translate(${offsetX}, ${offsetY})">\n`;

      // 관계선 그리기 - 새로운 메서드 사용
      svg += this._renderRelationshipsToSVGNew();

      // 인물 그리기
      this.canvasState.persons.forEach(person => {
        svg += this._drawPersonToSVG(person);
      });

      svg += `  </g>\n`;
      svg += `</svg>`;

      // 다운로드
      const blob = new Blob([svg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      this._download(url, filename);
      URL.revokeObjectURL(url);

      Toast.success('SVG 내보내기 완료!');
    } catch (error) {
      console.error('SVG 내보내기 오류:', error);
      Toast.error('SVG 내보내기에 실패했습니다');
    }
  }

  /**
   * ✨ 정확한 바운딩 박스 계산 (콘텐츠 기반 Trim)
   */
  _calculateBounds() {
    if (this.canvasState.persons.length === 0) {
      console.warn('⚠️ 내보낼 인물이 없습니다!');
      return { minX: 0, minY: 0, maxX: 800, maxY: 600, width: 800, height: 600 };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    const nodeSize = 60;
    const labelHeight = 25; // 이름 라벨 높이
    const labelMargin = 5;  // 라벨과의 여백

    // 1. 인물 노드의 바운딩 박스 계산
    this.canvasState.persons.forEach(person => {
      // 노드 자체
      minX = Math.min(minX, person.x - nodeSize / 2);
      minY = Math.min(minY, person.y - nodeSize / 2);
      maxX = Math.max(maxX, person.x + nodeSize / 2);
      maxY = Math.max(maxY, person.y + nodeSize / 2);

      // 이름 라벨 (아래쪽)
      const labelY = person.y + nodeSize / 2 + labelMargin;
      maxY = Math.max(maxY, labelY + labelHeight);

      // CT 배지 (위쪽 26px + 여백 6px)
      if (person.isCT) {
        minY = Math.min(minY, person.y - nodeSize / 2 - 26 - 6);
      }
    });

    // 2. 결혼선 (couple connector) 고려
    const marriages = this.canvasState.relationships.filter(r => r.type === 'marriage');
    marriages.forEach(rel => {
      const from = this.canvasState.getPersonById(rel.from);
      const to = this.canvasState.getPersonById(rel.to);
      if (from && to) {
        const coupleLineY = Math.max(from.y, to.y) + nodeSize / 2 + 14; // coupleConnectorLength
        maxY = Math.max(maxY, coupleLineY + 20);
      }
    });

    console.log('📐 Trim된 바운딩 박스:', { 
      minX, 
      minY, 
      maxX, 
      maxY, 
      width: maxX - minX, 
      height: maxY - minY,
      persons: this.canvasState.persons.length 
    });

    return {
      minX,
      minY,
      maxX,
      maxY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  /**
   * 인물 그리기
   */
  _drawPerson(ctx, person, scale = 1) {
    const x = person.x;
    const y = person.y;
    const size = 60; // GenogramRenderer의 nodeSize와 동일

    // AppState에서 설정 가져오기
    let lineWidth = 2;
    let showNames = true;
    let showAges = true;
    let showDeathDates = true;
    
    if (typeof window !== 'undefined' && window.__appState) {
      lineWidth = window.__appState.get('settings.lineWidth') || 2;
      showNames = window.__appState.get('settings.showNames');
      showAges = window.__appState.get('settings.showAges');
      showDeathDates = window.__appState.get('settings.showDeathDates');
    }

    // 도형 그리기
    ctx.strokeStyle = '#000000';
    ctx.fillStyle = '#ffffff';
    ctx.lineWidth = lineWidth;

    if (person.gender === 'male') {
      // 사각형
      ctx.fillRect(x - size/2, y - size/2, size, size);
      ctx.strokeRect(x - size/2, y - size/2, size, size);
      // CT 이중선
      if (person.isCT) {
        ctx.save();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = lineWidth;
        const o = 4;
        ctx.strokeRect(x - size/2 + o, y - size/2 + o, size - o*2, size - o*2);
        ctx.restore();
      }
    } else if (person.gender === 'female') {
      // 원
      ctx.beginPath();
      ctx.arc(x, y, size/2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // CT 이중선
      if (person.isCT) {
        ctx.save();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        ctx.arc(x, y, size/2 - 4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    } else {
      // 마름모
      ctx.beginPath();
      ctx.moveTo(x, y - size/2);
      ctx.lineTo(x + size/2, y);
      ctx.lineTo(x, y + size/2);
      ctx.lineTo(x - size/2, y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // CT 이중선
      if (person.isCT) {
        ctx.save();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = lineWidth;
        const ih = size/2 - 4;
        ctx.beginPath();
        ctx.moveTo(x, y - ih);
        ctx.lineTo(x + ih, y);
        ctx.lineTo(x, y + ih);
        ctx.lineTo(x - ih, y);
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
      }
    }

    // 사망 표시 (도형 꼭짓점에 정확히 맞춤, 여백 없음)
    if (person.isDeceased && showDeathDates) {
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      
      if (person.gender === 'female') {
        // 원형: 원 위의 45도 지점을 정확히 연결
        const radius = size / 2;
        const cos45 = Math.cos(Math.PI / 4);
        const sin45 = Math.sin(Math.PI / 4);
        
        ctx.moveTo(x - radius * cos45, y - radius * sin45);
        ctx.lineTo(x + radius * cos45, y + radius * sin45);
        ctx.moveTo(x + radius * cos45, y - radius * sin45);
        ctx.lineTo(x - radius * cos45, y + radius * sin45);
      } else if (person.gender === 'male') {
        // 사각형: 정확히 모서리에서 모서리로
        ctx.moveTo(x - size/2, y - size/2);
        ctx.lineTo(x + size/2, y + size/2);
        ctx.moveTo(x + size/2, y - size/2);
        ctx.lineTo(x - size/2, y + size/2);
      } else {
        // 다이아몬드: X자 형태 (마름모 내부에 맞게)
        const diagonal = size / 4;
        ctx.moveTo(x - diagonal, y - diagonal);
        ctx.lineTo(x + diagonal, y + diagonal);
        ctx.moveTo(x + diagonal, y - diagonal);
        ctx.lineTo(x - diagonal, y + diagonal);
      }
      
      ctx.stroke();
    }

    // 이름 (badge/label 스타일)
    if (showNames) {
      const nameY = y + size/2 + 5;
      
      // 텍스트 크기 측정
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const textMetrics = ctx.measureText(person.name);
      const textWidth = textMetrics.width;
      
      // 배지 크기 계산
      const paddingX = 8;
      const paddingY = 4;
      const badgeWidth = textWidth + paddingX * 2;
      const badgeHeight = 20;
      const badgeX = x - badgeWidth / 2;
      const badgeY = nameY;
      const borderRadius = 10;
      
      // 배지 배경 그리기 (둥근 모서리)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)'; // 반투명 검정
      ctx.beginPath();
      ctx.moveTo(badgeX + borderRadius, badgeY);
      ctx.lineTo(badgeX + badgeWidth - borderRadius, badgeY);
      ctx.arcTo(badgeX + badgeWidth, badgeY, badgeX + badgeWidth, badgeY + borderRadius, borderRadius);
      ctx.lineTo(badgeX + badgeWidth, badgeY + badgeHeight - borderRadius);
      ctx.arcTo(badgeX + badgeWidth, badgeY + badgeHeight, badgeX + badgeWidth - borderRadius, badgeY + badgeHeight, borderRadius);
      ctx.lineTo(badgeX + borderRadius, badgeY + badgeHeight);
      ctx.arcTo(badgeX, badgeY + badgeHeight, badgeX, badgeY + badgeHeight - borderRadius, borderRadius);
      ctx.lineTo(badgeX, badgeY + borderRadius);
      ctx.arcTo(badgeX, badgeY, badgeX + borderRadius, badgeY, borderRadius);
      ctx.closePath();
      ctx.fill();
      
      // 텍스트 그리기
      ctx.fillStyle = '#ffffff'; // 흰색 텍스트
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(person.name, x, badgeY + badgeHeight / 2);
    }

    // 나이 (인물 노트 중심에)
    if (showAges) {
      const age = person.getAge();
      if (age !== null) {
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${age}`, x, y);
      }
    }

    // CT 배지 (도형 위쪽 빨간 배지)
    if (person.isCT) {
      ctx.save();
      const ctLabel = 'CT';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const ctTw = ctx.measureText(ctLabel).width;
      const ctBw = ctTw + 16, ctBh = 20, ctBr = 10;
      const ctBx = x - ctBw / 2;
      const ctBy = y - size/2 - ctBh - 6;
      // 빨간 배경
      ctx.fillStyle = 'rgba(220,38,38,0.9)';
      ctx.beginPath();
      ctx.moveTo(ctBx + ctBr, ctBy);
      ctx.lineTo(ctBx + ctBw - ctBr, ctBy);
      ctx.arcTo(ctBx + ctBw, ctBy, ctBx + ctBw, ctBy + ctBr, ctBr);
      ctx.lineTo(ctBx + ctBw, ctBy + ctBh - ctBr);
      ctx.arcTo(ctBx + ctBw, ctBy + ctBh, ctBx + ctBw - ctBr, ctBy + ctBh, ctBr);
      ctx.lineTo(ctBx + ctBr, ctBy + ctBh);
      ctx.arcTo(ctBx, ctBy + ctBh, ctBx, ctBy + ctBh - ctBr, ctBr);
      ctx.lineTo(ctBx, ctBy + ctBr);
      ctx.arcTo(ctBx, ctBy, ctBx + ctBr, ctBy, ctBr);
      ctx.closePath();
      ctx.fill();
      // 흰 텍스트
      ctx.fillStyle = '#ffffff';
      ctx.textBaseline = 'middle';
      ctx.fillText(ctLabel, x, ctBy + ctBh / 2);
      ctx.restore();
    }
  }

  /**
   * 다운로드
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
   * SVG로 관계선 렌더링
   */
  _renderRelationshipsToSVG() {
    let svg = '';
    const lineWidth = window.__appState?.get('settings.lineWidth') || 2;

    this.canvasState.relationships.forEach(rel => {
      const from = this.canvasState.getPersonById(rel.from);
      const to = this.canvasState.getPersonById(rel.to);
      if (!from || !to) return;

      const nodeSize = 60;
      const halfSize = nodeSize / 2;

      if (rel.type === 'marriage') {
        // 결혼선
        const x1 = from.x + (from.gender === 'male' ? halfSize : -halfSize);
        const y1 = from.y;
        const x2 = to.x + (to.gender === 'female' ? -halfSize : halfSize);
        const y2 = to.y;
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;
        const connectorY = Math.max(from.y, to.y) + halfSize + 14;

        svg += `    <line x1="${x1}" y1="${y1}" x2="${midX}" y2="${midY}" stroke="black" stroke-width="${lineWidth}"/>
`;
        svg += `    <line x1="${x2}" y1="${y2}" x2="${midX}" y2="${midY}" stroke="black" stroke-width="${lineWidth}"/>
`;
        svg += `    <line x1="${midX}" y1="${midY}" x2="${midX}" y2="${connectorY}" stroke="black" stroke-width="${lineWidth}"/>
`;
      } else if (rel.type === 'parent') {
        // 부모-자녀 관계선
        svg += `    <line x1="${from.x}" y1="${from.y + halfSize}" x2="${to.x}" y2="${to.y - halfSize}" stroke="black" stroke-width="${lineWidth}"/>
`;
      }
    });

    return svg;
  }

  /**
   * SVG로 인물 그리기
   */
  _drawPersonToSVG(person) {
    const x = person.x;
    const y = person.y;
    const size = 60;
    const halfSize = size / 2;
    const lineWidth = window.__appState?.get('settings.lineWidth') || 2;
    const showNames = window.__appState?.get('settings.showNames') !== false;
    const showAges = window.__appState?.get('settings.showAges') !== false;
    const showDeathDates = window.__appState?.get('settings.showDeathDates') !== false;

    let svg = '';

    // 도형 그리기
    if (person.gender === 'male') {
      svg += `    <rect x="${x - halfSize}" y="${y - halfSize}" width="${size}" height="${size}" fill="white" stroke="black" stroke-width="${lineWidth}"/>
`;
      if (person.isCT) {
        const o = 4;
        svg += `    <rect x="${x - halfSize + o}" y="${y - halfSize + o}" width="${size - o*2}" height="${size - o*2}" fill="none" stroke="black" stroke-width="${lineWidth}"/>
`;
      }
    } else if (person.gender === 'female') {
      svg += `    <circle cx="${x}" cy="${y}" r="${halfSize}" fill="white" stroke="black" stroke-width="${lineWidth}"/>
`;
      if (person.isCT) {
        svg += `    <circle cx="${x}" cy="${y}" r="${halfSize - 4}" fill="none" stroke="black" stroke-width="${lineWidth}"/>
`;
      }
    } else {
      svg += `    <polygon points="${x},${y - halfSize} ${x + halfSize},${y} ${x},${y + halfSize} ${x - halfSize},${y}" fill="white" stroke="black" stroke-width="${lineWidth}"/>
`;
      if (person.isCT) {
        const ih = halfSize - 4;
        svg += `    <polygon points="${x},${y - ih} ${x + ih},${y} ${x},${y + ih} ${x - ih},${y}" fill="none" stroke="black" stroke-width="${lineWidth}"/>
`;
      }
    }

    // 사망 표시
    if (person.isDeceased && showDeathDates) {
      if (person.gender === 'female') {
        const radius = halfSize;
        const cos45 = Math.cos(Math.PI / 4);
        const sin45 = Math.sin(Math.PI / 4);
        svg += `    <line x1="${x - radius * cos45}" y1="${y - radius * sin45}" x2="${x + radius * cos45}" y2="${y + radius * sin45}" stroke="black" stroke-width="${lineWidth}"/>
`;
        svg += `    <line x1="${x + radius * cos45}" y1="${y - radius * sin45}" x2="${x - radius * cos45}" y2="${y + radius * sin45}" stroke="black" stroke-width="${lineWidth}"/>
`;
      } else if (person.gender === 'male') {
        svg += `    <line x1="${x - halfSize}" y1="${y - halfSize}" x2="${x + halfSize}" y2="${y + halfSize}" stroke="black" stroke-width="${lineWidth}"/>
`;
        svg += `    <line x1="${x + halfSize}" y1="${y - halfSize}" x2="${x - halfSize}" y2="${y + halfSize}" stroke="black" stroke-width="${lineWidth}"/>
`;
      } else {
        const diagonal = halfSize / 2;
        svg += `    <line x1="${x - diagonal}" y1="${y - diagonal}" x2="${x + diagonal}" y2="${y + diagonal}" stroke="black" stroke-width="${lineWidth}"/>
`;
        svg += `    <line x1="${x + diagonal}" y1="${y - diagonal}" x2="${x - diagonal}" y2="${y + diagonal}" stroke="black" stroke-width="${lineWidth}"/>
`;
      }
    }

    // 이름 (badge 스타일)
    if (showNames) {
      const nameY = y + halfSize + 5;
      const textLength = person.name.length * 8; // 근사치
      const paddingX = 8;
      const badgeWidth = textLength + paddingX * 2;
      const badgeHeight = 20;
      const badgeX = x - badgeWidth / 2;
      const badgeY = nameY;
      const borderRadius = 10;

      svg += `    <rect x="${badgeX}" y="${badgeY}" width="${badgeWidth}" height="${badgeHeight}" rx="${borderRadius}" fill="rgba(0,0,0,0.75)"/>
`;
      svg += `    <text x="${x}" y="${badgeY + badgeHeight / 2}" text-anchor="middle" dominant-baseline="middle" fill="white" font-family="sans-serif" font-size="13" font-weight="bold">${person.name}</text>
`;
    }

    // 나이
    if (showAges) {
      const age = person.getAge();
      if (age !== null) {
        svg += `    <text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" fill="black" font-family="sans-serif" font-size="16" font-weight="bold">${age}</text>
`;
      }
    }

    // CT 배지 (도형 위쪽 빨간 배지)
    if (person.isCT) {
      const ctLabel = 'CT';
      const ctTw = ctLabel.length * 8; // 근사치
      const ctBw = ctTw + 16, ctBh = 20, ctBr = 10;
      const ctBx = x - ctBw / 2;
      const ctBy = y - halfSize - ctBh - 6;
      svg += `    <rect x="${ctBx}" y="${ctBy}" width="${ctBw}" height="${ctBh}" rx="${ctBr}" fill="rgba(220,38,38,0.9)"/>
`;
      svg += `    <text x="${x}" y="${ctBy + ctBh / 2}" text-anchor="middle" dominant-baseline="middle" fill="white" font-family="sans-serif" font-size="13" font-weight="bold">${ctLabel}</text>
`;
    }

    return svg;
  }

  /**
   * SVG로 관계선 렌더링 (개선됨)
   */
  _renderRelationshipsToSVGNew() {
    let svg = '';
    const lineWidth = window.__appState?.get('settings.lineWidth') || 2;
    const nodeSize = 60;
    const coupleConnectorLength = 14;

    // 1. 결혼 관계
    const marriages = this.canvasState.relationships.filter(r => r.type === 'marriage');
    marriages.forEach(rel => {
      const from = this.canvasState.getPersonById(rel.from);
      const to = this.canvasState.getPersonById(rel.to);
      if (!from || !to) return;

      const coupleLineY = Math.max(from.y, to.y) + nodeSize / 2 + coupleConnectorLength;
      [from, to].forEach(person => {
        const bottomY = person.y + nodeSize / 2;
        svg += `    <line x1="${person.x}" y1="${bottomY}" x2="${person.x}" y2="${coupleLineY}" stroke="black" stroke-width="${lineWidth}"/>\n`;
      });

      const subtype = rel.subtype || 'married';
      let strokeDasharray = '';
      if (subtype === 'engaged') strokeDasharray = ' stroke-dasharray="5,5"';
      else if (subtype === 'cohabiting') strokeDasharray = ' stroke-dasharray="3,3,1,3"';

      svg += `    <line x1="${from.x}" y1="${coupleLineY}" x2="${to.x}" y2="${coupleLineY}" stroke="black" stroke-width="${lineWidth}"${strokeDasharray}/>\n`;

      const midX = (from.x + to.x) / 2;
      if (subtype === 'separated' || subtype === 'widowed') {
        svg += `    <line x1="${midX - 5}" y1="${coupleLineY - 8}" x2="${midX + 5}" y2="${coupleLineY + 8}" stroke="black" stroke-width="${lineWidth}"/>\n`;
      } else if (subtype === 'divorced') {
        svg += `    <line x1="${midX - 7.5}" y1="${coupleLineY - 8}" x2="${midX - 2.5}" y2="${coupleLineY + 8}" stroke="black" stroke-width="${lineWidth}"/>\n`;
        svg += `    <line x1="${midX + 2.5}" y1="${coupleLineY - 8}" x2="${midX + 7.5}" y2="${coupleLineY + 8}" stroke="black" stroke-width="${lineWidth}"/>\n`;
      }
    });

    // 2. 부모-자녀 그룹화
    const parentChildRels = this.canvasState.relationships.filter(r => ['biological', 'adopted', 'foster'].includes(r.type));
    const childToParentsMap = new Map();
    parentChildRels.forEach(rel => {
      const parent = this.canvasState.getPersonById(rel.from);
      const child = this.canvasState.getPersonById(rel.to);
      if (!parent || !child) return;

      const isParentAbove = parent.y < child.y;
      const actualParent = isParentAbove ? parent : child;
      const actualChild = isParentAbove ? child : parent;

      if (!childToParentsMap.has(actualChild.id)) {
        childToParentsMap.set(actualChild.id, { child: actualChild, parents: [], type: rel.type });
      }
      const entry = childToParentsMap.get(actualChild.id);
      if (!entry.parents.find(p => p.id === actualParent.id)) {
        entry.parents.push(actualParent);
      }
    });

    const siblingGroups = new Map();
    childToParentsMap.forEach((entry) => {
      const parentsKey = entry.parents.map(p => p.id).sort().join('-');
      if (!siblingGroups.has(parentsKey)) {
        siblingGroups.set(parentsKey, { parents: entry.parents, children: [], type: entry.type });
      }
      siblingGroups.get(parentsKey).children.push(entry.child);
    });

    siblingGroups.forEach(group => {
      if (group.parents.length > 0 && group.children.length > 0) {
        svg += renderParentChildGroupToSVG(group.parents, group.children, group.type, lineWidth, nodeSize, coupleConnectorLength);
      }
    });

    // 3. 감정선
    const showEmotionalLines = window.__appState?.get('settings.showEmotionalLines') !== false;
    if (showEmotionalLines) {
      const emotionalRels = this.canvasState.relationships.filter(r => r.type === 'emotional');
      emotionalRels.forEach(rel => {
        const from = this.canvasState.getPersonById(rel.from);
        const to = this.canvasState.getPersonById(rel.to);
        if (!from || !to) return;
        svg += renderEmotionalToSVG(from, to, rel.subtype || 'close', lineWidth, nodeSize);
      });
    }

    return svg;
  }
}
