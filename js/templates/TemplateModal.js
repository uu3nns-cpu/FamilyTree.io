/**
 * TemplateModal - 템플릿 선택 모달
 * 레이아웃: 좌(튜토리얼 강조 카드) | 우(템플릿 2×2 그리드) — C안
 */

import { Modal } from '../ui/Modal.js';
import { TemplateManager } from './TemplateManager.js';

export class TemplateModal {
  constructor(onSelect) {
    this.onSelect = onSelect;
    this.modal = null;
  }

  open() {
    const templates = TemplateManager.getAllTemplates();
    const tutorials = templates.filter(t => t.isTutorial);
    const regular   = templates.filter(t => !t.isTutorial);

    const content = `
      <div class="template-modal">
        <div class="template-layout">

          ${tutorials.length > 0 ? `
          <!-- ── 좌: 튜토리얼 강조 카드 ── -->
          <aside class="template-col template-col--tutorial">
            <p class="tmpl-col-label">👋 처음이라면</p>
            <div class="tut-list">
              ${tutorials.map(t => this._createTutorialCard(t)).join('')}
            </div>
          </aside>
          <div class="template-col-divider"></div>
          ` : ''}

          <!-- ── 우: 템플릿 2×2 그리드 ── -->
          <section class="template-col template-col--regular">
            <p class="tmpl-col-label">📂 템플릿으로 시작하기</p>
            <div class="template-options">
              ${regular.map(t => this._createTemplateCard(t)).join('')}
            </div>
          </section>

        </div>

        <div class="template-footer" style="display:none">
          <button type="button" class="btn btn--secondary" id="cancelTemplateBtn">취소</button>
        </div>
      </div>
    `;

    this.modal = new Modal({
      title: '새 프로젝트',
      content,
      className: 'modal-large',
      closable: true
    });

    this.modal.open();
    setTimeout(() => this.attachEventListeners(), 0);
  }

  /** 튜토리얼 강조 카드 (C안 — 세로 중앙 정렬, 버튼 포함) */
  _createTutorialCard(template) {
    return `
      <div class="template-card template-card--tutorial" data-template-id="${template.id}">
        <span class="tut-card__icon">${template.icon || '🎓'}</span>
        <div class="tut-card__body">
          <strong class="tut-card__title">${template.name}</strong>
          <p class="tut-card__desc">${template.description}</p>
        </div>
        <span class="tut-card__btn">튜토리얼 시작 →</span>
        <span class="tut-card__arrow">→</span>
      </div>
    `;
  }

  /** 일반 템플릿 카드 */
  _createTemplateCard(template) {
    return `
      <div class="template-card" data-template-id="${template.id}">
        <div class="tmpl-card__icon">${template.icon || '📋'}</div>
        <strong class="tmpl-card__title">${template.name}</strong>
        <p class="template-description">${template.description}</p>
        <div class="template-meta">
          <span class="meta-item">👤 ${template.personCount}명</span>
        </div>
      </div>
    `;
  }

  attachEventListeners() {
    document.querySelectorAll('.template-card').forEach(card => {
      card.addEventListener('click', () => this.selectTemplate(card.dataset.templateId));
    });
    const cancelBtn = document.getElementById('cancelTemplateBtn');
    if (cancelBtn) cancelBtn.addEventListener('click', () => this.modal.close());
  }

  selectTemplate(templateId) {
    if (this.onSelect) this.onSelect(templateId, templateId !== '');
    this.modal.close();
  }

  close() {
    if (this.modal) this.modal.close();
  }
}
