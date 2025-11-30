/**
 * ContextMenu - 우클릭 컨텍스트 메뉴 관리 (서브메뉴 지원)
 * FamilyTree 프로젝트에서 차용
 */

export class ContextMenu {
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
   * 메뉴 아이템 렌더링 (서브메뉴 지원)
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

    let submenuHtml = '';
    if (hasSubmenu) {
      // 감정선 전용 메뉴인 경우 특별한 레이아웃 사용
      if (item.emotionalMenu) {
        submenuHtml = this.renderEmotionalSubmenu(item.submenu);
      } else {
        submenuHtml = `
          <div class="context-submenu">
            ${item.submenu.map(subItem => this.renderMenuItem(subItem)).join('')}
          </div>
        `;
      }
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
   * 감정선 전용 서브메뉴 렌더링 (카테고리별 그리드)
   */
  renderEmotionalSubmenu(categories) {
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

    return `
      <div class="context-submenu context-submenu--emotional">
        ${categoriesHtml}
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

    // 서브메뉴 아이템에도 이벤트 리스너 추가 (일반 서브메뉴 + 감정선 서브메뉴)
    this.menuElement.querySelectorAll('.context-submenu .context-menu-item:not(.disabled):not(.emotional-category-header)').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = e.currentTarget.dataset.action;
        if (action && this.onAction) {
          this.onAction(action, this.activeTarget, this.activeTargetType);
        }
        this.hide();
      });
    });

    // 감정선 카테고리 헤더는 클릭 불가 (이미 CSS에서 pointer-events: none 처리됨)
    this.menuElement.querySelectorAll('.emotional-category-header').forEach(header => {
      header.style.pointerEvents = 'none';
    });

    // 초기 위치 설정 - fixed 포지셔닝으로 화면 좌표 사용
    this.menuElement.style.position = 'fixed';
    this.menuElement.style.left = `${x}px`;
    this.menuElement.style.top = `${y}px`;
    this.menuElement.classList.add('active');

    // 메뉴가 화면 밖으로 나가는지 체크 및 조정
    requestAnimationFrame(() => {
      const rect = this.menuElement.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const margin = 10; // 화면 가장자리 여백

      let adjustedX = x;
      let adjustedY = y;

      // 오른쪽으로 넘치는 경우
      if (rect.right > viewportWidth - margin) {
        // 1순위: 클릭 위치 왼쪽에 배치
        adjustedX = x - rect.width;
        
        // 왼쪽으로도 넘치면 화면 내 최대한 오른쪽 정렬
        if (adjustedX < margin) {
          adjustedX = Math.min(x, viewportWidth - rect.width - margin);
          // 그래도 안되면 여백만큼 띄움
          if (adjustedX < margin) {
            adjustedX = margin;
          }
        }
      }

      // 왼쪽으로 넘치는 경우
      if (adjustedX < margin) {
        adjustedX = margin;
      }

      // 아래쪽으로 넘치는 경우
      if (rect.bottom > viewportHeight - margin) {
        // 1순위: 클릭 위치 위쪽에 배치
        adjustedY = y - rect.height;
        
        // 위쪽으로도 넘치면 화면 내 최대한 아래 정렬
        if (adjustedY < margin) {
          adjustedY = Math.min(y, viewportHeight - rect.height - margin);
          // 그래도 안되면 여백만큼 띄움
          if (adjustedY < margin) {
            adjustedY = margin;
          }
        }
      }

      // 위쪽으로 넘치는 경우
      if (adjustedY < margin) {
        adjustedY = margin;
      }

      // 위치 재조정이 필요하면 적용
      if (adjustedX !== x || adjustedY !== y) {
        this.menuElement.style.left = `${adjustedX}px`;
        this.menuElement.style.top = `${adjustedY}px`;
      }

      // 서브메뉴 위치도 조정
      this.adjustSubmenuPositions();
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
   * 서브메뉴 위치 자동 조정 (개선된 버전)
   */
  adjustSubmenuPositions() {
    const submenus = this.menuElement.querySelectorAll('.context-submenu');
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 10; // 화면 가장자리 여백

    submenus.forEach(submenu => {
      const parentItem = submenu.parentElement;
      if (!parentItem) return;

      // 감정선 전용 와이드 메뉴인 경우
      const isEmotionalMenu = submenu.classList.contains('context-submenu--emotional');
      
      // 기본적으로 오른쪽에 표시
      submenu.style.left = '100%';
      submenu.style.right = 'auto';
      submenu.style.top = '0';
      submenu.style.bottom = 'auto';
      
      // 렌더링 후 위치 확인
      requestAnimationFrame(() => {
        const submenuRect = submenu.getBoundingClientRect();
        const parentRect = parentItem.getBoundingClientRect();
        
        // 수평 위치 조정
        if (submenuRect.right > viewportWidth - margin) {
          // 오른쪽으로 넘치면 왼쪽에 표시
          submenu.style.left = 'auto';
          submenu.style.right = '100%';
          
          // 다시 확인해서 왼쪽으로도 넘치면 화면 내로 조정
          requestAnimationFrame(() => {
            const newRect = submenu.getBoundingClientRect();
            if (newRect.left < margin) {
              submenu.style.right = 'auto';
              submenu.style.left = `${margin - parentRect.left}px`;
            }
          });
        }
        
        // 수직 위치 조정
        if (submenuRect.bottom > viewportHeight - margin) {
          const overflow = submenuRect.bottom - viewportHeight + margin;
          
          if (isEmotionalMenu) {
            // 감정선 메뉴는 위로 올림
            submenu.style.top = `-${overflow}px`;
            
            // 위로 올렸는데도 화면을 벗어나면 하단 정렬
            requestAnimationFrame(() => {
              const adjustedRect = submenu.getBoundingClientRect();
              if (adjustedRect.top < margin) {
                submenu.style.top = 'auto';
                submenu.style.bottom = '0';
              }
            });
          } else {
            // 일반 서브메뉴
            const currentTop = parseInt(window.getComputedStyle(submenu).top) || 0;
            submenu.style.top = `${Math.max(margin - parentRect.top, currentTop - overflow)}px`;
          }
        }
        
        // 위쪽으로 넘치는 경우
        if (submenuRect.top < margin) {
          submenu.style.top = `${margin - parentRect.top}px`;
        }
      });
    });
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
        emotionalMenu: true // 감정선 전용 메뉴 표시
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
   * 호환성을 위한 open 메서드
   */
  open(x, y, items, target = null) {
    this.show(x, y, items, target);
  }

  /**
   * 호환성을 위한 close 메서드
   */
  close() {
    this.hide();
  }
}
