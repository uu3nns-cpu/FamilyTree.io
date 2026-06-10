# GenealogyLayoutEngine 정렬 버그 수정 계획

> **작성일**: 2026-06-10  
> **대상 파일**: `js/canvas/GenealogyLayoutEngine.js`  
> **작성자**: Claude (분석) — 이후 작업자가 이어서 수정  
> **상태**: 🔴 미착수

---

## 1. 배경 및 목적

`GenealogyLayoutEngine.js`는 Buchheim-Walker 알고리즘 기반의 가계도 자동 정렬 엔진이다.
현재 코드에는 알고리즘 핵심부에 **5개의 버그**가 존재하며, 이로 인해 자동 정렬 시 인물들이 
겹치거나, 부모-자녀 중앙 정렬이 전혀 동작하지 않거나, 세대가 잘못 배정되는 증상이 발생한다.

이 문서는 각 버그의 원인, 수정 방법, 작업 순서를 기술하며  
**다른 AI 또는 개발자가 이어서 작업할 수 있도록** 체크리스트 형식으로 관리한다.

---

## 2. 파일 구조 (관련 파일만)

```
js/canvas/
├── GenealogyLayoutEngine.js   ← 수정 대상 (핵심)
├── AutoLayout.js              ← GenealogyLayoutEngine의 래퍼 (수정 불필요)
├── Person.js                  ← 인물 데이터 클래스 (수정 불필요)
└── Relationship.js            ← 관계 데이터 클래스 (수정 불필요)
```

**진입점**: `GenealogyLayoutEngine.compute(persons, relationships)`  
**반환값**: `Map<personId, {x, y}>`  
**호출자**: `AutoLayout.layout()` → `canvasState.persons` 에 x/y 반영

---

## 3. 알고리즘 흐름 요약

```
Phase 1  _parseRelationships()   관계 데이터 파싱 → p2c, c2p, couples
Phase 2  _assignLevels()         BFS로 세대(lv) 배정
Phase 3  _buildTree()            가상 트리 구축 (CoupleNode / SingleNode)
Phase 4  _firstWalk()            Post-order: prelim X + mod 계산
Phase 5  _secondWalk()           Pre-order: modSum 전파 → 최종 X 확정
Phase 6  _resolveOverlaps()      세대별 겹침 해소 + 부모 중앙 보정
Phase 7  _toPositions()          픽셀 변환 + 그리드 스냅 + 전체 중앙 이동
```

---

## 4. 발견된 버그 목록

### BUG-01 🔴 `_firstWalk` — mod가 항상 0

**위치**: Phase 4, `_firstWalk()` 메서드 끝부분

**현재 코드**:
```js
node.prelim = childrenCenter;
node.mod    = node.prelim - childrenCenter; // 항상 0
```

**원인**:  
`mod`는 이 노드의 서브트리 전체를 나중에 평행이동할 오프셋 값이다.  
그런데 `node.prelim`에 `childrenCenter`를 대입한 직후 `node.prelim - childrenCenter`를 
계산하므로 항상 `0`이 된다.  
Buchheim-Walker에서 `mod`는 **형제 노드 간 충돌 해소 후** 확정되는 값이어야 하지만,
현재 구조에서는 자녀를 cursor=0부터 배치한 뒤 부모를 중앙으로 맞추는 방식이므로
`mod`는 `부모가 실제로 있어야 할 위치 - 자녀들의 로컬 중앙`이 되어야 한다.

**수정 방법**:  
현재 구조(cursor=0 기준 로컬 배치)를 유지한다면 `mod`는 의미가 없으므로 0으로 두되,
`_secondWalk`에서 부모의 절대 x를 기준으로 자녀를 재배치하는 방식으로 전환해야 한다.  
또는 Buchheim-Walker 표준대로 `prelim`을 형제 상대 좌표로 유지하고,  
`mod = 노드의 원하는 위치 - prelim`으로 설정해야 한다.

**권장 수정**:
```js
// _firstWalk 내부, 자녀 배치 이후
const firstChild = node.children[0];
const lastChild  = node.children[node.children.length - 1];
const childrenSpan =
  (firstChild.prelim - firstChild.width / 2 +
   lastChild.prelim  + lastChild.width  / 2);
const childrenCenter = childrenSpan / 2;

// 부모의 prelim은 형제 offset이 반영된 값이어야 하므로,
// 여기서는 로컬 중앙(childrenCenter)으로 설정하고
// mod는 0으로 둔다. 실제 위치는 _secondWalk의 offset이 결정.
node.prelim = childrenCenter;
node.mod    = 0;
// ↑ BUG-01과 BUG-02를 함께 해결하려면 아래 BUG-02 수정과 연동 필요
```

---

### BUG-02 🔴 `_firstWalk` — 자녀 배치가 cursor=0 절대 기준

**위치**: Phase 4, `_firstWalk()` 내 자녀 배치 루프

**현재 코드**:
```js
let cursor = 0;
node.children.forEach((child, i) => {
  child.prelim = cursor + child.width / 2;
  cursor += child.width + GenealogyLayoutEngine.H_GAP;
});
```

**원인**:  
모든 노드에서 `cursor = 0`으로 시작하므로 자녀들은 항상 절대 좌표 0부터 배치된다.  
이 노드가 어느 위치에 있든, 자녀는 항상 x=0, x=160, x=320... 처럼 배치된다.  
`_secondWalk`의 `modSum`으로 보정되어야 하지만, BUG-01로 인해 `mod=0`이라 전파도 안 된다.

**실제 증상**:  
서로 다른 부모를 가진 여러 형제 그룹이 모두 x=0 근처에 겹쳐서 시작되고,
Phase 6의 `_resolveOverlaps`가 이를 통째로 밀어내야 한다.
결과적으로 부모-자녀 중앙 정렬이 전혀 이루어지지 않는다.

**수정 방법**:  
`_firstWalk`는 **로컬 상대 좌표**로 자녀를 배치하는 것이 맞다. cursor=0 기준은 올바르다.  
문제는 `_secondWalk`가 이 로컬 좌표를 절대 좌표로 올바르게 변환해야 한다는 것이다.  
BUG-01 수정과 함께, `_secondWalk`에서 부모 x 기준으로 자녀를 재배치하도록 수정:

```js
// _secondWalk 수정안
static _secondWalk(node, modSum) {
  node.x = node.prelim + modSum;
  const childOffset = node.x - node.prelim; // 부모의 절대 위치 기반 offset
  node.children.forEach(child =>
    GenealogyLayoutEngine._secondWalk(child, childOffset)
  );
}
```

---

### BUG-03 🔴 `_resolveOverlaps` — 부모 중앙 보정이 재겹침 유발

**위치**: Phase 6, `_resolveOverlaps()` 내 부모 중앙 보정 루프

**현재 코드**:
```js
reversedLevs.forEach(lv => {
  const nodes = levelNodes.get(lv);
  nodes.forEach(node => {
    if (node.children.length === 0) return;
    const childXs = node.children.map(c => c.x);
    const center = (Math.min(...childXs) + Math.max(...childXs)) / 2;
    node.x = center;  // ← 부모를 이동시키지만 형제와 재겹침 검사 없음
  });
});
```

**원인**:  
겹침 해소 sweep으로 자녀들이 오른쪽으로 밀린 후,  
부모를 자녀 중앙으로 재이동시키는데 그 부모가 **같은 세대의 다른 노드와 새로 겹치는지** 
재검사하지 않는다.  
또한 부모를 이동시켜도 그 부모의 형제들은 이동되지 않으므로 위 세대에서 새로운 겹침이 생긴다.

**수정 방법**:  
부모 중앙 보정 후 해당 세대를 다시 sweep하거나,  
부모 이동 시 형제들도 함께 밀어주는 `_shiftSubtree` 방식을 사용한다.

```js
// 수정안: 부모 중앙 보정 후 해당 레벨 재sweep
reversedLevs.forEach(lv => {
  const nodes = levelNodes.get(lv);
  
  // 1) 부모 중앙 보정
  nodes.forEach(node => {
    if (node.children.length === 0) return;
    const childXs = node.children.map(c => c.x);
    const center = (Math.min(...childXs) + Math.max(...childXs)) / 2;
    node.x = center;
  });

  // 2) 보정 후 재sweep (좌→우)
  nodes.sort((a, b) => a.x - b.x);
  for (let i = 1; i < nodes.length; i++) {
    const prev = nodes[i - 1];
    const curr = nodes[i];
    const minX = prev.x + prev.width / 2 + GenealogyLayoutEngine.H_GAP / 2
               + curr.width / 2;
    if (curr.x < minX) {
      GenealogyLayoutEngine._shiftSubtree(curr, minX - curr.x);
    }
  }
});
```

---

### BUG-04 🟡 `_assignLevels` — stale BFS 조건이 `<` (같은 레벨 중복 처리 안 됨)

**위치**: Phase 2, `_assignLevels()` BFS 루프

**현재 코드**:
```js
if ((lvMap.get(id) ?? Infinity) < lv) continue; // stale 처리
```

**원인**:  
`<` 조건이라 **같은 레벨(===)의 중복 항목은 stale로 처리되지 않는다.**  
배우자 동기화 로직에서 같은 `lv`로 두 번 큐에 들어갈 수 있고,  
그때 `p2c` 처리가 중복 실행되어 일부 인물의 세대가 잘못 배정될 수 있다.

**수정 방법**:
```js
// 변경 전
if ((lvMap.get(id) ?? Infinity) < lv) continue;

// 변경 후
if ((lvMap.get(id) ?? Infinity) <= lv) continue;  // ← < 를 <= 로
```

> **주의**: 이 변경으로 인해 더 낮은(얕은) 세대로 업데이트되는 케이스가 막힐 수 있다.
> enqueue 시점에서도 `cur <= lv` 조건으로 막고 있으므로, 
> 이미 더 낮은 레벨이 배정된 노드는 큐에 들어오지 않는다. 안전하다.

---

### BUG-05 🟡 `_buildTree` — 자녀 노드가 두 부모 노드의 children에 중복 등록

**위치**: Phase 3, `_buildTree()` 부모-자녀 연결 부분

**현재 코드**:
```js
persons.forEach(p => {
  const childIds = p2c.get(p.id) || [];
  const parentNode = nodeById.get(p.id);
  childIds.forEach(cid => {
    const childNode = nodeById.get(cid);
    if (!childNode || childNode === parentNode) return;
    if (childNode.lv <= parentNode.lv) return;
    if (parentNode.children.includes(childNode)) return;  // 이 parentNode 기준만 중복 체크
    parentNode.children.push(childNode);
    if (!childNode.parent) childNode.parent = parentNode;
  });
});
```

**원인**:  
부부가 각각 `p2c`에 같은 자녀를 등록하고 있을 경우,  
두 사람이 같은 `CoupleNode`로 묶여 있더라도 `persons.forEach`에서 **두 번** 순회한다.  
첫 번째 순회: `parentNode = nodeById.get(부(父))` → `children.push(childNode)` ✅  
두 번째 순회: `parentNode = nodeById.get(모(母))` → **같은 CoupleNode**라면 스킵되지만,  
부부가 같은 노드로 묶이지 못한 타이밍/케이스에서는 다른 노드가 되어 **자녀가 두 트리에 연결**된다.

**수정 방법**:  
`persons.forEach` 대신 **노드 단위**로 순회하거나,  
자녀 연결 전 이미 자녀 노드에 부모가 있는지 확인하고 같은 CoupleNode인 경우 스킵:

```js
// 수정안: nodeByKey 단위로 순회 (중복 방지)
const processedParents = new Set();
nodeByKey.forEach((parentNode) => {
  if (processedParents.has(parentNode)) return;
  processedParents.add(parentNode);

  parentNode.ids.forEach(pid => {
    (p2c.get(pid) || []).forEach(cid => {
      const childNode = nodeById.get(cid);
      if (!childNode || childNode === parentNode) return;
      if (childNode.lv <= parentNode.lv) return;
      if (parentNode.children.includes(childNode)) return;
      parentNode.children.push(childNode);
      if (!childNode.parent) childNode.parent = parentNode;
    });
  });
});
```

---

## 5. 수정 우선순위 및 의존 관계

```
BUG-04 (독립)  →  BUG-05 (독립)  →  BUG-01 + BUG-02 (연동)  →  BUG-03
```

- BUG-04, BUG-05는 독립적으로 수정 가능 (다른 버그와 의존 없음)
- BUG-01과 BUG-02는 `_firstWalk` / `_secondWalk` 쌍으로 연동 수정해야 함
- BUG-03은 BUG-01/02 수정 후 실제 x값이 달라지므로 마지막에 수정

---

## 6. 작업 체크리스트 (Tasks)

> 상세 작업 목록은 **`docs/Tasks.md`** 참조

| Task ID | 대상 버그 | 담당 | 상태 |
|---------|-----------|------|------|
| TASK-01 | BUG-04 | — | ⬜ 미착수 |
| TASK-02 | BUG-05 | — | ⬜ 미착수 |
| TASK-03 | BUG-01 + BUG-02 | — | ⬜ 미착수 |
| TASK-04 | BUG-03 | — | ⬜ 미착수 |
| TASK-05 | 통합 테스트 | — | ⬜ 미착수 |

---

## 7. 테스트 시나리오

수정 완료 후 아래 케이스를 수동으로 확인한다.

| # | 시나리오 | 기대 결과 |
|---|----------|-----------|
| T-1 | 부모 1쌍 + 자녀 3명 | 자녀 3명이 균등 간격, 부모가 자녀 중앙 위 |
| T-2 | 3세대 직계 (조부모→부모→자녀) | 각 세대가 같은 Y, 중앙 정렬 |
| T-3 | 재혼 (자녀가 두 부모 쌍) | 자녀 중복 없이 한 부모 아래 배치 |
| T-4 | 고립 인물 (관계 없음) | 오른쪽 끝에 추가 배치 |
| T-5 | 형제 5명 이상 | 겹침 없이 좌→우 배치 |
| T-6 | 배우자 없는 단독 부모 | 부모가 자녀 중앙 위 |

---

## 8. 참고

- Buchheim-Walker 원본 논문: *"Improving Walker's Algorithm to Run in Linear Time"* (2002)
- 현재 코드의 Phase 4/5는 원본 알고리즘의 단순화 버전이며, contour 병합을 사용하지 않음
- `_resolveOverlaps`는 contour 대신 세대별 sweep으로 대체 — 이 방식 자체는 유효하나 BUG-03 수정 필요
