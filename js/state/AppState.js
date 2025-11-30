/**
 * AppState - 전역 상태 관리
 * 단방향 데이터 흐름을 위한 중앙 상태 저장소
 */

import { getNestedValue, setNestedValue, storage } from '../core/Utils.js';

class AppState {
  constructor() {
    this._state = this._getInitialState();
    this._listeners = new Map();
    this._loadFromStorage();
  }

  /**
   * 초기 상태 정의
   */
  _getInitialState() {
    return {
      // 앱 전역 상태
      app: {
        theme: 'dark',
        language: 'ko',
        isLoading: false
      },

      // 현재 프로젝트
      currentProject: null,

      // 캔버스 상태
      canvas: {
        persons: [],
        relationships: [],
        selectedPersons: [],
        zoom: 1.0,
        pan: { x: 0, y: 0 },
        tool: 'select'
      },

      // 설정
      settings: {
        showNames: true,
        showGrid: 'dotted', // 'none', 'dotted', 'solid'
        showAges: true,
        showDeathDates: false,
        showEmotionalLines: true, // 감정선 표시
        showRelationshipLabels: false,
        enableMagnet: true, // 그리드 자석 기능
        autoSave: true,
        autoSaveInterval: 30000, // 30초
        canvasWidth: 2000,
        canvasHeight: 2000,
        lineWidth: 2 // 선 두께 (기본값: 2)
      }
    };
  }

  /**
   * localStorage에서 상태 불러오기
   */
  _loadFromStorage() {
    const savedSettings = storage.get('app_settings');
    if (savedSettings) {
      // 마이그레이션: 이전 showGrid boolean을 새로운 형식으로 변환
      if (typeof savedSettings.showGrid === 'boolean') {
        savedSettings.showGrid = savedSettings.showGrid ? 'dotted' : 'none';
      }
      // magnetEnabled -> enableMagnet 마이그레이션
      if (savedSettings.magnetEnabled !== undefined && savedSettings.enableMagnet === undefined) {
        savedSettings.enableMagnet = savedSettings.magnetEnabled;
        delete savedSettings.magnetEnabled;
      }
      this._state.settings = { ...this._state.settings, ...savedSettings };
    }

    // 테마는 'theme' 키로도 확인 (headerLoader.js와 동기화)
    const savedTheme = storage.get('theme') || storage.get('app_theme');
    if (savedTheme) {
      this._state.app.theme = savedTheme;
      // 두 키 모두 동기화
      storage.set('theme', savedTheme);
      storage.set('app_theme', savedTheme);
    }
  }

  /**
   * 상태 가져오기
   * @param {string} path - 경로 (예: 'app.theme', 'canvas.persons')
   * @returns {*} 상태 값
   */
  get(path) {
    return getNestedValue(this._state, path);
  }

  /**
   * 상태 설정
   * @param {string} path - 경로
   * @param {*} value - 설정할 값
   */
  set(path, value) {
    const oldValue = this.get(path);
    setNestedValue(this._state, path, value);
    this._notify(path, value, oldValue);
    this._persist(path, value);
  }

  /**
   * 상태 업데이트 (부분 업데이트)
   * @param {string} path - 경로
   * @param {Object} updates - 업데이트할 객체
   */
  update(path, updates) {
    const current = this.get(path);
    if (typeof current === 'object' && current !== null) {
      this.set(path, { ...current, ...updates });
    } else {
      console.warn(`Cannot update non-object value at path: ${path}`);
    }
  }

  /**
   * 상태 변경 구독
   * @param {string} path - 경로
   * @param {Function} callback - 콜백 함수
   * @returns {Function} 구독 해제 함수
   */
  subscribe(path, callback) {
    if (!this._listeners.has(path)) {
      this._listeners.set(path, []);
    }
    this._listeners.get(path).push(callback);

    // 구독 해제 함수 반환
    return () => {
      const listeners = this._listeners.get(path);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }

  /**
   * 리스너에게 변경 알림
   * @param {string} path - 경로
   * @param {*} newValue - 새 값
   * @param {*} oldValue - 이전 값
   */
  _notify(path, newValue, oldValue) {
    if (this._listeners.has(path)) {
      this._listeners.get(path).forEach(callback => {
        try {
          callback(newValue, oldValue);
        } catch (error) {
          console.error(`Error in state listener for "${path}":`, error);
        }
      });
    }
  }

  /**
   * localStorage에 저장
   * @param {string} path - 경로
   * @param {*} value - 값
   */
  _persist(path, value) {
    // settings는 즉시 저장
    if (path.startsWith('settings')) {
      storage.set('app_settings', this._state.settings);
    }

    // theme 저장 (두 키 모두 저장)
    if (path === 'app.theme') {
      storage.set('theme', value);
      storage.set('app_theme', value);
      this._applyTheme(value);
    }
  }

  /**
   * 테마 적용
   * @param {string} theme - 테마 ('dark' | 'light')
   */
  _applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
  }

  /**
   * 상태 초기화
   */
  reset() {
    this._state = this._getInitialState();
    this._notifyAll();
  }

  /**
   * 모든 리스너에게 알림
   */
  _notifyAll() {
    this._listeners.forEach((callbacks, path) => {
      const value = this.get(path);
      callbacks.forEach(callback => {
        try {
          callback(value, undefined);
        } catch (error) {
          console.error(`Error in state listener for "${path}":`, error);
        }
      });
    });
  }

  /**
   * 디버깅: 현재 상태 출력
   */
  debug() {
    console.log('📦 AppState - Current State:', this._state);
    console.log('👂 AppState - Listeners:');
    this._listeners.forEach((callbacks, path) => {
      console.log(`  ${path}: ${callbacks.length} listener(s)`);
    });
  }

  /**
   * 전체 상태를 JSON으로 export
   */
  toJSON() {
    return JSON.parse(JSON.stringify(this._state));
  }

  /**
   * JSON에서 상태 import
   * @param {Object} state - 상태 객체
   */
  fromJSON(state) {
    this._state = { ...this._getInitialState(), ...state };
    this._notifyAll();
  }
}

// 싱글톤 인스턴스 생성 및 export
export const appState = new AppState();

// 개발 모드에서 전역에 노출 (디버깅용)
if (typeof window !== 'undefined') {
  window.__appState = appState;
}
