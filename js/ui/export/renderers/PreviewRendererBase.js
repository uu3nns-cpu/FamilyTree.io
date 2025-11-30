/**
 * PreviewRendererBase - 미리보기 렌더링 공통 베이스 클래스
 * 
 * 책임:
 * - 바운딩 박스 계산
 * - 인물 그리기 (도형, 사망 표시, 이름, 나이)
 * - 캔버스 설정
 */

export class PreviewRendererBase {
  constructor(canvasState) {
    this.canvasState = canvasState;
    this.nodeSize = 60;
  }

  /**
   * 바운딩 박스 계산
   */
  calculateBounds() {
    if (this.canvasState.persons.length === 0) {
      console.warn('⚠️ 내보낼 인물이 없습니다!');
      return { minX: 0, minY: 0, maxX: 800, maxY: 600, width: 800, height: 600 };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    const nodeSize = this.nodeSize;
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
   * 캔버스 설정
   */
  setupCanvas(canvas, displayWidth, displayHeight, pixelRatio = 2) {
    canvas.width = displayWidth * pixelRatio;
    canvas.height = displayHeight * pixelRatio;
    canvas.style.width = '100%';
    canvas.style.height = 'auto';

    const ctx = canvas.getContext('2d');
    ctx.scale(pixelRatio, pixelRatio);

    // 배경
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, displayWidth, displayHeight);

    return ctx;
  }

  /**
   * 변환 행렬 설정 (중앙 정렬 + 스케일)
   */
  setupTransform(ctx, bounds, displayWidth, displayHeight, padding = 40) {
    // 스케일 계산 (여백 포함)
    const scaleX = (displayWidth - padding * 2) / bounds.width;
    const scaleY = (displayHeight - padding * 2) / bounds.height;
    const contentScale = Math.min(scaleX, scaleY, 1);

    // 중앙 정렬
    const offsetX = (displayWidth - bounds.width * contentScale) / 2;
    const offsetY = (displayHeight - bounds.height * contentScale) / 2;

    ctx.save();
    ctx.translate(offsetX - bounds.minX * contentScale, offsetY - bounds.minY * contentScale);
    ctx.scale(contentScale, contentScale);

    return contentScale;
  }

  /**
   * 인물 그리기
   */
  drawPerson(ctx, person, options = {}) {
    const {
      showNames = true,
      showAges = true,
      showDeathDates = true,
      lineWidth = 2
    } = options;

    const x = person.x;
    const y = person.y;
    const size = this.nodeSize;

    // 도형 그리기
    this._drawShape(ctx, person, lineWidth);

    // CT 표시
    if (person.isCT) {
      this._drawCTMarker(ctx, person, lineWidth);
    }

    // 사망 표시
    if (person.isDeceased && showDeathDates) {
      this._drawDeathMarker(ctx, person, lineWidth);
    }

    // 이름
    if (showNames) {
      this._drawNameBadge(ctx, person);
    }

    // 나이
    if (showAges) {
      this._drawAge(ctx, person);
    }
  }

  /**
   * 도형 그리기 (성별에 따라)
   */
  _drawShape(ctx, person, lineWidth) {
    const x = person.x;
    const y = person.y;
    const size = this.nodeSize;

    ctx.strokeStyle = '#000000';
    ctx.fillStyle = '#ffffff';
    ctx.lineWidth = lineWidth;

    if (person.gender === 'male') {
      // 사각형
      ctx.fillRect(x - size/2, y - size/2, size, size);
      ctx.strokeRect(x - size/2, y - size/2, size, size);
    } else if (person.gender === 'female') {
      // 원
      ctx.beginPath();
      ctx.arc(x, y, size/2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
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
    }
  }

  /**
   * CT(내담자) 마커 그리기
   */
  _drawCTMarker(ctx, person, lineWidth) {
    const x = person.x;
    const y = person.y;
    const size = this.nodeSize;
    const offset = 4;

    ctx.save();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = lineWidth;

    if (person.gender === 'male') {
      ctx.strokeRect(
        x - size/2 + offset,
        y - size/2 + offset,
        size - offset * 2,
        size - offset * 2
      );
    } else if (person.gender === 'female') {
      ctx.beginPath();
      ctx.arc(x, y, size/2 - offset, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      const innerHalfSize = size/2 - offset;
      ctx.beginPath();
      ctx.moveTo(x, y - innerHalfSize);
      ctx.lineTo(x + innerHalfSize, y);
      ctx.lineTo(x, y + innerHalfSize);
      ctx.lineTo(x - innerHalfSize, y);
      ctx.closePath();
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * 사망 표시 그리기
   */
  _drawDeathMarker(ctx, person, lineWidth) {
    const x = person.x;
    const y = person.y;
    const size = this.nodeSize;

    ctx.save();
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
      // 마름모: X자 형태
      const diagonal = size / 4;
      ctx.moveTo(x - diagonal, y - diagonal);
      ctx.lineTo(x + diagonal, y + diagonal);
      ctx.moveTo(x + diagonal, y - diagonal);
      ctx.lineTo(x - diagonal, y + diagonal);
    }

    ctx.stroke();
    ctx.restore();
  }

  /**
   * 이름 배지 그리기
   */
  _drawNameBadge(ctx, person) {
    const x = person.x;
    const y = person.y;
    const size = this.nodeSize;
    const nameY = y + size/2 + 5;
    
    // 텍스트 크기 측정
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const textMetrics = ctx.measureText(person.name);
    const textWidth = textMetrics.width;
    
    // 배지 크기 계산
    const paddingX = 6;
    const paddingY = 3;
    const badgeWidth = textWidth + paddingX * 2;
    const badgeHeight = 16;
    const badgeX = x - badgeWidth / 2;
    const badgeY = nameY;
    const borderRadius = 10;
    
    // 배지 배경 그리기 (둥근 모서리)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
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
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(person.name, x, badgeY + badgeHeight / 2);
  }

  /**
   * 나이 그리기
   */
  _drawAge(ctx, person) {
    const age = person.getAge();
    if (age !== null) {
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${age}`, person.x, person.y);
    }
  }

  /**
   * AppState에서 설정 가져오기
   */
  getSettings() {
    if (typeof window !== 'undefined' && window.__appState) {
      return {
        lineWidth: window.__appState.get('settings.lineWidth') || 2,
        showNames: window.__appState.get('settings.showNames') !== false,
        showAges: window.__appState.get('settings.showAges') !== false,
        showDeathDates: window.__appState.get('settings.showDeathDates') !== false
      };
    }
    return {
      lineWidth: 2,
      showNames: true,
      showAges: true,
      showDeathDates: true
    };
  }
}
