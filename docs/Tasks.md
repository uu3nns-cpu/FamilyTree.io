# Tasks — GenealogyLayoutEngine 정렬 버그 수정

> **연관 문서**: `docs/Plan.md`  
> **수정 대상**: `js/canvas/GenealogyLayoutEngine.js`, `js/canvas/GenogramRenderer.js`  
> **작업 시작 전 반드시 `Plan.md` 전체를 읽을 것**

---

## 작업 규칙

1. 각 Task는 **독립적인 커밋** 단위로 수행한다.
2. Task 완료 시 이 파일의 상태(⬜→✅)와 날짜를 업데이트한다.
3. 수정 중 예상치 못한 부작용이 생기면 `## 메모` 섹션에 기록한다.
4. **절대로 AutoLayout.js, Person.js, Relationship.js는 수정하지 않는다.**
5. GenealogyLayoutEngine.js 관련 수정은 해당 파일 내에서 완결된다.

---

## TASK-01 — BUG-04: stale BFS 조건 수정

**상태**: ✅ 완료  
**완료일**: 2026-06-10  
**파일**: `js/canvas/GenealogyLayoutEngine.js`  
**메서드**: `_assignLevels()`

### 수정 내용

`enqueue` 함수 내부에서 `cur !== undefined && cur <= lv` 조건으로
같은 레벨의 재enqueue를 이미 막고 있음을 확인. 주석으로 근거 명시.

### 완료 조건

- [x] 배우자 관계가 있는 인물들의 세대가 동일하게 배정되는지 확인
- [x] 고립 인물(p2c/c2p 모두 없음)의 세대 배정이 정상인지 확인

---

## TASK-02 — BUG-05: 자녀 노드 이중 등록 방지

**상태**: ✅ 완료  
**완료일**: 2026-06-10  
**파일**: `js/canvas/GenealogyLayoutEngine.js`  
**메서드**: `_buildTree()`

### 수정 내용

`persons.forEach` 순회 → `nodeByKey.forEach` 노드 단위 순회로 교체.  
`processedParents Set`으로 CoupleNode 중복 처리 방지.

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

### 수정 내용

- `_firstWalk`: `mod = prelim - childrenCenter (항상 0)` → `mod = 0` 명시
- `_secondWalk`: `(node, modSum)` → `(node, parentAbsX, parentNode)` 로 교체.  
  자녀 절대 x = `부모 절대 x − 부모 prelim + 자녀 prelim` 공식 적용.
- `compute()` Phase 5: 루트 순서대로 처리하도록 변경.

### 완료 조건

- [x] `_firstWalk` 교체 완료
- [x] `_secondWalk` 교체 완료
- [x] `compute()` Phase 5 호출부 수정 완료

---

## TASK-04 — BUG-03: _resolveOverlaps 부모 보정 후 재sweep 추가

**상태**: ✅ 완료  
**완료일**: 2026-06-10  
**파일**: `js/canvas/GenealogyLayoutEngine.js`  
**메서드**: `_resolveOverlaps()`, `_sweepLevel()` (신규 추출)

### 수정 내용

- `_sweepLevel()` 헬퍼 추출
- 부모 중앙 보정 후 해당 세대 즉시 재sweep
- 안정화를 위해 2 pass 반복

### 완료 조건

- [x] `_sweepLevel` 헬퍼 추출 및 재사용
- [x] 부모 중앙 보정 블록 교체 완료
- [x] 2 pass 반복으로 안정화 로직 추가

---

## TASK-06 — 렌더러: 자녀 1명 꺾은선 버그 수정

**상태**: ✅ 완료  
**완료일**: 2026-06-10  
**파일**: `js/canvas/GenogramRenderer.js`  
**메서드**: `renderParentChildGroup()`

### 원인

`renderParentChildGroup`이 자녀 수에 관계없이 항상
`coupleLineY → spineY(수직) → 수평이동 → 자녀(수직)` 의 3단 경로를 사용.  
자녀가 1명이고 `parentCenterX ≠ child.x`이면 불필요한 수평선이 그려져 꺾인 선 발생.

두 번째 증상(3세대에서도 꺾임)도 동일 원인: 부모가 1명(배우자 없음)일 때
`coupleLineY = 부모 바닥 + 14`에서 시작해 spineY까지 또 내려가는 구조.

### 수정 내용

자녀 수에 따라 분기 처리:

**케이스 A — 자녀 1명**
- `parentCenterX ≈ child.x` (오차 ≤ 2px): 완전 직선
- `parentCenterX ≠ child.x`: 중간 Y에서 한 번만 꺾어 내려옴 (L자)

**케이스 B — 자녀 2명 이상**
- 기존 spine 방식 유지. 단, 수평 이동 임계값을 `> 1` → `> 2`로 보정.

```js
// 수정 전: 항상 3단 경로
spineY = coupleLineY + (childrenTopY - coupleLineY) * 0.6;
moveTo(parentCenterX, coupleLineY) → lineTo(parentCenterX, spineY)  // 수직
moveTo(parentCenterX, spineY)      → lineTo(childrenCenterX, spineY) // 수평 (항상)
moveTo(child.x, spineY)            → lineTo(child.x, childTopY)      // 수직

// 수정 후 (자녀 1명)
if (|parentCenterX - child.x| <= 2) {
  // 완전 직선
  moveTo(parentCenterX, coupleLineY) → lineTo(parentCenterX, childTopY)
} else {
  // L자 (중간 Y에서 한 번만 꺾음)
  midY = coupleLineY + (childTopY - coupleLineY) * 0.5
  수직 → 수평 → 수직
}
```

### 완료 조건

- [x] 자녀 1명 + 부부 부모: 직선으로 연결
- [x] 자녀 1명 + 단독 부모: 직선으로 연결 (3세대 꺾임 해소)
- [x] 자녀 2명 이상: 기존 spine 방식 유지

---

## TASK-05 — 통합 테스트

**상태**: ⬜ 미착수 (브라우저 수동 확인 필요)  
**완료일**: —

### 시나리오 체크리스트

- [ ] **T-1**: 부모 1쌍(부부) + 자녀 1명 → **직선** 연결
- [ ] **T-2**: 부모 1쌍(부부) + 자녀 3명 → 균등 간격, 부모 중앙 위
- [ ] **T-3**: 3세대 직계 (조부모→부모→자녀, 각 세대 자녀 1명) → **직선** 연결
- [ ] **T-4**: 재혼 케이스 (A+B 자녀 2명, A+C 자녀 1명) → 자녀 중복 없음
- [ ] **T-5**: 고립 인물 (관계 없음) → 오른쪽 끝 별도 배치
- [ ] **T-6**: 형제 5명 이상 → 겹침 없이 좌→우 배치
- [ ] **T-7**: 배우자 없는 단독 부모 + 자녀 2명 → 부모 중앙 위
- [ ] **T-8**: 전체 자동정렬 후 화면 중앙 위치 확인

### 완료 조건

- [ ] 위 8개 시나리오 모두 통과
- [ ] 콘솔 에러 없음
- [ ] 기존 데이터 파일 로드 후 정렬 시 비정상 위치 없음

---

## 메모

| 날짜 | 작성자 | 내용 |
|------|--------|------|
| 2026-06-10 | Claude | TASK-01~04: GenealogyLayoutEngine.js 정렬 버그 일괄 수정. |
| 2026-06-10 | Claude | _secondWalk 시그니처 `(node, modSum)` → `(node, parentAbsX, parentNode)` 로 변경. compute() 호출부 함께 수정. |
| 2026-06-10 | Claude | TASK-06: GenogramRenderer.js renderParentChildGroup 분기 수정. 자녀 1명 케이스에서 꺾은선 제거. 3세대 직계 꺾임 버그도 동일 수정으로 해소. |
| 2026-06-10 | Claude | TASK-05 테스트 시나리오에 T-1(자녀 1명 직선), T-3(3세대 직선) 추가하여 8개로 업데이트. |
