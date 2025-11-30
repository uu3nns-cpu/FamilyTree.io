/**
 * TemplateManager - 템플릿 적용 및 관리
 */

import { getAllTemplates, getTemplateById } from './TemplateData.js';
import { Person } from '../canvas/Person.js';
import { Relationship } from '../canvas/Relationship.js';

export class TemplateManager {
  /**
   * 모든 템플릿 목록 가져오기
   * @returns {Array} 템플릿 배열
   */
  static getAllTemplates() {
    return getAllTemplates();
  }

  /**
   * ID로 템플릿 가져오기
   * @param {string} templateId - 템플릿 ID
   * @returns {Object|null} 템플릿 객체
   */
  static getTemplateById(templateId) {
    return getTemplateById(templateId);
  }

  /**
   * 템플릿을 CanvasState에 적용
   * @param {string} templateId - 템플릿 ID
   * @param {CanvasState} canvasState - 캔버스 상태 객체
   * @returns {boolean} 성공 여부
   */
  static applyTemplate(templateId, canvasState) {
    const template = getTemplateById(templateId);
    
    if (!template) {
      console.error(`템플릿을 찾을 수 없습니다: ${templateId}`);
      return false;
    }

    try {
      // 기존 데이터 초기화
      canvasState.people = [];
      canvasState.relationships = [];

      // 인물 추가
      template.data.people.forEach(personData => {
        const person = new Person(personData);
        canvasState.people.push(person);
      });

      // 관계 추가
      template.data.relationships.forEach(relData => {
        const relationship = new Relationship(relData);
        canvasState.relationships.push(relationship);
      });

      console.log(`✅ 템플릿 적용 완료: ${template.name} (${template.personCount}명)`);
      return true;
    } catch (error) {
      console.error('템플릿 적용 중 오류:', error);
      return false;
    }
  }

  /**
   * 템플릿 미리보기 데이터 생성
   * @param {string} templateId - 템플릿 ID
   * @returns {Object|null} 미리보기 데이터
   */
  static getPreviewData(templateId) {
    const template = getTemplateById(templateId);
    
    if (!template) {
      return null;
    }

    return {
      id: template.id,
      name: template.name,
      description: template.description,
      icon: template.icon,
      personCount: template.personCount,
      relationshipCount: template.relationshipCount,
      is2Family: template.is2Family
    };
  }

  /**
   * 템플릿 통계 정보
   * @returns {Object} 통계
   */
  static getStatistics() {
    const templates = getAllTemplates();
    
    return {
      total: templates.length,
      twoFamily: templates.filter(t => t.is2Family).length,
      minPersons: Math.min(...templates.map(t => t.personCount)),
      maxPersons: Math.max(...templates.map(t => t.personCount)),
      avgPersons: Math.round(
        templates.reduce((sum, t) => sum + t.personCount, 0) / templates.length
      )
    };
  }

  /**
   * 현재 캔버스 상태를 템플릿으로 저장 (향후 확장용)
   * @param {CanvasState} canvasState - 캔버스 상태
   * @param {string} name - 템플릿 이름
   * @param {string} description - 설명
   * @returns {Object} 생성된 템플릿
   */
  static saveAsTemplate(canvasState, name, description = '') {
    const template = {
      id: `custom-${Date.now()}`,
      name: name,
      description: description,
      icon: '📝',
      personCount: canvasState.people.length,
      relationshipCount: canvasState.relationships.length,
      is2Family: false,
      isCustom: true,
      data: {
        people: canvasState.people.map(p => ({
          id: p.id,
          name: p.name,
          gender: p.gender,
          age: p.age,
          x: p.x,
          y: p.y,
          notes: p.notes,
          occupation: p.occupation,
          education: p.education,
          tags: [...p.tags],
          photo: p.photo,
          isCT: p.isCT,
          isDeceased: p.isDeceased,
          color: p.color,
          size: p.size
        })),
        relationships: canvasState.relationships.map(r => ({
          id: r.id,
          type: r.type,
          person1Id: r.person1Id,
          person2Id: r.person2Id,
          startYear: r.startYear,
          endYear: r.endYear,
          notes: r.notes
        }))
      }
    };

    return template;
  }

  /**
   * 템플릿 검증
   * @param {string} templateId - 템플릿 ID
   * @returns {Object} { valid: boolean, errors: string[] }
   */
  static validateTemplate(templateId) {
    const template = getTemplateById(templateId);
    const errors = [];

    if (!template) {
      return { valid: false, errors: ['템플릿을 찾을 수 없습니다'] };
    }

    // 인물 수 검증
    if (template.data.people.length !== template.personCount) {
      errors.push('인물 수가 메타데이터와 일치하지 않습니다');
    }

    // 관계 수 검증
    if (template.data.relationships.length !== template.relationshipCount) {
      errors.push('관계 수가 메타데이터와 일치하지 않습니다');
    }

    // 인물 ID 중복 검사
    const personIds = template.data.people.map(p => p.id);
    const uniqueIds = new Set(personIds);
    if (personIds.length !== uniqueIds.size) {
      errors.push('중복된 인물 ID가 있습니다');
    }

    // 관계 검증 (존재하지 않는 인물 참조 체크)
    template.data.relationships.forEach(rel => {
      if (!personIds.includes(rel.person1Id)) {
        errors.push(`존재하지 않는 인물 참조: ${rel.person1Id}`);
      }
      if (!personIds.includes(rel.person2Id)) {
        errors.push(`존재하지 않는 인물 참조: ${rel.person2Id}`);
      }
    });

    return {
      valid: errors.length === 0,
      errors: errors
    };
  }
}
