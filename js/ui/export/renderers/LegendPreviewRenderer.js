/**
 * LegendPreviewRenderer - 감정선 기호 설명 미리보기 렌더러
 * 
 * 책임:
 * - 사용된 감정선 타입의 기호 설명 렌더링
 * - 실제 렌더링 스타일대로 샘플 선 그리기
 * 
 * 스타일: 테이블 형식, 2컬럼 레이아웃
 */

import { PreviewRendererBase } from './PreviewRendererBase.js';

export class LegendPreviewRenderer extends PreviewRendererBase {
  constructor(canvasState) {
    super(canvasState);
    
    // 감정선 타입별 데이터
    this.legendData = {
      'close': { label: '친밀한 관계', color: '#22c55e' },
      'love': { label: '사랑', color: '#22c55e' },
      'distant': { label: '거리감', color: '#9ca3af' },
      'cutoff': { label: '단절', color: '#9ca3af' },
      'conflict': { label: '갈등', color: '#ef4444' },
      'hostile': { label: '적대적', color: '#ef4444' },
      'fused': { label: '융합', color: '#ef4444' },
      'abuse-physical': { label: '신체적 학대', color: '#000000' },
      'abuse-emotional': { label: '정서적 학대', color: '#1e3a8a' },
      'abuse-sexual': { label: '성적 학대', color: '#dc2626' },
      'neglect': { label: '방임', color: '#6b7280' }
    };
  }

  /**
   * 사용된 감정선 타입 찾기
   */
  getUsedSubtypes() {
    const emotionalRels = this.canvasState.relationships.filter(r => r.type === 'emotional');
    return [...new Set(emotionalRels.map(r => r.subtype))];
  }

  /**
   * 감정선 기호 설명 렌더링 (테이블 스타일, 2컬럼)
   */
  render(canvas, options = {}) {
    const usedSubtypes = this.getUsedSubtypes();
    
    if (usedSubtypes.length === 0) {
      console.log('ℹ️ 사용된 감정선이 없습니다');
      return;
    }

    const {
      pixelRatio = 2
    } = options;

    // 캔버스 크기 계산
    const headerHeight = 50;
    const tableHeaderHeight = 35;
    const rowHeight = 40;
    const rowsPerColumn = Math.ceil(usedSubtypes.length / 2);
    const tableHeight = tableHeaderHeight + (rowsPerColumn * rowHeight);
    const padding = 20;
    
    const width = 500;
    const height = headerHeight + tableHeight + padding * 2;

    canvas.width = width * pixelRatio;
    canvas.height = height * pixelRatio;
    canvas.style.width = '100%';
    canvas.style.height = 'auto';
    
    const ctx = canvas.getContext('2d');
    ctx.scale(pixelRatio, pixelRatio);

    // 배경
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // 제목
    this._drawTitle(ctx, width, padding);

    // 테이블 그리기 (2컬럼)
    this._drawTable(ctx, usedSubtypes, padding, headerHeight + padding);

    console.log('✅ 감정선 기호 설명 렌더링 완료 (테이블 스타일)');
  }

  /**
   * 제목 그리기
   */
  _drawTitle(ctx, width, padding) {
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('감정선 기호 설명', width / 2, padding + 20);
  }

  /**
   * 테이블 그리기 (2컬럼)
   */
  _drawTable(ctx, subtypes, padding, startY) {
    const tableWidth = 500 - (padding * 2);
    const columnWidth = tableWidth / 2;
    const tableHeaderHeight = 35;
    const rowHeight = 40;
    const lineColumnWidth = columnWidth / 2;  // 기호와 관계유형 너비를 같게
    const labelColumnWidth = columnWidth / 2; // 기호와 관계유형 너비를 같게

    // 좌측 테이블
    this._drawTableColumn(ctx, subtypes.slice(0, Math.ceil(subtypes.length / 2)), 
                          padding, startY, columnWidth, tableHeaderHeight, rowHeight, 
                          lineColumnWidth, labelColumnWidth);

    // 우측 테이블
    if (subtypes.length > Math.ceil(subtypes.length / 2)) {
      this._drawTableColumn(ctx, subtypes.slice(Math.ceil(subtypes.length / 2)), 
                            padding + columnWidth, startY, columnWidth, tableHeaderHeight, rowHeight, 
                            lineColumnWidth, labelColumnWidth);
    }
  }

  /**
   * 테이블 컬럼 그리기
   */
  _drawTableColumn(ctx, subtypes, x, y, columnWidth, headerHeight, rowHeight, lineColWidth, labelColWidth) {
    // 테이블 헤더 배경
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(x, y, columnWidth, headerHeight);

    // 테이블 헤더 테두리
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, columnWidth, headerHeight);
    ctx.beginPath();
    ctx.moveTo(x + lineColWidth, y);
    ctx.lineTo(x + lineColWidth, y + headerHeight);
    ctx.stroke();

    // 헤더 텍스트
    ctx.fillStyle = '#666666';
    ctx.font = '600 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('기호', x + lineColWidth / 2, y + headerHeight / 2 + 4);
    ctx.fillText('관계 유형', x + lineColWidth + labelColWidth / 2, y + headerHeight / 2 + 4);

    // 각 행 그리기
    subtypes.forEach((subtype, index) => {
      const data = this.legendData[subtype];
      if (!data) return;

      const rowY = y + headerHeight + (index * rowHeight);

      // 행 배경 (교차 색상)
      if (index % 2 === 1) {
        ctx.fillStyle = '#fafafa';
        ctx.fillRect(x, rowY, columnWidth, rowHeight);
      }

      // 행 테두리
      ctx.strokeStyle = '#f0f0f0';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, rowY, columnWidth, rowHeight);
      ctx.beginPath();
      ctx.moveTo(x + lineColWidth, rowY);
      ctx.lineTo(x + lineColWidth, rowY + rowHeight);
      ctx.stroke();

      // 기호 (샘플 선) - 더 길게
      const lineStartX = x + 10;  // 왼쪽 여백 축소
      const lineEndX = x + lineColWidth - 10;  // 오른쪽 여백 축소
      const lineY = rowY + rowHeight / 2;
      this._drawLegendSample(ctx, subtype, lineStartX, lineEndX, lineY, data.color);

      // 라벨 (중앙 정렬)
      ctx.fillStyle = '#000000';
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';  // 중앙 정렬
      ctx.fillText(data.label, x + lineColWidth + labelColWidth / 2, rowY + rowHeight / 2 + 4);
    });

    // 마지막 행 하단 테두리
    const lastRowY = y + headerHeight + (subtypes.length * rowHeight);
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, lastRowY);
    ctx.lineTo(x + columnWidth, lastRowY);
    ctx.stroke();
  }

  /**
   * 샘플 선 그리기 (실제 렌더링 스타일로, 2배 길게)
   */
  _drawLegendSample(ctx, subtype, startX, endX, y, color) {
    const from = { x: startX, y: y };
    const to = { x: endX, y: y };

    ctx.save();

    switch (subtype) {
      case 'close':
      case 'conflict':
        // 이중 실선
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(from.x, from.y - 3);
        ctx.lineTo(to.x, to.y - 3);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(from.x, from.y + 3);
        ctx.lineTo(to.x, to.y + 3);
        ctx.stroke();
        break;

      case 'love':
        // 실선 + 원
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc((from.x + to.x) / 2, from.y, 4, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'distant':
      case 'neglect':
        // 점선
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
        ctx.setLineDash([]);
        if (subtype === 'neglect') {
          this._drawSmallArrow(ctx, to.x, to.y, 0, color);
        }
        break;

      case 'cutoff':
        // 점선 + 수직 바
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
        ctx.setLineDash([]);
        const midX = (from.x + to.x) / 2;
        ctx.beginPath();
        ctx.moveTo(midX - 3, from.y - 8);
        ctx.lineTo(midX - 3, from.y + 8);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(midX + 3, from.y - 8);
        ctx.lineTo(midX + 3, from.y + 8);
        ctx.stroke();
        break;

      case 'hostile':
        // 지그재그 (균형있게 시작과 끝)
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        ctx.beginPath();
        
        const lineLength = to.x - from.x;
        const zigzagHeight = 5;
        const segmentWidth = 10; // 각 지그재그 폭
        const numSegments = Math.floor(lineLength / segmentWidth);
        const actualSegmentWidth = lineLength / numSegments;
        
        ctx.moveTo(from.x, from.y);
        
        for (let i = 0; i < numSegments; i++) {
          const x = from.x + (i + 0.5) * actualSegmentWidth;
          const y = from.y + ((i % 2 === 0) ? -zigzagHeight : zigzagHeight);
          ctx.lineTo(x, y);
        }
        
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
        break;

      case 'fused':
        // 삼중 실선
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(from.x, from.y - 4);
        ctx.lineTo(to.x, to.y - 4);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(from.x, from.y + 4);
        ctx.lineTo(to.x, to.y + 4);
        ctx.stroke();
        break;

      case 'abuse-physical':
      case 'abuse-emotional':
        // 실선 + 화살표
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
        this._drawSmallArrow(ctx, to.x, to.y, 0, color);
        break;

      case 'abuse-sexual':
        // 이중선 + 화살표
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(from.x, from.y - 3);
        ctx.lineTo(to.x, to.y - 3);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(from.x, from.y + 3);
        ctx.lineTo(to.x, to.y + 3);
        ctx.stroke();
        this._drawSmallArrow(ctx, to.x, to.y, 0, color);
        break;

      default:
        // 기본 실선
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * 작은 화살표 그리기
   */
  _drawSmallArrow(ctx, x, y, angle, color) {
    const arrowSize = 7;
    
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-arrowSize, -arrowSize / 2);
    ctx.lineTo(-arrowSize, arrowSize / 2);
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();
  }
}
