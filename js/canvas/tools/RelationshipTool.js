/**
 * RelationshipTool - 관계선 추가 도구
 */

import { Relationship } from '../Relationship.js';
import { Toast } from '../../ui/Toast.js';

export class RelationshipTool {
  constructor(canvasState) {
    this.canvasState = canvasState;
    this.firstPerson = null;
    this.relationshipType = 'child'; // child, marriage, sibling
  }

  /**
   * 관계 타입 설정
   */
  setType(type) {
    this.relationshipType = type;
  }

  /**
   * 클릭 처리
   */
  handleClick(x, y) {
    const person = this.canvasState.getPersonAt(x, y);
    
    if (!person) {
      this.reset();
      return false;
    }

    if (!this.firstPerson) {
      // 첫 번째 인물 선택
      this.firstPerson = person;
      Toast.info('두 번째 인물을 선택하세요');
      return false;
    } else {
      // 두 번째 인물 선택 - 관계 생성
      if (this.firstPerson.id === person.id) {
        Toast.error('같은 인물은 선택할 수 없습니다');
        return false;
      }

      this.createRelationship(this.firstPerson, person);
      this.reset();
      return true;
    }
  }

  /**
   * 관계 생성
   */
  createRelationship(from, to) {
    const relationship = new Relationship({
      from: from.id,
      to: to.id,
      type: this.relationshipType,
      status: 'current'
    });

    const success = this.canvasState.addRelationship(relationship);
    
    if (success) {
      Toast.success('관계가 추가되었습니다');
    } else {
      Toast.error('이미 존재하는 관계입니다');
    }
  }

  /**
   * 현재 진행 중인 관계 그리기
   */
  drawPending(ctx, mouseX, mouseY) {
    if (!this.firstPerson) return;

    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    
    ctx.beginPath();
    ctx.moveTo(this.firstPerson.x, this.firstPerson.y);
    ctx.lineTo(mouseX, mouseY);
    ctx.stroke();
    
    ctx.setLineDash([]);
  }

  /**
   * 초기화
   */
  reset() {
    this.firstPerson = null;
  }

  /**
   * 진행 중인지 확인
   */
  isPending() {
    return this.firstPerson !== null;
  }
}
