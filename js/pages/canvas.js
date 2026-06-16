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
import { ConfirmDialog } from '../ui/ConfirmDialog.js';
import { GenealogyLayoutEngine } from '../canvas/GenealogyLayoutEngine.js?v=20';

// ── BUG-09 핫픽스: _assignLevels 를 canvas.js 에서 직접 패치 ──────────────
// GenealogyLayoutEngine.js 캐시 문제를 우회하기 위해
// 올바른 Bellman-Ford 방식으로 덮어씁니다.
GenealogyLayoutEngine._assignLevels = function(persons, p2c, c2p, couples) {
  const lvMap = new Map();
  persons.forEach(p => lvMap.set(p.id, 0));

  const maxIter = persons.length + 2;
  for (let iter = 0; iter < maxIter; iter++) {
    let changed = false;

    p2c.forEach((children, parentId) => {
      const parentLv = lvMap.get(parentId) ?? 0;
      children.forEach(cid => {
        const needed = parentLv + 1;
        if ((lvMap.get(cid) ?? 0) < needed) {
          lvMap.set(cid, needed);
          changed = true;
        }
      });
    });

    couples.forEach((spSet, id) => {
      const lv = lvMap.get(id) ?? 0;
      spSet.forEach(sp => {
        const spLv = lvMap.get(sp) ?? 0;
        if (lv > spLv) { lvMap.set(sp, lv); changed = true; }
        else if (spLv > lv) { lvMap.set(id, spLv); changed = true; }
      });
    });

    if (!changed) break;
  }

  const maxLv = lvMap.size > 0 ? Math.max(...lvMap.values()) : 0;
  persons.forEach(p => { if (!lvMap.has(p.id)) lvMap.set(p.id, maxLv + 1); });

  const minLv = Math.min(...lvMap.values());
  if (minLv !== 0) lvMap.forEach((lv, id) => lvMap.set(id, lv - minLv));

  console.log('[BUG-09 핫픽스] _assignLevels 결과:', Object.fromEntries(lvMap));
  return lvMap;
};
console.log('[BUG-09 핫픽스] _assignLevels 패치 완료');

class CanvasPage {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.canvasState = new CanvasState();
    this.genogramRenderer = null;
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
    this.isSpacePressed = false;
    this.previousTool = null;
    this.dragStartPersonsPos = null;
    this.dragStartMousePos = null;
    this.isBoxSelecting = false;
    this.boxSelectStart = null;
    this.boxSelectEnd = null;
    this.tutorialManager = new TutorialManager(this.canvasState);

    // ── GenealogyLayoutEngine: canvasState 를 주입하여 생성 ────────────────
    // layout() 은 자동정렬 버튼과 템플릿 로드 양쪽에서 동일하게 호출된다.
    this.autoLayout = new GenealogyLayoutEngine(this.canvasState);

    this.init();
  }

  async init() {
    console.log('🎨 Canvas page initializing...');

    const params = new URLSearchParams(window.location.search);
    this.projectId = params.get('project');

    if (!this.projectId) {
      Toast.error('프로젝트 ID가 없습니다');
      setTimeout(() => { window.location.href = 'index.html'; }, 2000);
      return;
    }

    this.setupCanvas();
    await this.loadProject();
    this.bindEvents();
    this.render();
    this.setupAutoSave();

    console.log('✅ Canvas page ready');
  }

  // ── 정렬 ──────────────────────────────────────────────────────────────────

  /**
   * 세로/가로 간격을 1그리드(50px)씩 조절한다.
   * 모든 인물의 좌표 중심을 기준으로 각 인물을 비례 이동시킨다.
   * @param {'x'|'y'} axis   조절할 축
   * @param {1|-1}   sign   +1 = 넓히기, -1 = 좁히기
   */
  adjustSpacing(axis, sign) {
    const persons = this.canvasState.persons;
    if (persons.length < 2) { Toast.warning('인물이 2명 이상이어야 합니다'); return; }

    const GRID = 50;

    if (axis === 'y') {
      // Y축: 세대 레벨이 명확히 구분되므로 레벨 단위로 이동
      const levels = [...new Set(persons.map(p => p.y))].sort((a, b) => a - b);
      if (levels.length < 2) { Toast.warning('조절할 간격이 없습니다'); return; }

      const levelOffset = new Map();
      levels.forEach((lv, i) => levelOffset.set(lv, i * sign * GRID));

      persons.forEach(p => {
        const offset = levelOffset.get(p.y);
        if (offset === undefined) return;
        p.y = Math.round((p.y + offset) / GRID) * GRID;
      });
    } else {
      // X축: 중심 기준 비율 이동 (1그리드씩 확대/축소)
      // 각 인물을 전체 중심으로부터 sign×GRID 만큼 멀어지거나 가까워지게 이동
      const center = persons.reduce((s, p) => s + p.x, 0) / persons.length;

      persons.forEach(p => {
        const dist = p.x - center;
        if (dist === 0) return;
        const next = p.x + sign * GRID * Math.sign(dist);
        p.x = Math.round(next / GRID) * GRID;
      });
    }

    this.saveHistory();
    this.render();
    Toast.success(axis === 'y'
      ? (sign > 0 ? '세로 간격을 넓혔습니다' : '세로 간격을 좁혔습니다')
      : (sign > 0 ? '가로 간격을 넓혔습니다' : '가로 간격을 좁혔습니다')
    );
  }

  /**
   * 자동정렬 버튼 / 단축키 핸들러.
   * AutoLayout.layout() 을 호출하는 유일한 UI 진입점.
   */
  applyAutoLayout() {
    if (this.canvasState.persons.length === 0) {
      Toast.warning('정렬할 인물이 없습니다');
      return;
    }
    try {
      this.autoLayout.layout();   // ← 통합 정렬 엔진 호출
      this.saveHistory();
      this.centerView();
      this.render();
      Toast.success('자동정렬이 적용되었습니다');
    } catch (err) {
      console.error('AutoLayout error:', err);
      Toast.error('자동정렬 중 오류가 발생했습니다');
    }
  }

  // ── 뷰 ────────────────────────────────────────────────────────────────────

  centerView() {
    if (this.canvasState.persons.length === 0) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    this.canvasState.persons.forEach(person => {
      const half = (person.size || 60) / 2;
      minX = Math.min(minX, person.x - half);
      minY = Math.min(minY, person.y - half);
      maxX = Math.max(maxX, person.x + half);
      maxY = Math.max(maxY, person.y + half);
    });

    const cw = maxX - minX, ch = maxY - minY;
    const padding = 1.2;
    const zoomX = this.canvas.width  / (cw * padding);
    const zoomY = this.canvas.height / (ch * padding);
    const optimalZoom = Math.min(zoomX, zoomY, 1.5);

    this.canvasState.setZoom(optimalZoom);
    this.canvasState.setPan(
      this.canvas.width  / 2 - ((minX + maxX) / 2) * optimalZoom,
      this.canvas.height / 2 - ((minY + maxY) / 2) * optimalZoom
    );
    this.updateZoomDisplay();
  }

  // ── 캔버스 / 프로젝트 ─────────────────────────────────────────────────────

  setupCanvas() {
    this.canvas = document.getElementById('genogram-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.resizeCanvas();
    window.addEventListener('resize', debounce(() => { this.resizeCanvas(); this.render(); }, 250));
  }

  resizeCanvas() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width  = rect.width;
    this.canvas.height = rect.height;
  }

  async loadProject() {
    try {
      const projects = storage.get('projects', []);
      this.project = projects.find(p => p.id === this.projectId);

      if (!this.project) {
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
        projects.push(this.project);
        storage.set('projects', projects);
        Toast.info('새 프로젝트가 생성되었습니다');
      }

      if (this.project.data) {
        const canvasData = {
          persons:       this.project.data.people || this.project.data.persons || [],
          relationships: this.project.data.relationships  || [],
          emotionalLines:this.project.data.emotionalLines || [],
          zoom: this.project.data.zoom || 1.0,
          pan:  this.project.data.pan  || { x: 0, y: 0 }
        };
        this.canvasState.fromJSON(canvasData);
      }

      this.saveHistory();

      if (!this.genogramRenderer) {
        this.genogramRenderer = new GenogramRenderer(this.ctx, this.canvasState);
      }

      // ── 자동정렬 실행 조건 ───────────────────────────────────────────────
      // needsLayout:true  → index.js 에서 템플릿으로 처음 생성된 프로젝트.
      //   템플릿의 하드코딩 좌표를 무시하고 AutoLayout 을 실행한 뒤
      //   플래그를 제거(=이후 F5 새로고침 시 재실행 방지)한다.
      // needsLayout 없음 → 저장된 프로젝트 또는 F5 새로고침.
      //   fromJSON 이 이미 좌표를 복원했으므로 AutoLayout 을 건너뛴다.
      if (this.project.needsLayout && this.canvasState.persons.length > 0) {
        try {
          this.autoLayout.layout();   // ← 통합 정렬 엔진
          console.log('✅ 템플릿 첫 로드: AutoLayout 적용 완료');
        } catch (err) {
          console.warn('Template layout failed, using stored coords:', err);
        }
        // 플래그 제거 후 프로젝트 저장 (F5 재실행 방지)
        this.project.needsLayout = false;
        const _projects = storage.get('projects', []);
        const _idx = _projects.findIndex(p => p.id === this.projectId);
        if (_idx > -1) { _projects[_idx] = this.project; storage.set('projects', _projects); }
      }

      // 새 템플릿 프로젝트(방금 AutoLayout 실행 완료)는 화면 중앙에 맞춘다.
      // 저장된 프로젝트는 fromJSON 에서 이미 zoom/pan 을 복원했으므로 건너뛴다.
      // needsLayout 이 이미 false 로 저장됐으므로, templateId 존재 + data 있음
      // + needsLayout===false 조합이 "방금 레이아웃 완료" 상태다.
      const justLaidOut = this.project.templateId && !this.project.isTutorial && !this.project.needsLayout;
      if (this.canvasState.persons.length > 0 &&
          (!this.project.data || justLaidOut)) this.centerView();

      if (this.project.isTutorial && this.project.tutorialData) {
        console.log('튜토리얼 시작...', this.project);
        setTimeout(() => {
          this.tutorialManager.start({
            isTutorial: true,
            name: this.project.name,
            tutorialSteps: this.project.tutorialData,
            data: this.project.data
          });
        }, 500);
      }

      Toast.success('프로젝트를 불러왔습니다');
    } catch (error) {
      console.error('Failed to load project:', error);
      if (!this.project) {
        this.project = {
          id: this.projectId, name: '새 프로젝트',
          createdAt: new Date().toISOString(), modifiedAt: new Date().toISOString(),
          personCount: 0, relationshipCount: 0, data: null
        };
      }
      Toast.error('프로젝트를 불러오지 못했습니다');
    }
  }

  // ── 이벤트 바인딩 ─────────────────────────────────────────────────────────

  bindEvents() {
    document.getElementById('btnAutoLayout').addEventListener('click', () => this.applyAutoLayout());
    document.getElementById('btnVSpacingInc').addEventListener('click', () => this.adjustSpacing('y',  1));
    document.getElementById('btnVSpacingDec').addEventListener('click', () => this.adjustSpacing('y', -1));
    document.getElementById('btnHSpacingInc').addEventListener('click', () => this.adjustSpacing('x',  1));
    document.getElementById('btnHSpacingDec').addEventListener('click', () => this.adjustSpacing('x', -1));
    document.getElementById('btnBack').addEventListener('click', () => { window.location.href = 'index.html'; });
    document.getElementById('btnSave').addEventListener('click', () => this.openSaveModal());
    document.getElementById('btnLoad').addEventListener('click', () => this.openLoadModal());
    document.getElementById('btnExport').addEventListener('click', () => this.openExportModal());
    document.getElementById('btnUndo').addEventListener('click', () => this.undo());
    document.getElementById('btnRedo').addEventListener('click', () => this.redo());

    document.querySelectorAll('.tool-btn').forEach(btn => {
      btn.addEventListener('click', e => this.setTool(e.currentTarget.dataset.tool));
    });

    document.querySelectorAll('.relationship-type-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        this.relationshipTool.setType(e.currentTarget.dataset.type);
        document.querySelectorAll('.relationship-type-btn').forEach(b => b.classList.toggle('active', b === e.currentTarget));
      });
    });

    document.getElementById('btnZoomIn').addEventListener('click',    () => this.zoom( 0.1));
    document.getElementById('btnZoomOut').addEventListener('click',   () => this.zoom(-0.1));
    document.getElementById('btnZoomReset').addEventListener('click', () => {
      this.canvasState.setZoom(1.0); this.updateZoomDisplay(); this.render();
    });

    this.canvas.addEventListener('mousedown',   e => this.handleMouseDown(e));
    this.canvas.addEventListener('mousemove',   e => this.handleMouseMove(e));
    this.canvas.addEventListener('mouseup',     e => this.handleMouseUp(e));
    this.canvas.addEventListener('dblclick',    e => this.handleDoubleClick(e));
    this.canvas.addEventListener('contextmenu', e => this.handleContextMenu(e));
    this.canvas.addEventListener('wheel',       e => this.handleWheel(e));

    document.addEventListener('keydown', e => this.handleKeyDown(e));
    document.addEventListener('keyup',   e => this.handleKeyUp(e));

    this.contextMenu.setActionHandler((action, target, targetType) =>
      this.handleContextMenuAction(action, target, targetType)
    );
  }

  // ── 도구 / 인터랙션 ───────────────────────────────────────────────────────

  setTool(tool) {
    this.currentTool = tool;
    this.canvasState.setTool(tool);
    if (tool !== 'relationship') this.relationshipTool.reset();

    document.querySelectorAll('.tool-btn').forEach(btn =>
      btn.classList.toggle('tool-btn--active', btn.dataset.tool === tool)
    );

    const relControls = document.getElementById('relationshipControls');
    relControls.classList.toggle('relationship-controls--active', tool === 'relationship');

    const cursors = { select:'default', pan:'grab', person:'crosshair', relationship:'crosshair' };
    this.canvas.style.cursor = cursors[tool] || 'default';
  }

  handleDoubleClick(e) {
    const rect = this.canvas.getBoundingClientRect();
    const worldX = (e.clientX - rect.left - this.canvasState.pan.x) / this.canvasState.zoom;
    const worldY = (e.clientY - rect.top  - this.canvasState.pan.y) / this.canvasState.zoom;
    const person = this.canvasState.getPersonAt(worldX, worldY);
    if (person) this.openEditModal(person);
  }

  handleContextMenu(e) {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const worldX = (e.clientX - rect.left - this.canvasState.pan.x) / this.canvasState.zoom;
    const worldY = (e.clientY - rect.top  - this.canvasState.pan.y) / this.canvasState.zoom;
    this.lastContextMenuPos = { worldX, worldY };

    const person = this.canvasState.getPersonAt(worldX, worldY);
    if (person) { this.contextMenu.show(e.clientX, e.clientY, this.contextMenu.getPersonMenuItems(person), person, 'person'); return; }

    const rel = this.canvasState.getRelationshipAt(worldX, worldY);
    if (rel) { this.contextMenu.show(e.clientX, e.clientY, this.contextMenu.getRelationshipMenuItems(rel), rel, 'relationship'); return; }

    this.contextMenu.show(e.clientX, e.clientY, this.contextMenu.getCanvasMenuItems(), null, 'canvas');
  }

  handleMouseDown(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const worldX = (x - this.canvasState.pan.x) / this.canvasState.zoom;
    const worldY = (y - this.canvasState.pan.y) / this.canvasState.zoom;
    this.isDragging = true;

    if (this.isSpacePressed) {
      this.dragStartScreen = { x, y };
      this.panStart = { ...this.canvasState.pan };
      this.canvas.style.cursor = 'grabbing';
      return;
    }

    if (this.currentTool === 'select') {
      const person = this.canvasState.getPersonAt(worldX, worldY);
      if (person) {
        if (this.emotionalOps.isPending()) {
          this.emotionalOps.handlePersonClick(person);
          if (!this.emotionalOps.isPending()) { this.saveHistory(); this.render(); this.saveProject(); Toast.success('감정선이 추가되었습니다'); }
          return;
        }
        if (e.ctrlKey || e.metaKey) { this.canvasState.togglePersonSelection(person.id); }
        else {
          if (!this.canvasState.selectedPersons.includes(person.id)) {
            this.canvasState.clearSelection(); this.canvasState.selectPerson(person.id);
          }
        }
        this.render();
        this.dragStartMousePos = { x: worldX, y: worldY };
        this.dragStartPersonsPos = this.canvasState.getSelectedPersons().map(p => ({ id: p.id, x: p.x, y: p.y }));
      } else {
        const rel = this.canvasState.getRelationshipAt(worldX, worldY);
        if (rel) { this.canvasState.clearSelection(); this.canvasState.selectRelationship(rel.id); this.render(); }
        else {
          if (!e.ctrlKey && !e.metaKey) this.canvasState.clearSelection();
          this.isBoxSelecting = true;
          this.boxSelectStart = { x: worldX, y: worldY };
          this.boxSelectEnd   = { x: worldX, y: worldY };
          this.render();
        }
      }
    } else if (this.currentTool === 'pan') {
      this.dragStartScreen = { x, y };
      this.panStart = { ...this.canvasState.pan };
    } else if (this.currentTool === 'person') {
      this.addPerson(worldX, worldY);
    } else if (this.currentTool === 'relationship') {
      const success = this.relationshipTool.handleClick(x, y);
      if (success) { this.saveHistory(); this.saveProject(); }
      this.render();
    }
  }

  handleMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    this.mousePos = { x, y };

    if (!this.isDragging) {
      if (this.currentTool === 'relationship' && this.relationshipTool.isPending()) this.render();
      return;
    }

    if (this.isSpacePressed && this.dragStartScreen) {
      this.canvasState.setPan(this.panStart.x + x - this.dragStartScreen.x, this.panStart.y + y - this.dragStartScreen.y);
      this.render(); return;
    }

    if (this.currentTool === 'select') {
      if (this.isBoxSelecting && this.boxSelectStart) {
        this.boxSelectEnd = { x: (x - this.canvasState.pan.x) / this.canvasState.zoom, y: (y - this.canvasState.pan.y) / this.canvasState.zoom };
        this.render();
      } else if (this.dragStartPersonsPos && this.dragStartMousePos) {
        const wx = (x - this.canvasState.pan.x) / this.canvasState.zoom;
        const wy = (y - this.canvasState.pan.y) / this.canvasState.zoom;
        const dx = wx - this.dragStartMousePos.x, dy = wy - this.dragStartMousePos.y;
        this.dragStartPersonsPos.forEach(sp => {
          const p = this.canvasState.getPersonById(sp.id);
          if (!p) return;
          let nx = sp.x + dx, ny = sp.y + dy;
          if (appState.get('settings.enableMagnet')) { nx = Math.round(nx / 50) * 50; ny = Math.round(ny / 50) * 50; }
          p.x = nx; p.y = ny;
        });
        this.render();
      }
    } else if (this.currentTool === 'pan') {
      this.canvasState.setPan(this.panStart.x + x - this.dragStartScreen.x, this.panStart.y + y - this.dragStartScreen.y);
      this.render();
    }
  }

  handleMouseUp(e) {
    if (this.isBoxSelecting && this.boxSelectStart && this.boxSelectEnd) {
      const minX = Math.min(this.boxSelectStart.x, this.boxSelectEnd.x);
      const maxX = Math.max(this.boxSelectStart.x, this.boxSelectEnd.x);
      const minY = Math.min(this.boxSelectStart.y, this.boxSelectEnd.y);
      const maxY = Math.max(this.boxSelectStart.y, this.boxSelectEnd.y);
      this.canvasState.persons.forEach(p => {
        if (p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY && !this.canvasState.selectedPersons.includes(p.id))
          this.canvasState.selectPerson(p.id);
      });
      this.isBoxSelecting = false; this.boxSelectStart = null; this.boxSelectEnd = null;
      this.render();
    }

    if (this.isSpacePressed && this.dragStartScreen) {
      this.canvas.style.cursor = 'grab'; this.dragStartScreen = null; this.panStart = null;
    }

    if (this.dragStartPersonsPos) {
      const GRID = 50;
      this.canvasState.getSelectedPersons().forEach(p => {
        p.x = Math.round(p.x / GRID) * GRID;
        p.y = Math.round(p.y / GRID) * GRID;
      });
    }

    this.isDragging = false; this.dragStartMousePos = null; this.dragStartPersonsPos = null;
  }

  handleWheel(e) {
    e.preventDefault();
    this.zoom(e.deltaY > 0 ? -0.1 : 0.1);
  }

  handleKeyDown(e) {
    if (e.code === 'Space' && !this.isSpacePressed) {
      e.preventDefault(); this.isSpacePressed = true;
      if (this.currentTool !== 'pan') { this.previousTool = this.currentTool; this.canvas.style.cursor = 'grab'; }
      return;
    }
    if ((e.key === 'Delete' || e.key === 'Backspace') && this.canvasState.selectedPersons.length > 0) {
      this.canvasState.selectedPersons.forEach(id => this.canvasState.removePerson(id));
      this.render(); Toast.success('인물이 삭제되었습니다');
    }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'l') {
      e.preventDefault(); this.applyAutoLayout(); return;
    }
    const toolKeys = { v:'select', h:'pan', p:'person', r:'relationship' };
    if (toolKeys[e.key.toLowerCase()]) this.setTool(toolKeys[e.key.toLowerCase()]);
  }

  handleKeyUp(e) {
    if (e.code === 'Space' && this.isSpacePressed) {
      e.preventDefault(); this.isSpacePressed = false;
      if (this.previousTool) {
        const cursors = { select:'default', pan:'grab', person:'crosshair', relationship:'crosshair' };
        this.canvas.style.cursor = cursors[this.previousTool] || 'default';
        this.previousTool = null;
      }
    }
  }

  // ── 인물 / 편집 ───────────────────────────────────────────────────────────

  addPerson(x, y) {
    x = Math.round(x / 50) * 50; y = Math.round(y / 50) * 50;
    this.canvasState.addPerson(new Person({ name: `인물 ${this.canvasState.persons.length + 1}`, x, y, gender: 'male' }));
    this.render(); Toast.success('인물이 추가되었습니다');
  }

  openEditModal(person) {
    new PersonEditModal(person, updates => {
      this.canvasState.updatePerson(person.id, updates);
      this.saveHistory(); this.render(); this.saveProject();
    }).open();
  }

  openSettingsModal() { new SettingsModal().open(this); }
  openExportModal()   { this.saveProject(); new ExportModal(this.canvasState).open(); }
  openSaveModal() {
    new SaveModal(this.project.name, newName => {
      this.project.name = newName; this.saveProject(); Toast.success(`"${newName}"으로 일시저장되었습니다`);
    }).open();
  }
  openLoadModal() {
    new LoadModal(this.projectId, id => { window.location.href = `canvas.html?project=${id}`; }).open();
  }

  startInlineEdit(person, field) {
    document.querySelector('.inline-edit-input')?.remove();
    const input = document.createElement('input');
    input.type = field === 'age' ? 'number' : 'text';
    input.className = 'inline-edit-input';
    input.value = field === 'age' ? (person.age ?? '') : (person.name || '');
    input.placeholder = field === 'age' ? '나이 입력' : '이름 입력';
    if (field === 'age') { input.min = '0'; input.max = '150'; }

    const rect = this.canvas.getBoundingClientRect();
    const half = (person.size || 60) / 2;
    const sx = person.x * this.canvasState.zoom + this.canvasState.pan.x + rect.left;
    const sy = person.y * this.canvasState.zoom + this.canvasState.pan.y + rect.top;

    Object.assign(input.style, {
      position:'fixed', left:`${sx-50}px`, top:`${sy-half*this.canvasState.zoom-40}px`,
      width:'100px', padding:'8px', fontSize:'14px',
      border:'2px solid var(--color-primary)', borderRadius:'var(--radius-sm)',
      backgroundColor:'var(--color-bg-primary)', color:'var(--color-text-primary)',
      zIndex:'1000', textAlign:'center', boxShadow:'0 4px 6px rgba(0,0,0,0.1)'
    });
    document.body.appendChild(input);
    input.focus(); input.select();

    const save = () => {
      const v = input.value.trim();
      if (field === 'name') {
        if (v && v !== person.name) { person.name = v; this.saveHistory(); this.saveProject(); Toast.success('이름이 변경되었습니다'); }
      } else {
        if (v === '') { person.age = null; this.saveHistory(); this.saveProject(); }
        else { const n = parseInt(v); if (!isNaN(n) && n >= 0 && n <= 150) { person.age = n; this.saveHistory(); this.saveProject(); Toast.success('나이가 변경되었습니다'); } else { Toast.error('올바른 나이를 입력해주세요 (0-150)'); return; } }
      }
      input.remove(); this.render();
    };
    input.addEventListener('blur', save);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); save(); } else if (e.key === 'Escape') { e.preventDefault(); input.remove(); this.render(); } });
  }

  // ── 줌 ────────────────────────────────────────────────────────────────────

  zoom(delta) { this.canvasState.setZoom(this.canvasState.zoom + delta); this.updateZoomDisplay(); this.render(); }
  updateZoomDisplay() { document.getElementById('zoomValue').textContent = `${Math.round(this.canvasState.zoom * 100)}%`; }

  // ── 렌더링 ────────────────────────────────────────────────────────────────

  render() {
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.save();
    this.ctx.translate(this.canvasState.pan.x, this.canvasState.pan.y);
    this.ctx.scale(this.canvasState.zoom, this.canvasState.zoom);

    const gridType = appState.get('settings.showGrid');
    if (gridType && gridType !== 'none') this.drawGrid();

    if (!this.genogramRenderer) this.genogramRenderer = new GenogramRenderer(this.ctx, this.canvasState);
    this.genogramRenderer.renderAllRelationships(this.canvasState.relationships);

    this.canvasState.persons.forEach(p => this.drawPerson(p));

    if (this.currentTool === 'relationship' && this.relationshipTool.isPending())
      this.relationshipTool.drawPending(this.ctx, this.mousePos.x, this.mousePos.y);

    if (this.emotionalOps.isPending()) {
      const fp = this.emotionalOps.getFirstPerson();
      if (fp) {
        this.ctx.save();
        this.ctx.strokeStyle = '#22c55e'; this.ctx.lineWidth = 3; this.ctx.setLineDash([5,5]);
        const h = (fp.size || 60) / 2;
        this.ctx.strokeRect(fp.x-h-5, fp.y-h-5, fp.size+10 || 70, fp.size+10 || 70);
        this.ctx.setLineDash([]); this.ctx.restore();
      }
    }

    if (this.isBoxSelecting && this.boxSelectStart && this.boxSelectEnd) {
      this.ctx.save();
      this.ctx.strokeStyle = '#3b82f6'; this.ctx.fillStyle = 'rgba(59,130,246,0.1)';
      this.ctx.lineWidth = 2; this.ctx.setLineDash([5,5]);
      const bx = this.boxSelectStart.x, by = this.boxSelectStart.y;
      const bw = this.boxSelectEnd.x - bx, bh = this.boxSelectEnd.y - by;
      this.ctx.fillRect(bx,by,bw,bh); this.ctx.strokeRect(bx,by,bw,bh);
      this.ctx.setLineDash([]); this.ctx.restore();
    }

    this.ctx.restore();
    this.updateStats();
  }

  drawGrid() {
    const gridType = appState.get('settings.showGrid');
    if (gridType === 'none') return;
    const gs = 50;
    const sx = Math.floor(-this.canvasState.pan.x / this.canvasState.zoom / gs) * gs;
    const sy = Math.floor(-this.canvasState.pan.y / this.canvasState.zoom / gs) * gs;
    const ex = sx + this.canvas.width  / this.canvasState.zoom + gs;
    const ey = sy + this.canvas.height / this.canvasState.zoom + gs;

    if (gridType === 'dotted') {
      this.ctx.fillStyle = '#c0c0c0';
      for (let x = sx; x <= ex; x += gs)
        for (let y = sy; y <= ey; y += gs) { this.ctx.beginPath(); this.ctx.arc(x,y,1.5,0,Math.PI*2); this.ctx.fill(); }
    } else {
      this.ctx.lineWidth = 1; this.ctx.strokeStyle = '#d8d8d8'; this.ctx.setLineDash([]);
      for (let x = sx; x <= ex; x += gs) { this.ctx.beginPath(); this.ctx.moveTo(x,sy); this.ctx.lineTo(x,ey); this.ctx.stroke(); }
      for (let y = sy; y <= ey; y += gs) { this.ctx.beginPath(); this.ctx.moveTo(sx,y); this.ctx.lineTo(ex,y); this.ctx.stroke(); }
    }
    this.ctx.setLineDash([]);
  }

  drawPerson(person) {
    const size = person.size || 60, half = size / 2;
    const lw = appState.get('settings.lineWidth') || 2;

    if (this.canvasState.selectedPersons.includes(person.id)) {
      this.ctx.strokeStyle = '#3b82f6'; this.ctx.lineWidth = lw + 1;
      this.ctx.strokeRect(person.x-half-5, person.y-half-5, size+10, size+10);
    }

    this.ctx.lineWidth = lw; this.ctx.fillStyle = '#ffffff'; this.ctx.strokeStyle = '#000000';

    if (person.gender === 'male') {
      this.ctx.fillRect(person.x-half, person.y-half, size, size);
      this.ctx.strokeRect(person.x-half, person.y-half, size, size);
      if (person.isCT) { this.ctx.save(); this.ctx.strokeStyle='#000000'; this.ctx.lineWidth=lw; const o=4; this.ctx.strokeRect(person.x-half+o, person.y-half+o, size-o*2, size-o*2); this.ctx.restore(); }
    } else if (person.gender === 'female') {
      this.ctx.beginPath(); this.ctx.arc(person.x, person.y, half, 0, Math.PI*2); this.ctx.fill(); this.ctx.stroke();
      if (person.isCT) { this.ctx.save(); this.ctx.strokeStyle='#000000'; this.ctx.lineWidth=lw; this.ctx.beginPath(); this.ctx.arc(person.x, person.y, half-4, 0, Math.PI*2); this.ctx.stroke(); this.ctx.restore(); }
    } else {
      this.ctx.beginPath(); this.ctx.moveTo(person.x, person.y-half); this.ctx.lineTo(person.x+half, person.y); this.ctx.lineTo(person.x, person.y+half); this.ctx.lineTo(person.x-half, person.y); this.ctx.closePath(); this.ctx.fill(); this.ctx.stroke();
      if (person.isCT) { this.ctx.save(); this.ctx.strokeStyle='#000000'; this.ctx.lineWidth=lw; const ih=half-4; this.ctx.beginPath(); this.ctx.moveTo(person.x,person.y-ih); this.ctx.lineTo(person.x+ih,person.y); this.ctx.lineTo(person.x,person.y+ih); this.ctx.lineTo(person.x-ih,person.y); this.ctx.closePath(); this.ctx.stroke(); this.ctx.restore(); }
    }

    if (appState.get('settings.showNames')) {
      const ny = person.y + half + 5;
      this.ctx.font = '13px sans-serif'; this.ctx.textAlign = 'center'; this.ctx.textBaseline = 'top';
      const tw = this.ctx.measureText(person.name).width;
      const bw = tw + 16, bh = 20, bx = person.x - bw/2, by = ny, br = 10;
      this.ctx.fillStyle = 'rgba(0,0,0,0.75)';
      this.ctx.beginPath();
      this.ctx.moveTo(bx+br,by); this.ctx.lineTo(bx+bw-br,by);
      this.ctx.arcTo(bx+bw,by, bx+bw,by+br, br); this.ctx.lineTo(bx+bw,by+bh-br);
      this.ctx.arcTo(bx+bw,by+bh, bx+bw-br,by+bh, br); this.ctx.lineTo(bx+br,by+bh);
      this.ctx.arcTo(bx,by+bh, bx,by+bh-br, br); this.ctx.lineTo(bx,by+br);
      this.ctx.arcTo(bx,by, bx+br,by, br); this.ctx.closePath(); this.ctx.fill();
      this.ctx.fillStyle = '#ffffff'; this.ctx.textBaseline = 'middle';
      this.ctx.fillText(person.name, person.x, by + bh/2);
    }

    if (appState.get('settings.showAges') && person.getAge() !== null) {
      this.ctx.fillStyle = '#000000'; this.ctx.font = 'bold 16px sans-serif';
      this.ctx.textAlign = 'center'; this.ctx.textBaseline = 'middle';
      this.ctx.fillText(`${person.getAge()}`, person.x, person.y);
    }

    if (person.isDeceased && appState.get('settings.showDeathDates')) {
      this.ctx.strokeStyle = '#000000'; this.ctx.lineWidth = lw; this.ctx.beginPath();
      if (person.gender === 'female') {
        const r = half, c = Math.cos(Math.PI/4);
        this.ctx.moveTo(person.x-r*c, person.y-r*c); this.ctx.lineTo(person.x+r*c, person.y+r*c);
        this.ctx.moveTo(person.x+r*c, person.y-r*c); this.ctx.lineTo(person.x-r*c, person.y+r*c);
      } else if (person.gender === 'male') {
        this.ctx.moveTo(person.x-half, person.y-half); this.ctx.lineTo(person.x+half, person.y+half);
        this.ctx.moveTo(person.x+half, person.y-half); this.ctx.lineTo(person.x-half, person.y+half);
      } else {
        const d = half/2;
        this.ctx.moveTo(person.x-d, person.y-d); this.ctx.lineTo(person.x+d, person.y+d);
        this.ctx.moveTo(person.x+d, person.y-d); this.ctx.lineTo(person.x-d, person.y+d);
      }
      this.ctx.stroke();
    }

    // ── CT 배지: 이름 label과 동일한 스타일, 빨간색, 도형 위쪽에 항상 최상단 렌더링 ──
    if (person.isCT) {
      this.ctx.save();
      const ctLabel = 'CT';
      this.ctx.font = 'bold 13px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'top';
      const tw = this.ctx.measureText(ctLabel).width;
      const bw = tw + 16, bh = 20, br = 10;
      // 배지 하단이 도형 상단에서 6px 위에 붙도록 배치
      const bx = person.x - bw / 2;
      const by = person.y - half - bh - 6;
      // 빨간 배경
      this.ctx.fillStyle = 'rgba(220,38,38,0.9)';
      this.ctx.beginPath();
      this.ctx.moveTo(bx+br, by);
      this.ctx.lineTo(bx+bw-br, by);
      this.ctx.arcTo(bx+bw, by,   bx+bw, by+br,   br);
      this.ctx.lineTo(bx+bw, by+bh-br);
      this.ctx.arcTo(bx+bw, by+bh, bx+bw-br, by+bh, br);
      this.ctx.lineTo(bx+br, by+bh);
      this.ctx.arcTo(bx,     by+bh, bx, by+bh-br,  br);
      this.ctx.lineTo(bx,    by+br);
      this.ctx.arcTo(bx,     by,    bx+br, by,      br);
      this.ctx.closePath();
      this.ctx.fill();
      // 흰 텍스트
      this.ctx.fillStyle = '#ffffff';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(ctLabel, person.x, by + bh / 2);
      this.ctx.restore();
    }
  }

  drawRelationship(rel) {
    if (!this.genogramRenderer) this.genogramRenderer = new GenogramRenderer(this.ctx, this.canvasState);
    this.genogramRenderer.renderRelationship(rel, this.canvasState.selectedRelationships.includes(rel.id));
  }

  // ── 저장 / 히스토리 ───────────────────────────────────────────────────────

  saveProject() {
    try {
      this.project.data = this.canvasState.toJSON();
      this.project.modifiedAt = new Date().toISOString();
      this.project.personCount = this.canvasState.persons.length;
      this.project.relationshipCount = this.canvasState.relationships.length;
      const projects = storage.get('projects', []);
      const idx = projects.findIndex(p => p.id === this.projectId);
      if (idx > -1) projects[idx] = this.project;
      storage.set('projects', projects);
      Toast.success('저장되었습니다');
    } catch (err) { console.error('Failed to save project:', err); Toast.error('저장에 실패했습니다'); }
  }

  setupAutoSave() {
    if (appState.get('settings.autoSave'))
      setInterval(() => this.saveProject(), appState.get('settings.autoSaveInterval'));
  }

  updateStats() {
    const pe = document.getElementById('statsPerson');
    const re = document.getElementById('statsRelationship');
    if (pe) pe.textContent = this.canvasState.persons.length;
    if (re) re.textContent = this.canvasState.relationships.length;
  }

  saveHistory() { this.historyManager.push(this.canvasState.toJSON()); this.updateHistoryButtons(); }
  undo() { const s = this.historyManager.undo(); if (s) { this.canvasState.fromJSON(s); this.render(); this.updateHistoryButtons(); Toast.info('실행 취소'); } }
  redo() { const s = this.historyManager.redo(); if (s) { this.canvasState.fromJSON(s); this.render(); this.updateHistoryButtons(); Toast.info('다시 실행'); } }
  updateHistoryButtons() {
    const u = document.getElementById('btnUndo'), r = document.getElementById('btnRedo');
    if (u) u.disabled = !this.historyManager.canUndo();
    if (r) r.disabled = !this.historyManager.canRedo();
  }

  // ── 컨텍스트 메뉴 액션 ────────────────────────────────────────────────────

  handleContextMenuAction(action, target, targetType) {
    if (targetType === 'canvas') {
      if (action === 'add-person' && this.lastContextMenuPos) { this.addPerson(this.lastContextMenuPos.worldX, this.lastContextMenuPos.worldY); this.saveHistory(); this.saveProject(); }
      else if (action === 'select-all') { this.canvasState.persons.forEach(p => this.canvasState.selectPerson(p.id)); this.render(); Toast.success(`${this.canvasState.persons.length}명 선택됨`); }
      else if (action === 'deselect-all') { this.canvasState.clearSelection(); this.render(); }
    } else if (targetType === 'person') {
      const save = () => { this.saveHistory(); this.render(); this.saveProject(); };
      switch (action) {
        case 'edit-name':          this.startInlineEdit(target, 'name'); break;
        case 'edit-age':           this.startInlineEdit(target, 'age');  break;
        case 'toggle-ct':          target.isCT = !target.isCT; save(); Toast.success(target.isCT ? 'CT 설정' : 'CT 해제'); break;
        case 'toggle-deceased':    target.isDeceased = !target.isDeceased; save(); Toast.success(target.isDeceased ? '사망 상태' : '사망 해제'); break;
        case 'add-both-parents':   this.personOps.addBothParents(target); save(); break;
        case 'add-father':         this.personOps.addFather(target);      save(); break;
        case 'add-mother':         this.personOps.addMother(target);      save(); break;
        case 'add-spouse':         this.personOps.addSpouse(target);      save(); break;
        case 'add-son':            this.personOps.addSon(target);         save(); break;
        case 'add-daughter':       this.personOps.addDaughter(target);    save(); break;
        case 'add-child-unknown':  this.personOps.addChildUnknown(target);save(); break;
        case 'add-brother':        this.personOps.addBrother(target);     save(); break;
        case 'add-sister':         this.personOps.addSister(target);      save(); break;
        case 'add-sibling-unknown':this.personOps.addSiblingUnknown(target);save();break;
        case 'copy-person':        this.copiedPerson = { ...target }; Toast.success('복사되었습니다'); break;
        case 'duplicate-person':   this.personOps.duplicatePerson(target); save(); break;
        case 'delete-person':
          ConfirmDialog.show(`"${target.name}"을(를) 삭제하시겠습니까?`, () => { this.canvasState.removePerson(target.id); save(); Toast.success('삭제되었습니다'); });
          break;
        default:
          if (action.startsWith('add-emotional-')) {
            const subtype = action.replace('add-emotional-', '');
            this.emotionalOps.setEmotionalSubtype(subtype);
            this.emotionalOps.handlePersonClick(target);
            if (this.emotionalOps.isPending()) { this.canvasState.clearSelection(); this.canvasState.selectPerson(target.id); this.render(); }
            else { save(); }
          }
      }
    } else if (targetType === 'relationship') {
      if (action === 'delete-relationship')
        ConfirmDialog.show('이 관계를 삭제하시겠습니까?', () => { this.canvasState.removeRelationship(target.id); this.saveHistory(); this.render(); this.saveProject(); Toast.success('관계가 삭제되었습니다'); });
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const canvasPage = new CanvasPage();
  window.__canvasPage = canvasPage;
});
