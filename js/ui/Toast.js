/**
 * Toast - 토스트 알림 컴포넌트
 */

export class Toast {
  /**
   * 토스트 표시 (정적 메서드)
   * @param {string} message - 메시지
   * @param {string} type - 타입 (info, success, warning, error)
   * @param {number} duration - 표시 시간 (ms)
   * @returns {Toast} Toast 인스턴스
   */
  static show(message, type = 'info', duration = 5000) {
    const toast = new Toast(message, type, duration);
    toast.show();
    return toast;
  }

  /**
   * 성공 토스트
   */
  static success(message, duration) {
    return Toast.show(message, 'success', duration);
  }

  /**
   * 에러 토스트
   */
  static error(message, duration) {
    return Toast.show(message, 'error', duration);
  }

  /**
   * 경고 토스트
   */
  static warning(message, duration) {
    return Toast.show(message, 'warning', duration);
  }

  /**
   * 정보 토스트
   */
  static info(message, duration) {
    return Toast.show(message, 'info', duration);
  }

  /**
   * @param {string} message - 메시지
   * @param {string} type - 타입
   * @param {number} duration - 표시 시간
   */
  constructor(message, type, duration) {
    this.message = message;
    this.type = type;
    this.duration = duration;
    this.element = null;
    this.timeoutId = null;
  }

  /**
   * 토스트 렌더링
   * @returns {HTMLElement} 토스트 요소
   */
  render() {
    const icons = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌'
    };

    const html = `
      <div class="toast toast--${this.type}">
        <span class="toast__icon">${icons[this.type] || icons.info}</span>
        <span class="toast__message">${this.message}</span>
        <button class="toast__close" aria-label="닫기">×</button>
      </div>
    `;

    const temp = document.createElement('div');
    temp.innerHTML = html.trim();
    this.element = temp.firstElementChild;

    // 닫기 버튼 클릭 이벤트
    const closeBtn = this.element.querySelector('.toast__close');
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.hide();
    });

    return this.element;
  }

  /**
   * 토스트 표시
   */
  show() {
    this.render();

    // 토스트 컨테이너 찾기 또는 생성
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    container.appendChild(this.element);

    // 애니메이션
    requestAnimationFrame(() => {
      this.element.classList.add('toast--active');
    });

    // 자동 제거
    if (this.duration > 0) {
      this.timeoutId = setTimeout(() => {
        this.hide();
      }, this.duration);
    }
  }

  /**
   * 토스트 숨기기
   */
  hide() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    if (!this.element) return;

    this.element.classList.remove('toast--active');

    setTimeout(() => {
      if (this.element && this.element.parentNode) {
        this.element.parentNode.removeChild(this.element);

        // 컨테이너가 비었으면 제거
        const container = document.querySelector('.toast-container');
        if (container && container.children.length === 0) {
          container.remove();
        }
      }
    }, 300);
  }

  /**
   * 토스트 파괴
   */
  destroy() {
    this.hide();
    this.element = null;
  }
}
