/**
 * Relationship - 관계선 데이터 클래스
 */

import { generateId } from '../core/Utils.js';

export class Relationship {
  /**
   * @param {Object} data - 관계 데이터
   */
  constructor(data = {}) {
    this.id = data.id || generateId();
    this.from = data.from; // Person ID
    this.to = data.to;     // Person ID
    this.type = data.type || 'biological'; // marriage, biological, adopted, foster, emotional
    this.subtype = data.subtype || null; // marriage: married, engaged, divorced, separated, widowed, cohabiting
                                          // emotional: close, love, distant, cutoff, conflict, hostile, fused,
                                          //            abuse-physical, abuse-emotional, abuse-sexual, neglect
    this.status = data.status || 'current'; // current, ended
    this.startDate = data.startDate || null;
    this.endDate = data.endDate || null;
    this.notes = data.notes || '';

    // 스타일
    this.color = data.color || null;
    this.lineWidth = data.lineWidth || 2;
    this.lineStyle = data.lineStyle || 'solid'; // solid, dashed, dotted
  }

  /**
   * 관계 타입 레이블
   * @returns {string} 레이블
   */
  getTypeLabel() {
    const labels = {
      marriage: '혼인',
      biological: '생물학적 자녀',
      adopted: '입양',
      foster: '위탁',
      emotional: '감정 관계'
    };
    return labels[this.type] || this.type;
  }

  /**
   * 상태 레이블
   * @returns {string} 레이블
   */
  getStatusLabel() {
    const labels = {
      current: '현재',
      ended: '종료'
    };
    return labels[this.status] || this.status;
  }

  /**
   * 서브타입 레이블
   * @returns {string} 레이블
   */
  getSubtypeLabel() {
    const labels = {
      // 결혼 서브타입
      married: '결혼',
      engaged: '약혼',
      divorced: '이혼',
      separated: '별거',
      widowed: '사별',
      cohabiting: '동거',
      // 감정 서브타입 (최적화 버전 - 2025)
      close: '친밀한 관계',
      love: '사랑',
      distant: '거리감',
      cutoff: '단절',
      conflict: '갈등',
      hostile: '적대적 관계',
      fused: '융합',
      'abuse-physical': '신체적 학대',
      'abuse-emotional': '정서적 학대',
      'abuse-sexual': '성적 학대',
      neglect: '방임',
      // 하위 호환성 (자동 변환됨)
      harmony: '친밀한 관계',
      veryClose: '친밀한 관계',
      discord: '갈등',
      abuse: '신체적 학대'
    };
    return labels[this.subtype] || this.subtype;
  }

  /**
   * 관계가 활성 상태인지 확인
   * @returns {boolean} 활성 여부
   */
  isActive() {
    return this.status === 'current';
  }

  /**
   * 관계 기간 계산
   * @returns {number|null} 기간 (년)
   */
  getDuration() {
    if (!this.startDate) return null;

    const start = new Date(this.startDate);
    const end = this.endDate ? new Date(this.endDate) : new Date();

    const years = end.getFullYear() - start.getFullYear();
    const monthDiff = end.getMonth() - start.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && end.getDate() < start.getDate())) {
      return years - 1;
    }

    return years;
  }

  /**
   * 유효성 검사
   * @returns {Object} { valid: boolean, errors: string[] }
   */
  validate() {
    const errors = [];

    if (!this.from) {
      errors.push('시작 인물이 필요합니다');
    }

    if (!this.to) {
      errors.push('대상 인물이 필요합니다');
    }

    if (this.from === this.to) {
      errors.push('자기 자신과의 관계는 생성할 수 없습니다');
    }

    if (!['marriage', 'biological', 'adopted', 'foster', 'emotional'].includes(this.type)) {
      errors.push('유효하지 않은 관계 타입입니다');
    }

    if (this.startDate && this.endDate) {
      const start = new Date(this.startDate);
      const end = new Date(this.endDate);
      if (end < start) {
        errors.push('종료일은 시작일 이후여야 합니다');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * JSON 변환
   * @returns {Object} JSON 객체
   */
  toJSON() {
    return {
      id: this.id,
      from: this.from,
      to: this.to,
      type: this.type,
      subtype: this.subtype,  // 감정선 타입 포함!
      status: this.status,
      startDate: this.startDate,
      endDate: this.endDate,
      notes: this.notes,
      color: this.color,
      lineWidth: this.lineWidth,
      lineStyle: this.lineStyle
    };
  }

  /**
   * JSON에서 생성
   * @param {Object} json - JSON 객체
   * @returns {Relationship} Relationship 인스턴스
   */
  static fromJSON(json) {
    return new Relationship(json);
  }

  /**
   * 복제
   * @returns {Relationship} 복제된 인스턴스
   */
  clone() {
    return new Relationship(this.toJSON());
  }

  /**
   * 다른 Relationship과 비교
   * @param {Relationship} other - 비교할 Relationship
   * @returns {boolean} 같은지 여부
   */
  equals(other) {
    return other instanceof Relationship && this.id === other.id;
  }

  /**
   * 양방향 관계인지 확인
   * @param {string} personId - 확인할 Person ID
   * @returns {boolean} 관련 여부
   */
  involves(personId) {
    return this.from === personId || this.to === personId;
  }

  /**
   * 특정 두 인물 간의 관계인지 확인
   * @param {string} personId1 - 첫 번째 Person ID
   * @param {string} personId2 - 두 번째 Person ID
   * @returns {boolean} 해당 관계 여부
   */
  connects(personId1, personId2) {
    return (
      (this.from === personId1 && this.to === personId2) ||
      (this.from === personId2 && this.to === personId1)
    );
  }

  /**
   * 문자열 표현
   * @returns {string} 문자열
   */
  toString() {
    return `${this.getTypeLabel()} (${this.getStatusLabel()})`;
  }
}
