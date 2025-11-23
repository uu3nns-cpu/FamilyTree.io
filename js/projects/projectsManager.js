// ============================================================================
// PROJECTS MANAGER - 최대 9개 프로젝트 관리
// ============================================================================

const MAX_PROJECTS = 9;
const STORAGE_KEY = 'genogram_saved_projects';

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
            projects = JSON.parse(stored);
        }
    } catch (error) {
        console.error('Failed to load projects:', error);
        projects = [];
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
    grid.innerHTML = '';

    // 저장된 프로젝트만 렌더링
    projects.forEach((project, index) => {
        const card = createProjectCard(project, index);
        grid.appendChild(card);
    });
}

function createProjectCard(project, index) {
    const card = document.createElement('div');
    card.className = 'project-card';
    card.onclick = () => loadProject(project.id);

    const thumbnailStyle = project.thumbnailData
        ? `background-image:url('${project.thumbnailData}'); background-size: cover; background-position: center;`
        : `background: ${project.thumbnailColor || '#e5e7eb'};`;

    const date = new Date(project.timestamp);
    const formattedDate = date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    card.innerHTML = `
        <div class="project-thumbnail" style="background: ${project.thumbnailColor || '#e5e7eb'}">
            📊
        </div>
        <div class="project-info">
            <div class="project-name" title="${project.name}">${project.name}</div>
            <div class="project-meta">${project.summary || '정보 없음'}</div>
            <div class="project-date">${formattedDate}</div>
        </div>
        <div class="project-actions" onclick="event.stopPropagation()">
            <button class="btn btn-ghost btn-sm" onclick="renameProject('${project.id}')">
                이름 변경
            </button>
            <button class="btn btn-ghost btn-sm" onclick="deleteProject('${project.id}')">
                삭제
            </button>
        </div>
    `;

    const thumbnailElement = card.querySelector('.project-thumbnail');
    if (thumbnailElement) {
        thumbnailElement.style.cssText = thumbnailStyle;
        thumbnailElement.innerHTML = '';
    }
    return card;
}



// ============================================================================
// 프로젝트 작업
// ============================================================================

function loadProject(projectId) {
    // 프로젝트 ID를 세션에 저장하고 캔버스로 이동
    sessionStorage.setItem('loadProjectId', projectId);
    window.location.href = 'canvas.html';
}

function deleteProject(projectId) {
    currentDeleteId = projectId;
    document.getElementById('deleteModalOverlay').classList.add('show');
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
    document.getElementById('deleteModalOverlay').classList.remove('show');
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

    document.getElementById('saveModalOverlay').classList.add('show');
    document.getElementById('projectNameInput').value = '';
    document.getElementById('projectNameInput').focus();
}

function closeSaveModal() {
    document.getElementById('saveModalOverlay').classList.remove('show');
}

function saveProject() {
    const nameInput = document.getElementById('projectNameInput');
    const name = nameInput.value.trim();

    if (!name) {
        alert('프로젝트 이름을 입력해주세요.');
        nameInput.focus();
        return;
    }

    // 현재 작업 내용을 가져오기 위해 postMessage 사용
    window.opener?.postMessage({
        type: 'SAVE_PROJECT_REQUEST',
        name: name
    }, '*');

    closeSaveModal();
    alert('프로젝트가 저장되었습니다.');
}

// ============================================================================
// 외부에서 프로젝트 저장 (canvas.html에서 호출)
// ============================================================================

window.saveProjectFromCanvas = function(projectData) {
    if (projects.length >= MAX_PROJECTS) {
        return {
            success: false,
            message: `최대 ${MAX_PROJECTS}개의 프로젝트만 저장할 수 있습니다.`
        };
    }

    // 중복 이름 확인
    const existingNames = projects.map(p => p.name);
    let finalName = projectData.name;
    let counter = 1;

    while (existingNames.includes(finalName)) {
        finalName = `${projectData.name} (${counter})`;
        counter++;
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

    return {
        success: true,
        message: '프로젝트가 저장되었습니다.',
        projectId: newProject.id
    };
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
    return `hsl(${hue}, 60%, 55%)`;
}

// ============================================================================
// 전역 함수 노출
// ============================================================================

window.openSaveModal = openSaveModal;
window.closeSaveModal = closeSaveModal;
window.saveProject = saveProject;
window.deleteProject = deleteProject;
window.confirmDelete = confirmDelete;
window.closeDeleteModal = closeDeleteModal;
window.renameProject = renameProject;
