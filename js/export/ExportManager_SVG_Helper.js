/**
 * SVG 내보내기 헬퍼 함수들
 */

/**
 * 부모-자녀 그룹을 SVG로 렌더링
 */
export function renderParentChildGroupToSVG(parents, children, type, lineWidth, nodeSize, coupleConnectorLength) {
  if (!parents || parents.length === 0 || !children || children.length === 0) return '';

  let svg = '';
  
  // 타입에 따른 선 스타일
  let strokeDasharray = '';
  if (type === 'adopted') {
    strokeDasharray = ' stroke-dasharray="5,5"';
  } else if (type === 'foster') {
    strokeDasharray = ' stroke-dasharray="3,3"';
  }

  // 1. 부모 결혼선 Y 좌표
  const coupleLineY = Math.max(...parents.map(p => p.y + nodeSize / 2)) + coupleConnectorLength;
  
  // 2. 부모 중심 X
  const parentCenterX = parents.reduce((sum, p) => sum + p.x, 0) / parents.length;
  
  // 3. 자녀 중심 X와 최상단 Y
  const childrenCenterX = children.reduce((sum, c) => sum + c.x, 0) / children.length;
  const childrenTopY = Math.min(...children.map(c => c.y)) - nodeSize / 2;
  
  // 4. 형제 spine Y 좌표
  const spineY = coupleLineY + (childrenTopY - coupleLineY) * 0.6;

  // 5. 부모 중심에서 spine까지 수직선
  svg += `    <line x1="${parentCenterX}" y1="${coupleLineY}" x2="${parentCenterX}" y2="${spineY}" stroke="black" stroke-width="${lineWidth}"${strokeDasharray}/>\n`;

  // 6. 부모 중심에서 자녀 중심까지 수평선
  if (Math.abs(parentCenterX - childrenCenterX) > 5) {
    svg += `    <line x1="${parentCenterX}" y1="${spineY}" x2="${childrenCenterX}" y2="${spineY}" stroke="black" stroke-width="${lineWidth}"${strokeDasharray}/>\n`;
  }

  // 7. 형제 spine
  if (children.length > 1) {
    const minX = Math.min(...children.map(c => c.x));
    const maxX = Math.max(...children.map(c => c.x));
    svg += `    <line x1="${minX}" y1="${spineY}" x2="${maxX}" y2="${spineY}" stroke="black" stroke-width="${lineWidth}"${strokeDasharray}/>\n`;
  }

  // 8. 각 자녀로 수직선
  children.forEach(child => {
    svg += `    <line x1="${child.x}" y1="${spineY}" x2="${child.x}" y2="${child.y - nodeSize / 2}" stroke="black" stroke-width="${lineWidth}"${strokeDasharray}/>\n`;
  });

  return svg;
}

/**
 * 감정선을 SVG로 렌더링
 */
export function renderEmotionalToSVG(from, to, subtype, lineWidth, nodeSize) {
  const radius = nodeSize / 2;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const angle = Math.atan2(dy, dx);
  
  // 인물 테두리에서의 시작/종료점
  const startX = from.x + radius * Math.cos(angle);
  const startY = from.y + radius * Math.sin(angle);
  const endX = to.x - radius * Math.cos(angle);
  const endY = to.y - radius * Math.sin(angle);

  let svg = '';

  switch (subtype) {
    case 'harmony':
      // 녹색 실선
      svg += `    <line x1="${startX}" y1="${startY}" x2="${endX}" y2="${endY}" stroke="#22c55e" stroke-width="${lineWidth}"/>\n`;
      break;

    case 'close':
    case 'veryClose':
      // 녹색 선 2개 (평행)
      const perpX = -Math.sin(angle);
      const perpY = Math.cos(angle);
      const offset = 2;
      const dasharray = subtype === 'close' ? ' stroke-dasharray="5,3"' : '';
      
      svg += `    <line x1="${startX + perpX * offset}" y1="${startY + perpY * offset}" x2="${endX + perpX * offset}" y2="${endY + perpY * offset}" stroke="#22c55e" stroke-width="${lineWidth}"${dasharray}/>\n`;
      svg += `    <line x1="${startX - perpX * offset}" y1="${startY - perpY * offset}" x2="${endX - perpX * offset}" y2="${endY - perpY * offset}" stroke="#22c55e" stroke-width="${lineWidth}"${dasharray}/>\n`;
      break;

    case 'love':
      // 녹색 실선 + 중앙 원
      svg += `    <line x1="${startX}" y1="${startY}" x2="${endX}" y2="${endY}" stroke="#22c55e" stroke-width="${lineWidth}"/>\n`;
      const midX = (startX + endX) / 2;
      const midY = (startY + endY) / 2;
      svg += `    <circle cx="${midX}" cy="${midY}" r="4" fill="#22c55e"/>\n`;
      break;

    case 'fused':
      // 빨간색 실선 3개
      const perpX2 = -Math.sin(angle);
      const perpY2 = Math.cos(angle);
      const offset2 = 3;
      
      svg += `    <line x1="${startX}" y1="${startY}" x2="${endX}" y2="${endY}" stroke="#ef4444" stroke-width="${lineWidth}"/>\n`;
      svg += `    <line x1="${startX + perpX2 * offset2}" y1="${startY + perpY2 * offset2}" x2="${endX + perpX2 * offset2}" y2="${endY + perpY2 * offset2}" stroke="#ef4444" stroke-width="${lineWidth}"/>\n`;
      svg += `    <line x1="${startX - perpX2 * offset2}" y1="${startY - perpY2 * offset2}" x2="${endX - perpX2 * offset2}" y2="${endY - perpY2 * offset2}" stroke="#ef4444" stroke-width="${lineWidth}"/>\n`;
      break;

    case 'distant':
    case 'none':
      // 회색 점선
      svg += `    <line x1="${startX}" y1="${startY}" x2="${endX}" y2="${endY}" stroke="#9ca3af" stroke-width="${lineWidth}" stroke-dasharray="5,5"/>\n`;
      break;

    case 'cutoff':
      // 점선 + 수직 바 2개
      svg += `    <line x1="${startX}" y1="${startY}" x2="${endX}" y2="${endY}" stroke="#9ca3af" stroke-width="${lineWidth}" stroke-dasharray="5,5"/>\n`;
      const midX2 = (startX + endX) / 2;
      const midY2 = (startY + endY) / 2;
      const perpAngle = angle + Math.PI / 2;
      const barLength = 8;
      
      svg += `    <line x1="${midX2 - 4 * Math.cos(angle) - barLength * Math.cos(perpAngle)}" y1="${midY2 - 4 * Math.sin(angle) - barLength * Math.sin(perpAngle)}" x2="${midX2 - 4 * Math.cos(angle) + barLength * Math.cos(perpAngle)}" y2="${midY2 - 4 * Math.sin(angle) + barLength * Math.sin(perpAngle)}" stroke="#9ca3af" stroke-width="${lineWidth}"/>\n`;
      svg += `    <line x1="${midX2 + 4 * Math.cos(angle) - barLength * Math.cos(perpAngle)}" y1="${midY2 + 4 * Math.sin(angle) - barLength * Math.sin(perpAngle)}" x2="${midX2 + 4 * Math.cos(angle) + barLength * Math.cos(perpAngle)}" y2="${midY2 + 4 * Math.sin(angle) + barLength * Math.sin(perpAngle)}" stroke="#9ca3af" stroke-width="${lineWidth}"/>\n`;
      break;

    case 'conflict':
    case 'discord':
      // 빨간색 점선 2개
      const perpX3 = -Math.sin(angle);
      const perpY3 = Math.cos(angle);
      const offset3 = 2;
      
      svg += `    <line x1="${startX + perpX3 * offset3}" y1="${startY + perpY3 * offset3}" x2="${endX + perpX3 * offset3}" y2="${endY + perpY3 * offset3}" stroke="#ef4444" stroke-width="${lineWidth}" stroke-dasharray="5,3"/>\n`;
      svg += `    <line x1="${startX - perpX3 * offset3}" y1="${startY - perpY3 * offset3}" x2="${endX - perpX3 * offset3}" y2="${endY - perpY3 * offset3}" stroke="#ef4444" stroke-width="${lineWidth}" stroke-dasharray="5,3"/>\n`;
      break;

    case 'hostile':
      // 빨간색 지그재그 (균형있게 시작과 끝)
      const length = Math.sqrt(dx * dx + dy * dy);
      const zigzagHeight = 6;
      const segmentWidth = 12;
      const numSegments = Math.floor(length / segmentWidth);
      const perpX4 = -Math.sin(angle);
      const perpY4 = Math.cos(angle);
      
      let path = `M ${startX} ${startY}`;
      
      for (let i = 0; i < numSegments; i++) {
        const t = (i + 0.5) / numSegments;
        const baseX = startX + dx * t;
        const baseY = startY + dy * t;
        const offset4 = (i % 2 === 0) ? -zigzagHeight : zigzagHeight;
        const pointX = baseX + perpX4 * offset4;
        const pointY = baseY + perpY4 * offset4;
        
        path += ` L ${pointX} ${pointY}`;
      }
      
      path += ` L ${endX} ${endY}`;
      
      svg += `    <path d="${path}" stroke="#ef4444" stroke-width="${lineWidth}" fill="none"/>\n`;
      break;

    case 'abuse':
      // 파란색 실선 + 화살표
      svg += `    <line x1="${startX}" y1="${startY}" x2="${endX}" y2="${endY}" stroke="#1e3a8a" stroke-width="${lineWidth}"/>\n`;
      const arrowLength = 15;
      const arrowWidth = 10;
      const arrowPoints = [
        `${endX},${endY}`,
        `${endX - arrowLength * Math.cos(angle) - arrowWidth * Math.sin(angle)},${endY - arrowLength * Math.sin(angle) + arrowWidth * Math.cos(angle)}`,
        `${endX - arrowLength * Math.cos(angle) + arrowWidth * Math.sin(angle)},${endY - arrowLength * Math.sin(angle) - arrowWidth * Math.cos(angle)}`
      ].join(' ');
      svg += `    <polygon points="${arrowPoints}" fill="#1e3a8a"/>\n`;
      break;

    default:
      svg += `    <line x1="${startX}" y1="${startY}" x2="${endX}" y2="${endY}" stroke="black" stroke-width="${lineWidth}"/>\n`;
  }

  return svg;
}
