// ============================================================================
// UI CONTROLLERS - Toolbar & Properties Panel (Updated with Child Adding)
// ============================================================================

// Immediate loading check
console.log('📦 ui.js file started loading...');

class Toolbar {
    constructor(app) {
        this.app = app;
        this.setupEventListeners();
        // Grid and magnet controls moved to settings modal
        this.updateEmotionButtons(this.app.state.selectedEmotionalSubtype);
    }

    setupEventListeners() {
        // Guard: Only setup if we're on the canvas page with toolbar elements
        const btnSave = document.getElementById('btnSave');
        if (!btnSave) {
            console.warn('Toolbar elements not found. Skipping toolbar initialization.');
            return;
        }
        
        // Helper function to safely add event listener
        const safeAddListener = (id, handler) => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('click', handler);
            } else {
                console.warn(`Element not found: ${id}`);
            }
        };
        
        // 저장 버튼
        btnSave.addEventListener('click', () => this.app.saveProject());

        // Export is now handled by dropdown.js, so we don't need this anymore
        // document.getElementById('btnExport').addEventListener('click', () => this.showExportMenu());
        safeAddListener('btnUndo', () => this.app.undo());
        safeAddListener('btnRedo', () => this.app.redo());
        safeAddListener('btnZoomIn', () => this.app.zoomIn());
        safeAddListener('btnZoomOut', () => this.app.zoomOut());
        safeAddListener('btnResetZoom', () => this.app.resetZoom());
        // Grid and magnet controls moved to settings modal
        
        // Shape thickness slider
        const selectShapeThickness = document.getElementById('selectShapeThickness');
        const shapeThicknessValue = document.getElementById('shapeThicknessValue');
        if (selectShapeThickness && shapeThicknessValue) {
            selectShapeThickness.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                shapeThicknessValue.textContent = value;
                this.app.setStrokeWidths({ shape: value });
            });
            const resetShapeThickness = document.getElementById('resetShapeThickness');
            if (resetShapeThickness) {
                resetShapeThickness.addEventListener('click', () => {
                    selectShapeThickness.value = '2';
                    selectShapeThickness.dispatchEvent(new Event('input'));
                });
            }
        }

        // Relationship thickness slider
        const selectRelationshipThickness = document.getElementById('selectRelationshipThickness');
        const relationshipThicknessValue = document.getElementById('relationshipThicknessValue');
        if (selectRelationshipThickness) {
            selectRelationshipThickness.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                if (relationshipThicknessValue) {
                    relationshipThicknessValue.textContent = value;
                }
                this.app.setStrokeWidths({ relationship: value });
            });
            const resetRelationshipThickness = document.getElementById('resetRelationshipThickness');
            if (resetRelationshipThickness) {
                resetRelationshipThickness.addEventListener('click', () => {
                    selectRelationshipThickness.value = '2';
                    selectRelationshipThickness.dispatchEvent(new Event('input'));
                });
            }
        }

        // Emotional opacity slider (in toolbar)
        const emotionalOpacitySlider = document.getElementById('emotionalOpacitySlider');
        const emotionalOpacityValue = document.getElementById('emotionalOpacityValue');
        if (emotionalOpacitySlider && emotionalOpacityValue) {
            emotionalOpacitySlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                emotionalOpacityValue.textContent = `${value}%`;
                this.app.setEmotionalOpacity(value / 100);
            });
        }

        // Legend export buttons
        safeAddListener('btnExportLegendPNG', () => {
            if (this.app.legend) {
                this.app.legend.exportLegendAsPNG();
            }
        });
        safeAddListener('btnExportLegendSVG', () => {
            if (this.app.legend) {
                this.app.legend.exportLegendAsSVG();
            }
        });

        // Emotional thickness slider
        const selectEmotionalThickness = document.getElementById('selectEmotionalThickness');
        const emotionalThicknessValue = document.getElementById('emotionalThicknessValue');
        if (selectEmotionalThickness) {
            selectEmotionalThickness.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                if (emotionalThicknessValue) {
                    emotionalThicknessValue.textContent = value;
                }
                this.app.setStrokeWidths({ emotional: value });
            });
            const resetEmotionalThickness = document.getElementById('resetEmotionalThickness');
            if (resetEmotionalThickness) {
                resetEmotionalThickness.addEventListener('click', () => {
                    selectEmotionalThickness.value = '2';
                    selectEmotionalThickness.dispatchEvent(new Event('input'));
                });
            }
        }

        document.querySelectorAll('.template-btn').forEach(btn => {
            btn.addEventListener('click', () => this.selectTemplate(btn, btn.dataset.template));
        });

        // Toolbar buttons removed - functionality moved to context menu
        // safeAddListener('btnAddPerson', () => this.app.addPerson());
        // safeAddListener('btnAddSibling', () => this.app.addSibling());
        // safeAddListener('btnAddPaternalSibling', () => this.app.addPaternalSibling());
        // safeAddListener('btnAddMaternalSibling', () => this.app.addMaternalSibling());
        // safeAddListener('btnAddSon', () => this.app.addSon());
        // safeAddListener('btnAddDaughter', () => this.app.addDaughter());
        // safeAddListener('btnDelete', () => this.app.deleteSelected());

        safeAddListener('btnAutoLayout', () => this.app.applyAutoLayout());

        document.querySelectorAll('.layer-toggle-input').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                const layer = checkbox.dataset.layer;
                const willShow = checkbox.checked;
                this.app.toggleLayer(layer, willShow);
            });
        });

        // Collapse functionality removed - all sections always visible

        // Simplified emotion type selector
        const emotionSelect = document.getElementById('selectEmotionType');
        if (emotionSelect) {
            emotionSelect.addEventListener('change', (e) => {
                const subtype = e.target.value;
                this.app.setEmotionalSubtype(subtype);

                // Update visual feedback based on selection
                if (subtype === 'none') {
                    this.updateEmotionStatus('감정선 유형을 선택한 후 인물을 2명 선택하면 연결됩니다', {
                        isActive: false,
                        isWaiting: false,
                        category: null
                    });
                } else {
                    const category = this.getEmotionCategory(subtype);
                    const emotionLabel = this.app.getEmotionalLabel(subtype);
                    this.updateEmotionStatus(`현재 감정선: "${emotionLabel}" - 인물 2명을 선택하면 연결됩니다`, {
                        isActive: true,
                        isWaiting: false,
                        category: category
                    });

                    // Show toast message with guidance
                    this.showToast(`"${emotionLabel}" 감정선이 선택되었습니다. 연결할 인물 2명을 클릭하세요`, 'info', 3000);
                }
            });
        }
    }

    selectTemplate(button, templateName) {
        document.querySelectorAll('.template-btn').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        this.app.loadTemplate(templateName);
    }

    showExportMenu() {
        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.style.cssText = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:1000;';
        
        menu.innerHTML = `
            <button class="context-menu-item" data-format="png">PNG 이미지</button>
            <button class="context-menu-item" data-format="svg">SVG 파일</button>
            <div class="context-menu-divider"></div>
            <button class="context-menu-item" data-format="json">JSON 데이터</button>
        `;

        menu.querySelectorAll('.context-menu-item').forEach(item => {
            item.addEventListener('click', () => {
                this.app.exportDocument(item.dataset.format);
                document.body.removeChild(menu);
            });
        });

        setTimeout(() => {
            const closeHandler = (e) => {
                if (!menu.contains(e.target) && document.body.contains(menu)) {
                    document.body.removeChild(menu);
                    document.removeEventListener('click', closeHandler);
                }
            };
            document.addEventListener('click', closeHandler);
        }, 0);

        document.body.appendChild(menu);
    }

    updateZoomDisplay(zoom) {
        document.getElementById('zoomLevel').textContent = `${Math.round(zoom * 100)}%`;
    }

    /**
     * 통합 토스트 메시지 표시 함수
     * @param {string} message - 메시지
     * @param {string} type - 타입 ('success' | 'error' | 'warning' | 'info')
     * @param {number} duration - 표시 시간 (ms, 기본값: 3000)
     */
    showToast(message, type = 'info', duration = 3000) {
        // 기존 토스트 제거
        const existingToast = document.querySelector('.toast');
        if (existingToast) {
            existingToast.remove();
        }

        const icons = {
            info: '💡',
            success: '✓',
            error: '✕',
            warning: '⚠'
        };

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-icon">${icons[type] || icons.info}</div>
            <div class="toast-content"><div class="toast-message">${message}</div></div>
            <button class="toast-close">×</button>
        `;

        toast.querySelector('.toast-close').addEventListener('click', () => {
            toast.classList.add('toast-exit');
            setTimeout(() => {
                if (document.body.contains(toast)) toast.remove();
            }, 300);
        });

        document.body.appendChild(toast);

        // 자동 제거
        setTimeout(() => {
            if (document.body.contains(toast)) {
                toast.classList.add('toast-exit');
                setTimeout(() => {
                    if (document.body.contains(toast)) toast.remove();
                }, 300);
            }
        }, duration);
    }

    /**
     * 토스트 위치 설정
     * @param {string} position - 위치 ('bottom-right' | 'top-center' | 'bottom-center')
     */
    static setToastPosition(position = 'bottom-right') {
        const validPositions = ['bottom-right', 'top-center', 'bottom-center'];
        if (validPositions.includes(position)) {
            document.body.setAttribute('data-toast-position', position);
        } else {
            console.warn(`Invalid toast position: ${position}. Use one of: ${validPositions.join(', ')}`);
        }
    }

    // Grid and magnet controls moved to settings modal
    updateGridLabel(mode) {
        // No longer needed - grid control is in settings modal
    }

    updateMagnetCheckbox(enabled) {
        // No longer needed - magnet control is in settings modal
    }

    updateEmotionButtons(subtype) {
        const emotionSelect = document.getElementById('selectEmotionType');
        if (emotionSelect) {
            emotionSelect.value = subtype;
        }
    }

    updateEmotionStatus(message, options = {}) {
        const status = document.getElementById('emotionStatus');
        if (status) {
            status.textContent = message;
            
            // Remove all state classes
            status.classList.remove('active', 'waiting');
            status.removeAttribute('data-category');
            
            // Add state classes based on current state
            if (options.isActive) {
                status.classList.add('active');
            }
            if (options.isWaiting) {
                status.classList.add('waiting');
            }
            if (options.category) {
                status.setAttribute('data-category', options.category);
            }
        }
    }
    
    getEmotionCategory(subtype) {
        const categories = {
            // 긍정적 관계
            'normal': 'positive',
            'harmony': 'positive',
            'friendship': 'positive',
            'close-friendship': 'positive',
            'love': 'positive',
            'passion': 'positive',
            'admiration': 'positive',
            'attraction': 'positive',
            // 거리감
            'apathy': 'distance',
            'distant': 'distance',
            'cutoff': 'distance',
            // 부정적
            'discord': 'negative',
            'hostility': 'negative',
            'distrust': 'negative',
            'jealousy': 'negative',
            // 융합
            'fused': 'conflict',
            'fused-hostile': 'conflict',
            // 갈등/폭력
            'hostile': 'conflict',
            'distant-hostile': 'conflict',
            'close-hostile': 'conflict',
            'violence': 'conflict',
            'distant-violence': 'conflict',
            'close-violence': 'conflict',
            'fused-violence': 'conflict',
            // 학대
            'abuse': 'abuse',
            'physical-abuse': 'abuse',
            'emotional-abuse': 'abuse',
            'sexual-abuse': 'abuse',
            'neglect': 'abuse',
            // 기타
            'manipulative': 'negative',
            'controlling': 'negative',
            'focused-on': 'negative',
            'never-met': 'distance'
        };
        return categories[subtype] || null;
    }
}

console.log('✓ Toolbar class defined');

class PropertiesPanel {
    constructor(app) {
        this.app = app;
        this.panel = document.getElementById('propertiesPanel');
        this.content = document.getElementById('panelContent');
        this.currentSelection = null;
        this.previewDebounceTimer = null;
        
        // 초기화 시 요소 확인
        if (!this.panel) {
            console.error('PropertiesPanel: propertiesPanel element not found!');
        }
        if (!this.content) {
            console.error('PropertiesPanel: panelContent element not found!');
        }
    }

    show() {
        if (this.panel) {
            this.panel.style.display = 'flex';
        }
    }

    hide() {
        if (this.panel) {
            this.panel.style.display = 'none';
        }
        this.currentSelection = null;
    }

    showPersonProperties(person) {
        this.currentSelection = { type: 'person', data: person };
        this.show();
        
        if (!this.content) {
            console.error('PropertiesPanel: Cannot show person properties - content element not found');
            return;
        }

        this.content.innerHTML = `
                    <div class="property-form">
                        <div class="form-group">
                            <label class="form-label">이름</label>
                            <div style="display: flex; gap: var(--space-xs); align-items: center;">
                                <input type="text" class="form-input" id="propName" value="${person.name}" placeholder="이름 입력" style="flex: 1;">
                                <label class="checkbox-label-simple" style="margin: 0; white-space: nowrap;">
                                    <input type="checkbox" id="propIsCT" ${person.isCT ? 'checked' : ''}>
                                    <span>CT</span>
                                </label>
                                <label class="checkbox-label-simple" style="margin: 0; white-space: nowrap;">
                                    <input type="checkbox" id="propDeceased" ${person.isDeceased ? 'checked' : ''}>
                                    <span>사망</span>
                                </label>
                            </div>
                        </div>

                        <div class="form-group">
                            <label class="form-label">성별</label>
                            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-xs);">
                                <label class="radio-label-simple" style="margin: 0;">
                                    <input type="radio" name="gender" value="M" ${person.gender === 'M' ? 'checked' : ''}>
                                    <span>남성</span>
                                </label>
                                <label class="radio-label-simple" style="margin: 0;">
                                    <input type="radio" name="gender" value="F" ${person.gender === 'F' ? 'checked' : ''}>
                                    <span>여성</span>
                                </label>
                                <label class="radio-label-simple" style="margin: 0;">
                                    <input type="radio" name="gender" value="X" ${person.gender === 'X' ? 'checked' : ''}>
                                    <span>기타</span>
                                </label>
                            </div>
                        </div>

                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-xs);">
                            <div class="form-group">
                                <label class="form-label">나이</label>
                                <input type="number" class="form-input" id="propBirthYear" value="${person.getAge() !== null ? person.getAge() : ''}" placeholder="32">
                            </div>
                            
                            <div class="form-group" id="deathYearGroup" style="display: ${person.isDeceased ? 'block' : 'none'};">
                                <label class="form-label">사망년도</label>
                                <input type="number" class="form-input" id="propDeathYear" value="${person.deathYear || ''}" placeholder="2020">
                            </div>
                        </div>

                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-xs);">
                            <div class="form-group">
                                <label class="form-label">세대</label>
                                <select class="form-select" id="propGeneration">
                                    <option value="-2" ${person.generation === -2 ? 'selected' : ''}>조부모</option>
                                    <option value="-1" ${person.generation === -1 ? 'selected' : ''}>부모</option>
                                    <option value="0" ${person.generation === 0 ? 'selected' : ''}>내담자</option>
                                    <option value="1" ${person.generation === 1 ? 'selected' : ''}>자녀</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">출생순서</label>
                                <input type="number" class="form-input" id="propBirthOrder" value="${person.birthOrder || 1}" min="1" placeholder="1">
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">가계</label>
                                <select class="form-select" id="propSide">
                                    <option value="paternal" ${person.side === 'paternal' ? 'selected' : ''}>친가</option>
                                    <option value="maternal" ${person.side === 'maternal' ? 'selected' : ''}>외가</option>
                                    <option value="both" ${person.side === 'both' ? 'selected' : ''}>양가</option>
                                    <option value="none" ${person.side === 'none' ? 'selected' : ''}>비혈연</option>
                                </select>
                            </div>
                        </div>

                        <div class="button-group" style="display: flex; gap: var(--space-xs); margin-top: var(--space-sm);">
                            <button class="btn btn-primary btn-sm" id="btnApplyPerson" style="flex: 1;">적용</button>
                            <button class="btn btn-danger btn-sm" id="btnDeletePerson" style="flex: 1;">삭제</button>
                        </div>
                    </div>
        `;

        this.setupPersonPropertyHandlers(person);
    }

    setupPersonPropertyHandlers(person) {
        // 이름 삭제 버튼
        const btnClearName = document.getElementById('btnClearName');
        if (btnClearName) {
            btnClearName.addEventListener('click', (e) => {
                e.preventDefault();
                const nameInput = document.getElementById('propName');
                if (nameInput) {
                    nameInput.value = '';
                    nameInput.focus();
                    this.previewPersonChanges(person);
                }
            });
        }
        
        document.getElementById('propDeceased').addEventListener('change', (e) => {
            const deathYearGroup = document.getElementById('deathYearGroup');
            deathYearGroup.style.display = e.target.checked ? 'block' : 'none';
        });

        document.getElementById('btnApplyPerson').addEventListener('click', () => {
            this.applyPersonProperties(person);
        });

        document.getElementById('btnDeletePerson').addEventListener('click', () => {
            // [FIX UI-01] confirm() → 커스텀 모달
            this.app.showConfirm(`${person.getDisplayName()}을(를) 삭제하시겠습니까?`, () => {
                this.app.deletePerson(person.id);
                this.hide();
            });
        });

        // Real-time preview
        const inputs = ['propName', 'propBirthYear', 'propDeathYear', 'propGeneration', 'propBirthOrder', 'propSide'];
        inputs.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', () => this.previewPersonChanges(person));
            }
        });

        document.querySelectorAll('input[name="gender"]').forEach(radio => {
            radio.addEventListener('change', () => this.previewPersonChanges(person));
        });

        document.getElementById('propDeceased').addEventListener('change', () => this.previewPersonChanges(person));
        document.getElementById('propIsCT').addEventListener('change', () => this.previewPersonChanges(person));
    }

    previewPersonChanges(person) {
        person.name = document.getElementById('propName').value;
        person.gender = document.querySelector('input[name="gender"]:checked').value;
        const ageInput = document.getElementById('propBirthYear').value;
        const ageValue = parseInt(ageInput, 10);
        if (!Number.isNaN(ageValue)) {
            const currentYear = new Date().getFullYear();
            person.birthYear = currentYear - ageValue;
        } else {
            person.birthYear = null;
        }
        person.isDeceased = document.getElementById('propDeceased').checked;
        person.deathYear = person.isDeceased ? (parseInt(document.getElementById('propDeathYear').value) || null) : null;
        person.generation = parseInt(document.getElementById('propGeneration').value);
        person.birthOrder = parseInt(document.getElementById('propBirthOrder').value) || 1;
        person.side = document.getElementById('propSide').value;
        person.isCT = document.getElementById('propIsCT').checked;
        
        this.app.render();
    }

    applyPersonProperties(person) {
        this.app.state.saveState();
        this.app.toolbar.showToast('변경사항이 적용되었습니다. 저장 버튼을 누르면 저장됩니다.', 'info');
    }

    showRelationshipProperties(relationship) {
        this.currentSelection = { type: 'relationship', data: relationship };
        this.show();
        
        if (!this.content) {
            console.error('PropertiesPanel: Cannot show relationship properties - content element not found');
            return;
        }

        const relationshipTypes = this.getRelationshipTypeOptions(relationship);

        this.content.innerHTML = `
                    <div class="property-form">
                        <div class="info-section">
                            <div class="info-title">관계 정보</div>
                            <div class="info-row">
                                <span class="info-label">유형</span>
                                <span class="info-value">${this.getRelationshipTypeLabel(relationship.type)}</span>
                            </div>
                        </div>

                        <div class="form-group">
                            <label class="form-label">세부 유형</label>
                            <select class="form-select" id="propRelationType">
                                ${relationshipTypes}
                            </select>
                        </div>

                        <div class="form-group">
                            <label class="form-label">라벨</label>
                            <input type="text" class="form-input" id="propRelLabel" value="${relationship.label || ''}" placeholder="관계 설명">
                        </div>
                        
                        <div class="button-group" style="display: flex; gap: var(--space-sm); margin-top: var(--space-sm);">
                            <button class="btn btn-primary" id="btnApplyRelationship" style="flex: 1;">적용</button>
                            <button class="btn btn-danger" id="btnDeleteRelationship" style="flex: 1;">삭제</button>
                        </div>
                    </div>
        `;

        this.setupRelationshipPropertyHandlers(relationship);
    }

    getRelationshipTypeOptions(relationship) {
        let options = '';
        
        if (relationship.type === 'couple') {
            options = `
                <option value="marriage" ${relationship.subtype === 'marriage' ? 'selected' : ''}>결혼</option>
                <option value="cohabiting" ${relationship.subtype === 'cohabiting' ? 'selected' : ''}>동거</option>
                <option value="separated" ${relationship.subtype === 'separated' ? 'selected' : ''}>별거</option>
                <option value="divorced" ${relationship.subtype === 'divorced' ? 'selected' : ''}>이혼</option>
                <option value="ex" ${relationship.subtype === 'ex' ? 'selected' : ''}>전 파트너</option>
            `;
        } else if (relationship.type === 'emotional') {
            options = `
                <option value="close" ${relationship.subtype === 'close' ? 'selected' : ''}>친밀</option>
                <option value="distant" ${relationship.subtype === 'distant' ? 'selected' : ''}>소원</option>
                <option value="conflict" ${relationship.subtype === 'conflict' ? 'selected' : ''}>갈등</option>
                <option value="cutoff" ${relationship.subtype === 'cutoff' ? 'selected' : ''}>단절</option>
                <option value="enmeshed" ${relationship.subtype === 'enmeshed' ? 'selected' : ''}>밀착</option>
                <option value="abuse" ${relationship.subtype === 'abuse' ? 'selected' : ''}>학대</option>
                <option value="dependency" ${relationship.subtype === 'dependency' ? 'selected' : ''}>의존</option>
            `;
        }
        
        return options;
    }

    getRelationshipTypeLabel(type) {
        const labels = {
            'couple': '부부/파트너 관계',
            'parent-child': '부모-자녀 관계',
            'emotional': '정서적 관계'
        };
        return labels[type] || type;
    }

    setupRelationshipPropertyHandlers(relationship) {
        document.getElementById('btnApplyRelationship').addEventListener('click', () => {
            relationship.subtype = document.getElementById('propRelationType').value;
            relationship.label = document.getElementById('propRelLabel').value;
            
            this.app.state.saveState();
            this.app.render();
            this.app.toolbar.showToast('관계가 수정되었습니다. 저장 버튼을 누르면 저장됩니다.', 'info');
        });

        document.getElementById('btnDeleteRelationship').addEventListener('click', () => {
            // [FIX UI-01] confirm() → 커스텀 모달
            this.app.showConfirm('이 관계를 삭제하시겠습니까?', () => {
                this.app.deleteRelationship(relationship.id);
                this.hide();
            });
        });

        document.getElementById('propRelationType').addEventListener('change', () => {
            relationship.subtype = document.getElementById('propRelationType').value;
            this.app.render();
        });
    }

    showEmpty() {
        this.currentSelection = null;
        if (this.content) {
            this.content.innerHTML = `
                <div class="empty-state">
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                        <circle cx="24" cy="24" r="20" stroke="currentColor" stroke-width="2" opacity="0.3"/>
                        <path d="M24 16V24M24 28H24.02" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.3"/>
                    </svg>
                    <p>편집할 요소를 선택하세요</p>
                </div>
            `;  
        }
    }
}

// Script loading confirmation
if (window.DEBUG_LOADING) {
    console.log('✓ ui.js loaded (Toolbar, PropertiesPanel classes)');
}
/**
 * Common Header & Footer Component Manager
 * Based on RE project architecture
 */

const THEME_STORAGE_KEY = 'gyeolsok-theme';
const SETTINGS_STORAGE_KEYS = {
    projectName: 'defaultProjectName',
    gridMode: 'gridMode',
    magnet: 'magnetEnabled',
    uiScale: 'uiScale',
    tutorial: 'tutorialCompleted'
};
const SETTINGS_DEFAULTS = {
    theme: 'light',
    scale: 1,
    gridMode: 'solid',
    magnetEnabled: true
};

// Theme Management
function getPreferredTheme() {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
        return stored;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme, persist = true) {
    const normalized = theme === 'light' ? 'light' : 'dark';
    const root = document.documentElement;
    root.dataset.theme = normalized;
    root.style.colorScheme = normalized;

    document.body.classList.toggle('light-mode', normalized === 'light');

    if (persist) {
        localStorage.setItem(THEME_STORAGE_KEY, normalized);
    }

    // Update theme toggle buttons
    document.querySelectorAll('.theme-toggle').forEach(btn => {
        const iconHtml = normalized === 'light'
            ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>'
            : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>';
        btn.innerHTML = iconHtml;
        btn.title = normalized === 'light' ? '다크 모드' : '라이트 모드';
        btn.setAttribute('aria-label', btn.title);
    });
}

function toggleTheme() {
    const current = document.documentElement.dataset.theme || getPreferredTheme();
    const next = current === 'light' ? 'dark' : 'light';
    applyTheme(next, true);
}

function initializeTheme() {
    applyTheme(getPreferredTheme(), false);
}

function getStoredScaleValue() {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEYS.uiScale);
    if (stored && !Number.isNaN(parseFloat(stored))) {
        return parseFloat(stored);
    }
    return SETTINGS_DEFAULTS.scale;
}

function updateScaleLabel(value) {
    const label = document.getElementById('settingsScaleValue');
    if (label) {
        label.textContent = `${Math.round(parseFloat(value) * 100)}%`;
    }
}

function syncSettingsModalFields() {
    const modal = document.getElementById('settingsModal');
    if (!modal) return;

    const themeToggle = modal.querySelector('#settingsThemeToggle');
    if (themeToggle) {
        const currentTheme = document.documentElement.dataset.theme || SETTINGS_DEFAULTS.theme;
        themeToggle.checked = currentTheme === 'dark';
    }

    const scaleInput = modal.querySelector('#settingsUiScale');
    if (scaleInput) {
        const savedScale = getStoredScaleValue();
        scaleInput.value = savedScale.toString();
        updateScaleLabel(savedScale);
    }

    const gridButtonGroup = modal.querySelector('#settingsGridMode');
    if (gridButtonGroup) {
        const savedMode = localStorage.getItem(SETTINGS_STORAGE_KEYS.gridMode) || SETTINGS_DEFAULTS.gridMode;
        const displayMode = savedMode === 'none' ? 'off' : savedMode;
        const buttons = gridButtonGroup.querySelectorAll('button');
        buttons.forEach(btn => {
            btn.classList.remove('btn-primary');
            btn.classList.add('btn-ghost');
            if (btn.dataset.value === displayMode) {
                btn.classList.remove('btn-ghost');
                btn.classList.add('btn-primary');
            }
        });
    }

    const magnetToggle = modal.querySelector('#settingsMagnet');
    if (magnetToggle) {
        const savedMagnet = localStorage.getItem(SETTINGS_STORAGE_KEYS.magnet);
        const isEnabled = savedMagnet === null ? SETTINGS_DEFAULTS.magnetEnabled : savedMagnet !== 'false';
        if (isEnabled) {
            magnetToggle.classList.add('active');
        } else {
            magnetToggle.classList.remove('active');
        }
    }
}

// Header Template
function getHeaderTemplate() {
    const currentPage = window.location.pathname;
    const isCanvas = currentPage.includes('canvas.html');
    const isIndex = currentPage.includes('index.html') || currentPage.endsWith('/');

    return `
        <div class="header-left">
            <button class="btn btn--icon theme-toggle" type="button" onclick="toggleTheme()" aria-label="테마 전환">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="5"></circle>
                    <line x1="12" y1="1" x2="12" y2="3"></line>
                    <line x1="12" y1="21" x2="12" y2="23"></line>
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                    <line x1="1" y1="12" x2="3" y2="12"></line>
                    <line x1="21" y1="12" x2="23" y2="12"></line>
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                </svg>
            </button>
        </div>
        <div class="header-brand" onclick="window.location.href='index.html'" title="홈으로 이동">
            <span class="brand-mark">결속</span>
            <div class="brand-copy">
                <strong>전문가를 위한 가족 관계도 도구</strong>
            </div>
        </div>
        <div class="header-controls">
            <a href="index.html" class="btn ${isIndex ? 'active' : ''}" title="대시보드">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                    <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
                <span>대시보드</span>
            </a>
            <a href="canvas.html" class="btn ${isCanvas ? 'active' : ''}" title="캔버스">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <path d="M9 3v18M3 9h18M3 15h18M15 3v18"></path>
                </svg>
                <span>캔버스</span>
            </a>
            <button class="btn btn--icon" type="button" onclick="openSettingsModal()" title="설정">⚙</button>
        </div>
    `;
}

// Footer Template
function getFooterTemplate() {
    const currentYear = new Date().getFullYear();

    return `
        <footer class="common-footer">
            <div class="footer-content">
                <span class="footer-copy">Copyright © ${currentYear} 결속(Gyeolsok). All Rights Reserved.</span>
                <span class="footer-divider">|</span>
                <div class="footer-links">
                    <a href="guide.html" class="footer-link">사용 안내서</a>
                    <a href="changelog.html" class="footer-link">업데이트 내역</a>
                    <a href="donate.html" class="footer-link">후원하기</a>
                    <a href="privacy.html" class="footer-link">개인정보 보호정책</a>
                    <a href="notice.html" class="footer-link">공지사항</a>
                    <a href="sitemap.html" class="footer-link">사이트맵</a>
                </div>
            </div>
        </footer>
    `;
}

// Render Functions
function renderCommonHeader() {
    const headerElement = document.querySelector('.top-nav, .header, header');
    if (!headerElement || headerElement.dataset.rendered === 'true') {
        return;
    }

    headerElement.classList.add('header');
    headerElement.innerHTML = getHeaderTemplate();
    headerElement.dataset.rendered = 'true';

    // Initialize icons after rendering
    if (typeof initializeIcons === 'function') {
        initializeIcons();
    }

    // Apply current theme
    applyTheme(document.documentElement.dataset.theme || getPreferredTheme(), false);
}

function renderCommonFooter() {
    const existing = document.querySelector('.common-footer');
    if (existing) {
        existing.remove();
    }

    document.body.insertAdjacentHTML('beforeend', getFooterTemplate());
}

// Initialize
function initCommonComponents() {
    renderCommonHeader();
    renderCommonFooter();
    initializeTheme();
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCommonComponents);
} else {
    initCommonComponents();
}

// Settings Modal
function openSettingsModal() {
    let modal = document.getElementById('settingsModal');
    if (modal) {
        modal.remove();
    }

    const modalHTML = `
        <div class="modal-overlay" id="settingsModal" style="display: flex; align-items: center; justify-content: center; z-index: 9999;">
            <div class="modal" style="max-width: 560px; width: 90%;">
                <div class="modal-header">
                    <h2 class="modal-title">설정</h2>
                    <button class="btn btn-ghost btn-sm" onclick="closeSettingsModal()" aria-label="닫기" style="padding: 6px; min-width: 32px;">
                        <span class="icon-close">✕</span>
                    </button>
                </div>
                <div class="modal-body" style="padding: 1.5rem; max-height: 70vh; overflow-y: auto;">
                    <!-- 테마 -->
                    <div class="form-group">
                        <div style="display: flex; align-items: center; justify-content: space-between;">
                            <div>
                                <label class="form-label" style="margin-bottom: 0.25rem; font-weight: 600;">테마</label>
                                <p class="text-muted small" style="margin: 0;">다크 모드로 전환</p>
                            </div>
                            <button class="btn btn--icon theme-toggle" type="button" id="settingsThemeToggle" onclick="toggleTheme()"></button>
                        </div>
                    </div>
                    
                    <hr style="margin: 1.5rem 0; border: none; border-top: 1px solid var(--border-primary);">
                    
                    <!-- UI 배율 -->
                    <div class="form-group slider-group">
                        <div class="slider-header">
                            <label class="form-label" for="settingsUiScale" style="font-weight: 600; margin-bottom: 0;">
                                UI 배율: <span id="settingsScaleValue" style="color: var(--accent-blue); font-weight: 700;">100%</span>
                            </label>
                            <button class="btn btn-ghost btn-sm" type="button" id="resetScaleBtn" style="min-width: 96px;">
                                기본값으로
                            </button>
                        </div>
                        <input type="range" id="settingsUiScale" min="0.8" max="1.4" value="1" step="0.1"
                               style="width: 100%; margin-top: 0.75rem;">
                        <div class="slider-ticks">
                            <span>80%</span>
                            <span>90%</span>
                            <span>100%</span>
                            <span>110%</span>
                            <span>120%</span>
                            <span>130%</span>
                            <span>140%</span>
                        </div>
                    </div>
                    
                    <hr style="margin: 1.5rem 0; border: none; border-top: 1px solid var(--border-primary);">

                    <!-- 그리드 모드 -->
                    <div class="form-group">
                        <label class="form-label" style="font-weight: 600; margin-bottom: 0.5rem;">그리드 모드</label>
                        <p class="text-muted small" style="margin: 0 0 0.75rem 0;">캔버스의 격자 표시 방식</p>
                        <div class="button-group" id="settingsGridMode" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem;">
                            <button type="button" class="btn btn-ghost" data-value="solid" style="justify-content: center;">실선</button>
                            <button type="button" class="btn btn-ghost" data-value="dashed" style="justify-content: center;">점선</button>
                            <button type="button" class="btn btn-ghost" data-value="off" style="justify-content: center;">끄기</button>
                        </div>
                    </div>

                    <hr style="margin: 1.5rem 0; border: none; border-top: 1px solid var(--border-primary);">

                    <!-- 자석 정렬 -->
                    <div class="form-group">
                        <div style="display: flex; align-items: center; justify-content: space-between;">
                            <div>
                                <label class="form-label" style="margin-bottom: 0.25rem; font-weight: 600;">자석 정렬</label>
                                <p class="text-muted small" style="margin: 0;">드래그 시 격자에 자동 정렬</p>
                            </div>
                            <button class="settings-toggle-btn" type="button" id="settingsMagnet">
                                <span class="toggle-track">
                                    <span class="toggle-thumb"></span>
                                </span>
                            </button>
                        </div>
                    </div>

                    <hr style="margin: 1.5rem 0; border: none; border-top: 1px solid var(--border-primary);">

                    <!-- 추가 옵션 -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
                        <button class="btn btn-ghost" type="button" onclick="restartTutorialFromSettings()"
                                style="justify-content: center;">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style="margin-right: 0.5rem;">
                                <path d="M8 2C4.5 2 2 4.5 2 8s2.5 6 6 6 6-2.5 6-6" stroke="currentColor" stroke-width="1.5"
                                      stroke-linecap="round" fill="none"/>
                                <path d="M8 5v3l2 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                            </svg>
                            튜토리얼
                        </button>
                        <button class="btn btn-ghost" type="button" onclick="resetAppSettings(false)"
                                style="justify-content: center; color: var(--accent-red);">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style="margin-right: 0.5rem;">
                                <path d="M13 3L3 13M3 3l10 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                            </svg>
                            초기화
                        </button>
                    </div>
                </div>
                <div class="modal-footer" style="padding: 1rem 1.5rem; border-top: 1px solid var(--border-primary); display: flex; gap: 0.75rem; justify-content: flex-end;">
                    <button class="btn btn-ghost" onclick="closeSettingsModal()">취소</button>
                    <button class="btn btn-primary" onclick="saveSettings()">저장</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    updateScaleLabel(getStoredScaleValue());
    syncSettingsModalFields();

    document.getElementById('settingsUiScale').addEventListener('input', (e) => {
        updateScaleLabel(e.target.value);
    });

    const resetScaleBtn = document.getElementById('resetScaleBtn');
    if (resetScaleBtn) {
        resetScaleBtn.addEventListener('click', () => {
            const slider = document.getElementById('settingsUiScale');
            if (slider) {
                slider.value = '1';
                updateScaleLabel(1);
            }
        });
    }

    // Grid mode button group
    const gridButtons = document.querySelectorAll('#settingsGridMode button');
    gridButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            gridButtons.forEach(b => b.classList.remove('btn-primary'));
            gridButtons.forEach(b => b.classList.add('btn-ghost'));
            btn.classList.remove('btn-ghost');
            btn.classList.add('btn-primary');
        });
    });

    // Magnet toggle button
    const magnetToggle = document.getElementById('settingsMagnet');
    if (magnetToggle) {
        magnetToggle.addEventListener('click', () => {
            const isActive = magnetToggle.classList.contains('active');
            if (isActive) {
                magnetToggle.classList.remove('active');
            } else {
                magnetToggle.classList.add('active');
            }
        });
    }

    modal = document.getElementById('settingsModal');
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeSettingsModal();
        }
    });
}

function closeSettingsModal() {
    const modal = document.getElementById('settingsModal');
    if (modal) {
        modal.remove();
    }
}

function saveSettings() {
    const isDark = document.documentElement.dataset.theme === 'dark';
    applyTheme(isDark ? 'dark' : 'light', true);

    const scale = parseFloat(document.getElementById('settingsUiScale').value);
    localStorage.setItem(SETTINGS_STORAGE_KEYS.uiScale, scale);
    document.documentElement.style.fontSize = (16 * scale) + 'px';
    if (window.GenogramUISettings) {
        window.GenogramUISettings.applyScale(scale);
        window.GenogramUISettings.persist({
            theme: isDark ? 'dark' : 'light',
            scale
        });
    }

    const gridButtonGroup = document.getElementById('settingsGridMode');
    const activeGridButton = gridButtonGroup ? gridButtonGroup.querySelector('.btn-primary') : null;
    const gridMode = activeGridButton ? activeGridButton.dataset.value : 'solid';
    const normalizedGridMode = gridMode === 'off' ? 'none' : gridMode;
    localStorage.setItem(SETTINGS_STORAGE_KEYS.gridMode, normalizedGridMode);

    if (window.genogramApp && window.genogramApp.renderer) {
        window.genogramApp.renderer.setGridMode(normalizedGridMode);
        window.genogramApp.state.gridMode = normalizedGridMode;
        window.genogramApp.render();
    }

    const magnetToggle = document.getElementById('settingsMagnet');
    const magnetEnabled = magnetToggle ? magnetToggle.classList.contains('active') : false;
    localStorage.setItem(SETTINGS_STORAGE_KEYS.magnet, magnetEnabled);

    if (window.genogramApp && window.genogramApp.state) {
        window.genogramApp.state.isMagnetEnabled = magnetEnabled;
    }

    closeSettingsModal();
    
    if (window.genogramApp && window.genogramApp.toolbar) {
        window.genogramApp.toolbar.showToast('설정이 저장되었습니다', 'success');
    }
}

function restartTutorialFromSettings() {
    if (window.genogramApp && window.genogramApp.tutorial) {
        window.genogramApp.tutorial.reset();
        window.genogramApp.loadTemplateData('blank_canvas');
    }
}

function resetAppSettings(closeModalAfter = true) {
    localStorage.removeItem(SETTINGS_STORAGE_KEYS.projectName);
    localStorage.removeItem(SETTINGS_STORAGE_KEYS.uiScale);
    localStorage.removeItem(SETTINGS_STORAGE_KEYS.gridMode);
    localStorage.removeItem(SETTINGS_STORAGE_KEYS.magnet);
    localStorage.removeItem(SETTINGS_STORAGE_KEYS.tutorial);
    localStorage.removeItem(THEME_STORAGE_KEY);
    document.documentElement.style.fontSize = '';
    applyTheme(SETTINGS_DEFAULTS.theme, true);

    if (window.GenogramUISettings) {
        window.GenogramUISettings.applyScale(SETTINGS_DEFAULTS.scale);
        window.GenogramUISettings.persist({
            theme: SETTINGS_DEFAULTS.theme,
            scale: SETTINGS_DEFAULTS.scale
        });
    }

    if (window.genogramApp) {
        window.genogramApp.state.gridMode = SETTINGS_DEFAULTS.gridMode;
        window.genogramApp.renderer.setGridMode(SETTINGS_DEFAULTS.gridMode);
        window.genogramApp.state.isMagnetEnabled = SETTINGS_DEFAULTS.magnetEnabled;
    }
    restartTutorialFromSettings();
    syncSettingsModalFields();
    updateScaleLabel(SETTINGS_DEFAULTS.scale);

    if (closeModalAfter) {
        closeSettingsModal();
    }

    if (window.genogramApp && window.genogramApp.toolbar) {
        window.genogramApp.toolbar.showToast('설정이 초기값으로 복원되고 튜토리얼이 다시 시작됩니다.', 'info');
    }
}

// Expose functions globally
window.toggleTheme = toggleTheme;
window.initCommonComponents = initCommonComponents;
window.openSettingsModal = openSettingsModal;
window.closeSettingsModal = closeSettingsModal;
window.saveSettings = saveSettings;
window.resetAppSettings = resetAppSettings;
window.restartTutorialFromSettings = restartTutorialFromSettings;
/**
 * SVG 아이콘 관리 모듈
 * 반복되는 SVG 아이콘들을 중앙 집중 관리
 */
const Icons = {
    // 네비게이션 아이콘
    dashboard: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.5"/></svg>`,
    
    canvas: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M5 2V14M11 2V14M2 8H14" stroke="currentColor" stroke-width="1.5"/></svg>`,
    
    help: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5"/><path d="M8 6V8M8 10H8.01" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,

    settings: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="2" stroke="currentColor" stroke-width="1.5"/><path d="M8 1V3M8 13V15M15 8H13M3 8H1M12.5 3.5L11 5M5 11L3.5 12.5M12.5 12.5L11 11M5 5L3.5 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,

    // 도구 아이콘
    addPerson: `<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="7" r="3" stroke="currentColor" stroke-width="1.5"/><path d="M5 15C5 12.7909 6.79086 11 9 11H11C13.2091 11 15 12.7909 15 15V16" stroke="currentColor" stroke-width="1.5"/></svg>`,
    
    addRelation: `<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M4 10H16M10 4V16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
    
    delete: `<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M3 5H17M7 5V3H13V5M8 9V15M12 9V15M5 5L6 17H14L15 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
    
    // 관계 타입 아이콘
    spouse: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="5" cy="6" r="2" stroke="currentColor" stroke-width="1.5"/><circle cx="11" cy="6" r="2" stroke="currentColor" stroke-width="1.5"/><path d="M7 6H9" stroke="currentColor" stroke-width="1.5"/></svg>`,
    
    child: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="4" r="2" stroke="currentColor" stroke-width="1.5"/><path d="M8 6V9" stroke="currentColor" stroke-width="1.5"/><circle cx="8" cy="12" r="2" stroke="currentColor" stroke-width="1.5"/></svg>`,
    
    son: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="5" y="3" width="6" height="10" stroke="currentColor" stroke-width="1.5"/></svg>`,
    
    daughter: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="5" stroke="currentColor" stroke-width="1.5"/></svg>`,
    
    sibling: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="5" cy="8" r="2" stroke="currentColor" stroke-width="1.5"/><circle cx="11" cy="8" r="2" stroke="currentColor" stroke-width="1.5"/></svg>`,
    
    parent: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="11" r="2" stroke="currentColor" stroke-width="1.5"/><path d="M8 9V6" stroke="currentColor" stroke-width="1.5"/><circle cx="5" cy="3" r="2" stroke="currentColor" stroke-width="1.5"/><circle cx="11" cy="3" r="2" stroke="currentColor" stroke-width="1.5"/></svg>`,
    
    parentalSibling: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="4" cy="4" r="1.5" stroke="currentColor" stroke-width="1.5"/><circle cx="8" cy="4" r="1.5" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="4" r="1.5" stroke="currentColor" stroke-width="1.5"/><path d="M8 6V9" stroke="currentColor" stroke-width="1.5"/><circle cx="8" cy="12" r="2" stroke="currentColor" stroke-width="1.5"/></svg>`,
    
    paternalSibling: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="4" y="4" width="3" height="3" stroke="currentColor" stroke-width="1.5"/></svg>`,
    
    maternalSibling: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="3" stroke="currentColor" stroke-width="1.5"/></svg>`,
    
    // 툴바 아이콘
    save: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M12 14H4C3.44772 14 3 13.5523 3 13V3C3 2.44772 3.44772 3 4 3H9L12 6V13C12 13.5523 11.5523 14 11 14Z" stroke="currentColor" stroke-width="1.5"/><rect x="5" y="3" width="4" height="3" fill="currentColor" opacity="0.2"/><rect x="5" y="9" width="6" height="2" fill="currentColor" opacity="0.3"/></svg>`,
    
    export: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2V10M8 2L5 5M8 2L11 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 10V13C14 13.5523 13.5523 14 13 14H3C2.44772 14 2 13.5523 2 13V10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
    
    chevronDown: `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 5L6 8L9 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    
    undo: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4.5 8C4.5 5.5 6.5 3.5 9 3.5C11.5 3.5 13.5 5.5 13.5 8C13.5 10.5 11.5 12.5 9 12.5H8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M6.5 6L4.5 8L6.5 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    
    redo: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M11.5 8C11.5 5.5 9.5 3.5 7 3.5C4.5 3.5 2.5 5.5 2.5 8C2.5 10.5 4.5 12.5 7 12.5H8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M9.5 6L11.5 8L9.5 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    
    autoLayout: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="4" height="4" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="10" y="2" width="4" height="4" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="2" y="10" width="4" height="4" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="10" y="10" width="4" height="4" rx="1" stroke="currentColor" stroke-width="1.5"/><circle cx="8" cy="8" r="1.5" fill="currentColor"/></svg>`,
    
    zoomIn: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="4.5" stroke="currentColor" stroke-width="1.5"/><path d="M5 7H9M7 5V9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M10.5 10.5L14 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
    
    zoomOut: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="4.5" stroke="currentColor" stroke-width="1.5"/><path d="M5 7H9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M10.5 10.5L14 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
    
    resetZoom: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="3" y="3" width="10" height="10" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="5.5" y="5.5" width="5" height="5" rx="0.5" stroke="currentColor" stroke-width="1.5"/><circle cx="8" cy="8" r="1" fill="currentColor"/></svg>`,
    
    close: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4L12 12M12 4L4 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    
    folder: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M14 13H2C1.44772 13 1 12.5523 1 12V4C1 3.44772 1.44772 3 2 3H5L6.5 5H14C14.5523 5 15 5.44772 15 6V12C15 12.5523 14.5523 13 14 13Z" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>`,
    
    // 내보내기 포맷 아이콘
    json: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 3H10L13 6V13H3V3Z" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M6 3V6H13" stroke="currentColor" stroke-width="1.5"/></svg>`,
    
    png: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/><circle cx="5.5" cy="5.5" r="1.5" stroke="currentColor" stroke-width="1.5"/><path d="M13 10L10 7L7 10L4 7L2 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
    
    svg: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 2L14 2M14 2L14 14M14 14L2 14M2 14L2 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M5 8L8 5L11 8M8 5V12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
    
    pdf: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 2H10L13 5V14H3V2Z" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M10 2V5H13" stroke="currentColor" stroke-width="1.5"/><text x="5" y="11" font-size="4" fill="currentColor" font-weight="bold">PDF</text></svg>`,
    
    // 기타
    collapse: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 6L8 10L12 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    
    emptyState: `<svg width="48" height="48" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="20" stroke="currentColor" stroke-width="2" opacity="0.3"/><path d="M24 16V24M24 28H24.02" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.3"/></svg>`
};

// 아이콘을 HTML 문자열로 반환하는 헬퍼 함수
function getIcon(name, className = '') {
    const icon = Icons[name];
    if (!icon) {
        console.warn(`Icon "${name}" not found`);
        return '';
    }
    
    if (className) {
        return icon.replace('<svg', `<svg class="${className}"`);
    }
    
    return icon;
}

// 전역으로 접근 가능하도록 설정
window.Icons = Icons;
window.getIcon = getIcon;
/**
 * Genogram Studio - Loading State Manager
 * 로딩 상태 및 에러 처리 유틸리티
 */

const LoadingState = (function() {
    'use strict';

    // DOM 요소 캐싱
    let loadingOverlay = null;
    let loadingText = null;

    /**
     * 초기화 - DOM 요소 캐싱
     */
    function init() {
        loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingText = loadingOverlay.querySelector('.loading-text');
        }
    }

    /**
     * 로딩 오버레이 표시
     * @param {string} message - 로딩 메시지 (선택사항)
     */
    function showLoading(message = '불러오는 중...') {
        if (!loadingOverlay) init();
        if (!loadingOverlay) return;

        if (loadingText) {
            loadingText.textContent = message;
        }
        loadingOverlay.classList.add('active');
    }

    /**
     * 로딩 오버레이 숨기기
     */
    function hideLoading() {
        if (!loadingOverlay) init();
        if (!loadingOverlay) return;

        loadingOverlay.classList.remove('active');
    }

    /**
     * 버튼 로딩 상태 설정
     * @param {HTMLElement} button - 버튼 요소
     * @param {boolean} isLoading - 로딩 상태
     */
    function setButtonLoading(button, isLoading) {
        if (!button) return;

        if (isLoading) {
            button.classList.add('loading');
            button.disabled = true;
        } else {
            button.classList.remove('loading');
            button.disabled = false;
        }
    }

    /**
     * 토스트 알림 표시 (Toolbar.showToast 래퍼)
     * @param {string} message - 메시지
     * @param {string} type - 타입 ('success' | 'error' | 'warning' | 'info')
     * @param {number} duration - 표시 시간 (ms)
     */
    function showToast(message, type = 'info', duration = 3000) {
        // Toolbar의 통합 showToast 함수 사용
        if (window.genogramApp && window.genogramApp.toolbar) {
            window.genogramApp.toolbar.showToast(message, type, duration);
        } else {
            // Fallback: Toolbar가 없을 경우 직접 생성
            const existingToast = document.querySelector('.toast');
            if (existingToast) {
                existingToast.remove();
            }

            const icons = {
                success: '✓',
                error: '✕',
                warning: '⚠',
                info: '💡'
            };

            const toast = document.createElement('div');
            toast.className = `toast toast-${type}`;
            toast.innerHTML = `
                <div class="toast-icon">${icons[type] || icons.info}</div>
                <div class="toast-content"><div class="toast-message">${message}</div></div>
                <button class="toast-close">×</button>
            `;

            toast.querySelector('.toast-close').addEventListener('click', () => {
                toast.classList.add('toast-exit');
                setTimeout(() => {
                    if (document.body.contains(toast)) toast.remove();
                }, 300);
            });

            document.body.appendChild(toast);

            setTimeout(() => {
                if (document.body.contains(toast)) {
                    toast.classList.add('toast-exit');
                    setTimeout(() => {
                        if (document.body.contains(toast)) toast.remove();
                    }, 300);
                }
            }, duration);
        }
    }

    /**
     * 인라인 에러 메시지 생성
     * @param {string} message - 에러 메시지
     * @returns {HTMLElement} 에러 요소
     */
    function createInlineError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-inline';
        errorDiv.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5"/>
                <path d="M8 5V8M8 11H8.01" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            <span>${message}</span>
        `;
        return errorDiv;
    }

    /**
     * 인라인 경고 메시지 생성
     * @param {string} message - 경고 메시지
     * @returns {HTMLElement} 경고 요소
     */
    function createInlineWarning(message) {
        const warningDiv = document.createElement('div');
        warningDiv.className = 'warning-inline';
        warningDiv.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 1L15 14H1L8 1Z" stroke="currentColor" stroke-width="1.5" fill="none"/>
                <path d="M8 6V9M8 11H8.01" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            <span>${message}</span>
        `;
        return warningDiv;
    }

    /**
     * 인라인 성공 메시지 생성
     * @param {string} message - 성공 메시지
     * @returns {HTMLElement} 성공 요소
     */
    function createInlineSuccess(message) {
        const successDiv = document.createElement('div');
        successDiv.className = 'success-inline';
        successDiv.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5"/>
                <path d="M5 8L7 10L11 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>${message}</span>
        `;
        return successDiv;
    }

    /**
     * 에러 상태 컴포넌트 생성
     * @param {Object} options - 옵션
     * @param {string} options.title - 에러 제목
     * @param {string} options.message - 에러 메시지
     * @param {Function} options.onRetry - 재시도 콜백
     * @returns {HTMLElement} 에러 상태 요소
     */
    function createErrorState(options = {}) {
        const {
            title = '오류가 발생했습니다',
            message = '잠시 후 다시 시도해주세요.',
            onRetry = null
        } = options;

        const errorState = document.createElement('div');
        errorState.className = 'error-state';
        errorState.innerHTML = `
            <svg class="error-icon" viewBox="0 0 64 64" fill="none">
                <circle cx="32" cy="32" r="28" stroke="currentColor" stroke-width="3"/>
                <path d="M32 20V36M32 44H32.02" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
            </svg>
            <h3 class="error-title">${title}</h3>
            <p class="error-message">${message}</p>
            <div class="error-actions">
                ${onRetry ? '<button class="btn btn-primary" id="errorRetryBtn">다시 시도</button>' : ''}
                <button class="btn btn-secondary" onclick="location.reload()">페이지 새로고침</button>
            </div>
        `;

        if (onRetry) {
            const retryBtn = errorState.querySelector('#errorRetryBtn');
            if (retryBtn) {
                retryBtn.addEventListener('click', onRetry);
            }
        }

        return errorState;
    }

    /**
     * 빈 상태 컴포넌트 생성
     * @param {Object} options - 옵션
     * @param {string} options.message - 메시지
     * @param {string} options.icon - 아이콘 SVG (선택사항)
     * @returns {HTMLElement} 빈 상태 요소
     */
    function createEmptyState(options = {}) {
        const {
            message = '데이터가 없습니다',
            icon = null
        } = options;

        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';
        emptyState.innerHTML = `
            ${icon || `
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                    <circle cx="24" cy="24" r="20" stroke="currentColor" stroke-width="2" opacity="0.3"/>
                    <path d="M24 16V24M24 28H24.02" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.3"/>
                </svg>
            `}
            <p>${message}</p>
        `;
        return emptyState;
    }

    /**
     * 스켈레톤 로딩 생성
     * @param {Object} options - 옵션
     * @param {number} options.lines - 줄 수
     * @param {string} options.type - 타입 ('text' | 'card' | 'list')
     * @returns {HTMLElement} 스켈레톤 요소
     */
    function createSkeleton(options = {}) {
        const { lines = 3, type = 'text' } = options;

        const skeleton = document.createElement('div');
        skeleton.className = 'skeleton-container';

        if (type === 'text') {
            for (let i = 0; i < lines; i++) {
                const line = document.createElement('div');
                line.className = 'skeleton skeleton-text';
                line.style.width = i === lines - 1 ? '60%' : '100%';
                skeleton.appendChild(line);
            }
        } else if (type === 'card') {
            skeleton.innerHTML = `
                <div class="skeleton skeleton-rect" style="width: 100%; height: 120px; margin-bottom: 12px;"></div>
                <div class="skeleton skeleton-text" style="width: 70%;"></div>
                <div class="skeleton skeleton-text" style="width: 50%;"></div>
            `;
        } else if (type === 'list') {
            for (let i = 0; i < lines; i++) {
                skeleton.innerHTML += `
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                        <div class="skeleton skeleton-circle" style="width: 40px; height: 40px;"></div>
                        <div style="flex: 1;">
                            <div class="skeleton skeleton-text" style="width: 60%;"></div>
                            <div class="skeleton skeleton-text" style="width: 40%;"></div>
                        </div>
                    </div>
                `;
            }
        }

        return skeleton;
    }

    // 페이지 로드 시 초기화
    document.addEventListener('DOMContentLoaded', init);

    // CSS 애니메이션 추가 (slideOutRight)
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideOutRight {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);

    // Public API
    return {
        init,
        showLoading,
        hideLoading,
        setButtonLoading,
        showToast,
        createInlineError,
        createInlineWarning,
        createInlineSuccess,
        createErrorState,
        createEmptyState,
        createSkeleton
    };
})();

// 전역에서 접근 가능하도록 window에 노출
window.LoadingState = LoadingState;

// Expose Toolbar toast functions globally
window.setToastPosition = Toolbar.setToastPosition;
