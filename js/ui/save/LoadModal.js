/**
 * LoadModal - 프로젝트 불러오기 모달
 */

import { Modal } from '../Modal.js';
import { Toast } from '../Toast.js';
import { storage } from '../../core/Utils.js';

export class LoadModal extends Modal {
  constructor(currentProjectId, onLoad) {
    super();
    this.currentProjectId = currentProjectId;
    this.onLoadCallback = onLoad;
  }

  /**
   * 모달 열기
   */
  open() {
    const html = `
      <div class="modal modal--large">
        <div class="modal__overlay"></div>
        <div class="modal__container">
          <div class="modal__header">
            <h2 class="modal__title">프로젝트 불러오기</h2>
            <button class="modal__close" aria-label="닫기">✕</button>
          </div>
          <div class="modal__body">
            <div style="padding: 24px;">
              <p style="margin-bottom: 16px; font-size: 14px; color: var(--color-text-secondary);">
                일시저장된 프로젝트를 선택하여 불러오세요. 현재 작업 중인 내용은 저장되지 않으니 주의하세요.
              </p>
              <div id="projectList" style="max-height: 400px; overflow-y: auto;">
                ${this.renderProjectList()}
              </div>
            </div>
          </div>
          <div class="modal__footer">
            <button class="btn btn--secondary" data-action="cancel">닫기</button>
          </div>
        </div>
      </div>
    `;

    const temp = document.createElement('div');
    temp.innerHTML = html.trim();
    this.element = temp.firstElementChild;

    document.body.appendChild(this.element);
    document.body.style.overflow = 'hidden';

    // 애니메이션
    requestAnimationFrame(() => {
      this.element.classList.add('modal--active');
    });

    this.isOpen = true;

    // 이벤트 바인딩
    this._bindEvents();
  }

  /**
   * 프로젝트 리스트 렌더링
   */
  renderProjectList() {
    const projects = storage.get('projects', []);
    
    // 튜토리얼이 아닌 프로젝트만 필터링하고 수정일 기준 정렬
    const regularProjects = projects
      .filter(p => !p.isTutorial)
      .sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt));

    if (regularProjects.length === 0) {
      return `
        <div style="text-align: center; padding: 60px 20px; color: var(--color-text-tertiary);">
          <div style="font-size: 48px; margin-bottom: 16px;">📁</div>
          <p style="font-size: 14px;">저장된 프로젝트가 없습니다.</p>
        </div>
      `;
    }

    return regularProjects.map(project => {
      const isCurrentProject = project.id === this.currentProjectId;
      const modifiedDate = new Date(project.modifiedAt);
      const modifiedStr = this.formatDate(modifiedDate);

      return `
        <div class="project-item ${isCurrentProject ? 'project-item--current' : ''}" data-project-id="${project.id}">
          <div class="project-item__info">
            <div class="project-item__name">${this.escapeHtml(project.name)}</div>
            <div class="project-item__meta">
              <span>인물 ${project.personCount || 0}명</span>
              <span>•</span>
              <span>관계 ${project.relationshipCount || 0}개</span>
              <span>•</span>
              <span>${modifiedStr}</span>
            </div>
          </div>
          <div class="project-item__actions">
            ${isCurrentProject ? 
              '<span class="project-item__badge">현재 프로젝트</span>' : 
              '<button class="btn btn--sm btn--primary" data-action="load">불러오기</button>'
            }
            <button class="btn btn--sm btn--secondary" data-action="delete" title="삭제">🗑️</button>
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * 이벤트 바인딩
   */
  _bindEvents() {
    // 닫기 버튼
    const closeBtn = this.element.querySelector('.modal__close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }

    // 오버레이 클릭
    const overlay = this.element.querySelector('.modal__overlay');
    if (overlay) {
      overlay.addEventListener('click', () => this.close());
    }

    // 닫기 버튼
    const cancelBtn = this.element.querySelector('[data-action="cancel"]');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.close());
    }

    // 프로젝트 아이템 이벤트
    const projectItems = this.element.querySelectorAll('.project-item');
    projectItems.forEach(item => {
      const projectId = item.dataset.projectId;

      // 불러오기 버튼
      const loadBtn = item.querySelector('[data-action="load"]');
      if (loadBtn) {
        loadBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.handleLoad(projectId);
        });
      }

      // 삭제 버튼
      const deleteBtn = item.querySelector('[data-action="delete"]');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.handleDelete(projectId);
        });
      }
    });

    // ESC 키
    this._escHandler = (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    };
    document.addEventListener('keydown', this._escHandler);
  }

  /**
   * 프로젝트 불러오기
   */
  handleLoad(projectId) {
    if (confirm('현재 작업 중인 내용은 저장되지 않습니다. 계속하시겠습니까?')) {
      if (this.onLoadCallback) {
        this.onLoadCallback(projectId);
      }
      this.close();
    }
  }

  /**
   * 프로젝트 삭제
   */
  handleDelete(projectId) {
    const projects = storage.get('projects', []);
    const project = projects.find(p => p.id === projectId);

    if (!project) return;

    if (confirm(`"${project.name}" 프로젝트를 삭제하시겠습니까?`)) {
      // 프로젝트 목록에서 제거
      const updatedProjects = projects.filter(p => p.id !== projectId);
      storage.set('projects', updatedProjects);

      Toast.success('프로젝트가 삭제되었습니다');

      // 리스트 갱신
      const projectList = this.element.querySelector('#projectList');
      if (projectList) {
        projectList.innerHTML = this.renderProjectList();
        // 이벤트 재바인딩
        this._bindProjectEvents();
      }
    }
  }

  /**
   * 프로젝트 이벤트 재바인딩
   */
  _bindProjectEvents() {
    const projectItems = this.element.querySelectorAll('.project-item');
    projectItems.forEach(item => {
      const projectId = item.dataset.projectId;

      // 불러오기 버튼
      const loadBtn = item.querySelector('[data-action="load"]');
      if (loadBtn) {
        loadBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.handleLoad(projectId);
        });
      }

      // 삭제 버튼
      const deleteBtn = item.querySelector('[data-action="delete"]');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.handleDelete(projectId);
        });
      }
    });
  }

  /**
   * 모달 닫기
   */
  close() {
    if (!this.isOpen) return;

    this.element.classList.remove('modal--active');
    document.body.style.overflow = '';

    // ESC 리스너 제거
    if (this._escHandler) {
      document.removeEventListener('keydown', this._escHandler);
    }

    // 애니메이션 후 제거
    setTimeout(() => {
      if (this.element && this.element.parentNode) {
        this.element.parentNode.removeChild(this.element);
      }
      this.isOpen = false;
    }, 300);
  }

  /**
   * 날짜 포맷
   */
  formatDate(date) {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '방금 전';
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;

    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
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
}
