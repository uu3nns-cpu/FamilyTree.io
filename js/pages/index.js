/**
 * Index Page - 메인 페이지 진입점
 */

import { appState } from '../state/AppState.js';
import { Toast } from '../ui/Toast.js';
import { storage } from '../core/Utils.js';
import { TemplateModal } from '../templates/TemplateModal.js';
import { TemplateManager } from '../templates/TemplateManager.js';
import { ShortcutsModal } from '../ui/help/ShortcutsModal.js';

class IndexPage {
  constructor() {
    this.projects = [];
    this.init();
  }

  async init() {
    console.log('📄 Index page initializing...');

    // 테마는 이미 HTML 인라인 스크립트와 headerLoader.js에서 처리됨
    // applyTheme() 호출을 제거하여 중복 적용 방지

    // 프로젝트 목록 로드
    await this.loadProjects();

    // 이벤트 바인딩
    this.bindEvents();

    console.log('✅ Index page ready');
  }

  /**
   * 프로젝트 목록 로드
   */
  async loadProjects() {
    try {
      const projectList = storage.get('projects', []);
      this.projects = projectList;
      this.renderProjects();
    } catch (error) {
      console.error('Failed to load projects:', error);
      Toast.error('프로젝트 목록을 불러오지 못했습니다');
    }
  }

  /**
   * 프로젝트 목록 렌더링
   */
  renderProjects() {
    const grid = document.getElementById('projectsGrid');
    
    if (this.projects.length === 0) {
      // 빈 상태 유지 (HTML에 이미 정의됨)
      return;
    }

    // 최근 6개만 표시
    const recentProjects = this.projects
      .sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt))
      .slice(0, 6);

    grid.innerHTML = recentProjects.map(project => `
      <div class="project-card" data-project-id="${project.id}">
        <div class="project-card__header">
          <div>
            <h3 class="project-card__title">${this.escapeHtml(project.name)}</h3>
            <div class="project-card__meta">
              ${this.formatDate(project.modifiedAt)}에 수정됨
            </div>
          </div>
        </div>
        <div class="project-card__stats">
          <div class="stat-item">
            <span>👤</span>
            <span>${project.personCount || 0}명</span>
          </div>
          <div class="stat-item">
            <span>🔗</span>
            <span>${project.relationshipCount || 0}개</span>
          </div>
        </div>
      </div>
    `).join('');

    // 프로젝트 카드 클릭 이벤트
    grid.querySelectorAll('.project-card').forEach(card => {
      card.addEventListener('click', (e) => {
        const projectId = e.currentTarget.dataset.projectId;
        this.openProject(projectId);
      });
    });
  }

  /**
   * HTML 이스케이프
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * 날짜 포맷
   */
  formatDate(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return '오늘';
    if (days === 1) return '어제';
    if (days < 7) return `${days}일 전`;
    if (days < 30) return `${Math.floor(days / 7)}주 전`;

    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  /**
   * 이벤트 바인딩
   */
  bindEvents() {
    // 공지사항 카드
    const btnNotice = document.getElementById('btnNotice');
    if (btnNotice) {
      btnNotice.addEventListener('click', () => {
        window.location.href = 'notice.html';
      });
    }

    // 새 프로젝트 버튼 (메인 카드)
    const btnNewProject = document.getElementById('btnNewProject');
    if (btnNewProject) {
      btnNewProject.addEventListener('click', () => {
        this.createNewProject();
      });
    }

    // 새 프로젝트 버튼 (빈 상태)
    const btnNewProjectEmpty = document.getElementById('btnNewProjectEmpty');
    if (btnNewProjectEmpty) {
      btnNewProjectEmpty.addEventListener('click', () => {
        this.createNewProject();
      });
    }

    // 후원하기 버튼
    const btnSupport = document.getElementById('btnSupport');
    if (btnSupport) {
      btnSupport.addEventListener('click', () => {
        window.location.href = 'donate.html';
      });
    }

    // 캔버스 카드
    const btnCanvas = document.getElementById('btnCanvas');
    if (btnCanvas) {
      btnCanvas.addEventListener('click', () => {
        window.location.href = 'canvas.html';
      });
    }

    // 가이드 버튼
    const btnGuide = document.getElementById('btnGuide');
    if (btnGuide) {
      btnGuide.addEventListener('click', (e) => {
        e.preventDefault();
        this.showGuide();
      });
    }

    // 단축키 버튼
    const btnShortcuts = document.getElementById('btnShortcuts');
    if (btnShortcuts) {
      btnShortcuts.addEventListener('click', (e) => {
        e.preventDefault();
        this.showShortcuts();
      });
    }
  }

  /**
   * 가이드 표시
   */
  showGuide() {
    Toast.info('사용 가이드는 준비 중입니다', 3000, '튜토리얼을 통해 기능을 익혀보세요!');
  }

  /**
   * 단축키 모달 표시
   */
  showShortcuts() {
    const modal = new ShortcutsModal();
    modal.open();
  }

  /**
   * 새 프로젝트 생성 - 템플릿 선택 모달 표시
   */
  createNewProject() {
    const modal = new TemplateModal((templateId, useTemplate) => {
      this.createProjectWithTemplate(templateId, useTemplate);
    });
    modal.open();
  }

  /**
   * 템플릿을 사용하여 프로젝트 생성
   * @param {string} templateId - 템플릿 ID (빈 문자열이면 빈 프로젝트)
   * @param {boolean} useTemplate - 템플릿 사용 여부
   */
  createProjectWithTemplate(templateId, useTemplate) {
    const projectId = `proj-${Date.now()}`;
    let templateData = null;
    let projectName = '새 프로젝트';
    let personCount = 0;
    let relationshipCount = 0;
    let isTutorial = false;
    let tutorialData = null;

    // 템플릿 사용 시 데이터 로드
    if (useTemplate && templateId) {
      const template = TemplateManager.getTemplateById(templateId);
      if (template) {
        templateData = template.data;
        projectName = `${template.name} 프로젝트`;
        personCount = template.personCount;
        relationshipCount = template.relationshipCount;
        
        // 튜토리얼 템플릿인지 확인
        if (template.isTutorial) {
          isTutorial = true;
          tutorialData = template.tutorialSteps; // tutorialSteps만 저장
          projectName = template.name; // 튜토리얼은 "프로젝트" 접미사 제거
        }
      }
    }

    const newProject = {
      id: projectId,
      name: projectName,
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
      personCount: personCount,
      relationshipCount: relationshipCount,
      templateId: useTemplate ? templateId : null,
      isTutorial: isTutorial,
      tutorialData: tutorialData,
      data: templateData || {
        persons: [],
        relationships: [],
        emotionalLines: [],
        zoom: 1.0,
        pan: { x: 0, y: 0 }
      }
    };

    // 프로젝트 저장
    this.projects.push(newProject);
    storage.set('projects', this.projects);

    // 템플릿 사용 시 토스트 메시지 (튜토리얼은 제외)
    if (useTemplate && !isTutorial) {
      Toast.success(`${projectName}이(가) 생성되었습니다`);
    }

    // 캔버스 페이지로 이동
    window.location.href = `canvas.html?project=${projectId}`;
  }

  /**
   * 프로젝트 열기
   */
  openProject(projectId) {
    window.location.href = `canvas.html?project=${projectId}`;
  }
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
  new IndexPage();
});

// 개발 모드에서 전역에 노출
if (typeof window !== 'undefined') {
  window.__indexPage = IndexPage;
}
