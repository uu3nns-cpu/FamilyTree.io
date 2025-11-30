/**
 * Modal - 범용 모달 컴포넌트
 */

export class Modal {
  /**
   * @param {Object} options - 모달 옵션
   */
  constructor(options = {}) {
    this.options = {
      title: options.title || '',
      content: options.content || '',
      footer: options.footer || '',
      closable: options.closable !== false,
      className: options.className || '',
      onOpen: options.onOpen || null,
      onClose: options.onClose || null,
      ...options
    };

    this.element = null;
    this.isOpen = false;
  }

  /**
   * 모달 렌더링
   * @returns {HTMLElement} 모달 요소
   */
  render() {
    const html = `
      <div class="modal ${this.options.className}">
        <div class="modal__overlay"></div>
        <div class="modal__container">
          <div class="modal__header">
            <h2 class="modal__title">${this.options.title}</h2>
            ${this.options.closable ? '<button class="modal__close" aria-label="닫기">✕</button>' : ''}
          </div>
          <div class="modal__body">
            ${this.options.content}
          </div>
          ${this.options.footer ? `
            <div class="modal__footer">
              ${this.options.footer}
            </div>
          ` : ''}
        </div>
      </div>
    `;

    const temp = document.createElement('div');
    temp.innerHTML = html.trim();
    this.element = temp.firstElementChild;

    this._bindEvents();

    return this.element;
  }

  /**
   * 모달 열기
   */
  open() {
    if (this.isOpen) return;

    if (!this.element) {
      this.render();
    }

    document.body.appendChild(this.element);
    document.body.style.overflow = 'hidden';

    // 애니메이션을 위한 지연
    requestAnimationFrame(() => {
      this.element.classList.add('modal--active');
    });

    this.isOpen = true;

    if (this.options.onOpen) {
      this.options.onOpen();
    }
  }

  /**
   * 모달 닫기
   */
  close() {
    if (!this.isOpen) return;

    this.element.classList.remove('modal--active');
    document.body.style.overflow = '';

    // 애니메이션 후 제거
    setTimeout(() => {
      if (this.element && this.element.parentNode) {
        this.element.parentNode.removeChild(this.element);
      }
      this.isOpen = false;
    }, 300);

    if (this.options.onClose) {
      this.options.onClose();
    }
  }

  /**
   * 모달 파괴
   */
  destroy() {
    this._removeEscListener();
    this.close();
    this.element = null;
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
    if (overlay && this.options.closable) {
      overlay.addEventListener('click', () => this.close());
    }

    // ESC 키
    this._escHandler = (e) => {
      if (e.key === 'Escape' && this.options.closable && this.isOpen) {
        this.close();
      }
    };
    document.addEventListener('keydown', this._escHandler);
  }

  /**
   * ESC 리스너 제거
   */
  _removeEscListener() {
    if (this._escHandler) {
      document.removeEventListener('keydown', this._escHandler);
    }
  }

  /**
   * 콘텐츠 업데이트
   * @param {string} content - 새 콘텐츠
   */
  setContent(content) {
    if (this.element) {
      const bodyElement = this.element.querySelector('.modal__body');
      if (bodyElement) {
        bodyElement.innerHTML = content;
      }
    }
    this.options.content = content;
  }

  /**
   * 타이틀 업데이트
   * @param {string} title - 새 타이틀
   */
  setTitle(title) {
    if (this.element) {
      const titleElement = this.element.querySelector('.modal__title');
      if (titleElement) {
        titleElement.textContent = title;
      }
    }
    this.options.title = title;
  }
}

/**
 * 확인 모달
 * @param {Object} options - 옵션
 * @returns {Promise<boolean>} 확인/취소 결과
 */
export function confirm(options = {}) {
  return new Promise((resolve) => {
    const modal = new Modal({
      title: options.title || '확인',
      content: options.message || '계속하시겠습니까?',
      footer: `
        <button class="btn btn--secondary" data-action="cancel">취소</button>
        <button class="btn btn--primary" data-action="confirm">확인</button>
      `,
      onClose: () => resolve(false),
      ...options
    });

    modal.render();

    // 버튼 이벤트
    const confirmBtn = modal.element.querySelector('[data-action="confirm"]');
    const cancelBtn = modal.element.querySelector('[data-action="cancel"]');

    confirmBtn.addEventListener('click', () => {
      modal.close();
      resolve(true);
    });

    cancelBtn.addEventListener('click', () => {
      modal.close();
      resolve(false);
    });

    modal.open();
  });
}

/**
 * 알림 모달
 * @param {Object} options - 옵션
 * @returns {Promise<void>}
 */
export function alert(options = {}) {
  return new Promise((resolve) => {
    const modal = new Modal({
      title: options.title || '알림',
      content: options.message || '',
      footer: `
        <button class="btn btn--primary" data-action="ok">확인</button>
      `,
      onClose: () => resolve(),
      ...options
    });

    modal.render();

    // 확인 버튼 이벤트
    const okBtn = modal.element.querySelector('[data-action="ok"]');
    okBtn.addEventListener('click', () => {
      modal.close();
      resolve();
    });

    modal.open();
  });
}
