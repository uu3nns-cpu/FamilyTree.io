/**
 * EmotionalOperations - 감정선 연결 작업
 * McGoldrick-Gerson 표준 기반 최적화 버전 (2025)
 * 실무 중심 핵심 타입만 포함
 */

import { Relationship } from './Relationship.js';
import { Toast } from '../ui/Toast.js';

export class EmotionalOperations {
  constructor(canvasState) {
    this.canvasState = canvasState;
    this.emotionalSubtype = null;
    this.firstPerson = null;
  }

  /**
   * 감정선 타입 설정
   */
  setEmotionalSubtype(subtype) {
    // 별칭 처리 (하위 호환성)
    const aliases = {
      'discord': 'conflict',
      'harmony': 'close',
      'veryClose': 'close',
      'abuse': 'abuse-physical'  // 기본값
    };
    
    this.emotionalSubtype = aliases[subtype] || subtype;
    this.firstPerson = null;
  }

  /**
   * 현재 감정선 타입
   */
  getCurrentSubtype() {
    return this.emotionalSubtype;
  }

  /**
   * 감정선 모드 활성 여부
   */
  isActive() {
    return this.emotionalSubtype !== null && this.emotionalSubtype !== 'none';
  }

  /**
   * 인물 클릭 처리
   */
  handlePersonClick(person) {
    if (!this.isActive()) {
      return false;
    }

    if (!this.firstPerson) {
      // 첫 번째 인물 선택
      this.firstPerson = person;
      Toast.info(`"${person.name}" 선택됨 - 다른 인물을 선택하면 감정선이 연결됩니다`);
      return true;
    } else {
      // 두 번째 인물 선택 - 감정선 생성
      if (this.firstPerson.id === person.id) {
        Toast.warning('같은 인물을 선택할 수 없습니다');
        return false;
      }

      const success = this.createEmotionalRelationship(this.firstPerson, person, this.emotionalSubtype);
      this.firstPerson = null;
      return success;
    }
  }

  /**
   * 감정선 생성
   */
  createEmotionalRelationship(first, second, subtype) {
    if (!first || !second) return false;

    // 기존 감정선 확인 (방향성 고려)
    const existingSameDirection = this.canvasState.relationships.find(r =>
      r.type === 'emotional' && r.from === first.id && r.to === second.id
    );
    
    const existingOppositeDirection = this.canvasState.relationships.find(r =>
      r.type === 'emotional' && r.from === second.id && r.to === first.id
    );

    const label = this.getEmotionalLabel(subtype);

    if (existingSameDirection) {
      // 같은 방향 감정선 업데이트
      existingSameDirection.subtype = subtype;
      existingSameDirection.notes = label;
      Toast.success(`감정선이 "${label}"로 변경되었습니다`);
    } else if (existingOppositeDirection) {
      // 반대 방향 감정선이 있으면 제거하고 새로 생성
      this.canvasState.removeRelationship(existingOppositeDirection.id);
      
      const rel = new Relationship({
        from: first.id,
        to: second.id,
        type: 'emotional',
        subtype: subtype,
        notes: label
      });
      this.canvasState.addRelationship(rel);
      Toast.success(`감정선 방향이 바뀌고 "${label}"로 변경되었습니다`);
    } else {
      // 새 감정선 생성
      const rel = new Relationship({
        from: first.id,
        to: second.id,
        type: 'emotional',
        subtype: subtype,
        notes: label
      });
      this.canvasState.addRelationship(rel);
      Toast.success(`"${label}" 감정선이 연결되었습니다`);
    }

    return true;
  }

  /**
   * 감정선 라벨 (최적화된 버전)
   */
  getEmotionalLabel(subtype) {
    const labels = {
      // 긍정적 관계 (2개)
      'close': '친밀한 관계',
      'love': '사랑',
      
      // 거리감/단절 (2개)
      'distant': '거리감',
      'cutoff': '단절',
      
      // 부정적 관계 (2개)
      'conflict': '갈등',
      'hostile': '적대적 관계',
      
      // 복합 관계 (1개)
      'fused': '융합',
      
      // 학대 (4개)
      'abuse-physical': '신체적 학대',
      'abuse-emotional': '정서적 학대',
      'abuse-sexual': '성적 학대',
      'neglect': '방임',
      
      // 하위 호환성 (자동 변환됨)
      'discord': '갈등',  // conflict로 변환됨
      'harmony': '친밀한 관계',  // close로 변환됨
      'veryClose': '친밀한 관계',  // close로 변환됨
      'abuse': '신체적 학대'  // abuse-physical로 변환됨
    };
    return labels[subtype] || '관계';
  }

  /**
   * 감정선 카테고리
   */
  getEmotionCategory(subtype) {
    if (['close', 'love'].includes(subtype)) {
      return 'positive';
    } else if (['conflict', 'hostile'].includes(subtype)) {
      return 'negative';
    } else if (['distant', 'cutoff'].includes(subtype)) {
      return 'neutral';
    } else if (['fused'].includes(subtype)) {
      return 'complex';
    } else if (['abuse-physical', 'abuse-emotional', 'abuse-sexual', 'neglect'].includes(subtype)) {
      return 'abuse';
    }
    return null;
  }

  /**
   * 카테고리별 감정선 목록
   */
  getEmotionalTypesByCategory() {
    return {
      positive: [
        { value: 'close', label: '친밀한 관계', icon: '💚' },
        { value: 'love', label: '사랑', icon: '❤️' }
      ],
      neutral: [
        { value: 'distant', label: '거리감', icon: '⚪' },
        { value: 'cutoff', label: '단절', icon: '✂️' }
      ],
      negative: [
        { value: 'conflict', label: '갈등', icon: '⚡' },
        { value: 'hostile', label: '적대적 관계', icon: '💢' }
      ],
      complex: [
        { value: 'fused', label: '융합', icon: '🔗' }
      ],
      abuse: [
        { value: 'abuse-physical', label: '신체적 학대', icon: '⚠️' },
        { value: 'abuse-emotional', label: '정서적 학대', icon: '💭' },
        { value: 'abuse-sexual', label: '성적 학대', icon: '🚫' },
        { value: 'neglect', label: '방임', icon: '🌫️' }
      ]
    };
  }

  /**
   * 선택 초기화
   */
  reset() {
    this.firstPerson = null;
    this.emotionalSubtype = null;
  }

  /**
   * 첫 번째 인물이 선택되었는지
   */
  isPending() {
    return this.firstPerson !== null;
  }

  /**
   * 첫 번째 선택된 인물
   */
  getFirstPerson() {
    return this.firstPerson;
  }

  /**
   * 데이터 마이그레이션 (기존 가계도 로드 시)
   */
  static migrateEmotionalType(oldSubtype) {
    const migrations = {
      'harmony': 'close',
      'veryClose': 'close',
      'discord': 'conflict',
      'abuse': 'abuse-physical',
      'none': null
    };
    
    return migrations[oldSubtype] || oldSubtype;
  }
}
