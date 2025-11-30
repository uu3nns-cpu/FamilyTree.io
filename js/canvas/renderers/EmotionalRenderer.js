/**
 * EmotionalRenderer - 감정선 렌더링 전용 모듈
 * McGoldrick-Gerson 표준 준수 (2020 4th Edition)
 * 실무 중심 최적화 버전 (2025)
 */

export class EmotionalRenderer {
  constructor(ctx, nodeSize) {
    this.ctx = ctx;
    this.nodeSize = nodeSize;
  }

  /**
   * 별칭 처리 및 마이그레이션
   */
  migrateSubtype(subtype) {
    const migrations = {
      'harmony': 'close',
      'veryClose': 'close',
      'discord': 'conflict',
      'abuse': 'abuse-physical',
      'none': null
    };
    return migrations[subtype] || subtype;
  }

  /**
   * 메인 렌더링 함수
   */
  render(from, to, subtype, isSelected, lineWidth) {
    // 감정선 설정 가져오기
    const emotionalLineWidth = typeof window !== 'undefined' && window.__appState 
      ? window.__appState.get('settings.emotionalLineWidth') || 2
      : 2;
    const emotionalOpacity = typeof window !== 'undefined' && window.__appState 
      ? window.__appState.get('settings.emotionalOpacity') || 1
      : 1;

    // 투명도 적용
    this.ctx.globalAlpha = emotionalOpacity;

    // 선택된 경우 파란색 오버레이
    if (isSelected) {
      this.ctx.strokeStyle = '#3b82f6';
      this.ctx.lineWidth = emotionalLineWidth + 1;
      this.ctx.setLineDash([]);
      this.ctx.beginPath();
      this.ctx.moveTo(from.x, from.y);
      this.ctx.lineTo(to.x, to.y);
      this.ctx.stroke();
    }

    // 인물 테두리에서 시작/종료하도록 좌표 계산
    const edgePoints = this.calculateEdgePoints(from, to);

    // 타입별 렌더링 (감정선 두께 사용)
    switch (subtype) {
      // 긍정적 관계
      case 'close':
        this.drawClose(edgePoints.start, edgePoints.end, emotionalLineWidth);
        break;
      case 'love':
        this.drawLove(edgePoints.start, edgePoints.end, emotionalLineWidth);
        break;
      
      // 거리감/단절
      case 'distant':
        this.drawDistant(edgePoints.start, edgePoints.end, emotionalLineWidth);
        break;
      case 'cutoff':
        this.drawCutoff(edgePoints.start, edgePoints.end, emotionalLineWidth);
        break;
      
      // 부정적 관계
      case 'conflict':
        this.drawConflict(edgePoints.start, edgePoints.end, emotionalLineWidth);
        break;
      case 'hostile':
        this.drawHostile(edgePoints.start, edgePoints.end, emotionalLineWidth);
        break;
      
      // 복합 관계
      case 'fused':
        this.drawFused(edgePoints.start, edgePoints.end, emotionalLineWidth);
        break;
      
      // 학대 (세분화)
      case 'abuse-physical':
        this.drawAbusePhysical(edgePoints.start, edgePoints.end, emotionalLineWidth);
        break;
      case 'abuse-emotional':
        this.drawAbuseEmotional(edgePoints.start, edgePoints.end, emotionalLineWidth);
        break;
      case 'abuse-sexual':
        this.drawAbuseSexual(edgePoints.start, edgePoints.end, emotionalLineWidth);
        break;
      case 'neglect':
        this.drawNeglect(edgePoints.start, edgePoints.end, emotionalLineWidth);
        break;
      
      default:
        this.drawBasicLine(from, to, isSelected, lineWidth);
    }

    // 투명도 초기화
    this.ctx.globalAlpha = 1;
  }

  /**
   * 인물 테두리에서의 시작/종료 지점 계산
   */
  calculateEdgePoints(from, to) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const angle = Math.atan2(dy, dx);
    const radius = this.nodeSize / 2;

    const startX = from.x + radius * Math.cos(angle);
    const startY = from.y + radius * Math.sin(angle);
    const endX = to.x - radius * Math.cos(angle);
    const endY = to.y - radius * Math.sin(angle);

    return {
      start: { x: startX, y: startY },
      end: { x: endX, y: endY }
    };
  }

  /**
   * Close (친밀한 관계) - 녹색 이중 실선 (선에 평행)
   * 점선 대신 실선 사용 (사용자 요청)
   */
  drawClose(from, to, lineWidth = 2) {
    this.ctx.strokeStyle = '#22c55e';
    this.ctx.lineWidth = lineWidth;
    this.ctx.setLineDash([]);

    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const angle = Math.atan2(dy, dx);
    const perpX = -Math.sin(angle);
    const perpY = Math.cos(angle);
    const offset = 2;

    // 첫 번째 선 (위쪽)
    this.ctx.beginPath();
    this.ctx.moveTo(from.x + perpX * offset, from.y + perpY * offset);
    this.ctx.lineTo(to.x + perpX * offset, to.y + perpY * offset);
    this.ctx.stroke();

    // 두 번째 선 (아래쪽)
    this.ctx.beginPath();
    this.ctx.moveTo(from.x - perpX * offset, from.y - perpY * offset);
    this.ctx.lineTo(to.x - perpX * offset, to.y - perpY * offset);
    this.ctx.stroke();
  }

  /**
   * Love (사랑) - 녹색 실선 + 중앙 원
   */
  drawLove(from, to, lineWidth = 2) {
    this.ctx.strokeStyle = '#22c55e';
    this.ctx.lineWidth = lineWidth;
    this.ctx.setLineDash([]);

    // 선 그리기
    this.ctx.beginPath();
    this.ctx.moveTo(from.x, from.y);
    this.ctx.lineTo(to.x, to.y);
    this.ctx.stroke();

    // 중앙에 작은 원
    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2;

    this.ctx.fillStyle = '#22c55e';
    this.ctx.beginPath();
    this.ctx.arc(midX, midY, 4, 0, Math.PI * 2);
    this.ctx.fill();
  }

  /**
   * Distant (거리감) - 회색 점선
   */
  drawDistant(from, to, lineWidth = 2) {
    this.ctx.strokeStyle = '#9ca3af';
    this.ctx.lineWidth = lineWidth;
    this.ctx.setLineDash([5, 5]);

    this.ctx.beginPath();
    this.ctx.moveTo(from.x, from.y);
    this.ctx.lineTo(to.x, to.y);
    this.ctx.stroke();

    this.ctx.setLineDash([]);
  }

  /**
   * Cutoff (단절) - 회색 점선 + 중앙에 수직 바 2개
   */
  drawCutoff(from, to, lineWidth = 2) {
    // 점선
    this.ctx.strokeStyle = '#9ca3af';
    this.ctx.lineWidth = lineWidth;
    this.ctx.setLineDash([5, 5]);

    this.ctx.beginPath();
    this.ctx.moveTo(from.x, from.y);
    this.ctx.lineTo(to.x, to.y);
    this.ctx.stroke();

    this.ctx.setLineDash([]);

    // 중앙 지점
    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2;

    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const angle = Math.atan2(dy, dx);
    const perpAngle = angle + Math.PI / 2;
    const barLength = 8;

    this.ctx.strokeStyle = '#9ca3af';
    this.ctx.lineWidth = lineWidth;

    // 왼쪽 바
    this.ctx.beginPath();
    this.ctx.moveTo(
      midX - 4 * Math.cos(angle) - barLength * Math.cos(perpAngle),
      midY - 4 * Math.sin(angle) - barLength * Math.sin(perpAngle)
    );
    this.ctx.lineTo(
      midX - 4 * Math.cos(angle) + barLength * Math.cos(perpAngle),
      midY - 4 * Math.sin(angle) + barLength * Math.sin(perpAngle)
    );
    this.ctx.stroke();

    // 오른쪽 바
    this.ctx.beginPath();
    this.ctx.moveTo(
      midX + 4 * Math.cos(angle) - barLength * Math.cos(perpAngle),
      midY + 4 * Math.sin(angle) - barLength * Math.sin(perpAngle)
    );
    this.ctx.lineTo(
      midX + 4 * Math.cos(angle) + barLength * Math.cos(perpAngle),
      midY + 4 * Math.sin(angle) - barLength * Math.sin(perpAngle)
    );
    this.ctx.stroke();
  }

  /**
   * Conflict (갈등) - 빨간색 이중 실선 (선에 평행)
   * 점선 대신 실선 사용 (사용자 요청)
   */
  drawConflict(from, to, lineWidth = 2) {
    this.ctx.strokeStyle = '#ef4444';
    this.ctx.lineWidth = lineWidth;
    this.ctx.setLineDash([]);

    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const angle = Math.atan2(dy, dx);
    const perpX = -Math.sin(angle);
    const perpY = Math.cos(angle);
    const offset = 2;

    // 첫 번째 선 (위쪽)
    this.ctx.beginPath();
    this.ctx.moveTo(from.x + perpX * offset, from.y + perpY * offset);
    this.ctx.lineTo(to.x + perpX * offset, to.y + perpY * offset);
    this.ctx.stroke();

    // 두 번째 선 (아래쪽)
    this.ctx.beginPath();
    this.ctx.moveTo(from.x - perpX * offset, from.y - perpY * offset);
    this.ctx.lineTo(to.x - perpX * offset, to.y - perpY * offset);
    this.ctx.stroke();
  }

  /**
   * Hostile (적대적) - 빨간색 지그재그 (균형있게 시작과 끝)
   */
  drawHostile(from, to, lineWidth = 2) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    const zigzagHeight = 6;
    const segmentWidth = 12; // 각 지그재그 폭
    const numSegments = Math.floor(length / segmentWidth);
    const actualSegmentWidth = length / numSegments;

    const perpX = -Math.sin(angle);
    const perpY = Math.cos(angle);

    this.ctx.strokeStyle = '#ef4444';
    this.ctx.lineWidth = lineWidth;
    this.ctx.setLineDash([]);

    this.ctx.beginPath();
    this.ctx.moveTo(from.x, from.y);

    // 중간 지점들을 규칙적으로 배치
    for (let i = 0; i < numSegments; i++) {
      const t = (i + 0.5) / numSegments;
      const baseX = from.x + dx * t;
      const baseY = from.y + dy * t;
      const offset = (i % 2 === 0) ? -zigzagHeight : zigzagHeight;
      const pointX = baseX + perpX * offset;
      const pointY = baseY + perpY * offset;

      this.ctx.lineTo(pointX, pointY);
    }

    this.ctx.lineTo(to.x, to.y);
    this.ctx.stroke();
  }

  /**
   * Fused (융합) - 빨간색 삼중 실선
   */
  drawFused(from, to, lineWidth = 2) {
    this.ctx.strokeStyle = '#ef4444';
    this.ctx.lineWidth = lineWidth;
    this.ctx.setLineDash([]);

    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const angle = Math.atan2(dy, dx);
    const perpX = -Math.sin(angle);
    const perpY = Math.cos(angle);
    const offset = 3;

    // 중앙선
    this.ctx.beginPath();
    this.ctx.moveTo(from.x, from.y);
    this.ctx.lineTo(to.x, to.y);
    this.ctx.stroke();

    // 위 선
    this.ctx.beginPath();
    this.ctx.moveTo(from.x + perpX * offset, from.y + perpY * offset);
    this.ctx.lineTo(to.x + perpX * offset, to.y + perpY * offset);
    this.ctx.stroke();

    // 아래 선
    this.ctx.beginPath();
    this.ctx.moveTo(from.x - perpX * offset, from.y - perpY * offset);
    this.ctx.lineTo(to.x - perpX * offset, to.y - perpY * offset);
    this.ctx.stroke();
  }

  /**
   * 화살표 그리기 헬퍼 함수
   */
  drawArrow(from, to, color) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const angle = Math.atan2(dy, dx);
    const arrowLength = 15;
    const arrowWidth = 10;

    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.moveTo(to.x, to.y);
    this.ctx.lineTo(
      to.x - arrowLength * Math.cos(angle) - arrowWidth * Math.sin(angle),
      to.y - arrowLength * Math.sin(angle) + arrowWidth * Math.cos(angle)
    );
    this.ctx.lineTo(
      to.x - arrowLength * Math.cos(angle) + arrowWidth * Math.sin(angle),
      to.y - arrowLength * Math.sin(angle) - arrowWidth * Math.cos(angle)
    );
    this.ctx.closePath();
    this.ctx.fill();
  }

  /**
   * Physical Abuse (신체적 학대) - 검정 실선 + 검정 화살표
   */
  drawAbusePhysical(from, to, lineWidth = 2) {
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = lineWidth;
    this.ctx.setLineDash([]);

    this.ctx.beginPath();
    this.ctx.moveTo(from.x, from.y);
    this.ctx.lineTo(to.x, to.y);
    this.ctx.stroke();

    this.drawArrow(from, to, '#000000');
  }

  /**
   * Emotional Abuse (정서적 학대) - 파란 실선 + 파란 화살표
   */
  drawAbuseEmotional(from, to, lineWidth = 2) {
    this.ctx.strokeStyle = '#1e3a8a';
    this.ctx.lineWidth = lineWidth;
    this.ctx.setLineDash([]);

    this.ctx.beginPath();
    this.ctx.moveTo(from.x, from.y);
    this.ctx.lineTo(to.x, to.y);
    this.ctx.stroke();

    this.drawArrow(from, to, '#1e3a8a');
  }

  /**
   * Sexual Abuse (성적 학대) - 빨간 이중선 + 빨간 화살표
   */
  drawAbuseSexual(from, to, lineWidth = 2) {
    this.ctx.strokeStyle = '#dc2626';
    this.ctx.lineWidth = lineWidth;
    this.ctx.setLineDash([]);

    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const angle = Math.atan2(dy, dx);
    const perpX = -Math.sin(angle);
    const perpY = Math.cos(angle);
    const offset = 2;

    // 첫 번째 선
    this.ctx.beginPath();
    this.ctx.moveTo(from.x + perpX * offset, from.y + perpY * offset);
    this.ctx.lineTo(to.x + perpX * offset, to.y + perpY * offset);
    this.ctx.stroke();

    // 두 번째 선
    this.ctx.beginPath();
    this.ctx.moveTo(from.x - perpX * offset, from.y - perpY * offset);
    this.ctx.lineTo(to.x - perpX * offset, to.y - perpY * offset);
    this.ctx.stroke();

    this.drawArrow(from, to, '#dc2626');
  }

  /**
   * Neglect (방임) - 회색 점선 + 회색 화살표
   */
  drawNeglect(from, to, lineWidth = 2) {
    this.ctx.strokeStyle = '#6b7280';
    this.ctx.lineWidth = lineWidth;
    this.ctx.setLineDash([5, 5]);

    this.ctx.beginPath();
    this.ctx.moveTo(from.x, from.y);
    this.ctx.lineTo(to.x, to.y);
    this.ctx.stroke();

    this.ctx.setLineDash([]);
    this.drawArrow(from, to, '#6b7280');
  }

  /**
   * 기본 실선
   */
  drawBasicLine(from, to, isSelected, lineWidth) {
    this.ctx.strokeStyle = isSelected ? '#3b82f6' : '#333333';
    this.ctx.lineWidth = isSelected ? lineWidth + 1 : lineWidth;
    this.ctx.setLineDash([]);

    this.ctx.beginPath();
    this.ctx.moveTo(from.x, from.y);
    this.ctx.lineTo(to.x, to.y);
    this.ctx.stroke();
  }
}
