// ============================================================================
// PERSON OPERATIONS - Person management operations
// ============================================================================

class PersonOperations {
    constructor(app) {
        this.app = app;
    }

    // Add new person
    addPerson() {
        const person = new Person({
            name: '새 인물',
            generation: 0,
            side: 'both',
            birthOrder: 999,
            x: 500,
            y: 300
        });

        this.app.state.addPerson(person);
        this.app.render();
        this.app.state.saveState();
        this.app.selectionManager.selectPerson(person);

        this.app.toolbar.showToast('새 인물이 추가되었습니다', 'success');
    }

    // Add sibling
    addSibling(personId = null) {
        let selectedPerson;
        
        if (personId) {
            selectedPerson = this.app.state.findPerson(personId);
            if (!selectedPerson) {
                this.app.toolbar.showToast('인물을 찾을 수 없습니다', 'warning');
                return;
            }
        } else {
            selectedPerson = this.app.selectionManager.getSelectedPerson();
            if (!selectedPerson) {
                this.app.toolbar.showToast('형제자매를 추가할 인물을 먼저 선택해주세요', 'warning');
                return;
            }
        }

        // Find siblings
        const siblings = this.app.state.persons.filter(p => 
            p.generation === selectedPerson.generation && 
            p.side === selectedPerson.side
        );

        const maxBirthOrder = Math.max(...siblings.map(s => s.birthOrder), 0);

        // Determine default name
        let defaultName = '형제/자매';
        if (selectedPerson.generation === -1) {
            if (selectedPerson.side === 'paternal') {
                defaultName = '고모/삼촌';
            } else if (selectedPerson.side === 'maternal') {
                defaultName = '이모/외삼촌';
            }
        } else if (selectedPerson.generation === -2) {
            defaultName = '할아버지/할머니';
        }

        // Create sibling
        const sibling = new Person({
            name: defaultName,
            generation: selectedPerson.generation,
            side: selectedPerson.side,
            birthOrder: maxBirthOrder + 1,
            gender: 'M',
            x: selectedPerson.x + 120,
            y: selectedPerson.y
        });

        this.app.state.addPerson(sibling);

        // Add to parent-child relationship
        const parentChildRel = this.app.state.relationships.find(r => 
            r.type === 'parent-child' && r.children.includes(selectedPerson.id)
        );

        if (parentChildRel) {
            parentChildRel.children.push(sibling.id);
        }

        this.app.layout.layout(this.app.state.persons, this.app.state.relationships);
        this.app.render();
        this.app.state.saveState();
        this.app.selectionManager.selectPerson(sibling);

        this.app.toolbar.showToast(`${defaultName}이(가) 추가되었습니다 (막내로 추가됨)`, 'success');
    }

    // Add paternal sibling (father's siblings)
    addPaternalSibling() {
        const father = this.app.state.persons.find(
            p => p.id === 'P_F' || (p.generation === -1 && p.side === 'paternal')
        );
        
        if (!father) {
            this.app.toolbar.showToast('아버지를 먼저 추가해주세요', 'warning');
            return;
        }

        const paternalSiblings = this.app.state.persons.filter(p => 
            p.generation === -1 && p.side === 'paternal'
        );

        const maxBirthOrder = Math.max(...paternalSiblings.map(s => s.birthOrder), 0);

        const sibling = new Person({
            name: '고모/삼촌',
            generation: -1,
            side: 'paternal',
            birthOrder: maxBirthOrder + 1,
            gender: 'M',
            x: father.x + 120,
            y: father.y
        });

        this.app.state.addPerson(sibling);

        const parentChildRel = this.app.state.relationships.find(r => 
            r.type === 'parent-child' && r.children.includes(father.id)
        );

        if (parentChildRel) {
            parentChildRel.children.push(sibling.id);
        }

        this.app.layout.layout(this.app.state.persons, this.app.state.relationships);
        this.app.render();
        this.app.state.saveState();
        this.app.selectionManager.selectPerson(sibling);

        this.app.toolbar.showToast('친가 형제자매(고모/삼촌)가 추가되었습니다', 'success');
    }

    // Add maternal sibling (mother's siblings)
    addMaternalSibling() {
        const mother = this.app.state.persons.find(
            p => p.id === 'P_M' || (p.generation === -1 && p.side === 'maternal')
        );
        
        if (!mother) {
            this.app.toolbar.showToast('어머니를 먼저 추가해주세요', 'warning');
            return;
        }

        const maternalSiblings = this.app.state.persons.filter(p => 
            p.generation === -1 && p.side === 'maternal'
        );

        const maxBirthOrder = Math.max(...maternalSiblings.map(s => s.birthOrder), 0);

        const sibling = new Person({
            name: '이모/외삼촌',
            generation: -1,
            side: 'maternal',
            birthOrder: maxBirthOrder + 1,
            gender: 'F',
            x: mother.x + 120,
            y: mother.y
        });

        this.app.state.addPerson(sibling);

        const parentChildRel = this.app.state.relationships.find(r => 
            r.type === 'parent-child' && r.children.includes(mother.id)
        );

        if (parentChildRel) {
            parentChildRel.children.push(sibling.id);
        }

        this.app.layout.layout(this.app.state.persons, this.app.state.relationships);
        this.app.render();
        this.app.state.saveState();
        this.app.selectionManager.selectPerson(sibling);

        this.app.toolbar.showToast('외가 형제자매(이모/외삼촌)가 추가되었습니다', 'success');
    }

    // Add child
    addChild(parentId, gender) {
        const parent = this.app.state.findPerson(parentId);
        if (!parent) {
            this.app.toolbar.showToast('부모를 찾을 수 없습니다', 'error');
            return;
        }

        let parentChildRel = this.app.state.relationships.find(r => 
            r.type === 'parent-child' && r.parents.includes(parent.id)
        );

        const existingChildren = parentChildRel
            ? parentChildRel.children
                .map(childId => this.app.state.findPerson(childId))
                .filter(Boolean)
            : [];

        const birthOrder = existingChildren.reduce((max, child) => {
            return Math.max(max, child.birthOrder || 0);
        }, 0) + 1;

        // Determine name and gender code
        let childName, genderCode;
        if (gender === 'male') {
            childName = '아들';
            genderCode = 'M';
        } else if (gender === 'female') {
            childName = '딸';
            genderCode = 'F';
        } else {
            childName = '자녀';
            genderCode = 'U';
        }

        const child = new Person({
            name: childName,
            generation: parent.generation + 1,
            side: parent.side,
            birthOrder,
            gender: genderCode,
            x: parent.x,
            y: parent.y + 120
        });

        this.app.state.addPerson(child);

        if (parentChildRel) {
            parentChildRel.children.push(child.id);
        } else {
            parentChildRel = new Relationship({
                type: 'parent-child',
                parents: [parent.id],
                children: [child.id]
            });
            this.app.state.addRelationship(parentChildRel);
        }

        this.app.layout.layout(this.app.state.persons, this.app.state.relationships);
        this.app.render();
        this.app.state.saveState();
        this.app.selectionManager.selectPerson(child);

        this.app.toolbar.showToast(`${childName}이(가) 추가되었습니다`, 'success');
    }

    // Add son
    addSon(personId = null) {
        let parent;
        if (personId) {
            parent = this.app.state.findPerson(personId);
        } else {
            parent = this.app.selectionManager.getSelectedPerson();
        }
        
        if (!parent) {
            this.app.toolbar.showToast('자녀를 추가할 부모를 먼저 선택해주세요', 'warning');
            return;
        }
        this.addChild(parent.id, 'male');
    }

    // Add daughter
    addDaughter(personId = null) {
        let parent;
        if (personId) {
            parent = this.app.state.findPerson(personId);
        } else {
            parent = this.app.selectionManager.getSelectedPerson();
        }
        
        if (!parent) {
            this.app.toolbar.showToast('자녀를 추가할 부모를 먼저 선택해주세요', 'warning');
            return;
        }
        this.addChild(parent.id, 'female');
    }

    // Add child with unknown gender
    addChildUnknown(personId = null) {
        let parent;
        if (personId) {
            parent = this.app.state.findPerson(personId);
        } else {
            parent = this.app.selectionManager.getSelectedPerson();
        }
        
        if (!parent) {
            this.app.toolbar.showToast('자녀를 추가할 부모를 먼저 선택해주세요', 'warning');
            return;
        }
        this.addChild(parent.id, 'unknown');
    }

    // Add brother
    addBrother(personId = null) {
        this.addSiblingWithGender(personId, 'M');
    }

    // Add sister
    addSister(personId = null) {
        this.addSiblingWithGender(personId, 'F');
    }

    // Add sibling with unknown gender
    addSiblingUnknown(personId = null) {
        this.addSiblingWithGender(personId, 'U');
    }

    // Add sibling with specific gender
    addSiblingWithGender(personId, gender) {
        let selectedPerson;
        
        if (personId) {
            selectedPerson = this.app.state.findPerson(personId);
            if (!selectedPerson) {
                this.app.toolbar.showToast('인물을 찾을 수 없습니다', 'warning');
                return;
            }
        } else {
            selectedPerson = this.app.selectionManager.getSelectedPerson();
            if (!selectedPerson) {
                this.app.toolbar.showToast('형제자매를 추가할 인물을 먼저 선택해주세요', 'warning');
                return;
            }
        }

        // Find siblings
        const siblings = this.app.state.persons.filter(p => 
            p.generation === selectedPerson.generation && 
            p.side === selectedPerson.side
        );

        const maxBirthOrder = Math.max(...siblings.map(s => s.birthOrder), 0);

        // Determine default name based on gender
        let defaultName;
        if (gender === 'M') {
            defaultName = '남자형제';
        } else if (gender === 'F') {
            defaultName = '여자형제';
        } else {
            defaultName = '형제자매';
        }

        // Create sibling
        const sibling = new Person({
            name: defaultName,
            generation: selectedPerson.generation,
            side: selectedPerson.side,
            birthOrder: maxBirthOrder + 1,
            gender: gender,
            x: selectedPerson.x + 120,
            y: selectedPerson.y
        });

        this.app.state.addPerson(sibling);

        // Add to parent-child relationship
        const parentChildRel = this.app.state.relationships.find(r => 
            r.type === 'parent-child' && r.children.includes(selectedPerson.id)
        );

        if (parentChildRel) {
            parentChildRel.children.push(sibling.id);
        }

        this.app.layout.layout(this.app.state.persons, this.app.state.relationships);
        this.app.render();
        this.app.state.saveState();
        this.app.selectionManager.selectPerson(sibling);

        this.app.toolbar.showToast(`${defaultName}이(가) 추가되었습니다`, 'success');
    }

    // Add father
    addFather(personId = null) {
        this.addParent(personId, 'M');
    }

    // Add mother
    addMother(personId = null) {
        this.addParent(personId, 'F');
    }

    // Add parent
    addParent(personId, gender) {
        let child;
        
        if (personId) {
            child = this.app.state.findPerson(personId);
        } else {
            child = this.app.selectionManager.getSelectedPerson();
        }
        
        if (!child) {
            this.app.toolbar.showToast('부모를 추가할 자녀를 먼저 선택해주세요', 'warning');
            return;
        }

        // Check if parent of this gender already exists
        const existingParentRel = this.app.state.relationships.find(r => 
            r.type === 'parent-child' && r.children.includes(child.id)
        );

        if (existingParentRel) {
            const existingParents = existingParentRel.parents
                .map(pid => this.app.state.findPerson(pid))
                .filter(Boolean);
            
            const sameGenderParent = existingParents.find(p => p.gender === gender);
            if (sameGenderParent) {
                const parentName = gender === 'M' ? '아버지' : '어머니';
                this.app.toolbar.showToast(`이미 ${parentName}가 존재합니다`, 'warning');
                return;
            }
        }

        const parentName = gender === 'M' ? '아버지' : '어머니';
        const parentSide = gender === 'M' ? 'paternal' : 'maternal';

        const parent = new Person({
            name: parentName,
            generation: child.generation - 1,
            side: parentSide,
            gender: gender,
            x: child.x + (gender === 'M' ? -90 : 90),
            y: child.y - 180
        });

        this.app.state.addPerson(parent);

        // Add or update parent-child relationship
        if (existingParentRel) {
            existingParentRel.parents.push(parent.id);
            
            // If now we have 2 parents, create couple relationship
            if (existingParentRel.parents.length === 2) {
                const [parent1Id, parent2Id] = existingParentRel.parents;
                const coupleRel = new Relationship({
                    type: 'couple',
                    from: parent1Id,
                    to: parent2Id,
                    subtype: 'marriage'
                });
                this.app.state.addRelationship(coupleRel);
            }
        } else {
            const parentChildRel = new Relationship({
                type: 'parent-child',
                parents: [parent.id],
                children: [child.id]
            });
            this.app.state.addRelationship(parentChildRel);
        }

        this.app.layout.layout(this.app.state.persons, this.app.state.relationships);
        this.app.render();
        this.app.state.saveState();
        this.app.selectionManager.selectPerson(parent);

        this.app.toolbar.showToast(`${parentName}이(가) 추가되었습니다`, 'success');
    }

    // Delete person
    deletePerson(personId) {
        this.app.state.removePerson(personId);

        // Remove related relationships
        this.app.state.relationships = this.app.state.relationships.filter(r => {
            if (r.type === 'couple') {
                return r.from !== personId && r.to !== personId;
            } else if (r.type === 'parent-child') {
                r.parents = r.parents.filter(id => id !== personId);
                r.children = r.children.filter(id => id !== personId);
                return r.parents.length > 0 && r.children.length > 0;
            } else if (r.type === 'emotional') {
                return r.from !== personId && r.to !== personId;
            }
            return true;
        });

        this.app.render();
        this.app.state.saveState();
        this.app.toolbar.showToast('인물이 삭제되었습니다', 'success');
    }

    // Delete selected person
    deleteSelected() {
        const person = this.app.selectionManager.getSelectedPerson();
        if (!person) {
            this.app.toolbar.showToast('삭제할 요소를 선택하세요', 'warning');
            return;
        }

        if (confirm(`${person.getDisplayName()}을(를) 삭제하시겠습니까?`)) {
            this.deletePerson(person.id);
            this.app.selectionManager.deselectAll();
        }
    }

    // Copy person
    copyPerson(person) {
        this.copiedPerson = person.toJSON();
        this.app.toolbar.showToast(`"${person.getDisplayName()}"이(가) 복사되었습니다`, 'success');
    }

    // Add spouse
    addSpouse(personId = null) {
        let person;
        
        if (personId) {
            person = this.app.state.findPerson(personId);
        } else {
            person = this.app.selectionManager.getSelectedPerson();
        }
        
        if (!person) {
            this.app.toolbar.showToast('배우자를 추가할 인물을 먼저 선택해주세요', 'warning');
            return;
        }

        // Determine spouse gender (opposite of person's gender)
        let spouseGender;
        let spouseName;
        
        if (person.gender === 'M') {
            spouseGender = 'F';
            spouseName = '아내';
        } else if (person.gender === 'F') {
            spouseGender = 'M';
            spouseName = '남편';
        } else {
            // 성별이 미상인 경우 사용자에게 선택하게 함
            const genderChoice = confirm('배우자의 성별을 선택하세요.\n\n확인: 남성\n취소: 여성');
            if (genderChoice) {
                spouseGender = 'M';
                spouseName = '남편';
            } else {
                spouseGender = 'F';
                spouseName = '아내';
            }
        }

        // Find existing spouses to position new spouse appropriately
        const existingSpouses = this.app.state.relationships
            .filter(r => r.type === 'couple' && (r.from === person.id || r.to === person.id))
            .map(r => {
                const spouseId = r.from === person.id ? r.to : r.from;
                return this.app.state.findPerson(spouseId);
            })
            .filter(Boolean);

        // Calculate position for new spouse
        let spouseX, spouseY;
        if (existingSpouses.length === 0) {
            // First spouse - place to the right
            spouseX = person.x + 100;
            spouseY = person.y;
        } else {
            // Additional spouse - place further to the right
            const rightmostSpouse = existingSpouses.reduce((max, s) => 
                s.x > max.x ? s : max, existingSpouses[0]
            );
            spouseX = rightmostSpouse.x + 150;
            spouseY = person.y;
        }

        // Determine spouse side (opposite or 'both' for additional spouses)
        let spouseSide;
        if (existingSpouses.length === 0) {
            // First spouse
            if (person.side === 'paternal') {
                spouseSide = 'maternal';
            } else if (person.side === 'maternal') {
                spouseSide = 'paternal';
            } else {
                spouseSide = 'both';
            }
        } else {
            // Additional spouse (remarriage)
            spouseSide = 'both';
            spouseName = `${spouseName}(${existingSpouses.length + 1})`;
        }

        // Create spouse
        const spouse = new Person({
            name: spouseName,
            generation: person.generation,
            side: spouseSide,
            birthOrder: person.birthOrder,
            gender: spouseGender,
            x: spouseX,
            y: spouseY
        });

        this.app.state.addPerson(spouse);

        // Create couple relationship
        const coupleRel = new Relationship({
            type: 'couple',
            from: person.id,
            to: spouse.id,
            subtype: 'marriage'
        });

        this.app.state.addRelationship(coupleRel);

        this.app.layout.layout(this.app.state.persons, this.app.state.relationships);
        this.app.render();
        this.app.state.saveState();
        this.app.selectionManager.selectPerson(spouse);

        if (existingSpouses.length > 0) {
            this.app.toolbar.showToast(`${spouseName}이(가) 추가되었습니다 (재혼)`, 'success');
        } else {
            this.app.toolbar.showToast(`${spouseName}이(가) 추가되었습니다`, 'success');
        }
    }

    // Select all
    selectAll() {
        document.querySelectorAll('.genogram-node').forEach(node => {
            node.classList.add('selected');
        });
        this.app.toolbar.showToast(
            `${this.app.state.persons.length}개의 인물이 선택되었습니다`, 
            'info'
        );
    }
}
// ============================================================================
// RELATIONSHIP OPERATIONS - Relationship management
// ============================================================================

class RelationshipOperations {
    constructor(app) {
        this.app = app;
    }

    // Delete relationship
    deleteRelationship(relationshipId) {
        this.app.state.removeRelationship(relationshipId);
        this.app.render();
        this.app.state.saveState();
        this.app.toolbar.showToast('관계가 삭제되었습니다', 'success');
    }

    // Delete selected relationship
    deleteSelected() {
        const relationship = this.app.selectionManager.getSelectedRelationship();
        if (!relationship) {
            this.app.toolbar.showToast('삭제할 요소를 선택하세요', 'warning');
            return;
        }

        if (confirm('이 관계를 삭제하시겠습니까?')) {
            this.deleteRelationship(relationship.id);
            this.app.selectionManager.deselectAll();
        }
    }

    // Change marriage type
    changeMarriageType(relationship) {
        const types = [
            { value: 'married', label: '결혼' },
            { value: 'divorced', label: '이혼' },
            { value: 'separated', label: '별거' },
            { value: 'engaged', label: '약혼' },
            { value: 'cohabiting', label: '동거' },
            { value: 'partnership', label: '동반자' },
            { value: 'affair', label: '혼외관계' }
        ];
        
        const currentIndex = types.findIndex(t => t.value === relationship.subtype);
        const nextIndex = (currentIndex + 1) % types.length;
        const nextType = types[nextIndex];
        
        relationship.subtype = nextType.value;
        this.app.render();
        this.app.state.saveState();
        this.app.toolbar.showToast(`관계 유형: ${nextType.label}`, 'info');
    }

    // Change emotional type (redirect to properties panel)
    changeEmotionalType(relationship) {
        this.app.selectionManager.selectRelationship(relationship);
        this.app.toolbar.showToast('감정선 유형을 변경하려면 속성 패널을 사용하세요', 'info');
    }
}
// ============================================================================
// EMOTIONAL OPERATIONS - Emotional relationship management
// ============================================================================

class EmotionalOperations {
    constructor(app) {
        this.app = app;
    }

    // Set emotional subtype
    setEmotionalSubtype(subtype) {
        this.app.state.setEmotionalSubtype(subtype);
        
        if (this.app.toolbar && typeof this.app.toolbar.updateEmotionButtons === 'function') {
            this.app.toolbar.updateEmotionButtons(subtype);
        }
        
        // Update status message
        this.updateEmotionalStatus();
    }

    // Update emotional status message
    updateEmotionalStatus() {
        if (!this.app.toolbar || typeof this.app.toolbar.updateEmotionStatus !== 'function') {
            return;
        }

        const subtype = this.app.state.selectedEmotionalSubtype;
        let statusMessage;
        let statusOptions = {};
        
        if (subtype === 'none') {
            statusMessage = '감정선 유형을 선택한 후 인물을 2명 선택하면 연결됩니다';
            statusOptions = {
                isActive: false,
                isWaiting: false,
                category: null
            };
        } else {
            const category = this.app.toolbar.getEmotionCategory(subtype);
            
            if (this.app.state.selectedElement && this.app.state.selectedElement.type === 'person') {
                statusMessage = `"${this.app.state.selectedElement.data.getDisplayName()}" 선택됨 - 다른 인물을 선택하면 "${this.getEmotionalLabel(subtype)}" 감정선 연결`;
                statusOptions = {
                    isActive: false,
                    isWaiting: true,
                    category: category
                };
            } else {
                statusMessage = `현재 감정선: "${this.getEmotionalLabel(subtype)}" - 인물 2명을 선택하면 연결됩니다`;
                statusOptions = {
                    isActive: true,
                    isWaiting: false,
                    category: category
                };
            }
        }
        
        this.app.toolbar.updateEmotionStatus(statusMessage, statusOptions);
    }

    // Create emotional relationship
    createEmotionalRelationship(first, second, subtype) {
        if (!first || !second) return null;

        // Check for existing emotional relationship
        const existing = this.app.state.relationships.find(r => 
            r.type === 'emotional' && (
                (r.from === first.id && r.to === second.id) ||
                (r.from === second.id && r.to === first.id)
            )
        );

        const label = this.getEmotionalLabel(subtype);

        if (existing) {
            // Update existing
            existing.subtype = subtype;
            existing.label = label;
            this.app.render();
            this.app.state.saveState();
            // Update legend
            if (window.legend && typeof window.legend.update === 'function') {
                window.legend.update();
            }
            return existing.id;
        } else {
            // Create new
            const rel = new Relationship({
                type: 'emotional',
                from: first.id,
                to: second.id,
                subtype,
                label
            });
            this.app.state.addRelationship(rel);
            this.app.state.saveState();
            // Update legend
            if (window.legend && typeof window.legend.update === 'function') {
                window.legend.update();
            }
            return rel.id;
        }
    }

    // Get emotional label - 가장 많이 쓰이는 10가지 유형 (GenoPro 표준 기반)
    getEmotionalLabel(subtype) {
        const labels = {
            // 선택 안함
            'none': '없음',
            
            // 1. 조화로운 관계 (Harmony) - 긍정적 관계의 기본
            'harmony': '조화로운 관계',
            
            // 2. 친밀한 관계 (Close/Friendship) - 깊은 유대감
            'close-friendship': '친밀한 관계',
            
            // 3. 거리감 (Distant) - 소원한 관계
            'distant': '거리감',
            
            // 4. 단절 (Cutoff) - 완전한 관계 단절
            'cutoff': '단절',
            
            // 5. 불화 (Discord) - 의견 차이로 인한 갈등
            'discord': '불화',
            
            // 6. 적대적 (Hostile) - 공격적이고 논쟁적인 관계
            'hostile': '적대적 관계',
            
            // 7. 융합 (Fused) - 과도하게 밀착된 관계
            'fused': '융합',
            
            // 8. 학대 (Abuse) - 폭력적 관계
            'abuse': '학대',
            
            // 9. 조종 (Manipulative) - 한쪽이 다른 쪽을 조종
            'manipulative': '조종',
            
            // 10. 사랑 (Love) - 애정 관계
            'love': '사랑'
        };
        return labels[subtype] || '관계';
    }
}
