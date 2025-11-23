// ============================================================================
// FILE OPERATIONS - File management (save, load, export)
// ============================================================================

class FileOperations {
    constructor(app) {
        this.app = app;
    }

    // New document
    newDocument() {
        if (confirm('새 문서를 만들시겠습니까? 저장하지 않은 변경사항은 손실됩니다.')) {
            this.app.state.persons = [];
            this.app.state.relationships = [];
            this.app.state.history = [];
            this.app.state.historyIndex = -1;
            this.app.selectionManager.deselectAll();
            
            // Load default template
            this.loadTemplate('blank_canvas');
        }
    }

    // Load template
    loadTemplate(templateName) {
        const template = getTemplate(templateName);
        if (!template) {
            console.error('Template not found:', templateName);
            return;
        }

        const data = template.generate();
        this.app.state.persons = data.persons;
        this.app.state.relationships = data.relationships;

        // Apply layout
        this.app.layout.layout(this.app.state.persons, this.app.state.relationships);

        // Render
        this.app.render();
        
        // CT를 화면 중심에 배치
        this.app.renderer.centerOnCT(this.app.state.persons);

        // Save initial state
        this.app.state.saveState();
        this.app.hasUnsavedChanges = false;
        this.app.updateSaveStatus();

        this.app.toolbar.showToast(`${template.name} 템플릿이 로드되었습니다`, 'success');
    }

    // Save project to projects page (up to 9 projects)
    async saveProjectToManager() {
        const MAX_PROJECTS = 9;
        const STORAGE_KEY = 'genogram_saved_projects';
        
        // 현재 저장된 프로젝트 수 확인
        let projects = [];
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                projects = JSON.parse(stored);
            }
        } catch (error) {
            console.error('Failed to load projects:', error);
        }
        
        // 프로젝트 이름 입력 받기 (9개 제한 확인 전에 먼저 이름 입력)
        const defaultName = document.getElementById('projectNameDisplay')?.textContent.trim() || '';
        const projectName = prompt('프로젝트 이름을 입력하세요:', defaultName !== '제목 없음' ? defaultName : '');

        if (!projectName || !projectName.trim()) {
            return; // 취소 또는 빈 이름
        }

        // 9개 제한 확인 및 경고
        if (projects.length >= MAX_PROJECTS) {
            // 가장 오래된 프로젝트 정보 가져오기
            const oldestProject = projects[0];
            const oldestDate = new Date(oldestProject.timestamp).toLocaleString('ko-KR');

            const confirmMessage = `저장 목록이 최대 ${MAX_PROJECTS}개로 가득 찼습니다.\n\n` +
                `가장 오래된 프로젝트를 덮어쓰시겠습니까?\n\n` +
                `삭제될 프로젝트:\n` +
                `이름: ${oldestProject.name}\n` +
                `저장 시간: ${oldestDate}\n\n` +
                `[확인] 오래된 항목 삭제 후 저장\n` +
                `[취소] 저장 취소`;

            if (!confirm(confirmMessage)) {
                return; // 사용자가 취소를 선택
            }

            // 가장 오래된 프로젝트 제거
            projects.shift();
        }
        
        // 프로젝트 데이터 생성
        const summaryDetails = this.buildSnapshotSummary();
        const projectData = {
            id: this.generateProjectId(),
            name: projectName.trim(),
            timestamp: new Date().toISOString(),
            data: this.app.state.toJSON(),
            summary: summaryDetails.text,
            thumbnailColor: summaryDetails.thumbnailColor
        };
        try {
            const thumbnailData = await this.captureThumbnail();
            if (thumbnailData) {
                projectData.thumbnailData = thumbnailData;
            }
        } catch (error) {
            console.error('Thumbnail capture failed:', error);
        }
        
        // 중복 이름 확인 및 번호 추가
        const existingNames = projects.map(p => p.name);
        let finalName = projectData.name;
        let counter = 1;
        
        while (existingNames.includes(finalName)) {
            finalName = `${projectData.name} (${counter})`;
            counter++;
        }
        
        projectData.name = finalName;
        
        // 프로젝트 저장
        projects.push(projectData);
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
            this.app.toolbar.showToast(`"${finalName}" 프로젝트가 저장되었습니다`, 'success');
            this.app.hasUnsavedChanges = false;
            this.app.updateSaveStatus();
            
            // 프로젝트 이름 표시 업데이트
            const projectNameDisplay = document.getElementById('projectNameDisplay');
            if (projectNameDisplay) {
                projectNameDisplay.textContent = finalName;
            }
        } catch (error) {
            console.error('Failed to save project:', error);
            this.app.toolbar.showToast('프로젝트 저장에 실패했습니다', 'error');
        }
    }
    
    generateProjectId() {
        return `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    // Load project from projects page
    loadProjectFromManager(projectId) {
        const STORAGE_KEY = 'genogram_saved_projects';
        
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (!stored) {
                this.app.toolbar.showToast('저장된 프로젝트를 찾을 수 없습니다', 'error');
                return;
            }
            
            const projects = JSON.parse(stored);
            const project = projects.find(p => p.id === projectId);
            
            if (!project) {
                this.app.toolbar.showToast('프로젝트를 찾을 수 없습니다', 'error');
                return;
            }
            
            // 프로젝트 데이터 로드
            this.app.state.fromJSON(project.data);
            this.app.layout.layout(this.app.state.persons, this.app.state.relationships);
            this.app.render();
            
            // CT를 화면 중심에 배치
            this.app.renderer.centerOnCT(this.app.state.persons);
            
            this.app.state.saveState();
            this.app.hasUnsavedChanges = false;
            this.app.updateSaveStatus();
            
            // 프로젝트 이름 표시
            const projectNameDisplay = document.getElementById('projectNameDisplay');
            if (projectNameDisplay) {
                projectNameDisplay.textContent = project.name;
            }
            
            this.app.toolbar.showToast(`"${project.name}" 프로젝트를 불러왔습니다`, 'success');
        } catch (error) {
            console.error('Failed to load project:', error);
            this.app.toolbar.showToast('프로젝트 로드에 실패했습니다', 'error');
        }
    }

    // Save document
    saveDocument() {
        const data = this.app.state.toJSON();
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `genogram_${Date.now()}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        
        this.app.toolbar.showToast('파일이 저장되었습니다', 'success');
    }

    // Load document
    async loadDocument(file) {
        try {
            const text = await file.text();
            const data = JSON.parse(text);

            this.app.state.fromJSON(data);

            this.app.render();
            
            // CT를 화면 중심에 배치
            this.app.renderer.centerOnCT(this.app.state.persons);
            
            this.app.state.saveState();
            this.app.hasUnsavedChanges = false;
            this.app.updateSaveStatus();
            
            this.app.toolbar.showToast('파일이 로드되었습니다', 'success');
        } catch (error) {
            console.error('Failed to load file:', error);
            this.app.toolbar.showToast('파일 로드에 실패했습니다', 'error');
        }
    }

    // Export document
    exportDocument(format) {
        if (format === 'png') {
            this.exportAsPNG();
        } else if (format === 'svg') {
            this.exportAsSVG();
        } else if (format === 'json') {
            this.saveDocument();
        }
    }

    // =========================================================================
    // RECENT PROJECT / DASHBOARD HOOKS
    // =========================================================================

    saveProjectSnapshot(name) {
        // 프로젝트 이름 가져오기
        const displayedName = document.getElementById('projectNameDisplay')?.textContent.trim();
        const useDisplayedName = displayedName && displayedName !== '제목 없음' && displayedName !== '저장되지 않음';
        
        const preferred = name || (useDisplayedName ? displayedName : (window.GenogramProjectNameStore ? GenogramProjectNameStore.load() : ''));
        const snapshotName = preferred || (window.GenogramProjectNameStore ? GenogramProjectNameStore.generateFallbackName() : `작업 ${new Date().toLocaleString()}`);
        const summaryDetails = this.buildSnapshotSummary();
        const snapshot = {
            id: GenogramRecentProjects.createSnapshotId(),
            name: snapshotName,
            timestamp: new Date().toISOString(),
            data: this.app.state.toJSON(),
            summary: summaryDetails.text,
            thumbnailColor: summaryDetails.thumbnailColor
        };
        snapshot.favorite = false;
        snapshot.highlights = summaryDetails.highlights;

        GenogramRecentProjects.add(snapshot);
        window.dispatchEvent(new CustomEvent('recentProjectsUpdated', { detail: snapshot }));

        if (this.app.toolbar && typeof this.app.toolbar.showToast === 'function') {
            this.app.toolbar.showToast('현재 작업을 최근 작업으로 저장했어요', 'success');
        }

        return snapshot;
    }

    buildSnapshotSummary() {
        const persons = this.app.state.persons.length;
        const relationships = this.app.state.relationships.length;
        const summaryText = `${persons}명 · ${relationships}관계`;
        const hue = (persons * 37 + relationships * 19) % 360;
        const thumbnailColor = `hsl(${hue}, 60%, 55%)`;
        const highlights = [];
        if (persons > 10) {
            highlights.push('대가족');
        }
        if (relationships > persons) {
            highlights.push('풍부한 관계');
        }
        if (this.app.state.selectedEmotionalSubtype && this.app.state.selectedEmotionalSubtype !== 'none') {
            highlights.push('감정 강조');
        }
        if (highlights.length === 0) {
            highlights.push('기본 가계도');
        }
        return { text: summaryText, thumbnailColor, highlights };
    }

    getRecentProjects() {
        return GenogramRecentProjects.load();
    }

    loadProjectSnapshot(snapshotId) {
        const snapshot = GenogramRecentProjects.load().find(item => item.id === snapshotId);
        if (!snapshot) {
            if (this.app.toolbar && typeof this.app.toolbar.showToast === 'function') {
                this.app.toolbar.showToast('최근 작업을 찾을 수 없어요.', 'error');
            }
            return;
        }

        try {
            this.app.state.fromJSON(snapshot.data);
            this.app.layout.layout(this.app.state.persons, this.app.state.relationships);
            this.app.render();
            
            // CT를 화면 중심에 배치
            this.app.renderer.centerOnCT(this.app.state.persons);
            
            this.app.state.saveState();
            this.app.hasUnsavedChanges = false;
            this.app.updateSaveStatus();
            
            // 프로젝트 이름 업데이트
            const projectNameDisplay = document.getElementById('projectNameDisplay');
            if (projectNameDisplay) {
                projectNameDisplay.textContent = snapshot.name;
            }
            if (window.GenogramProjectNameStore) {
                window.GenogramProjectNameStore.persist(snapshot.name);
            }

            if (this.app.toolbar && typeof this.app.toolbar.showToast === 'function') {
                this.app.toolbar.showToast(`'${snapshot.name}' 를 불러왔어요`, 'success');
            }
        } catch (error) {
            console.error('Failed to load snapshot:', error);
            if (this.app.toolbar && typeof this.app.toolbar.showToast === 'function') {
                this.app.toolbar.showToast('최근 작업을 불러오는 중 오류가 생겼어요.', 'error');
            }
        }
    }

    // Export as PNG
    exportAsPNG() {
        const svg = document.getElementById('canvas');
        
        // SVG 복제 (깊은 복사)
        const svgClone = svg.cloneNode(true);
        
        // 원본 SVG에서 스타일 복사
        const originalElements = svg.querySelectorAll('*');
        const clonedElements = svgClone.querySelectorAll('*');
        originalElements.forEach((original, index) => {
            if (clonedElements[index]) {
                const computedStyle = getComputedStyle(original);
                // stroke-width 복사
                if (computedStyle.strokeWidth && computedStyle.strokeWidth !== 'none') {
                    clonedElements[index].style.strokeWidth = computedStyle.strokeWidth;
                }
            }
        });
        
        // xmlns 속성 추가 (필수)
        svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        svgClone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
        
        // main-group의 transform 제거 (zoom/pan 상태 초기화)
        const mainGroup = svgClone.querySelector('#main-group');
        if (mainGroup) {
            mainGroup.removeAttribute('transform');
        }
        
        // 격자 레이어 제거
        const gridLayer = svgClone.querySelector('#layer-grid');
        if (gridLayer) {
            gridLayer.remove();
        }
        
        // 힌트 메시지 제거
        const hints = svgClone.querySelectorAll('.canvas-hint, #canvas-hint');
        hints.forEach(hint => hint.remove());
        
        // 레이어 토글 상태에 따라 요소 제거
        this.applyLayerVisibility(svgClone);
        
        // CSS 스타일을 인라인으로 변환 (fill, stroke 적용)
        this.applyInlineStyles(svgClone);
        
        // 실제 콘텐츠 영역 계산
        const bbox = this.getActualBBox(svgClone);
        
        const padding = 40;
        const exportWidth = bbox.width + padding * 2;
        const exportHeight = bbox.height + padding * 2;
        
        // viewBox와 크기 설정
        svgClone.setAttribute('viewBox', 
            `${bbox.x - padding} ${bbox.y - padding} ${exportWidth} ${exportHeight}`);
        svgClone.setAttribute('width', exportWidth);
        svgClone.setAttribute('height', exportHeight);
        
        // 흰색 배경 추가 (첫 번째 자식으로)
        const background = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        background.setAttribute('x', bbox.x - padding);
        background.setAttribute('y', bbox.y - padding);
        background.setAttribute('width', exportWidth);
        background.setAttribute('height', exportHeight);
        background.setAttribute('fill', 'white');
        svgClone.insertBefore(background, svgClone.firstChild);
        
        // CSS 스타일 시트 추가 (내보내기에 필요한 스타일)
        const styleElement = document.createElementNS('http://www.w3.org/2000/svg', 'style');
        styleElement.textContent = `
            .node-label-name { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                font-size: 14px;
                font-weight: 500;
                text-anchor: middle;
                fill: black;
                dominant-baseline: text-before-edge;
            }
            .node-label-age-center { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                font-size: 16px;
                font-weight: 600;
                text-anchor: middle;
                fill: black;
                dominant-baseline: middle;
            }
            .relationship-line,
            .relationship-connector,
            .parent-child-line,
            .sibling-spine {
                stroke: black;
                stroke-width: 2px;
                fill: none;
            }
            .node-shape {
                fill: white;
                stroke: black;
                stroke-width: 2px;
            }
            .ct-highlight {
                fill: none;
                stroke: black;
                stroke-width: 2px;
            }
            .deceased-x {
                stroke: black;
                stroke-width: 2px;
            }
        `;
        svgClone.insertBefore(styleElement, svgClone.firstChild);
        
        // SVG를 문자열로 변환
        const svgData = new XMLSerializer().serializeToString(svgClone);
        
        // Canvas 생성
        const canvas = document.createElement('canvas');
        canvas.width = exportWidth * 2; // 고해상도를 위해 2배
        canvas.height = exportHeight * 2;
        const ctx = canvas.getContext('2d');
        
        // 흰색 배경 먼저 그리기
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 이미지 생성
        const img = new Image();
        
        img.onload = () => {
            try {
                // 2배 스케일로 그리기 (고해상도)
                ctx.scale(2, 2);
                ctx.drawImage(img, 0, 0, exportWidth, exportHeight);
                
                // PNG로 변환
                canvas.toBlob((blob) => {
                    if (!blob) {
                        console.error('Failed to create blob');
                        this.app.toolbar.showToast('PNG 생성 실패', 'error');
                        return;
                    }
                    
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `genogram_${Date.now()}.png`;
                    a.click();
                    URL.revokeObjectURL(url);
                    
                    this.app.toolbar.showToast('PNG 파일이 내보내졌습니다', 'success');
                }, 'image/png');
            } catch (error) {
                console.error('Canvas drawing failed:', error);
                this.app.toolbar.showToast('PNG 생성 중 오류 발생', 'error');
            }
        };
        
        img.onerror = (error) => {
            console.error('PNG export failed:', error);
            console.error('SVG Data:', svgData.substring(0, 500));
            this.app.toolbar.showToast('PNG 내보내기 실패', 'error');
        };
        
        // SVG를 Data URL로 변환 (더 안전한 방법)
        const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        img.src = url;
        
        // 이미지 로드 후 URL 정리
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    // Get actual bounding box of content (excluding grid and empty space)
    getActualBBox(svgElement) {
        // main-group의 실제 bbox 사용
        const mainGroup = svgElement.querySelector('#main-group');
        if (!mainGroup) {
            console.warn('main-group not found, using default bbox');
            return { x: 0, y: 0, width: 800, height: 600 };
        }
        
        // transform 속성을 파싱하는 헬퍼 함수
        const parseTransform = (transformStr) => {
            if (!transformStr) return { x: 0, y: 0 };
            const match = transformStr.match(/translate\(([^,]+),\s*([^)]+)\)/);
            if (match) {
                return {
                    x: parseFloat(match[1]) || 0,
                    y: parseFloat(match[2]) || 0
                };
            }
            return { x: 0, y: 0 };
        };
        
        try {
            let minX = Infinity;
            let minY = Infinity;
            let maxX = -Infinity;
            let maxY = -Infinity;
            let hasContent = false;
            
            // 1. 노드 레이어에서 모든 genogram-node 처리
            const nodesLayer = mainGroup.querySelector('#layer-nodes');
            if (nodesLayer) {
                const nodes = nodesLayer.querySelectorAll('.genogram-node');
                nodes.forEach(node => {
                    try {
                        const transform = parseTransform(node.getAttribute('transform'));
                        const nodeSize = 60; // 노드 크기
                        const half = nodeSize / 2;
                        
                        // 노드의 실제 위치 (중심 좌표)
                        const x = transform.x;
                        const y = transform.y;
                        
                        // 노드 자체의 영역
                        minX = Math.min(minX, x - half);
                        minY = Math.min(minY, y - half);
                        maxX = Math.max(maxX, x + half);
                        maxY = Math.max(maxY, y + half);
                        
                        // 이름 라벨 영역 (노드 아래 +40)
                        const nameLabel = node.querySelector('.node-label-name');
                        if (nameLabel && nameLabel.textContent.trim()) {
                            const labelY = y + half + 20; // 노드 아래 20px
                            const labelWidth = nameLabel.textContent.length * 8; // 대략적인 텍스트 너비
                            minX = Math.min(minX, x - labelWidth / 2);
                            maxX = Math.max(maxX, x + labelWidth / 2);
                            maxY = Math.max(maxY, labelY + 10); // 텍스트 높이 고려
                        }
                        
                        // 나이 라벨 영역 (노드 중앙 위)
                        const ageLabel = node.querySelector('.node-label-age-center');
                        if (ageLabel && ageLabel.textContent.trim()) {
                            const ageY = y - 25; // 노드 위
                            minY = Math.min(minY, ageY - 10);
                        }
                        
                        hasContent = true;
                    } catch (e) {
                        console.warn('Failed to process node:', e);
                    }
                });
            }
            
            // 2. 관계선 레이어들 처리
            const relationshipLayers = [
                mainGroup.querySelector('#layer-couple'),
                mainGroup.querySelector('#layer-parent-child'),
                mainGroup.querySelector('#layer-emotional')
            ].filter(layer => layer);

            // 3. 범례 레이어 처리 (감정선 범례 포함)
            const legendLayer = mainGroup.querySelector('#layer-legend');
            if (legendLayer) {
                const legendGroup = legendLayer.querySelector('#legend-group');
                if (legendGroup) {
                    try {
                        const bbox = legendGroup.getBBox();
                        const transform = legendGroup.getAttribute('transform');

                        // transform에서 translate 값 추출
                        let translateX = 0, translateY = 0, scale = 1;
                        if (transform) {
                            const translateMatch = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
                            const scaleMatch = transform.match(/scale\(([^)]+)\)/);
                            if (translateMatch) {
                                translateX = parseFloat(translateMatch[1]) || 0;
                                translateY = parseFloat(translateMatch[2]) || 0;
                            }
                            if (scaleMatch) {
                                scale = parseFloat(scaleMatch[1]) || 1;
                            }
                        }

                        // 범례의 실제 위치 계산 (transform 적용)
                        const legendMinX = translateX + (bbox.x * scale);
                        const legendMinY = translateY + (bbox.y * scale);
                        const legendMaxX = translateX + ((bbox.x + bbox.width) * scale);
                        const legendMaxY = translateY + ((bbox.y + bbox.height) * scale);

                        minX = Math.min(minX, legendMinX);
                        minY = Math.min(minY, legendMinY);
                        maxX = Math.max(maxX, legendMaxX);
                        maxY = Math.max(maxY, legendMaxY);
                        hasContent = true;
                    } catch (e) {
                        console.warn('Failed to process legend:', e);
                    }
                }
            }
            
            relationshipLayers.forEach(layer => {
                const lines = layer.querySelectorAll('line, path, polyline');
                lines.forEach(line => {
                    try {
                        // line 요소의 경우
                        if (line.tagName === 'line') {
                            const x1 = parseFloat(line.getAttribute('x1')) || 0;
                            const y1 = parseFloat(line.getAttribute('y1')) || 0;
                            const x2 = parseFloat(line.getAttribute('x2')) || 0;
                            const y2 = parseFloat(line.getAttribute('y2')) || 0;
                            
                            minX = Math.min(minX, x1, x2);
                            minY = Math.min(minY, y1, y2);
                            maxX = Math.max(maxX, x1, x2);
                            maxY = Math.max(maxY, y1, y2);
                            hasContent = true;
                        } else {
                            // path, polyline의 경우 getBBox 사용
                            const bbox = line.getBBox();
                            if (bbox.width > 0 && bbox.height > 0) {
                                minX = Math.min(minX, bbox.x);
                                minY = Math.min(minY, bbox.y);
                                maxX = Math.max(maxX, bbox.x + bbox.width);
                                maxY = Math.max(maxY, bbox.y + bbox.height);
                                hasContent = true;
                            }
                        }
                    } catch (e) {
                        console.warn('Failed to process relationship:', e);
                    }
                });
            });
            
            // 유효한 bbox가 없으면 기본값 반환
            if (!hasContent || minX === Infinity || minY === Infinity) {
                console.warn('No valid content found, using default bbox');
                return { x: 0, y: 0, width: 800, height: 600 };
            }
            
            const width = maxX - minX;
            const height = maxY - minY;
            
            console.log('Calculated bbox:', { x: minX, y: minY, width, height });
            
            return {
                x: minX,
                y: minY,
                width: width,
                height: height
            };
        } catch (error) {
            console.error('Error calculating bbox:', error);
            return { x: 0, y: 0, width: 800, height: 600 };
        }
    }

    // Apply layer visibility based on toggle state
    applyLayerVisibility(svgClone) {
        // 레이어 토글 상태 확인
        const layerToggles = document.querySelectorAll('.layer-toggle-input');
        const layerStates = {};
        
        layerToggles.forEach(toggle => {
            const layerName = toggle.dataset.layer;
            layerStates[layerName] = toggle.checked;
        });
        
        // 이름 레이어가 비활성화되어 있으면 이름 라벨 제거
        if (layerStates.names === false) {
            const nameLabels = svgClone.querySelectorAll('.node-label-name');
            nameLabels.forEach(label => label.remove());
        }
        
        // 나이 레이어가 비활성화되어 있으면 나이 라벨 제거
        if (layerStates.ages === false) {
            const ageLabels = svgClone.querySelectorAll('.node-label-age-center');
            ageLabels.forEach(label => label.remove());
        }
        
        // 인물 레이어가 비활성화되어 있으면 노드 레이어 제거
        if (layerStates.nodes === false) {
            const nodesLayer = svgClone.querySelector('#layer-nodes');
            if (nodesLayer) {
                nodesLayer.remove();
            }
        }
        
        // 관계선 레이어가 비활성화되어 있으면 관계선 레이어들 제거
        if (layerStates.relationships === false) {
            const relationshipLayers = [
                svgClone.querySelector('#layer-parent-child'),
                svgClone.querySelector('#layer-couple')
            ];
            relationshipLayers.forEach(layer => {
                if (layer) layer.remove();
            });
        }
        
        // 감정선 레이어가 비활성화되어 있으면 감정선 레이어 제거
        if (layerStates.emotional === false) {
            const emotionalLayer = svgClone.querySelector('#layer-emotional');
            if (emotionalLayer) {
                emotionalLayer.remove();
            }
        }
        
        // 범례가 비활성화되어 있으면 범례 제거
        if (layerStates.legend === false) {
            const legendGroup = svgClone.querySelector('#legend-group');
            if (legendGroup) {
                legendGroup.remove();
            }
        }
    }
    
    // Apply inline styles to SVG for export
    applyInlineStyles(svgClone) {
        // 원본 SVG 참조
        const originalSvg = document.getElementById('canvas');
        
        // 노드 도형 스타일
        const shapes = svgClone.querySelectorAll('.node-shape');
        shapes.forEach(shape => {
            shape.setAttribute('fill', 'white');
            shape.setAttribute('stroke', 'black');
            shape.setAttribute('stroke-width', '2');
        });
        
        // CT 하이라이트
        const ctHighlights = svgClone.querySelectorAll('.ct-highlight');
        ctHighlights.forEach(highlight => {
            highlight.setAttribute('fill', 'none');
            highlight.setAttribute('stroke', 'black');
            highlight.setAttribute('stroke-width', '2');
        });
        
        // 사망 표시 (X)
        const deceasedMarks = svgClone.querySelectorAll('.deceased-x');
        deceasedMarks.forEach(mark => {
            mark.setAttribute('stroke', 'black');
            mark.setAttribute('stroke-width', '2');
        });
        
        // 관계선 (원본 SVG에서 스타일 가져오기)
        const relationshipLines = svgClone.querySelectorAll('.relationship-line, .relationship-connector, .parent-child-line, .sibling-spine');
        relationshipLines.forEach((line) => {
            line.setAttribute('stroke', 'black');
            line.setAttribute('stroke-width', '2');
            line.setAttribute('fill', 'none');
        });
        
        // 분리/이혼 표시
        const separationMarks = svgClone.querySelectorAll('.separation-mark, .divorce-mark');
        separationMarks.forEach(mark => {
            mark.setAttribute('stroke', 'black');
            mark.setAttribute('stroke-width', '2');
        });
        
        // 감정선
        const emotionalLines = svgClone.querySelectorAll('.emotional-line, .emotional-tick');
        emotionalLines.forEach(line => {
            if (!line.getAttribute('stroke')) {
                const strokeColor = line.style.stroke || '#6b7280';
                line.setAttribute('stroke', strokeColor);
            }
            if (!line.getAttribute('stroke-width')) {
                const strokeWidth = line.style.strokeWidth || '1.5px';
                line.setAttribute('stroke-width', strokeWidth);
            }
            line.setAttribute('fill', 'none');
        });
        
        // 텍스트 라벨 - 명시적으로 속성 설정
        const nameLabels = svgClone.querySelectorAll('.node-label-name');
        nameLabels.forEach(label => {
            label.setAttribute('fill', 'black');
            label.setAttribute('font-family', '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif');
            label.setAttribute('font-size', '14');
            label.setAttribute('font-weight', '500');
            label.setAttribute('text-anchor', 'middle');
        });
        
        const ageLabels = svgClone.querySelectorAll('.node-label-age-center');
        ageLabels.forEach(label => {
            label.setAttribute('fill', 'black');
            label.setAttribute('font-family', '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif');
            label.setAttribute('font-size', '16');
            label.setAttribute('font-weight', '600');
            label.setAttribute('text-anchor', 'middle');
        });
    }

    // Export as SVG
    exportAsSVG() {
        const svg = document.getElementById('canvas');
        
        // SVG 복제
        const svgClone = svg.cloneNode(true);
        
        // xmlns 속성 추가 (필수)
        svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        svgClone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
        
        // main-group의 transform 제거 (zoom/pan 상태 초기화)
        const mainGroup = svgClone.querySelector('#main-group');
        if (mainGroup) {
            mainGroup.removeAttribute('transform');
        }
        
        // 격자 레이어 제거
        const gridLayer = svgClone.querySelector('#layer-grid');
        if (gridLayer) {
            gridLayer.remove();
        }
        
        // 힌트 메시지 제거
        const hints = svgClone.querySelectorAll('.canvas-hint, #canvas-hint');
        hints.forEach(hint => hint.remove());
        
        // 레이어 토글 상태에 따라 요소 제거
        this.applyLayerVisibility(svgClone);
        
        // 실제 콘텐츠 영역 계산
        const bbox = this.getActualBBox(svgClone);
        
        const padding = 40;
        const exportWidth = bbox.width + padding * 2;
        const exportHeight = bbox.height + padding * 2;
        
        // viewBox와 크기 설정
        svgClone.setAttribute('viewBox', 
            `${bbox.x - padding} ${bbox.y - padding} ${exportWidth} ${exportHeight}`);
        svgClone.setAttribute('width', exportWidth);
        svgClone.setAttribute('height', exportHeight);
        
        // 흰색 배경 추가 (첫 번째 자식으로)
        const background = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        background.setAttribute('x', bbox.x - padding);
        background.setAttribute('y', bbox.y - padding);
        background.setAttribute('width', exportWidth);
        background.setAttribute('height', exportHeight);
        background.setAttribute('fill', 'white');
        svgClone.insertBefore(background, svgClone.firstChild);
        
        // CSS 스타일 시트 추가 (내보내기에 필요한 스타일)
        const styleElement = document.createElementNS('http://www.w3.org/2000/svg', 'style');
        styleElement.textContent = `
            .node-label-name { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                font-size: 14px;
                font-weight: 500;
                text-anchor: middle;
                fill: black;
                dominant-baseline: text-before-edge;
            }
            .node-label-age-center { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                font-size: 16px;
                font-weight: 600;
                text-anchor: middle;
                fill: black;
                dominant-baseline: middle;
            }
            .relationship-line,
            .relationship-connector,
            .parent-child-line,
            .sibling-spine {
                stroke: black;
                stroke-width: 2px;
                fill: none;
            }
            .node-shape {
                fill: white;
                stroke: black;
                stroke-width: 2px;
            }
            .ct-highlight {
                fill: none;
                stroke: black;
                stroke-width: 2px;
            }
            .deceased-x {
                stroke: black;
                stroke-width: 2px;
            }
        `;
        svgClone.insertBefore(styleElement, svgClone.firstChild);
        
        // CSS 스타일을 인라인으로 변환
        this.applyInlineStyles(svgClone);
        
        // SVG를 문자열로 변환
        const svgData = new XMLSerializer().serializeToString(svgClone);
        
        // Blob 생성 및 다운로드
        const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `genogram_${Date.now()}.svg`;
        a.click();
        
        // URL 정리
        setTimeout(() => URL.revokeObjectURL(url), 100);
        
        this.app.toolbar.showToast('SVG 파일이 내보내졌습니다', 'success');
    }

    async captureThumbnail() {
        const svg = document.getElementById('canvas');
        if (!svg) {
            return null;
        }

        try {
            const svgClone = svg.cloneNode(true);

            const mainGroup = svgClone.querySelector('#main-group');
            if (mainGroup) {
                mainGroup.removeAttribute('transform');
            }

            const gridLayer = svgClone.querySelector('#layer-grid');
            if (gridLayer) {
                gridLayer.remove();
            }

            const hints = svgClone.querySelectorAll('.canvas-hint, #canvas-hint');
            hints.forEach(hint => hint.remove());

            this.applyLayerVisibility(svgClone);
            this.applyInlineStyles(svgClone);

            const bbox = this.getActualBBox(svgClone);
            const padding = 20;
            const ctPerson = this.app.state.persons.find(p => p.isCT);
            let ctCenter = null;
            if (ctPerson) {
                const ctNode = svgClone.querySelector(`.genogram-node[data-id="${ctPerson.id}"]`);
                if (ctNode) {
                    const ctBBox = ctNode.getBBox();
                    const transform = ctNode.transform.baseVal.consolidate();
                    const dx = transform ? transform.matrix.e : 0;
                    const dy = transform ? transform.matrix.f : 0;
                    ctCenter = {
                        x: ctBBox.x + ctBBox.width / 2 + dx,
                        y: ctBBox.y + ctBBox.height / 2 + dy
                    };
                }
            }

            const paddedWidth = bbox.width + padding * 2;
            const paddedHeight = bbox.height + padding * 2;

            const halfWidth = ctCenter
                ? Math.max(ctCenter.x - bbox.x, bbox.x + bbox.width - ctCenter.x)
                : bbox.width / 2;
            const halfHeight = ctCenter
                ? Math.max(ctCenter.y - bbox.y, bbox.y + bbox.height - ctCenter.y)
                : bbox.height / 2;

            const centeredWidth = 2 * halfWidth + padding * 2;
            const centeredHeight = 2 * halfHeight + padding * 2;

            const exportWidth = Math.max(140, paddedWidth, centeredWidth);
            const exportHeight = Math.max(140, paddedHeight, centeredHeight);

            const viewCenterX = ctCenter ? ctCenter.x : bbox.x + bbox.width / 2;
            const viewCenterY = ctCenter ? ctCenter.y : bbox.y + bbox.height / 2;
            const viewX = viewCenterX - exportWidth / 2;
            const viewY = viewCenterY - exportHeight / 2;
            svgClone.setAttribute('viewBox',
                `${viewX} ${viewY} ${exportWidth} ${exportHeight}`);
            svgClone.setAttribute('width', exportWidth);
            svgClone.setAttribute('height', exportHeight);

            const background = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            background.setAttribute('x', viewX);
            background.setAttribute('y', viewY);
            background.setAttribute('width', exportWidth);
            background.setAttribute('height', exportHeight);
            background.setAttribute('fill', '#ffffff');
            svgClone.insertBefore(background, svgClone.firstChild);

            const maxDimension = 320;
            const scale = Math.min(1, maxDimension / Math.max(exportWidth, exportHeight));
            const targetWidth = Math.max(96, Math.round(exportWidth * scale));
            const targetHeight = Math.max(96, Math.round(exportHeight * scale));

            const svgData = new XMLSerializer().serializeToString(svgClone);
            const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(blob);

            const canvas = document.createElement('canvas');
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            return await new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                    try {
                        if (scale !== 1) {
                            ctx.drawImage(img, 0, 0, exportWidth, exportHeight, 0, 0, targetWidth, targetHeight);
                        } else {
                            ctx.drawImage(img, 0, 0, exportWidth, exportHeight);
                        }
                        resolve(canvas.toDataURL('image/png'));
                    } catch (error) {
                        console.error('Thumbnail drawing failed:', error);
                        resolve(null);
                    } finally {
                        URL.revokeObjectURL(url);
                    }
                };

                img.onerror = (error) => {
                    console.error('Thumbnail capture failed:', error);
                    URL.revokeObjectURL(url);
                    resolve(null);
                };

                img.src = url;
            });
        } catch (error) {
            console.error('Thumbnail capture failed:', error);
            return null;
        }
    }
}
// ============================================================================
// RECENT PROJECT STORAGE - LocalStorage helpers for dashboard
// ============================================================================

(function () {
    const RECENT_PROJECTS_KEY = 'genogram_recent_projects';
    const MAX_RECENT_PROJECTS = 10;

    function readRecentProjects() {
        const raw = localStorage.getItem(RECENT_PROJECTS_KEY);
        if (!raw) {
            return [];
        }
        try {
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) {
                throw new Error('Invalid recent projects payload');
            }
            return parsed;
        } catch (error) {
            console.warn('Failed to parse recent projects, clearing storage', error);
            localStorage.removeItem(RECENT_PROJECTS_KEY);
            return [];
        }
    }

    function writeRecentProjects(entries) {
        localStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(entries));
    }

    function createSnapshotId() {
        return `snapshot_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    }

    function sanitizeName(value) {
        if (!value) return '';
        return value.toString().trim();
    }

    function applyLimits(list) {
        if (list.length <= MAX_RECENT_PROJECTS) {
            return list;
        }
        return list.slice(0, MAX_RECENT_PROJECTS);
    }

    window.GenogramRecentProjects = {
        load() {
            return readRecentProjects();
        },
        save(entries) {
            writeRecentProjects(applyLimits(entries));
        },
        add(entry) {
            const list = readRecentProjects();
            const filtered = list.filter(item => item.id !== entry.id);
            filtered.unshift(entry);
            writeRecentProjects(applyLimits(filtered));
        },
        rename(entryId, newName) {
            const list = readRecentProjects();
            const name = sanitizeName(newName);
            const updated = list.map(entry => entry.id === entryId ? { ...entry, name: name || entry.name } : entry);
            writeRecentProjects(updated);
            return updated.find(entry => entry.id === entryId);
        },
        remove(entryId) {
            const list = readRecentProjects();
            const updated = list.filter(entry => entry.id !== entryId);
            writeRecentProjects(updated);
            return updated;
        },
        toggleFavorite(entryId) {
            const list = readRecentProjects();
            const updated = list.map(entry => entry.id === entryId ? { ...entry, favorite: !entry.favorite } : entry);
            const favorites = updated.filter(entry => entry.favorite);
            const others = updated.filter(entry => !entry.favorite);
            writeRecentProjects(applyLimits([...favorites, ...others]));
            return updated;
        },
        move(entryId, direction) {
            const list = readRecentProjects();
            const idx = list.findIndex(entry => entry.id === entryId);
            if (idx === -1) return list;
            const target = direction === 'up' ? idx - 1 : idx + 1;
            if (target < 0 || target >= list.length) return list;
            [list[idx], list[target]] = [list[target], list[idx]];
            writeRecentProjects(list);
            return list;
        },
        createSnapshotId,
        MAX_ITEMS: MAX_RECENT_PROJECTS
    };
}());
