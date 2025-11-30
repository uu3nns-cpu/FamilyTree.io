/**
 * EventBus - 중앙 이벤트 시스템
 * 모듈 간 통신을 위한 Pub/Sub 패턴
 */

class EventBus {
  constructor() {
    this.events = new Map();
  }

  /**
   * 이벤트 구독
   * @param {string} event - 이벤트 이름
   * @param {Function} callback - 콜백 함수
   * @returns {Function} 구독 해제 함수
   */
  on(event, callback) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event).push(callback);

    // 구독 해제 함수 반환
    return () => this.off(event, callback);
  }

  /**
   * 이벤트 구독 해제
   * @param {string} event - 이벤트 이름
   * @param {Function} callback - 콜백 함수
   */
  off(event, callback) {
    if (!this.events.has(event)) return;

    const callbacks = this.events.get(event);
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }

    // 콜백이 없으면 이벤트 제거
    if (callbacks.length === 0) {
      this.events.delete(event);
    }
  }

  /**
   * 이벤트 발행
   * @param {string} event - 이벤트 이름
   * @param {*} data - 전달할 데이터
   */
  emit(event, data) {
    if (!this.events.has(event)) return;

    const callbacks = this.events.get(event);
    callbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event handler for "${event}":`, error);
      }
    });
  }

  /**
   * 일회성 이벤트 구독
   * @param {string} event - 이벤트 이름
   * @param {Function} callback - 콜백 함수
   */
  once(event, callback) {
    const wrappedCallback = (data) => {
      callback(data);
      this.off(event, wrappedCallback);
    };
    this.on(event, wrappedCallback);
  }

  /**
   * 모든 이벤트 제거 또는 특정 이벤트의 모든 리스너 제거
   * @param {string} [event] - 이벤트 이름 (옵션)
   */
  clear(event) {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
  }

  /**
   * 디버깅: 모든 이벤트 목록 출력
   */
  debug() {
    console.log('📡 EventBus - Registered Events:');
    this.events.forEach((callbacks, event) => {
      console.log(`  ${event}: ${callbacks.length} listener(s)`);
    });
  }
}

// 싱글톤 인스턴스 생성 및 export
export const eventBus = new EventBus();

// 개발 모드에서 전역에 노출 (디버깅용)
if (typeof window !== 'undefined') {
  window.__eventBus = eventBus;
}
