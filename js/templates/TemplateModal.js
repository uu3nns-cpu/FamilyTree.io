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

    const content = `
      <div class="template-modal">
        <div class="template-options">
          <!-- 튜토리얼 섹션 -->
          ${this.createTutorialSection(templates)}

          <!-- 일반 템플릿 -->
          ${templates.filter(t => !t.isTutorial).map(template => this.createTemplateCard(template)).join('')}
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
   * 튜토리얼 섹션 HTML
   */
  createTutorialSection(templates) {
    const tutorials = templates.filter(t => t.isTutorial);
    if (tutorials.length === 0) return '';

    return `
      <div class="template-section-divider">
        <span class="section-title">튜토리얼 (처음 사용하시나요?)</span>
      </div>
      ${tutorials.map(template => this.createTemplateCard(template, true)).join('')}
      <div class="template-section-divider">
        <span class="section-title">템플릿</span>
      </div>
    `;
  }

  /**
   * 템플릿 카드 HTML
   */
  createTemplateCard(template, isTutorial = false) {
    const cardClass = isTutorial || template.isTutorial ? 'template-card tutorial-card' : 'template-card';

    return `
      <div class="${cardClass}" data-template-id="${template.id}">
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
