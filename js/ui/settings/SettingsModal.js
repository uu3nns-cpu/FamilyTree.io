/**
 * SettingsModal - 설정 모달
 */

import { Modal } from '../Modal.js';
import { Toast } from '../Toast.js';
import { appState } from '../../state/AppState.js';

export class SettingsModal {
  constructor() {
    this.modal = null;
    this.settings = appState.get('settings');
    this.canvasPage = null; // canvas 페이지 참조
  }

  /**
   * 모달 열기
   */
  open(canvasPage = null) {
    this.canvasPage = canvasPage;
    const content = this._generateContent();
    const footer = this._generateFooter();

    this.modal = new Modal({
      title: '⚙️ 설정',
      content: content,
      footer: footer,
      className: 'settings-modal',
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
      <div class="settings-form" style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; padding: 8px 0;">
        <!-- 왼쪽 컬럼 -->
        <div>
          <!-- 표시 옵션 -->
          <div class="card" style="margin-bottom: 24px; height: 450px; display: flex; flex-direction: column;">
            <h3 class="settings-section__title" style="margin-bottom: 32px; font-size: var(--font-size-lg); font-weight: var(--font-weight-bold); color: var(--color-text-primary);">표시 옵션</h3>
            
            <div class="settings-item" style="margin-bottom: 32px;">
              <div class="toggle-row">
                <span class="toggle-label">이름 표시</span>
                <label class="toggle">
                  <input 
                    type="checkbox" 
                    id="showNames" 
                    ${this.settings.showNames !== false ? 'checked' : ''}
                  />
                  <span class="toggle-slider"></span>
                </label>
              </div>
            </div>

            <div class="settings-item" style="margin-bottom: 32px;">
              <div class="toggle-row">
                <span class="toggle-label">나이 표시</span>
                <label class="toggle">
                  <input 
                    type="checkbox" 
                    id="showAges" 
                    ${this.settings.showAges !== false ? 'checked' : ''}
                  />
                  <span class="toggle-slider"></span>
                </label>
              </div>
            </div>

            <div class="settings-item" style="margin-bottom: 32px;">
              <div class="toggle-row">
                <span class="toggle-label">사망 표시</span>
                <label class="toggle">
                  <input 
                    type="checkbox" 
                    id="showDeathDates" 
                    ${this.settings.showDeathDates !== false ? 'checked' : ''}
                  />
                  <span class="toggle-slider"></span>
                </label>
              </div>
            </div>

            <div class="settings-item" style="margin-bottom: 32px;">
              <div class="toggle-row">
                <span class="toggle-label">감정선 표시</span>
                <label class="toggle">
                  <input 
                    type="checkbox" 
                    id="showEmotionalLines" 
                    ${this.settings.showEmotionalLines !== false ? 'checked' : ''}
                  />
                  <span class="toggle-slider"></span>
                </label>
              </div>
            </div>

            <div class="settings-item" style="flex: 1;">
              <label class="settings-label" style="margin-bottom: 20px; display: block;">그리드 표시</label>
              <div class="radio-group" style="gap: 12px;">
                <label class="radio-label">
                  <input 
                    type="radio" 
                    name="gridDisplay" 
                    value="none" 
                    ${this.settings.showGrid === 'none' ? 'checked' : ''}
                  />
                  <span>없음</span>
                </label>
                <label class="radio-label">
                  <input 
                    type="radio" 
                    name="gridDisplay" 
                    value="dotted" 
                    ${this.settings.showGrid === 'dotted' ? 'checked' : ''}
                  />
                  <span>점선</span>
                </label>
                <label class="radio-label">
                  <input 
                    type="radio" 
                    name="gridDisplay" 
                    value="solid" 
                    ${this.settings.showGrid === 'solid' ? 'checked' : ''}
                  />
                  <span>실선</span>
                </label>
              </div>
            </div>
          </div>

          <!-- 자동 저장 -->
          <div class="card">
            <h3 class="settings-section__title" style="margin-bottom: 20px; font-size: var(--font-size-lg); font-weight: var(--font-weight-bold); color: var(--color-text-primary);">자동 저장</h3>
            
            <div class="settings-item" style="margin-bottom: 16px;">
              <div class="toggle-row">
                <span class="toggle-label">자동 저장</span>
                <label class="toggle">
                  <input 
                    type="checkbox" 
                    id="autoSave" 
                    ${this.settings.autoSave ? 'checked' : ''}
                  />
                  <span class="toggle-slider"></span>
                </label>
              </div>
            </div>

            <div class="settings-item">
              <label class="settings-label" style="margin-bottom: 12px; display: block;">저장 간격</label>
              <select id="autoSaveInterval" class="input">
                <option value="10000" ${this.settings.autoSaveInterval === 10000 ? 'selected' : ''}>10초</option>
                <option value="30000" ${this.settings.autoSaveInterval === 30000 ? 'selected' : ''}>30초</option>
                <option value="60000" ${(this.settings.autoSaveInterval === 60000 || !this.settings.autoSaveInterval) ? 'selected' : ''}>1분</option>
                <option value="300000" ${this.settings.autoSaveInterval === 300000 ? 'selected' : ''}>5분</option>
              </select>
            </div>
          </div>
        </div>

        <!-- 오른쪽 컬럼 -->
        <div>
          <!-- 캔버스 설정 -->
          <div class="card" style="height: 450px;">
            <h3 class="settings-section__title" style="margin-bottom: 20px; font-size: var(--font-size-lg); font-weight: var(--font-weight-bold); color: var(--color-text-primary);">캔버스 설정</h3>
            
            <div class="settings-item" style="margin-bottom: 16px;">
              <label class="settings-label" style="margin-bottom: 12px; display: block;">기본 선 두께 (도형 및 기본 관계선)</label>
              <div class="button-group" style="display: flex; gap: 8px; margin-bottom: 8px;">
                <button type="button" class="btn btn--secondary btn--sm" data-action="linewidth-decrease">-</button>
                <button type="button" class="btn btn--secondary btn--sm" data-action="linewidth-default">기본</button>
                <button type="button" class="btn btn--secondary btn--sm" data-action="linewidth-increase">+</button>
              </div>
              <div class="settings-value" style="font-size: 14px; color: var(--color-text-secondary);">
                현재: <span id="lineWidthValue">${this.settings.lineWidth || 2}</span>px
              </div>
            </div>

            <div class="settings-item" style="margin-bottom: 16px;">
              <label class="settings-label" style="margin-bottom: 12px; display: block;">감정선 두께</label>
              <div class="button-group" style="display: flex; gap: 8px; margin-bottom: 8px;">
                <button type="button" class="btn btn--secondary btn--sm" data-action="emotional-linewidth-decrease">-</button>
                <button type="button" class="btn btn--secondary btn--sm" data-action="emotional-linewidth-default">기본</button>
                <button type="button" class="btn btn--secondary btn--sm" data-action="emotional-linewidth-increase">+</button>
              </div>
              <div class="settings-value" style="font-size: 14px; color: var(--color-text-secondary);">
                현재: <span id="emotionalLineWidthValue">${this.settings.emotionalLineWidth || 2}</span>px
              </div>
            </div>

            <div class="settings-item" style="margin-bottom: 16px;">
              <label class="settings-label" style="margin-bottom: 12px; display: block;">감정선 투명도</label>
              <div class="button-group" style="display: flex; gap: 8px; margin-bottom: 8px;">
                <button type="button" class="btn btn--secondary btn--sm" data-action="emotional-opacity-decrease">-</button>
                <button type="button" class="btn btn--secondary btn--sm" data-action="emotional-opacity-default">기본</button>
                <button type="button" class="btn btn--secondary btn--sm" data-action="emotional-opacity-increase">+</button>
              </div>
              <div class="settings-value" style="font-size: 14px; color: var(--color-text-secondary);">
                현재: <span id="emotionalOpacityValue">${Math.round((this.settings.emotionalOpacity || 1) * 100)}</span>%
              </div>
            </div>

            <div class="settings-item">
              <div class="toggle-row">
                <span class="toggle-label">자석 모드</span>
                <label class="toggle">
                  <input 
                    type="checkbox" 
                    id="magnetEnabled" 
                    ${this.settings.enableMagnet ? 'checked' : ''}
                  />
                  <span class="toggle-slider"></span>
                </label>
              </div>
            </div>
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
      <button class="btn btn--secondary" data-action="reset">기본값으로 재설정</button>
      <button class="btn btn--secondary" data-action="cancel">취소</button>
      <button class="btn btn--primary" data-action="save">저장</button>
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

    // 재설정 버튼
    element.querySelector('[data-action="reset"]').addEventListener('click', () => {
      this._handleReset();
    });

    // 기본 선 두께 버튼들
    element.querySelector('[data-action="linewidth-decrease"]').addEventListener('click', () => {
      this._adjustLineWidth(-0.5);
    });
    element.querySelector('[data-action="linewidth-default"]').addEventListener('click', () => {
      this._setLineWidth(2);
    });
    element.querySelector('[data-action="linewidth-increase"]').addEventListener('click', () => {
      this._adjustLineWidth(0.5);
    });

    // 감정선 두께 버튼들
    element.querySelector('[data-action="emotional-linewidth-decrease"]').addEventListener('click', () => {
      this._adjustEmotionalLineWidth(-0.5);
    });
    element.querySelector('[data-action="emotional-linewidth-default"]').addEventListener('click', () => {
      this._setEmotionalLineWidth(2);
    });
    element.querySelector('[data-action="emotional-linewidth-increase"]').addEventListener('click', () => {
      this._adjustEmotionalLineWidth(0.5);
    });

    // 감정선 투명도 버튼들
    element.querySelector('[data-action="emotional-opacity-decrease"]').addEventListener('click', () => {
      this._adjustEmotionalOpacity(-0.1);
    });
    element.querySelector('[data-action="emotional-opacity-default"]').addEventListener('click', () => {
      this._setEmotionalOpacity(1);
    });
    element.querySelector('[data-action="emotional-opacity-increase"]').addEventListener('click', () => {
      this._adjustEmotionalOpacity(0.1);
    });
  }

  /**
   * 기본 선 두께 조절
   */
  _adjustLineWidth(delta) {
    const element = this.modal.element;
    const lineWidthValue = element.querySelector('#lineWidthValue');
    let currentWidth = parseFloat(lineWidthValue.textContent);
    let newWidth = Math.max(0.5, Math.min(5, currentWidth + delta)); // 0.5 ~ 5 범위
    newWidth = Math.round(newWidth * 2) / 2; // 0.5 단위로 반올림
    
    lineWidthValue.textContent = newWidth;
    
    // 실시간 렌더링
    appState.set('settings.lineWidth', newWidth);
    if (this.canvasPage) {
      this.canvasPage.render();
    }
  }

  /**
   * 기본 선 두께 설정
   */
  _setLineWidth(width) {
    const element = this.modal.element;
    const lineWidthValue = element.querySelector('#lineWidthValue');
    lineWidthValue.textContent = width;
    
    // 실시간 렌더링
    appState.set('settings.lineWidth', width);
    if (this.canvasPage) {
      this.canvasPage.render();
    }
  }

  /**
   * 감정선 두께 조절
   */
  _adjustEmotionalLineWidth(delta) {
    const element = this.modal.element;
    const lineWidthValue = element.querySelector('#emotionalLineWidthValue');
    let currentWidth = parseFloat(lineWidthValue.textContent);
    let newWidth = Math.max(0.5, Math.min(5, currentWidth + delta)); // 0.5 ~ 5 범위
    newWidth = Math.round(newWidth * 2) / 2; // 0.5 단위로 반올림
    
    lineWidthValue.textContent = newWidth;
    
    // 실시간 렌더링
    appState.set('settings.emotionalLineWidth', newWidth);
    if (this.canvasPage) {
      this.canvasPage.render();
    }
  }

  /**
   * 감정선 두께 설정
   */
  _setEmotionalLineWidth(width) {
    const element = this.modal.element;
    const lineWidthValue = element.querySelector('#emotionalLineWidthValue');
    lineWidthValue.textContent = width;
    
    // 실시간 렌더링
    appState.set('settings.emotionalLineWidth', width);
    if (this.canvasPage) {
      this.canvasPage.render();
    }
  }

  /**
   * 감정선 투명도 조절
   */
  _adjustEmotionalOpacity(delta) {
    const element = this.modal.element;
    const opacityValue = element.querySelector('#emotionalOpacityValue');
    let currentOpacity = parseFloat(opacityValue.textContent) / 100;
    let newOpacity = Math.max(0.1, Math.min(1, currentOpacity + delta)); // 0.1 ~ 1 범위
    newOpacity = Math.round(newOpacity * 10) / 10; // 0.1 단위로 반올림
    
    opacityValue.textContent = Math.round(newOpacity * 100);
    
    // 실시간 렌더링
    appState.set('settings.emotionalOpacity', newOpacity);
    if (this.canvasPage) {
      this.canvasPage.render();
    }
  }

  /**
   * 감정선 투명도 설정
   */
  _setEmotionalOpacity(opacity) {
    const element = this.modal.element;
    const opacityValue = element.querySelector('#emotionalOpacityValue');
    opacityValue.textContent = Math.round(opacity * 100);
    
    // 실시간 렌더링
    appState.set('settings.emotionalOpacity', opacity);
    if (this.canvasPage) {
      this.canvasPage.render();
    }
  }

  /**
   * 저장 처리
   */
  _handleSave() {
    const element = this.modal.element;

    // 값 가져오기
    const newSettings = {
      showNames: element.querySelector('#showNames').checked,
      showAges: element.querySelector('#showAges').checked,
      showDeathDates: element.querySelector('#showDeathDates').checked,
      showEmotionalLines: element.querySelector('#showEmotionalLines').checked,
      showGrid: element.querySelector('input[name="gridDisplay"]:checked').value,
      enableMagnet: element.querySelector('#magnetEnabled').checked,
      autoSave: element.querySelector('#autoSave').checked,
      autoSaveInterval: parseInt(element.querySelector('#autoSaveInterval').value),
      lineWidth: parseFloat(element.querySelector('#lineWidthValue').textContent),
      emotionalLineWidth: parseFloat(element.querySelector('#emotionalLineWidthValue').textContent),
      emotionalOpacity: parseFloat(element.querySelector('#emotionalOpacityValue').textContent) / 100
    };

    // 설정 저장
    appState.set('settings', { ...this.settings, ...newSettings });

    // canvas 페이지가 있으면 즉시 렌더링
    if (this.canvasPage) {
      this.canvasPage.render();
    }

    // 모달 닫기
    this.modal.close();
    Toast.success('설정이 저장되었습니다');

    // 페이지 새로고침이 필요한 경우
    if (this.settings.autoSave !== newSettings.autoSave || 
        this.settings.autoSaveInterval !== newSettings.autoSaveInterval) {
      Toast.info('자동 저장 설정은 페이지 새로고침 후 적용됩니다');
    }
  }

  /**
   * 재설정 처리
   */
  _handleReset() {
    if (confirm('모든 설정을 기본값으로 재설정하시겠습니까?')) {
      // 기본 설정
      const defaultSettings = {
        showNames: true,
        showGrid: 'dotted',
        showAges: true,
        showDeathDates: true,
        showEmotionalLines: true,
        enableMagnet: true,
        autoSave: true,
        autoSaveInterval: 60000,
        lineWidth: 2,
        emotionalLineWidth: 2,
        emotionalOpacity: 1
      };

      appState.set('settings', defaultSettings);
      this.modal.close();
      Toast.success('설정이 초기화되었습니다');
      
      // 페이지 새로고침
      setTimeout(() => {
        location.reload();
      }, 1000);
    }
  }

  /**
   * 정리
   */
  _cleanup() {
    this.modal = null;
    this.canvasPage = null;
  }
}
