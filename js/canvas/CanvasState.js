/**
 * CanvasState - 캔버스 상태 관리
 */

import { Person } from './Person.js';
import { Relationship } from './Relationship.js';
import { eventBus } from '../core/EventBus.js';

export class CanvasState {
  constructor() {
    this.persons = [];
    this.relationships = [];
    this.selectedPersons = [];
    this.selectedRelationships = [];
    this.zoom = 1.0;
    this.pan = { x: 0, y: 0 };
    this.tool = 'select';
  }

  // ===== Person 관리 =====

  /**
   * 인물 추가
   * @param {Person} person - 인물
   */
  addPerson(person) {
    if (!(person instanceof Person)) {
      person = new Person(person);
    }
    this.persons.push(person);
    eventBus.emit('person:added', person);
  }

  /**
   * 인물 제거
   * @param {string} id - 인물 ID
   */
  removePerson(id) {
    const index = this.persons.findIndex(p => p.id === id);
    if (index > -1) {
      const person = this.persons[index];
      this.persons.splice(index, 1);

      // 관련 관계도 제거
      this.relationships = this.relationships.filter(r => 
        !r.involves(id)
      );

      // 선택 해제
      this.deselectPerson(id);

      eventBus.emit('person:removed', { id, person });
    }
  }

  /**
   * 인물 업데이트
   * @param {string} id - 인물 ID
   * @param {Object} data - 업데이트할 데이터
   */
  updatePerson(id, data) {
    const person = this.getPersonById(id);
    if (person) {
      Object.assign(person, data);
      eventBus.emit('person:updated', person);
    }
  }

  /**
   * ID로 인물 찾기
   * @param {string} id - 인물 ID
   * @returns {Person|null} 인물
   */
  getPersonById(id) {
    return this.persons.find(p => p.id === id) || null;
  }

  /**
   * 좌표로 인물 찾기
   * @param {number} x - X 좌표
   * @param {number} y - Y 좌표
   * @param {number} [threshold=30] - 거리 임계값
   * @returns {Person|null} 인물
   */
  getPersonAt(x, y, threshold = 30) {
    for (let i = this.persons.length - 1; i >= 0; i--) {
      const person = this.persons[i];
      const dx = person.x - x;
      const dy = person.y - y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= threshold) {
        return person;
      }
    }
    return null;
  }

  // ===== Relationship 관리 =====

  /**
   * 관계 추가
   * @param {Relationship} relationship - 관계
   */
  addRelationship(relationship) {
    if (!(relationship instanceof Relationship)) {
      relationship = new Relationship(relationship);
    }

    // 유효성 검사
    const validation = relationship.validate();
    if (!validation.valid) {
      console.error('Invalid relationship:', validation.errors);
      return false;
    }

    // 중복 확인
    const exists = this.relationships.some(r => 
      r.connects(relationship.from, relationship.to) &&
      r.type === relationship.type
    );

    if (exists) {
      console.warn('Relationship already exists');
      return false;
    }

    this.relationships.push(relationship);
    eventBus.emit('relationship:added', relationship);
    return true;
  }

  /**
   * 관계 선택
   * @param {string} id - 관계 ID
   */
  selectRelationship(id) {
    if (!this.selectedRelationships.includes(id)) {
      this.selectedRelationships.push(id);
      eventBus.emit('selection:changed', this.selectedRelationships);
    }
  }

  /**
   * 관계 선택 해제
   * @param {string} id - 관계 ID
   */
  deselectRelationship(id) {
    const index = this.selectedRelationships.indexOf(id);
    if (index > -1) {
      this.selectedRelationships.splice(index, 1);
      eventBus.emit('selection:changed', this.selectedRelationships);
    }
  }

  /**
   * 관계 제거
   * @param {string} id - 관계 ID
   */
  removeRelationship(id) {
    const index = this.relationships.findIndex(r => r.id === id);
    if (index > -1) {
      const relationship = this.relationships[index];
      this.relationships.splice(index, 1);
      this.deselectRelationship(id);
      eventBus.emit('relationship:removed', { id, relationship });
    }
  }

  /**
   * 관계 업데이트
   * @param {string} id - 관계 ID
   * @param {Object} data - 업데이트할 데이터
   */
  updateRelationship(id, data) {
    const relationship = this.getRelationshipById(id);
    if (relationship) {
      Object.assign(relationship, data);
      eventBus.emit('relationship:updated', relationship);
    }
  }

  /**
   * ID로 관계 찾기
   * @param {string} id - 관계 ID
   * @returns {Relationship|null} 관계
   */
  getRelationshipById(id) {
    return this.relationships.find(r => r.id === id) || null;
  }

  /**
   * 특정 인물의 모든 관계 가져오기
   * @param {string} personId - 인물 ID
   * @returns {Relationship[]} 관계 목록
   */
  getRelationshipsForPerson(personId) {
    return this.relationships.filter(r => r.involves(personId));
  }

  /**
   * 좌표로 관계선 찾기
   * @param {number} x - X 좌표
   * @param {number} y - Y 좌표
   * @param {number} [threshold=10] - 거리 임계값
   * @returns {Relationship|null} 관계
   */
  getRelationshipAt(x, y, threshold = 10) {
    for (let i = this.relationships.length - 1; i >= 0; i--) {
      const rel = this.relationships[i];
      const from = this.getPersonById(rel.from);
      const to = this.getPersonById(rel.to);

      if (!from || !to) continue;

      // 선분과의 거리 계산
      const distance = this._pointToLineDistance(x, y, from.x, from.y, to.x, to.y);
      
      // 선분 범위 내에 있는지 확인
      const isWithinSegment = this._isPointNearSegment(x, y, from.x, from.y, to.x, to.y, threshold);
      
      if (distance <= threshold && isWithinSegment) {
        return rel;
      }
    }
    return null;
  }

  /**
   * 점과 선분 사이의 거리 계산
   * @private
   */
  _pointToLineDistance(px, py, x1, y1, x2, y2) {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;

    if (lenSq !== 0) {
      param = dot / lenSq;
    }

    let xx, yy;

    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    const dx = px - xx;
    const dy = py - yy;

    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * 점이 선분 근처에 있는지 확인
   * @private
   */
  _isPointNearSegment(px, py, x1, y1, x2, y2, threshold) {
    const minX = Math.min(x1, x2) - threshold;
    const maxX = Math.max(x1, x2) + threshold;
    const minY = Math.min(y1, y2) - threshold;
    const maxY = Math.max(y1, y2) + threshold;

    return px >= minX && px <= maxX && py >= minY && py <= maxY;
  }

  // ===== 선택 관리 =====

  /**
   * 인물 선택
   * @param {string} id - 인물 ID
   */
  selectPerson(id) {
    if (!this.selectedPersons.includes(id)) {
      this.selectedPersons.push(id);
      eventBus.emit('selection:changed', this.selectedPersons);
    }
  }

  /**
   * 인물 선택 해제
   * @param {string} id - 인물 ID
   */
  deselectPerson(id) {
    const index = this.selectedPersons.indexOf(id);
    if (index > -1) {
      this.selectedPersons.splice(index, 1);
      eventBus.emit('selection:changed', this.selectedPersons);
    }
  }

  /**
   * 인물 선택 토글
   * @param {string} id - 인물 ID
   */
  togglePersonSelection(id) {
    if (this.selectedPersons.includes(id)) {
      this.deselectPerson(id);
    } else {
      this.selectPerson(id);
    }
  }

  /**
   * 모든 선택 해제
   */
  clearSelection() {
    this.selectedPersons = [];
    this.selectedRelationships = [];
    eventBus.emit('selection:changed', []);
  }

  /**
   * 선택된 인물들 가져오기
   * @returns {Person[]} 선택된 인물 목록
   */
  getSelectedPersons() {
    return this.selectedPersons
      .map(id => this.getPersonById(id))
      .filter(p => p !== null);
  }

  // ===== 뷰 관리 =====

  /**
   * 줌 설정
   * @param {number} zoom - 줌 레벨 (0.1 ~ 5.0)
   */
  setZoom(zoom) {
    this.zoom = Math.max(0.1, Math.min(5.0, zoom));
    eventBus.emit('view:zoom', this.zoom);
  }

  /**
   * 팬 설정
   * @param {number} x - X 좌표
   * @param {number} y - Y 좌표
   */
  setPan(x, y) {
    this.pan = { x, y };
    eventBus.emit('view:pan', this.pan);
  }

  /**
   * 도구 설정
   * @param {string} tool - 도구 이름
   */
  setTool(tool) {
    this.tool = tool;
    eventBus.emit('tool:changed', tool);
  }

  // ===== 데이터 관리 =====

  /**
   * 모든 데이터 클리어
   */
  clear() {
    this.persons = [];
    this.relationships = [];
    this.selectedPersons = [];
    this.selectedRelationships = [];
    this.zoom = 1.0;
    this.pan = { x: 0, y: 0 };
    eventBus.emit('canvas:cleared');
  }

  /**
   * JSON으로 변환
   * @returns {Object} JSON 객체
   */
  toJSON() {
    return {
      persons: this.persons.map(p => p.toJSON()),
      relationships: this.relationships.map(r => r.toJSON()),
      zoom: this.zoom,
      pan: this.pan
    };
  }

  /**
   * JSON에서 로드
   * @param {Object} data - JSON 데이터
   */
  fromJSON(data) {
    this.clear();

    if (data.persons) {
      data.persons.forEach(p => {
        this.addPerson(Person.fromJSON(p));
      });
    }

    if (data.relationships) {
      data.relationships.forEach(r => {
        this.addRelationship(Relationship.fromJSON(r));
      });
    }

    if (data.zoom) this.zoom = data.zoom;
    if (data.pan) this.pan = data.pan;

    eventBus.emit('canvas:loaded', data);
  }

  /**
   * 통계 정보
   * @returns {Object} 통계
   */
  getStats() {
    return {
      personCount: this.persons.length,
      relationshipCount: this.relationships.length,
      maleCount: this.persons.filter(p => p.gender === 'male').length,
      femaleCount: this.persons.filter(p => p.gender === 'female').length,
      aliveCount: this.persons.filter(p => p.isAlive()).length,
      deceasedCount: this.persons.filter(p => !p.isAlive()).length
    };
  }

  // ===== 가족 관계 헬퍼 메서드 =====

  /**
   * 부모 가져오기
   * @param {string} personId - 인물 ID
   * @returns {Person[]} 부모 목록
   */
  getParents(personId) {
    const parentRels = this.relationships.filter(r => 
      r.type === 'biological' && r.to === personId
    );
    return parentRels
      .map(r => this.getPersonById(r.from))
      .filter(p => p !== null);
  }

  /**
   * 자녀 가져오기
   * @param {string} personId - 인물 ID
   * @returns {Person[]} 자녀 목록
   */
  getChildren(personId) {
    const childRels = this.relationships.filter(r => 
      r.type === 'biological' && r.from === personId
    );
    return childRels
      .map(r => this.getPersonById(r.to))
      .filter(p => p !== null);
  }

  /**
   * 배우자 가져오기
   * @param {string} personId - 인물 ID
   * @returns {Person[]} 배우자 목록
   */
  getSpouses(personId) {
    const spouseRels = this.relationships.filter(r => 
      r.type === 'marriage' && (r.from === personId || r.to === personId)
    );
    return spouseRels
      .map(r => {
        const spouseId = r.from === personId ? r.to : r.from;
        return this.getPersonById(spouseId);
      })
      .filter(p => p !== null);
  }

  /**
   * 형제자매 가져오기
   * @param {string} personId - 인물 ID
   * @returns {Person[]} 형제자매 목록
   */
  getSiblings(personId) {
    // 부모를 공유하는 사람들 찾기
    const parents = this.getParents(personId);
    if (parents.length === 0) return [];

    const siblings = new Set();
    parents.forEach(parent => {
      const children = this.getChildren(parent.id);
      children.forEach(child => {
        if (child.id !== personId) {
          siblings.add(child);
        }
      });
    });

    return Array.from(siblings);
  }
}
