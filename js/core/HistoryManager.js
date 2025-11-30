/**
 * HistoryManager - 실행 취소/다시 실행 관리
 */

export class HistoryManager {
  constructor(maxHistory = 50) {
    this.maxHistory = maxHistory;
    this.history = [];
    this.currentIndex = -1;
  }

  /**
   * 새 상태 저장
   */
  push(state) {
    // 현재 위치 이후의 히스토리 제거
    this.history = this.history.slice(0, this.currentIndex + 1);

    // 새 상태 추가
    this.history.push(this._cloneState(state));
    this.currentIndex++;

    // 최대 히스토리 제한
    if (this.history.length > this.maxHistory) {
      this.history.shift();
      this.currentIndex--;
    }
  }

  /**
   * 실행 취소
   */
  undo() {
    if (!this.canUndo()) {
      return null;
    }

    this.currentIndex--;
    return this._cloneState(this.history[this.currentIndex]);
  }

  /**
   * 다시 실행
   */
  redo() {
    if (!this.canRedo()) {
      return null;
    }

    this.currentIndex++;
    return this._cloneState(this.history[this.currentIndex]);
  }

  /**
   * 실행 취소 가능 여부
   */
  canUndo() {
    return this.currentIndex > 0;
  }

  /**
   * 다시 실행 가능 여부
   */
  canRedo() {
    return this.currentIndex < this.history.length - 1;
  }

  /**
   * 현재 상태
   */
  getCurrentState() {
    if (this.currentIndex >= 0 && this.currentIndex < this.history.length) {
      return this._cloneState(this.history[this.currentIndex]);
    }
    return null;
  }

  /**
   * 히스토리 초기화
   */
  clear() {
    this.history = [];
    this.currentIndex = -1;
  }

  /**
   * 히스토리 정보
   */
  getInfo() {
    return {
      total: this.history.length,
      current: this.currentIndex,
      canUndo: this.canUndo(),
      canRedo: this.canRedo()
    };
  }

  /**
   * 상태 복제 (깊은 복사)
   */
  _cloneState(state) {
    return JSON.parse(JSON.stringify(state));
  }
}
