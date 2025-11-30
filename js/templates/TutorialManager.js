/**
 * TutorialManager V2 - 심플하고 명확한 튜토리얼
 */

import { Toast } from '../ui/Toast.js';

export class TutorialManager {
  constructor(canvasState) {
    this.canvasState = canvasState;
    this.currentTutorial = null;
    this.currentStep = 0;
    this.tutorialData = null;
    this.checkInterval = null;
    this.initialPan = null; // 초기 pan 상태 저장
    this.tutorialStartTime = null; // 튜토리얼 시작 시간
    this.initialPersonState = null; // 튜토리얼 시작 시 인물 상태
    this.userInteracted = false; // 사용자 상호작용 여부
  }

  /**
   * 튜토리얼 시작
   */
  start(templateData) {
    if (!templateData.isTutorial) {
      console.warn('이 템플릿은 튜토리얼이 아닙니다.');
      return;
    }

    // 오늘 튜토리얼을 숨기기로 설정했는지 확인
    if (this.shouldHideToday()) {
      console.log('오늘 튜토리얼을 보지 않도록 설정됨');
      return;
    }

    this.currentTutorial = templateData;
    this.tutorialData = templateData.data;
    this.currentStep = 0;
    this.initialPan = { ...this.canvasState.pan }; // 초기 pan 저장
    this.initialZoom = this.canvasState.zoom; // 초기 zoom 저장
    this.tutorialStartTime = Date.now(); // 튜토리얼 시작 시간 기록
    
    // 초기 인물 상태 저장
    this.initialPersonState = this.canvasState.persons.map(p => ({
      id: p.id,
      name: p.name,
      age: p.age,
      gender: p.gender,
      isDeceased: p.isDeceased
    }));

    // 기존 UI 숨기기
    this.hideUIElements();

    // 튜토리얼 UI 생성
    this.createUI();
    
    // 첫 단계 시작
    this.showStep(0);

    console.log('튜토리얼 시작:', templateData.name);
  }

  /**
   * 기존 UI 요소 숨기기 (완전 제거)
   */
  hideUIElements() {
    // tools-panel 제거
    const toolsPanel = document.querySelector('.tools-panel');
    if (toolsPanel) {
      toolsPanel.remove();
    }

    // stats-panel 제거
    const statsPanel = document.querySelector('.stats-panel');
    if (statsPanel) {
      statsPanel.remove();
    }

    // relationship-controls는 유지
    const relControls = document.querySelector('.relationship-controls');
    if (relControls) {
      relControls.style.display = 'none';
    }
  }

  /**
   * 기존 UI 요소 복원 (튜토리얼 종료 시 페이지 새로고침 필요)
   */
  showUIElements() {
    // tools-panel과 stats-panel은 제거되었으므로 복원 불가
    // 페이지 새로고침 필요
    
    // relationship-controls만 복원
    const relControls = document.querySelector('.relationship-controls');
    if (relControls) {
      relControls.style.display = 'flex';
    }
  }

  /**
   * 튜토리얼 UI 생성
   */
  createUI() {
    const totalSteps = this.currentTutorial.tutorialSteps.length;
    
    // 도트 네비게이션 생성
    let dotsHTML = '';
    for (let i = 0; i < totalSteps; i++) {
      dotsHTML += `<div class="tutorial-step-dot" data-step="${i}"></div>`;
    }
    
    // 배경 오버레이
    const overlay = document.createElement('div');
    overlay.id = 'tutorial-overlay';
    overlay.innerHTML = `
      <div class="tutorial-card">
        <div class="tutorial-header">
          <div class="tutorial-step-info">
            <span class="tutorial-step-current">1단계 / ${totalSteps}단계</span>
            <label class="tutorial-hide-today">
              <input type="checkbox" id="tutorialHideToday">
              <span>오늘 더 이상 보지 않기</span>
            </label>
          </div>
          <div class="tutorial-progress-bar">
            <div class="tutorial-progress-fill"></div>
          </div>
        </div>
        
        <div class="tutorial-body">
          <div class="tutorial-icon"></div>
          <div class="tutorial-content">
            <h2 class="tutorial-title">튜토리얼 시작</h2>
            <div class="tutorial-description">가계도 만들기를 시작해봅시다!</div>
          </div>
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

    // 이벤트 리스너
    document.getElementById('tutorialPrev').addEventListener('click', () => this.prevStep());
    document.getElementById('tutorialNext').addEventListener('click', () => this.nextStep());
    
    // "오늘 더 이상 보지 않기" 체크박스 이벤트
    document.getElementById('tutorialHideToday').addEventListener('change', (e) => {
      if (e.target.checked) {
        this.setHideUntilTomorrow();
        this.end();
      }
    });
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

    // UI 업데이트
    const card = document.querySelector('.tutorial-card');
    const progressFill = document.querySelector('.tutorial-progress-fill');
    const stepCurrent = document.querySelector('.tutorial-step-current');
    const icon = document.querySelector('.tutorial-icon');
    const title = document.querySelector('.tutorial-title');
    const description = document.querySelector('.tutorial-description');
    const prevBtn = document.getElementById('tutorialPrev');
    const nextBtn = document.getElementById('tutorialNext');

    // 진행률
    const progress = ((stepIndex + 1) / totalSteps) * 100;
    progressFill.style.width = `${progress}%`;
    stepCurrent.textContent = `${stepIndex + 1}단계 / ${totalSteps}단계`;

    // 내용
    icon.textContent = this.getStepIcon(step);
    title.textContent = step.title;
    description.innerHTML = step.instruction;

    // 이전 버튼 - 첫 단계가 아니면 표시
    if (stepIndex > 0) {
      prevBtn.style.display = 'block';
    } else {
      prevBtn.style.display = 'none';
    }

    // 버튼 - 마지막 단계에서만 "종료하기" 표시
    if (stepIndex === totalSteps - 1) {
      nextBtn.textContent = '완료';
      nextBtn.disabled = false;
    } else {
      nextBtn.textContent = '다음';
      nextBtn.style.display = 'block';
      nextBtn.disabled = false;
    }

    // 애니메이션
    card.classList.remove('tutorial-card--enter');
    setTimeout(() => card.classList.add('tutorial-card--enter'), 10);
  }

  /**
   * 단계별 아이콘
   */
  getStepIcon(step) {
    const icons = {
      'personCount >= 1': '',
      'viewPanned': '',
      'personEdited': '',
      'relationshipCount >= 1': '',
      'emotionalLineCount >= 1': '',
      'complete': ''
    };
    return icons[step.nextCondition] || '';
  }

  /**
   * 조건 체크 시작
   */
  startConditionCheck(condition) {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    console.log('조건 체크 시작:', condition);

    // 즉시 한 번 체크 (이미 충족되어 있을 수 있음)
    const initialCheck = this.checkCondition(condition);
    if (initialCheck) {
      console.log('조건이 이미 충족됨:', condition);
      this.showSuccess(condition);
      
      const nextBtn = document.getElementById('tutorialNext');
      if (nextBtn) {
        nextBtn.textContent = '다음';
        nextBtn.disabled = false;
      }
      return;
    }

    // 조건이 충족되지 않았으면 주기적으로 체크
    this.checkInterval = setInterval(() => {
      const result = this.checkCondition(condition);
      
      if (result) {
        console.log('조건 달성:', condition);
        const relationships = this.canvasState.relationships || [];
        const emotionalLines = relationships.filter(r => r.type === 'emotional');
        console.log('현재 상태:', {
          persons: this.canvasState.persons.length,
          relationships: relationships.length,
          emotionalLines: emotionalLines.length,
          pan: this.canvasState.pan,
          emotionalLinesDetail: emotionalLines.map(r => ({
            from: r.from,
            to: r.to,
            status: r.status,
            notes: r.notes
          }))
        });
        
        clearInterval(this.checkInterval);
        this.checkInterval = null;
        
        // 성공 메시지
        this.showSuccess(condition);
        
        // 다음 버튼 활성화
        const nextBtn = document.getElementById('tutorialNext');
        if (nextBtn) {
          nextBtn.textContent = '다음';
          nextBtn.disabled = false;
        }
      }
    }, 500);
  }

  /**
   * 성공 메시지 표시
   */
  showSuccess(condition) {
    const messages = {
      'personCount >= 1': '첫 번째 인물 추가 완료!',
      'userInteracted': '화면 상호작용 완료!',
      'viewPanned': '화면 이동 완료!',
      'personEdited': '인물 정보 수정 완료!',
      'relationshipCount >= 1': '관계선 연결 완료!',
      'emotionalModeEnabled': '감정선 표시 활성화!',
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
    // 감정선은 relationships 중 type이 'emotional'인 것
    const emotionalLines = relationships.filter(r => r.type === 'emotional');

    switch (condition) {
      case 'personCount >= 1':
        return people.length >= 1;
      
      case 'userInteracted':
        // 사용자가 화면을 움직이거나 확대/축소했는지 확인
        if (!this.initialPan) return false;
        const panChanged = 
          Math.abs(this.canvasState.pan.x - this.initialPan.x) > 10 ||
          Math.abs(this.canvasState.pan.y - this.initialPan.y) > 10;
        const zoomChanged = this.initialZoom && Math.abs(this.canvasState.zoom - this.initialZoom) > 0.05;
        const interacted = panChanged || zoomChanged;
        console.log('사용자 상호작용 체크:', {
          panChanged,
          zoomChanged,
          interacted
        });
        return interacted;
      
      case 'viewPanned':
        // 화면이 이동되었는지 체크 (초기 위치와 다른지)
        if (!this.initialPan) return false;
        const panChanged2 = 
          Math.abs(this.canvasState.pan.x - this.initialPan.x) > 10 ||
          Math.abs(this.canvasState.pan.y - this.initialPan.y) > 10;
        console.log('pan 체크:', {
          initial: this.initialPan,
          current: this.canvasState.pan,
          changed: panChanged2
        });
        return panChanged2;
      
      case 'personEdited':
        // 인물이 편집되었는지 체크 (초기 상태와 비교)
        if (!this.initialPersonState) return false;
        
        return people.some(currentPerson => {
          const initialPerson = this.initialPersonState.find(p => p.id === currentPerson.id);
          
          // 새로 추가된 인물은 확인 안함
          if (!initialPerson) return false;
          
          // 어뗤 속성이라도 변경되었는지 확인
          const nameChanged = currentPerson.name !== initialPerson.name;
          const ageChanged = currentPerson.age !== initialPerson.age;
          const genderChanged = currentPerson.gender !== initialPerson.gender;
          const deceasedChanged = currentPerson.isDeceased !== initialPerson.isDeceased;
          
          const edited = nameChanged || ageChanged || genderChanged || deceasedChanged;
          
          if (edited) {
            console.log('인물 편집 감지:', {
              id: currentPerson.id,
              name: { before: initialPerson.name, after: currentPerson.name, changed: nameChanged },
              age: { before: initialPerson.age, after: currentPerson.age, changed: ageChanged },
              gender: { before: initialPerson.gender, after: currentPerson.gender, changed: genderChanged },
              deceased: { before: initialPerson.isDeceased, after: currentPerson.isDeceased, changed: deceasedChanged }
            });
          }
          
          return edited;
        });
      
      case 'relationshipCount >= 1':
        return relationships.length >= 1;
      
      case 'emotionalModeEnabled':
        // 감정선 표시가 활성화되어 있는지 확인
        if (typeof window !== 'undefined' && window.__appState) {
          const showEmotionalLines = window.__appState.get('settings.showEmotionalLines');
          console.log('감정선 표시 체크:', showEmotionalLines);
          return showEmotionalLines !== false;
        }
        return true;
      
      case 'emotionalLineCount >= 1':
        // 감정선 1개 이상
        console.log('감정선 체크:', emotionalLines.length, emotionalLines);
        return emotionalLines.length >= 1;
      
      // 2번 튜토리얼 전용 조건들
      case 'person-1-deleted':
        // person-1 (증조할아버지)이 삭제되었는지
        return !people.find(p => p.id === 'person-1');
      
      case 'person-10-edited':
        // person-10 (나)이 편집되었는지
        if (!this.initialPersonState) return false;
        const currentPerson = people.find(p => p.id === 'person-10');
        const initialPerson = this.initialPersonState.find(p => p.id === 'person-10');
        if (!currentPerson || !initialPerson) return false;
        
        return currentPerson.name !== initialPerson.name ||
               currentPerson.age !== initialPerson.age ||
               currentPerson.gender !== initialPerson.gender ||
               currentPerson.isDeceased !== initialPerson.isDeceased;
      
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
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    if (this.currentStep > 0) {
      this.showStep(this.currentStep - 1);
    }
  }

  /**
   * 다음 단계
   */
  nextStep() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    
    const steps = this.currentTutorial.tutorialSteps;
    const totalSteps = steps.length;
    
    // 마지막 단계에서는 complete 호출
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
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    // UI 제거
    const overlay = document.getElementById('tutorial-overlay');
    if (overlay) {
      overlay.remove();
    }

    // 기존 UI 복원
    this.showUIElements();

    this.currentTutorial = null;
    this.currentStep = 0;
    this.initialPan = null;
    this.tutorialStartTime = null;
    this.initialPersonState = null;

    console.log('튜토리얼 종료');
  }

  /**
   * 튜토리얼 진행 중인지 확인
   */
  isActive() {
    return this.currentTutorial !== null;
  }

  /**
   * 내일까지 튜토리얼 숨기기 설정
   */
  setHideUntilTomorrow() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0); // 내일 0시로 설정
    
    localStorage.setItem('tutorialHideUntil', tomorrow.getTime().toString());
    console.log('튜토리얼을 내일까지 숨김:', tomorrow.toLocaleString());
    Toast.success('내일부터 다시 튜토리얼이 표시됩니다', 3000);
  }

  /**
   * 오늘 튜토리얼을 숨겨야 하는지 확인
   */
  shouldHideToday() {
    const hideUntil = localStorage.getItem('tutorialHideUntil');
    if (!hideUntil) return false;
    
    const hideUntilTime = parseInt(hideUntil);
    const now = Date.now();
    
    // 현재 시간이 숨기기 종료 시간보다 이전이면 숨김
    if (now < hideUntilTime) {
      return true;
    }
    
    // 시간이 지났으면 저장된 값 제거
    localStorage.removeItem('tutorialHideUntil');
    return false;
  }
}
