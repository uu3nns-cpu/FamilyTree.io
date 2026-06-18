// ============================================================================
// PROJECTS MANAGER - 최대 9개 프로젝트 관리
// ============================================================================

const MAX_PROJECTS = 9;
const STORAGE_KEY = 'projects'; // canvas.js / index.js 와 동일한 키

let projects = [];
let currentDeleteId = null;

// ============================================================================
// 초기화
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    loadProjects();
    renderProjects();
});

// ============================================================================
// 로컬 스토리지 관리
// ============================================================================

function loadProjects() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            projects = Array.isArray(parsed) ? parsed : [];
        }
    } catch (error) {
        console.error('Failed to load projects:', error);
        projects = [];
    }

    // 9개 초과 방어 처리: 가장 최근 수정 순으로 MAX_PROJECTS개만 유지
    if (projects.length > MAX_PROJECTS) {
        const getTime = (p) => new Date(p.modifiedAt || p.timestamp || p.createdAt || 0).getTime();
        projects = [...projects]
            .sort((a, b) => getTime(b) - getTime(a))
            .slice(0, MAX_PROJECTS);
        saveProjects();
    }
}

function saveProjects() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    } catch (error) {
        console.error('Failed to save projects:', error);
        alert('프로젝트 저장에 실패했습니다.');
    }
}

// ============================================================================
// 프로젝트 렌더링
// ============================================================================

function renderProjects() {
    const grid = document.getElementById('projectsGrid');
    if (!grid) return;
    grid.innerHTML = '';

    // 배열 자체를 MAX_PROJECTS로 한번 더 방어 (renderProjects 직접 호출 경우 대비)
    const displayProjects = projects.slice(0, MAX_PROJECTS);

    if (displayProjects.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📂</div>
                <p class="empty-state-text">저장된 프로젝트가 없습니다.</p>
                <p class="empty-state-sub">캔버스에서 작업 후 프로젝트를 저장해보세요.</p>
            </div>
        `;
        return;
    }

    displayProjects.forEach((project) => {
        const card = createProjectCard(project);
        grid.appendChild(card);
    });
}

function createProjectCard(project) {
    const card = document.createElement('div');
    card.className = 'project-card';
    card.onclick = () => loadProject(project.id);

    // 날짜 포맷
    const rawDate = project.modifiedAt || project.timestamp || project.createdAt;
    const date = rawDate ? new Date(rawDate) : new Date();
    const formattedDate = date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    // 요약 정보
    const personCount = project.personCount ?? 0;
    const relCount    = project.relationshipCount ?? 0;
    const summary     = project.summary || `인물 ${personCount}명 · 관계 ${relCount}개`;

    card.innerHTML = `
        <div class="project-thumbnail" id="thumb-${project.id}"></div>
        <div class="project-info">
            <div class="project-name" title="${escapeHtml(project.name)}">${escapeHtml(project.name)}</div>
            <div class="project-meta">${escapeHtml(summary)}</div>
            <div class="project-date">마지막 수정: ${formattedDate}</div>
        </div>
        <div class="project-actions" onclick="event.stopPropagation()">
            <button class="btn btn-ghost btn-sm" onclick="renameProject('${project.id}')">이름 변경</button>
            <button class="btn btn-ghost btn-sm" onclick="deleteProject('${project.id}')">삭제</button>
        </div>
    `;

    // 썸네일 채우기
    const thumbEl = card.querySelector('.project-thumbnail');
    if (project.thumbnailData) {
        // base64 이미지가 있으면 img 태그로 표시
        const img = document.createElement('img');
        img.src = project.thumbnailData;
        img.alt = project.name;
        // 로드 에러 시 플레이스홀더로 폴백
        img.onerror = () => {
            thumbEl.innerHTML = '';
            setThumbPlaceholder(thumbEl, project.thumbnailColor);
        };
        thumbEl.appendChild(img);
    } else {
        setThumbPlaceholder(thumbEl, project.thumbnailColor);
    }

    return card;
}

/** 썸네일 플레이스홀더 설정 */
function setThumbPlaceholder(thumbEl, color) {
    // 프로젝트 고유 색상이 있으면 배경에 적용, 없으면 테마 기본값 사용
    if (color) {
        thumbEl.style.background = color;
    }
    const placeholder = document.createElement('div');
    placeholder.className = 'project-thumbnail-placeholder';
    placeholder.textContent = '📊';
    thumbEl.appendChild(placeholder);
}

/** HTML 이스케이프 헬퍼 */
function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ============================================================================
// 프로젝트 작업
// ============================================================================

function loadProject(projectId) {
    window.location.href = `canvas.html?project=${projectId}`;
}

function deleteProject(projectId) {
    currentDeleteId = projectId;
    document.getElementById('deleteModal').classList.add('show');
}

function confirmDelete() {
    if (!currentDeleteId) return;
    projects = projects.filter(p => p.id !== currentDeleteId);
    saveProjects();
    renderProjects();
    closeDeleteModal();
}

function closeDeleteModal() {
    currentDeleteId = null;
    document.getElementById('deleteModal').classList.remove('show');
}

function renameProject(projectId) {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    const newName = prompt('새 프로젝트 이름을 입력하세요:', project.name);
    if (newName && newName.trim()) {
        project.name = newName.trim();
        saveProjects();
        renderProjects();
    }
}

// ============================================================================
// 새 프로젝트 저장 (canvas.html에서 호출됨)
// ============================================================================

function openSaveModal() {
    if (projects.length >= MAX_PROJECTS) {
        alert(`최대 ${MAX_PROJECTS}개의 프로젝트만 저장할 수 있습니다.\n기존 프로젝트를 삭제한 후 다시 시도해주세요.`);
        return;
    }
    document.getElementById('saveModal').classList.add('show');
    document.getElementById('projectNameInput').value = '';
    document.getElementById('projectNameInput').focus();
}

function closeSaveModal() {
    document.getElementById('saveModal').classList.remove('show');
}

function saveProject() {
    const nameInput = document.getElementById('projectNameInput');
    const name = nameInput.value.trim();

    if (!name) {
        alert('프로젝트 이름을 입력해주세요.');
        nameInput.focus();
        return;
    }

    window.opener?.postMessage({ type: 'SAVE_PROJECT_REQUEST', name }, '*');
    closeSaveModal();
    alert('프로젝트가 저장되었습니다.');
}

// ============================================================================
// 외부에서 프로젝트 저장 (canvas.html에서 호출)
// ============================================================================

window.saveProjectFromCanvas = function(projectData) {
    if (projects.length >= MAX_PROJECTS) {
        return { success: false, message: `최대 ${MAX_PROJECTS}개의 프로젝트만 저장할 수 있습니다.` };
    }

    // 중복 이름 처리
    const existingNames = projects.map(p => p.name);
    let finalName = projectData.name;
    let counter = 1;
    while (existingNames.includes(finalName)) {
        finalName = `${projectData.name} (${counter++})`;
    }

    const newProject = {
        id: generateProjectId(),
        name: finalName,
        timestamp: new Date().toISOString(),
        data: projectData.data,
        summary: projectData.summary || '',
        thumbnailColor: projectData.thumbnailColor || generateThumbnailColor(),
        thumbnailData: projectData.thumbnailData || null
    };

    projects.push(newProject);
    saveProjects();

    return { success: true, message: '프로젝트가 저장되었습니다.', projectId: newProject.id };
};

// ============================================================================
// 프로젝트 데이터 가져오기
// ============================================================================

window.getProjectData = function(projectId) {
    const project = projects.find(p => p.id === projectId);
    return project ? project.data : null;
};

// ============================================================================
// 유틸리티
// ============================================================================

function generateProjectId() {
    return `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateThumbnailColor() {
    const hue = Math.floor(Math.random() * 360);
    return `hsl(${hue}, 50%, 40%)`;
}

// ============================================================================
// 전역 함수 노출
// ============================================================================

window.openSaveModal    = openSaveModal;
window.closeSaveModal   = closeSaveModal;
window.saveProject      = saveProject;
window.deleteProject    = deleteProject;
window.confirmDelete    = confirmDelete;
window.closeDeleteModal = closeDeleteModal;
window.renameProject    = renameProject;
