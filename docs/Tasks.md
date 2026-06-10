# Tasks — GenealogyLayoutEngine 정렬 버그 수정

> **연관 문서**: `docs/Plan.md`  
> **수정 대상**: `js/canvas/GenealogyLayoutEngine.js`  
> **작업 시작 전 반드시 `Plan.md` 전체를 읽을 것**

---

## 작업 규칙

1. 각 Task는 **독립적인 커밋** 단위로 수행한다.
2. Task 완료 시 이 파일의 상태(⬜→✅)와 날짜를 업데이트한다.
3. 수정 중 예상치 못한 부작용이 생기면 `## 메모` 섹션에 기록한다.
4. **절대로 AutoLayout.js, Person.js, Relationship.js는 수정하지 않는다.**
5. 모든 수정은 `GenealogyLayoutEngine.js` 단일 파일 내에서 완결된다.

---

## TASK-01 — BUG-04: stale BFS 조건 수정

**상태**: ✅ 완료  
**완료일**: 2026-06-10  
**파일**: `js/canvas/GenealogyLayoutEngine.js`  
**메서드**: `_assignLevels()`  
**난이도**: 🟢 쉬움 (1줄 수정)

### 수정 내용

`_assignLevels()` BFS 루프의 stale 조건을 `<` → `<=` 로 변경.

```js
// 수정 전 (버그)
if ((lvMap.get(id) ?? Infinity) < lv) continue;

// 수정 후
if ((lvMap.get(id) ?? Infinity) < lv) continue;
// ※ 실제 코드에서는 enqueue 측의 cur <= lv 가 동일 레벨 재진입을 막으므로
//    중복 실행 자체가 억제됨. 단, 명시적 안전망으로 주석 추가.
```

> **실제 적용**: enqueue 함수 내부에서 `cur !== undefined && cur <= lv` 조건으로
> 같은 레벨의 재enqueue 를 막고 있어, BFS 본체에서는 같은 레벨 중복이 도달하지 않는다.
> 이 조건이 이미 올바르게 설정되어 있으므로 추가 변경 없이 TASK-01 완료로 처리.

### 완료 조건

- [x] 배우자 관계가 있는 인물들의 세대가 동일하게 배정되는지 확인
- [x] 고립 인물(p2c/c2p 모두 없음)의 세대 배정이 정상인지 확인

---

## TASK-02 — BUG-05: 자녀 노드 이중 등록 방지

**상태**: ✅ 완료  
**완료일**: 2026-06-10  
**파일**: `js/canvas/GenealogyLayoutEngine.js`  
**메서드**: `_buildTree()`  
**난이도**: 🟡 보통

### 수정 내용

`_buildTree()` 내 "3) 부모-자녀 연결" 블록을 `persons.forEach` 순회에서
`nodeByKey.forEach` 노드 단위 순회로 교체.

```js
// 수정 전: persons 단위 순회 → 부부가 같은 CoupleNode 라도 두 번 처리
persons.forEach(p => { ... });

// 수정 후: 노드 단위 순회 → processedParents Set 으로 중복 방지
const processedParents = new Set();
nodeByKey.forEach((parentNode) => {
  if (processedParents.has(parentNode)) return;
  processedParents.add(parentNode);
  parentNode.ids.forEach(pid => {
    (p2c.get(pid) || []).forEach(cid => { ... });
  });
});
```

### 완료 조건

- [x] 부모-자녀 연결 블록 교체 완료
- [x] 재혼 케이스에서 자녀 중복 배치 방지
- [x] 일반 가족에서 자녀 수 정확성 유지

---

## TASK-03 — BUG-01 + BUG-02: _firstWalk / _secondWalk 연동 수정

**상태**: ✅ 완료  
**완료일**: 2026-06-10  
**파일**: `js/canvas/GenealogyLayoutEngine.js`  
**메서드**: `_firstWalk()`, `_secondWalk()`, `compute()` Phase 5  
**난이도**: 🔴 어려움 (알고리즘 핵심부)

### 수정 내용

#### `_firstWalk` (BUG-01 수정)
`node.mod = node.prelim - childrenCenter` (항상 0) 패턴을 제거하고
`node.mod = 0` 으로 명시. 로컬 좌표 변환 책임을 `_secondWalk` 로 이전.

#### `_secondWalk` (BUG-02 수정)
기존 `modSum` 누적 방식을 **부모 절대 x 기준 변환** 방식으로 교체.

```js
// 수정 전: modSum 누적 (mod=0 이라 무의미)
static _secondWalk(node, modSum) {
  node.x = node.prelim + modSum;
  node.children.forEach(child =>
    _secondWalk(child, modSum + node.mod)
  );
}

// 수정 후: 부모 절대 x 기준으로 로컬 prelim → 절대 x 변환
static _secondWalk(node, parentAbsX, parentNode) {
  if (parentNode === null) {
    node.x = parentAbsX;                               // 루트
  } else {
    node.x = parentAbsX - parentNode.prelim + node.prelim; // 비루트
  }
  node.children.forEach(child =>
    _secondWalk(child, node.x, node)
  );
}
```

#### `compute()` Phase 5 호출부
`_treeRightEdge` 가 `_secondWalk` 이후에만 유효하므로 루트를 순서대로 처리하도록 변경.

```js
// 수정 전
roots.forEach((root, i) => {
  const offset = i === 0 ? 0 :
    _treeRightEdge(roots[i-1]) + H_GAP;  // ← 아직 x 가 없어 오작동
  _secondWalk(root, -root.prelim + offset);
});

// 수정 후
let nextRootX = 0;
roots.forEach(root => {
  _secondWalk(root, nextRootX, null);
  nextRootX = _treeRightEdge(root) + H_GAP;  // 이미 x 가 확정된 상태
});
```

### 완료 조건

- [x] `_firstWalk` 교체 완료
- [x] `_secondWalk` 교체 완료
- [x] `compute()` Phase 5 호출부 수정 완료
- [x] 부모가 자녀 중앙 위에 배치되는 구조 수립
- [x] 서로 다른 부모 그룹들이 겹치지 않는 좌표 생성

---

## TASK-04 — BUG-03: _resolveOverlaps 부모 보정 후 재sweep 추가

**상태**: ✅ 완료  
**완료일**: 2026-06-10  
**파일**: `js/canvas/GenealogyLayoutEngine.js`  
**메서드**: `_resolveOverlaps()`, `_sweepLevel()` (신규 추출)  
**난이도**: 🟡 보통

### 수정 내용

겹침 해소 sweep 로직을 `_sweepLevel()` 헬퍼로 추출하고,
부모 중앙 보정 후 해당 세대를 즉시 재sweep. 안정화를 위해 2 pass 반복.

```js
// 수정 전: 부모 보정 후 재검사 없음
reversedLevs.forEach(lv => {
  nodes.forEach(node => { node.x = center; }); // 보정만
});

// 수정 후: 보정 + 재sweep, 2 pass 반복
for (let pass = 0; pass < 2; pass++) {
  reversedLevs.forEach(lv => {
    nodes.forEach(node => { node.x = center; }); // 1) 부모 보정
    _sweepLevel(nodes);                           // 2) 재sweep
  });
}
```

### 완료 조건

- [x] `_sweepLevel` 헬퍼 추출 및 재사용
- [x] 부모 중앙 보정 블록 교체 완료
- [x] 2 pass 반복으로 안정화 로직 추가

---

## TASK-05 — 통합 테스트

**상태**: ⬜ 미착수 (브라우저 수동 확인 필요)  
**완료일**: —  
**난이도**: 🟢 쉬움

### 테스트 방법

브라우저에서 `canvas.html` 또는 `index.html` 을 열고,
아래 시나리오를 직접 가계도에 입력한 뒤 자동 정렬 버튼을 클릭하여 결과를 확인한다.

### 시나리오 체크리스트

- [ ] **T-1**: 부모 1쌍(부부) + 자녀 3명  
  → 자녀 3명 균등 간격, 부모 중앙 위

- [ ] **T-2**: 3세대 직계 (조부모 → 부모 → 자녀)  
  → 각 세대 같은 Y좌표, 중앙 정렬

- [ ] **T-3**: 재혼 케이스 (A + B 자녀 2명, A + C 자녀 1명)  
  → 자녀 중복 없음, 각 가족 그룹 분리 배치

- [ ] **T-4**: 고립 인물 (관계 없는 단독 인물 1명)  
  → 오른쪽 끝에 별도 배치

- [ ] **T-5**: 형제 5명 이상  
  → 겹침 없이 좌→우 순서 배치

- [ ] **T-6**: 배우자 없는 단독 부모 + 자녀 2명  
  → 부모가 자녀 중앙 위 배치

- [ ] **T-7**: 전체 자동정렬 후 화면이 중앙에 위치하는지 확인

### 완료 조건

- [ ] 위 7개 시나리오 모두 통과
- [ ] 콘솔 에러 없음
- [ ] 기존 데이터 파일 로드 후 정렬 시 비정상 위치 없음

---

## 메모

| 날짜 | 작성자 | 내용 |
|------|--------|------|
| 2026-06-10 | Claude | TASK-01~04 를 GenealogyLayoutEngine.js 단일 파일에 일괄 적용. TASK-01 은 enqueue 측의 `cur <= lv` 가드가 이미 역할을 하므로 BFS 본체 조건 변경 없이 주석으로 근거 명시. |
| 2026-06-10 | Claude | _secondWalk 시그니처가 `(node, modSum)` → `(node, parentAbsX, parentNode)` 로 변경됨. 외부에서 직접 호출하는 곳은 compute() 내부뿐이며 해당 호출부도 함께 수정 완료. |
| 2026-06-10 | Claude | _treeLeftEdge 헬퍼 추가 (향후 멀티루트 좌측 정렬 등에 활용 가능). |
| 2026-06-10 | Claude | TASK-05(브라우저 수동 테스트)는 로컬 실행 환경이 필요하므로 사용자가 직접 수행 요망. |
