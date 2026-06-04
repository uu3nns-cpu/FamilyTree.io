/**
 * ConfirmDialog - 브라우저 기본 confirm() 대체 커스텀 모달
 * [FIX UI-01] confirm()/alert() → 커스텀 UI
 *
 * 사용법:
 *   ConfirmDialog.show('삭제하시겠습니까?', () => { ... });
 *   ConfirmDialog.show('삭제하시겠습니까?', onConfirm, { label: '삭제', danger: true });
 */

export class ConfirmDialog {
  /**
   * 확인 모달 표시 (정적 메서드)
   * @param {string} message - 확인 메시지
   * @param {Function} onConfirm - 확인 시 콜백
   * @param {object} [options]
   * @param {string} [options.label='삭제'] - 확인 버튼 레이블
   * @param {boolean} [options.danger=true] - 위험 동작 여부 (빨간 버튼)
   */
  static show(message, onConfirm, { label = '삭제', danger = true } = {}) {
    // 기존 모달 제거 (중복 방지)
    const existing = document.getElementById('customConfirmModal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'customConfirmModal';
    overlay.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:99999',
      'display:flex', 'align-items:center', 'justify-content:center',
      'background:rgba(0,0,0,0.5)'
    ].join(';');

    const confirmBtnStyle = danger
      ? 'background:var(--color-danger,#ef4444);color:#fff;border:none;border-radius:var(--radius-sm,4px);padding:0.4rem 1rem;font-size:0.875rem;font-weight:600;cursor:pointer;'
      : 'background:var(--color-primary,#3b82f6);color:#fff;border:none;border-radius:var(--radius-sm,4px);padding:0.4rem 1rem;font-size:0.875rem;font-weight:600;cursor:pointer;';

    const cancelBtnStyle = [
      'background:transparent',
      'color:var(--color-text-secondary,#888)',
      'border:1px solid var(--color-border-primary,#444)',
      'border-radius:var(--radius-sm,4px)',
      'padding:0.4rem 1rem',
      'font-size:0.875rem',
      'font-weight:600',
      'cursor:pointer'
    ].join(';');

    overlay.innerHTML = `
      <div style="
        background:var(--color-bg-secondary,#1e1e1e);
        border:1px solid var(--color-border-primary,#333);
        border-radius:var(--radius-md,8px);
        padding:1.5rem;
        max-width:360px;
        width:90%;
        box-shadow:0 8px 32px rgba(0,0,0,0.4);
      ">
        <p style="margin:0 0 1.25rem;font-size:0.95rem;color:var(--color-text-primary,#f1f1f1);line-height:1.55;">
          ${message}
        </p>
        <div style="display:flex;gap:0.75rem;justify-content:flex-end;">
          <button id="confirmCancel" style="${cancelBtnStyle}">취소</button>
          <button id="confirmOk" style="${confirmBtnStyle}">${label}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const close = () => overlay.remove();

    overlay.querySelector('#confirmCancel').addEventListener('click', close);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });
    overlay.querySelector('#confirmOk').addEventListener('click', () => {
      close();
      onConfirm();
    });

    // 키보드 접근성
    overlay.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
      if (e.key === 'Enter') {
        close();
        onConfirm();
      }
    });

    // 포커스 확인 버튼으로
    overlay.querySelector('#confirmOk').focus();
  }
}
