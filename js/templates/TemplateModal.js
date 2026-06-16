/**
 * TemplateModal - 템플릿 선택 모달 (심플 버전)
 */

import { Modal } from '../ui/Modal.js';
import { TemplateManager } from './TemplateManager.js';

export class TemplateModal {
  /**
   * @param {Function} onSelect - 템플릿 선택 콜백 (templateId, useTemplate)
   */
  constructor(onSelect) {
    this.onSelect = onSelect;
    this.modal = null;
  }

  /**
   * 모달 열기
   */
  open() {
    const templates = TemplateManager.getAllTemplates();
    const tutorials = templates.filter(t => t.isTutorial);
    const regular   = templates.filter(t => !t.isTutorial);

    const content = `
      <div class="template-modal">
        <div class="template-options">

          ${tutorials.length > 0 ? `
            <div class="template-section-divider">
              <span class="section-title">👋 처음 사용하시나요?</span>
            </div>
            ${tutorials.map(t => this._createTutorialCard(t)).join('')}
            <div class="template-section-divider">
              <span class="section-title">템플릿으로 시작하기</span>
            </div>
          ` : ''}

          ${regular.map(t => this._createTemplateCard(t)).join('')}

        </div>

        <div class="template-footer">
          <button type="button" class="btn btn--secondary" id="cancelTemplateBtn">
            취소
          </button>
        </div>
      </div>
    `;

    this.modal = new Modal({
      title: '',
      content: content,
      className: 'modal-large',
      closable: true
    });

    this.modal.open();

    setTimeout(() => {
      this.attachEventListeners();
    }, 0);
  }

  /**
   * 튜토리얼 카드 HTML (일반 카드보다 크고 강조)
   */
  _createTutorialCard(template) {
    return `
      <div class="template-card template-card--tutorial" data-template-id="${template.id}">
        <div class="template-card__icon">${template.icon || '🎓'}</div>
        <h3>${template.name}</h3>
        <p class="template-description">${template.description}</p>
        <div class="template-meta template-meta--tutorial">
          <span class="meta-badge">추천 시작법</span>
        </div>
      </div>
    `;
  }

  /**
   * 일반 템플릿 카드 HTML
   */
  _createTemplateCard(template) {
    return `
      <div class="template-card" data-template-id="${template.id}">
        <h3>${template.name}</h3>
        <p class="template-description">${template.description}</p>
        <div class="template-meta">
          <span class="meta-item">${template.personCount}명</span>
        </div>
      </div>
    `;
  }

  /**
   * 이벤트 리스너
   */
  attachEventListeners() {
    const cards = document.querySelectorAll('.template-card');
    cards.forEach(card => {
      card.addEventListener('click', () => {
        const templateId = card.dataset.templateId;
        this.selectTemplate(templateId);
      });
    });

    const cancelBtn = document.getElementById('cancelTemplateBtn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        this.modal.close();
      });
    }
  }

  /**
   * 템플릿 선택
   */
  selectTemplate(templateId) {
    const useTemplate = templateId !== '';

    if (this.onSelect) {
      this.onSelect(templateId, useTemplate);
    }

    this.modal.close();
  }

  /**
   * 모달 닫기
   */
  close() {
    if (this.modal) {
      this.modal.close();
    }
  }
}
