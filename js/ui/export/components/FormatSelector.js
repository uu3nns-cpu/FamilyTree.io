/**
 * FormatSelector - PNG/SVG 포맷 선택 컴포넌트
 * 우측 설정 패널용 컴팩트 스타일
 */

export class FormatSelector {
  constructor() {
    this.selectedFormat = 'png';
    this.onChange = null;
  }

  render() {
    return `
      <div class="form-group">
        <label class="label">내보내기 포맷</label>
        <div class="export-format-options">
          ${this._renderOption('png', '🖼️', 'PNG', '고품질 래스터\n(5배 해상도)', true)}
          ${this._renderOption('svg', '🎨', 'SVG', '확대 가능한\n벡터 이미지', false)}
        </div>
      </div>
    `;
  }

  _renderOption(value, icon, title, desc, checked) {
    const activeClass  = checked ? 'export-format-option--active' : '';
    const checkedAttr  = checked ? 'checked' : '';
    const descHtml     = desc.replace('\n', '<br>');

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
            <div class="export-format-option__desc">${descHtml}</div>
          </div>
        </div>
      </label>
    `;
  }

  bindEvents() {
    document.querySelectorAll('input[name="exportFormat"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.selectedFormat = e.target.value;
        this._updateActiveClass();
        if (this.onChange) this.onChange(this.selectedFormat);
      });
    });
  }

  _updateActiveClass() {
    document.querySelectorAll('.export-format-option').forEach(opt => {
      const radio = opt.querySelector('input[type="radio"]');
      opt.classList.toggle('export-format-option--active', !!(radio && radio.checked));
    });
  }

  getSelectedFormat() { return this.selectedFormat; }
  setOnChange(cb)     { this.onChange = cb; }
}
