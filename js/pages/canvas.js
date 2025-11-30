/**
 * Canvas Page - 캔버스 페이지 진입점
 */

import { appState } from '../state/AppState.js';
import { CanvasState } from '../canvas/CanvasState.js';
import { Person } from '../canvas/Person.js';
import { PersonOperations } from '../canvas/PersonOperations.js';
import { EmotionalOperations } from '../canvas/EmotionalOperations.js';
import { GenogramRenderer } from '../canvas/GenogramRenderer.js';
import { Toast } from '../ui/Toast.js';
import { ContextMenu } from '../ui/ContextMenu.js';
import { PersonEditModal } from '../ui/PersonEditModal.js';
import { SettingsModal } from '../ui/settings/SettingsModal.js';
import { ExportModal } from '../ui/export/ExportModal.js';
import { ShortcutsModal } from '../ui/help/ShortcutsModal.js';
import { SaveModal } from '../ui/save/SaveModal.js';
import { LoadModal } from '../ui/save/LoadModal.js';
import { RelationshipTool } from '../canvas/tools/RelationshipTool.js';
import { HistoryManager } from '../core/HistoryManager.js';
import { storage, debounce } from '../core/Utils.js';
import { TutorialManager } from '../templates/TutorialManager.js';

class CanvasPage {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.canvasState = new CanvasState();
    this.genogramRenderer = null; // 초기화 후 생성
    this.personOps = new PersonOperations(this.canvasState);
    this.emotionalOps = new EmotionalOperations(this.canvasState);
    this.historyManager = new HistoryManager(50);
    this.contextMenu = new ContextMenu();
    this.copiedPerson = null;
    this.projectId = null;
    this.project = null;
    this.currentTool = 'select';
    this.isDragging = false;
    this.dragStart = null;
    this.relationshipTool = new RelationshipTool(this.canvasState);
    this.mousePos = { x: 0, y: 0 };
    this.isSpacePressed = false; // 스페이스바 눌림 상태
    this.previousTool = null; // 스페이스바 누르기 전 도구
    this.dragStartPersonsPos = null; // 멀티 셀렉트된 인물들의 초기 위치
    this.dragStartMousePos = null; // 드래그 시작 마우스 위치
    this.isBoxSelecting = false; // 박스 선택 모드
    this.boxSelectStart = null; // 박스 선택 시작 위치
    this.boxSelectEnd = null; // 박스 선택 끝 위치
    this.tutorialManager = new TutorialManager(this.canvasState); // 튜토리얼 매니저

    this.init();
  }

  async init() {
    console.log('🎨 Canvas page initializing...');

    // URL에서 프로젝트 ID 가져오기
    const params = new URLSearchParams(window.location.search);
    this.projectId = params.get('project');

    if (!this.projectId) {
      Toast.error('프로젝트 ID가 없습니다');
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 2000);
      return;
    }

    // 캔버스 설정
    this.setupCanvas();

    // 프로젝트 로드
    await this.loadProject();

    // 이벤트 바인딩
    this.bindEvents();

    // 초기 렌더링
    this.render();

    // 자동 저장 설정
    this.setupAutoSave();

    console.log('✅ Canvas page ready');
  }

  /**
   * 인물들이 화면 중앙에 오도록 뷰 조정
   */
  centerView() {
    if (this.canvasState.persons.length === 0) return;

    // 모든 인물의 바운딩 박스 계산
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    this.canvasState.persons.forEach(person => {
      const size = person.size || 60;
      const halfSize = size / 2;
      
      minX = Math.min(minX, person.x - halfSize);
      minY = Math.min(minY, person.y - halfSize);
      maxX = Math.max(maxX, person.x + halfSize);
      maxY = Math.max(maxY, person.y + halfSize);
    });

    // 콘텐츠의 중심점과 크기 계산
    const contentCenterX = (minX + maxX) / 2;
    const contentCenterY = (minY + maxY) / 2;
    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;

    // 여백 추가 (20%)
    const padding = 1.2;
    const paddedWidth = contentWidth * padding;
    const paddedHeight = contentHeight * padding;

    // 화면 크기에 맞는 적절한 줄 계산
    const zoomX = this.canvas.width / paddedWidth;
    const zoomY = this.canvas.height / paddedHeight;
    const optimalZoom = Math.min(zoomX, zoomY, 1.5); // 최대 1.5배

    // 줄 적용
    this.canvasState.setZoom(optimalZoom);

    // 화면 중심으로 팬 조정
    const panX = this.canvas.width / 2 - contentCenterX * optimalZoom;
    const panY = this.canvas.height / 2 - contentCenterY * optimalZoom;
    this.canvasState.setPan(panX, panY);

    // 줄 표시 업데이트
    this.updateZoomDisplay();
  }

  /**
   * 더블클릭 이벤트
   */
  handleDoubleClick(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // 화면 좌표를 월드 좌표로 변환
    const worldX = (x - this.canvasState.pan.x) / this.canvasState.zoom;
    const worldY = (y - this.canvasState.pan.y) / this.canvasState.zoom;

    const person = this.canvasState.getPersonAt(worldX, worldY);
    if (person) {
      this.openEditModal(person);
    }
  }

  /**
   * 우클릭 메뉴
   */
  handleContextMenu(e) {
    e.preventDefault();

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // 화면 좌표를 월드 좌표로 변환
    const worldX = (x - this.canvasState.pan.x) / this.canvasState.zoom;
    const worldY = (y - this.canvasState.pan.y) / this.canvasState.zoom;

    // 우클릭 위치 저장 (빈 캔버스 우클릭 시 인물 추가용)
    this.lastContextMenuPos = { worldX, worldY };

    // 인물 확인 (월드 좌표 사용)
    const person = this.canvasState.getPersonAt(worldX, worldY);
    if (person) {
      const items = this.contextMenu.getPersonMenuItems(person);
      this.contextMenu.show(e.clientX, e.clientY, items, person, 'person');
      return;
    }

    // 관계선 확인 (월드 좌표 사용)
    const relationship = this.canvasState.getRelationshipAt(worldX, worldY);
    
    if (relationship) {
      const items = this.contextMenu.getRelationshipMenuItems(relationship);
      this.contextMenu.show(e.clientX, e.clientY, items, relationship, 'relationship');
      return;
    }
    
    // 빈 캔버스 우클릭 시 캔버스 메뉴 표시
    const items = this.contextMenu.getCanvasMenuItems();
    this.contextMenu.show(e.clientX, e.clientY, items, null, 'canvas');
  }

  /**
   * 인라인 편집 시작
   */
  startInlineEdit(person, field) {
    // 기존 인라인 편집 입력 상자 제거
    const existingInput = document.querySelector('.inline-edit-input');
    if (existingInput) {
      existingInput.remove();
    }

    // 입력 상자 생성
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'inline-edit-input';
    
    // 현재 값 설정
    if (field === 'name') {
      input.value = person.name || '';
      input.placeholder = '이름 입력';
    } else if (field === 'age') {
      const age = person.getAge();
      input.value = age !== null ? age : '';
      input.placeholder = '나이 입력';
      input.type = 'number';
      input.min = '0';
      input.max = '150';
    }

    // 위치 계산 (화면 좌표로 변환)
    const rect = this.canvas.getBoundingClientRect();
    const size = person.size || 60;
    const halfSize = size / 2;
    
    // 인물 위치를 화면 좌표로 변환
    const screenX = person.x * this.canvasState.zoom + this.canvasState.pan.x + rect.left;
    const screenY = person.y * this.canvasState.zoom + this.canvasState.pan.y + rect.top;
    
    // 입력 상자 스타일 설정
    input.style.position = 'fixed';
    input.style.left = `${screenX - 50}px`; // 중앙 정렬
    input.style.top = `${screenY - halfSize * this.canvasState.zoom - 40}px`; // 인물 위에 표시
    input.style.width = '100px';
    input.style.padding = '8px';
    input.style.fontSize = '14px';
    input.style.border = '2px solid var(--color-primary)';
    input.style.borderRadius = 'var(--radius-sm)';
    input.style.backgroundColor = 'var(--color-bg-primary)';
    input.style.color = 'var(--color-text-primary)';
    input.style.zIndex = '1000';
    input.style.textAlign = 'center';
    input.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';

    // 문서에 추가
    document.body.appendChild(input);
    input.focus();
    input.select();

    // 저장 함수
    const saveEdit = () => {
      const newValue = input.value.trim();
      
      if (field === 'name') {
        if (newValue && newValue !== person.name) {
          person.name = newValue;
          this.saveHistory();
          this.saveProject();
          Toast.success('이름이 변경되었습니다');
        }
      } else if (field === 'age') {
        if (newValue === '') {
          // 빈 값이면 나이 제거
          person.age = null;
          this.saveHistory();
          this.saveProject();
        } else {
          const age = parseInt(newValue);
          if (!isNaN(age) && age >= 0 && age <= 150) {
            person.age = age;
            this.saveHistory();
            this.saveProject();
            Toast.success('나이가 변경되었습니다');
          } else {
            Toast.error('올바른 나이를 입력해주세요 (0-150)');
            return; // 잘못된 값이면 입력창 유지
          }
        }
      }
      
      input.remove();
      this.render();
    };

    // 이벤트 리스너
    input.addEventListener('blur', saveEdit);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveEdit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        input.remove();
        this.render();
      }
    });
  }

  /**
   * 인물 편집 모달 열기
   */
  openEditModal(person) {
    const modal = new PersonEditModal(person, (updates) => {
      this.canvasState.updatePerson(person.id, updates);
      this.saveHistory(); // 히스토리 저장
      this.render();
      this.saveProject();
    });
    modal.open();
  }

  /**
   * 설정 모달 열기
   */
  openSettingsModal() {
    const modal = new SettingsModal();
    modal.open(this); // canvas 페이지 참조 전달
  }

  /**
   * 내보내기 모달 열기
   */
  openExportModal() {
    // 현재 상태 저장 (최신 데이터 보장)
    this.saveProject();
    
    // 현재 canvasState 전달
    const modal = new ExportModal(this.canvasState);
    modal.open();
  }

  /**
   * 일시저장 모달 열기
   */
  openSaveModal() {
    const modal = new SaveModal(this.project.name, (newName) => {
      // 프로젝트 이름 업데이트
      this.project.name = newName;
      
      // 프로젝트 저장
      this.saveProject();
      
      Toast.success(`"${newName}"으로 일시저장되었습니다`);
    });
    modal.open();
  }

  /**
   * 불러오기 모달 열기
   */
  openLoadModal() {
    const modal = new LoadModal(this.projectId, (projectId) => {
      // 페이지 새로고침하여 프로젝트 불러오기
      window.location.href = `canvas.html?project=${projectId}`;
    });
    modal.open();
  }

  /**
   * 캔버스 설정
   */
  setupCanvas() {
    this.canvas = document.getElementById('genogram-canvas');
    this.ctx = this.canvas.getContext('2d');

    // 캔버스 크기 설정
    this.resizeCanvas();
    window.addEventListener('resize', debounce(() => {
      this.resizeCanvas();
      this.render();
    }, 250));
  }

  /**
   * 캔버스 크기 조정
   */
  resizeCanvas() {
    const container = this.canvas.parentElement;
    const rect = container.getBoundingClientRect();

    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
  }

  /**
   * 프로젝트 로드
   */
  async loadProject() {
    try {
      const projects = storage.get('projects', []);
      this.project = projects.find(p => p.id === this.projectId);

      if (!this.project) {
        // 프로젝트가 없으면 새로 생성
        this.project = {
          id: this.projectId,
          name: '새 프로젝트',
          createdAt: new Date().toISOString(),
          modifiedAt: new Date().toISOString(),
          personCount: 0,
          relationshipCount: 0,
          data: null,
          isTutorial: false,
          tutorialData: null
        };
        
        // 프로젝트 목록에 추가
        projects.push(this.project);
        storage.set('projects', projects);
        
        Toast.info('새 프로젝트가 생성되었습니다');
      }

      // 프로젝트 이름 표시 - 삭제됨
      // document.getElementById('projectTitle').textContent = this.project.name;

      // 캔버스 데이터 로드
      if (this.project.data) {
        // 템플릿 데이터는 people/relationships 구조
        // CanvasState는 persons/relationships 구조를 사용
        const canvasData = {
          persons: this.project.data.people || this.project.data.persons || [],
          relationships: this.project.data.relationships || [],
          emotionalLines: this.project.data.emotionalLines || [],
          zoom: this.project.data.zoom || 1.0,
          pan: this.project.data.pan || { x: 0, y: 0 }
        };
        this.canvasState.fromJSON(canvasData);
      }

      // 초기 히스토리 저장
      this.saveHistory();

      // GenogramRenderer 초기화
      if (!this.genogramRenderer) {
        this.genogramRenderer = new GenogramRenderer(this.ctx, this.canvasState);
      }

      // 인물이 있으면 화면 중앙에 맞추기
      if (this.canvasState.persons.length > 0) {
        this.centerView();
      }

      // 튜토리얼 프로젝트인 경우 튜토리얼 시작
      if (this.project.isTutorial && this.project.tutorialData) {
        console.log('🎓 Starting tutorial...', this.project);
        setTimeout(() => {
          // tutorialData가 이미 tutorialSteps 배열
          const tutorialTemplate = {
            isTutorial: true,
            name: this.project.name,
            tutorialSteps: this.project.tutorialData,
            data: this.project.data
          };
          this.tutorialManager.start(tutorialTemplate);
        }, 500);
      }

      Toast.success('프로젝트를 불러왔습니다');
    } catch (error) {
      console.error('Failed to load project:', error);
      
      // 오류 발생 시에도 기본 프로젝트 생성
      if (!this.project) {
        this.project = {
          id: this.projectId,
          name: '새 프로젝트',
          createdAt: new Date().toISOString(),
          modifiedAt: new Date().toISOString(),
          personCount: 0,
          relationshipCount: 0,
          data: null
        };
      }
      
      Toast.error('프로젝트를 불러오지 못했습니다');
    }
  }

  /**
   * 이벤트 바인딩
   */
  bindEvents() {
    // 뒤로 가기
    document.getElementById('btnBack').addEventListener('click', () => {
      window.location.href = 'index.html';
    });

    // 저장 - 일시저장 모달 열기
    document.getElementById('btnSave').addEventListener('click', () => {
      this.openSaveModal();
    });

    // 불러오기
    document.getElementById('btnLoad').addEventListener('click', () => {
      this.openLoadModal();
    });

    // 내보내기
    document.getElementById('btnExport').addEventListener('click', () => {
      this.openExportModal();
    });

    // 실행 취소/다시 실행
    document.getElementById('btnUndo').addEventListener('click', () => {
      this.undo();
    });

    document.getElementById('btnRedo').addEventListener('click', () => {
      this.redo();
    });

    // 도구 버튼들
    document.querySelectorAll('.tool-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tool = e.currentTarget.dataset.tool;
        this.setTool(tool);
      });
    });

    // 관계 타입 버튼들
    document.querySelectorAll('.relationship-type-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const type = e.currentTarget.dataset.type;
        this.relationshipTool.setType(type);
        
        // 버튼 활성화 상태
        document.querySelectorAll('.relationship-type-btn').forEach(b => {
          b.classList.toggle('active', b === e.currentTarget);
        });
      });
    });

    // 줌 컨트롤
    document.getElementById('btnZoomIn').addEventListener('click', () => {
      this.zoom(0.1);
    });
    document.getElementById('btnZoomOut').addEventListener('click', () => {
      this.zoom(-0.1);
    });
    document.getElementById('btnZoomReset').addEventListener('click', () => {
      this.canvasState.setZoom(1.0);
      this.updateZoomDisplay();
      this.render();
    });

    // 캔버스 이벤트
    this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    this.canvas.addEventListener('dblclick', (e) => this.handleDoubleClick(e));
    this.canvas.addEventListener('contextmenu', (e) => this.handleContextMenu(e));
    this.canvas.addEventListener('wheel', (e) => this.handleWheel(e));

    // 키보드 단축키
    document.addEventListener('keydown', (e) => this.handleKeyDown(e));
    document.addEventListener('keyup', (e) => this.handleKeyUp(e));

    // 컬텍스트 메뉴 액션 핸들러 등록
    this.contextMenu.setActionHandler((action, target, targetType) => {
      this.handleContextMenuAction(action, target, targetType);
    });
  }

  /**
   * 도구 설정
   */
  setTool(tool) {
    this.currentTool = tool;
    this.canvasState.setTool(tool);

    // 관계 도구 초기화
    if (tool !== 'relationship') {
      this.relationshipTool.reset();
    }

    // 버튼 활성화 상태 업데이트
    document.querySelectorAll('.tool-btn').forEach(btn => {
      if (btn.dataset.tool === tool) {
        btn.classList.add('tool-btn--active');
      } else {
        btn.classList.remove('tool-btn--active');
      }
    });

    // 관계 타입 컨트롤 표시/숨김
    const relationshipControls = document.getElementById('relationshipControls');
    if (tool === 'relationship') {
      relationshipControls.classList.add('relationship-controls--active');
    } else {
      relationshipControls.classList.remove('relationship-controls--active');
    }

    // 커서 변경
    const cursors = {
      select: 'default',
      pan: 'grab',
      person: 'crosshair',
      relationship: 'crosshair'
    };
    this.canvas.style.cursor = cursors[tool] || 'default';
  }

  /**
   * 마우스 다운 이벤트
   */
  handleMouseDown(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // 화면 좌표를 월드 좌표로 변환
    const worldX = (x - this.canvasState.pan.x) / this.canvasState.zoom;
    const worldY = (y - this.canvasState.pan.y) / this.canvasState.zoom;

    this.isDragging = true;

    // 스페이스바가 눌려있으면 팬 모드로 동작
    if (this.isSpacePressed) {
      this.dragStartScreen = { x, y };
      this.panStart = { x: this.canvasState.pan.x, y: this.canvasState.pan.y };
      this.canvas.style.cursor = 'grabbing';
      return;
    }

    if (this.currentTool === 'select') {
      // 인물 선택 (월드 좌표 사용)
      const person = this.canvasState.getPersonAt(worldX, worldY);
      if (person) {
        // 감정선 모드 확인
        if (this.emotionalOps.isPending()) {
          this.emotionalOps.handlePersonClick(person);
          if (!this.emotionalOps.isPending()) {
            // 감정선 생성 완료
            this.saveHistory();
            this.render();
            this.saveProject();
            Toast.success('감정선이 추가되었습니다');
          }
          return;
        }
        
        // Ctrl/Cmd 키로 멀티 셀렉트
        if (e.ctrlKey || e.metaKey) {
          this.canvasState.togglePersonSelection(person.id);
          this.render();
        } else {
          // 이미 선택된 인물을 클릭한 경우
          if (this.canvasState.selectedPersons.includes(person.id)) {
            // 선택을 유지하고 드래그 시작
          } else {
            // 새로운 인물 선택
            this.canvasState.clearSelection();
            this.canvasState.selectPerson(person.id);
          }
          this.render();
        }
        
        // 드래그 시작 - 선택된 모든 인물의 초기 위치 저장
        this.dragStartMousePos = { x: worldX, y: worldY };
        this.dragStartPersonsPos = this.canvasState.getSelectedPersons().map(p => ({
          id: p.id,
          x: p.x,
          y: p.y
        }));
      } else {
        // 관계선 선택 확인
        const relationship = this.canvasState.getRelationshipAt(worldX, worldY);
        
        if (relationship) {
          this.canvasState.clearSelection();
          this.canvasState.selectRelationship(relationship.id);
          this.render();
        } else {
          // 빈 공간 클릭 - 박스 선택 시작
          if (!e.ctrlKey && !e.metaKey) {
            this.canvasState.clearSelection();
          }
          this.isBoxSelecting = true;
          this.boxSelectStart = { x: worldX, y: worldY };
          this.boxSelectEnd = { x: worldX, y: worldY };
          this.render();
        }
      }
    } else if (this.currentTool === 'pan') {
      // 팬 도구: 화면 좌표와 초기 pan 저장
      this.dragStartScreen = { x, y };
      this.panStart = { x: this.canvasState.pan.x, y: this.canvasState.pan.y };
    } else if (this.currentTool === 'person') {
      // 인물 추가 (월드 좌표 사용)
      this.addPerson(worldX, worldY);
    } else if (this.currentTool === 'relationship') {
      // 관계 추가 (화면 좌표 사용 - RelationshipTool 내부에서 변환)
      const success = this.relationshipTool.handleClick(x, y);
      if (success) {
        this.saveHistory(); // 히스토리 저장
        this.saveProject();
      }
      this.render();
    }
  }

  /**
   * 마우스 이동 이벤트
   */
  handleMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // 마우스 위치 저장 (관계 도구용)
    this.mousePos = { x, y };

    if (!this.isDragging) {
      // 관계 도구일 때 임시 선 표시
      if (this.currentTool === 'relationship' && this.relationshipTool.isPending()) {
        this.render();
      }
      return;
    }

    // 스페이스바 팬 모드
    if (this.isSpacePressed && this.dragStartScreen) {
      const screenDx = x - this.dragStartScreen.x;
      const screenDy = y - this.dragStartScreen.y;

      this.canvasState.setPan(
        this.panStart.x + screenDx,
        this.panStart.y + screenDy
      );

      this.render();
      return;
    }

    if (this.currentTool === 'select') {
      // 박스 선택 중
      if (this.isBoxSelecting && this.boxSelectStart) {
        const worldX = (x - this.canvasState.pan.x) / this.canvasState.zoom;
        const worldY = (y - this.canvasState.pan.y) / this.canvasState.zoom;
        this.boxSelectEnd = { x: worldX, y: worldY };
        this.render();
      }
      // 인물 드래그 중
      else if (this.dragStartPersonsPos && this.dragStartMousePos) {
        // 현재 마우스 위치를 월드 좌표로 변환
        const currentWorldX = (x - this.canvasState.pan.x) / this.canvasState.zoom;
        const currentWorldY = (y - this.canvasState.pan.y) / this.canvasState.zoom;

        // 월드 좌표에서의 이동 거리 계산
        const worldDx = currentWorldX - this.dragStartMousePos.x;
        const worldDy = currentWorldY - this.dragStartMousePos.y;

        // 선택된 모든 인물 이동
        this.dragStartPersonsPos.forEach(startPos => {
          const person = this.canvasState.getPersonById(startPos.id);
          if (person) {
            // 인물의 새 위치 계산 (초기 위치 + 이동 거리)
            let newX = startPos.x + worldDx;
            let newY = startPos.y + worldDy;

            // Magnet 기능: 그리드에 스냅
            if (appState.get('settings.enableMagnet')) {
              const gridSize = 50; // 그리드 크기와 동일
              newX = Math.round(newX / gridSize) * gridSize;
              newY = Math.round(newY / gridSize) * gridSize;
            }

            // 위치 업데이트
            person.x = newX;
            person.y = newY;
          }
        });

        this.render();
      }
    } else if (this.currentTool === 'pan') {
      // 캔버스 팬 (화면 좌표 사용)
      const screenDx = x - this.dragStartScreen.x;
      const screenDy = y - this.dragStartScreen.y;

      this.canvasState.setPan(
        this.panStart.x + screenDx,
        this.panStart.y + screenDy
      );

      this.render();
    }
  }

  /**
   * 마우스 업 이벤트
   */
  handleMouseUp(e) {
    // 박스 선택 완료
    if (this.isBoxSelecting && this.boxSelectStart && this.boxSelectEnd) {
      const minX = Math.min(this.boxSelectStart.x, this.boxSelectEnd.x);
      const maxX = Math.max(this.boxSelectStart.x, this.boxSelectEnd.x);
      const minY = Math.min(this.boxSelectStart.y, this.boxSelectEnd.y);
      const maxY = Math.max(this.boxSelectStart.y, this.boxSelectEnd.y);

      // 박스 내에 있는 모든 인물 선택
      this.canvasState.persons.forEach(person => {
        if (person.x >= minX && person.x <= maxX &&
            person.y >= minY && person.y <= maxY) {
          if (!this.canvasState.selectedPersons.includes(person.id)) {
            this.canvasState.selectPerson(person.id);
          }
        }
      });

      this.isBoxSelecting = false;
      this.boxSelectStart = null;
      this.boxSelectEnd = null;
      this.render();
    }

    // 스페이스바 팬 모드 종료
    if (this.isSpacePressed && this.dragStartScreen) {
      this.canvas.style.cursor = 'grab';
      this.dragStartScreen = null;
      this.panStart = null;
    }
    
    this.isDragging = false;
    this.dragStartMousePos = null;
    this.dragStartPersonsPos = null;
  }

  /**
   * 휠 이벤트 (줌)
   */
  handleWheel(e) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    this.zoom(delta);
  }

  /**
   * 키보드 이벤트 (keydown)
   */
  handleKeyDown(e) {
    // 스페이스바: 임시로 팬 도구로 전환
    if (e.code === 'Space' && !this.isSpacePressed) {
      e.preventDefault(); // 스페이스바 기본 동작 방지 (스크롤)
      this.isSpacePressed = true;
      
      // 현재 도구가 팬이 아닌 경우에만 임시 전환
      if (this.currentTool !== 'pan') {
        this.previousTool = this.currentTool;
        this.canvas.style.cursor = 'grab';
      }
      return;
    }

    // Delete/Backspace: 선택된 인물 삭제
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (this.canvasState.selectedPersons.length > 0) {
        this.canvasState.selectedPersons.forEach(id => {
          this.canvasState.removePerson(id);
        });
        this.render();
        Toast.success('인물이 삭제되었습니다');
      }
    }

    // 도구 단축키
    const toolKeys = {
      'v': 'select',
      'h': 'pan',
      'p': 'person',
      'r': 'relationship'
    };

    if (toolKeys[e.key.toLowerCase()]) {
      this.setTool(toolKeys[e.key.toLowerCase()]);
    }
  }

  /**
   * 키보드 이벤트 (keyup)
   */
  handleKeyUp(e) {
    // 스페이스바 해제: 이전 도구로 복귀
    if (e.code === 'Space' && this.isSpacePressed) {
      e.preventDefault();
      this.isSpacePressed = false;
      
      // 이전 도구가 있으면 복귀
      if (this.previousTool) {
        const cursors = {
          select: 'default',
          pan: 'grab',
          person: 'crosshair',
          relationship: 'crosshair'
        };
        this.canvas.style.cursor = cursors[this.previousTool] || 'default';
        this.previousTool = null;
      }
    }
  }

  /**
   * 인물 추가
   */
  addPerson(x, y) {
    // Magnet 기능: 그리드에 스냅
    if (appState.get('settings.enableMagnet')) {
      const gridSize = 50; // 그리드 크기와 동일
      x = Math.round(x / gridSize) * gridSize;
      y = Math.round(y / gridSize) * gridSize;
    }

    const person = new Person({
      name: `인물 ${this.canvasState.persons.length + 1}`,
      x,
      y,
      gender: 'male'
    });

    this.canvasState.addPerson(person);
    this.render();
    Toast.success('인물이 추가되었습니다');
  }

  /**
   * 줌
   */
  zoom(delta) {
    const newZoom = this.canvasState.zoom + delta;
    this.canvasState.setZoom(newZoom);
    this.updateZoomDisplay();
    this.render();
  }

  /**
   * 줌 표시 업데이트
   */
  updateZoomDisplay() {
    const percentage = Math.round(this.canvasState.zoom * 100);
    document.getElementById('zoomValue').textContent = `${percentage}%`;
  }

  /**
   * 렌더링
   */
  render() {
    // 배경색 (흰색)
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 변환 적용
    this.ctx.save();
    this.ctx.translate(this.canvasState.pan.x, this.canvasState.pan.y);
    this.ctx.scale(this.canvasState.zoom, this.canvasState.zoom);

    // 그리드 그리기
    const gridType = appState.get('settings.showGrid');
    if (gridType && gridType !== 'none') {
      this.drawGrid();
    }

    // 관계선 그리기 (그룹화하여 렌더링)
    if (!this.genogramRenderer) {
      this.genogramRenderer = new GenogramRenderer(this.ctx, this.canvasState);
    }
    this.genogramRenderer.renderAllRelationships(this.canvasState.relationships);

    // 인물 그리기
    this.canvasState.persons.forEach(person => {
      this.drawPerson(person);
    });

    // 임시 관계선 그리기
    if (this.currentTool === 'relationship' && this.relationshipTool.isPending()) {
      this.relationshipTool.drawPending(this.ctx, this.mousePos.x, this.mousePos.y);
    }
    
    // 감정선 대기 중 시각화
    if (this.emotionalOps.isPending()) {
      const firstPerson = this.emotionalOps.getFirstPerson();
      if (firstPerson) {
        // 첨 번째 인물 강조
        this.ctx.save();
        this.ctx.strokeStyle = '#22c55e';
        this.ctx.lineWidth = 3;
        this.ctx.setLineDash([5, 5]);
        const size = firstPerson.size || 60;
        const halfSize = size / 2;
        this.ctx.strokeRect(
          firstPerson.x - halfSize - 5,
          firstPerson.y - halfSize - 5,
          size + 10,
          size + 10
        );
        this.ctx.setLineDash([]);
        this.ctx.restore();
      }
    }

    // 박스 선택 시각화
    if (this.isBoxSelecting && this.boxSelectStart && this.boxSelectEnd) {
      this.ctx.save();
      this.ctx.strokeStyle = '#3b82f6';
      this.ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([5, 5]);
      
      const x = this.boxSelectStart.x;
      const y = this.boxSelectStart.y;
      const width = this.boxSelectEnd.x - this.boxSelectStart.x;
      const height = this.boxSelectEnd.y - this.boxSelectStart.y;
      
      this.ctx.fillRect(x, y, width, height);
      this.ctx.strokeRect(x, y, width, height);
      
      this.ctx.setLineDash([]);
      this.ctx.restore();
    }

    this.ctx.restore();

    // 통계 업데이트
    this.updateStats();
  }

  /**
   * 그리드 그리기
   */
  drawGrid() {
    const gridType = appState.get('settings.showGrid');
    if (gridType === 'none') return;

    const gridSize = 50;
    
    // 뷰포트 범위 계산 (무한 그리드)
    const startX = Math.floor(-this.canvasState.pan.x / this.canvasState.zoom / gridSize) * gridSize;
    const startY = Math.floor(-this.canvasState.pan.y / this.canvasState.zoom / gridSize) * gridSize;
    const endX = startX + (this.canvas.width / this.canvasState.zoom) + gridSize;
    const endY = startY + (this.canvas.height / this.canvasState.zoom) + gridSize;

    if (gridType === 'dotted') {
      // 점 그리드 - 진짜 점으로 표시
      this.ctx.fillStyle = '#c0c0c0'; // 연한 회색
      const dotRadius = 1.5; // 점 크기
      
      for (let x = startX; x <= endX; x += gridSize) {
        for (let y = startY; y <= endY; y += gridSize) {
          this.ctx.beginPath();
          this.ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
          this.ctx.fill();
        }
      }
    } else {
      // 실선 그리드
      this.ctx.lineWidth = 1;
      this.ctx.strokeStyle = '#d8d8d8';
      this.ctx.setLineDash([]);

      // 수직선 그리기
      for (let x = startX; x <= endX; x += gridSize) {
        this.ctx.beginPath();
        this.ctx.moveTo(x, startY);
        this.ctx.lineTo(x, endY);
        this.ctx.stroke();
      }

      // 수평선 그리기
      for (let y = startY; y <= endY; y += gridSize) {
        this.ctx.beginPath();
        this.ctx.moveTo(startX, y);
        this.ctx.lineTo(endX, y);
        this.ctx.stroke();
      }
    }

    // 점선 설정 초기화
    this.ctx.setLineDash([]);
  }

  /**
   * 인물 그리기
   */
  drawPerson(person) {
    const size = person.size || 60;
    const halfSize = size / 2;
    const lineWidth = appState.get('settings.lineWidth') || 2;

    // 선택 표시
    if (this.canvasState.selectedPersons.includes(person.id)) {
      this.ctx.strokeStyle = '#3b82f6';
      this.ctx.lineWidth = lineWidth + 1;
      this.ctx.strokeRect(
        person.x - halfSize - 5,
        person.y - halfSize - 5,
        size + 10,
        size + 10
      );
    }

    // 도형 그리기
    this.ctx.lineWidth = lineWidth;
    this.ctx.fillStyle = '#ffffff'; // 흰색 배경
    this.ctx.strokeStyle = '#000000'; // 검정색 테두리

    if (person.gender === 'male') {
      // 사각형 (남성)
      this.ctx.fillRect(person.x - halfSize, person.y - halfSize, size, size);
      this.ctx.strokeRect(person.x - halfSize, person.y - halfSize, size, size);
      
      // CT 표시: 이중 선 (Genogram 표준)
      if (person.isCT) {
        this.ctx.save();
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = lineWidth;
        const offset = 4;
        this.ctx.strokeRect(
          person.x - halfSize + offset,
          person.y - halfSize + offset,
          size - offset * 2,
          size - offset * 2
        );
        this.ctx.restore();
      }
    } else if (person.gender === 'female') {
      // 원 (여성)
      this.ctx.beginPath();
      this.ctx.arc(person.x, person.y, halfSize, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.stroke();
      
      // CT 표시: 이중 원 (Genogram 표준)
      if (person.isCT) {
        this.ctx.save();
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = lineWidth;
        const offset = 4;
        this.ctx.beginPath();
        this.ctx.arc(person.x, person.y, halfSize - offset, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.restore();
      }
    } else {
      // 다이아몬드 (성별 미상)
      this.ctx.beginPath();
      this.ctx.moveTo(person.x, person.y - halfSize);
      this.ctx.lineTo(person.x + halfSize, person.y);
      this.ctx.lineTo(person.x, person.y + halfSize);
      this.ctx.lineTo(person.x - halfSize, person.y);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.stroke();
      
      // CT 표시: 이중 다이아몬드 (Genogram 표준)
      if (person.isCT) {
        this.ctx.save();
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = lineWidth;
        const offset = 4;
        const innerHalfSize = halfSize - offset;
        this.ctx.beginPath();
        this.ctx.moveTo(person.x, person.y - innerHalfSize);
        this.ctx.lineTo(person.x + innerHalfSize, person.y);
        this.ctx.lineTo(person.x, person.y + innerHalfSize);
        this.ctx.lineTo(person.x - innerHalfSize, person.y);
        this.ctx.closePath();
        this.ctx.stroke();
        this.ctx.restore();
      }
    }

    // 이름 표시 (badge/label 스타일)
    if (appState.get('settings.showNames')) {
      const nameY = person.y + halfSize + 5;
      
      // 텍스트 크기 측정
      this.ctx.font = '13px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'top';
      const textMetrics = this.ctx.measureText(person.name);
      const textWidth = textMetrics.width;
      
      // 배지 크기 계산
      const paddingX = 8;
      const paddingY = 4;
      const badgeWidth = textWidth + paddingX * 2;
      const badgeHeight = 20;
      const badgeX = person.x - badgeWidth / 2;
      const badgeY = nameY;
      const borderRadius = 10;
      
      // 배지 배경 그리기 (둥근 모서리)
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.75)'; // 반투명 검정
      this.ctx.beginPath();
      this.ctx.moveTo(badgeX + borderRadius, badgeY);
      this.ctx.lineTo(badgeX + badgeWidth - borderRadius, badgeY);
      this.ctx.arcTo(badgeX + badgeWidth, badgeY, badgeX + badgeWidth, badgeY + borderRadius, borderRadius);
      this.ctx.lineTo(badgeX + badgeWidth, badgeY + badgeHeight - borderRadius);
      this.ctx.arcTo(badgeX + badgeWidth, badgeY + badgeHeight, badgeX + badgeWidth - borderRadius, badgeY + badgeHeight, borderRadius);
      this.ctx.lineTo(badgeX + borderRadius, badgeY + badgeHeight);
      this.ctx.arcTo(badgeX, badgeY + badgeHeight, badgeX, badgeY + badgeHeight - borderRadius, borderRadius);
      this.ctx.lineTo(badgeX, badgeY + borderRadius);
      this.ctx.arcTo(badgeX, badgeY, badgeX + borderRadius, badgeY, borderRadius);
      this.ctx.closePath();
      this.ctx.fill();
      
      // 텍스트 그리기
      this.ctx.fillStyle = '#ffffff'; // 흰색 텍스트
      this.ctx.font = '13px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(person.name, person.x, badgeY + badgeHeight / 2);
    }

    // 나이 표시 (인물 노트 중심에)
    if (appState.get('settings.showAges')) {
      const age = person.getAge();
      if (age !== null) {
        this.ctx.fillStyle = '#000000'; // 검정색
        this.ctx.font = 'bold 16px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(`${age}`, person.x, person.y);
      }
    }

    // CT 텍스트 표시 (인물 위쪽에)
    if (person.isCT) {
      this.ctx.fillStyle = '#3b82f6'; // Primary color
      this.ctx.font = 'bold 12px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'bottom';
      this.ctx.fillText('CT', person.x, person.y - halfSize - 8);
    }

    // 사망 표시
    if (person.isDeceased && appState.get('settings.showDeathDates')) {
      // X 표시 (도형 꼭짓점에 정확히 맞춤, 여백 없음)
      this.ctx.strokeStyle = '#000000';
      this.ctx.lineWidth = lineWidth;
      this.ctx.beginPath();
      
      if (person.gender === 'female') {
        // 원형: 원 위의 45도 지점을 정확히 연결
        // 원 위의 점: (x + r*cos(θ), y + r*sin(θ))
        // 45도 = π/4, 135도 = 3π/4, 225도 = 5π/4, 315도 = 7π/4
        const radius = halfSize;
        const cos45 = Math.cos(Math.PI / 4); // ≈ 0.7071
        const sin45 = Math.sin(Math.PI / 4); // ≈ 0.7071
        
        // 대각선 1: 좌상(225도) -> 우하(45도)
        this.ctx.moveTo(person.x - radius * cos45, person.y - radius * sin45);
        this.ctx.lineTo(person.x + radius * cos45, person.y + radius * sin45);
        // 대각선 2: 우상(315도) -> 좌하(135도)
        this.ctx.moveTo(person.x + radius * cos45, person.y - radius * sin45);
        this.ctx.lineTo(person.x - radius * cos45, person.y + radius * sin45);
      } else if (person.gender === 'male') {
        // 사각형: 정확히 모서리에서 모서리로
        this.ctx.moveTo(person.x - halfSize, person.y - halfSize);
        this.ctx.lineTo(person.x + halfSize, person.y + halfSize);
        this.ctx.moveTo(person.x + halfSize, person.y - halfSize);
        this.ctx.lineTo(person.x - halfSize, person.y + halfSize);
      } else {
        // 다이아몬드: X자 형태 (마름모 내부에 맞게 정확히 조정)
        // 마름모는 45도 회전된 사각형
        // 마름모의 방정식: |x|/halfSize + |y|/halfSize = 1
        // 45도 대각선 방향(x=y)이 마름모와 만나는 지점:
        // |x|/halfSize + |x|/halfSize = 1
        // 2|x|/halfSize = 1
        // |x| = halfSize/2
        // 따라서 대각선의 길이는 halfSize/2
        const diagonal = halfSize / 2;
        
        // 대각선 1: 좌상 -> 우하
        this.ctx.moveTo(person.x - diagonal, person.y - diagonal);  
        this.ctx.lineTo(person.x + diagonal, person.y + diagonal);
        // 대각선 2: 우상 -> 좌하
        this.ctx.moveTo(person.x + diagonal, person.y - diagonal);
        this.ctx.lineTo(person.x - diagonal, person.y + diagonal);
      }
      
      this.ctx.stroke();
    }
  }

  /**
   * 관계선 그리기 (Genogram 표준 사용)
   */
  drawRelationship(rel) {
    // GenogramRenderer가 없으면 초기화
    if (!this.genogramRenderer) {
      this.genogramRenderer = new GenogramRenderer(this.ctx, this.canvasState);
    }

    const isSelected = this.canvasState.selectedRelationships.includes(rel.id);
    this.genogramRenderer.renderRelationship(rel, isSelected);
  }



  /**
   * 프로젝트 저장
   */
  saveProject() {
    try {
      // 프로젝트 데이터 업데이트
      this.project.data = this.canvasState.toJSON();
      this.project.modifiedAt = new Date().toISOString();
      this.project.personCount = this.canvasState.persons.length;
      this.project.relationshipCount = this.canvasState.relationships.length;

      // 프로젝트 목록 업데이트
      const projects = storage.get('projects', []);
      const index = projects.findIndex(p => p.id === this.projectId);
      if (index > -1) {
        projects[index] = this.project;
      }
      storage.set('projects', projects);

      Toast.success('저장되었습니다');
    } catch (error) {
      console.error('Failed to save project:', error);
      Toast.error('저장에 실패했습니다');
    }
  }

  /**
   * 자동 저장 설정
   */
  setupAutoSave() {
    if (appState.get('settings.autoSave')) {
      const interval = appState.get('settings.autoSaveInterval');
      setInterval(() => {
        this.saveProject();
      }, interval);
    }
  }

  /**
   * 통계 업데이트
   */
  updateStats() {
    const personCount = this.canvasState.persons.length;
    const relationshipCount = this.canvasState.relationships.length;

    const statsPersonEl = document.getElementById('statsPerson');
    const statsRelationshipEl = document.getElementById('statsRelationship');
    
    // 요소가 존재할 때만 업데이트 (튜토리얼 모드에서는 제거됨)
    if (statsPersonEl) {
      statsPersonEl.textContent = personCount;
    }
    if (statsRelationshipEl) {
      statsRelationshipEl.textContent = relationshipCount;
    }
  }

  /**
   * 히스토리 저장
   */
  saveHistory() {
    const state = this.canvasState.toJSON();
    this.historyManager.push(state);
    this.updateHistoryButtons();
  }

  /**
   * 실행 취소
   */
  undo() {
    const state = this.historyManager.undo();
    if (state) {
      this.canvasState.fromJSON(state);
      this.render();
      this.updateHistoryButtons();
      Toast.info('실행 취소');
    }
  }

  /**
   * 다시 실행
   */
  redo() {
    const state = this.historyManager.redo();
    if (state) {
      this.canvasState.fromJSON(state);
      this.render();
      this.updateHistoryButtons();
      Toast.info('다시 실행');
    }
  }

  /**
   * 히스토리 버튼 업데이트
   */
  updateHistoryButtons() {
    const undoBtn = document.getElementById('btnUndo');
    const redoBtn = document.getElementById('btnRedo');

    if (undoBtn) {
      undoBtn.disabled = !this.historyManager.canUndo();
    }
    if (redoBtn) {
      redoBtn.disabled = !this.historyManager.canRedo();
    }
  }

  /**
   * 컬텍스트 메뉴 액션 핸들러
   */
  handleContextMenuAction(action, target, targetType) {
    console.log('Context menu action:', action, targetType);

    if (targetType === 'canvas') {
      switch (action) {
        case 'add-person':
          // 우클릭한 위치에 인물 추가
          if (this.lastContextMenuPos) {
            this.addPerson(this.lastContextMenuPos.worldX, this.lastContextMenuPos.worldY);
            this.saveHistory();
            this.saveProject();
          }
          break;
        
        case 'select-all':
          // 모든 인물 선택
          this.canvasState.persons.forEach(person => {
            this.canvasState.selectPerson(person.id);
          });
          this.render();
          Toast.success(`${this.canvasState.persons.length}명 선택됨`);
          break;
        
        case 'deselect-all':
          // 모든 선택 해제
          this.canvasState.clearSelection();
          this.render();
          break;
      }
    } else if (targetType === 'person') {
      switch (action) {
        // 편집
        case 'edit-name':
          this.startInlineEdit(target, 'name');
          break;
        
        case 'edit-age':
          this.startInlineEdit(target, 'age');
          break;
        
        // 상태
        case 'toggle-ct':
          target.isCT = !target.isCT;
          this.saveHistory();
          this.render();
          this.saveProject();
          Toast.success(target.isCT ? 'CT(주요인물) 설정' : 'CT 해제');
          break;
        
        case 'toggle-deceased':
          target.isDeceased = !target.isDeceased;
          this.saveHistory();
          this.render();
          this.saveProject();
          Toast.success(target.isDeceased ? '사망 상태로 변경' : '사망 상태 해제');
          break;
        
        // 가족 추가
        case 'add-both-parents':
          this.personOps.addBothParents(target);
          this.saveHistory();
          this.render();
          this.saveProject();
          break;
        case 'add-father':
          this.personOps.addFather(target);
          this.saveHistory();
          this.render();
          this.saveProject();
          break;
        case 'add-mother':
          this.personOps.addMother(target);
          this.saveHistory();
          this.render();
          this.saveProject();
          break;
        case 'add-spouse':
          this.personOps.addSpouse(target);
          this.saveHistory();
          this.render();
          this.saveProject();
          break;
        case 'add-son':
          this.personOps.addSon(target);
          this.saveHistory();
          this.render();
          this.saveProject();
          break;
        case 'add-daughter':
          this.personOps.addDaughter(target);
          this.saveHistory();
          this.render();
          this.saveProject();
          break;
        case 'add-child-unknown':
          this.personOps.addChildUnknown(target);
          this.saveHistory();
          this.render();
          this.saveProject();
          break;
        case 'add-brother':
          this.personOps.addBrother(target);
          this.saveHistory();
          this.render();
          this.saveProject();
          break;
        case 'add-sister':
          this.personOps.addSister(target);
          this.saveHistory();
          this.render();
          this.saveProject();
          break;
        case 'add-sibling-unknown':
          this.personOps.addSiblingUnknown(target);
          this.saveHistory();
          this.render();
          this.saveProject();
          break;
        
        // 감정선 (최적화된 타입)
        case 'add-emotional-close':
        case 'add-emotional-love':
        case 'add-emotional-distant':
        case 'add-emotional-cutoff':
        case 'add-emotional-conflict':
        case 'add-emotional-hostile':
        case 'add-emotional-fused':
        case 'add-emotional-abuse-physical':
        case 'add-emotional-abuse-emotional':
        case 'add-emotional-abuse-sexual':
        case 'add-emotional-neglect':
          const emotionalType = action.replace('add-emotional-', '');
          this.emotionalOps.setEmotionalSubtype(emotionalType);
          this.emotionalOps.handlePersonClick(target);
          if (this.emotionalOps.isPending()) {
            // 첫 번째 인물 선택됨
            this.canvasState.clearSelection();
            this.canvasState.selectPerson(target.id);
            this.render();
          } else {
            // 두 번째 인물 선택됨 - 감정선 생성됨
            this.saveHistory();
            this.render();
            this.saveProject();
          }
          break;
        
        // 기본 액션
        case 'copy-person':
          this.copiedPerson = { ...target };
          Toast.success('복사되었습니다');
          break;
        
        case 'duplicate-person':
          this.personOps.duplicatePerson(target);
          this.saveHistory();
          this.render();
          this.saveProject();
          break;
        
        case 'delete-person':
          if (confirm(`"${target.name}"을(를) 삭제하시겠습니까?`)) {
            this.canvasState.removePerson(target.id);
            this.saveHistory();
            this.render();
            this.saveProject();
            Toast.success('삭제되었습니다');
          }
          break;
      }
    } else if (targetType === 'relationship') {
      switch (action) {
        case 'delete-relationship':
          if (confirm('이 관계를 삭제하시겠습니까?')) {
            this.canvasState.removeRelationship(target.id);
            this.saveHistory();
            this.render();
            this.saveProject();
            Toast.success('관계가 삭제되었습니다');
          }
          break;
      }
    }
  }

}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
  const canvasPage = new CanvasPage();
  window.__canvasPage = canvasPage;
});
