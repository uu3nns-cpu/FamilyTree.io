/**
 * ExportValidator - 내보내기 관련 검증 유틸리티
 * 
 * 책임:
 * - 파일명 검증
 * - 파일명 정제
 */

export class ExportValidator {
  /**
   * 파일명 검증
   * 
   * @param {string} filename - 검증할 파일명
   * @returns {Object} { valid: boolean, error?: string }
   */
  static validateFilename(filename) {
    // 빈 파일명
    if (!filename || filename.trim() === '') {
      return { 
        valid: false, 
        error: '파일명을 입력해주세요' 
      };
    }

    // 사용할 수 없는 문자
    const invalidChars = /[<>:"/\\|?*]/;
    if (invalidChars.test(filename)) {
      return { 
        valid: false, 
        error: '파일명에 사용할 수 없는 문자가 있습니다 (< > : " / \\ | ? *)' 
      };
    }

    // 너무 긴 파일명
    if (filename.length > 255) {
      return { 
        valid: false, 
        error: '파일명이 너무 깁니다 (최대 255자)' 
      };
    }

    return { valid: true };
  }

  /**
   * 파일명 정제 (사용 불가능한 문자 제거)
   * 
   * @param {string} filename - 정제할 파일명
   * @returns {string} 정제된 파일명
   */
  static sanitizeFilename(filename) {
    return filename
      .replace(/[<>:"/\\|?*]/g, '_') // 불가능한 문자를 언더스코어로 치환
      .trim()
      .substring(0, 255); // 최대 길이 제한
  }

  /**
   * 확장자 추가 (없으면)
   * 
   * @param {string} filename - 파일명
   * @param {string} extension - 확장자 (예: 'png', 'svg')
   * @returns {string} 확장자가 추가된 파일명
   */
  static ensureExtension(filename, extension) {
    const ext = extension.startsWith('.') ? extension : `.${extension}`;
    
    if (filename.toLowerCase().endsWith(ext.toLowerCase())) {
      return filename;
    }
    
    return filename + ext;
  }
}
