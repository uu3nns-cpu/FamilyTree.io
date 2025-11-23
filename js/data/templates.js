/**
 * Genogram Templates Data
 * 템플릿 데이터를 별도 파일로 관리
 */

const GENOGRAM_TEMPLATES = [
    {
        id: 'blank_canvas',
        icon: '🎓',
        name: '튜토리얼 시작',
        description: '처음 사용하시나요? · 가이드와 함께 시작',
        category: 'all',
        active: true,
        isTutorial: true
    },
    {
        id: '2gen_1family_minimal',
        icon: '👨‍👩‍👧',
        name: '2세대 1가정 - 미니멀',
        description: '2세대 · 4명 · 핵가족',
        category: 'all'
    },
    {
        id: '2gen_1family_siblings',
        icon: '👨‍👩‍👧‍👦',
        name: '2세대 1가정 - 형제 많음',
        description: '2세대 · 6명 · 형제자매 많음',
        category: 'all'
    },
    {
        id: '3gen_1family_standard',
        icon: '🏠',
        name: '3세대 1가정 - 표준',
        description: '3세대 · 8명 · 조부모 포함',
        category: 'all'
    },
    {
        id: '3gen_2family',
        icon: '🏘️',
        name: '3세대 2가정 - 친가+외가',
        description: '3세대 · 12명 · 친가+외가',
        category: 'all'
    },
    {
        id: '4gen_2family_max',
        icon: '🌲',
        name: '4세대 2가정 - 최대 확장',
        description: '4세대 · 16명 · 양가 대가족',
        category: 'all'
    }
];

// 템플릿 카테고리 정의
const TEMPLATE_CATEGORIES = {
    all: {
        label: '템플릿',
        order: 1
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GENOGRAM_TEMPLATES, TEMPLATE_CATEGORIES };
}
