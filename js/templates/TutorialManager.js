/**
 * TutorialManager - 우측 플로팅 모달 튜토리얼
 *
 * 구조:
 * - 화면 우측 상단 플로팅 모달 카드
 * - 캔버스 영역과 겹치지만 클릭 이벤트는 통과
 * - 각 단계는 독립적으로 건너뛸 수 있음
 * - 조건 달성 시 자동으로 다음 버튼 활성화
 */

import { Toast } from '../ui/Toast.js';

export class TutorialManager {
  constructor(canvasState) {
    this.canvasState = canvasState;
    this.currentTutorial = null;
    this.currentStep = 0;
    this.checkInterval = null;

    // 조건 체크에 사용할 초기 스냅샷
    this._snapshot = {
      pan: null,
      zoom: null,
      persons: [],
      parentCount: 0,
    };
  }

  // ─────────────────────────────────────────
  //  Public API
  // ─────────────────────────────────────────

  start(templateData) {
    if (!templateData.isTutorial) return;

    this.currentTutorial = templateData;
    this.currentStep = 0;

    this._takeSnapshot();
    this._createUI();
    this._showStep(0);

    console.log('[Tutorial] 시작:', templateData.name);
  }

  end() {
    this._clearInterval();
    document.getElementById('tut-overlay')?.remove();
    this.currentTutorial = null;
    console.log('[Tutorial] 종료');
  }

  isActive() {
    return this.currentTutorial !== null;
  }

  // ─────────────────────────────────────────
  //  스냅샷
  // ─────────────────────────────────────────

  _takeSnapshot() {
    this._snapshot.pan  = { ...this.canvasState.pan };
    this._snapshot.zoom = this.canvasState.zoom;
    this._snapshot.persons = this.canvasState.persons.map(p => ({
      id: p.id, name: p.name, age: p.age,
      gender: p.gender, isDeceased: p.isDeceased,
    }));

    // 현재 부모-자녀 관계 수 기록 (부모 추가 조건에 사용)
    const ct = this.canvasState.persons.find(p => p.isCT);
    this._snapshot.parentCount = ct
      ? this.canvasState.relationships.filter(
          r => r.type === 'biological' && r.to === ct.id
        ).length
      : 0;
  }

  // ─────────────────────────────────────────
  //  UI 생성
  // ─────────────────────────────────────────

  _createUI() {
    const total = this.currentTutorial.tutorialSteps.length;

    const overlay = document.createElement('div');
    overlay.id = 'tut-overlay';
    overlay.innerHTML = `
      <div class="tut-panel">

        <!-- 헤더 -->
        <div class="tut-header">
          <div class="tut-header__top">
            <span class="tut-badge">📖 튜토리얼</span>
            <button class="tut-exit" id="tutExit" title="튜토리얼 종료">✕ 종료</button>
          </div>
          <div class="tut-progress-wrap">
            <div class="tut-progress-bar">
              <div class="tut-progress-fill" id="tutProgress"></div>
            </div>
            <span class="tut-step-label" id="tutStepLabel">1 / ${total}</span>
          </div>
        </div>

        <!-- 본문 -->
        <div class="tut-body">
          <h2 class="tut-title" id="tutTitle"></h2>
          <div class="tut-content" id="tutContent"></div>
        </div>

        <!-- 조건 상태 -->
        <div class="tut-condition" id="tutCondition" style="display:none;">
          <div class="tut-condition__icon" id="tutCondIcon">⏳</div>
          <span class="tut-condition__text" id="tutCondText"></span>
        </div>

        <!-- 푸터 -->
        <div class="tut-footer">
          <button class="tut-btn tut-btn--ghost" id="tutPrev">← 이전</button>
          <button class="tut-btn tut-btn--ghost" id="tutSkip">건너뛰기</button>
          <button class="tut-btn tut-btn--primary" id="tutNext" disabled>다음 단계 →</button>
        </div>

      </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById('tutExit').addEventListener('click', () => {
      if (confirm('튜토리얼을 종료하시겠습니까?\n언제든지 다시 시작할 수 있습니다.')) {
        this.end();
      }
    });
    document.getElementById('tutPrev').addEventListener('click', () => this._back());
    document.getElementById('tutSkip').addEventListener('click', () => this._advance());
    document.getElementById('tutNext').addEventListener('click', () => this._advance());
  }

  // ─────────────────────────────────────────
  //  단계 렌더링
  // ─────────────────────────────────────────

  _showStep(index) {
    const steps = this.currentTutorial.tutorialSteps;
    if (index >= steps.length) { this._complete(); return; }

    this.currentStep = index;
    const step = steps[index];
    const total = steps.length;

    // 헤더
    const pct = ((index + 1) / total) * 100;
    document.getElementById('tutProgress').style.width = `${pct}%`;
    document.getElementById('tutStepLabel').textContent = `${index + 1} / ${total}`;

    // 본문
    document.getElementById('tutTitle').textContent = step.title;
    document.getElementById('tutContent').innerHTML = step.content;

    // 조건 영역
    const condEl   = document.getElementById('tutCondition');
    const condIcon = document.getElementById('tutCondIcon');
    const condText = document.getElementById('tutCondText');
    const nextBtn  = document.getElementById('tutNext');
    const skipBtn  = document.getElementById('tutSkip');

    const isLast = index === total - 1;
    nextBtn.textContent = isLast ? '🎉 완료!' : '다음 단계 →';

    if (!step.condition || step.condition === 'none') {
      // 조건 없음 → 바로 활성화
      condEl.style.display = 'none';
      nextBtn.disabled = false;
    } else {
      // 조건 있음 → 달성 전까지 비활성화
      condEl.style.display = 'flex';
      condIcon.textContent = '⏳';
      condText.textContent = step.conditionLabel || '조건을 수행해 주세요';
      nextBtn.disabled = true;

      this._clearInterval();
      this._takeSnapshot();

      // 즉시 한 번 체크 후 인터벌
      if (this._check(step.condition)) {
        this._onConditionMet(step);
      } else {
        this.checkInterval = setInterval(() => {
          if (this._check(step.condition)) {
            this._clearInterval();
            this._onConditionMet(step);
          }
        }, 400);
      }
    }

    // 마지막 단계는 건너뛰기 숨김
    skipBtn.style.display = isLast ? 'none' : 'block';

    // 첫 단계는 이전 버튼 숨김
    const prevBtn = document.getElementById('tutPrev');
    if (prevBtn) prevBtn.style.display = index === 0 ? 'none' : 'block';

    // 패널 등장 애니메이션
    const panel = document.querySelector('.tut-panel');
    if (panel) {
      panel.classList.remove('tut-panel--enter');
      requestAnimationFrame(() => panel.classList.add('tut-panel--enter'));
    }
  }

  _onConditionMet(step) {
    const condIcon = document.getElementById('tutCondIcon');
    const condText = document.getElementById('tutCondText');
    const nextBtn  = document.getElementById('tutNext');
    if (!condIcon) return;

    condIcon.textContent = '✅';
    condText.textContent = step.conditionSuccess || '완료!';
    nextBtn.disabled = false;

    // 성공 토스트
    if (step.conditionSuccess) {
      this._showSuccessToast(step.conditionSuccess);
    }
  }

  _advance() {
    this._clearInterval();
    this._showStep(this.currentStep + 1);
  }

  _back() {
    if (this.currentStep === 0) return;
    this._clearInterval();
    this._showStep(this.currentStep - 1);
  }

  _complete() {
    this.end();
    Toast.success('튜토리얼 완료! 이제 자유롭게 가계도를 만들어보세요. 🎉', 5000);
  }

  // ─────────────────────────────────────────
  //  조건 체크
  // ─────────────────────────────────────────

  _check(condition) {
    const persons = this.canvasState.persons;
    const rels    = this.canvasState.relationships;
    const ct      = persons.find(p => p.isCT);

    switch (condition) {

      case 'parents_added': {
        if (!ct) return false;
        const parentRels = rels.filter(
          r => r.type === 'biological' && r.to === ct.id
        );
        return parentRels.length >= this._snapshot.parentCount + 1;
      }

      case 'parent_age_edited': {
        if (!ct) return false;
        const parentRels = rels.filter(
          r => r.type === 'biological' && r.to === ct.id
        );
        return parentRels.some(r => {
          const parent = this.canvasState.getPersonById(r.from);
          if (!parent) return false;
          const snap = this._snapshot.persons.find(p => p.id === parent.id);
          return snap ? parent.age !== snap.age : parent.age !== null;
        });
      }

      case 'sibling_added': {
        if (!ct) return false;
        const snapCount = this._snapshot.persons.length;
        // 여자 형제(sister)가 새로 추가됐는지 확인
        const newPersons = persons.filter(
          p => !this._snapshot.persons.find(s => s.id === p.id)
        );
        return newPersons.some(p => p.gender === 'female');
      }

      case 'sibling_deceased': {
        // 초기 스냅샷에 없던 인물 중 isDeceased=true인 여성이 있는지
        const newPersons = persons.filter(
          p => !this._snapshot.persons.find(s => s.id === p.id)
        );
        const sisters = newPersons.filter(p => p.gender === 'female');
        if (sisters.length === 0) {
          // 스냅샷 이전부터 있던 여성 중 isDeceased가 바뀐 경우도 처리
          return persons.some(p => {
            const snap = this._snapshot.persons.find(s => s.id === p.id);
            return p.gender === 'female' && p.isDeceased &&
              snap && !snap.isDeceased;
          });
        }
        return sisters.some(p => p.isDeceased);
      }

      case 'view_interacted': {
        const pan  = this.canvasState.pan;
        const snap = this._snapshot.pan;
        if (!snap) return false;
        const panMoved = Math.abs(pan.x - snap.x) > 15 ||
                         Math.abs(pan.y - snap.y) > 15;
        const zoomed   = Math.abs(this.canvasState.zoom - (this._snapshot.zoom ?? 1)) > 0.08;
        return panMoved || zoomed;
      }

      case 'none':
      default:
        return true;
    }
  }

  // ─────────────────────────────────────────
  //  유틸
  // ─────────────────────────────────────────

  _clearInterval() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  _showSuccessToast(text) {
    const el = document.createElement('div');
    el.className = 'tut-success-toast';
    el.textContent = `✅ ${text}`;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 300);
    }, 2200);
  }
}
