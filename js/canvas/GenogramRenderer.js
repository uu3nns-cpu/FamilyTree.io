/**
 * GenogramRenderer - Genogram 표준에 따른 관계선 렌더링
 * McGoldrick-Gerson 표준 적용 (2020 4th Edition 기준)
 * 최적화 버전 - 실무 중심 감정선만 포함
 *
 * ▸ 수정 이력
 *   2026-06-10  renderParentChildGroup 개선
 *               - 자녀 1명일 때 꺾은 선 없이 직선으로 연결
 *               - 부모가 1명(배우자 없음)일 때도 직선으로 연결
 *               - parentCenterX ↔ childrenCenterX 수평 이동을 spineY 가 아닌
 *                 coupleLineY ~ childTopY 중간 지점에서 처리하도록 통일
 */

import { EmotionalRenderer } from './renderers/EmotionalRenderer.js';

export class GenogramRenderer {
  constructor(ctx, canvasState) {
    this.ctx = ctx;
    this.canvasState = canvasState;
    this.nodeSize = 60;
    this.coupleConnectorLength = 14; // 결혼선까지의 거리
    this.renderedParentChildRels = new Set(); // 이미 렌더링된 부모-자녀 관계 추적
    
    // 감정선 렌더러 (별도 모듈)
    this.emotionalRenderer = new EmotionalRenderer(ctx, this.nodeSize);
  }

  /**
   * 선 두께 가져오기
   */
  getLineWidth() {
    if (typeof window !== 'undefined' && window.__appState) {
      return window.__appState.get('settings.lineWidth') || 2;
    }
    return 2;
  }

  /**
   * 모든 관계선 렌더링 (타입별로 그룹화)
   */
  renderAllRelationships(relationships) {
    this.renderedParentChildRels.clear();

    // 1. 결혼 관계 먼저 렌더링
    relationships
      .filter(rel => rel.type === 'marriage')
      .forEach(rel => {
        const from = this.canvasState.getPersonById(rel.from);
        const to   = this.canvasState.getPersonById(rel.to);
        if (from && to) {
          const isSelected = this.canvasState.selectedRelationships.includes(rel.id);
          this.renderMarriageRelationship(rel, from, to, isSelected);
        }
      });

    // 2. 부모-자녀 관계를 부부 단위로 그룹화하여 렌더링
    this.renderGroupedParentChildRelationships(relationships);

    // 3. 감정 관계 렌더링
    const showEmotionalLines = typeof window !== 'undefined' && window.__appState
      ? window.__appState.get('settings.showEmotionalLines') !== false
      : true;

    if (showEmotionalLines) {
      relationships
        .filter(rel => rel.type === 'emotional')
        .forEach(rel => {
          const from = this.canvasState.getPersonById(rel.from);
          const to   = this.canvasState.getPersonById(rel.to);
          if (from && to) {
            const isSelected = this.canvasState.selectedRelationships.includes(rel.id);
            this.renderEmotionalRelationship(rel, from, to, isSelected);
          }
        });
    }
  }

  /**
   * 부모-자녀 관계를 부부 단위로 그룹화하여 렌더링
   */
  renderGroupedParentChildRelationships(relationships) {
    const parentChildRels = relationships.filter(rel =>
      ['biological', 'adopted', 'foster'].includes(rel.type)
    );

    // 각 자녀에 대해 부모를 찾아 그룹화
    const childToParentsMap = new Map();

    parentChildRels.forEach(rel => {
      const parent = this.canvasState.getPersonById(rel.from);
      const child  = this.canvasState.getPersonById(rel.to);
      if (!parent || !child) return;

      // Y 좌표로 부모(위) / 자녀(아래) 판별
      const isParentAbove = parent.y < child.y;
      const actualParent  = isParentAbove ? parent : child;
      const actualChild   = isParentAbove ? child  : parent;

      if (!childToParentsMap.has(actualChild.id)) {
        childToParentsMap.set(actualChild.id, {
          child: actualChild,
          parents: [],
          type: rel.type
        });
      }

      const entry = childToParentsMap.get(actualChild.id);
      if (!entry.parents.find(p => p.id === actualParent.id)) {
        entry.parents.push(actualParent);
      }
    });

    // 형제자매 그룹 구성 (같은 부모 집합을 가진 자녀들)
    const siblingGroups = new Map();

    childToParentsMap.forEach((entry) => {
      const parentsKey = entry.parents.map(p => p.id).sort().join('-');

      if (!siblingGroups.has(parentsKey)) {
        siblingGroups.set(parentsKey, {
          parents:  entry.parents,
          children: [],
          type:     entry.type
        });
      }

      siblingGroups.get(parentsKey).children.push(entry.child);
    });

    // 각 그룹 렌더링
    siblingGroups.forEach(group => {
      if (group.parents.length > 0 && group.children.length > 0) {
        this.renderParentChildGroup(group.parents, group.children, group.type, false);
      }
    });
  }

  /**
   * 관계선 렌더링 (단일, 하위 호환용)
   */
  renderRelationship(rel, isSelected = false) {
    const from = this.canvasState.getPersonById(rel.from);
    const to   = this.canvasState.getPersonById(rel.to);
    if (!from || !to) return;

    switch (rel.type) {
      case 'marriage':
        this.renderMarriageRelationship(rel, from, to, isSelected);
        break;
      case 'biological':
      case 'adopted':
      case 'foster':
        if (!this.renderedParentChildRels.has(rel.id)) {
          this.renderParentChildRelationship(rel, from, to, isSelected);
          this.renderedParentChildRels.add(rel.id);
        }
        break;
      case 'emotional':
        this.renderEmotionalRelationship(rel, from, to, isSelected);
        break;
      default:
        this.drawBasicLine(from, to, isSelected);
    }
  }

  /**
   * 결혼선 Y 좌표 계산
   * 부부 중 가장 아래쪽 바닥 + coupleConnectorLength
   */
  calculateCoupleLineY(parents) {
    if (!parents || parents.length === 0) return 0;
    const bottomY = Math.max(...parents.map(p => p.y + this.nodeSize / 2));
    return bottomY + this.coupleConnectorLength;
  }

  /**
   * 결혼 관계선 렌더링
   */
  renderMarriageRelationship(rel, from, to, isSelected) {
    const subtype   = rel.subtype || 'married';
    const lineWidth = this.getLineWidth();

    this.ctx.strokeStyle = isSelected ? '#3b82f6' : '#000000';
    this.ctx.lineWidth   = lineWidth;

    const coupleLineY = this.calculateCoupleLineY([from, to]);

    let dashPattern = [];
    if (subtype === 'engaged')    dashPattern = [5, 5];
    if (subtype === 'cohabiting') dashPattern = [3, 3, 1, 3];

    // 각 사람 → 결혼선 수직 연결
    [from, to].forEach(person => {
      this.ctx.setLineDash([]);
      this.ctx.strokeStyle = isSelected ? '#3b82f6' : '#000000';
      this.ctx.lineWidth   = lineWidth;
      this.ctx.beginPath();
      this.ctx.moveTo(person.x, person.y + this.nodeSize / 2);
      this.ctx.lineTo(person.x, coupleLineY + 0.5);
      this.ctx.stroke();
    });

    // 결혼선 (수평)
    this.ctx.setLineDash(dashPattern);
    this.ctx.strokeStyle = isSelected ? '#3b82f6' : '#000000';
    this.ctx.lineWidth   = lineWidth;
    this.ctx.beginPath();
    this.ctx.moveTo(from.x, coupleLineY);
    this.ctx.lineTo(to.x,   coupleLineY);
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    // 별거 / 이혼 표시
    const midX = (from.x + to.x) / 2;
    if (subtype === 'separated') this.drawSeparationSlash(midX, coupleLineY, 1);
    if (subtype === 'divorced')  this.drawSeparationSlash(midX, coupleLineY, 2);
    if (subtype === 'widowed')   this.drawSeparationSlash(midX, coupleLineY, 1);
  }

  /**
   * 별거/이혼 사선
   */
  drawSeparationSlash(x, y, count) {
    const lineWidth = this.getLineWidth();
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth   = lineWidth;
    this.ctx.setLineDash([]);

    for (let i = 0; i < count; i++) {
      const offset = count > 1 ? (i - 0.5) * 5 : 0;
      this.ctx.beginPath();
      this.ctx.moveTo(x + offset - 5, y - 8);
      this.ctx.lineTo(x + offset + 5, y + 8);
      this.ctx.stroke();
    }
  }

  /**
   * 부모-자녀 관계선 렌더링 (단일, 하위 호환용)
   */
  renderParentChildRelationship(rel, from, to, isSelected) {
    const parent = from.y < to.y ? from : to;
    const child  = from.y < to.y ? to   : from;
    this.renderParentChildGroup([parent], [child], rel.type, isSelected);
  }

  /**
   * 부모-자녀 관계 그룹 렌더링
   *
   * ▸ 수정 핵심 (2026-06-10)
   *
   *   [케이스 A] 자녀가 1명 — 직선 내려오기
   *     부모 중심(parentCenterX) 에서 자녀 상단까지 꺾임 없이 직선.
   *     단, parentCenterX ≠ child.x 이면 수평 이동이 필요하므로
   *     중간 Y(midY) 에서 한 번만 꺾는다.
   *
   *   [케이스 B] 자녀가 2명 이상 — 기존 spine 방식
   *     spineY 에서 수평 spine 을 그리고 각 자녀로 수직선.
   *
   *   [공통]
   *     부모가 1명(배우자 없음)이면 coupleLineY = 부모 바닥 + connectorLength.
   *     부모가 2명(부부)이면 coupleLineY = 결혼선 Y (이미 부부 사이에 그려진 선).
   */
  renderParentChildGroup(parents, children, type = 'biological', isSelected = false) {
    if (!parents?.length || !children?.length) return;

    const lineWidth = this.getLineWidth();
    const dash = type === 'adopted' ? [5, 5]
               : type === 'foster'  ? [3, 3]
               : [];

    this.ctx.strokeStyle = isSelected ? '#3b82f6' : '#000000';
    this.ctx.lineWidth   = lineWidth;
    this.ctx.setLineDash(dash);

    // ── 좌표 기준값 계산 ────────────────────────────────────────────────
    const coupleLineY    = this.calculateCoupleLineY(parents);
    const parentCenterX  = parents.reduce((s, p) => s + p.x, 0) / parents.length;
    const childrenTopY   = Math.min(...children.map(c => c.y - this.nodeSize / 2));

    // ── 케이스 분기 ──────────────────────────────────────────────────────
    if (children.length === 1) {
      // ── 케이스 A: 자녀 1명 ──────────────────────────────────────────
      const child  = children[0];
      const childX = child.x;
      const childTopY = child.y - this.nodeSize / 2;

      if (Math.abs(parentCenterX - childX) <= 2) {
        // 부모 중심과 자녀 X 가 같으면 완전 직선
        this.ctx.beginPath();
        this.ctx.moveTo(parentCenterX, coupleLineY + 0.5);
        this.ctx.lineTo(parentCenterX, childTopY);
        this.ctx.stroke();
      } else {
        // X 가 다르면 중간 Y 에서 한 번만 수평 이동
        const midY = coupleLineY + (childTopY - coupleLineY) * 0.5;

        // 부모 중심 → 중간 Y (수직)
        this.ctx.beginPath();
        this.ctx.moveTo(parentCenterX, coupleLineY + 0.5);
        this.ctx.lineTo(parentCenterX, midY);
        this.ctx.stroke();

        // 중간 Y 수평 이동
        this.ctx.beginPath();
        this.ctx.moveTo(parentCenterX, midY);
        this.ctx.lineTo(childX, midY);
        this.ctx.stroke();

        // 자녀 X → 자녀 상단 (수직)
        this.ctx.beginPath();
        this.ctx.moveTo(childX, midY);
        this.ctx.lineTo(childX, childTopY);
        this.ctx.stroke();
      }

    } else {
      // ── 케이스 B: 자녀 2명 이상 — spine 방식 ────────────────────────
      const childrenCenterX = children.reduce((s, c) => s + c.x, 0) / children.length;
      const spineY = coupleLineY + (childrenTopY - coupleLineY) * 0.6;

      // 부모 중심 → spineY (수직)
      this.ctx.beginPath();
      this.ctx.moveTo(parentCenterX, coupleLineY + 0.5);
      this.ctx.lineTo(parentCenterX, spineY);
      this.ctx.stroke();

      // 부모 중심 → 자녀 중심 수평 이동 (필요한 경우)
      if (Math.abs(parentCenterX - childrenCenterX) > 2) {
        this.ctx.beginPath();
        this.ctx.moveTo(parentCenterX,   spineY);
        this.ctx.lineTo(childrenCenterX, spineY);
        this.ctx.stroke();
      }

      // 형제 spine (자녀 전체 너비)
      const minX = Math.min(...children.map(c => c.x));
      const maxX = Math.max(...children.map(c => c.x));
      this.ctx.beginPath();
      this.ctx.moveTo(minX, spineY);
      this.ctx.lineTo(maxX, spineY);
      this.ctx.stroke();

      // 각 자녀 → 자녀 상단 (수직)
      children.forEach(child => {
        this.ctx.beginPath();
        this.ctx.moveTo(child.x, spineY - 0.5);
        this.ctx.lineTo(child.x, child.y - this.nodeSize / 2);
        this.ctx.stroke();
      });
    }

    this.ctx.setLineDash([]);
  }

  /**
   * 감정 관계선 렌더링
   */
  renderEmotionalRelationship(rel, from, to, isSelected) {
    const subtype        = rel.subtype || rel.status || 'close';
    const migratedSubtype = this.emotionalRenderer.migrateSubtype(subtype);
    this.emotionalRenderer.render(from, to, migratedSubtype, isSelected, this.getLineWidth());
  }

  /**
   * 기본 실선
   */
  drawBasicLine(from, to, isSelected) {
    const lineWidth = this.getLineWidth();
    this.ctx.strokeStyle = isSelected ? '#3b82f6' : '#333333';
    this.ctx.lineWidth   = isSelected ? lineWidth + 1 : lineWidth;
    this.ctx.setLineDash([]);
    this.ctx.beginPath();
    this.ctx.moveTo(from.x, from.y);
    this.ctx.lineTo(to.x,   to.y);
    this.ctx.stroke();
  }
}
