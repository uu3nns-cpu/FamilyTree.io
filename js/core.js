// ============================================================================
// MODELS - Data structures for genogram
// ============================================================================

class Person {
    constructor(data = {}) {
        this.id = data.id || this.generateId();
        this.name = data.name || '';
        this.gender = data.gender || 'M';
        this.generation = typeof data.generation === 'number' ? data.generation : 0;
        this.side = data.side || 'both';
        this.isCT = data.isCT || false;
        this.isDeceased = data.isDeceased || false;
        this.birthYear = data.birthYear || null;
        this.deathYear = data.deathYear || null;
        this.birthOrder = this.parseBirthOrder(data.birthOrder);
        this.tags = data.tags || [];
        this.notes = data.notes || '';
        this.x = data.x || 0;
        this.y = data.y || 0;
    }

    generateId() {
        return `P_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    getAge() {
        if (!this.birthYear) return null;
        const endYear = this.isDeceased && this.deathYear ? this.deathYear : new Date().getFullYear();
        return endYear - this.birthYear;
    }

    getDisplayName() {
        return this.name || '이름 없음';
    }

    toJSON() {
        return {
            id: this.id, name: this.name, gender: this.gender, generation: this.generation,
            side: this.side, isCT: this.isCT, isDeceased: this.isDeceased,
            birthYear: this.birthYear, deathYear: this.deathYear, birthOrder: this.birthOrder,
            tags: [...this.tags], notes: this.notes, x: this.x, y: this.y
        };
    }

    static fromJSON(data) {
        return new Person(data);
    }

    parseBirthOrder(value) {
        if (typeof value === 'number' && Number.isFinite(value)) {
            return value;
        }
        if (typeof value === 'string') {
            const parsed = parseInt(value, 10);
            if (!Number.isNaN(parsed)) {
                return parsed;
            }
        }
        return 0;
    }
}

class Relationship {
    constructor(data = {}) {
        this.id = data.id || this.generateId();
        this.type = data.type || 'couple';
        this.from = data.from;
        this.to = data.to;
        this.subtype = data.subtype || this.getDefaultSubtype();
        this.label = data.label || '';
        this.notes = data.notes || '';
        this.parents = data.parents || [];
        this.children = data.children || [];
    }

    generateId() {
        return `R_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    getDefaultSubtype() {
        return this.type === 'couple' ? 'marriage' : (this.type === 'emotional' ? 'close' : '');
    }

    getLabel() {
        const labels = {
            marriage: '결혼', cohabiting: '동거', separated: '별거', divorced: '이혼', ex: '전 파트너',
            close: '친밀', distant: '소원', conflict: '갈등', cutoff: '단절',
            enmeshed: '밀착', abuse: '학대', dependency: '의존'
        };
        return labels[this.subtype] || '';
    }

    toJSON() {
        return {
            id: this.id, type: this.type, from: this.from, to: this.to,
            subtype: this.subtype, label: this.label, notes: this.notes,
            parents: [...this.parents], children: [...this.children]
        };
    }

    static fromJSON(data) {
        return new Relationship(data);
    }
}

class Template {
    constructor(name, config) {
        this.name = name;
        this.config = config;
    }

    generate() {
        const persons = [];
        const relationships = [];

        this.config.personSlots.forEach(slot => {
            if (slot.multiple) {
                return;
            }
            
            persons.push(new Person({
                id: slot.id,
                name: slot.defaultName || '',
                generation: slot.generation,
                side: slot.side,
                isCT: slot.id === 'P_CT',
                gender: this.inferGender(slot.id),
                birthOrder: slot.birthOrder || 0
            }));
        });

        this.config.coupleSlots.forEach(slot => {
            relationships.push(new Relationship({
                id: slot.id,
                type: 'couple',
                from: slot.from,
                to: slot.to,
                subtype: slot.defaultType || 'marriage'
            }));
        });

        this.config.parentChildSlots.forEach(slot => {
            relationships.push(new Relationship({
                type: 'parent-child',
                parents: slot.parents,
                children: Array.isArray(slot.child) ? slot.child : [slot.child]
            }));
        });

        return { persons, relationships };
    }

    inferGender(id) {
        if (id.includes('_F') || id.includes('GF') || id === 'P_F') return 'M';
        if (id.includes('_M') || id.includes('GM') || id === 'P_M') return 'F';
        return 'M';
    }
}

// ============================================================================
// TEMPLATE DEFINITIONS - 7 Templates for Testing
// ============================================================================

const TEMPLATES = {
    // Template 0: Blank Canvas (빈 캔버스)
    'blank_canvas': new Template('빈 캔버스', {
        generations: [0],
        personSlots: [
            { id: 'P_CT', generation: 0, side: 'both', required: true, defaultName: '내담자(CT)', birthOrder: 1 }
        ],
        coupleSlots: [],
        parentChildSlots: []
    }),

    // Template 1: 2세대 1가정 - 미니멀
    '2gen_1family_minimal': new Template('2세대 1가정 - 미니멀', {
        generations: [-1, 0],
        personSlots: [
            { id: 'P_CT', generation: 0, side: 'both', required: true, defaultName: '내담자(CT)', birthOrder: 1 },
            { id: 'P_F', generation: -1, side: 'paternal', defaultName: '아버지' },
            { id: 'P_M', generation: -1, side: 'maternal', defaultName: '어머니' }
        ],
        coupleSlots: [
            { id: 'R_P_FM', from: 'P_F', to: 'P_M', defaultType: 'marriage' }
        ],
        parentChildSlots: [
            { parents: ['P_F', 'P_M'], child: 'P_CT' }
        ]
    }),

    // Template 2: 2세대 1가정 - 형제 많음
    '2gen_1family_siblings': new Template('2세대 1가정 - 형제 많음', {
        generations: [-1, 0],
        personSlots: [
            { id: 'P_F', generation: -1, side: 'paternal', defaultName: '아버지' },
            { id: 'P_M', generation: -1, side: 'maternal', defaultName: '어머니' },
            { id: 'P_SIB1', generation: 0, side: 'both', defaultName: '첫째', birthOrder: 1 },
            { id: 'P_CT', generation: 0, side: 'both', required: true, defaultName: '내담자(CT)', birthOrder: 2 },
            { id: 'P_SIB3', generation: 0, side: 'both', defaultName: '셋째', birthOrder: 3 },
            { id: 'P_SIB4', generation: 0, side: 'both', defaultName: '넷째', birthOrder: 4 }
        ],
        coupleSlots: [
            { id: 'R_P_FM', from: 'P_F', to: 'P_M', defaultType: 'marriage' }
        ],
        parentChildSlots: [
            { parents: ['P_F', 'P_M'], child: ['P_SIB1', 'P_CT', 'P_SIB3', 'P_SIB4'] }
        ]
    }),

    // Template 3: 3세대 1가정 - 표준
    '3gen_1family_standard': new Template('3세대 1가정 - 표준', {
        generations: [-1, 0, 1],
        personSlots: [
            { id: 'P_F', generation: -1, side: 'paternal', defaultName: '아버지' },
            { id: 'P_M', generation: -1, side: 'maternal', defaultName: '어머니' },
            { id: 'P_CT', generation: 0, side: 'both', required: true, defaultName: '내담자(CT)', birthOrder: 1 },
            { id: 'P_SP', generation: 0, side: 'both', defaultName: '배우자', birthOrder: 2 },
            { id: 'P_CH1', generation: 1, side: 'both', defaultName: '첫째', birthOrder: 1 },
            { id: 'P_CH2', generation: 1, side: 'both', defaultName: '둘째', birthOrder: 2 },
            { id: 'P_CH3', generation: 1, side: 'both', defaultName: '셋째', birthOrder: 3 }
        ],
        coupleSlots: [
            { id: 'R_P_FM', from: 'P_F', to: 'P_M', defaultType: 'marriage' },
            { id: 'R_P_CT_SP', from: 'P_CT', to: 'P_SP', defaultType: 'marriage' }
        ],
        parentChildSlots: [
            { parents: ['P_F', 'P_M'], child: 'P_CT' },
            { parents: ['P_CT', 'P_SP'], child: ['P_CH1', 'P_CH2', 'P_CH3'] }
        ]
    }),

    // Template 4: 3세대 2가정 - 친가+외가
    '3gen_2family': new Template('3세대 2가정 - 친가+외가', {
        generations: [-2, -1, 0],
        personSlots: [
            // Grandparents
            { id: 'P_PGF', generation: -2, side: 'paternal', defaultName: '할아버지' },
            { id: 'P_PGM', generation: -2, side: 'paternal', defaultName: '할머니' },
            { id: 'P_MGF', generation: -2, side: 'maternal', defaultName: '외할아버지' },
            { id: 'P_MGM', generation: -2, side: 'maternal', defaultName: '외할머니' },
            // Parents
            { id: 'P_F', generation: -1, side: 'paternal', defaultName: '아버지' },
            { id: 'P_M', generation: -1, side: 'maternal', defaultName: '어머니' },
            // CT generation
            { id: 'P_CT', generation: 0, side: 'both', required: true, defaultName: '내담자(CT)', birthOrder: 1 }
        ],
        coupleSlots: [
            { id: 'R_P_PG', from: 'P_PGF', to: 'P_PGM', defaultType: 'marriage' },
            { id: 'R_P_MG', from: 'P_MGF', to: 'P_MGM', defaultType: 'marriage' },
            { id: 'R_P_FM', from: 'P_F', to: 'P_M', defaultType: 'marriage' }
        ],
        parentChildSlots: [
            { parents: ['P_PGF', 'P_PGM'], child: 'P_F' },
            { parents: ['P_MGF', 'P_MGM'], child: 'P_M' },
            { parents: ['P_F', 'P_M'], child: 'P_CT' }
        ]
    }),

    // Template 5: 4세대 2가정 - 최대 확장
    '4gen_2family_max': new Template('4세대 2가정 - 최대 확장', {
        generations: [-3, -2, -1, 0],
        personSlots: [
            // Great-grandparents (both sides)
            { id: 'P_PPGF', generation: -3, side: 'paternal', defaultName: '증조할아버지' },
            { id: 'P_PPGM', generation: -3, side: 'paternal', defaultName: '증조할머니' },
            { id: 'P_MMGF', generation: -3, side: 'maternal', defaultName: '외증조할아버지' },
            { id: 'P_MMGM', generation: -3, side: 'maternal', defaultName: '외증조할머니' },
            // Grandparents
            { id: 'P_PGF', generation: -2, side: 'paternal', defaultName: '할아버지' },
            { id: 'P_PGM', generation: -2, side: 'paternal', defaultName: '할머니' },
            { id: 'P_MGF', generation: -2, side: 'maternal', defaultName: '외할아버지' },
            { id: 'P_MGM', generation: -2, side: 'maternal', defaultName: '외할머니' },
            // Parents
            { id: 'P_F', generation: -1, side: 'paternal', defaultName: '아버지' },
            { id: 'P_M', generation: -1, side: 'maternal', defaultName: '어머니' },
            // CT
            { id: 'P_CT', generation: 0, side: 'both', required: true, defaultName: '내담자(CT)', birthOrder: 1 }
        ],
        coupleSlots: [
            { id: 'R_PPG', from: 'P_PPGF', to: 'P_PPGM', defaultType: 'marriage' },
            { id: 'R_MMG', from: 'P_MMGF', to: 'P_MMGM', defaultType: 'marriage' },
            { id: 'R_P_PG', from: 'P_PGF', to: 'P_PGM', defaultType: 'marriage' },
            { id: 'R_P_MG', from: 'P_MGF', to: 'P_MGM', defaultType: 'marriage' },
            { id: 'R_P_FM', from: 'P_F', to: 'P_M', defaultType: 'marriage' }
        ],
        parentChildSlots: [
            { parents: ['P_PPGF', 'P_PPGM'], child: 'P_PGF' },
            { parents: ['P_MMGF', 'P_MMGM'], child: 'P_MGF' },
            { parents: ['P_PGF', 'P_PGM'], child: 'P_F' },
            { parents: ['P_MGF', 'P_MGM'], child: 'P_M' },
            { parents: ['P_F', 'P_M'], child: 'P_CT' }
        ]
    }),

    // Legacy templates - keep old IDs for backward compatibility
    'ct_only': new Template('내담자만 (레거시)', {
        generations: [0],
        personSlots: [
            { id: 'P_CT', generation: 0, side: 'both', required: true, defaultName: '내담자(CT)', birthOrder: 1 }
        ],
        coupleSlots: [],
        parentChildSlots: []
    }),

    // Legacy templates (keep for backward compatibility)
    '2family_3gen': new Template('2가족 3세대', {
        generations: [-2, -1, 0],
        personSlots: [
            { id: 'P_CT', generation: 0, side: 'both', required: true, defaultName: '내담자(CT)', birthOrder: 1 },
            { id: 'P_CT_SIB', generation: 0, side: 'both', multiple: true },
            { id: 'P_F', generation: -1, side: 'paternal', defaultName: '아버지' },
            { id: 'P_M', generation: -1, side: 'maternal', defaultName: '어머니' },
            { id: 'P_PGF', generation: -2, side: 'paternal', defaultName: '할아버지' },
            { id: 'P_PGM', generation: -2, side: 'paternal', defaultName: '할머니' },
            { id: 'P_MGF', generation: -2, side: 'maternal', defaultName: '외할아버지' },
            { id: 'P_MGM', generation: -2, side: 'maternal', defaultName: '외할머니' }
        ],
        coupleSlots: [
            { id: 'R_P_FM', from: 'P_F', to: 'P_M', defaultType: 'marriage' },
            { id: 'R_P_PG', from: 'P_PGF', to: 'P_PGM', defaultType: 'marriage' },
            { id: 'R_P_MG', from: 'P_MGF', to: 'P_MGM', defaultType: 'marriage' }
        ],
        parentChildSlots: [
            { parents: ['P_PGF', 'P_PGM'], child: 'P_F' },
            { parents: ['P_MGF', 'P_MGM'], child: 'P_M' },
            { parents: ['P_F', 'P_M'], child: 'P_CT' }
        ]
    }),

    '1family_3gen': new Template('1가족 3세대', {
        generations: [-2, -1, 0],
        personSlots: [
            { id: 'P_CT', generation: 0, side: 'both', required: true, defaultName: '내담자(CT)', birthOrder: 1 },
            { id: 'P_CT_SIB', generation: 0, side: 'both', multiple: true },
            { id: 'P_F', generation: -1, side: 'paternal', defaultName: '아버지' },
            { id: 'P_M', generation: -1, side: 'maternal', defaultName: '어머니' },
            { id: 'P_PGF', generation: -2, side: 'paternal', defaultName: '할아버지' },
            { id: 'P_PGM', generation: -2, side: 'paternal', defaultName: '할머니' }
        ],
        coupleSlots: [
            { id: 'R_P_FM', from: 'P_F', to: 'P_M', defaultType: 'marriage' },
            { id: 'R_P_PG', from: 'P_PGF', to: 'P_PGM', defaultType: 'marriage' }
        ],
        parentChildSlots: [
            { parents: ['P_PGF', 'P_PGM'], child: 'P_F' },
            { parents: ['P_F', 'P_M'], child: 'P_CT' }
        ]
    })
};

function getTemplate(name) {
    return TEMPLATES[name];
}

// Script loading confirmation
if (window.DEBUG_LOADING) {
    console.log('✓ models.js loaded (Person, Relationship classes)');
}
// ============================================================================
// APP STATE - Central state management
// ============================================================================

class AppState {
    constructor() {
        // Data
        this.persons = [];
        this.relationships = [];
        
        // Selection
        this.selectedElement = null;
        
        // History (Undo/Redo)
        this.history = [];
        this.historyIndex = -1;
        this.maxHistory = 50;
        
        // View settings
        this.gridModes = ['solid', 'dashed', 'none'];
        this.gridModeIndex = 0;
        this.gridMode = this.gridModes[this.gridModeIndex];
        this.isMagnetEnabled = true;
        this.showNames = true;
        this.showAges = true;
        
        // Stroke widths
        this.shapeStrokeWidth = 2;
        this.relationshipStrokeWidth = 2;
        this.emotionalStrokeWidth = 1.5;
        
        // Emotional relationship
        this.selectedEmotionalSubtype = 'none';
    }

    // Persons
    addPerson(person) {
        this.persons.push(person);
    }

    removePerson(personId) {
        this.persons = this.persons.filter(p => p.id !== personId);
    }

    findPerson(personId) {
        return this.persons.find(p => p.id === personId);
    }

    // Relationships
    addRelationship(relationship) {
        this.relationships.push(relationship);
    }

    removeRelationship(relationshipId) {
        this.relationships = this.relationships.filter(r => r.id !== relationshipId);
    }

    findRelationship(relationshipId) {
        return this.relationships.find(r => r.id === relationshipId);
    }

    // History
    saveState() {
        const state = {
            persons: this.persons.map(p => p.toJSON()),
            relationships: this.relationships.map(r => r.toJSON())
        };

        // Remove states after current index
        this.history = this.history.slice(0, this.historyIndex + 1);

        // Add new state
        this.history.push(JSON.stringify(state));
        this.historyIndex++;

        // Limit history size
        if (this.history.length > this.maxHistory) {
            this.history.shift();
            this.historyIndex--;
        }
        
        // 변경사항 표시
        if (window.genogramApp) {
            window.genogramApp.markAsChanged();
        }
    }

    loadState(stateJson) {
        const state = JSON.parse(stateJson);
        this.persons = state.persons.map(p => Person.fromJSON(p));
        this.relationships = state.relationships.map(r => Relationship.fromJSON(r));
    }

    canUndo() {
        return this.historyIndex > 0;
    }

    canRedo() {
        return this.historyIndex < this.history.length - 1;
    }

    undo() {
        if (this.canUndo()) {
            this.historyIndex--;
            this.loadState(this.history[this.historyIndex]);
            return true;
        }
        return false;
    }

    redo() {
        if (this.canRedo()) {
            this.historyIndex++;
            this.loadState(this.history[this.historyIndex]);
            return true;
        }
        return false;
    }

    // Grid
    toggleGridMode() {
        this.gridModeIndex = (this.gridModeIndex + 1) % this.gridModes.length;
        this.gridMode = this.gridModes[this.gridModeIndex];
        return this.gridMode;
    }

    getGridModeLabel(mode = this.gridMode) {
        const labels = {
            solid: '실선',
            dashed: '점선',
            none: '없음'
        };
        return labels[mode] || '실선';
    }

    // Magnet
    setMagnetEnabled(enabled) {
        this.isMagnetEnabled = enabled;
    }

    // Stroke widths
    setStrokeWidths({ shape, relationship, emotional }) {
        if (shape !== undefined) this.shapeStrokeWidth = shape;
        if (relationship !== undefined) this.relationshipStrokeWidth = relationship;
        if (emotional !== undefined) this.emotionalStrokeWidth = emotional;
    }

    getStrokeWidths() {
        return {
            shape: this.shapeStrokeWidth,
            relationship: this.relationshipStrokeWidth,
            emotional: this.emotionalStrokeWidth
        };
    }

    // Label visibility
    setLabelVisibility({ showNames, showAges }) {
        if (showNames !== undefined) this.showNames = showNames;
        if (showAges !== undefined) this.showAges = showAges;
    }

    getLabelVisibility() {
        return {
            showNames: this.showNames,
            showAges: this.showAges
        };
    }

    // Emotional relationship
    setEmotionalSubtype(subtype) {
        this.selectedEmotionalSubtype = subtype;
    }

    // Selection
    setSelectedElement(element) {
        this.selectedElement = element;
    }

    clearSelection() {
        this.selectedElement = null;
    }

    // Data export
    toJSON() {
        return {
            version: '1.3',
            persons: this.persons.map(p => p.toJSON()),
            relationships: this.relationships.map(r => r.toJSON()),
            metadata: {
                created: new Date().toISOString(),
                appVersion: '1.3'
            }
        };
    }

    fromJSON(data) {
        this.persons = data.persons.map(p => Person.fromJSON(p));
        this.relationships = data.relationships.map(r => Relationship.fromJSON(r));
    }
}
// ============================================================================
// SELECTION MANAGER - Single element selection management
// ============================================================================

class SelectionManager {
    constructor(app) {
        this.app = app;
    }

    // Select person
    selectPerson(person) {
        // Check for emotional relationship connection mode
        if (this.app.state.selectedElement && 
            this.app.state.selectedElement.type === 'person' && 
            this.app.state.selectedElement.data.id !== person.id &&
            this.app.state.selectedEmotionalSubtype !== 'none') {
            
            // Create emotional relationship
            const emotionLabel = this.app.emotionalOps.getEmotionalLabel(
                this.app.state.selectedEmotionalSubtype
            );
            const newRelId = this.app.emotionalOps.createEmotionalRelationship(
                this.app.state.selectedElement.data, 
                person, 
                this.app.state.selectedEmotionalSubtype
            );
            
            // Reset to default
            this.app.emotionalOps.setEmotionalSubtype('none');
            
            this.deselectAll();
            this.app.toolbar.showToast(`감정선 ("${emotionLabel}") 이 연결되었습니다`, 'success');
            
            // Render with animation
            this.app.render(newRelId);
            return;
        }

        // Regular selection
        this.deselectAll();
        this.app.state.setSelectedElement({ type: 'person', data: person });
        
        const node = document.querySelector(`[data-id="${person.id}"]`);
        if (node) {
            node.classList.add('selected');
            
            // Add pulse animation for emotional connection mode
            if (this.app.state.selectedEmotionalSubtype !== 'none') {
                node.classList.add('emotional-first-selected');
                
                // Mark other persons as hoverable
                document.querySelectorAll('.genogram-node').forEach(n => {
                    if (n.dataset.id !== person.id) {
                        n.classList.add('emotional-hoverable');
                    }
                });
            }
        }

        this.app.propertiesPanel.showPersonProperties(person);
        
        // Update status message
        this.updateEmotionalStatus(person);
    }

    // Select relationship
    selectRelationship(relationship) {
        this.deselectAll();
        this.app.state.setSelectedElement({ type: 'relationship', data: relationship });
        
        const group = document.querySelector(`[data-id="${relationship.id}"]`);
        if (group) {
            const line = group.querySelector('.relationship-line, .emotional-line, .parent-child-line');
            if (line) {
                line.classList.add('selected');
            }
        }

        this.app.propertiesPanel.showRelationshipProperties(relationship);
    }

    // Deselect all
    deselectAll() {
        document.querySelectorAll('.selected').forEach(el => {
            el.classList.remove('selected');
        });
        
        // Remove emotional connection mode classes
        document.querySelectorAll('.emotional-first-selected, .emotional-hoverable').forEach(el => {
            el.classList.remove('emotional-first-selected', 'emotional-hoverable');
        });
        
        this.app.state.clearSelection();
        this.app.propertiesPanel.showEmpty();
        
        // Reset status message
        this.updateEmotionalStatus(null);
    }

    // Update emotional status message
    updateEmotionalStatus(person) {
        if (!this.app.toolbar || typeof this.app.toolbar.updateEmotionStatus !== 'function') {
            return;
        }

        const subtype = this.app.state.selectedEmotionalSubtype;

        if (subtype === 'none') {
            if (person) {
                this.app.toolbar.updateEmotionStatus(`"${person.getDisplayName()}" 선택됨`, {
                    isActive: false,
                    isWaiting: false,
                    category: null
                });
            } else {
                this.app.toolbar.updateEmotionStatus(
                    '감정선 유형을 선택한 후 인물을 2명 선택하면 연결됩니다', {
                    isActive: false,
                    isWaiting: false,
                    category: null
                });
            }
        } else {
            const category = this.app.toolbar.getEmotionCategory(subtype);
            const label = this.app.emotionalOps.getEmotionalLabel(subtype);
            
            if (person) {
                this.app.toolbar.updateEmotionStatus(
                    `"${person.getDisplayName()}" 선택됨 - 다른 인물을 선택하면 "${label}" 감정선 연결`,
                    {
                        isActive: false,
                        isWaiting: true,
                        category: category
                    }
                );
            } else {
                this.app.toolbar.updateEmotionStatus(
                    `현재 감정선: "${label}" - 인물 2명을 선택하면 연결됩니다`,
                    {
                        isActive: true,
                        isWaiting: false,
                        category: category
                    }
                );
            }
        }
    }

    // Get selected person
    getSelectedPerson() {
        if (this.app.state.selectedElement && this.app.state.selectedElement.type === 'person') {
            return this.app.state.selectedElement.data;
        }
        return null;
    }

    // Get selected relationship
    getSelectedRelationship() {
        if (this.app.state.selectedElement && this.app.state.selectedElement.type === 'relationship') {
            return this.app.state.selectedElement.data;
        }
        return null;
    }
}
