# 레이아웃 아키텍처 — 단일 진실의 원천

> **최종 업데이트**: 2026-06-10 (통폐합 리팩터링)

---

## 파일 구조 (현재 기준)

```
js/canvas/
├── GenealogyLayoutEngine.js   ← ✅ 레이아웃 로직 전체 (유일한 수정 대상)
├── AutoLayout.js              ← ⚠️  re-export 심만 남음. 수정하지 말 것.
│                                    import { GenealogyLayoutEngine as AutoLayout }
│                                    from './GenealogyLayoutEngine.js';
├── Person.js                  ← 인물 데이터 클래스
├── Relationship.js            ← 관계 데이터 클래스
├── GenogramRenderer.js        ← Canvas 2D 렌더링 (레이아웃과 무관)
└── renderers/
    └── EmotionalRenderer.js   ← 감정선 렌더링

js/pages/
└── canvas.js                  ← 진입점. GenealogyLayoutEngine을 직접 import.

js/render.js                   ← ⛔ 폐기됨. canvas.html에 로드 안 됨. 삭제 예정.
```

---

## 호출 흐름

```
canvas.html
  └─ <script type="module" src="js/pages/canvas.js">
       └─ import { GenealogyLayoutEngine }
            └─ new GenealogyLayoutEngine(canvasState)
                 ├─ this.autoLayout.layout()         ← 자동정렬 버튼 / 단축키
                 └─ this.autoLayout.layout()         ← 템플릿 최초 로드 시
```

---

## 레이아웃 알고리즘 (GenealogyLayoutEngine)

Buchheim-Walker 알고리즘 기반 7단계:

| Phase | 설명 |
|-------|------|
| 1 | 관계 파싱 → `p2c` / `c2p` / `couples` |
| 2 | BFS 세대 배정 → `lvMap` |
| 3 | 가상 트리 구축 (CoupleNode / SingleNode) |
| 4 | Post-order prelim X 계산 (`_firstWalk`) |
| 5 | Pre-order final X 계산 (`_secondWalk`) |
| 6 | 겹침 해소 (`_resolveOverlaps` + sweep) |
| 7 | 픽셀 변환 + 그리드 스냅 + 전체 중앙 이동 |

---

## 레이아웃 규칙 (S-1 ~ S-6)

- **S-1** 같은 세대는 동일 Y
- **S-2** 위가 오래된 세대 (lv 0 = 최상위)
- **S-3** 부부: 남성 왼쪽, 여성 오른쪽
- **S-4** 형제: 왼쪽이 첫째 (relationship 배열 순서)
- **S-5** 부모는 자녀 중앙 위
- **S-6** 겹침 금지

---

## 상수

| 상수 | 값 | 설명 |
|------|-----|------|
| `H_GAP` | 160px | 인물 간 최소 수평 간격 |
| `V_GAP` | 200px | 세대 간 수직 간격 |
| `COUPLE_GAP` | 10px | 부부 사이 추가 간격 |
| `GRID` | 50px | 그리드 스냅 단위 |

---

## 수정 시 주의사항

1. **레이아웃 수정은 `GenealogyLayoutEngine.js` 하나만** 수정한다.
2. `AutoLayout.js`는 건드리지 않는다 (re-export 심).
3. `render.js`는 폐기됨 — 수정해도 아무 효과 없다.
4. `canvas.js`는 `this.autoLayout.layout()`으로 레이아웃을 호출한다.
   인스턴스는 `new GenealogyLayoutEngine(this.canvasState)`.
