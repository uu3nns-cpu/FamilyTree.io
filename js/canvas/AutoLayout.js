/**
 * ⚠️ [BUG-ARCH-01] 이 파일은 현재 canvas.html에서 로드되지 않는 미사용 파일입니다.
 *
 * 실제로 동작하는 AutoLayout 클래스는 js/render.js 하단에 인라인으로 정의되어 있습니다.
 * canvas.html 로드 순서: js/render.js → js/app.js (new AutoLayout() 호출)
 *
 * 이 파일을 수정해도 앱 동작에 아무 영향이 없습니다.
 * AutoLayout 버그를 수정하려면 반드시 js/render.js 의 AutoLayout 클래스를 수정하세요.
 *
 * ---
 * AutoLayout - Genogram 자동 정렬 시스템 (미사용 실험적 버전)
 * 하위 세대를 고려한 동적 간격 조정
 */

export class AutoLayout {
  constructor(canvasState) {
    this.canvasState = canvasState;
    
    this.SPACING = {
      HORIZONTAL: 150,
      VERTICAL: 150,
    };

    this.START_Y = 100;
  }

  autoArrange() {
    const people = this.canvasState.persons;
    const relationships = this.canvasState.relationships;

    if (!people || people.length === 0) {
      console.log('⚠️ 정렬할 인물이 없습니다');
      return;
    }

    console.log('🔄 Genogram 자동 정렬 시작...');
    console.log(`📊 인물: ${people.length}명, 관계: ${relationships.length}개`);
    
    this.standardLayout(people, relationships);
    
    console.log('✅ 자동 정렬 완료\n');
  }

  standardLayout(people, relationships) {
    // 1. 세대 구조 생성
    const generations = this.buildGenerations(people, relationships);
    
    // 2. 가족 관계 맵 생성
    const familyMap = this.buildFamilyMap(relationships);
    
    // 3. 각 부부의 자손 너비 계산
    const descendantWidths = this.calculateDescendantWidths(generations, familyMap);
    
    // 4. 레이아웃 적용 (descendantWidths 전달)
    this.applyLayout(generations, familyMap, descendantWidths);
    
    // 5. 중앙 정렬
    this.centerLayout(people);
  }

  /**
   * 각 부부의 전체 자손 너비 계산
   */
  calculateDescendantWidths(generations, familyMap) {
    const widths = new Map();
    
    // 최하위 세대부터 역순으로 계산
    const sortedGens = Array.from(generations.entries()).sort((a, b) => b[0] - a[0]);
    
    sortedGens.forEach(([level, personIds]) => {
      // 이 세대의 각 부부에 대해
      familyMap.childrenByParents.forEach((childIds, parentKey) => {
        const parentIds = parentKey.split('|');
        const parents = parentIds.map(id => this.canvasState.getPersonById(id)).filter(p => p);
        
        if (parents.length === 0) return;
        
        // 부모의 레벨 확인
        const parentLevel = Array.from(generations.entries()).find(([lv, ids]) => 
          ids.includes(parents[0].id)
        )?.[0];
        
        if (parentLevel === undefined) return;
        
        // 직계 자녀들의 너비 계산
        let totalWidth = 0;
        
        childIds.forEach(childId => {
          const spouse = familyMap.marriages.get(childId);
          const spouseParents = familyMap.parentsOfChild.get(spouse);
          
          // 자녀가 배우자를 가지고, 배우자가 부모가 없으면 함께 카운트
          if (spouse && (!spouseParents || spouseParents.size === 0)) {
            totalWidth += this.SPACING.HORIZONTAL; // 부부는 2칸
          } else {
            totalWidth += 0; // 자녀가 자체 부모를 가지면 별도 카운트 안 함
          }
        });
        
        // 자녀들의 자손 너비도 더함
        childIds.forEach(childId => {
          const childSpouse = familyMap.marriages.get(childId);
          const coupleKey = childSpouse ? 
            [childId, childSpouse].sort().join('|') : childId;
          
          const childDescendantWidth = widths.get(coupleKey) || 0;
          totalWidth = Math.max(totalWidth, childDescendantWidth);
        });
        
        // 최소 너비 보장 (부부 1쌍 = 150px)
        totalWidth = Math.max(totalWidth, this.SPACING.HORIZONTAL);
        
        widths.set(parentKey, totalWidth);
      });
    });
    
    return widths;
  }

  buildGenerations(people, relationships) {
    const generations = new Map();
    const personLevels = new Map();

    // 부모-자녀 관계 맵 생성
    const childToParents = new Map();
    const parentToChildren = new Map();
    const marriages = new Map();
    
    relationships.forEach(rel => {
      if (['biological', 'adopted', 'foster'].includes(rel.type)) {
        if (!childToParents.has(rel.to)) {
          childToParents.set(rel.to, []);
        }
        childToParents.get(rel.to).push(rel.from);
        
        if (!parentToChildren.has(rel.from)) {
          parentToChildren.set(rel.from, []);
        }
        parentToChildren.get(rel.from).push(rel.to);
      }
      if (rel.type === 'marriage') {
        marriages.set(rel.from, rel.to);
        marriages.set(rel.to, rel.from);
      }
    });

    // 최상위 세대 찾기: 부모가 없는 사람들
    const topLevelPeople = [];
    
    people.forEach(person => {
      const hasParents = childToParents.has(person.id);
      if (!hasParents) {
        topLevelPeople.push(person.id);
      }
    });
    
    // 최상위 후보 중에서 배우자로 인한 중복 제거
    const actualTopLevel = topLevelPeople.filter(personId => {
      const spouseId = marriages.get(personId);
      if (spouseId) {
        if (childToParents.has(spouseId)) {
          return false;
        }
      }
      return true;
    });
    
    if (actualTopLevel.length === 0 && people.length > 0) {
      const root = people.find(p => p.isCT) || people[0];
      actualTopLevel.push(root.id);
    }

    // BFS로 각 인물의 레벨 계산
    const visited = new Set();
    const queue = [];
    
    actualTopLevel.forEach(personId => {
      queue.push({ id: personId, level: 0 });
      personLevels.set(personId, 0);
      visited.add(personId);
      
      const spouseId = marriages.get(personId);
      if (spouseId && !visited.has(spouseId)) {
        queue.push({ id: spouseId, level: 0 });
        personLevels.set(spouseId, 0);
        visited.add(spouseId);
      }
    });

    while (queue.length > 0) {
      const { id, level } = queue.shift();

      const children = parentToChildren.get(id) || [];
      children.forEach(childId => {
        if (!visited.has(childId)) {
          visited.add(childId);
          personLevels.set(childId, level + 1);
          queue.push({ id: childId, level: level + 1 });
          
          const childSpouseId = marriages.get(childId);
          if (childSpouseId && !visited.has(childSpouseId)) {
            visited.add(childSpouseId);
            personLevels.set(childSpouseId, level + 1);
            queue.push({ id: childSpouseId, level: level + 1 });
          }
        }
      });
      
      const parents = childToParents.get(id) || [];
      parents.forEach(parentId => {
        if (!visited.has(parentId)) {
          visited.add(parentId);
          const parentLevel = level - 1;
          personLevels.set(parentId, parentLevel);
          queue.push({ id: parentId, level: parentLevel });
          
          const parentSpouseId = marriages.get(parentId);
          if (parentSpouseId && !visited.has(parentSpouseId)) {
            visited.add(parentSpouseId);
            personLevels.set(parentSpouseId, parentLevel);
            queue.push({ id: parentSpouseId, level: parentLevel });
          }
        }
      });
    }

    people.forEach(person => {
      if (!visited.has(person.id)) {
        const maxLevel = personLevels.size > 0 
          ? Math.max(...Array.from(personLevels.values())) + 1 
          : 0;
        personLevels.set(person.id, maxLevel);
      }
    });

    const minLevel = Math.min(...Array.from(personLevels.values()));
    if (minLevel < 0) {
      personLevels.forEach((level, id) => {
        personLevels.set(id, level - minLevel);
      });
    }

    personLevels.forEach((level, id) => {
      if (!generations.has(level)) {
        generations.set(level, []);
      }
      generations.get(level).push(id);
    });

    console.log(`\n📈 세대 구조:`);
    generations.forEach((ids, level) => {
      const names = ids.map(id => this.canvasState.getPersonById(id)?.name || id).join(', ');
      console.log(`  세대 ${level + 1}: ${ids.length}명 (${names})`);
    });

    return generations;
  }

  buildFamilyMap(relationships) {
    const map = {
      marriages: new Map(),
      childrenByParents: new Map(),
      parentsOfChild: new Map(),
    };

    relationships.forEach(rel => {
      if (rel.type === 'marriage') {
        map.marriages.set(rel.from, rel.to);
        map.marriages.set(rel.to, rel.from);
      }
    });

    relationships.forEach(rel => {
      if (['biological', 'adopted', 'foster'].includes(rel.type)) {
        const parent = rel.from;
        const child = rel.to;
        
        if (!map.parentsOfChild.has(child)) {
          map.parentsOfChild.set(child, new Set());
        }
        map.parentsOfChild.get(child).add(parent);
      }
    });

    map.parentsOfChild.forEach((parents, child) => {
      const parentArray = Array.from(parents).sort();
      
      if (parentArray.length === 2) {
        const [p1, p2] = parentArray;
        const areMarried = map.marriages.get(p1) === p2;
        
        if (areMarried) {
          const key = parentArray.join('|');
          if (!map.childrenByParents.has(key)) {
            map.childrenByParents.set(key, []);
          }
          map.childrenByParents.get(key).push(child);
        }
      } else if (parentArray.length === 1) {
        const key = parentArray[0];
        if (!map.childrenByParents.has(key)) {
          map.childrenByParents.set(key, []);
        }
        map.childrenByParents.get(key).push(child);
      }
    });

    console.log(`\n📋 가족 관계:`);
    console.log(`  결혼: ${map.marriages.size / 2}쌍`);
    console.log(`  부모 그룹: ${map.childrenByParents.size}개`);
    map.childrenByParents.forEach((children, parentKey) => {
      const parentNames = parentKey.split('|')
        .map(id => this.canvasState.getPersonById(id)?.name || id)
        .join(' & ');
      const childNames = children
        .map(id => this.canvasState.getPersonById(id)?.name || id)
        .join(', ');
      console.log(`    ${parentNames} -> ${childNames}`);
    });

    return map;
  }

  applyLayout(generations, familyMap, descendantWidths) {
    const sortedGens = Array.from(generations.entries()).sort((a, b) => a[0] - b[0]);
    
    sortedGens.forEach(([level, personIds], genIndex) => {
      const y = this.START_Y + level * this.SPACING.VERTICAL;
      
      console.log(`\n🔧 세대 ${level + 1} 레이아웃 (Y=${y})`);
      
      if (genIndex === 0) {
        this.layoutFirstGeneration(personIds, y, familyMap, descendantWidths);
      } else {
        this.layoutDescendantGeneration(personIds, y, familyMap, generations, level, descendantWidths);
      }
    });
  }

  layoutFirstGeneration(personIds, y, familyMap, descendantWidths) {
    const groups = this.groupPeopleAsCouplesAndSingles(personIds, familyMap);
    
    // 양가 조부모 케이스: 각 그룹의 자손 너비 확인
    if (groups.length === 2 && groups.every(g => g.ids.length === 2)) {
      const group1Key = groups[0].ids.sort().join('|');
      const group2Key = groups[1].ids.sort().join('|');
      
      const width1 = descendantWidths.get(group1Key) || this.SPACING.HORIZONTAL;
      const width2 = descendantWidths.get(group2Key) || this.SPACING.HORIZONTAL;
      
      const totalWidth = width1 + width2;
      const minGap = 100; // 양가 간 최소 간격
      const spacing = Math.max(totalWidth / 4, minGap);
      
      const centerX = 500;
      
      console.log(`  양가 조부모 특별 배치: 자손 너비 고려 (좌:${width1}px, 우:${width2}px, 간격:${Math.round(spacing * 2)}px)`);
      
      // 첫 번째 그룹 (왼쪽)
      let x1 = centerX - spacing - this.SPACING.HORIZONTAL / 2;
      groups[0].ids.forEach(id => {
        const person = this.canvasState.getPersonById(id);
        if (person) {
          const snappedX = this.snapToGrid(x1);
          const snappedY = this.snapToGrid(y);
          console.log(`    ${person.name}: (${snappedX}, ${snappedY})`);
          person.x = snappedX;
          person.y = snappedY;
          x1 += this.SPACING.HORIZONTAL;
        }
      });
      
      // 두 번째 그룹 (오른쪽)
      let x2 = centerX + spacing - this.SPACING.HORIZONTAL / 2;
      groups[1].ids.forEach(id => {
        const person = this.canvasState.getPersonById(id);
        if (person) {
          const snappedX = this.snapToGrid(x2);
          const snappedY = this.snapToGrid(y);
          console.log(`    ${person.name}: (${snappedX}, ${snappedY})`);
          person.x = snappedX;
          person.y = snappedY;
          x2 += this.SPACING.HORIZONTAL;
        }
      });
      
      return;
    }
    
    // 일반 배치
    const totalCount = groups.reduce((sum, g) => sum + g.ids.length, 0);
    const totalWidth = (totalCount - 1) * this.SPACING.HORIZONTAL;
    let x = 500 - totalWidth / 2;

    console.log(`  총 ${groups.length}개 그룹, ${totalCount}명`);

    groups.forEach(group => {
      group.ids.forEach(id => {
        const person = this.canvasState.getPersonById(id);
        if (person) {
          const snappedX = this.snapToGrid(x);
          const snappedY = this.snapToGrid(y);
          console.log(`    ${person.name}: (${snappedX}, ${snappedY})`);
          person.x = snappedX;
          person.y = snappedY;
          x += this.SPACING.HORIZONTAL;
        }
      });
    });
  }

  /**
   * 그리드에 스냅 (50px 단위)
   */
  snapToGrid(value) {
    const gridSize = 50;
    return Math.round(value / gridSize) * gridSize;
  }

  layoutDescendantGeneration(personIds, y, familyMap, generations, currentLevel, descendantWidths) {
    // 1. 부모가 있는 자녀들 그룹화
    const childGroupsByParents = new Map();
    const peopleWithParents = new Set();

    personIds.forEach(childId => {
      const parents = familyMap.parentsOfChild.get(childId);
      
      if (parents && parents.size > 0) {
        const parentKey = Array.from(parents).sort().join('|');
        if (!childGroupsByParents.has(parentKey)) {
          childGroupsByParents.set(parentKey, []);
        }
        
        if (!childGroupsByParents.get(parentKey).includes(childId)) {
          childGroupsByParents.get(parentKey).push(childId);
        }
        peopleWithParents.add(childId);
      }
    });

    // 배우자 처리
    childGroupsByParents.forEach((childIds, parentKey) => {
      const toAdd = [];
      childIds.forEach(childId => {
        const spouse = familyMap.marriages.get(childId);
        if (spouse && personIds.includes(spouse) && !childIds.includes(spouse)) {
          const spouseParents = familyMap.parentsOfChild.get(spouse);
          if (!spouseParents || spouseParents.size === 0) {
            toAdd.push(spouse);
            peopleWithParents.add(spouse);
          }
        }
      });
      toAdd.forEach(id => childIds.push(id));
    });

    console.log(`  ${childGroupsByParents.size}개 부모 그룹`);

    // 2. 부모 그룹 정보 수집
    const parentGroupPositions = [];

    childGroupsByParents.forEach((childIds, parentKey) => {
      const parentIds = parentKey.split('|');
      const parents = parentIds
        .map(id => this.canvasState.getPersonById(id))
        .filter(p => p);

      if (parents.length === 0) return;

      const parentNames = parents.map(p => p.name).join(' & ');
      const childNames = childIds.map(id => this.canvasState.getPersonById(id)?.name).join(', ');
      console.log(`\n    부모 [${parentNames}]의 자녀 [${childNames}]:`);

      const parentCenterX = parents.reduce((sum, p) => sum + p.x, 0) / parents.length;
      console.log(`      부모 중심: X=${Math.round(parentCenterX)}`);

      const childGroups = this.groupPeopleAsCouplesAndSingles(childIds, familyMap);
      const totalCount = childGroups.reduce((sum, g) => sum + g.ids.length, 0);
      const totalWidth = (totalCount - 1) * this.SPACING.HORIZONTAL;

      parentGroupPositions.push({
        parentCenterX,
        childGroups,
        totalCount,
        totalWidth,
        parentNames,
      });
    });

    // 3. 양가 자녀 배치 모드
    if (parentGroupPositions.length === 2) {
      const [group1, group2] = parentGroupPositions;
      const gap = Math.abs(group2.parentCenterX - group1.parentCenterX);
      
      if (gap > 250) {
        console.log(`      ⚙️ 양가 자녀 배치 모드 (부모 간격: ${Math.round(gap)}px)`);
        
        let lastX = null;
        const MIN_SPACING = 50;
        
        [group1, group2].forEach((groupInfo, index) => {
          const { parentCenterX, childGroups, totalWidth, parentNames } = groupInfo;
          let startX = parentCenterX - totalWidth / 2;
          
          if (lastX !== null && startX < lastX + MIN_SPACING) {
            startX = lastX + MIN_SPACING;
            console.log(`      ⚠️ 겹침 방지: [${parentNames}] X를 ${Math.round(startX)}로 조정`);
          }
          
          let x = startX;
          console.log(`      [${parentNames}] 자녀 ${childGroups.length}개 그룹, 중앙 정렬 X=${Math.round(x)}`);
          
          childGroups.forEach(group => {
            group.ids.forEach(id => {
              const person = this.canvasState.getPersonById(id);
              if (person) {
                const snappedX = this.snapToGrid(x);
                const snappedY = this.snapToGrid(y);
                console.log(`        ${person.name}: (${snappedX}, ${snappedY})`);
                person.x = snappedX;
                person.y = snappedY;
                x += this.SPACING.HORIZONTAL;
              }
            });
          });
          
          lastX = x - this.SPACING.HORIZONTAL;
        });
        
        const orphans = personIds.filter(id => !peopleWithParents.has(id));
        if (orphans.length > 0) {
          console.log(`\n    고아 ${orphans.length}명`);
          let x = lastX + this.SPACING.HORIZONTAL + MIN_SPACING;
          orphans.forEach(id => {
            const person = this.canvasState.getPersonById(id);
            if (person) {
              const snappedX = this.snapToGrid(x);
              const snappedY = this.snapToGrid(y);
              console.log(`      ${person.name}: (${snappedX}, ${snappedY})`);
              person.x = snappedX;
              person.y = snappedY;
              x += this.SPACING.HORIZONTAL;
            }
          });
        }
        
        return;
      }
    }

    // 4. 일반 배치
    parentGroupPositions.sort((a, b) => a.parentCenterX - b.parentCenterX);

    let currentX = null;
    const SPACING_BETWEEN_PARENT_GROUPS = 50;

    parentGroupPositions.forEach((groupInfo, index) => {
      const { parentCenterX, childGroups, totalCount, totalWidth, parentNames } = groupInfo;
      
      let startX = parentCenterX - totalWidth / 2;

      if (currentX !== null && startX < currentX + SPACING_BETWEEN_PARENT_GROUPS) {
        startX = currentX + SPACING_BETWEEN_PARENT_GROUPS;
        console.log(`      ⚠️ 겹침 방지: X를 ${Math.round(startX)}로 조정`);
      }

      let x = startX;
      console.log(`      [${parentNames}] 자녀 ${childGroups.length}개 그룹, 총 ${totalCount}명, 시작X=${Math.round(x)}`);

      childGroups.forEach(group => {
        group.ids.forEach(id => {
          const person = this.canvasState.getPersonById(id);
          if (person) {
            const snappedX = this.snapToGrid(x);
            const snappedY = this.snapToGrid(y);
            console.log(`        ${person.name}: (${snappedX}, ${snappedY})`);
            person.x = snappedX;
            person.y = snappedY;
            x += this.SPACING.HORIZONTAL;
          }
        });
      });

      currentX = x - this.SPACING.HORIZONTAL;
    });

    // 5. 고아 처리
    const orphans = personIds.filter(id => !peopleWithParents.has(id));
    
    if (orphans.length > 0) {
      console.log(`\n    고아 ${orphans.length}명`);
      let x = currentX ? currentX + this.SPACING.HORIZONTAL + 50 : 1000;
      orphans.forEach(id => {
        const person = this.canvasState.getPersonById(id);
        if (person) {
          const snappedX = this.snapToGrid(x);
          const snappedY = this.snapToGrid(y);
          console.log(`      ${person.name}: (${snappedX}, ${snappedY})`);
          person.x = snappedX;
          person.y = snappedY;
          x += this.SPACING.HORIZONTAL;
        }
      });
    }
  }

  groupPeopleAsCouplesAndSingles(personIds, familyMap) {
    const groups = [];
    const processed = new Set();

    personIds.forEach(id => {
      if (processed.has(id)) return;

      const spouseId = familyMap.marriages.get(id);
      
      if (spouseId && personIds.includes(spouseId)) {
        const person = this.canvasState.getPersonById(id);
        const spouse = this.canvasState.getPersonById(spouseId);

        if (person && spouse) {
          let left, right;
          if (person.gender === 'male' && spouse.gender === 'female') {
            left = id;
            right = spouseId;
          } else if (person.gender === 'female' && spouse.gender === 'male') {
            left = spouseId;
            right = id;
          } else {
            left = id;
            right = spouseId;
          }

          groups.push({ type: 'couple', ids: [left, right] });
          processed.add(left);
          processed.add(right);
        }
      } else {
        groups.push({ type: 'single', ids: [id] });
        processed.add(id);
      }
    });

    return groups;
  }

  centerLayout(people) {
    if (people.length === 0) return;

    const xs = people.map(p => p.x);
    const ys = people.map(p => p.y);

    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const layoutCenterX = (minX + maxX) / 2;
    const layoutCenterY = (minY + maxY) / 2;

    const targetX = 500;
    const targetY = 300;

    const offsetX = targetX - layoutCenterX;
    const offsetY = targetY - layoutCenterY;

    people.forEach(person => {
      person.x += offsetX;
      person.y += offsetY;
    });

    console.log(`\n✓ 중앙 정렬: 오프셋 (${Math.round(offsetX)}, ${Math.round(offsetY)})`);
  }
}
