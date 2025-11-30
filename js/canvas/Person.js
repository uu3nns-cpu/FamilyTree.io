/**
 * Person - 인물 데이터 클래스
 */

import { generateId } from '../core/Utils.js';

export class Person {
  /**
   * @param {Object} data - 인물 데이터
   */
  constructor(data = {}) {
    this.id = data.id || generateId();
    this.name = data.name || '이름 없음';
    this.gender = data.gender || 'male'; // male, female, unknown
    this.age = data.age || null; // 단순 나이 정보
    this.x = data.x || 0;
    this.y = data.y || 0;
    this.notes = data.notes || '';

    // 추가 정보
    this.occupation = data.occupation || '';
    this.education = data.education || '';
    this.tags = data.tags || [];
    this.photo = data.photo || null;
    
    // 상태
    this.isCT = data.isCT || false; // CT (주요인물)
    this.isDeceased = data.isDeceased || false; // 사망 여부

    // 스타일
    this.color = data.color || null;
    this.size = data.size || 60;
    
    // 타임스탬프
    this.lastModified = data.lastModified || Date.now();
  }

  /**
   * 나이 반환
   * @returns {number|null} 나이
   */
  getAge() {
    return this.age;
  }

  /**
   * 나이 설정
   * @param {number|null} age - 나이
   */
  setAge(age) {
    this.age = age;
  }

  /**
   * 생존 여부
   * @returns {boolean} 생존 여부
   */
  isAlive() {
    return !this.isDeceased;
  }

  /**
   * 태그 추가
   * @param {string} tag - 태그
   */
  addTag(tag) {
    if (!this.tags.includes(tag)) {
      this.tags.push(tag);
    }
  }

  /**
   * 태그 제거
   * @param {string} tag - 태그
   */
  removeTag(tag) {
    const index = this.tags.indexOf(tag);
    if (index > -1) {
      this.tags.splice(index, 1);
    }
  }

  /**
   * 특정 태그를 가지고 있는지 확인
   * @param {string} tag - 태그
   * @returns {boolean} 보유 여부
   */
  hasTag(tag) {
    return this.tags.includes(tag);
  }

  /**
   * 유효성 검사
   * @returns {Object} { valid: boolean, errors: string[] }
   */
  validate() {
    const errors = [];

    if (!this.name || this.name.trim() === '') {
      errors.push('이름은 필수입니다');
    }

    if (!['male', 'female', 'unknown'].includes(this.gender)) {
      errors.push('유효하지 않은 성별입니다');
    }

    if (this.age !== null && (this.age < 0 || this.age > 150)) {
      errors.push('유효하지 않은 나이입니다');
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
      name: this.name,
      gender: this.gender,
      age: this.age,
      x: this.x,
      y: this.y,
      notes: this.notes,
      occupation: this.occupation,
      education: this.education,
      tags: [...this.tags],
      photo: this.photo,
      color: this.color,
      size: this.size,
      isCT: this.isCT,
      isDeceased: this.isDeceased
    };
  }

  /**
   * JSON에서 생성
   * @param {Object} json - JSON 객체
   * @returns {Person} Person 인스턴스
   */
  static fromJSON(json) {
    return new Person(json);
  }

  /**
   * 복제
   * @returns {Person} 복제된 인스턴스
   */
  clone() {
    return new Person(this.toJSON());
  }

  /**
   * 다른 Person과 비교
   * @param {Person} other - 비교할 Person
   * @returns {boolean} 같은지 여부
   */
  equals(other) {
    return other instanceof Person && this.id === other.id;
  }

  /**
   * 문자열 표현
   * @returns {string} 문자열
   */
  toString() {
    const age = this.getAge();
    const ageStr = age !== null ? ` (${age}세)` : '';
    const statusStr = this.isAlive() ? '' : ' [사망]';
    return `${this.name}${ageStr}${statusStr}`;
  }
}
