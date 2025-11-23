// ============================================================================
// MAIN APPLICATION - Refactored with modular architecture
// ============================================================================

class GenogramApp {
    constructor() {
        // CRITICAL: Check if we're on the canvas page before initializing
        const canvas = document.getElementById('canvas');
        if (!canvas) {
            console.error('GenogramApp can only be initialized on canvas.html');
            throw new Error('Canvas element not found. This app requires canvas.html');
        }
        
        // Initialize state
        this.state = new AppState();

        // Track current template to prevent reload
        this.currentTemplateId = null;

        // Load settings from localStorage
        const savedGridMode = localStorage.getItem('gridMode') || 'solid';
        const savedMagnet = localStorage.getItem('magnetEnabled') !== 'false'; // default true
        this.state.gridMode = savedGridMode;
        this.state.isMagnetEnabled = savedMagnet;

        // Initialize layout and renderer
        this.layout = new AutoLayout();
        this.renderer = new SVGRenderer(document.getElementById('canvas'));
        this.renderer.setGridMode(this.state.gridMode);
        this.renderer.setStrokeWidths(this.state.getStrokeWidths());
        this.renderer.setLabelVisibility(this.state.getLabelVisibility());

        // Initialize operations first (before UI components)
        this.selectionManager = new SelectionManager(this);
        this.personOps = new PersonOperations(this);
        this.relationshipOps = new RelationshipOperations(this);
        this.emotionalOps = new EmotionalOperations(this);
        this.canvasInteractions = new CanvasInteractions(this);
        this.fileOps = new FileOperations(this);

        // Initialize UI components
        this.toolbar = new Toolbar(this);
        this.propertiesPanel = new PropertiesPanel(this);
        this.contextMenu = new ContextMenu();
        this.inlineEdit = new InlineEdit(this);
        this.multiSelect = new MultiSelect(this);
        this.legend = new Legend(this);
        window.legend = this.legend; // Expose legend globally for updates
        this.tutorial = new TutorialSystem(this);

        // 변경사항 추적
        this.hasUnsavedChanges = false;

        // Setup
        this.setupContextMenuActions();
        this.setupKeyboardShortcuts();
        this.multiSelect.setupKeyboardNavigation();
        this.multiSelect.setupMultiDrag();
        this.canvasInteractions.setup();

        // Listen for template selection events
        document.addEventListener('templateSelected', (e) => {
            const { templateId } = e.detail;
            console.log('Template selected:', templateId);

            // 이미 로드된 템플릿이면 다시 로드하지 않음 (CT 중심 재배치 방지)
            if (this.currentTemplateId === templateId) {
                console.log('Template already loaded, skipping reload');
                return;
            }

            this.loadTemplateData(templateId);
        });
        
        // Check if loading from projects page
        const loadProjectId = sessionStorage.getItem('loadProjectId');
        if (loadProjectId) {
            sessionStorage.removeItem('loadProjectId');
            this.fileOps.loadProjectFromManager(loadProjectId);
        } else {
            // Load default template (blank canvas)
            this.loadTemplateData('blank_canvas');
        }
        
        // Initial emotional status
        if (this.toolbar && typeof this.toolbar.updateEmotionStatus === 'function') {
            this.toolbar.updateEmotionStatus('감정선 유형을 선택한 후 인물을 2명 선택하면 연결됩니다', {
                isActive: false,
                isWaiting: false,
                category: null
            });
        }
    }

    // ========================================================================
    // TEMPLATE LOADING
    // ========================================================================
    
    loadTemplateData(templateId) {
        try {
            // Create template generator
            const generator = new TemplateGenerator();
            
            // Generate template data
            const templateData = generator.generate(templateId);
            
            // Clear current state
            this.state.persons = [];
            this.state.relationships = [];
            this.state.history = [];
            this.state.historyIndex = -1;

            // Load template data
            this.state.persons = templateData.persons;
            this.state.relationships = templateData.relationships;

            // Add emotional connections to relationships array if they exist
            if (templateData.emotionalConnections && Array.isArray(templateData.emotionalConnections)) {
                this.state.relationships = this.state.relationships.concat(templateData.emotionalConnections);
            }
            
            // Apply layout
            this.layout.layout(this.state.persons, this.state.relationships);
            
            // Deselect all
            this.deselectAll();
            
            // Render
            this.render();

            // Update legend
            if (window.legend && typeof window.legend.update === 'function') {
                window.legend.update();
            }

            // CT를 화면 중앙에 배치
            this.renderer.centerOnCT(this.state.persons);

            // 현재 템플릿 ID 저장 (재로드 방지용)
            this.currentTemplateId = templateId;

            // 튜토리얼 활성화 (blank_canvas인 경우)
            if (this.tutorial) {
                this.tutorial.activate(templateId);
            }

            // Save initial state
            this.state.saveState();

            // Mark as changed
            this.hasUnsavedChanges = false;
            this.updateSaveStatus();

            // Show success message
            if (this.toolbar) {
                const template = GENOGRAM_TEMPLATES.find(t => t.id === templateId);
                const templateName = template ? template.name : '템플릿';
                this.toolbar.showToast(`"${templateName}" 템플릿이 로드되었습니다`, 'success');
            }
            
            console.log('✓ Template loaded:', templateId, {
                persons: templateData.persons.length,
                relationships: templateData.relationships.length
            });
        } catch (error) {
            console.error('Failed to load template:', error);
            if (this.toolbar) {
                this.toolbar.showToast('템플릿 로드 중 오류가 발생했습니다', 'error');
            }
        }
    }

    // ========================================================================
    // RENDERING
    // ========================================================================

    render(newEmotionalRelId = null) {
        this.renderer.render(this.state.persons, this.state.relationships, newEmotionalRelId);
        this.canvasInteractions.update();

        // Update legend to reflect current state
        if (this.legend) {
            this.legend.update();
        }

        // Update tutorial tooltip positions if active
        if (this.tutorial && this.tutorial.isActive) {
            this.tutorial.updateTooltipPositions();
        }
    }

    // ========================================================================
    // PERSON OPERATIONS (Delegated)
    // ========================================================================

    addPerson() { this.personOps.addPerson(); }
    addSibling(personId) { this.personOps.addSibling(personId); }
    addPaternalSibling() { this.personOps.addPaternalSibling(); }
    addMaternalSibling() { this.personOps.addMaternalSibling(); }
    addSon() { this.personOps.addSon(); }
    addDaughter() { this.personOps.addDaughter(); }
    deletePerson(personId) { this.personOps.deletePerson(personId); }
    
    // ========================================================================
    // SELECTION (Delegated)
    // ========================================================================

    selectPerson(person) { this.selectionManager.selectPerson(person); }
    selectRelationship(relationship) { this.selectionManager.selectRelationship(relationship); }
    deselectAll() { this.selectionManager.deselectAll(); }
    
    // ========================================================================
    // RELATIONSHIP OPERATIONS (Delegated)
    // ========================================================================

    deleteRelationship(relationshipId) { this.relationshipOps.deleteRelationship(relationshipId); }
    
    // ========================================================================
    // EMOTIONAL OPERATIONS (Delegated)
    // ========================================================================

    setEmotionalSubtype(subtype) { this.emotionalOps.setEmotionalSubtype(subtype); }
    createEmotionalRelationship(first, second, subtype) {
        return this.emotionalOps.createEmotionalRelationship(first, second, subtype);
    }
    getEmotionalLabel(subtype) { return this.emotionalOps.getEmotionalLabel(subtype); }
    
    // ========================================================================
    // FILE OPERATIONS (Delegated)
    // ========================================================================

    newDocument() { this.fileOps.newDocument(); }
    saveDocument() { this.fileOps.saveDocument(); }
    loadDocument(file) { return this.fileOps.loadDocument(file); }
    exportDocument(format) { this.fileOps.exportDocument(format); }
    loadTemplate(templateName) { this.fileOps.loadTemplate(templateName); }
    
    // 프로젝트 저장 (프로젝트 관리 페이지에 저장)
    saveProject() {
        this.fileOps.saveProjectToManager();
    }
    
    // 변경사항 표시
    markAsChanged() {
        this.hasUnsavedChanges = true;
        this.updateSaveStatus();
    }
    
    // 저장 상태 업데이트
    updateSaveStatus() {
        const statusElement = document.getElementById('saveStatus');
        if (statusElement) {
            if (this.hasUnsavedChanges) {
                statusElement.textContent = '저장되지 않은 변경사항이 있습니다';
                statusElement.className = 'save-status unsaved';
            } else {
                statusElement.textContent = '모든 변경사항이 저장되었습니다';
                statusElement.className = 'save-status saved';
            }
        }
    }
    
    // ========================================================================
    // LAYOUT
    // ========================================================================

    applyAutoLayout() {
        this.layout.layout(this.state.persons, this.state.relationships);
        this.render();

        // NOTE: 자동정렬 시 CT 중심 고정 제거 - 사용자가 현재 보고 있는 위치 유지

        this.state.saveState();
        if (this.toolbar && typeof this.toolbar.showToast === 'function') {
            this.toolbar.showToast('자동정렬이 적용되었습니다', 'success');
        }
    }
    
    // ========================================================================
    // ZOOM OPERATIONS
    // ========================================================================

    zoomIn() {
        const newZoom = Math.min(this.renderer.currentZoom * 1.2, 3);
        this.renderer.setZoom(newZoom);
        if (this.toolbar && typeof this.toolbar.updateZoomDisplay === 'function') {
            this.toolbar.updateZoomDisplay(newZoom);
        }
    }

    zoomOut() {
        const newZoom = Math.max(this.renderer.currentZoom * 0.8, 0.1);
        this.renderer.setZoom(newZoom);
        if (this.toolbar && typeof this.toolbar.updateZoomDisplay === 'function') {
            this.toolbar.updateZoomDisplay(newZoom);
        }
    }

    resetZoom() {
        // CT를 화면 중심에 배치
        this.renderer.centerOnCT(this.state.persons);
        if (this.toolbar && typeof this.toolbar.updateZoomDisplay === 'function') {
            this.toolbar.updateZoomDisplay(this.renderer.currentZoom);
        }
    }
    
    // ========================================================================
    // LAYER TOGGLE
    // ========================================================================

    updateLayerVisibility(layerMap, visible) {
        layerMap.forEach(layerName => {
            const layer = document.getElementById(`layer-${layerName}`);
            if (layer) {
                layer.style.display = visible ? 'block' : 'none';
            }
        });
    }

    toggleLayer(layerName, visible) {
        if (layerName === 'relationships') {
            this.updateLayerVisibility(['parent-child', 'couple', 'emotional'], visible);
            return;
        }

        if (layerName === 'names') {
            this.state.setLabelVisibility({ showNames: visible });
            this.renderer.setLabelVisibility(this.state.getLabelVisibility());
            return;
        }

        if (layerName === 'ages') {
            this.state.setLabelVisibility({ showAges: visible });
            this.renderer.setLabelVisibility(this.state.getLabelVisibility());
            return;
        }

        if (layerName === 'legend') {
            const legendGroup = document.getElementById('legend-group');
            if (legendGroup) {
                legendGroup.style.display = visible ? 'block' : 'none';
            }
            return;
        }

        const layer = document.getElementById(`layer-${layerName}`);
        if (layer) {
            layer.style.display = visible ? 'block' : 'none';
        }
    }
    
    // ========================================================================
    // STROKE WIDTHS
    // ========================================================================

    setStrokeWidths({ shape, relationship, emotional }) {
        this.state.setStrokeWidths({ shape, relationship, emotional });
        this.renderer.setStrokeWidths(this.state.getStrokeWidths());
        this.render();
    }

    setEmotionalOpacity(opacity) {
        // Update all emotional relationship lines with new opacity
        const emotionalLayer = document.getElementById('layer-emotional');
        if (emotionalLayer) {
            const lines = emotionalLayer.querySelectorAll('line, path, polyline');
            lines.forEach(line => {
                line.style.opacity = opacity;
            });
        }
    }

    // ========================================================================
    // GRID
    // ========================================================================

    toggleGridMode() {
        const newMode = this.state.toggleGridMode();
        this.renderer.setGridMode(newMode);
        this.render();
        if (this.toolbar && typeof this.toolbar.updateGridLabel === 'function') {
            this.toolbar.updateGridLabel(newMode);
        }
        if (this.toolbar && typeof this.toolbar.showToast === 'function') {
            this.toolbar.showToast(`그리드: ${this.state.getGridModeLabel(newMode)}`, 'info');
        }
    }

    setMagnetEnabled(enabled) {
        this.state.setMagnetEnabled(enabled);
        if (this.toolbar && typeof this.toolbar.updateMagnetCheckbox === 'function') {
            this.toolbar.updateMagnetCheckbox(enabled);
        }
        if (this.toolbar && typeof this.toolbar.showToast === 'function') {
            this.toolbar.showToast(`자석 정렬 ${enabled ? '켜짐' : '꺼짐'}`, 'info');
        }
    }
    
    // ========================================================================
    // HISTORY (UNDO/REDO)
    // ========================================================================

    saveState() {
        this.state.saveState();
        
        // Trigger autosave
        if (this.autoSave) {
            this.autoSave.save();
        }
    }

    undo() {
        if (this.state.undo()) {
            this.render();
            if (this.toolbar && typeof this.toolbar.showToast === 'function') {
                this.toolbar.showToast('실행 취소', 'info');
            }
        }
    }

    redo() {
        if (this.state.redo()) {
            this.render();
            if (this.toolbar && typeof this.toolbar.showToast === 'function') {
                this.toolbar.showToast('다시 실행', 'info');
            }
        }
    }
    
    // ========================================================================
    // DELETE SELECTED
    // ========================================================================

    deleteSelected() {
        // Check for multi-selection first
        if (this.canvasInteractions && this.canvasInteractions.multiSelectedIds && this.canvasInteractions.multiSelectedIds.size > 0) {
            this.canvasInteractions.deleteMultiSelected();
            return;
        }
        
        // Single selection
        if (!this.state.selectedElement) {
            if (this.toolbar && typeof this.toolbar.showToast === 'function') {
                this.toolbar.showToast('삭제할 요소를 선택하세요', 'warning');
            }
            return;
        }

        if (this.state.selectedElement.type === 'person') {
            this.personOps.deleteSelected();
        } else if (this.state.selectedElement.type === 'relationship') {
            this.relationshipOps.deleteSelected();
        }
    }
    
    // ========================================================================
    // KEYBOARD SHORTCUTS
    // ========================================================================
    
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ignore if user is typing in an input field
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }
            
            // Ctrl+S 또는 Cmd+S로 저장
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                this.saveProject();
            }
            
            // Delete 키로 삭제
            if (e.key === 'Delete' || e.key === 'Backspace') {
                e.preventDefault();
                this.deleteSelected();
            }
            
            // Ctrl+Z로 Undo
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                this.undo();
            }
            
            // Ctrl+Y 또는 Ctrl+Shift+Z로 Redo
            if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                e.preventDefault();
                this.redo();
            }
            
            // Ctrl+A로 전체 선택
            if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
                e.preventDefault();
                if (this.multiSelect) {
                    this.multiSelect.selectAll();
                }
            }
            
            // ESC로 선택 해제
            if (e.key === 'Escape') {
                if (this.multiSelect) {
                    this.multiSelect.clearSelection();
                }
                this.deselectAll();
            }
        });
        
        // 페이지 이탈 시 경고
        window.addEventListener('beforeunload', (e) => {
            if (this.hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = '저장되지 않은 변경사항이 있습니다. 정말 나가시겠습니까?';
                return e.returnValue;
            }
        });
    }
    
    // ========================================================================
    // CONTEXT MENU ACTIONS
    // ========================================================================

    setupContextMenuActions() {
        this.contextMenu.setActionHandler((action, target, targetType) => {
            switch (action) {
                // Person actions
                case 'edit-person':
                    if (target && targetType === 'person') {
                        this.selectPerson(target);
                    }
                    break;
                
                // 부모 추가
                case 'add-father':
                    if (target && targetType === 'person') {
                        this.personOps.addFather(target.id);
                    }
                    break;
                    
                case 'add-mother':
                    if (target && targetType === 'person') {
                        this.personOps.addMother(target.id);
                    }
                    break;
                
                // 자녀 추가
                case 'add-son':
                    if (target && targetType === 'person') {
                        this.personOps.addSon(target.id);
                    }
                    break;
                    
                case 'add-daughter':
                    if (target && targetType === 'person') {
                        this.personOps.addDaughter(target.id);
                    }
                    break;
                    
                case 'add-child-unknown':
                    if (target && targetType === 'person') {
                        this.personOps.addChildUnknown(target.id);
                    }
                    break;
                
                // 형제자매 추가
                case 'add-brother':
                    if (target && targetType === 'person') {
                        this.personOps.addBrother(target.id);
                    }
                    break;
                    
                case 'add-sister':
                    if (target && targetType === 'person') {
                        this.personOps.addSister(target.id);
                    }
                    break;
                    
                case 'add-sibling-unknown':
                    if (target && targetType === 'person') {
                        this.personOps.addSiblingUnknown(target.id);
                    }
                    break;
                
                // 형제자매 추가
                case 'add-brother':
                    if (target && targetType === 'person') {
                        this.personOps.addBrother(target.id);
                    }
                    break;
                    
                case 'add-sister':
                    if (target && targetType === 'person') {
                        this.personOps.addSister(target.id);
                    }
                    break;
                    
                case 'add-sibling-unknown':
                    if (target && targetType === 'person') {
                        this.personOps.addSiblingUnknown(target.id);
                    }
                    break;
                    
                case 'add-sibling':
                    if (target && targetType === 'person') {
                        this.addSibling(target.id);
                    }
                    break;
                    
                case 'add-spouse':
                    if (target && targetType === 'person') {
                        this.personOps.addSpouse(target.id);
                    }
                    break;
                    
                case 'add-emotional':
                    if (target && targetType === 'person') {
                        this.selectPerson(target);
                        if (this.toolbar && typeof this.toolbar.showToast === 'function') {
                            this.toolbar.showToast('감정선 유형을 선택한 후 다른 인물을 선택하세요', 'info');
                        }
                    }
                    break;
                    
                case 'copy-person':
                    if (target && targetType === 'person') {
                        this.personOps.copyPerson(target);
                    }
                    break;
                    
                case 'delete-person':
                    if (target && targetType === 'person') {
                        this.deletePerson(target.id);
                    }
                    break;
                
                // Canvas actions
                case 'add-person':
                    this.addPerson();
                    break;

                case 'auto-layout':
                    this.applyAutoLayout();
                    break;

                case 'reset-zoom':
                    this.renderer.resetZoom();
                    if (this.toolbar && typeof this.toolbar.updateZoomLevel === 'function') {
                        this.toolbar.updateZoomLevel(this.renderer.currentZoom);
                    }
                    if (this.toolbar && typeof this.toolbar.showToast === 'function') {
                        this.toolbar.showToast('줌이 리셋되었습니다', 'info');
                    }
                    break;

                case 'select-all':
                    if (this.multiSelect) {
                        this.multiSelect.selectAll();
                    }
                    break;

                case 'deselect-all':
                    if (this.multiSelect) {
                        this.multiSelect.clearSelection();
                    }
                    this.deselectAll();
                    break;
                
                // Relationship actions
                case 'edit-relationship':
                    if (target && targetType === 'relationship') {
                        this.selectRelationship(target);
                    }
                    break;
                    
                case 'change-marriage-type':
                    if (target && targetType === 'relationship') {
                        this.relationshipOps.changeMarriageType(target);
                    }
                    break;
                    
                case 'change-emotional-type':
                    if (target && targetType === 'relationship') {
                        this.relationshipOps.changeEmotionalType(target);
                    }
                    break;
                    
                case 'delete-relationship':
                case 'delete-emotional':
                    if (target && targetType === 'relationship') {
                        this.deleteRelationship(target.id);
                    }
                    break;
                    
                default:
                    console.warn('Unknown action:', action);
            }
        });
    }
}

// Initialize app when DOM is ready
function initializeApp() {
    // 로딩 오버레이 표시
    if (window.LoadingState) {
        LoadingState.showLoading('Genogram Studio 초기화 중...');
    }
    
    // 메뉴 빌더가 먼저 실행되었는지 확인하고, 안 되었으면 먼저 실행
    if (typeof MenuBuilder !== 'undefined' && !window._menusInitialized) {
        MenuBuilder.initializeAll();
        window._menusInitialized = true;
    }
    
    // 내보내기 드롭다운 초기화
    const exportDropdownEl = document.getElementById('exportDropdown');
    if (exportDropdownEl && typeof Dropdown !== 'undefined') {
        const toggle = exportDropdownEl.querySelector('.dropdown-toggle');
        const menu = exportDropdownEl.querySelector('.dropdown-menu');
        
        if (!toggle || !menu) {
            console.error('Export dropdown elements not found:', { toggle, menu });
        } else {
            const menuItems = menu.querySelectorAll('.dropdown-item');
            console.log('Export dropdown initialized with', menuItems.length, 'menu items');
            
            new Dropdown({
                toggle,
                menu,
                onSelect: (value) => {
                    console.log('Export format selected:', value);
                    
                    if (!window.genogramApp) {
                        alert('앱이 아직 초기화되지 않았습니다.');
                        return;
                    }
                    
                    switch(value) {
                        case 'json':
                            window.genogramApp.saveDocument();
                            break;
                        case 'png':
                            window.genogramApp.fileOps.exportAsPNG();
                            break;
                        case 'svg':
                            window.genogramApp.fileOps.exportAsSVG();
                            break;
                        case 'pdf':
                            alert('PDF 내보내기 기능은 추후 구현 예정입니다.');
                            break;
                    }
                }
            });
            console.log('✓ Export dropdown initialized');
        }
    } else {
        console.warn('Export dropdown or Dropdown class not available', {
            element: !!exportDropdownEl,
            dropdownClass: typeof Dropdown !== 'undefined'
        });
    }
    
    // 관계 추가 드롭다운 초기화
    const relationshipDropdownEl = document.getElementById('relationshipDropdown');
    if (relationshipDropdownEl && typeof Dropdown !== 'undefined') {
        const toggle = relationshipDropdownEl.querySelector('.dropdown-toggle');
        const menu = relationshipDropdownEl.querySelector('.dropdown-menu');
        
        new Dropdown({
            toggle,
            menu,
            onSelect: (value) => {
                console.log('Relationship type selected:', value);
                
                if (!window.genogramApp) {
                    return;
                }
                
                const app = window.genogramApp;
                const selected = app.selection.getSelected();
                
                if (selected.length === 0) {
                    alert('인물을 먼저 선택해주세요.');
                    return;
                }
                
                // 기존 버튼 ID에 맞춰서 메소드 호출
                switch(value) {
                    case 'spouse':
                        // 배우자 추가 (미구현 - 추후 구현)
                        alert('배우자 추가 기능은 추후 구현 예정입니다.');
                        break;
                    case 'son':
                        document.getElementById('btnAddSon')?.click();
                        break;
                    case 'daughter':
                        document.getElementById('btnAddDaughter')?.click();
                        break;
                    case 'sibling':
                        document.getElementById('btnAddSibling')?.click();
                        break;
                    case 'parent':
                        // 부모 추가 (미구현 - 추후 구현)
                        alert('부모 추가 기능은 추후 구현 예정입니다.');
                        break;
                    case 'paternal-sibling':
                        document.getElementById('btnAddPaternalSibling')?.click();
                        break;
                    case 'maternal-sibling':
                        document.getElementById('btnAddMaternalSibling')?.click();
                        break;
                }
            }
        });
    }
    
    // 필수 클래스들이 로드될 때까지 대기 후 앱 초기화
    function waitForDependencies() {
        const requiredClasses = {
            SVGRenderer: typeof SVGRenderer !== 'undefined',
            AppState: typeof AppState !== 'undefined',
            AutoLayout: typeof AutoLayout !== 'undefined',
            SelectionManager: typeof SelectionManager !== 'undefined',
            PersonOperations: typeof PersonOperations !== 'undefined',
            RelationshipOperations: typeof RelationshipOperations !== 'undefined',
            EmotionalOperations: typeof EmotionalOperations !== 'undefined',
            CanvasInteractions: typeof CanvasInteractions !== 'undefined',
            FileOperations: typeof FileOperations !== 'undefined',
            Toolbar: typeof Toolbar !== 'undefined',
            PropertiesPanel: typeof PropertiesPanel !== 'undefined'
        };

        const missingClasses = Object.keys(requiredClasses).filter(name => !requiredClasses[name]);

        if (missingClasses.length > 0) {
            if (initAttempts === 1 || initAttempts % 20 === 0) {
                console.log(`⏳ Attempt ${initAttempts}/${maxAttempts}: Waiting for ${missingClasses.length} classes`);
                console.log('   ✗ Missing:', missingClasses.join(', '));

                // Debug: Check what IS loaded
                const loadedClasses = Object.keys(requiredClasses).filter(name => requiredClasses[name]);
                if (loadedClasses.length > 0) {
                    console.log(`   ✓ Already loaded (${loadedClasses.length}):`, loadedClasses.join(', '));
                }
            }
            return false;
        }

        console.log('✓ All dependencies loaded');
        return true;
    }

    let initAttempts = 0;
    const maxAttempts = 100; // 10 seconds max (100 * 100ms)

    function tryInitialize() {
        initAttempts++;

        if (waitForDependencies()) {
            try {
                window.genogramApp = new GenogramApp();

                const pendingLoadId = localStorage.getItem('genogram_pending_load');
                if (pendingLoadId) {
                    localStorage.removeItem('genogram_pending_load');
                    window.genogramApp.fileOps.loadProjectSnapshot(pendingLoadId);
                }

                if (window.location.hash === '#settings') {
                    const modal = document.getElementById('settingsModal');
                    if (modal) {
                        modal.style.display = 'flex';
                    }
                }

                // 프로젝트 이름 클릭 시 편집 기능 추가
                const projectNameDisplay = document.getElementById('projectNameDisplay');
                if (projectNameDisplay) {
                    projectNameDisplay.addEventListener('click', () => {
                        const currentName = projectNameDisplay.textContent.trim();
                        const defaultName = currentName === '제목 없음' ? '' : currentName;

                        const newName = prompt('프로젝트 이름을 입력하세요:', defaultName);

                        if (newName !== null && newName.trim() !== '') {
                            const trimmedName = newName.trim();
                            projectNameDisplay.textContent = trimmedName;

                            // 저장
                            if (window.GenogramProjectNameStore) {
                                window.GenogramProjectNameStore.persist(trimmedName);
                            }

                            // 토스트 표시
                            if (window.genogramApp.toolbar) {
                                window.genogramApp.toolbar.showToast(`프로젝트 이름이 "${trimmedName}"으로 변경되었습니다`, 'success');
                            }
                        }
                    });

                    // 커서 포인터 표시
                    projectNameDisplay.style.cursor = 'pointer';
                }

                // 로딩 완료
                if (window.LoadingState) {
                    LoadingState.hideLoading();
                }
            } catch (error) {
                console.error('Failed to initialize GenogramApp:', error);

                // 에러 표시
                if (window.LoadingState) {
                    LoadingState.hideLoading();

                    // 에러 상태 표시
                    const mainContainer = document.querySelector('.main-container');
                    if (mainContainer) {
                        const errorState = LoadingState.createErrorState({
                            title: '초기화 오류',
                            message: '앱을 초기화하는 중 문제가 발생했습니다. 페이지를 새로고침해주세요.',
                            onRetry: () => location.reload()
                        });
                        mainContainer.innerHTML = '';
                        mainContainer.style.display = 'flex';
                        mainContainer.style.justifyContent = 'center';
                        mainContainer.style.alignItems = 'center';
                        mainContainer.appendChild(errorState);
                    }
                }
            }
        } else if (initAttempts < maxAttempts) {
            // 아직 로드 중이면 100ms 후 재시도
            setTimeout(tryInitialize, 100);
        } else {
            // 최종 실패 - 어떤 클래스가 누락되었는지 표시
            const requiredClasses = {
                SVGRenderer: typeof SVGRenderer !== 'undefined',
                AppState: typeof AppState !== 'undefined',
                AutoLayout: typeof AutoLayout !== 'undefined',
                SelectionManager: typeof SelectionManager !== 'undefined',
                PersonOperations: typeof PersonOperations !== 'undefined',
                RelationshipOperations: typeof RelationshipOperations !== 'undefined',
                EmotionalOperations: typeof EmotionalOperations !== 'undefined',
                CanvasInteractions: typeof CanvasInteractions !== 'undefined',
                FileOperations: typeof FileOperations !== 'undefined',
                Toolbar: typeof Toolbar !== 'undefined',
                PropertiesPanel: typeof PropertiesPanel !== 'undefined'
            };
            
            const missingClasses = Object.keys(requiredClasses).filter(name => !requiredClasses[name]);
            
            console.error('Failed to load dependencies after 10 seconds');
            console.error('❌ Missing classes:', missingClasses);
            
            if (window.LoadingState) {
                LoadingState.hideLoading();

                const mainContainer = document.querySelector('.main-container');
                if (mainContainer) {
                    const errorState = LoadingState.createErrorState({
                        title: '로딩 실패',
                        message: `필요한 스크립트를 불러오지 못했습니다.\n\n누락된 클래스: ${missingClasses.join(', ')}\n\n브라우저 콘솔(F12)에서 자세한 오류를 확인하세요.`,
                        onRetry: () => location.reload()
                    });
                    mainContainer.innerHTML = '';
                    mainContainer.style.display = 'flex';
                    mainContainer.style.justifyContent = 'center';
                    mainContainer.style.alignItems = 'center';
                    mainContainer.appendChild(errorState);
                }
            }
        }
    }

    // 첫 시도 (약간의 딜레이 후)
    setTimeout(tryInitialize, 100);
}

// DOM 로드 완료 시 앱 초기화
document.addEventListener('DOMContentLoaded', () => {
    // CRITICAL: Check if app initialization is disabled (dashboard page)
    if (window.DISABLE_GENOGRAM_APP) {
        console.log('GenogramApp initialization blocked by DISABLE_GENOGRAM_APP flag');
        return;
    }
    
    // Guard: Only initialize on canvas page
    const isCanvasPage = document.getElementById('canvas') !== null;
    
    if (!isCanvasPage) {
        console.log('Not on canvas page, skipping GenogramApp initialization');
        return;
    }
    
    // 앱이 아직 초기화되지 않은 경우에만 초기화 실행
    if (!window.genogramApp) {
        console.log('✓ DOM ready, initializing app...');
        initializeApp();
    }
});
