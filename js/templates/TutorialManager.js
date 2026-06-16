/**
 * TutorialManager V3 - 우측 사이드바 튜토리얼
 * - 화면 우측에 고정되어 캔버스를 가리지 않음
 * - 헤더에 종료 버튼 포함
 * - 실제 구현과 일치하는 내용
 */

import { Toast } from '../ui/Toast.js';

export class TutorialManager {
  constructor(canvasState) {
    this.canvasState = canvasState;
    this.currentTutorial = null;
    this.currentStep = 0;
    this.tutorialData = null;
    this.checkInterval = null;
    this.initialPan = null;
    this.tutorialStartTime = null;
    this.initialPersonState = null;
    this.userInteracted = false;
  }

  /**
   * 튜토리얼 시작 — 항상 실행
   */
  start(templateData) {
    if (!templateData.isTutorial) {
      console.warn('이 템플릿은 튜토리얼이 아닙니다.');
      return;
    }

    this.currentTutorial = templateData;
    this.tutorialData = templateData.data;
    this.currentStep = 0;
    this.initialPan = { ...this.canvasState.pan };
    this.initialZoom = this.canvasState.zoom;
    this.tutorialStartTime = Date.now();

    this.initialPersonState = this.canvasState.persons.map(p => ({
      id: p.id,
      name: p.name,
      age: p.age,
      gender: p.gender,
      isDeceased: p.isDeceased
    }));

    // 튜토리얼 시작 시점의 감정선 수 기록
    const relationships = this.canvasState.relationships || [];
    this._initialEmotionalCount = relationships.filter(r => r.type === 'emotional').length;

    this.hideUIElements();
    this.createUI();
    this.showStep(0);

    console.log('튜토리얼 시작:', templateData.name);
  }

  /**
   * 기존 UI 요소 숨기기
   */
  hideUIElements() {
    const toolsPanel = document.querySelector('.tools-panel');
    if (toolsPanel) toolsPanel.remove();

    const statsPanel = document.querySelector('.stats-panel');
    if (statsPanel) statsPanel.remove();

    const relControls = document.querySelector('.relationship-controls');
    if (relControls) relControls.style.display = 'none';
  }

  /**
   * 기존 UI 요소 복원
   */
  showUIElements() {
    const relControls = document.querySelector('.relationship-controls');
    if (relControls) relControls.style.display = 'flex';
  }

  /**
   * 튜토리얼 UI 생성
   */
  createUI() {
    const totalSteps = this.currentTutorial.tutorialSteps.length;

    const overlay = document.createElement('div');
    overlay.id = 'tutorial-overlay';
    overlay.innerHTML = `
      <div class="tutorial-card">
        <div class="tutorial-header">
          <div class="tutorial-step-info">
            <span class="tutorial-step-current">1단계 / ${totalSteps}단계</span>
            <button class="tutorial-close-btn" id="tutorialClose">✕ 종료</button>
          </div>
          <div class="tutorial-progress-bar">
            <div class="tutorial-progress-fill"></div>
          </div>
        </div>

        <div class="tutorial-hero">
          <h2 class="tutorial-title">튜토리얼 시작</h2>
        </div>

        <div class="tutorial-body">
          <div class="tutorial-description"></div>
        </div>

        <div class="tutorial-actions">
          <button class="tutorial-btn tutorial-btn--secondary" id="tutorialPrev" style="display: none;">
            이전
          </button>
          <button class="tutorial-btn tutorial-btn--primary" id="tutorialNext">
            다음
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById('tutorialClose').addEventListener('click', () => {
      if (confirm('튜토리얼을 종료하시겠습니까?')) {
        this.end();
      }
    });
    document.getElementById('tutorialPrev').addEventListener('click', () => this.prevStep());
    document.getElementById('tutorialNext').addEventListener('click', () => this.nextStep());
  }

  /**
   * 단계 표시
   */
  showStep(stepIndex) {
    const steps = this.currentTutorial.tutorialSteps;
    if (stepIndex < 0 || stepIndex >= steps.length) {
      this.end();
      return;
    }

    this.currentStep = stepIndex;
    const step = steps[stepIndex];
    const totalSteps = steps.length;

    const progressFill = document.querySelector('.tutorial-progress-fill');
    const stepCurrent = document.querySelector('.tutorial-step-current');
    const title = document.querySelector('.tutorial-title');
    const description = document.querySelector('.tutorial-description');
    const prevBtn = document.getElementById('tutorialPrev');
    const nextBtn = document.getElementById('tutorialNext');
    const card = document.querySelector('.tutorial-card');

    const progress = ((stepIndex + 1) / totalSteps) * 100;
    progressFill.style.width = `${progress}%`;
    // 종료 버튼을 유지하면서 단계 텍스트만 업데이트
    stepCurrent.textContent = `${stepIndex + 1}단계 / ${totalSteps}단계`;

    title.textContent = step.title;
    description.innerHTML = step.instruction;

    prevBtn.style.display = stepIndex > 0 ? 'block' : 'none';

    if (stepIndex === totalSteps - 1) {
      nextBtn.textContent = '완료';
      nextBtn.disabled = false;
    } else {
      nextBtn.textContent = '다음';
      nextBtn.style.display = 'block';
      nextBtn.disabled = false;
    }

    // 조건이 있는 단계는 조건 충족 전까지 다음 버튼 비활성화
    if (step.nextCondition && step.nextCondition !== 'complete') {
      nextBtn.disabled = true;
      this.startConditionCheck(step.nextCondition);
    }

    card.classList.remove('tutorial-card--enter');
    setTimeout(() => card.classList.add('tutorial-card--enter'), 10);
  }

  /**
   * 조건 체크 시작
   */
  startConditionCheck(condition) {
    if (this.checkInterval) clearInterval(this.checkInterval);

    if (this.checkCondition(condition)) {
      this.showSuccess(condition);
      const nextBtn = document.getElementById('tutorialNext');
      if (nextBtn) { nextBtn.disabled = false; }
      return;
    }

    this.checkInterval = setInterval(() => {
      if (this.checkCondition(condition)) {
        clearInterval(this.checkInterval);
        this.checkInterval = null;
        this.showSuccess(condition);
        const nextBtn = document.getElementById('tutorialNext');
        if (nextBtn) { nextBtn.disabled = false; }
      }
    }, 500);
  }

  /**
   * 성공 메시지 표시
   */
  showSuccess(condition) {
    const messages = {
      'personCount >= 13': '새 인물 추가 완료!',
      'userInteracted': '화면 조작 완료!',
      'viewPanned': '화면 이동 완료!',
      'personEdited': '인물 정보 수정 완료!',
      'relationshipCount >= 1': '관계선 연결 완료!',
      'emotionalLineCount >= 1': '감정선 추가 완료!',
      'person-1-deleted': '인물 삭제 완료!',
      'person-10-edited': '인물 수정 완료!',
    };

    if (messages[condition]) {
      const success = document.createElement('div');
      success.className = 'tutorial-success-toast';
      success.textContent = messages[condition];
      document.body.appendChild(success);
      setTimeout(() => success.classList.add('show'), 10);
      setTimeout(() => {
        success.classList.remove('show');
        setTimeout(() => success.remove(), 300);
      }, 2000);
    }
  }

  /**
   * 조건 체크
   */
  checkCondition(condition) {
    const people = this.canvasState.persons || [];
    const relationships = this.canvasState.relationships || [];
    const emotionalLines = relationships.filter(r => r.type === 'emotional');

    switch (condition) {
      case 'personCount >= 13':
        return people.length >= 13;

      case 'userInteracted': {
        if (!this.initialPan) return false;
        const panChanged =
          Math.abs(this.canvasState.pan.x - this.initialPan.x) > 10 ||
          Math.abs(this.canvasState.pan.y - this.initialPan.y) > 10;
        const zoomChanged = this.initialZoom && Math.abs(this.canvasState.zoom - this.initialZoom) > 0.05;
        return panChanged || zoomChanged;
      }

      case 'viewPanned': {
        if (!this.initialPan) return false;
        return (
          Math.abs(this.canvasState.pan.x - this.initialPan.x) > 10 ||
          Math.abs(this.canvasState.pan.y - this.initialPan.y) > 10
        );
      }

      case 'personEdited': {
        if (!this.initialPersonState) return false;
        return people.some(currentPerson => {
          const initialPerson = this.initialPersonState.find(p => p.id === currentPerson.id);
          if (!initialPerson) return false;
          return (
            currentPerson.name !== initialPerson.name ||
            currentPerson.age !== initialPerson.age ||
            currentPerson.gender !== initialPerson.gender ||
            currentPerson.isDeceased !== initialPerson.isDeceased
          );
        });
      }

      case 'relationshipCount >= 1':
        return relationships.length >= 1;

      case 'emotionalLineCount >= 1':
        // 튜토리얼 시작 시점의 감정선 수보다 늘었는지 확인
        return emotionalLines.length >= (this._initialEmotionalCount || 0) + 1;

      case 'person-1-deleted':
        return !people.find(p => p.id === 'person-1');

      case 'person-10-edited': {
        if (!this.initialPersonState) return false;
        const cur = people.find(p => p.id === 'person-10');
        const ini = this.initialPersonState.find(p => p.id === 'person-10');
        if (!cur || !ini) return false;
        return (
          cur.name !== ini.name ||
          cur.age !== ini.age ||
          cur.gender !== ini.gender ||
          cur.isDeceased !== ini.isDeceased
        );
      }

      case 'complete':
        return true;

      default:
        console.warn('알 수 없는 조건:', condition);
        return false;
    }
  }

  /**
   * 이전 단계
   */
  prevStep() {
    if (this.checkInterval) { clearInterval(this.checkInterval); this.checkInterval = null; }
    if (this.currentStep > 0) this.showStep(this.currentStep - 1);
  }

  /**
   * 다음 단계
   */
  nextStep() {
    if (this.checkInterval) { clearInterval(this.checkInterval); this.checkInterval = null; }
    const totalSteps = this.currentTutorial.tutorialSteps.length;
    if (this.currentStep === totalSteps - 1) {
      this.complete();
    } else {
      this.showStep(this.currentStep + 1);
    }
  }

  /**
   * 완료
   */
  complete() {
    this.end();
    Toast.success('튜토리얼을 완료했습니다! 이제 자유롭게 가계도를 만들어보세요.', 5000);
  }

  /**
   * 종료
   */
  end() {
    if (this.checkInterval) clearInterval(this.checkInterval);

    const overlay = document.getElementById('tutorial-overlay');
    if (overlay) overlay.remove();

    this.showUIElements();

    this.currentTutorial = null;
    this.currentStep = 0;
    this.initialPan = null;
    this.tutorialStartTime = null;
    this.initialPersonState = null;
    this._initialEmotionalCount = null;

    console.log('튜토리얼 종료');
  }

  /**
   * 튜토리얼 진행 중인지 확인
   */
  isActive() {
    return this.currentTutorial !== null;
  }
}
