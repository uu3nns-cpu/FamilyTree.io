/**
 * SaveModal - 일시저장 모달
 */

import { Modal } from '../Modal.js';
import { Toast } from '../Toast.js';

export class SaveModal extends Modal {
  constructor(currentProjectName, onSave) {
    super();
    this.currentProjectName = currentProjectName;
    this.onSaveCallback = onSave;
  }

  /**
   * 모달 열기
   */
  open() {
    const html = `
      <div class="modal">
        <div class="modal__overlay"></div>
        <div class="modal__container">
          <div class="modal__header">
            <h2 class="modal__title">프로젝트 일시저장</h2>
            <button class="modal__close" aria-label="닫기">✕</button>
          </div>
          <div class="modal__body">
            <div style="padding: 24px;">
              <div style="margin-bottom: 24px;">
                <label style="display: block; margin-bottom: 8px; font-weight: 600; color: var(--color-text-primary);">
                  프로젝트 이름
                </label>
                <input 
                  type="text" 
                  id="projectNameInput" 
                  class="input" 
                  value="${this.escapeHtml(this.currentProjectName)}"
                  placeholder="프로젝트 이름을 입력하세요"
                  style="width: 100%; padding: 12px; border: 1px solid var(--color-border-primary); border-radius: 8px; font-size: 14px; background: var(--color-bg-primary); color: var(--color-text-primary);"
                />
                <p style="margin-top: 8px; font-size: 13px; color: var(--color-text-tertiary);">
                  프로젝트 이름을 변경하여 저장할 수 있습니다.
                </p>
              </div>
            </div>
          </div>
          <div class="modal__footer">
            <button class="btn btn--secondary" data-action="cancel">취소</button>
            <button class="btn btn--primary" data-action="save">저장</button>
          </div>
        </div>
      </div>
    `;

    const temp = document.createElement('div');
    temp.innerHTML = html.trim();
    this.element = temp.firstElementChild;

    document.body.appendChild(this.element);
    document.body.style.overflow = 'hidden';

    // 애니메이션
    requestAnimationFrame(() => {
      this.element.classList.add('modal--active');
    });

    this.isOpen = true;

    // 이벤트 바인딩
    this._bindEvents();

    // 입력 필드에 포커스
    setTimeout(() => {
      const input = document.getElementById('projectNameInput');
      if (input) {
        input.focus();
        input.select();
      }
    }, 100);
  }

  /**
   * 이벤트 바인딩
   */
  _bindEvents() {
    // 닫기 버튼
    const closeBtn = this.element.querySelector('.modal__close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }

    // 오버레이 클릭
    const overlay = this.element.querySelector('.modal__overlay');
    if (overlay) {
      overlay.addEventListener('click', () => this.close());
    }

    // 취소 버튼
    const cancelBtn = this.element.querySelector('[data-action="cancel"]');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.close());
    }

    // 저장 버튼
    const saveBtn = this.element.querySelector('[data-action="save"]');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.handleSave());
    }

    // Enter 키로 저장
    const input = document.getElementById('projectNameInput');
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.handleSave();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          this.close();
        }
      });
    }

    // ESC 키
    this._escHandler = (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    };
    document.addEventListener('keydown', this._escHandler);
  }

  /**
   * 저장 처리
   */
  handleSave() {
    const input = document.getElementById('projectNameInput');
    const newName = input.value.trim();

    if (!newName) {
      // 입력이 비어있으면 오류 표시
      input.style.borderColor = 'var(--color-error)';
      input.focus();
      Toast.error('프로젝트 이름을 입력해주세요');
      return;
    }

    // 콜백 호출
    if (this.onSaveCallback) {
      this.onSaveCallback(newName);
    }

    this.close();
  }

  /**
   * 모달 닫기
   */
  close() {
    if (!this.isOpen) return;

    this.element.classList.remove('modal--active');
    document.body.style.overflow = '';

    // ESC 리스너 제거
    if (this._escHandler) {
      document.removeEventListener('keydown', this._escHandler);
    }

    // 애니메이션 후 제거
    setTimeout(() => {
      if (this.element && this.element.parentNode) {
        this.element.parentNode.removeChild(this.element);
      }
      this.isOpen = false;
    }, 300);
  }

  /**
   * HTML 이스케이프
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
