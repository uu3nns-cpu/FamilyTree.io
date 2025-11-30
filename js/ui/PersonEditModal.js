/**
 * PersonEditModal - 인물 편집 모달
 */

import { Modal } from './Modal.js';
import { Toast } from './Toast.js';

export class PersonEditModal {
  /**
   * @param {Person} person - 편집할 인물
   * @param {Function} onSave - 저장 콜백
   */
  constructor(person, onSave) {
    this.person = person;
    this.onSave = onSave;
    this.modal = null;
  }

  /**
   * 모달 열기
   */
  open() {
    const content = this._generateContent();
    const footer = this._generateFooter();

    this.modal = new Modal({
      title: '인물 정보 편집',
      content: content,
      footer: footer,
      className: 'person-edit-modal',
      onClose: () => this._cleanup()
    });

    this.modal.render();
    this.modal.open();

    // 이벤트 바인딩
    this._bindEvents();
  }

  /**
   * 콘텐츠 생성
   */
  _generateContent() {
    return `
      <form id="personEditForm" class="person-edit-form">
        <div class="person-edit-grid">
          <!-- 이름 -->
          <div class="input-group-card">
            <label class="input-group__label" for="personName">
              이름 <span style="color: var(--color-danger);">*</span>
            </label>
            <input 
              type="text" 
              id="personName" 
              class="input" 
              value="${this.person.name}"
              required
              placeholder="이름을 입력하세요"
            />
          </div>

          <!-- 성별 -->
          <div class="input-group-card">
            <label class="input-group__label">성별</label>
            <div class="radio-group">
              <label class="radio-label">
                <input 
                  type="radio" 
                  name="gender" 
                  value="male" 
                  ${this.person.gender === 'male' ? 'checked' : ''}
                />
                <span>남성</span>
              </label>
              <label class="radio-label">
                <input 
                  type="radio" 
                  name="gender" 
                  value="female" 
                  ${this.person.gender === 'female' ? 'checked' : ''}
                />
                <span>여성</span>
              </label>
              <label class="radio-label">
                <input 
                  type="radio" 
                  name="gender" 
                  value="unknown" 
                  ${this.person.gender === 'unknown' || this.person.gender === 'other' ? 'checked' : ''}
                />
                <span>미상</span>
              </label>
            </div>
          </div>

          <!-- 나이 -->
          <div class="input-group-card">
            <label class="input-group__label" for="personAge">나이</label>
            <input 
              type="number" 
              id="personAge" 
              class="input"
              value="${this.person.age || ''}"
              min="0"
              max="150"
              placeholder="나이를 입력하세요"
            />
          </div>

          <!-- 상태 -->
          <div class="input-group-card">
            <label class="input-group__label">상태</label>
            <div class="status-checkboxes">
              <label class="checkbox-label">
                <input 
                  type="checkbox" 
                  id="isCT"
                  ${this.person.isCT ? 'checked' : ''}
                />
                <span>주요인물</span>
              </label>
              <label class="checkbox-label">
                <input 
                  type="checkbox" 
                  id="isDeceased"
                  ${this.person.isDeceased ? 'checked' : ''}
                />
                <span>사망</span>
              </label>
            </div>
          </div>
        </div>
      </form>
    `;
  }

  /**
   * 푸터 생성
   */
  _generateFooter() {
    return `
      <button type="button" class="btn btn--secondary" data-action="cancel">취소</button>
      <button type="button" class="btn btn--primary" data-action="save">저장</button>
    `;
  }

  /**
   * 이벤트 바인딩
   */
  _bindEvents() {
    const element = this.modal.element;

    // 저장 버튼
    element.querySelector('[data-action="save"]').addEventListener('click', () => {
      this._handleSave();
    });

    // 취소 버튼
    element.querySelector('[data-action="cancel"]').addEventListener('click', () => {
      this.modal.close();
    });

    // 엔터 키 제출 방지
    element.querySelector('#personEditForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this._handleSave();
    });
  }

  /**
   * 저장 처리
   */
  _handleSave() {
    const element = this.modal.element;
    const name = element.querySelector('#personName').value.trim();
    const gender = element.querySelector('input[name="gender"]:checked').value;
    const age = element.querySelector('#personAge').value;
    const isCT = element.querySelector('#isCT').checked;
    const isDeceased = element.querySelector('#isDeceased').checked;

    // 유효성 검사
    if (!name) {
      Toast.error('이름을 입력하세요');
      return;
    }

    if (age && (age < 0 || age > 150)) {
      Toast.error('유효한 나이를 입력하세요 (0-150)');
      return;
    }

    // 업데이트 객체 생성
    const updates = {
      name,
      gender,
      age: age ? parseInt(age) : null,
      isCT,
      isDeceased,
      lastModified: Date.now() // 수정 시간 업데이트
    };

    // 콜백 호출
    if (this.onSave) {
      this.onSave(updates);
    }

    // 모달 닫기
    this.modal.close();
    Toast.success('저장되었습니다');
  }

  /**
   * 정리
   */
  _cleanup() {
    this.modal = null;
  }
}
