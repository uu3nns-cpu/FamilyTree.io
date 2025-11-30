/**
 * FileNameInput - 파일명 입력 컴포넌트
 * 
 * 책임:
 * - 파일명 입력 UI 렌더링
 * - 기본 파일명 생성 (날짜 기반)
 * - 파일명 가져오기
 */

export class FileNameInput {
  constructor() {
    this.defaultName = this._getDefaultName();
  }

  /**
   * HTML 렌더링
   */
  render() {
    return `
      <div class="form-group">
        <label class="label" for="exportFilename">파일명</label>
        <input 
          type="text" 
          id="exportFilename" 
          class="input" 
          value="${this.defaultName}"
          placeholder="파일명을 입력하세요"
        />
        <div class="form-hint">확장자(.png, .svg)는 자동으로 추가됩니다</div>
      </div>
    `;
  }

  /**
   * 입력된 파일명 가져오기
   */
  getValue() {
    const input = document.getElementById('exportFilename');
    return input ? input.value : this.defaultName;
  }

  /**
   * 파일명 설정하기
   */
  setValue(value) {
    const input = document.getElementById('exportFilename');
    if (input) {
      input.value = value;
    }
  }

  /**
   * 기본 파일명 생성 (yyyyMMdd 형식)
   */
  _getDefaultName() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `가계도_${year}${month}${day}`;
  }
}
