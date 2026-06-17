/**
 * ⚠️ [BUG-ARCH-02] 이 파일은 현재 canvas.html에서 로드되지 않는 미사용 파일입니다.
 *
 * 실제로 동작하는 PersonOperations 클래스는 js/operations.js 에 전역 클래스로 정의되어 있습니다.
 * canvas.html 로드 순서: js/operations.js → js/app.js (new PersonOperations(this) 호출)
 *
 * ⚠️ 메서드 시그니처 불일치 주의:
 *   - 이 파일:        addFather(person)    → Person 객체를 인자로 받음
 *   - js/operations.js: addFather(personId) → Person ID 문자열을 인자로 받음
 *
 * 이 파일을 수정해도 앱 동작에 아무 영향이 없습니다.
 * PersonOperations 버그를 수정하려면 반드시 js/operations.js 를 수정하세요.
 *
 * ---
 * PersonOperations - 인물 추가/삭제 작업 (미사용 실험적 버전)
 * FamilyTree 프로젝트에서 차용
 */

import { Person } from './Person.js';
import { Relationship } from './Relationship.js';
import { Toast } from '../ui/Toast.js';

export class PersonOperations {
  constructor(canvasState) {
    this.canvasState = canvasState;
    this.GRID = 50;
  }

  /** 픽셀값을 그리드에 스냅 */
  _snap(px) {
    return Math.round(px / this.GRID) * this.GRID;
  }

  /**
   * 부모 추가 (아버지+어머니)
   */
  addBothParents(person) {
    console.log('🔧 addBothParents called for:', person.name, 'gender:', person.gender);
    
    // 이미 부모가 있는지 확인
    const existingParents = this.canvasState.getParents(person.id);
    if (existingParents.length > 0) {
      Toast.warning('이미 부모가 존재합니다');
      return null;
    }

    // CT로부터의 상대적 세대 계산
    const generationFromCT = this.getGenerationFromCT(person);
    console.log('📊 Generation from CT:', generationFromCT, 'for person:', person.name);
    
    const side = person.gender === 'female' ? '외할' : '할';
    console.log('👥 Side:', side, '(gender:', person.gender + ')');
    
    let fatherName, motherName;
    
    if (generationFromCT === null) {
      // CT 본인이거나, 같은 세대(형제자매 등)이거나, CT와 조상/자손 관계가
      // 확인되지 않는 경우 → 일반적인 '아버지/어머니'로 명명
      fatherName = '아버지';
      motherName = '어머니';
    } else if (generationFromCT === 0) {
      // CT의 부모 (조부모)
      if (person.gender === 'male') {
        fatherName = '할아버지';
        motherName = '할머니';
      } else {
        fatherName = '외할아버지';
        motherName = '외할머니';
      }
    } else if (generationFromCT === 1) {
      // 조부모의 부모 = 증조부모
      fatherName = `증조${side}아버지`;
      motherName = `증조${side}머니`;
    } else if (generationFromCT === 2) {
      // 증조부모의 부모 = 고조부모
      fatherName = `고조${side}아버지`;
      motherName = `고조${side}머니`;
    } else if (generationFromCT < 0) {
      // CT보다 아래 세대의 부모 (CT의 자녀의 부모 등)
      fatherName = '아버지';
      motherName = '어머니';
    } else {
      // 4세대 이상
      fatherName = `${generationFromCT}대조${side}아버지`;
      motherName = `${generationFromCT}대조${side}머니`;
    }
    
    console.log('✅ Generated names:', fatherName, motherName);

    // 아버지 생성
    const father = new Person({
      name: fatherName,
      gender: 'male',
      x: this._snap(person.x - 150),
      y: this._snap(person.y - 200)
    });

    // 어머니 생성
    const mother = new Person({
      name: motherName,
      gender: 'female',
      x: this._snap(person.x),
      y: this._snap(person.y - 200)
    });

    this.canvasState.addPerson(father);
    this.canvasState.addPerson(mother);

    // 부부 관계 생성
    const marriageRel = new Relationship({
      from: father.id,
      to: mother.id,
      type: 'marriage',
      subtype: 'married'
    });
    this.canvasState.addRelationship(marriageRel);

    // 부모-자녀 관계 생성
    const parentChildRel1 = new Relationship({
      from: father.id,
      to: person.id,
      type: 'biological'
    });
    const parentChildRel2 = new Relationship({
      from: mother.id,
      to: person.id,
      type: 'biological'
    });
    this.canvasState.addRelationship(parentChildRel1);
    this.canvasState.addRelationship(parentChildRel2);

    Toast.success(`${fatherName}과 ${motherName}이(가) 추가되었습니다`);
    return { father, mother };
  }

  /**
   * 인물의 세대 레벨 계산 (0 = 최상위 세대)
   */
  getGenerationLevel(person) {
    let level = 0;
    let current = person;
    
    // 부모를 거슬러 올라가면서 레벨 계산
    while (true) {
      const parents = this.canvasState.getParents(current.id);
      if (parents.length === 0) break;
      
      level++;
      current = parents[0]; // 첫 번째 부모를 기준으로
      
      // 무한 루프 방지 (최대 10세대)
      if (level > 10) break;
    }
    
    return level;
  }

  /**
   * CT로부터의 상대적 세대 계산
   * 반환값:
   *  null: CT 본인이거나, 같은 세대(형제자매 등)이거나, CT와 조상/자손 관계가
   *        확인되지 않는 경우 → 호출 측에서는 일반적인 '아버지/어머니' 명명을 사용해야 함
   *  -1: CT의 자녀
   *   0: CT의 부모 (조부모)
   *   1: CT 부모의 부모 (증조부모)
   *   2: 증조부모의 부모 (고조부모)
   */
  getGenerationFromCT(person) {
    // CT 찾기
    const ct = this.canvasState.persons.find(p => p.isCT);
    if (!ct) {
      // CT가 없으면 조상 관계를 평가할 수 없으므로 일반적인 부모 명명을 사용
      return null;
    }

    // CT와 person의 관계 계산
    // 1. person이 CT의 조상인지 확인 (위로 올라가기)
    let ancestorLevel = this.getAncestorLevel(ct, person.id);
    if (ancestorLevel > 0) {
      return ancestorLevel - 1; // CT의 부모는 0, 조부모의 부모는 1
    }

    // 2. person이 CT의 자손인지 확인 (아래로 내려가기)
    let descendantLevel = this.getAncestorLevel(person, ct.id);
    if (descendantLevel > 0) {
      return -descendantLevel; // 음수로 표현
    }

    // 3. CT 본인이거나, 같은 세대(형제자매 등)이거나, 무관계인 경우
    //    → 조상 관계가 확인되지 않았으므로 일반적인 부모 명명을 사용
    return null;
  }

  /**
   * target이 person의 몇 세대 위 조상인지 계산
   * 반환값: 조상이 아니면 0, 부모면 1, 조부모면 2, ...
   */
  getAncestorLevel(person, targetId, visited = new Set()) {
    // 무한 루프 방지
    if (visited.has(person.id)) return 0;
    visited.add(person.id);

    const parents = this.canvasState.getParents(person.id);
    
    for (const parent of parents) {
      if (parent.id === targetId) {
        return 1; // 직계 부모
      }
      
      const level = this.getAncestorLevel(parent, targetId, visited);
      if (level > 0) {
        return level + 1;
      }
    }

    return 0; // 조상이 아님
  }

  /**
   * 아버지 추가
   */
  addFather(person) {
    return this.addParent(person, 'male');
  }

  /**
   * 어머니 추가
   */
  addMother(person) {
    return this.addParent(person, 'female');
  }

  /**
   * 부모 추가 (단일)
   */
  addParent(person, gender) {
    // 이미 같은 성별의 부모가 있는지 확인
    const existingParents = this.canvasState.getParents(person.id);
    const sameGenderParent = existingParents.find(p => p.gender === gender);
    
    if (sameGenderParent) {
      const parentName = gender === 'male' ? '아버지' : '어머니';
      Toast.warning(`이미 ${parentName}가 존재합니다`);
      return null;
    }

    const parentName = gender === 'male' ? '아버지' : '어머니';
    const xOffset = gender === 'male' ? -100 : 100;

    const parent = new Person({
      name: parentName,
      gender: gender,
      x: this._snap(person.x + xOffset),
      y: this._snap(person.y - 200)
    });

    this.canvasState.addPerson(parent);

    // 부모-자녀 관계 생성
    const parentChildRel = new Relationship({
      from: parent.id,
      to: person.id,
      type: 'biological'
    });
    this.canvasState.addRelationship(parentChildRel);

    // 다른 성별의 부모가 있으면 부부 관계 생성
    const otherParent = existingParents.find(p => p.gender !== gender);
    if (otherParent) {
      const marriageRel = new Relationship({
        from: gender === 'male' ? parent.id : otherParent.id,
        to: gender === 'male' ? otherParent.id : parent.id,
        type: 'marriage',
        subtype: 'married'
      });
      this.canvasState.addRelationship(marriageRel);
    }

    Toast.success(`${parentName}이(가) 추가되었습니다`);
    return parent;
  }

  /**
   * 배우자 추가
   */
  addSpouse(person) {
    const spouseGender = person.gender === 'male' ? 'female' : 'male';
    const spouseName = person.gender === 'male' ? '아내' : '남편';

    // 기존 배우자 확인
    const existingSpouses = this.canvasState.getSpouses(person.id);
    
    let xOffset = 150;
    if (existingSpouses.length > 0) {
      const rightmostSpouse = existingSpouses.reduce((max, s) =>
        s.x > max.x ? s : max, existingSpouses[0]
      );
      xOffset = rightmostSpouse.x - person.x + 150;
    }

    const spouse = new Person({
      name: existingSpouses.length > 0 ? `${spouseName}(${existingSpouses.length + 1})` : spouseName,
      gender: spouseGender,
      x: this._snap(person.x + xOffset),
      y: this._snap(person.y)
    });

    this.canvasState.addPerson(spouse);

    // 부부 관계 생성
    const marriageRel = new Relationship({
      from: person.gender === 'male' ? person.id : spouse.id,
      to: person.gender === 'male' ? spouse.id : person.id,
      type: 'marriage',
      subtype: 'married'
    });
    this.canvasState.addRelationship(marriageRel);

    if (existingSpouses.length > 0) {
      Toast.success(`${spouseName}이(가) 추가되었습니다 (재혼)`);
    } else {
      Toast.success(`${spouseName}이(가) 추가되었습니다`);
    }

    return spouse;
  }

  /**
   * 자녀 추가
   */
  addChild(person, gender) {
    let childName, childGender;
    
    if (gender === 'male') {
      childName = '아들';
      childGender = 'male';
    } else if (gender === 'female') {
      childName = '딸';
      childGender = 'female';
    } else {
      childName = '자녀';
      childGender = 'unknown';
    }

    // 기존 자녀 확인
    const existingChildren = this.canvasState.getChildren(person.id);
    const xOffset = existingChildren.length * 150;

    const child = new Person({
      name: childName,
      gender: childGender,
      x: this._snap(person.x + xOffset),
      y: this._snap(person.y + 200)
    });

    this.canvasState.addPerson(child);

    // 부모-자녀 관계 생성
    const parentChildRel = new Relationship({
      from: person.id,
      to: child.id,
      type: 'biological'
    });
    this.canvasState.addRelationship(parentChildRel);

    // 배우자가 있으면 배우자도 부모로 추가
    const spouses = this.canvasState.getSpouses(person.id);
    if (spouses.length > 0) {
      const spouse = spouses[0]; // 첫 번째 배우자
      const spouseChildRel = new Relationship({
        from: spouse.id,
        to: child.id,
        type: 'biological'
      });
      this.canvasState.addRelationship(spouseChildRel);
    }

    Toast.success(`${childName}이(가) 추가되었습니다`);
    return child;
  }

  /**
   * 아들 추가
   */
  addSon(person) {
    return this.addChild(person, 'male');
  }

  /**
   * 딸 추가
   */
  addDaughter(person) {
    return this.addChild(person, 'female');
  }

  /**
   * 성별미상 자녀 추가
   */
  addChildUnknown(person) {
    return this.addChild(person, 'other');
  }

  /**
   * 형제자매 추가
   */
  addSibling(person, gender) {
    // 부모 확인
    const parents = this.canvasState.getParents(person.id);
    if (parents.length === 0) {
      Toast.warning('형제자매를 추가하려면 먼저 부모를 추가해주세요');
      return null;
    }

    let siblingName, siblingGender;
    
    if (gender === 'male') {
      siblingName = '남자형제';
      siblingGender = 'male';
    } else if (gender === 'female') {
      siblingName = '여자형제';
      siblingGender = 'female';
    } else {
      siblingName = '형제자매';
      siblingGender = 'unknown';
    }

    // 기존 형제자매 확인
    const siblings = this.canvasState.getSiblings(person.id);
    const xOffset = (siblings.length + 1) * 150;

    const sibling = new Person({
      name: siblingName,
      gender: siblingGender,
      x: this._snap(person.x + xOffset),
      y: this._snap(person.y)
    });

    this.canvasState.addPerson(sibling);

    // 부모와의 관계 생성
    parents.forEach(parent => {
      const parentChildRel = new Relationship({
        from: parent.id,
        to: sibling.id,
        type: 'biological'
      });
      this.canvasState.addRelationship(parentChildRel);
    });

    Toast.success(`${siblingName}이(가) 추가되었습니다`);
    return sibling;
  }

  /**
   * 남자형제 추가
   */
  addBrother(person) {
    return this.addSibling(person, 'male');
  }

  /**
   * 여자형제 추가
   */
  addSister(person) {
    return this.addSibling(person, 'female');
  }

  /**
   * 성별미상 형제자매 추가
   */
  addSiblingUnknown(person) {
    return this.addSibling(person, 'other');
  }

  /**
   * 인물 복제
   */
  duplicatePerson(person) {
    const newPerson = person.clone();
    newPerson.x = this._snap(person.x + 50);
    newPerson.y = this._snap(person.y + 50);
    newPerson.name = `${person.name} 복사본`;
    
    this.canvasState.addPerson(newPerson);
    Toast.success('인물이 복제되었습니다');
    
    return newPerson;
  }
}
