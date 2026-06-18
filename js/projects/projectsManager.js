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
            // storage 유틸이 JSON.stringify 로 저장하므로 파싱 후 배열 보장
            projects = Array.isArray(parsed) ? parsed : [];
        }
    } catch (error) {
        console.error('Failed to load projects:', error);
        projects = [];
    }

    // [BUG FIX] 어떤 경로로든(예: canvas.js의 신규 프로젝트 자동 생성 등)
    // 9개를 초과해 저장된 경우를 대비한 방어적 정리.
    // 가장 최근에 수정된 MAX_PROJECTS개만 남기고 나머지는 제거한 뒤 다시 저장한다.
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

    // canvas.js 는 modifiedAt 사용, projectsManager 자체 저장은 timestamp 사용
    const rawDate = project.modifiedAt || project.timestamp || project.createdAt;
    const date = rawDate ? new Date(rawDate) : new Date();
    const formattedDate = date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    // 인물 수 / 관계 수 (canvas.js 저장 형식)
    const personCount = project.personCount ?? 0;
    const relCount = project.relationshipCount ?? 0;
    const summary = project.summary || `인물 ${personCount}명 · 관계 ${relCount}개`;

    card.innerHTML = `
        <div class="project-thumbnail" id="thumb-${project.id}">
        </div>
        <div class="project-info">
            <div class="project-name" title="${project.name}">${project.name}</div>
            <div class="project-meta">${summary}</div>
            <div class="project-date">마지막 수정: ${formattedDate}</div>
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

    // 쓸네일: thumbnailData 시 img 태그, 아니면 색상 배경 + 아이콘
    const thumbEl = card.querySelector('.project-thumbnail');
    if (project.thumbnailData) {
        const img = document.createElement('img');
        img.src = project.thumbnailData;
        img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;border-radius:10px;';
        img.alt = project.name;
        thumbEl.appendChild(img);
    } else {
        thumbEl.style.background = project.thumbnailColor || '#334155';
        thumbEl.style.display = 'flex';
        thumbEl.style.alignItems = 'center';
        thumbEl.style.justifyContent = 'center';
        thumbEl.style.fontSize = '2.5rem';
        thumbEl.textContent = '📊';
    }
    return card;
}



// ============================================================================
// 프로젝트 작업
// ============================================================================

function loadProject(projectId) {
    // canvas.js 는 URL 파라미터 ?project= 로 ID를 받음
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
