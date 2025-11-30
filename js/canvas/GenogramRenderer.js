/**
 * GenogramRenderer - Genogram 표준에 따른 관계선 렌더링
 * McGoldrick-Gerson 표준 적용 (2020 4th Edition 기준)
 * 최적화 버전 - 실무 중심 감정선만 포함
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
    // AppState에서 선 두께 가져오기
    if (typeof window !== 'undefined' && window.__appState) {
      return window.__appState.get('settings.lineWidth') || 2;
    }
    return 2;
  }

  /**
   * 모든 관계선 렌더링 (타입별로 그룹화)
   */
  renderAllRelationships(relationships) {
    this.renderedParentChildRels.clear(); // 초기화

    // 1. 결혼 관계 먼저 렌더링
    relationships
      .filter(rel => rel.type === 'marriage')
      .forEach(rel => {
        const from = this.canvasState.getPersonById(rel.from);
        const to = this.canvasState.getPersonById(rel.to);
        if (from && to) {
          const isSelected = this.canvasState.selectedRelationships.includes(rel.id);
          this.renderMarriageRelationship(rel, from, to, isSelected);
        }
      });

    // 2. 부모-자녀 관계를 부부 단위로 그룹화하여 렌더링
    this.renderGroupedParentChildRelationships(relationships);

    // 3. 감정 관계 렌더링 (설정 확인)
    const showEmotionalLines = typeof window !== 'undefined' && window.__appState 
      ? window.__appState.get('settings.showEmotionalLines') !== false
      : true;
    
    if (showEmotionalLines) {
      relationships
        .filter(rel => rel.type === 'emotional')
        .forEach(rel => {
          const from = this.canvasState.getPersonById(rel.from);
          const to = this.canvasState.getPersonById(rel.to);
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

    // 부부 찾기
    const couples = relationships.filter(rel => rel.type === 'marriage');
    
    // 각 자녀에 대해 부모를 찾아 그룹화
    const childToParentsMap = new Map(); // childId -> [parent1, parent2]

    parentChildRels.forEach(rel => {
      const parent = this.canvasState.getPersonById(rel.from);
      const child = this.canvasState.getPersonById(rel.to);

      if (!parent || !child) return;

      // 부모가 위에 있는지 확인
      const isParentAbove = parent.y < child.y;
      const actualParent = isParentAbove ? parent : child;
      const actualChild = isParentAbove ? child : parent;

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

    // 형제자매 그룹 찾기 (같은 부모를 가진 자녀들)
    const siblingGroups = new Map(); // parentsKey -> [children]

    childToParentsMap.forEach((entry, childId) => {
      const parentsKey = entry.parents.map(p => p.id).sort().join('-');
      
      if (!siblingGroups.has(parentsKey)) {
        siblingGroups.set(parentsKey, {
          parents: entry.parents,
          children: [],
          type: entry.type
        });
      }

      siblingGroups.get(parentsKey).children.push(entry.child);
    });

    // 각 형제자매 그룹 렌더링
    siblingGroups.forEach(group => {
      if (group.parents.length > 0 && group.children.length > 0) {
        this.renderParentChildGroup(group.parents, group.children, group.type, false);
      }
    });
  }

  /**
   * 관계선 렌더링 (단일 관계, 하위 호환성을 위해 유지)
   */
  renderRelationship(rel, isSelected = false) {
    const from = this.canvasState.getPersonById(rel.from);
    const to = this.canvasState.getPersonById(rel.to);

    if (!from || !to) return;

    // 타입에 따라 렌더링
    switch (rel.type) {
      case 'marriage':
        this.renderMarriageRelationship(rel, from, to, isSelected);
        break;
      case 'biological':
      case 'adopted':
      case 'foster':
        // 부모-자녀는 그룹화하여 렌더링하므로 개별 렌더링 스킵
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
   */
  calculateCoupleLineY(parents) {
    if (!parents || parents.length === 0) return 0;
    const bottomY = Math.max(...parents.map(p => p.y + this.nodeSize / 2));
    return bottomY + this.coupleConnectorLength;
  }

  /**
   * 결혼 관계선 렌더링 (FamilyTree 방식)
   * 각 사람에서 수직으로 내려와 수평선으로 연결
   */
  renderMarriageRelationship(rel, from, to, isSelected) {
    const subtype = rel.subtype || 'married';
    const lineWidth = this.getLineWidth();

    // 기본 스타일
    this.ctx.strokeStyle = isSelected ? '#3b82f6' : '#000000';
    this.ctx.lineWidth = lineWidth;

    // 결혼선 Y 좌표
    const coupleLineY = this.calculateCoupleLineY([from, to]);

    // 서브타입에 따른 선 스타일
    let dashPattern = [];
    switch (subtype) {
      case 'engaged':
        dashPattern = [5, 5];
        break;
      case 'cohabiting':
        dashPattern = [3, 3, 1, 3];
        break;
      default:
        dashPattern = [];
    }

    // 각 사람에서 결혼선까지 수직 연결선
    [from, to].forEach(person => {
      this.ctx.setLineDash([]);
      this.ctx.strokeStyle = isSelected ? '#3b82f6' : '#000000';
      this.ctx.lineWidth = lineWidth;
      
      const bottomY = person.y + this.nodeSize / 2;
      this.ctx.beginPath();
      this.ctx.moveTo(person.x, bottomY);
      this.ctx.lineTo(person.x, coupleLineY + 0.5);
      this.ctx.stroke();
    });

    // 결혼선 (수평선)
    this.ctx.setLineDash(dashPattern);
    this.ctx.strokeStyle = isSelected ? '#3b82f6' : '#000000';
    this.ctx.lineWidth = lineWidth;
    
    this.ctx.beginPath();
    this.ctx.moveTo(from.x, coupleLineY);
    this.ctx.lineTo(to.x, coupleLineY);
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    // 별거/이혼 표시
    const midX = (from.x + to.x) / 2;
    const midY = coupleLineY;

    if (subtype === 'separated') {
      this.drawSeparationSlash(midX, midY, 1);
    } else if (subtype === 'divorced') {
      this.drawSeparationSlash(midX, midY, 2);
    } else if (subtype === 'widowed') {
      this.drawSeparationSlash(midX, midY, 1);
    }
  }

  /**
   * 별거/이혼 사선 그리기
   */
  drawSeparationSlash(x, y, count) {
    const lineWidth = this.getLineWidth();
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = lineWidth;
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
    let parent, child;
    
    // Y 좌표로 부모(위)와 자녀(아래) 판별
    if (from.y < to.y) {
      parent = from;
      child = to;
    } else {
      parent = to;
      child = from;
    }

    // 단일 부모-자녀를 그룹으로 렌더링
    this.renderParentChildGroup([parent], [child], rel.type, isSelected);
  }

  /**
   * 부모-자녀 관계 그룹 렌더링 (FamilyTree 방식)
   */
  renderParentChildGroup(parents, children, type = 'biological', isSelected = false) {
    if (!parents || parents.length === 0 || !children || children.length === 0) return;

    const lineWidth = this.getLineWidth();

    // 타입에 따른 선 스타일
    let dashPattern = [];
    if (type === 'adopted') {
      dashPattern = [5, 5];
    } else if (type === 'foster') {
      dashPattern = [3, 3];
    }

    this.ctx.strokeStyle = isSelected ? '#3b82f6' : '#000000';
    this.ctx.lineWidth = lineWidth;
    this.ctx.setLineDash(dashPattern);

    const coupleLineY = this.calculateCoupleLineY(parents);
    const parentCenterX = parents.reduce((sum, p) => sum + p.x, 0) / parents.length;
    const childrenCenterX = children.reduce((sum, c) => sum + c.x, 0) / children.length;
    const childrenTopY = Math.min(...children.map(c => c.y)) - this.nodeSize / 2;
    const spineY = coupleLineY + (childrenTopY - coupleLineY) * 0.6;

    // 부모 중심에서 spine까지 수직선
    this.ctx.beginPath();
    this.ctx.moveTo(parentCenterX, coupleLineY + 0.5);
    this.ctx.lineTo(parentCenterX, spineY + 0.5);
    this.ctx.stroke();

    // 부모 중심에서 자녀 중심까지 수평선
    if (Math.abs(parentCenterX - childrenCenterX) > 1) {
      this.ctx.beginPath();
      this.ctx.moveTo(parentCenterX, spineY);
      this.ctx.lineTo(childrenCenterX, spineY);
      this.ctx.stroke();
    }

    // 형제 spine
    if (children.length > 1) {
      const minX = Math.min(...children.map(c => c.x));
      const maxX = Math.max(...children.map(c => c.x));
      this.ctx.beginPath();
      this.ctx.moveTo(minX, spineY);
      this.ctx.lineTo(maxX, spineY);
      this.ctx.stroke();
    }

    // 각 자녀로 수직선
    children.forEach(child => {
      this.ctx.beginPath();
      this.ctx.moveTo(child.x, spineY - 0.5);
      this.ctx.lineTo(child.x, child.y - this.nodeSize / 2);
      this.ctx.stroke();
    });

    this.ctx.setLineDash([]);
  }

  /**
   * 감정 관계선 렌더링 (최적화 버전)
   */
  renderEmotionalRelationship(rel, from, to, isSelected) {
    const subtype = rel.subtype || rel.status || 'close';
    
    // 별칭 처리 (마이그레이션)
    const migratedSubtype = this.emotionalRenderer.migrateSubtype(subtype);
    
    // 감정선 렌더러에 위임
    this.emotionalRenderer.render(from, to, migratedSubtype, isSelected, this.getLineWidth());
  }

  /**
   * 기본 실선 그리기
   */
  drawBasicLine(from, to, isSelected) {
    const lineWidth = this.getLineWidth();
    this.ctx.strokeStyle = isSelected ? '#3b82f6' : '#333333';
    this.ctx.lineWidth = isSelected ? lineWidth + 1 : lineWidth;
    this.ctx.setLineDash([]);

    this.ctx.beginPath();
    this.ctx.moveTo(from.x, from.y);
    this.ctx.lineTo(to.x, to.y);
    this.ctx.stroke();
  }
}
