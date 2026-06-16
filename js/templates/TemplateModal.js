/**
 * TemplateModal - 템플릿 선택 모달 (개선 버전)
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

        ${tutorials.length > 0 ? `
          <!-- ── 튜토리얼 영역 ── -->
          <div class="template-zone template-zone--tutorial">
            <div class="template-zone__header">
              <div class="template-zone__badge template-zone__badge--tutorial">👋 처음 오셨나요?</div>
              <p class="template-zone__desc">튜토리얼로 기본 기능을 빠르게 익혀보세요.</p>
            </div>
            <div class="template-tut-list">
              ${tutorials.map(t => this._createTutorialCard(t)).join('')}
            </div>
          </div>
        ` : ''}

        <!-- ── 템플릿 영역 ── -->
        <div class="template-zone template-zone--regular">
          <div class="template-zone__header">
            <div class="template-zone__badge template-zone__badge--regular">📂 템플릿으로 시작하기</div>
            <p class="template-zone__desc">예시 데이터가 포함된 템플릿을 선택하세요.</p>
          </div>
          <div class="template-options">
            ${regular.map(t => this._createTemplateCard(t)).join('')}
          </div>
        </div>

        <div class="template-footer">
          <button type="button" class="btn btn--secondary" id="cancelTemplateBtn">
            취소
          </button>
        </div>
      </div>
    `;

    this.modal = new Modal({
      title: '새 프로젝트',
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
   * 튜토리얼 카드 HTML
   */
  _createTutorialCard(template) {
    return `
      <div class="template-card template-card--tutorial" data-template-id="${template.id}">
        <div class="tut-card__icon">${template.icon || '🎓'}</div>
        <div class="tut-card__body">
          <h3 class="tut-card__title">${template.name}</h3>
          <p class="tut-card__desc">${template.description}</p>
        </div>
        <div class="tut-card__cta">시작하기 →</div>
      </div>
    `;
  }

  /**
   * 일반 템플릿 카드 HTML
   */
  _createTemplateCard(template) {
    const icon = template.icon || '📋';
    return `
      <div class="template-card" data-template-id="${template.id}">
        <div class="tmpl-card__icon">${icon}</div>
        <h3 class="tmpl-card__title">${template.name}</h3>
        <p class="template-description">${template.description}</p>
        <div class="template-meta">
          <span class="meta-item">👤 ${template.personCount}명</span>
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
