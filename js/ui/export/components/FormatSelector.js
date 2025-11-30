/**
 * FormatSelector - PNG/SVG 포맷 선택 컴포넌트
 * 
 * 책임:
 * - 내보내기 포맷 선택 UI 렌더링
 * - 선택된 포맷 추적
 * - 포맷 변경 이벤트 처리
 */

export class FormatSelector {
  constructor() {
    this.selectedFormat = 'png';
    this.onChange = null;
  }

  /**
   * HTML 렌더링
   */
  render() {
    return `
      <div class="form-group">
        <label class="label">내보내기 포맷</label>
        <div class="export-format-options">
          ${this._renderOption('png', '🖼️', 'PNG 이미지', '고품질 래스터 이미지 (5배 해상도)', true)}
          ${this._renderOption('svg', '🎨', 'SVG 벡터', '확대/축소 가능한 벡터 이미지', false)}
        </div>
      </div>
    `;
  }

  /**
   * 개별 옵션 렌더링
   */
  _renderOption(value, icon, title, desc, checked) {
    const activeClass = checked ? 'export-format-option--active' : '';
    const checkedAttr = checked ? 'checked' : '';

    return `
      <label class="export-format-option ${activeClass}">
        <input 
          type="radio" 
          name="exportFormat" 
          value="${value}" 
          id="format${value.toUpperCase()}"
          ${checkedAttr}
        />
        <div class="export-format-option__content">
          <div class="export-format-option__icon">${icon}</div>
          <div class="export-format-option__info">
            <div class="export-format-option__title">${title}</div>
            <div class="export-format-option__desc">${desc}</div>
          </div>
        </div>
      </label>
    `;
  }

  /**
   * 이벤트 바인딩
   */
  bindEvents() {
    const radios = document.querySelectorAll('input[name="exportFormat"]');
    
    radios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.selectedFormat = e.target.value;
        this._updateActiveClass();
        
        // 콜백 호출
        if (this.onChange) {
          this.onChange(this.selectedFormat);
        }
      });
    });
  }

  /**
   * 활성화 클래스 업데이트
   */
  _updateActiveClass() {
    const options = document.querySelectorAll('.export-format-option');
    options.forEach(option => {
      const radio = option.querySelector('input[type="radio"]');
      if (radio && radio.checked) {
        option.classList.add('export-format-option--active');
      } else {
        option.classList.remove('export-format-option--active');
      }
    });
  }

  /**
   * 선택된 포맷 가져오기
   */
  getSelectedFormat() {
    return this.selectedFormat;
  }

  /**
   * 포맷 변경 콜백 설정
   */
  setOnChange(callback) {
    this.onChange = callback;
  }
}
