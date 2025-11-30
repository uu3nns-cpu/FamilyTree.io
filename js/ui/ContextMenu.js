/**
 * ContextMenu - 우클릭 컨텍스트 메뉴 관리 (서브메뉴 지원)
 * 완전히 재작성된 버전 - 서브메뉴를 body에 직접 마운트
 */

export class ContextMenu {
  constructor() {
    this.menuElement = null;
    this.activeTarget = null;
    this.activeTargetType = null;
    this.activeSubmenus = new Map(); // 활성 서브메뉴 추적
    this.submenuTimeout = null;
    this.init();
  }

  init() {
    // 메인 컨텍스트 메뉴 엘리먼트 생성
    this.menuElement = document.createElement('div');
    this.menuElement.className = 'context-menu';
    this.menuElement.id = 'context-menu';
    document.body.appendChild(this.menuElement);

    // 외부 클릭 시 메뉴 닫기
    document.addEventListener('click', (e) => {
      if (!this.isInsideMenu(e.target)) {
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
   * 요소가 메뉴 내부인지 확인 (메인 메뉴 + 모든 서브메뉴)
   */
  isInsideMenu(element) {
    if (this.menuElement.contains(element)) return true;
    
    for (const [, submenu] of this.activeSubmenus) {
      if (submenu.contains(element)) return true;
    }
    
    return false;
  }

  /**
   * 감정선 서브메뉴 생성 (카테고리별)
   */
  getEmotionalSubmenu() {
    return [
      {
        type: 'category',
        label: '긍정적 관계',
        icon: '💚',
        items: [
          { label: '친밀한 관계', icon: '💕', action: 'add-emotional-close' },
          { label: '사랑', icon: '❤️', action: 'add-emotional-love' }
        ]
      },
      {
        type: 'category',
        label: '거리감/단절',
        icon: '⚪',
        items: [
          { label: '거리감', icon: '🌫️', action: 'add-emotional-distant' },
          { label: '단절', icon: '✂️', action: 'add-emotional-cutoff' }
        ]
      },
      {
        type: 'category',
        label: '부정적 관계',
        icon: '💥',
        items: [
          { label: '갈등', icon: '⚡', action: 'add-emotional-conflict' },
          { label: '적대적', icon: '⚔️', action: 'add-emotional-hostile' },
          { label: '융합', icon: '🤝', action: 'add-emotional-fused' }
        ]
      },
      {
        type: 'category',
        label: '학대 (민감)',
        icon: '⚠️',
        items: [
          { label: '신체적 학대', icon: '🤜', action: 'add-emotional-abuse-physical' },
          { label: '정서적 학대', icon: '💭', action: 'add-emotional-abuse-emotional' },
          { label: '성적 학대', icon: '🚫', action: 'add-emotional-abuse-sexual' },
          { label: '방임', icon: '🌫️', action: 'add-emotional-neglect' }
        ]
      }
    ];
  }

  /**
   * 메뉴 아이템 렌더링 (서브메뉴는 별도 엘리먼트로 생성)
   */
  renderMenuItem(item) {
    if (item.type === 'divider' || item.divider) {
      return '<div class="context-menu-divider"></div>';
    }

    const disabledClass = item.disabled ? 'disabled' : '';
    const dangerClass = item.danger ? 'danger' : '';
    const hasSubmenu = item.submenu && item.submenu.length > 0;
    const submenuClass = hasSubmenu ? 'has-submenu' : '';
    const icon = item.icon || '';
    const shortcut = item.shortcut ? `<span class="context-menu-shortcut">${item.shortcut}</span>` : '';
    const arrow = hasSubmenu ? '<span class="context-menu-arrow">▶</span>' : '';

    return `
      <div class="context-menu-item ${disabledClass} ${dangerClass} ${submenuClass}" 
           data-action="${item.action || ''}"
           data-has-submenu="${hasSubmenu}"
           data-emotional-menu="${item.emotionalMenu || false}">
        ${icon ? `<span class="context-menu-icon">${icon}</span>` : ''}
        <span class="context-menu-label">${item.label}</span>
        ${shortcut}
        ${arrow}
      </div>
    `;
  }

  /**
   * 감정선 전용 서브메뉴 HTML 생성
   */
  renderEmotionalSubmenuHTML(categories) {
    const categoriesHtml = categories.map(category => {
      const itemsHtml = category.items.map(item => `
        <div class="context-menu-item" data-action="${item.action}">
          <span class="context-menu-icon">${item.icon}</span>
          <span class="context-menu-label">${item.label}</span>
        </div>
      `).join('');

      return `
        <div class="emotional-category">
          <div class="emotional-category-header">
            <span class="context-menu-icon">${category.icon}</span>
            <span>${category.label}</span>
          </div>
          ${itemsHtml}
        </div>
      `;
    }).join('');

    return categoriesHtml;
  }

  /**
   * 일반 서브메뉴 HTML 생성
   */
  renderSubmenuHTML(items) {
    return items.map(item => this.renderMenuItem(item)).join('');
  }

  /**
   * 메뉴 표시
   */
  show(x, y, items, target = null, targetType = null) {
    this.activeTarget = target;
    this.activeTargetType = targetType;

    // 메뉴 데이터 저장 (서브메뉴 생성용)
    this.menuItems = items;

    // 메뉴 아이템 렌더링 (서브메뉴는 렌더링하지 않음)
    this.menuElement.innerHTML = items.map(item => this.renderMenuItem(item)).join('');

    // 이벤트 리스너 추가
    this.attachEventListeners();

    // 초기 위치 설정
    this.menuElement.style.position = 'fixed';
    this.menuElement.style.left = `${x}px`;
    this.menuElement.style.top = `${y}px`;
    this.menuElement.classList.add('active');

    // 메뉴가 화면 밖으로 나가는지 체크 및 조정
    requestAnimationFrame(() => {
      this.adjustMenuPosition(this.menuElement, x, y);
    });
  }

  /**
   * 메뉴 위치 조정 (화면 내에 들어오도록)
   * viewport 기준 좌표를 사용하여 정확한 위치 계산
   */
  adjustMenuPosition(menuElement, x, y) {
    const rect = menuElement.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 10;

    let adjustedX = x;
    let adjustedY = y;

    // 오른쪽으로 넘치는 경우
    if (x + rect.width > viewportWidth - margin) {
      adjustedX = x - rect.width;
      // 왼쪽으로도 넘치면 viewport 오른쪽 끝에 맞춤
      if (adjustedX < margin) {
        adjustedX = Math.max(margin, viewportWidth - rect.width - margin);
      }
    }

    // 왼쪽으로 넘치는 경우
    if (adjustedX < margin) {
      adjustedX = margin;
    }

    // 아래쪽으로 넘치는 경우
    if (y + rect.height > viewportHeight - margin) {
      adjustedY = y - rect.height;
      // 위쪽으로도 넘치면 viewport 하단에 맞춤
      if (adjustedY < margin) {
        adjustedY = Math.max(margin, viewportHeight - rect.height - margin);
      }
    }

    // 위쪽으로 넘치는 경우
    if (adjustedY < margin) {
      adjustedY = margin;
    }

    // 위치 재조정이 필요하면 적용
    if (adjustedX !== x || adjustedY !== y) {
      menuElement.style.left = `${adjustedX}px`;
      menuElement.style.top = `${adjustedY}px`;
    }
  }

  /**
   * 이벤트 리스너 추가
   */
  attachEventListeners() {
    // 메인 메뉴 아이템 클릭
    this.menuElement.querySelectorAll('.context-menu-item:not(.has-submenu):not(.disabled)').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = item.dataset.action;
        if (action && this.onAction) {
          this.onAction(action, this.activeTarget, this.activeTargetType);
        }
        this.hide();
      });
    });

    // 서브메뉴가 있는 아이템
    this.menuElement.querySelectorAll('.context-menu-item.has-submenu').forEach(item => {
      const itemIndex = Array.from(this.menuElement.children).indexOf(item);
      const menuItem = this.menuItems[itemIndex];
      
      if (!menuItem || !menuItem.submenu) return;

      // 클릭으로 토글
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleSubmenu(item, menuItem);
      });

      // 마우스 오버 (데스크톱)
      item.addEventListener('mouseenter', () => {
        if (this.submenuTimeout) clearTimeout(this.submenuTimeout);
        
        this.submenuTimeout = setTimeout(() => {
          this.showSubmenu(item, menuItem);
        }, 200);
      });

      item.addEventListener('mouseleave', (e) => {
        if (this.submenuTimeout) {
          clearTimeout(this.submenuTimeout);
          this.submenuTimeout = null;
        }

        // 서브메뉴로 이동하는지 확인
        const submenuId = this.getSubmenuId(item);
        const submenu = this.activeSubmenus.get(submenuId);
        
        if (submenu && !submenu.contains(e.relatedTarget)) {
          setTimeout(() => {
            if (submenu && !submenu.matches(':hover')) {
              this.hideSubmenu(submenuId);
            }
          }, 100);
        }
      });
    });
  }

  /**
   * 서브메뉴 ID 생성
   */
  getSubmenuId(parentItem) {
    return `submenu-${Array.from(this.menuElement.children).indexOf(parentItem)}`;
  }

  /**
   * 서브메뉴 토글
   */
  toggleSubmenu(parentItem, menuItem) {
    const submenuId = this.getSubmenuId(parentItem);
    
    if (this.activeSubmenus.has(submenuId)) {
      this.hideSubmenu(submenuId);
    } else {
      this.showSubmenu(parentItem, menuItem);
    }
  }

  /**
   * 서브메뉴 표시
   */
  showSubmenu(parentItem, menuItem) {
    const submenuId = this.getSubmenuId(parentItem);
    
    // 다른 서브메뉴 닫기
    this.hideAllSubmenus();

    // 서브메뉴 엘리먼트 생성
    const submenuElement = document.createElement('div');
    submenuElement.className = 'context-submenu';
    submenuElement.id = submenuId;
    
    // 감정선 메뉴인 경우
    if (menuItem.emotionalMenu) {
      submenuElement.classList.add('context-submenu--emotional');
      submenuElement.innerHTML = this.renderEmotionalSubmenuHTML(menuItem.submenu);
    } else {
      submenuElement.innerHTML = this.renderSubmenuHTML(menuItem.submenu);
    }

    // body에 추가
    document.body.appendChild(submenuElement);
    this.activeSubmenus.set(submenuId, submenuElement);

    // 서브메뉴 아이템 클릭 이벤트
    submenuElement.querySelectorAll('.context-menu-item:not(.disabled):not(.emotional-category-header)').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = item.dataset.action;
        if (action && this.onAction) {
          this.onAction(action, this.activeTarget, this.activeTargetType);
        }
        this.hide();
      });
    });

    // 서브메뉴 마우스 이벤트
    submenuElement.addEventListener('mouseleave', (e) => {
      if (!parentItem.contains(e.relatedTarget)) {
        setTimeout(() => {
          if (!parentItem.matches(':hover')) {
            this.hideSubmenu(submenuId);
          }
        }, 100);
      }
    });

    // 위치 계산
    this.positionSubmenu(submenuElement, parentItem, menuItem.emotionalMenu);

    // 활성화
    requestAnimationFrame(() => {
      submenuElement.classList.add('active');
    });
  }

  /**
   * 서브메뉴 위치 계산 - 근본적으로 재작성
   * viewport 기준 좌표를 사용하여 정확한 위치 계산
   */
  positionSubmenu(submenuElement, parentItem, isEmotional = false) {
    const parentRect = parentItem.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 10;

    // 서브메뉴를 먼저 완전히 표시하여 실제 크기를 측정
    // position은 fixed, 하지만 화면 밖에 배치하여 보이지 않게
    submenuElement.style.position = 'fixed';
    submenuElement.style.left = '-9999px';
    submenuElement.style.top = '-9999px';
    submenuElement.style.visibility = 'visible';
    submenuElement.style.opacity = '1';
    
    // 감정선 메뉴는 grid, 일반 메뉴는 block
    if (isEmotional) {
      submenuElement.style.display = 'grid';
    } else {
      submenuElement.style.display = 'block';
    }
    
    // 강제 리플로우로 실제 렌더링 확보
    submenuElement.offsetHeight;
    
    // 실제 크기 측정
    const submenuRect = submenuElement.getBoundingClientRect();

    // 기본 위치: 부모 오른쪽, 상단 정렬
    let left = parentRect.right + 2; // 약간의 간격
    let top = parentRect.top;

    // 오른쪽 넘침 체크
    if (left + submenuRect.width > viewportWidth - margin) {
      // 왼쪽에 표시
      left = parentRect.left - submenuRect.width - 2;
      
      // 왼쪽도 넘치면 viewport 내에 최대한 맞춤
      if (left < margin) {
        // 화면 오른쪽 끝에 맞춤
        left = viewportWidth - submenuRect.width - margin;
        if (left < margin) left = margin;
      }
    }

    // 아래 넘침 체크
    if (top + submenuRect.height > viewportHeight - margin) {
      // 부모 하단에 서브메뉴 하단 정렬
      top = parentRect.bottom - submenuRect.height;
      
      // 위로도 넘치면 viewport 하단에 맞춤
      if (top < margin) {
        top = viewportHeight - submenuRect.height - margin;
        if (top < margin) top = margin;
      }
    }

    // 위쪽으로 넘치는 경우
    if (top < margin) {
      top = margin;
    }

    // 최종 위치 적용
    submenuElement.style.left = `${left}px`;
    submenuElement.style.top = `${top}px`;
  }

  /**
   * 특정 서브메뉴 숨기기
   */
  hideSubmenu(submenuId) {
    const submenu = this.activeSubmenus.get(submenuId);
    if (submenu) {
      submenu.classList.remove('active');
      setTimeout(() => {
        if (submenu.parentNode) {
          submenu.parentNode.removeChild(submenu);
        }
        this.activeSubmenus.delete(submenuId);
      }, 150); // 애니메이션 시간과 동일
    }
  }

  /**
   * 모든 서브메뉴 숨기기
   */
  hideAllSubmenus() {
    for (const [submenuId] of this.activeSubmenus) {
      this.hideSubmenu(submenuId);
    }
  }

  /**
   * 메뉴 숨기기
   */
  hide() {
    this.menuElement.classList.remove('active');
    this.hideAllSubmenus();
    
    if (this.submenuTimeout) {
      clearTimeout(this.submenuTimeout);
      this.submenuTimeout = null;
    }
    
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
        label: '편집',
        icon: '✏️',
        submenu: [
          { label: '이름', icon: '📝', action: 'edit-name' },
          { label: '나이', icon: '🎂', action: 'edit-age' }
        ]
      },
      {
        label: '상태',
        icon: '⭐',
        submenu: [
          { label: `${person.isCT ? '✓ ' : ''}CT (주요인물)`, icon: '🎯', action: 'toggle-ct' },
          { label: `${person.isDeceased ? '✓ ' : ''}사망`, icon: '✝️', action: 'toggle-deceased' }
        ]
      },
      { type: 'divider' },
      {
        label: '부모 추가',
        icon: '👨‍👩‍👧',
        submenu: [
          { label: '아버지+어머니', icon: '👨‍👩‍👧', action: 'add-both-parents' },
          { type: 'divider' },
          { label: '아버지', icon: '👨', action: 'add-father' },
          { label: '어머니', icon: '👩', action: 'add-mother' }
        ]
      },
      {
        label: '배우자 추가',
        icon: '💑',
        action: 'add-spouse'
      },
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
        submenu: this.getEmotionalSubmenu(),
        emotionalMenu: true
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
    return [
      {
        label: '삭제',
        icon: '🗑️',
        action: 'delete-relationship',
        danger: true,
        shortcut: 'Delete'
      }
    ];
  }

  /**
   * 호환성을 위한 메서드
   */
  open(x, y, items, target = null) {
    this.show(x, y, items, target);
  }

  close() {
    this.hide();
  }
}
