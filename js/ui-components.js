/**
 * Dropdown Component
 * 재사용 가능한 드롭다운 메뉴 컴포넌트
 */

class Dropdown {
    constructor(config) {
        this.toggle = config.toggle; // 버튼 엘리먼트
        this.menu = config.menu; // 메뉴 엘리먼트
        this.onSelect = config.onSelect; // 선택 시 콜백
        
        this.isOpen = false;
        this.init();
    }
    
    init() {
        // 토글 버튼 클릭
        this.toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleMenu();
        });
        
        // 메뉴 아이템 클릭
        const items = this.menu.querySelectorAll('.dropdown-item:not(.has-submenu)');
        items.forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const value = item.dataset.value;
                if (this.onSelect && value) {
                    this.onSelect(value, item);
                }
                this.close();
            });
        });
        
        // 외부 클릭 시 닫기
        document.addEventListener('click', (e) => {
            if (this.isOpen && !this.toggle.contains(e.target) && !this.menu.contains(e.target)) {
                this.close();
            }
        });
        
        // ESC 키로 닫기
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });
    }
    
    toggleMenu() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }
    
    open() {
        this.isOpen = true;
        this.menu.classList.add('show');
        this.toggle.classList.add('active');
        
        // 다른 드롭다운 닫기
        document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
            if (menu !== this.menu) {
                menu.classList.remove('show');
            }
        });
        document.querySelectorAll('.dropdown-toggle.active').forEach(toggle => {
            if (toggle !== this.toggle) {
                toggle.classList.remove('active');
            }
        });
    }
    
    close() {
        this.isOpen = false;
        this.menu.classList.remove('show');
        this.toggle.classList.remove('active');
    }
}

/**
 * 드롭다운 생성 헬퍼 함수
 * @param {Object} options - 드롭다운 설정
 * @returns {Dropdown} 드롭다운 인스턴스
 */
function createDropdown(options) {
    const {
        id,
        buttonText,
        buttonIcon,
        items,
        onSelect,
        className = ''
    } = options;
    
    // 컨테이너 생성
    const container = document.createElement('div');
    container.className = `dropdown ${className}`;
    container.id = id;
    
    // 토글 버튼 생성
    const toggle = document.createElement('button');
    toggle.className = 'dropdown-toggle btn btn-ghost btn-sm';
    toggle.innerHTML = `
        ${buttonIcon || ''}
        <span>${buttonText}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M3 5L6 8L9 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
    `;
    
    // 메뉴 생성
    const menu = document.createElement('div');
    menu.className = 'dropdown-menu';
    
    items.forEach((item, index) => {
        if (item.divider) {
            const divider = document.createElement('div');
            divider.className = 'dropdown-divider';
            menu.appendChild(divider);
        } else if (item.submenu) {
            // 서브메뉴 아이템
            const menuItem = document.createElement('div');
            menuItem.className = 'dropdown-item has-submenu';
            menuItem.innerHTML = `
                ${item.icon || ''}
                <span>${item.label}</span>
            `;
            
            const submenu = document.createElement('div');
            submenu.className = 'dropdown-submenu';
            
            item.submenu.forEach(subItem => {
                const subMenuItem = document.createElement('button');
                subMenuItem.className = 'dropdown-item';
                subMenuItem.dataset.value = subItem.value;
                subMenuItem.innerHTML = `
                    ${subItem.icon || ''}
                    <span>${subItem.label}</span>
                `;
                submenu.appendChild(subMenuItem);
            });
            
            menuItem.appendChild(submenu);
            menu.appendChild(menuItem);
        } else {
            // 일반 아이템
            const menuItem = document.createElement('button');
            menuItem.className = 'dropdown-item';
            menuItem.dataset.value = item.value;
            menuItem.innerHTML = `
                ${item.icon || ''}
                <span>${item.label}</span>
                ${item.shortcut ? `<span style="margin-left: auto; opacity: 0.5; font-size: 0.75rem;">${item.shortcut}</span>` : ''}
            `;
            menu.appendChild(menuItem);
        }
    });
    
    container.appendChild(toggle);
    container.appendChild(menu);
    
    // Dropdown 인스턴스 생성
    const dropdown = new Dropdown({
        toggle,
        menu,
        onSelect
    });
    
    return { container, dropdown };
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Dropdown, createDropdown };
}
/**
 * 관계 드롭다운 메뉴 구조 데이터
 */
const RelationshipMenuData = [
    {
        type: 'spouse',
        icon: 'spouse',
        label: '배우자 추가'
    },
    {
        type: 'child',
        icon: 'child',
        label: '자녀 추가',
        submenu: [
            { type: 'son', icon: 'son', label: '아들' },
            { type: 'daughter', icon: 'daughter', label: '딸' }
        ]
    },
    {
        type: 'sibling',
        icon: 'sibling',
        label: '형제자매 추가'
    },
    {
        type: 'parent',
        icon: 'parent',
        label: '부모 추가'
    },
    {
        type: 'parental-sibling',
        icon: 'parentalSibling',
        label: '부모 형제 추가',
        submenu: [
            { type: 'paternal-sibling', icon: 'paternalSibling', label: '아버지쪽' },
            { type: 'maternal-sibling', icon: 'maternalSibling', label: '어머니쪽' }
        ]
    }
];

/**
 * 내보내기 메뉴 구조 데이터
 */
const ExportMenuData = [
    { type: 'png', icon: 'png', label: 'PNG 이미지로 내보내기' },
    { type: 'svg', icon: 'svg', label: 'SVG 벡터로 내보내기' }
];

/**
 * 드롭다운 메뉴를 동적으로 생성하는 클래스
 */
class MenuBuilder {
    /**
     * 드롭다운 메뉴 아이템 생성
     */
    static createMenuItem(item) {
        const menuItem = document.createElement('button');
        menuItem.className = 'dropdown-item';
        menuItem.dataset.value = item.type;
        
        if (item.submenu) {
            menuItem.classList.add('has-submenu');
            menuItem.innerHTML = `
                ${getIcon(item.icon)}
                <span>${item.label}</span>
            `;
            
            const submenu = document.createElement('div');
            submenu.className = 'dropdown-submenu';
            item.submenu.forEach(subItem => {
                submenu.appendChild(this.createMenuItem(subItem));
            });
            menuItem.appendChild(submenu);
        } else {
            menuItem.innerHTML = `
                ${getIcon(item.icon)}
                <span>${item.label}</span>
            `;
        }
        
        return menuItem;
    }
    
    /**
     * 관계 추가 드롭다운 메뉴 생성
     */
    static buildRelationshipMenu() {
        const container = document.getElementById('relationshipDropdown');
        if (!container) return;
        
        const menu = container.querySelector('.dropdown-menu');
        if (!menu) return;
        
        menu.innerHTML = '';
        RelationshipMenuData.forEach(item => {
            menu.appendChild(this.createMenuItem(item));
        });
    }
    
    /**
     * 내보내기 드롭다운 메뉴 생성
     */
    static buildExportMenu() {
        const container = document.getElementById('exportDropdown');
        if (!container) {
            console.warn('Export dropdown container not found');
            return;
        }
        
        const menu = container.querySelector('.dropdown-menu');
        if (!menu) {
            console.warn('Export dropdown menu not found');
            return;
        }
        
        menu.innerHTML = '';
        ExportMenuData.forEach(item => {
            const menuItem = this.createMenuItem(item);
            menu.appendChild(menuItem);
            console.log('Added export menu item:', item.type, menuItem);
        });
        
        console.log('Export menu built with', ExportMenuData.length, 'items');
    }
    
    /**
     * 모든 메뉴 초기화
     */
    static initializeAll() {
        this.buildRelationshipMenu();
        this.buildExportMenu();
    }
}

// 전역으로 접근 가능하도록 설정
window.RelationshipMenuData = RelationshipMenuData;
window.ExportMenuData = ExportMenuData;
window.MenuBuilder = MenuBuilder;
/**
 * ContextMenu - 우클릭 컨텍스트 메뉴 관리 (서브메뉴 지원)
 */
class ContextMenu {
    constructor() {
        this.menuElement = null;
        this.activeTarget = null;
        this.activeTargetType = null; // 'person', 'canvas', 'relationship'
        this.init();
    }

    init() {
        // 컨텍스트 메뉴 엘리먼트 생성
        this.menuElement = document.createElement('div');
        this.menuElement.className = 'context-menu';
        this.menuElement.id = 'context-menu';
        document.body.appendChild(this.menuElement);

        // 외부 클릭 시 메뉴 닫기
        document.addEventListener('click', (e) => {
            if (!this.menuElement.contains(e.target)) {
                this.hide();
            }
        });

        // ESC 키로 메뉴 닫기
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hide();
            }
        });

        // 스크롤 시 메뉴 닫기
        window.addEventListener('scroll', () => {
            this.hide();
        }, true);
    }

    /**
     * 메뉴 아이템 렌더링 (서브메뉴 지원)
     */
    renderMenuItem(item) {
        if (item.type === 'divider') {
            return '<div class="context-menu-divider"></div>';
        }
        
        const disabledClass = item.disabled ? 'disabled' : '';
        const dangerClass = item.danger ? 'danger' : '';
        const hasSubmenu = item.submenu && item.submenu.length > 0;
        const submenuClass = hasSubmenu ? 'has-submenu' : '';
        const icon = item.icon || '';
        const shortcut = item.shortcut ? `<span class="context-menu-shortcut">${item.shortcut}</span>` : '';
        const arrow = hasSubmenu ? '<span class="context-menu-arrow">▶</span>' : '';
        
        let submenuHtml = '';
        if (hasSubmenu) {
            submenuHtml = `
                <div class="context-submenu">
                    ${item.submenu.map(subItem => this.renderMenuItem(subItem)).join('')}
                </div>
            `;
        }
        
        return `
            <div class="context-menu-item ${disabledClass} ${dangerClass} ${submenuClass}" data-action="${item.action || ''}">
                ${icon ? `<span class="context-menu-icon">${icon}</span>` : ''}
                <span class="context-menu-label">${item.label}</span>
                ${shortcut}
                ${arrow}
                ${submenuHtml}
            </div>
        `;
    }

    /**
     * 메뉴 표시
     */
    show(x, y, items, target = null, targetType = null) {
        this.activeTarget = target;
        this.activeTargetType = targetType;

        // 메뉴 아이템 렌더링
        this.menuElement.innerHTML = items.map(item => this.renderMenuItem(item)).join('');

        // 이벤트 리스너 추가 (메인 메뉴 아이템)
        this.menuElement.querySelectorAll('.context-menu-item:not(.disabled):not(.has-submenu)').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = e.currentTarget.dataset.action;
                if (action && this.onAction) {
                    this.onAction(action, this.activeTarget, this.activeTargetType);
                }
                this.hide();
            });
        });

        // 서브메뉴 아이템에도 이벤트 리스너 추가
        this.menuElement.querySelectorAll('.context-submenu .context-menu-item:not(.disabled)').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = e.currentTarget.dataset.action;
                if (action && this.onAction) {
                    this.onAction(action, this.activeTarget, this.activeTargetType);
                }
                this.hide();
            });
        });

        // 위치 설정 (화면 밖으로 나가지 않도록)
        this.menuElement.style.left = `${x}px`;
        this.menuElement.style.top = `${y}px`;
        this.menuElement.classList.add('active');

        // 메뉴가 화면 밖으로 나가는지 체크
        requestAnimationFrame(() => {
            const rect = this.menuElement.getBoundingClientRect();
            
            if (rect.right > window.innerWidth) {
                this.menuElement.style.left = `${x - rect.width}px`;
            }
            
            if (rect.bottom > window.innerHeight) {
                this.menuElement.style.top = `${y - rect.height}px`;
            }
        });
    }

    /**
     * 메뉴 숨기기
     */
    hide() {
        this.menuElement.classList.remove('active');
        this.activeTarget = null;
        this.activeTargetType = null;
    }

    /**
     * 액션 핸들러 등록
     */
    setActionHandler(handler) {
        this.onAction = handler;
    }

    /**
     * 인물 컨텍스트 메뉴 아이템
     */
    getPersonMenuItems(person) {
        return [
            {
                label: '속성 편집',
                icon: '✏️',
                action: 'edit-person',
                shortcut: 'Double Click'
            },
            { type: 'divider' },
            {
                label: '부모 추가',
                icon: '👨‍👩‍👧',
                submenu: [
                    { label: '아버지', icon: '👨', action: 'add-father' },
                    { label: '어머니', icon: '👩', action: 'add-mother' }
                ]
            },
            {
                label: '배우자 추가',
                icon: '💑',
                action: 'add-spouse'
            },
            { type: 'divider' },
            {
                label: '자녀 추가',
                icon: '👶',
                submenu: [
                    { label: '아들', icon: '👦', action: 'add-son' },
                    { label: '딸', icon: '👧', action: 'add-daughter' },
                    { label: '성별미상', icon: '👤', action: 'add-child-unknown' }
                ]
            },
            {
                label: '형제자매 추가',
                icon: '👥',
                submenu: [
                    { label: '남자형제', icon: '👦', action: 'add-brother' },
                    { label: '여자형제', icon: '👧', action: 'add-sister' },
                    { label: '성별미상', icon: '👤', action: 'add-sibling-unknown' }
                ]
            },
            { type: 'divider' },
            {
                label: '감정선 연결',
                icon: '💭',
                action: 'add-emotional'
            },
            { type: 'divider' },
            {
                label: '복사',
                icon: '📋',
                action: 'copy-person',
                shortcut: 'Ctrl+C'
            },
            { type: 'divider' },
            {
                label: '삭제',
                icon: '🗑️',
                action: 'delete-person',
                danger: true,
                shortcut: 'Delete'
            }
        ];
    }

    /**
     * 캔버스 컨텍스트 메뉴 아이템
     */
    getCanvasMenuItems() {
        return [
            {
                label: '새 인물 추가',
                icon: '➕',
                action: 'add-person'
            },
            { type: 'divider' },
            {
                label: '자동 정렬',
                icon: '📐',
                action: 'auto-layout'
            },
            {
                label: '줌 리셋',
                icon: '🔍',
                action: 'reset-zoom'
            },
            { type: 'divider' },
            {
                label: '전체 선택',
                icon: '☑️',
                action: 'select-all',
                shortcut: 'Ctrl+A'
            },
            {
                label: '선택 해제',
                icon: '◻️',
                action: 'deselect-all',
                shortcut: 'Esc'
            }
        ];
    }

    /**
     * 관계선 컨텍스트 메뉴 아이템
     */
    getRelationshipMenuItems(relationship) {
        const items = [
            {
                label: '속성 편집',
                icon: '✏️',
                action: 'edit-relationship'
            }
        ];

        // 부부 관계선인 경우 유형 변경 옵션 추가
        if (relationship.type === 'marriage') {
            items.push(
                { type: 'divider' },
                {
                    label: '관계 유형 변경',
                    icon: '🔄',
                    action: 'change-marriage-type'
                }
            );
        }

        items.push(
            { type: 'divider' },
            {
                label: '삭제',
                icon: '🗑️',
                action: 'delete-relationship',
                danger: true,
                shortcut: 'Delete'
            }
        );

        return items;
    }

    /**
     * 감정선 컨텍스트 메뉴 아이템
     */
    getEmotionalMenuItems(emotional) {
        return [
            {
                label: '감정선 유형 변경',
                icon: '💭',
                action: 'change-emotional-type'
            },
            { type: 'divider' },
            {
                label: '삭제',
                icon: '🗑️',
                action: 'delete-emotional',
                danger: true,
                shortcut: 'Delete'
            }
        ];
    }
}
/**
 * InlineEdit - 인물 이름 더블클릭으로 즉시 편집
 */
class InlineEdit {
    constructor(app) {
        this.app = app;
        this.activeEditor = null;
        this.originalValue = null;
        this.targetPerson = null;
        this.init();
    }

    init() {
        // ESC 키로 편집 취소
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.activeEditor) {
                this.cancel();
            }
        });

        // 외부 클릭으로 편집 완료
        document.addEventListener('click', (e) => {
            if (this.activeEditor && !this.activeEditor.contains(e.target)) {
                this.save();
            }
        });
    }

    /**
     * 인물 이름 편집 시작
     */
    startEdit(person, textElement) {
        // 이미 편집 중이면 무시
        if (this.activeEditor) {
            return;
        }

        this.targetPerson = person;
        this.originalValue = person.name;

        // 텍스트 엘리먼트 위치 가져오기
        const bbox = textElement.getBBox();
        const ctm = textElement.getCTM();
        
        // 줌/팬 고려한 실제 화면 좌표 계산
        const x = ctm.e + bbox.x;
        const y = ctm.f + bbox.y;
        const width = Math.max(bbox.width + 40, 120);
        const height = bbox.height + 8;

        // input 엘리먼트 생성
        const input = document.createElement('input');
        input.type = 'text';
        input.value = person.name;
        input.className = 'inline-edit-input';
        input.style.position = 'absolute';
        input.style.left = `${x}px`;
        input.style.top = `${y}px`;
        input.style.width = `${width}px`;
        input.style.height = `${height}px`;
        input.style.zIndex = '10000';

        // 원본 텍스트 숨기기
        textElement.style.opacity = '0';

        document.body.appendChild(input);
        this.activeEditor = input;

        // 포커스 및 전체 선택
        input.focus();
        input.select();

        // Enter 키로 저장
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.save();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                this.cancel();
            }
        });

        // 편집 모드 시각적 피드백
        const node = document.querySelector(`[data-id="${person.id}"]`);
        if (node) {
            node.classList.add('editing');
        }
    }

    /**
     * 편집 저장
     */
    save() {
        if (!this.activeEditor || !this.targetPerson) {
            return;
        }

        const newValue = this.activeEditor.value.trim();
        
        if (newValue && newValue !== this.originalValue) {
            // 이름 변경
            this.targetPerson.name = newValue;
            this.app.render();
            this.app.saveState();
            
            if (this.app.toolbar) {
                this.app.toolbar.showToast(`이름이 "${newValue}"(으)로 변경되었습니다`, 'success');
            }
        }

        this.cleanup();
    }

    /**
     * 편집 취소
     */
    cancel() {
        if (!this.activeEditor) {
            return;
        }

        if (this.app.toolbar) {
            this.app.toolbar.showToast('편집이 취소되었습니다', 'info');
        }

        this.cleanup();
    }

    /**
     * 편집 상태 정리
     */
    cleanup() {
        if (this.activeEditor) {
            // input 제거
            this.activeEditor.remove();
            this.activeEditor = null;
        }

        if (this.targetPerson) {
            // 원본 텍스트 표시
            const textElement = document.querySelector(
                `[data-id="${this.targetPerson.id}"] .node-name`
            );
            if (textElement) {
                textElement.style.opacity = '1';
            }

            // 편집 모드 클래스 제거
            const node = document.querySelector(`[data-id="${this.targetPerson.id}"]`);
            if (node) {
                node.classList.remove('editing');
            }

            this.targetPerson = null;
        }

        this.originalValue = null;
    }

    /**
     * 편집 중인지 확인
     */
    isEditing() {
        return this.activeEditor !== null;
    }
}
// ============================================================================
// MULTI SELECT - Multiple selection and manipulation
// ============================================================================

class MultiSelect {
    constructor(app) {
        this.app = app;
        this.selectedPersons = new Set(); // Set of person IDs
        this.selectedRelationships = new Set(); // Set of relationship IDs
        this.isSelecting = false; // Selection box active
        this.selectionBox = null;
        this.selectionStart = { x: 0, y: 0 };
        this.selectionEnd = { x: 0, y: 0 };
        
        this.setupSelectionBox();
        this.setupEventListeners();
    }

    setupSelectionBox() {
        // Create selection box element
        const svg = document.getElementById('canvas');
        const mainGroup = document.getElementById('main-group');
        
        // Create selection box layer
        this.selectionBoxGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        this.selectionBoxGroup.id = 'selection-box-layer';
        mainGroup.appendChild(this.selectionBoxGroup);
        
        // Create selection box rectangle
        this.selectionBox = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        this.selectionBox.setAttribute('class', 'selection-box');
        this.selectionBox.setAttribute('fill', 'rgba(59, 130, 246, 0.1)');
        this.selectionBox.setAttribute('stroke', '#3b82f6');
        this.selectionBox.setAttribute('stroke-width', '1.5');
        this.selectionBox.setAttribute('stroke-dasharray', '5,5');
        this.selectionBox.setAttribute('display', 'none');
        this.selectionBoxGroup.appendChild(this.selectionBox);
    }

    setupEventListeners() {
        const svg = document.getElementById('canvas');
        let isDraggingSelection = false;
        let dragStart = { x: 0, y: 0 };

        // Mouse down - start selection box
        svg.addEventListener('mousedown', (e) => {
            // Only activate on Shift key or when clicking on empty canvas
            if (!e.shiftKey) return;
            
            const target = e.target;
            if (target.closest('.genogram-node') || 
                target.closest('.relationship-group') || 
                target.closest('.emotional-group')) {
                return; // Don't start selection box on elements
            }

            isDraggingSelection = true;
            const point = this.getSVGPoint(e);
            this.selectionStart = { x: point.x, y: point.y };
            this.selectionEnd = { x: point.x, y: point.y };
            
            this.updateSelectionBox();
            this.selectionBox.setAttribute('display', 'block');
            e.preventDefault();
        });

        // Mouse move - update selection box
        svg.addEventListener('mousemove', (e) => {
            if (!isDraggingSelection) return;

            const point = this.getSVGPoint(e);
            this.selectionEnd = { x: point.x, y: point.y };
            this.updateSelectionBox();
        });

        // Mouse up - finish selection
        svg.addEventListener('mouseup', (e) => {
            if (!isDraggingSelection) return;

            isDraggingSelection = false;
            this.selectionBox.setAttribute('display', 'none');
            
            // Select elements within box
            this.selectElementsInBox();
        });

        // Ctrl+Click for individual selection
        svg.addEventListener('click', (e) => {
            if (!e.ctrlKey && !e.metaKey) return;

            const node = e.target.closest('.genogram-node');
            if (node) {
                e.stopPropagation();
                const personId = node.dataset.id;
                this.togglePersonSelection(personId);
            }
        });

        // Escape to clear selection
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.clearSelection();
            }
        });
    }

    getSVGPoint(e) {
        const svg = document.getElementById('canvas');
        const pt = svg.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        
        const mainGroup = document.getElementById('main-group');
        const transform = mainGroup.getCTM().inverse();
        const transformed = pt.matrixTransform(transform);
        
        return { x: transformed.x, y: transformed.y };
    }

    updateSelectionBox() {
        const x1 = Math.min(this.selectionStart.x, this.selectionEnd.x);
        const y1 = Math.min(this.selectionStart.y, this.selectionEnd.y);
        const x2 = Math.max(this.selectionStart.x, this.selectionEnd.x);
        const y2 = Math.max(this.selectionStart.y, this.selectionEnd.y);
        
        this.selectionBox.setAttribute('x', x1);
        this.selectionBox.setAttribute('y', y1);
        this.selectionBox.setAttribute('width', x2 - x1);
        this.selectionBox.setAttribute('height', y2 - y1);
    }

    selectElementsInBox() {
        const x1 = Math.min(this.selectionStart.x, this.selectionEnd.x);
        const y1 = Math.min(this.selectionStart.y, this.selectionEnd.y);
        const x2 = Math.max(this.selectionStart.x, this.selectionEnd.x);
        const y2 = Math.max(this.selectionStart.y, this.selectionEnd.y);

        // Clear previous selection
        this.clearSelection();

        // Select persons within box
        this.app.persons.forEach(person => {
            if (person.x >= x1 && person.x <= x2 && 
                person.y >= y1 && person.y <= y2) {
                this.addPersonSelection(person.id);
            }
        });

        this.updateSelectionUI();
        this.showSelectionCount();
    }

    togglePersonSelection(personId) {
        if (this.selectedPersons.has(personId)) {
            this.removePersonSelection(personId);
        } else {
            this.addPersonSelection(personId);
        }
        
        this.updateSelectionUI();
        this.showSelectionCount();
    }

    addPersonSelection(personId) {
        this.selectedPersons.add(personId);
        const node = document.querySelector(`[data-id="${personId}"]`);
        if (node) {
            node.classList.add('multi-selected');
        }
    }

    removePersonSelection(personId) {
        this.selectedPersons.delete(personId);
        const node = document.querySelector(`[data-id="${personId}"]`);
        if (node) {
            node.classList.remove('multi-selected');
        }
    }

    clearSelection() {
        // Clear all selections
        this.selectedPersons.forEach(personId => {
            const node = document.querySelector(`[data-id="${personId}"]`);
            if (node) {
                node.classList.remove('multi-selected');
            }
        });
        
        this.selectedPersons.clear();
        this.selectedRelationships.clear();
        
        this.updateSelectionUI();
    }

    updateSelectionUI() {
        // Remove previous multi-selected class
        document.querySelectorAll('.multi-selected').forEach(el => {
            el.classList.remove('multi-selected');
        });

        // Add multi-selected class to selected elements
        this.selectedPersons.forEach(personId => {
            const node = document.querySelector(`[data-id="${personId}"]`);
            if (node) {
                node.classList.add('multi-selected');
            }
        });
    }

    showSelectionCount() {
        const totalCount = this.selectedPersons.size + this.selectedRelationships.size;
        
        if (totalCount > 0) {
            const message = `${totalCount}개 선택됨 (인물: ${this.selectedPersons.size}, 관계: ${this.selectedRelationships.size})`;
            if (this.app.toolbar) {
                this.app.toolbar.showToast(message, 'info');
            }
        }
    }

    selectAll() {
        this.clearSelection();
        
        // Select all persons
        this.app.persons.forEach(person => {
            this.addPersonSelection(person.id);
        });
        
        this.updateSelectionUI();
        this.showSelectionCount();
    }

    hasSelection() {
        return this.selectedPersons.size > 0 || this.selectedRelationships.size > 0;
    }

    getSelectedCount() {
        return this.selectedPersons.size + this.selectedRelationships.size;
    }

    // Bulk operations
    deleteSelected() {
        if (!this.hasSelection()) {
            if (this.app.toolbar) {
                this.app.toolbar.showToast('삭제할 항목을 선택하세요', 'warning');
            }
            return;
        }

        const count = this.getSelectedCount();
        if (!confirm(`선택한 ${count}개 항목을 삭제하시겠습니까?`)) {
            return;
        }

        // Delete selected persons
        const personsToDelete = Array.from(this.selectedPersons);
        personsToDelete.forEach(personId => {
            this.app.deletePerson(personId);
        });

        // Delete selected relationships
        const relationshipsToDelete = Array.from(this.selectedRelationships);
        relationshipsToDelete.forEach(relId => {
            this.app.deleteRelationship(relId);
        });

        this.clearSelection();
        this.app.render();
        this.app.saveState();

        if (this.app.toolbar) {
            this.app.toolbar.showToast(`${count}개 항목이 삭제되었습니다`, 'success');
        }
    }

    moveSelected(dx, dy) {
        if (this.selectedPersons.size === 0) return;

        this.selectedPersons.forEach(personId => {
            const person = this.app.persons.find(p => p.id === personId);
            if (person) {
                person.x += dx;
                person.y += dy;
            }
        });

        this.app.render();
    }

    // Group selection by arrow keys
    setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            if (!this.hasSelection()) return;
            
            const moveAmount = e.shiftKey ? 10 : 1; // Shift for faster movement
            
            switch (e.key) {
                case 'ArrowUp':
                    this.moveSelected(0, -moveAmount);
                    e.preventDefault();
                    break;
                case 'ArrowDown':
                    this.moveSelected(0, moveAmount);
                    e.preventDefault();
                    break;
                case 'ArrowLeft':
                    this.moveSelected(-moveAmount, 0);
                    e.preventDefault();
                    break;
                case 'ArrowRight':
                    this.moveSelected(moveAmount, 0);
                    e.preventDefault();
                    break;
                case 'Delete':
                case 'Backspace':
                    this.deleteSelected();
                    e.preventDefault();
                    break;
            }
        });
    }

    // Drag multiple selected items
    setupMultiDrag() {
        const svg = document.getElementById('canvas');
        let isDragging = false;
        let dragStartPos = { x: 0, y: 0 };
        let initialPositions = new Map();

        svg.addEventListener('mousedown', (e) => {
            const node = e.target.closest('.genogram-node');
            if (!node) return;

            const personId = node.dataset.id;
            
            // Start multi-drag only if the clicked person is in selection
            if (this.selectedPersons.has(personId)) {
                isDragging = true;
                const point = this.getSVGPoint(e);
                dragStartPos = { x: point.x, y: point.y };
                
                // Store initial positions
                initialPositions.clear();
                this.selectedPersons.forEach(id => {
                    const person = this.app.persons.find(p => p.id === id);
                    if (person) {
                        initialPositions.set(id, { x: person.x, y: person.y });
                    }
                });

                // Add dragging class to all selected nodes
                this.selectedPersons.forEach(id => {
                    const n = document.querySelector(`[data-id="${id}"]`);
                    if (n) n.classList.add('dragging');
                });

                e.stopPropagation();
            }
        });

        svg.addEventListener('mousemove', (e) => {
            if (!isDragging || initialPositions.size === 0) return;

            const point = this.getSVGPoint(e);
            const dx = point.x - dragStartPos.x;
            const dy = point.y - dragStartPos.y;

            // Update positions
            this.selectedPersons.forEach(personId => {
                const person = this.app.persons.find(p => p.id === personId);
                const initial = initialPositions.get(personId);
                if (person && initial) {
                    let newX = initial.x + dx;
                    let newY = initial.y + dy;

                    // Apply magnet if enabled
                    if (this.app.isMagnetEnabled && this.app.renderer && this.app.renderer.gridSpacing) {
                        const spacing = this.app.renderer.gridSpacing;
                        newX = Math.round(newX / spacing) * spacing;
                        newY = Math.round(newY / spacing) * spacing;
                    }

                    person.x = newX;
                    person.y = newY;
                }
            });

            this.app.render();
        });

        svg.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                initialPositions.clear();

                // Remove dragging class
                this.selectedPersons.forEach(id => {
                    const n = document.querySelector(`[data-id="${id}"]`);
                    if (n) n.classList.remove('dragging');
                });

                this.app.saveState();
            }
        });

        svg.addEventListener('mouseleave', () => {
            if (isDragging) {
                isDragging = false;
                initialPositions.clear();

                // Remove dragging class
                this.selectedPersons.forEach(id => {
                    const n = document.querySelector(`[data-id="${id}"]`);
                    if (n) n.classList.remove('dragging');
                });
            }
        });
    }
}
// ============================================================================
// LEGEND PANEL - Displays legend for relationships and emotional connections
// ============================================================================

class Legend {
    constructor(app) {
        this.app = app;
        this.legendElement = null;
        this.isCollapsed = false;

        // Position state (default position)
        this.x = 40;
        this.y = 40;

        // Scale state (default 2x)
        this.scale = 2;
        this.minScale = 1;
        this.maxScale = 4;

        // Drag state
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;

        // Resize state
        this.isResizing = false;
        this.resizeStartScale = 0;
        this.resizeStartY = 0;

        this.init();
    }

    init() {
        // Delay creation until layers are ready
        const checkLayers = () => {
            const legendLayer = document.getElementById('layer-legend');
            if (legendLayer) {
                this.createLegendPanel();
                this.render();
            } else {
                // Retry after a short delay
                setTimeout(checkLayers, 50);
            }
        };
        checkLayers();
    }

    createLegendPanel() {
        // Get the legend layer from the canvas
        const legendLayer = document.getElementById('layer-legend');
        if (!legendLayer) {
            console.warn('Legend layer not found');
            return;
        }

        // Create legend group
        const legendGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        legendGroup.setAttribute('id', 'legend-group');
        legendGroup.setAttribute('class', 'legend-overlay draggable-legend');
        legendGroup.style.cursor = 'move';

        // Position and scale will be updated dynamically
        this.updateLegendTransform();

        // Add to legend layer (so it persists during renders)
        legendLayer.appendChild(legendGroup);
        this.legendElement = legendGroup;

        // Setup drag and resize handlers
        this.setupDragHandlers();
        this.setupResizeHandlers();

        console.log('✓ Legend panel created (draggable, resizable, in legend layer)');
    }

    setupDragHandlers() {
        if (!this.legendElement) return;

        const canvas = document.getElementById('canvas');
        if (!canvas) return;

        // Mouse down - start drag or resize
        this.legendElement.addEventListener('mousedown', (e) => {
            // Ignore right click (for context menu)
            if (e.button === 2) return;

            // Only left click for drag/resize
            if (e.button !== 0) return;

            const bbox = this.legendElement.getBBox();
            const pt = this.getSVGPoint(e);

            // Convert point to local legend coordinates
            const localX = (pt.x - this.x) / this.scale;
            const localY = (pt.y - this.y) / this.scale;

            // Check if near bottom-right corner (within 15px threshold)
            const cornerThreshold = 15;
            const nearBottomRight =
                localX >= bbox.width - cornerThreshold &&
                localX <= bbox.width &&
                localY >= bbox.height - cornerThreshold &&
                localY <= bbox.height;

            if (nearBottomRight) {
                // Start resizing
                this.isResizing = true;
                this.resizeStartScale = this.scale;
                this.resizeStartX = pt.x;
                this.resizeStartY = pt.y;
                this.legendElement.style.cursor = 'nwse-resize';
            } else {
                // Start dragging
                this.isDragging = true;
                this.dragStartX = pt.x;
                this.dragStartY = pt.y;
                this.dragOffsetX = this.x;
                this.dragOffsetY = this.y;
            }

            e.preventDefault();
            e.stopPropagation();
        });

        // Mouse move - drag or resize
        const handleMouseMove = (e) => {
            if (this.isDragging) {
                // Dragging
                const pt = this.getSVGPoint(e);
                const dx = pt.x - this.dragStartX;
                const dy = pt.y - this.dragStartY;

                this.x = this.dragOffsetX + dx;
                this.y = this.dragOffsetY + dy;

                this.updateLegendTransform();
                e.preventDefault();
            } else if (this.isResizing) {
                // Resizing
                const pt = this.getSVGPoint(e);
                const dx = pt.x - this.resizeStartX;
                const dy = pt.y - this.resizeStartY;

                const delta = Math.max(dx, dy);
                const scaleFactor = delta / 100;

                this.scale = Math.max(this.minScale, Math.min(this.maxScale, this.resizeStartScale + scaleFactor));

                this.updateLegendTransform();
                this.updateLegendContent();
                e.preventDefault();
            } else {
                // Update cursor when hovering (not dragging or resizing)
                const bbox = this.legendElement.getBBox();
                const pt = this.getSVGPoint(e);
                const localX = (pt.x - this.x) / this.scale;
                const localY = (pt.y - this.y) / this.scale;

                const cornerThreshold = 15;
                const nearBottomRight =
                    localX >= bbox.width - cornerThreshold &&
                    localX <= bbox.width &&
                    localY >= bbox.height - cornerThreshold &&
                    localY <= bbox.height;

                this.legendElement.style.cursor = nearBottomRight ? 'nwse-resize' : 'move';
            }
        };

        // Mouse up - end drag or resize
        const handleMouseUp = (e) => {
            if (this.isDragging) {
                this.isDragging = false;
                this.legendElement.style.cursor = 'move';
                e.preventDefault();
            } else if (this.isResizing) {
                this.isResizing = false;
                this.legendElement.style.cursor = 'move';
                e.preventDefault();
            }
        };

        // Add listeners to document so drag works even when mouse leaves element
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        // Add hover listener to legend for cursor updates
        this.legendElement.addEventListener('mousemove', handleMouseMove);

        // Store references for cleanup
        this._handleMouseMove = handleMouseMove;
        this._handleMouseUp = handleMouseUp;
    }

    setupResizeHandlers() {
        if (!this.legendElement) return;

        // Setup context menu for export
        this.setupContextMenu();
    }

    setupContextMenu() {
        if (!this.legendElement) return;

        console.log('[LEGEND] Setting up context menu...');

        // Prevent default context menu and show custom menu
        this.legendElement.addEventListener('contextmenu', (e) => {
            console.log('[LEGEND] Context menu triggered');
            e.preventDefault();
            e.stopPropagation();

            this.showContextMenu(e.clientX, e.clientY);
        });
    }

    showContextMenu(x, y) {
        // Remove existing context menu if any
        const existing = document.getElementById('legend-context-menu');
        if (existing) {
            existing.remove();
        }

        // Create context menu
        const menu = document.createElement('div');
        menu.id = 'legend-context-menu';
        menu.className = 'context-menu';
        menu.style.position = 'fixed';
        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;
        menu.style.zIndex = '10000';
        menu.style.background = 'var(--surface-1)';
        menu.style.border = '1px solid var(--surface-border)';
        menu.style.borderRadius = 'var(--radius-md)';
        menu.style.boxShadow = 'var(--shadow-lg)';
        menu.style.padding = '4px';
        menu.style.minWidth = '160px';

        // Menu items
        const menuItems = [
            { label: 'PNG로 내보내기', icon: '🖼️', action: () => this.exportLegendAsPNG() },
            { label: 'SVG로 내보내기', icon: '📐', action: () => this.exportLegendAsSVG() }
        ];

        menuItems.forEach(item => {
            const menuItem = document.createElement('button');
            menuItem.className = 'context-menu-item';
            menuItem.style.display = 'flex';
            menuItem.style.alignItems = 'center';
            menuItem.style.gap = '8px';
            menuItem.style.width = '100%';
            menuItem.style.padding = '8px 12px';
            menuItem.style.border = 'none';
            menuItem.style.background = 'transparent';
            menuItem.style.color = 'var(--text-primary)';
            menuItem.style.cursor = 'pointer';
            menuItem.style.fontSize = '0.875rem';
            menuItem.style.borderRadius = 'var(--radius-sm)';
            menuItem.style.transition = 'all var(--transition-fast)';
            menuItem.textContent = `${item.icon} ${item.label}`;

            menuItem.addEventListener('mouseenter', () => {
                menuItem.style.background = 'var(--accent-primary)';
                menuItem.style.color = 'white';
            });

            menuItem.addEventListener('mouseleave', () => {
                menuItem.style.background = 'transparent';
                menuItem.style.color = 'var(--text-primary)';
            });

            menuItem.addEventListener('click', () => {
                item.action();
                menu.remove();
            });

            menu.appendChild(menuItem);
        });

        document.body.appendChild(menu);

        // Close menu when clicking outside
        const closeMenu = (e) => {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        };

        setTimeout(() => {
            document.addEventListener('click', closeMenu);
        }, 0);
    }

    exportLegendAsPNG() {
        if (!this.legendElement) return;

        // Clone the legend element
        const clone = this.legendElement.cloneNode(true);

        // Get bounding box
        const bbox = this.legendElement.getBBox();

        // Create temporary SVG
        const tempSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        tempSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        tempSvg.setAttribute('width', bbox.width * this.scale);
        tempSvg.setAttribute('height', bbox.height * this.scale);
        tempSvg.setAttribute('viewBox', `0 0 ${bbox.width} ${bbox.height}`);

        // Remove transform from clone and adjust position
        clone.removeAttribute('transform');
        clone.setAttribute('transform', `translate(${-bbox.x}, ${-bbox.y})`);

        tempSvg.appendChild(clone);

        // Convert to PNG
        const svgData = new XMLSerializer().serializeToString(tempSvg);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        canvas.width = bbox.width * this.scale * 2; // 2x for better quality
        canvas.height = bbox.height * this.scale * 2;

        img.onload = () => {
            ctx.scale(2, 2);
            ctx.drawImage(img, 0, 0);

            canvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = '감정선_범례.png';
                a.click();
                URL.revokeObjectURL(url);
            });
        };

        img.src = 'data:image/svg+xml;base64,' + btoa(encodeURIComponent(svgData).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16))));
    }

    exportLegendAsSVG() {
        if (!this.legendElement) return;

        // Clone the legend element
        const clone = this.legendElement.cloneNode(true);

        // Get bounding box
        const bbox = this.legendElement.getBBox();

        // Create SVG document
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        svg.setAttribute('width', bbox.width * this.scale);
        svg.setAttribute('height', bbox.height * this.scale);
        svg.setAttribute('viewBox', `0 0 ${bbox.width} ${bbox.height}`);

        // Remove transform from clone and adjust position
        clone.removeAttribute('transform');
        clone.setAttribute('transform', `translate(${-bbox.x}, ${-bbox.y})`);

        svg.appendChild(clone);

        // Serialize and download
        const svgData = new XMLSerializer().serializeToString(svg);
        const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = '감정선_범례.svg';
        a.click();
        URL.revokeObjectURL(url);
    }

    getSVGPoint(e) {
        const canvas = document.getElementById('canvas');
        if (!canvas) return { x: 0, y: 0 };

        const svg = canvas;
        const pt = svg.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;

        // Transform screen coordinates to SVG coordinates
        const mainGroup = document.getElementById('main-group');
        if (mainGroup) {
            const ctm = mainGroup.getScreenCTM();
            if (ctm) {
                const transformedPt = pt.matrixTransform(ctm.inverse());
                return { x: transformedPt.x, y: transformedPt.y };
            }
        }

        return { x: pt.x, y: pt.y };
    }

    updateLegendTransform() {
        if (!this.legendElement) return;

        // Update transform to current position and scale
        this.legendElement.setAttribute('transform', `translate(${this.x}, ${this.y}) scale(${this.scale})`);
    }

    updateLegendContent() {
        if (!this.legendElement) {
            console.warn('Legend element not found');
            return;
        }

        // Clear existing content
        while (this.legendElement.firstChild) {
            this.legendElement.removeChild(this.legendElement.firstChild);
        }

        // Get all emotional connections currently in use
        const usedEmotionalTypes = this.getUsedEmotionalTypes();

        console.log('[LEGEND] Used emotional types:', Array.from(usedEmotionalTypes));

        // If no emotional connections, show empty state
        if (usedEmotionalTypes.size === 0) {
            console.log('[LEGEND] No emotional connections found');
            return; // Don't show legend if no emotional lines
        }

        // Base dimensions (will be scaled by this.scale)
        const baseScale = 1;

        // Build legend content
        let yOffset = 0;

        // Background rect - adjusted for centered layout
        const bgHeight = (28 + (usedEmotionalTypes.size * 22) + 8) * baseScale;
        const bgWidth = 100 * baseScale;  // Narrow width for centered layout
        const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        bg.setAttribute('x', '0');
        bg.setAttribute('y', '0');
        bg.setAttribute('width', bgWidth);
        bg.setAttribute('height', bgHeight);
        bg.setAttribute('fill', '#ffffff');
        bg.setAttribute('stroke', '#e5e7eb');
        bg.setAttribute('stroke-width', 1.5 * baseScale);
        bg.setAttribute('rx', 4 * baseScale);
        bg.setAttribute('opacity', '0.95');
        bg.setAttribute('filter', `drop-shadow(0 2px 8px rgba(0,0,0,0.1))`);
        this.legendElement.appendChild(bg);

        // Title - centered
        const title = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        title.setAttribute('x', (bgWidth / 2));
        title.setAttribute('y', (yOffset + 18) * baseScale);
        title.setAttribute('fill', '#1f2937');
        title.setAttribute('font-size', 10 * baseScale);  // Smaller font
        title.setAttribute('font-weight', '600');
        title.setAttribute('text-anchor', 'middle');  // Center alignment
        title.textContent = '감정선 범례';
        this.legendElement.appendChild(title);
        yOffset += 28;

        // Get emotional styles from EMOTIONAL_STYLES if available
        const styles = window.EMOTIONAL_STYLES || {};

        // Render only used types
        usedEmotionalTypes.forEach(typeKey => {
            const style = styles[typeKey];
            if (!style) {
                console.warn('[LEGEND] No style found for type:', typeKey);
                return;
            }

            // Line and label layout (centered, line above label)
            const lineLength = 30 * baseScale;  // Line length
            const centerX = bgWidth / 2;
            const x1 = centerX - lineLength / 2;
            const x2 = centerX + lineLength / 2;
            const lineY = (yOffset + 6) * baseScale;  // Line position

            // Create line/path based on builder type with scaled-down parameters
            if (style.builder === 'zigzag') {
                // Zigzag line (discord, hostile, abuse) - ultra compressed for legend
                const amplitude = 1 * baseScale;  // Further reduced from 1.5 to 1
                const step = 3 * baseScale;  // Reduced from 5 to 3 for tighter spacing
                const pathData = this.createZigzagPath(x1, lineY, x2, lineY, amplitude, step);
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.setAttribute('d', pathData);
                path.setAttribute('stroke', style.color);
                path.setAttribute('stroke-width', 1.5 * baseScale);
                path.setAttribute('fill', 'none');
                path.setAttribute('stroke-linecap', 'round');
                path.setAttribute('stroke-linejoin', 'round');
                this.legendElement.appendChild(path);
            } else if (style.builder === 'wavy') {
                // Wavy line (manipulative) - ultra compressed for legend
                const amplitude = 1.5 * baseScale;  // Reduced from 2 to 1.5
                const step = 4 * baseScale;  // Reduced from 6 to 4
                const pathData = this.createWavyPath(x1, lineY, x2, lineY, amplitude, step);
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.setAttribute('d', pathData);
                path.setAttribute('stroke', style.color);
                path.setAttribute('stroke-width', 1.5 * baseScale);
                path.setAttribute('fill', 'none');
                path.setAttribute('stroke-linecap', 'round');
                path.setAttribute('stroke-linejoin', 'round');
                this.legendElement.appendChild(path);
            } else if (style.builder === 'broken') {
                // Broken line (cutoff) - tighter gaps
                const gap = 5 * baseScale;  // Reduced from 8 to 5
                const segmentLength = gap * 0.7;
                const gapLength = gap * 0.3;
                let currentX = x1;

                while (currentX < x2) {
                    const segX2 = Math.min(currentX + segmentLength, x2);
                    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                    line.setAttribute('x1', currentX);
                    line.setAttribute('y1', lineY);
                    line.setAttribute('x2', segX2);
                    line.setAttribute('y2', lineY);
                    line.setAttribute('stroke', style.color);
                    line.setAttribute('stroke-width', 1.5 * baseScale);
                    line.setAttribute('stroke-linecap', 'round');
                    this.legendElement.appendChild(line);
                    currentX += segmentLength + gapLength;
                }
            } else if (style.builder === 'double') {
                // Double line (close-friendship) - tighter spacing
                const offset = 2 * baseScale;  // Reduced from 2.5 to 2
                const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line1.setAttribute('x1', x1);
                line1.setAttribute('y1', lineY - offset / 2);
                line1.setAttribute('x2', x2);
                line1.setAttribute('y2', lineY - offset / 2);
                line1.setAttribute('stroke', style.color);
                line1.setAttribute('stroke-width', 1.2 * baseScale);
                line1.setAttribute('stroke-linecap', 'round');
                this.legendElement.appendChild(line1);

                const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line2.setAttribute('x1', x1);
                line2.setAttribute('y1', lineY + offset / 2);
                line2.setAttribute('x2', x2);
                line2.setAttribute('y2', lineY + offset / 2);
                line2.setAttribute('stroke', style.color);
                line2.setAttribute('stroke-width', 1.2 * baseScale);
                line2.setAttribute('stroke-linecap', 'round');
                this.legendElement.appendChild(line2);
            } else if (style.builder === 'triple') {
                // Triple line (fused) - tighter spacing
                const offset = 1.5 * baseScale;  // Reduced from 2 to 1.5
                for (let i = -1; i <= 1; i++) {
                    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                    line.setAttribute('x1', x1);
                    line.setAttribute('y1', lineY + i * offset);
                    line.setAttribute('x2', x2);
                    line.setAttribute('y2', lineY + i * offset);
                    line.setAttribute('stroke', style.color);
                    line.setAttribute('stroke-width', 1.2 * baseScale);
                    line.setAttribute('stroke-linecap', 'round');
                    this.legendElement.appendChild(line);
                }
            } else {
                // Straight line (harmony, love, distant)
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', x1);
                line.setAttribute('y1', lineY);
                line.setAttribute('x2', x2);
                line.setAttribute('y2', lineY);
                line.setAttribute('stroke', style.color);
                line.setAttribute('stroke-width', 1.5 * baseScale);
                line.setAttribute('stroke-linecap', 'round');
                if (style.dash) {
                    // Scale down dash array for legend
                    const dashArray = style.dash.split(' ').map(v => parseFloat(v) * 0.5).join(' ');
                    line.setAttribute('stroke-dasharray', dashArray);
                }
                this.legendElement.appendChild(line);
            }

            // Get label name from style description or typeKey
            const labelNames = {
                'harmony': '조화',
                'close-friendship': '친밀',
                'love': '사랑',
                'distant': '거리감',
                'cutoff': '단절',
                'discord': '불화',
                'hostile': '적대',
                'fused': '융합',
                'abuse': '학대',
                'manipulative': '조종'
            };

            // Label (centered below the line)
            const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            label.setAttribute('x', centerX);  // Center horizontally
            label.setAttribute('y', (yOffset + 16) * baseScale);  // Below the line
            label.setAttribute('fill', '#6b7280');
            label.setAttribute('font-size', 8 * baseScale);  // Smaller font
            label.setAttribute('text-anchor', 'middle');  // Center alignment
            label.textContent = labelNames[typeKey] || typeKey;
            this.legendElement.appendChild(label);

            yOffset += 22;  // Spacing between entries
        });

        console.log('[LEGEND] Legend rendered with', usedEmotionalTypes.size, 'items (scale:', this.scale + ', draggable, resizable by dragging corner)');
    }

    getUsedEmotionalTypes() {
        const usedTypes = new Set();

        // Get all emotional connections from the app state relationships
        if (this.app && this.app.state && this.app.state.relationships) {
            this.app.state.relationships.forEach(relationship => {
                // Check if it's an emotional relationship
                if (relationship.type === 'emotional' && relationship.subtype && relationship.subtype !== 'none') {
                    usedTypes.add(relationship.subtype);
                }
            });
        }

        return usedTypes;
    }

    show() {
        if (this.legendElement) {
            this.legendElement.style.display = 'block';
        }
    }

    hide() {
        if (this.legendElement) {
            this.legendElement.style.display = 'none';
        }
    }

    render() {
        // Update legend items based on current state
        this.updateLegendContent();
    }

    // Public method to update legend when diagram changes
    update() {
        console.log('[LEGEND] update() called');
        this.updateLegendContent();
    }

    // Cleanup
    destroy() {
        if (this._handleMouseMove) {
            document.removeEventListener('mousemove', this._handleMouseMove);
        }
        if (this._handleMouseUp) {
            document.removeEventListener('mouseup', this._handleMouseUp);
        }
        if (this.legendElement && this._handleWheel) {
            this.legendElement.removeEventListener('wheel', this._handleWheel);
        }
    }

    // Helper methods to create path data for different line styles
    createZigzagPath(x1, y1, x2, y2, amplitude, step) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);

        let path = `M ${x1} ${y1}`;
        let currentDist = 0;
        let direction = 1;

        while (currentDist < length) {
            currentDist += step;
            if (currentDist > length) currentDist = length;

            const x = x1 + Math.cos(angle) * currentDist + Math.sin(angle) * amplitude * direction;
            const y = y1 + Math.sin(angle) * currentDist - Math.cos(angle) * amplitude * direction;

            path += ` L ${x} ${y}`;
            direction *= -1;
        }

        return path;
    }

    createWavyPath(x1, y1, x2, y2, amplitude, step) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);

        let path = `M ${x1} ${y1}`;

        for (let dist = 0; dist <= length; dist += step / 2) {
            const t = dist / length;
            const wave = Math.sin(t * Math.PI * 2 * (length / step)) * amplitude;

            const x = x1 + Math.cos(angle) * dist + Math.sin(angle) * wave;
            const y = y1 + Math.sin(angle) * dist - Math.cos(angle) * wave;

            if (dist === 0) {
                path = `M ${x} ${y}`;
            } else {
                path += ` L ${x} ${y}`;
            }
        }

        // Ensure we end at the target point
        path += ` L ${x2} ${y2}`;

        return path;
    }
}
/**
 * Tutorial System - Comprehensive Guide
 * 체계적이고 실용적인 튜토리얼
 */

class TutorialSystem {
    constructor(app) {
        this.app = app;
        this.isActive = false;
        this.currentStep = 0;
        this.steps = [];

        // 로컬스토리지에서 완료 여부 확인
        const completed = localStorage.getItem('tutorialCompleted');
        this.hasCompleted = completed === 'true';
    }

    /**
     * 튜토리얼 활성화 (blank_canvas 템플릿일 때만)
     */
    activate(templateId) {
        // blank_canvas가 아니거나 이미 완료했으면 비활성화
        if (templateId !== 'blank_canvas' || this.hasCompleted) {
            this.deactivate();
            return;
        }

        this.isActive = true;
        this.currentStep = 0;

        // 튜토리얼 단계 정의 - 체계적으로 확장
        this.steps = [
            // === 시작하기 ===
            {
                target: 'canvas',
                title: '👋 결속에 오신 것을 환영합니다',
                message: '전문적인 가계도(Genogram)를 쉽게 만들 수 있습니다<br>지금부터 주요 기능을 안내해드리겠습니다',
                position: 'center',
                category: '시작'
            },

            // === 템플릿 & 인물 추가 ===
            {
                target: '#sidebar',
                title: '📋 템플릿으로 빠르게 시작하기',
                message: '왼쪽 사이드바에서 미리 만들어진 템플릿을 선택하면<br>2세대, 3세대 가족 구조를 바로 불러올 수 있습니다',
                position: 'right',
                category: '템플릿'
            },
            {
                target: 'canvas',
                title: '➕ 새 인물 추가하기',
                message: '빈 공간을 <strong>우클릭</strong>하면 새로운 인물을 추가할 수 있습니다<br>또는 기존 인물을 우클릭하여 가족 관계를 빠르게 추가하세요',
                position: 'center',
                category: '인물 추가'
            },

            // === 인물 편집 ===
            {
                target: 'canvas',
                title: '✏️ 인물 정보 편집하기',
                message: '인물의 <strong>이름을 더블클릭</strong>하면 바로 수정할 수 있습니다<br>또는 인물을 클릭하여 오른쪽 패널에서 상세 정보를 편집하세요',
                position: 'center',
                category: '편집'
            },
            {
                target: '#rightPanel',
                title: '📝 속성 패널',
                message: '인물을 선택하면 이름, 성별, 나이, 출생순서, 메모 등<br>모든 정보를 여기서 편집할 수 있습니다',
                position: 'left',
                category: '편집'
            },

            // === 관계 추가 ===
            {
                target: 'canvas',
                title: '👨‍👩‍👧 가족 관계 추가하기',
                message: '인물을 <strong>우클릭</strong>하면 컨텍스트 메뉴가 나타납니다<br>여기서 배우자, 자녀, 부모, 형제자매를 빠르게 추가할 수 있습니다',
                position: 'center',
                category: '관계'
            },
            {
                target: '#rightPanel',
                title: '💞 감정선 추가하기',
                message: '오른쪽 패널 하단의 <strong>"감정선" 섹션</strong>에서 유형을 선택한 후<br>두 인물을 차례로 클릭하면 감정선이 연결됩니다<br>(친밀, 갈등, 단절, 학대 등 30가지 유형 지원)',
                position: 'left',
                category: '관계'
            },

            // === 레이아웃 & 이동 ===
            {
                target: 'canvas',
                title: '🖱️ 인물 이동하기',
                message: '인물을 <strong>드래그</strong>하여 원하는 위치로 이동할 수 있습니다<br>여러 인물을 선택하려면 <strong>Ctrl+클릭</strong> 또는 <strong>Shift+드래그</strong>로 영역 선택하세요',
                position: 'center',
                category: '레이아웃'
            },
            {
                target: '#btnAutoLayout',
                title: '📐 자동 정렬',
                message: '인물이 많아지면 <strong>"자동 정렬"</strong> 버튼을 클릭하세요<br>표준 Genogram 형식에 맞춰 깔끔하게 배치됩니다',
                position: 'bottom',
                category: '레이아웃'
            },

            // === 레이어 & 표시 ===
            {
                target: '#sidebar',
                title: '👁️ 레이어 관리',
                message: '왼쪽 하단의 <strong>"레이어"</strong> 섹션에서<br>인물, 관계선, 감정선, 이름, 나이를 개별적으로 표시/숨김 처리할 수 있습니다',
                position: 'right',
                category: '표시'
            },
            {
                target: '#rightPanel',
                title: '🎨 스타일 조정',
                message: '오른쪽 패널 하단의 <strong>"스타일"</strong> 섹션에서<br>도형 두께, 관계선 두께, 감정선 두께를 조정할 수 있습니다',
                position: 'left',
                category: '표시'
            },

            // === 줌 & 뷰 ===
            {
                target: '.zoom-controls',
                title: '🔍 줌 & 네비게이션',
                message: '줌 버튼으로 확대/축소하거나<br><strong>마우스 휠</strong>로 줌을 조절할 수 있습니다<br><strong>스페이스바 + 드래그</strong>로 캔버스를 이동하세요',
                position: 'bottom',
                category: '뷰'
            },

            // === 실행취소 & 히스토리 ===
            {
                target: '#btnUndo',
                title: '↩️ 실행취소 & 다시실행',
                message: '실수했다면 <strong>Ctrl+Z</strong>로 실행취소하세요<br><strong>Ctrl+Y</strong>로 다시 실행할 수 있습니다<br>최대 50단계까지 되돌릴 수 있습니다',
                position: 'bottom',
                category: '편집'
            },

            // === 저장 & 내보내기 ===
            {
                target: '#btnSave',
                title: '💾 저장하기',
                message: '작업 내용을 <strong>"저장"</strong> 버튼으로 최근 작업에 저장하세요<br><strong>Ctrl+S</strong> 단축키도 사용할 수 있습니다',
                position: 'bottom',
                category: '저장'
            },
            {
                target: '#exportDropdown',
                title: '📤 내보내기',
                message: '<strong>"내보내기"</strong>를 클릭하여 PNG, SVG, JSON으로 저장할 수 있습니다<br>PNG와 SVG는 투명 배경으로 내보내집니다',
                position: 'bottom',
                category: '저장'
            },

            // === 마무리 ===
            {
                target: 'canvas',
                title: '🎉 튜토리얼 완료!',
                message: '이제 결속의 모든 기능을 사용할 수 있습니다<br><br><strong>팁:</strong> 언제든 우클릭 메뉴를 활용하면 빠르게 작업할 수 있습니다<br>설정에서 다시 튜토리얼을 볼 수 있습니다',
                position: 'center',
                category: '완료'
            }
        ];

        // 첫 단계 표시
        setTimeout(() => {
            if (this.isActive) {
                this.showStep(0);
            }
        }, 1000);
    }

    /**
     * 튜토리얼 비활성화
     */
    deactivate() {
        this.isActive = false;
        this.hideTooltip();
    }

    /**
     * 특정 단계 표시
     */
    showStep(stepIndex) {
        if (!this.isActive || stepIndex >= this.steps.length) {
            this.complete();
            return;
        }

        this.currentStep = stepIndex;
        const step = this.steps[stepIndex];

        // 기존 툴팁 제거
        this.hideTooltip();

        // 툴팁 생성
        const tooltip = document.createElement('div');
        tooltip.className = 'tutorial-simple';
        tooltip.id = 'tutorialTooltip';

        const isLastStep = stepIndex === this.steps.length - 1;
        const isFirstStep = stepIndex === 0;
        const progress = `${stepIndex + 1}/${this.steps.length}`;

        tooltip.innerHTML = `
            <div class="tutorial-simple-content">
                <div class="tutorial-simple-header">
                    <div class="tutorial-simple-meta">
                        <span class="tutorial-simple-badge">${progress}</span>
                        <span class="tutorial-simple-category">${step.category}</span>
                    </div>
                    <button class="tutorial-simple-close" onclick="window.genogramApp.tutorial.skip()" title="튜토리얼 건너뛰기">
                        ✕
                    </button>
                </div>
                <h3 class="tutorial-simple-title">${step.title}</h3>
                <p class="tutorial-simple-message">${step.message}</p>
                <div class="tutorial-simple-actions">
                    ${!isFirstStep ? '<button class="btn btn-ghost btn-sm" onclick="window.genogramApp.tutorial.prev()">← 이전</button>' : '<div></div>'}
                    <button class="btn btn-primary btn-sm" onclick="window.genogramApp.tutorial.next()">
                        ${isLastStep ? '완료 →' : '다음 →'}
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(tooltip);

        // 위치 설정
        this.positionTooltip(tooltip, step);

        // 표시
        setTimeout(() => {
            tooltip.classList.add('show');
        }, 50);
    }

    /**
     * 툴팁 위치 설정
     */
    positionTooltip(tooltip, step) {
        const target = step.target === 'canvas' 
            ? document.getElementById('canvas')
            : document.querySelector(step.target);

        if (!target) {
            // 타겟이 없으면 중앙에 표시
            tooltip.style.left = '50%';
            tooltip.style.top = '50%';
            tooltip.style.transform = 'translate(-50%, -50%)';
            return;
        }

        const targetRect = target.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();

        let left, top;

        switch (step.position) {
            case 'center':
                left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
                top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2;
                break;
            case 'right':
                left = targetRect.right + 20;
                top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2;
                break;
            case 'left':
                left = targetRect.left - tooltipRect.width - 20;
                top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2;
                break;
            case 'bottom':
                left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
                top = targetRect.bottom + 20;
                break;
            case 'top':
                left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
                top = targetRect.top - tooltipRect.height - 20;
                break;
            default:
                left = targetRect.left;
                top = targetRect.top;
        }

        // 화면 밖으로 나가지 않도록 조정
        left = Math.max(20, Math.min(left, window.innerWidth - tooltipRect.width - 20));
        top = Math.max(80, Math.min(top, window.innerHeight - tooltipRect.height - 20));

        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
    }

    /**
     * 툴팁 숨기기
     */
    hideTooltip() {
        const tooltip = document.getElementById('tutorialTooltip');
        if (tooltip) {
            tooltip.classList.remove('show');
            setTimeout(() => {
                if (tooltip.parentNode) {
                    tooltip.parentNode.removeChild(tooltip);
                }
            }, 200);
        }
    }

    /**
     * 다음 단계
     */
    next() {
        this.showStep(this.currentStep + 1);
    }

    /**
     * 이전 단계
     */
    prev() {
        if (this.currentStep > 0) {
            this.showStep(this.currentStep - 1);
        }
    }

    /**
     * 튜토리얼 건너뛰기
     */
    skip() {
        if (confirm('튜토리얼을 건너뛰시겠습니까?\n언제든 설정에서 "튜토리얼 다시보기"를 선택하여 다시 볼 수 있습니다.')) {
            this.complete();
        }
    }

    /**
     * 튜토리얼 완료
     */
    complete() {
        this.isActive = false;
        this.hasCompleted = true;
        localStorage.setItem('tutorialCompleted', 'true');
        this.hideTooltip();

        if (this.app.toolbar && typeof this.app.toolbar.showToast === 'function') {
            this.app.toolbar.showToast('튜토리얼을 완료했습니다! 이제 자유롭게 가계도를 만들어보세요 🎉', 'success');
        }
    }

    /**
     * 튜토리얼 재설정
     */
    reset() {
        this.hasCompleted = false;
        this.currentStep = 0;
        localStorage.removeItem('tutorialCompleted');
        this.hideTooltip();

        if (this.app.toolbar && typeof this.app.toolbar.showToast === 'function') {
            this.app.toolbar.showToast('튜토리얼이 초기화되었습니다', 'info');
        }

        // blank_canvas 템플릿이면 다시 시작
        const template = this.app.state.persons.length === 1 && 
                        this.app.state.persons[0].isCT &&
                        this.app.state.relationships.length === 0;
        
        if (template) {
            this.activate('blank_canvas');
        }
    }

    /**
     * 화면 크기 변경 시 툴팁 위치 업데이트
     */
    updateTooltipPositions() {
        if (!this.isActive) return;

        const tooltip = document.getElementById('tutorialTooltip');
        if (tooltip && this.steps[this.currentStep]) {
            this.positionTooltip(tooltip, this.steps[this.currentStep]);
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TutorialSystem;
}
// ============================================================================
// UI SETTINGS - Theme & scale persistence
// ============================================================================
(function () {
    const STORAGE_KEY = 'genogram_ui_preferences';
    const DEFAULTS = {
        theme: 'light',
        scale: 1
    };

    function loadSettings() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) {
                return { ...DEFAULTS };
            }
            const parsed = JSON.parse(raw);
            return {
                theme: parsed.theme || DEFAULTS.theme,
                scale: parsed.scale || DEFAULTS.scale
            };
        } catch (error) {
            console.warn('Failed to load UI settings:', error);
            return { ...DEFAULTS };
        }
    }

    function persistSettings(settings) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    }

    function applyTheme(theme) {
        const root = document.documentElement;
        root.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light');
    }

    function applyScale(scale) {
        document.documentElement.style.setProperty('--ui-scale', scale);
        const scaleLabel = document.getElementById('scaleValue');
        if (scaleLabel) {
            scaleLabel.textContent = `${Math.round(scale * 100)}%`;
        }
    }

    const settings = loadSettings();
    applyTheme(settings.theme);
    applyScale(settings.scale);

    document.addEventListener('DOMContentLoaded', () => {
        const themeToggle = document.getElementById('toggleThemeMode');
        if (themeToggle) {
            themeToggle.checked = settings.theme === 'dark';
            themeToggle.addEventListener('change', () => {
                settings.theme = themeToggle.checked ? 'dark' : 'light';
                applyTheme(settings.theme);
                persistSettings(settings);
            });
        }

        const slider = document.getElementById('sliderUiScale');
        if (slider) {
            slider.value = settings.scale;
            applyScale(settings.scale);
            slider.addEventListener('input', (event) => {
                const value = parseFloat(event.target.value);
                settings.scale = value;
                applyScale(value);
                persistSettings(settings);
            });
        }
    });

    window.GenogramUISettings = {
        load: () => ({ ...settings }),
        applyTheme,
        applyScale,
        persist: persistSettings
    };
}());
// ============================================================================
// Dashboard Help Modal
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('dashboardHelpModal');
    const openButton = document.getElementById('btnOpenHelpModal');
    const closeButton = document.getElementById('btnCloseHelpModal');

    if (!modal || !openButton) {
        return;
    }

    function showModal() {
        modal.style.display = 'flex';
    }

    function hideModal() {
        modal.style.display = 'none';
    }

    openButton.addEventListener('click', showModal);
    closeButton.addEventListener('click', hideModal);
    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            hideModal();
        }
    });
    document.addEventListener('keyup', (event) => {
        if (event.key === 'Escape') {
            hideModal();
        }
    });
});
