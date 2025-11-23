/**
 * Genogram Template Generator
 * 각 템플릿에 대한 실제 가계도 데이터 생성
 */

class TemplateGenerator {
    constructor() {
        this.nodeSpacing = 150; // 노드 간 기본 간격
        this.generationSpacing = 120; // 세대 간 간격
        this.centerX = 400; // 중앙 X 좌표
        this.startY = 100; // 시작 Y 좌표
    }

    /**
     * 템플릿 ID에 따라 적절한 데이터 생성
     */
    generate(templateId) {
        const generators = {
            'blank_canvas': () => this.generateBlankCanvas(),
            '2gen_1family_minimal': () => this.generate2Gen1FamilyMinimal(),
            '2gen_1family_siblings': () => this.generate2Gen1FamilySiblings(),
            '3gen_1family_standard': () => this.generate3Gen1FamilyStandard(),
            '3gen_2family': () => this.generate3Gen2Family(),
            '4gen_2family_max': () => this.generate4Gen2FamilyMax()
        };

        const generator = generators[templateId];
        if (!generator) {
            console.warn(`Unknown template ID: ${templateId}`);
            return this.generateBlankCanvas();
        }

        const templateData = generator();
        this.ensureParentChildRelationships(templateData.relationships);
        return templateData;
    }

    /**
     * 1. 빈 캔버스 - CT만
     */
    generateBlankCanvas() {
        const ct = this.createPerson({
            name: 'CT',
            gender: 'M',
            generation: 0,
            isCT: true,
            x: this.centerX,
            y: this.startY + this.generationSpacing * 2
        });

        return {
            persons: [ct],
            relationships: []
        };
    }

    /**
     * 2. 2세대 1가정 - 미니멀 (4명)
     * 부모 + 자녀 2명 (남, 여)
     */
    generate2Gen1FamilyMinimal() {
        const persons = [];
        const relationships = [];

        // 1세대: 부모
        const father = this.createPerson({
            name: '아버지',
            gender: 'M',
            generation: 0,
            x: this.centerX - this.nodeSpacing / 2,
            y: this.startY
        });
        father.side = 'paternal';

        const mother = this.createPerson({
            name: '어머니',
            gender: 'F',
            generation: 0,
            x: this.centerX + this.nodeSpacing / 2,
            y: this.startY
        });
        mother.side = 'maternal';

        persons.push(father, mother);

        // 부부 관계
        const couple = this.createRelationship({
            type: 'couple',
            subtype: 'marriage',
            from: father.id,
            to: mother.id
        });
        relationships.push(couple);

        // 2세대: 자녀 2명
        const son = this.createPerson({
            name: '첫째',
            gender: 'M',
            generation: 1,
            birthOrder: 1,
            x: this.centerX - this.nodeSpacing / 2,
            y: this.startY + this.generationSpacing
        });

        const daughter = this.createPerson({
            name: 'CT',
            gender: 'F',
            generation: 1,
            birthOrder: 2,
            isCT: true,
            x: this.centerX + this.nodeSpacing / 2,
            y: this.startY + this.generationSpacing
        });

        persons.push(son, daughter);

        // 부모-자녀 관계
        couple.children = [son.id, daughter.id];
        
        return { persons, relationships };
    }

    /**
     * 3. 2세대 1가정 - 형제 많음 (6명)
     * 부모 + 자녀 4명 (남, 여, 남, 여)
     */
    generate2Gen1FamilySiblings() {
        const persons = [];
        const relationships = [];

        // 1세대: 부모
        const father = this.createPerson({
            name: '아버지',
            gender: 'M',
            generation: 0,
            x: this.centerX - this.nodeSpacing / 2,
            y: this.startY
        });
        father.side = 'paternal';

        const mother = this.createPerson({
            name: '어머니',
            gender: 'F',
            generation: 0,
            x: this.centerX + this.nodeSpacing / 2,
            y: this.startY
        });
        mother.side = 'maternal';

        persons.push(father, mother);

        // 부부 관계
        const couple = this.createRelationship({
            type: 'couple',
            subtype: 'marriage',
            from: father.id,
            to: mother.id
        });
        relationships.push(couple);

        // 2세대: 자녀 4명
        const children = [
            { name: '첫째', gender: 'M', birthOrder: 1, isCT: false },
            { name: '둘째', gender: 'F', birthOrder: 2, isCT: false },
            { name: 'CT', gender: 'M', birthOrder: 3, isCT: true },
            { name: '넷째', gender: 'F', birthOrder: 4, isCT: false }
        ];

        const childSpacing = this.nodeSpacing * 0.8;
        const startX = this.centerX - (childSpacing * 1.5);

        children.forEach((childData, index) => {
            const child = this.createPerson({
                ...childData,
                generation: 1,
                x: startX + (childSpacing * index),
                y: this.startY + this.generationSpacing
            });
            persons.push(child);
            couple.children.push(child.id);
        });
        
        return { persons, relationships };
    }

    /**
     * 4. 3세대 1가정 - 표준 (8명)
     * 조부모 + 부모 + 고모 + 자녀 2명
     */
    generate3Gen1FamilyStandard() {
        const persons = [];
        const relationships = [];

        // 1세대: 조부모
        const grandfather = this.createPerson({
            name: '할아버지',
            gender: 'M',
            generation: -1,
            side: 'paternal',
            x: this.centerX - this.nodeSpacing,
            y: this.startY
        });

        const grandmother = this.createPerson({
            name: '할머니',
            gender: 'F',
            generation: -1,
            side: 'paternal',
            x: this.centerX - this.nodeSpacing / 2,
            y: this.startY
        });

        persons.push(grandfather, grandmother);

        // 조부모 부부 관계
        const grandCouple = this.createRelationship({
            type: 'couple',
            subtype: 'marriage',
            from: grandfather.id,
            to: grandmother.id
        });
        relationships.push(grandCouple);

        // 2세대: 부모 + 고모
        const father = this.createPerson({
            name: '아버지',
            gender: 'M',
            generation: 0,
            side: 'paternal',
            birthOrder: 1,
            x: this.centerX - this.nodeSpacing,
            y: this.startY + this.generationSpacing
        });

        const aunt = this.createPerson({
            name: '고모',
            gender: 'F',
            generation: 0,
            side: 'paternal',
            birthOrder: 2,
            x: this.centerX - this.nodeSpacing / 2,
            y: this.startY + this.generationSpacing
        });

        const mother = this.createPerson({
            name: '어머니',
            gender: 'F',
            generation: 0,
            side: 'maternal',
            x: this.centerX + this.nodeSpacing / 2,
            y: this.startY + this.generationSpacing
        });

        persons.push(father, aunt, mother);

        // 조부모의 자녀
        grandCouple.children = [father.id, aunt.id];

        // 부모 부부 관계
        const parentCouple = this.createRelationship({
            type: 'couple',
            subtype: 'marriage',
            from: father.id,
            to: mother.id
        });
        relationships.push(parentCouple);

        // 3세대: 자녀 2명
        const son = this.createPerson({
            name: '첫째',
            gender: 'M',
            generation: 1,
            birthOrder: 1,
            x: this.centerX - this.nodeSpacing / 4,
            y: this.startY + this.generationSpacing * 2
        });

        const daughter = this.createPerson({
            name: 'CT',
            gender: 'F',
            generation: 1,
            birthOrder: 2,
            isCT: true,
            x: this.centerX + this.nodeSpacing / 4,
            y: this.startY + this.generationSpacing * 2
        });

        persons.push(son, daughter);

        parentCouple.children = [son.id, daughter.id];
        
        return { persons, relationships };
    }

    /**
     * 5. 3세대 2가정 - 친가+외가 (12명)
     * 양쪽 조부모 + 부모 + 자녀 3명
     */
    generate3Gen2Family() {
        const persons = [];
        const relationships = [];

        // 1세대: 친가 조부모
        const paternalGF = this.createPerson({
            name: '친할아버지',
            gender: 'M',
            generation: -1,
            side: 'paternal',
            x: this.centerX - this.nodeSpacing * 2,
            y: this.startY
        });

        const paternalGM = this.createPerson({
            name: '친할머니',
            gender: 'F',
            generation: -1,
            side: 'paternal',
            x: this.centerX - this.nodeSpacing * 1.5,
            y: this.startY
        });

        persons.push(paternalGF, paternalGM);

        const paternalCouple = this.createRelationship({
            type: 'couple',
            subtype: 'marriage',
            from: paternalGF.id,
            to: paternalGM.id
        });
        relationships.push(paternalCouple);

        // 1세대: 외가 조부모
        const maternalGF = this.createPerson({
            name: '외할아버지',
            gender: 'M',
            generation: -1,
            side: 'maternal',
            x: this.centerX + this.nodeSpacing * 1.5,
            y: this.startY
        });

        const maternalGM = this.createPerson({
            name: '외할머니',
            gender: 'F',
            generation: -1,
            side: 'maternal',
            x: this.centerX + this.nodeSpacing * 2,
            y: this.startY
        });

        persons.push(maternalGF, maternalGM);

        const maternalCouple = this.createRelationship({
            type: 'couple',
            subtype: 'marriage',
            from: maternalGF.id,
            to: maternalGM.id
        });
        relationships.push(maternalCouple);

        // 2세대: 부모
        const father = this.createPerson({
            name: '아버지',
            gender: 'M',
            generation: 0,
            side: 'paternal',
            x: this.centerX - this.nodeSpacing / 2,
            y: this.startY + this.generationSpacing
        });

        const mother = this.createPerson({
            name: '어머니',
            gender: 'F',
            generation: 0,
            side: 'maternal',
            x: this.centerX + this.nodeSpacing / 2,
            y: this.startY + this.generationSpacing
        });

        persons.push(father, mother);

        paternalCouple.children = [father.id];
        maternalCouple.children = [mother.id];
        const parentCouple = this.createRelationship({
            type: 'couple',
            subtype: 'marriage',
            from: father.id,
            to: mother.id
        });
        relationships.push(parentCouple);

        // 3세대: 자녀 3명
        const children = [
            { name: '첫째', gender: 'F', birthOrder: 1, isCT: false },
            { name: 'CT', gender: 'M', birthOrder: 2, isCT: true },
            { name: '셋째', gender: 'F', birthOrder: 3, isCT: false }
        ];

        const childSpacing = this.nodeSpacing * 0.7;
        const startX = this.centerX - childSpacing;

        children.forEach((childData, index) => {
            const child = this.createPerson({
                ...childData,
                generation: 1,
                x: startX + (childSpacing * index),
                y: this.startY + this.generationSpacing * 2
            });
            persons.push(child);
            parentCouple.children.push(child.id);
        });
        
        return { persons, relationships };
    }

    /**
     * 6. 4세대 2가정 - 최대 확장 (16명)
     * 양쪽 증조부모 + 양쪽 조부모 + 부모 + 큰아버지 + 이모 + 자녀 3명
     */
    generate4Gen2FamilyMax() {
        const persons = [];
        const relationships = [];

        // 1세대: 친가 증조부모
        const paternalGreatGF = this.createPerson({
            name: '친증조할아버지',
            gender: 'M',
            generation: -2,
            side: 'paternal',
            x: this.centerX - this.nodeSpacing * 2.5,
            y: this.startY
        });

        const paternalGreatGM = this.createPerson({
            name: '친증조할머니',
            gender: 'F',
            generation: -2,
            side: 'paternal',
            x: this.centerX - this.nodeSpacing * 2,
            y: this.startY
        });

        persons.push(paternalGreatGF, paternalGreatGM);

        const paternalGreatCouple = this.createRelationship({
            type: 'couple',
            subtype: 'marriage',
            from: paternalGreatGF.id,
            to: paternalGreatGM.id
        });
        relationships.push(paternalGreatCouple);

        // 1세대: 외가 증조부모
        const maternalGreatGF = this.createPerson({
            name: '외증조할아버지',
            gender: 'M',
            generation: -2,
            side: 'maternal',
            x: this.centerX + this.nodeSpacing * 2,
            y: this.startY
        });

        const maternalGreatGM = this.createPerson({
            name: '외증조할머니',
            gender: 'F',
            generation: -2,
            side: 'maternal',
            x: this.centerX + this.nodeSpacing * 2.5,
            y: this.startY
        });

        persons.push(maternalGreatGF, maternalGreatGM);

        const maternalGreatCouple = this.createRelationship({
            type: 'couple',
            subtype: 'marriage',
            from: maternalGreatGF.id,
            to: maternalGreatGM.id
        });
        relationships.push(maternalGreatCouple);

        // 2세대: 친가 조부모
        const paternalGF = this.createPerson({
            name: '친할아버지',
            gender: 'M',
            generation: -1,
            side: 'paternal',
            x: this.centerX - this.nodeSpacing * 2,
            y: this.startY + this.generationSpacing
        });

        const paternalGM = this.createPerson({
            name: '친할머니',
            gender: 'F',
            generation: -1,
            side: 'paternal',
            x: this.centerX - this.nodeSpacing * 1.5,
            y: this.startY + this.generationSpacing
        });

        persons.push(paternalGF, paternalGM);

        paternalGreatCouple.children = [paternalGF.id];
        const paternalCouple = this.createRelationship({
            type: 'couple',
            subtype: 'marriage',
            from: paternalGF.id,
            to: paternalGM.id
        });
        relationships.push(paternalCouple);

        // 2세대: 외가 조부모
        const maternalGF = this.createPerson({
            name: '외할아버지',
            gender: 'M',
            generation: -1,
            side: 'maternal',
            x: this.centerX + this.nodeSpacing * 1.5,
            y: this.startY + this.generationSpacing
        });

        const maternalGM = this.createPerson({
            name: '외할머니',
            gender: 'F',
            generation: -1,
            side: 'maternal',
            x: this.centerX + this.nodeSpacing * 2,
            y: this.startY + this.generationSpacing
        });

        persons.push(maternalGF, maternalGM);

        maternalGreatCouple.children = [maternalGF.id];
        const maternalCouple = this.createRelationship({
            type: 'couple',
            subtype: 'marriage',
            from: maternalGF.id,
            to: maternalGM.id
        });
        relationships.push(maternalCouple);

        // 3세대: 부모 + 큰아버지 + 이모
        const bigFather = this.createPerson({
            name: '큰아버지',
            gender: 'M',
            generation: 0,
            side: 'paternal',
            birthOrder: 1,
            x: this.centerX - this.nodeSpacing * 1.2,
            y: this.startY + this.generationSpacing * 2
        });

        const father = this.createPerson({
            name: '아버지',
            gender: 'M',
            generation: 0,
            side: 'paternal',
            birthOrder: 2,
            x: this.centerX - this.nodeSpacing / 2,
            y: this.startY + this.generationSpacing * 2
        });

        const mother = this.createPerson({
            name: '어머니',
            gender: 'F',
            generation: 0,
            side: 'maternal',
            x: this.centerX + this.nodeSpacing / 2,
            y: this.startY + this.generationSpacing * 2
        });

        const aunt = this.createPerson({
            name: '이모',
            gender: 'F',
            generation: 0,
            side: 'maternal',
            birthOrder: 1,
            x: this.centerX + this.nodeSpacing * 1.2,
            y: this.startY + this.generationSpacing * 2
        });

        persons.push(bigFather, father, mother, aunt);

        paternalCouple.children = [bigFather.id, father.id];
        maternalCouple.children = [mother.id, aunt.id];
        const parentCouple = this.createRelationship({
            type: 'couple',
            subtype: 'marriage',
            from: father.id,
            to: mother.id
        });
        relationships.push(parentCouple);

        // 4세대: 자녀 3명
        const children = [
            { name: '첫째', gender: 'M', birthOrder: 1, isCT: false },
            { name: 'CT', gender: 'F', birthOrder: 2, isCT: true },
            { name: '셋째', gender: 'M', birthOrder: 3, isCT: false }
        ];

        const childSpacing = this.nodeSpacing * 0.7;
        const startX = this.centerX - childSpacing;

        children.forEach((childData, index) => {
            const child = this.createPerson({
                ...childData,
                generation: 1,
                x: startX + (childSpacing * index),
                y: this.startY + this.generationSpacing * 3
            });
            persons.push(child);
            parentCouple.children.push(child.id);
        });

        // 감정선 추가 (범례 테스트용)
        relationships.push(new Relationship({
            type: 'emotional',
            subtype: 'discord',
            from: bigFather.id,
            to: father.id,
            label: '불화'
        }));

        relationships.push(new Relationship({
            type: 'emotional',
            subtype: 'distant',
            from: maternalGF.id,
            to: mother.id,
            label: '거리감'
        }));

        const ctMember = persons.find(p => p.isCT);
        if (ctMember) {
            relationships.push(new Relationship({
                type: 'emotional',
                subtype: 'close-friendship',
                from: aunt.id,
                to: ctMember.id,
                label: '친밀한 관계'
            }));
        }

        return { persons, relationships };
    }

    /**
     * Ensure each couple that has children emits a parent-child relationship
     */
    ensureParentChildRelationships(relationships) {
        if (!Array.isArray(relationships)) return;

        const existingKeys = new Set(
            relationships
                .filter(rel => rel.type === 'parent-child')
                .map(rel => this.buildParentChildKey(rel.parents, rel.children))
        );

        const toAdd = [];

        relationships.forEach(rel => {
            if (rel.type !== 'couple') return;
            const childIds = Array.isArray(rel.children) ? rel.children.filter(id => !!id) : [];
            if (childIds.length === 0) return;
            const parentIds = [rel.from, rel.to].filter(id => !!id);
            if (parentIds.length === 0) return;

            const key = this.buildParentChildKey(parentIds, childIds);
            if (existingKeys.has(key)) return;
            existingKeys.add(key);

            toAdd.push(this.createRelationship({
                type: 'parent-child',
                parents: parentIds,
                children: [...childIds]
            }));
        });

        if (toAdd.length > 0) {
            relationships.push(...toAdd);
        }
    }

    buildParentChildKey(parents, children) {
        const parentKey = (parents || []).filter(id => !!id).join(',');
        const childKey = (children || []).filter(id => !!id).join(',');
        return `${parentKey}->${childKey}`;
    }

    /**
     * Helper: Person 생성
     */
    createPerson(data) {
        return new Person(data);
    }

    /**
     * Helper: Relationship 생성
     */
    createRelationship(data) {
        return new Relationship(data);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TemplateGenerator };
}
