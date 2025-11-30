/**
 * ShortcutsModal - 키보드 단축키 가이드
 */

import { Modal } from '../Modal.js';

export class ShortcutsModal {
  constructor() {
    this.modal = null;
  }

  /**
   * 모달 열기
   */
  open() {
    const content = this._generateContent();
    const footer = this._generateFooter();

    this.modal = new Modal({
      title: '⌨️ 키보드 단축키',
      content: content,
      footer: footer,
      className: 'shortcuts-modal',
      onClose: () => this._cleanup()
    });

    this.modal.render();
    this.modal.open();
  }

  /**
   * 콘텐츠 생성
   */
  _generateContent() {
    return `
      <div class="shortcuts-content">
        <!-- 일반 -->
        <div class="shortcuts-section">
          <h3 class="shortcuts-section__title">일반</h3>
          <div class="shortcuts-list">
            <div class="shortcut-item">
              <div class="shortcut-item__keys">
                <kbd class="kbd">Ctrl</kbd> + <kbd class="kbd">S</kbd>
              </div>
              <span class="shortcut-item__desc">저장</span>
            </div>
            <div class="shortcut-item">
              <div class="shortcut-item__keys">
                <kbd class="kbd">Ctrl</kbd> + <kbd class="kbd">Z</kbd>
              </div>
              <span class="shortcut-item__desc">실행 취소</span>
            </div>
            <div class="shortcut-item">
              <div class="shortcut-item__keys">
                <kbd class="kbd">Ctrl</kbd> + <kbd class="kbd">Shift</kbd> + <kbd class="kbd">Z</kbd>
              </div>
              <span class="shortcut-item__desc">다시 실행</span>
            </div>
          </div>
        </div>

        <!-- 도구 -->
        <div class="shortcuts-section">
          <h3 class="shortcuts-section__title">도구</h3>
          <div class="shortcuts-list">
            <div class="shortcut-item">
              <div class="shortcut-item__keys">
                <kbd class="kbd">V</kbd>
              </div>
              <span class="shortcut-item__desc">선택 도구</span>
            </div>
            <div class="shortcut-item">
              <div class="shortcut-item__keys">
                <kbd class="kbd">H</kbd>
              </div>
              <span class="shortcut-item__desc">팬 도구</span>
            </div>
            <div class="shortcut-item">
              <div class="shortcut-item__keys">
                <kbd class="kbd">P</kbd>
              </div>
              <span class="shortcut-item__desc">인물 추가</span>
            </div>
            <div class="shortcut-item">
              <div class="shortcut-item__keys">
                <kbd class="kbd">R</kbd>
              </div>
              <span class="shortcut-item__desc">관계 추가</span>
            </div>
          </div>
        </div>

        <!-- 편집 -->
        <div class="shortcuts-section">
          <h3 class="shortcuts-section__title">편집</h3>
          <div class="shortcuts-list">
            <div class="shortcut-item">
              <div class="shortcut-item__keys">
                <kbd class="kbd">Delete</kbd>
              </div>
              <span class="shortcut-item__desc">삭제</span>
            </div>
            <div class="shortcut-item">
              <div class="shortcut-item__keys">
                <span class="shortcut-item__action">더블클릭</span>
              </div>
              <span class="shortcut-item__desc">편집</span>
            </div>
          </div>
        </div>

        <!-- 캔버스 -->
        <div class="shortcuts-section">
          <h3 class="shortcuts-section__title">캔버스</h3>
          <div class="shortcuts-list">
            <div class="shortcut-item">
              <div class="shortcut-item__keys">
                <kbd class="kbd">+</kbd> / <kbd class="kbd">-</kbd>
              </div>
              <span class="shortcut-item__desc">확대/축소</span>
            </div>
            <div class="shortcut-item">
              <div class="shortcut-item__keys">
                <kbd class="kbd">0</kbd>
              </div>
              <span class="shortcut-item__desc">100% 재설정</span>
            </div>
          </div>
        </div>

        <!-- 팁 -->
        <div class="shortcuts-tip">
          <span class="shortcuts-tip__icon">💡</span>
          <div class="shortcuts-tip__content">
            <strong>팁:</strong> 마우스만으로도 모든 작업이 가능합니다!
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 푸터 생성
   */
  _generateFooter() {
    return `
      <button class="btn btn--primary" data-action="close">확인</button>
    `;
  }

  /**
   * 정리
   */
  _cleanup() {
    this.modal = null;
  }
}
