// ============================================================================
// DASHBOARD SCRIPT
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    const recentContainer = document.querySelector('.recent-list');
    if (!recentContainer) {
        return;
    }

    // 스켈레톤 로딩 표시
    function showSkeletonLoading() {
        if (window.LoadingState) {
            recentContainer.innerHTML = '';
            const skeleton = LoadingState.createSkeleton({ lines: 3, type: 'list' });
            recentContainer.appendChild(skeleton);
        } else {
            recentContainer.innerHTML = '<li class="text-muted small">불러오는 중...</li>';
        }
    }

    // 에러 상태 표시
    function showErrorState(message = '최근 작업을 불러오는 중 오류가 발생했습니다.') {
        if (window.LoadingState) {
            recentContainer.innerHTML = '';
            const errorEl = LoadingState.createInlineError(message);
            const li = document.createElement('li');
            li.appendChild(errorEl);
            recentContainer.appendChild(li);
        } else {
            recentContainer.innerHTML = `<li class="text-muted small">${message}</li>`;
        }
    }

    function formatTimestamp(timestamp) {
        if (!timestamp) {
            return '알 수 없음';
        }
        const date = new Date(timestamp);
        return date.toLocaleString('ko-KR', {
            hour12: false,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // 자동저장 기능 제거됨

    function renderRecentProjects() {
        // GenogramRecentProjects 확인
        if (!window.GenogramRecentProjects) {
            showErrorState('프로젝트 관리 모듈을 불러올 수 없습니다.');
            return;
        }

        try {
            const projects = GenogramRecentProjects.load();
            const entries = projects;

            if (entries.length === 0) {
                recentContainer.innerHTML = `
                    <li class="empty-state" style="padding: 2rem;">
                        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                            <rect x="8" y="12" width="32" height="28" rx="2" stroke="currentColor" stroke-width="2" opacity="0.3"/>
                            <path d="M8 20H40" stroke="currentColor" stroke-width="2" opacity="0.3"/>
                            <path d="M16 16V12" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.3"/>
                            <path d="M32 16V12" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.3"/>
                        </svg>
                        <p>최근 작업이 없습니다</p>
                        <p class="text-muted small">캔버스에서 저장하면 이곳에 나타납니다.</p>
                    </li>
                `;
                return;
            }

            recentContainer.innerHTML = entries.map(project => `
                <li class="recent-item">
                    <button class="btn btn-ghost recent-entry ${project.auto ? 'auto-entry' : ''}" data-project-id="${project.id}" data-action="open">
                        <div class="recent-entry-content">
                            <span class="recent-dot" style="background:${project.thumbnailColor || '#ccc'}"></span>
                        <div class="recent-info">
                            <strong>${escapeHtml(project.name)}</strong>
                            <p class="text-muted recent-summary">${escapeHtml(project.summary || '간단한 미리보기 정보가 없습니다.')}</p>
                            <div class="recent-tags">
                                ${(project.highlights || []).map(tag => `<span class="recent-tag">${escapeHtml(tag)}</span>`).join('')}
                            </div>
                        </div>
                        </div>
                        <span class="text-muted">${formatTimestamp(project.timestamp)}</span>
                    </button>
                    <div class="recent-actions">
                        <button type="button" class="btn btn-link btn-xs ${project.favorite ? 'active' : ''}" data-action="favorite" data-project-id="${project.id}">
                            ${project.favorite ? '★ 즐겨찾기' : '☆ 즐겨찾기'}
                        </button>
                        <button type="button" class="btn btn-link btn-xs" data-action="move-up" data-project-id="${project.id}">위로</button>
                        <button type="button" class="btn btn-link btn-xs" data-action="move-down" data-project-id="${project.id}">아래로</button>
                        <button type="button" class="btn btn-link btn-xs" data-action="rename" data-project-id="${project.id}">이름 변경</button>
                        <button type="button" class="btn btn-link btn-xs btn-danger" data-action="delete" data-project-id="${project.id}">삭제</button>
                    </div>
                </li>
            `).join('');
        } catch (error) {
            console.error('Failed to render recent projects:', error);
            showErrorState('최근 작업을 불러오는 중 오류가 발생했습니다.');
        }
    }

    // HTML 이스케이프 함수
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 초기 로딩 시 스켈레톤 표시 후 렌더링
    showSkeletonLoading();
    
    // 약간의 딜레이 후 실제 데이터 로드 (로딩 효과 체험)
    setTimeout(() => {
        renderRecentProjects();
    }, 300);

    window.addEventListener('recentProjectsUpdated', renderRecentProjects);

    window.addEventListener('storage', (event) => {
        if (event.key === 'genogram_recent_projects') {
            renderRecentProjects();
        }
        if (event.key === 'genogram_snapshot_name') {
            refreshSnapshotInput();
        }
    });

    recentContainer.addEventListener('click', (event) => {
        const actionButton = event.target.closest('button[data-action]');
        if (!actionButton || !window.GenogramRecentProjects) {
            return;
        }

        const projectId = actionButton.dataset.projectId;
        const action = actionButton.dataset.action;
        const projects = GenogramRecentProjects.load();
        const target = projects.find(p => p.id === projectId);
        if (!target) {
            return;
        }

        if (action === 'rename') {
            const currentName = target ? target.name : '';
            const newName = prompt('최근 작업의 새 이름을 입력하세요.', currentName);
            if (newName === null) {
                return;
            }
            GenogramRecentProjects.rename(projectId, newName);
            window.dispatchEvent(new CustomEvent('recentProjectsUpdated', { detail: { id: projectId } }));
            
            // 토스트 알림
            if (window.LoadingState) {
                LoadingState.showToast('이름이 변경되었습니다.', 'success');
            }
        }

        if (action === 'delete') {
            if (!confirm('최근 작업을 삭제하시겠습니까?')) {
                return;
            }
            GenogramRecentProjects.remove(projectId);
            window.dispatchEvent(new CustomEvent('recentProjectsUpdated'));
            
            // 토스트 알림
            if (window.LoadingState) {
                LoadingState.showToast('삭제되었습니다.', 'success');
            }
        }
        if (action === 'favorite') {
            GenogramRecentProjects.toggleFavorite(projectId);
            window.dispatchEvent(new CustomEvent('recentProjectsUpdated'));
        }
        if (action === 'move-up') {
            GenogramRecentProjects.move(projectId, 'up');
            window.dispatchEvent(new CustomEvent('recentProjectsUpdated'));
        }
        if (action === 'move-down') {
            GenogramRecentProjects.move(projectId, 'down');
            window.dispatchEvent(new CustomEvent('recentProjectsUpdated'));
        }
        if (action === 'open') {
            // 로딩 표시
            if (window.LoadingState) {
                LoadingState.showLoading('프로젝트를 불러오는 중...');
            }
            
            localStorage.setItem('genogram_pending_load', projectId);
            location.href = 'canvas.html';
        }
    });

    const snapshotInput = document.getElementById('snapshotNameInput');
    const snapshotButton = document.getElementById('btnSnapshotNameSave');
    const snapshotHint = document.getElementById('snapshotNameFeedback');

    function refreshSnapshotInput() {
        if (!snapshotInput || !window.GenogramProjectNameStore) return;
        snapshotInput.value = GenogramProjectNameStore.load();
        const fallback = GenogramProjectNameStore.generateFallbackName();
        if (snapshotHint) {
            snapshotHint.textContent = snapshotInput.value ? '저장이 설정되어 있습니다.' : `자동 이름: ${fallback}`;
        }
    }

    if (snapshotButton && snapshotInput) {
        snapshotButton.addEventListener('click', () => {
            // 버튼 로딩 상태
            if (window.LoadingState) {
                LoadingState.setButtonLoading(snapshotButton, true);
            }
            
            setTimeout(() => {
                window.GenogramProjectNameStore.persist(snapshotInput.value);
                refreshSnapshotInput();
                
                if (window.LoadingState) {
                    LoadingState.setButtonLoading(snapshotButton, false);
                    LoadingState.showToast('프로젝트 이름이 저장되었습니다.', 'success');
                }
            }, 200);
        });
    }

    refreshSnapshotInput();
});
// ============================================================================
// Auto Save Dashboard Tile
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    const main = document.querySelector('.dashboard-main');
    if (!main) return;

    const sections = main.querySelectorAll('.dashboard-section');
    const recentSection = sections[1];
    if (!recentSection) return;

    const autoSection = document.createElement('section');
    autoSection.className = 'dashboard-section';
    autoSection.innerHTML = `
        <h3>자동 저장 복구</h3>
        <p class="text-muted small" id="autoSaveInfo">자동 저장된 백업이 없습니다.</p>
        <button type="button" class="btn btn-primary btn-sm" id="btnRestoreAutoSave" disabled>자동 저장 복구</button>
    `;

    recentSection.insertAdjacentElement('afterend', autoSection);

    const infoEl = document.getElementById('autoSaveInfo');
    const restoreBtn = document.getElementById('btnRestoreAutoSave');

    function formatTime(date) {
        return new Intl.DateTimeFormat('ko-KR', {
            dateStyle: 'medium',
            timeStyle: 'short'
        }).format(date);
    }

    function refreshAutoSaveInfo() {
        if (!infoEl || !restoreBtn) return;
        const raw = localStorage.getItem('genogram_autosave');
        if (!raw) {
            infoEl.textContent = '자동 저장된 백업이 없습니다.';
            restoreBtn.disabled = true;
            return;
        }
        try {
            const data = JSON.parse(raw);
            const savedAt = new Date(data.metadata.savedAt);
            infoEl.textContent = `마지막 자동 저장: ${formatTime(savedAt)}`;
            restoreBtn.disabled = false;
        } catch {
            infoEl.textContent = '자동 저장 기록을 읽을 수 없습니다.';
            restoreBtn.disabled = true;
        }
    }

    if (restoreBtn) {
        restoreBtn.addEventListener('click', () => {
            localStorage.setItem('genogram_pending_restore', 'true');
            location.href = 'canvas.html';
        });
    }

    window.addEventListener('autoSaveUpdated', refreshAutoSaveInfo);
    window.addEventListener('storage', (event) => {
        if (event.key === 'genogram_autosave') {
            refreshAutoSaveInfo();
        }
    });

    refreshAutoSaveInfo();
});
// ============================================================================
// PROJECT NAME STORE - Shared name preference for snapshots
// ============================================================================
(function () {
    const STORAGE_KEY = 'genogram_snapshot_name';

    function sanitize(value) {
        if (!value) {
            return '';
        }
        return value.toString().trim();
    }

    function load() {
        const raw = localStorage.getItem(STORAGE_KEY);
        return sanitize(raw);
    }

    function persist(value) {
        const sanitized = sanitize(value);
        if (sanitized) {
            localStorage.setItem(STORAGE_KEY, sanitized);
        } else {
            localStorage.removeItem(STORAGE_KEY);
        }
    }

    function generateFallbackName() {
        const now = new Date();
        const parts = [
            now.getFullYear(),
            String(now.getMonth() + 1).padStart(2, '0'),
            String(now.getDate()).padStart(2, '0')
        ];
        const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        return `작업 ${parts.join('-')} ${time}`;
    }

    window.GenogramProjectNameStore = {
        load,
        persist,
        generateFallbackName
    };
}());
/**
 * Template Renderer
 * 템플릿 리스트를 동적으로 렌더링
 */

class TemplateRenderer {
    constructor(containerSelector, templates, categories) {
        this.container = document.querySelector(containerSelector);
        this.templates = templates;
        this.categories = categories;
        this.activeTemplate = null;
    }

    /**
     * 템플릿 리스트 렌더링
     */
    render() {
        if (!this.container) {
            console.error('Template container not found');
            return;
        }

        this.container.innerHTML = '';

        // 카테고리별로 그룹화
        const grouped = this.groupByCategory();
        
        // 카테고리 순서대로 렌더링
        Object.keys(grouped)
            .sort((a, b) => {
                const orderA = this.categories[a]?.order || 999;
                const orderB = this.categories[b]?.order || 999;
                return orderA - orderB;
            })
            .forEach(categoryKey => {
                this.renderCategory(categoryKey, grouped[categoryKey]);
            });
    }

    /**
     * 템플릿을 카테고리별로 그룹화
     */
    groupByCategory() {
        return this.templates.reduce((acc, template) => {
            const category = template.category || 'other';
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(template);
            return acc;
        }, {});
    }

    /**
     * 카테고리 섹션 렌더링
     */
    renderCategory(categoryKey, templates) {
        const category = this.categories[categoryKey];

        // 카테고리 라벨 제거됨
        // if (category && category.label) {
        //     const label = document.createElement('div');
        //     label.className = 'template-category-label';
        //     label.textContent = category.label;
        //     this.container.appendChild(label);
        // }

        // 템플릿 버튼들
        templates.forEach(template => {
            const btn = this.createTemplateButton(template);
            this.container.appendChild(btn);
        });
    }

    /**
     * 템플릿 버튼 생성
     */
    createTemplateButton(template) {
        const btn = document.createElement('button');
        btn.className = 'btn btn-secondary btn-sm template-btn';
        btn.dataset.template = template.id;
        
        if (template.active) {
            btn.classList.add('active');
            this.activeTemplate = template.id;
        }

        // 아이콘
        const icon = document.createElement('div');
        icon.className = 'template-icon';
        icon.textContent = template.icon;

        // 정보
        const info = document.createElement('div');
        info.className = 'template-info';

        const name = document.createElement('div');
        name.className = 'template-name';
        name.textContent = template.name;

        const desc = document.createElement('div');
        desc.className = 'template-desc';
        desc.textContent = template.description;

        info.appendChild(name);
        info.appendChild(desc);

        btn.appendChild(icon);
        btn.appendChild(info);

        // 클릭 이벤트
        btn.addEventListener('click', () => {
            this.selectTemplate(template.id);
        });

        return btn;
    }

    /**
     * 템플릿 선택
     */
    selectTemplate(templateId) {
        // 이전 선택 해제
        const prevActive = this.container.querySelector('.template-btn.active');
        if (prevActive) {
            prevActive.classList.remove('active');
        }

        // 새로운 선택
        const newActive = this.container.querySelector(`[data-template="${templateId}"]`);
        if (newActive) {
            newActive.classList.add('active');
            this.activeTemplate = templateId;
            
            // 커스텀 이벤트 발생
            const event = new CustomEvent('templateSelected', {
                detail: { templateId }
            });
            document.dispatchEvent(event);
        }
    }

    /**
     * 현재 선택된 템플릿 가져오기
     */
    getActiveTemplate() {
        return this.activeTemplate;
    }

    /**
     * 템플릿 검색
     */
    searchTemplates(query) {
        const lowerQuery = query.toLowerCase();
        const buttons = this.container.querySelectorAll('.template-btn');
        
        buttons.forEach(btn => {
            const template = this.templates.find(t => t.id === btn.dataset.template);
            if (!template) return;

            const matches = 
                template.name.toLowerCase().includes(lowerQuery) ||
                template.description.toLowerCase().includes(lowerQuery);
            
            btn.style.display = matches ? 'flex' : 'none';
        });
    }

    /**
     * 카테고리 필터
     */
    filterByCategory(categoryKey) {
        const buttons = this.container.querySelectorAll('.template-btn');
        const labels = this.container.querySelectorAll('.template-category-label');
        
        if (categoryKey === 'all') {
            buttons.forEach(btn => btn.style.display = 'flex');
            labels.forEach(label => label.style.display = 'block');
            return;
        }

        buttons.forEach(btn => {
            const template = this.templates.find(t => t.id === btn.dataset.template);
            btn.style.display = template?.category === categoryKey ? 'flex' : 'none';
        });

        labels.forEach(label => {
            const category = Object.keys(this.categories).find(
                key => this.categories[key].label === label.textContent
            );
            label.style.display = category === categoryKey ? 'block' : 'none';
        });
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TemplateRenderer;
}
