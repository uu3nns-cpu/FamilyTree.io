/**
 * TemplateData - 템플릿 데이터 정의
 * 인물 수 기준 오름차순: 2명 → 4명 → 6명 → 8명 → 10명
 */

export const TEMPLATES = [
  // ========================================
  // ① 기본 커플 (2명)
  // ========================================
  {
    id: 'basic-couple',
    name: '기본 커플',
    description: '가장 간단한 시작점',
    icon: '👫',
    personCount: 2,
    relationshipCount: 1,
    is2Family: false,
    data: {
      people: [
        {
          id: 'person-1',
          name: '남편',
          gender: 'male',
          age: null,
          x: 300,
          y: 300,
          notes: '',
          occupation: '',
          education: '',
          tags: [],
          photo: null,
          isCT: false,
          isDeceased: false,
          color: null,
          size: 60
        },
        {
          id: 'person-2',
          name: '아내',
          gender: 'female',
          age: null,
          x: 450,
          y: 300,
          notes: '',
          occupation: '',
          education: '',
          tags: [],
          photo: null,
          isCT: false,
          isDeceased: false,
          color: null,
          size: 60
        }
      ],
      relationships: [
        {
          id: 'rel-1',
          type: 'marriage',
          from: 'person-1',
          to: 'person-2',
          status: 'current',
          notes: ''
        }
      ]
    }
  },

  // ========================================
  // ② 부부와 자녀 (4명)
  // ========================================
  {
    id: 'parents-children',
    name: '부부와 자녀',
    description: '핵가족 기본형',
    icon: '👨‍👩‍👧‍👦',
    personCount: 4,
    relationshipCount: 5,
    is2Family: false,
    data: {
      people: [
        // 부모
        {
          id: 'person-1',
          name: '아버지',
          gender: 'male',
          age: null,
          x: 300,
          y: 200,
          notes: '',
          occupation: '',
          education: '',
          tags: [],
          photo: null,
          isCT: false,
          isDeceased: false,
          color: null,
          size: 60
        },
        {
          id: 'person-2',
          name: '어머니',
          gender: 'female',
          age: null,
          x: 450,
          y: 200,
          notes: '',
          occupation: '',
          education: '',
          tags: [],
          photo: null,
          isCT: false,
          isDeceased: false,
          color: null,
          size: 60
        },
        // 자녀
        {
          id: 'person-3',
          name: '아들',
          gender: 'male',
          age: null,
          x: 300,
          y: 350,
          notes: '',
          occupation: '',
          education: '',
          tags: [],
          photo: null,
          isCT: false,
          isDeceased: false,
          color: null,
          size: 60
        },
        {
          id: 'person-4',
          name: '딸',
          gender: 'female',
          age: null,
          x: 450,
          y: 350,
          notes: '',
          occupation: '',
          education: '',
          tags: [],
          photo: null,
          isCT: false,
          isDeceased: false,
          color: null,
          size: 60
        }
      ],
      relationships: [
        // 혼인
        {
          id: 'rel-1',
          type: 'marriage',
          from: 'person-1',
          to: 'person-2',
          status: 'current',
          notes: ''
        },
        // 부모 → 아들
        {
          id: 'rel-2',
          type: 'biological',
          from: 'person-1',
          to: 'person-3',
          status: 'current',
          notes: ''
        },
        {
          id: 'rel-3',
          type: 'biological',
          from: 'person-2',
          to: 'person-3',
          status: 'current',
          notes: ''
        },
        // 부모 → 딸
        {
          id: 'rel-4',
          type: 'biological',
          from: 'person-1',
          to: 'person-4',
          status: 'current',
          notes: ''
        },
        {
          id: 'rel-5',
          type: 'biological',
          from: 'person-2',
          to: 'person-4',
          status: 'current',
          notes: ''
        }
      ]
    }
  },

  // ========================================
  // ③ 3세대 직계 (6명)
  // ========================================
  {
    id: 'three-generations',
    name: '3세대 직계',
    description: '조부모-부모-손자녀',
    icon: '👴👵👨‍👩‍👧',
    personCount: 6,
    relationshipCount: 8,
    is2Family: false,
    data: {
      people: [
        // 조부모
        {
          id: 'person-1',
          name: '할아버지',
          gender: 'male',
          age: null,
          x: 300,
          y: 100,
          notes: '',
          occupation: '',
          education: '',
          tags: [],
          photo: null,
          isCT: false,
          isDeceased: false,
          color: null,
          size: 60
        },
        {
          id: 'person-2',
          name: '할머니',
          gender: 'female',
          age: null,
          x: 450,
          y: 100,
          notes: '',
          occupation: '',
          education: '',
          tags: [],
          photo: null,
          isCT: false,
          isDeceased: false,
          color: null,
          size: 60
        },
        // 부모
        {
          id: 'person-3',
          name: '아버지',
          gender: 'male',
          age: null,
          x: 300,
          y: 250,
          notes: '',
          occupation: '',
          education: '',
          tags: [],
          photo: null,
          isCT: false,
          isDeceased: false,
          color: null,
          size: 60
        },
        {
          id: 'person-4',
          name: '어머니',
          gender: 'female',
          age: null,
          x: 450,
          y: 250,
          notes: '',
          occupation: '',
          education: '',
          tags: [],
          photo: null,
          isCT: false,
          isDeceased: false,
          color: null,
          size: 60
        },
        // 손자녀
        {
          id: 'person-5',
          name: '손자',
          gender: 'male',
          age: null,
          x: 300,
          y: 400,
          notes: '',
          occupation: '',
          education: '',
          tags: [],
          photo: null,
          isCT: false,
          isDeceased: false,
          color: null,
          size: 60
        },
        {
          id: 'person-6',
          name: '손녀',
          gender: 'female',
          age: null,
          x: 450,
          y: 400,
          notes: '',
          occupation: '',
          education: '',
          tags: [],
          photo: null,
          isCT: false,
          isDeceased: false,
          color: null,
          size: 60
        }
      ],
      relationships: [
        // 조부모 혼인
        {
          id: 'rel-1',
          type: 'marriage',
          from: 'person-1',
          to: 'person-2',
          status: 'current',
          notes: ''
        },
        // 조부모 → 아버지
        {
          id: 'rel-2',
          type: 'biological',
          from: 'person-1',
          to: 'person-3',
          status: 'current',
          notes: ''
        },
        {
          id: 'rel-3',
          type: 'biological',
          from: 'person-2',
          to: 'person-3',
          status: 'current',
          notes: ''
        },
        // 부모 혼인
        {
          id: 'rel-4',
          type: 'marriage',
          from: 'person-3',
          to: 'person-4',
          status: 'current',
          notes: ''
        },
        // 부모 → 손자
        {
          id: 'rel-5',
          type: 'biological',
          from: 'person-3',
          to: 'person-5',
          status: 'current',
          notes: ''
        },
        {
          id: 'rel-6',
          type: 'biological',
          from: 'person-4',
          to: 'person-5',
          status: 'current',
          notes: ''
        },
        // 부모 → 손녀
        {
          id: 'rel-7',
          type: 'biological',
          from: 'person-3',
          to: 'person-6',
          status: 'current',
          notes: ''
        },
        {
          id: 'rel-8',
          type: 'biological',
          from: 'person-4',
          to: 'person-6',
          status: 'current',
          notes: ''
        }
      ]
    }
  },

  // ========================================
  // ④ 양가 부모 포함 (8명) - 2가계 연결
  // ========================================
  {
    id: 'both-families',
    name: '양가 부모 포함',
    description: '결혼으로 합쳐진 양가',
    icon: '👴👵👨‍👩‍👧👴👵',
    personCount: 8,
    relationshipCount: 11,
    is2Family: true,
    data: {
      people: [
        // 시댁
        {
          id: 'person-1',
          name: '시아버지',
          gender: 'male',
          age: null,
          x: 150,
          y: 100,
          notes: '',
          occupation: '',
          education: '',
          tags: [],
          photo: null,
          isCT: false,
          isDeceased: false,
          color: null,
          size: 60
        },
        {
          id: 'person-2',
          name: '시어머니',
          gender: 'female',
          age: null,
          x: 300,
          y: 100,
          notes: '',
          occupation: '',
          education: '',
          tags: [],
          photo: null,
          isCT: false,
          isDeceased: false,
          color: null,
          size: 60
        },
        // 친정
        {
          id: 'person-3',
          name: '친정아버지',
          gender: 'male',
          age: null,
          x: 500,
          y: 100,
          notes: '',
          occupation: '',
          education: '',
          tags: [],
          photo: null,
          isCT: false,
          isDeceased: false,
          color: null,
          size: 60
        },
        {
          id: 'person-4',
          name: '친정어머니',
          gender: 'female',
          age: null,
          x: 650,
          y: 100,
          notes: '',
          occupation: '',
          education: '',
          tags: [],
          photo: null,
          isCT: false,
          isDeceased: false,
          color: null,
          size: 60
        },
        // 부부
        {
          id: 'person-5',
          name: '남편',
          gender: 'male',
          age: null,
          x: 300,
          y: 250,
          notes: '',
          occupation: '',
          education: '',
          tags: [],
          photo: null,
          isCT: false,
          isDeceased: false,
          color: null,
          size: 60
        },
        {
          id: 'person-6',
          name: '아내',
          gender: 'female',
          age: null,
          x: 450,
          y: 250,
          notes: '',
          occupation: '',
          education: '',
          tags: [],
          photo: null,
          isCT: false,
          isDeceased: false,
          color: null,
          size: 60
        },
        // 자녀
        {
          id: 'person-7',
          name: '아들',
          gender: 'male',
          age: null,
          x: 300,
          y: 400,
          notes: '',
          occupation: '',
          education: '',
          tags: [],
          photo: null,
          isCT: false,
          isDeceased: false,
          color: null,
          size: 60
        },
        {
          id: 'person-8',
          name: '딸',
          gender: 'female',
          age: null,
          x: 450,
          y: 400,
          notes: '',
          occupation: '',
          education: '',
          tags: [],
          photo: null,
          isCT: false,
          isDeceased: false,
          color: null,
          size: 60
        }
      ],
      relationships: [
        // 시댁 혼인
        {
          id: 'rel-1',
          type: 'marriage',
          from: 'person-1',
          to: 'person-2',
          status: 'current',
          notes: ''
        },
        // 친정 혼인
        {
          id: 'rel-2',
          type: 'marriage',
          from: 'person-3',
          to: 'person-4',
          status: 'current',
          notes: ''
        },
        // 시댁 → 남편
        {
          id: 'rel-3',
          type: 'biological',
          from: 'person-1',
          to: 'person-5',
          status: 'current',
          notes: ''
        },
        {
          id: 'rel-4',
          type: 'biological',
          from: 'person-2',
          to: 'person-5',
          status: 'current',
          notes: ''
        },
        // 친정 → 아내
        {
          id: 'rel-5',
          type: 'biological',
          from: 'person-3',
          to: 'person-6',
          status: 'current',
          notes: ''
        },
        {
          id: 'rel-6',
          type: 'biological',
          from: 'person-4',
          to: 'person-6',
          status: 'current',
          notes: ''
        },
        // 부부 혼인 (2가계 연결!)
        {
          id: 'rel-7',
          type: 'marriage',
          from: 'person-5',
          to: 'person-6',
          status: 'current',
          notes: ''
        },
        // 부부 → 아들
        {
          id: 'rel-8',
          type: 'biological',
          from: 'person-5',
          to: 'person-7',
          status: 'current',
          notes: ''
        },
        {
          id: 'rel-9',
          type: 'biological',
          from: 'person-6',
          to: 'person-7',
          status: 'current',
          notes: ''
        },
        // 부부 → 딸
        {
          id: 'rel-10',
          type: 'biological',
          from: 'person-5',
          to: 'person-8',
          status: 'current',
          notes: ''
        },
        {
          id: 'rel-11',
          type: 'biological',
          from: 'person-6',
          to: 'person-8',
          status: 'current',
          notes: ''
        }
      ]
    }
  },

  // ========================================
  // ⑤ 형제자매 가족 (10명) - 2가계 연결
  // ========================================
  {
    id: 'siblings-families',
    name: '형제자매 가족',
    description: '형제들의 확장 가족',
    icon: '👨‍👩‍👧👨‍👩‍👦',
    personCount: 10,
    relationshipCount: 16,
    is2Family: true,
    data: {
      people: [
        // 부모
        {
          id: 'person-1',
          name: '아버지',
          gender: 'male',
          age: null,
          x: 400,
          y: 100,
          notes: '',
          occupation: '',
          education: '',
          tags: [],
          photo: null,
          isCT: false,
          isDeceased: false,
          color: null,
          size: 60
        },
        {
          id: 'person-2',
          name: '어머니',
          gender: 'female',
          age: null,
          x: 550,
          y: 100,
          notes: '',
          occupation: '',
          education: '',
          tags: [],
          photo: null,
          isCT: false,
          isDeceased: false,
          color: null,
          size: 60
        },
        // 형/오빠
        {
          id: 'person-3',
          name: '형',
          gender: 'male',
          age: null,
          x: 250,
          y: 250,
          notes: '',
          occupation: '',
          education: '',
          tags: [],
          photo: null,
          isCT: false,
          isDeceased: false,
          color: null,
          size: 60
        },
        // 동생
        {
          id: 'person-4',
          name: '동생',
          gender: 'female',
          age: null,
          x: 700,
          y: 250,
          notes: '',
          occupation: '',
          education: '',
          tags: [],
          photo: null,
          isCT: false,
          isDeceased: false,
          color: null,
          size: 60
        },
        // 형수
        {
          id: 'person-5',
          name: '형수',
          gender: 'female',
          age: null,
          x: 400,
          y: 250,
          notes: '',
          occupation: '',
          education: '',
          tags: [],
          photo: null,
          isCT: false,
          isDeceased: false,
          color: null,
          size: 60
        },
        // 매제
        {
          id: 'person-6',
          name: '매제',
          gender: 'male',
          age: null,
          x: 550,
          y: 250,
          notes: '',
          occupation: '',
          education: '',
          tags: [],
          photo: null,
          isCT: false,
          isDeceased: false,
          color: null,
          size: 60
        },
        // 형의 자녀들
        {
          id: 'person-7',
          name: '조카1',
          gender: 'male',
          age: null,
          x: 250,
          y: 400,
          notes: '',
          occupation: '',
          education: '',
          tags: [],
          photo: null,
          isCT: false,
          isDeceased: false,
          color: null,
          size: 60
        },
        {
          id: 'person-8',
          name: '조카2',
          gender: 'female',
          age: null,
          x: 400,
          y: 400,
          notes: '',
          occupation: '',
          education: '',
          tags: [],
          photo: null,
          isCT: false,
          isDeceased: false,
          color: null,
          size: 60
        },
        // 동생의 자녀들
        {
          id: 'person-9',
          name: '조카3',
          gender: 'male',
          age: null,
          x: 550,
          y: 400,
          notes: '',
          occupation: '',
          education: '',
          tags: [],
          photo: null,
          isCT: false,
          isDeceased: false,
          color: null,
          size: 60
        },
        {
          id: 'person-10',
          name: '조카4',
          gender: 'female',
          age: null,
          x: 700,
          y: 400,
          notes: '',
          occupation: '',
          education: '',
          tags: [],
          photo: null,
          isCT: false,
          isDeceased: false,
          color: null,
          size: 60
        }
      ],
      relationships: [
        // 부모 혼인
        {
          id: 'rel-1',
          type: 'marriage',
          from: 'person-1',
          to: 'person-2',
          status: 'current',
          notes: ''
        },
        // 부모 → 형
        {
          id: 'rel-2',
          type: 'biological',
          from: 'person-1',
          to: 'person-3',
          status: 'current',
          notes: ''
        },
        {
          id: 'rel-3',
          type: 'biological',
          from: 'person-2',
          to: 'person-3',
          status: 'current',
          notes: ''
        },
        // 부모 → 동생
        {
          id: 'rel-4',
          type: 'biological',
          from: 'person-1',
          to: 'person-4',
          status: 'current',
          notes: ''
        },
        {
          id: 'rel-5',
          type: 'biological',
          from: 'person-2',
          to: 'person-4',
          status: 'current',
          notes: ''
        },
        // 형 혼인 (2가계 연결!)
        {
          id: 'rel-6',
          type: 'marriage',
          from: 'person-3',
          to: 'person-5',
          status: 'current',
          notes: ''
        },
        // 동생 혼인 (2가계 연결!)
        {
          id: 'rel-7',
          type: 'marriage',
          from: 'person-4',
          to: 'person-6',
          status: 'current',
          notes: ''
        },
        // 형부부 → 조카1
        {
          id: 'rel-8',
          type: 'biological',
          from: 'person-3',
          to: 'person-7',
          status: 'current',
          notes: ''
        },
        {
          id: 'rel-9',
          type: 'biological',
          from: 'person-5',
          to: 'person-7',
          status: 'current',
          notes: ''
        },
        // 형부부 → 조카2
        {
          id: 'rel-10',
          type: 'biological',
          from: 'person-3',
          to: 'person-8',
          status: 'current',
          notes: ''
        },
        {
          id: 'rel-11',
          type: 'biological',
          from: 'person-5',
          to: 'person-8',
          status: 'current',
          notes: ''
        },
        // 동생부부 → 조카3
        {
          id: 'rel-12',
          type: 'biological',
          from: 'person-4',
          to: 'person-9',
          status: 'current',
          notes: ''
        },
        {
          id: 'rel-13',
          type: 'biological',
          from: 'person-6',
          to: 'person-9',
          status: 'current',
          notes: ''
        },
        // 동생부부 → 조카4
        {
          id: 'rel-14',
          type: 'biological',
          from: 'person-4',
          to: 'person-10',
          status: 'current',
          notes: ''
        },
        {
          id: 'rel-15',
          type: 'biological',
          from: 'person-6',
          to: 'person-10',
          status: 'current',
          notes: ''
        }
      ]
    }
  },

  // ========================================
  // 튜토리얼 (재설계 예정 — 임시 비활성화)
  // ========================================
  /*
  {
    id: 'tutorial-edit',
    name: '튜토리얼',
    description: '실습하며 모든 기능 익히기',
    icon: '🎓',
    personCount: 12,
    relationshipCount: 20,
    is2Family: false,
    isTutorial: true,
    tutorialType: 'edit',
    data: {
      people: [
        // 증조부모
        {
          id: 'person-1',
          name: '증조할아버지',
          gender: 'male',
          age: 95,
          x: 300,
          y: 50,
          notes: '가문의 어르신',
          occupation: '은퇴',
          education: '',
          tags: ['어르신'],
          photo: null,
          isCT: false,
          isDeceased: true,
          color: null,
          size: 60
        },
        {
          id: 'person-2',
          name: '증조할머니',
          gender: 'female',
          age: 92,
          x: 450,
          y: 50,
          notes: '',
          occupation: '',
          education: '',
          tags: [],
          photo: null,
          isCT: false,
          isDeceased: true,
          color: null,
          size: 60
        },
        // 조부모 (부계)
        {
          id: 'person-3',
          name: '할아버지',
          gender: 'male',
          age: 72,
          x: 200,
          y: 150,
          notes: '',
          occupation: '은퇴',
          education: '',
          tags: [],
          photo: null,
          isCT: false,
          isDeceased: false,
          color: null,
          size: 60
        },
        {
          id: 'person-4',
          name: '할머니',
          gender: 'female',
          age: 70,
          x: 350,
          y: 150,
          notes: '',
          occupation: '',
          education: '',
          tags: [],
          photo: null,
          isCT: false,
          isDeceased: false,
          color: null,
          size: 60
        },
        // 조부모 (모계)
        {
          id: 'person-5',
          name: '외할아버지',
          gender: 'male',
          age: 75,
          x: 550,
          y: 150,
          notes: '',
          occupation: '',
          education: '',
          tags: [],
          photo: null,
          isCT: false,
          isDeceased: false,
          color: null,
          size: 60
        },
        {
          id: 'person-6',
          name: '외할머니',
          gender: 'female',
          age: 73,
          x: 700,
          y: 150,
          notes: '',
          occupation: '',
          education: '',
          tags: [],
          photo: null,
          isCT: false,
          isDeceased: false,
          color: null,
          size: 60
        },
        // 부모
        {
          id: 'person-7',
          name: '아버지',
          gender: 'male',
          age: 45,
          x: 300,
          y: 280,
          notes: '',
          occupation: '회사원',
          education: '대졸',
          tags: ['직장인'],
          photo: null,
          isCT: false,
          isDeceased: false,
          color: null,
          size: 60
        },
        {
          id: 'person-8',
          name: '어머니',
          gender: 'female',
          age: 43,
          x: 450,
          y: 280,
          notes: '',
          occupation: '주부',
          education: '대졸',
          tags: [],
          photo: null,
          isCT: false,
          isDeceased: false,
          color: null,
          size: 60
        },
        // 형제자매
        {
          id: 'person-9',
          name: '오빠',
          gender: 'male',
          age: 20,
          x: 200,
          y: 410,
          notes: '',
          occupation: '대학생',
          education: '대학재학',
          tags: ['학생'],
          photo: null,
          isCT: false,
          isDeceased: false,
          color: null,
          size: 60
        },
        {
          id: 'person-10',
          name: '나',
          gender: 'female',
          age: 18,
          x: 350,
          y: 410,
          notes: '고등학생',
          occupation: '학생',
          education: '고등학교',
          tags: ['학생', 'CT'],
          photo: null,
          isCT: true,
          isDeceased: false,
          color: '#ff6b6b',
          size: 60
        },
        {
          id: 'person-11',
          name: '남동생',
          gender: 'male',
          age: 15,
          x: 500,
          y: 410,
          notes: '',
          occupation: '학생',
          education: '중학교',
          tags: ['학생'],
          photo: null,
          isCT: false,
          isDeceased: false,
          color: null,
          size: 60
        },
        {
          id: 'person-12',
          name: '여동생',
          gender: 'female',
          age: 12,
          x: 650,
          y: 410,
          notes: '',
          occupation: '학생',
          education: '초등학교',
          tags: [],
          photo: null,
          isCT: false,
          isDeceased: false,
          color: null,
          size: 60
        }
      ],
      relationships: [
        // 증조부모
        { id: 'rel-1', type: 'marriage', from: 'person-1', to: 'person-2', status: 'current', notes: '' },
        { id: 'rel-2', type: 'biological', from: 'person-1', to: 'person-3', status: 'current', notes: '' },
        { id: 'rel-3', type: 'biological', from: 'person-2', to: 'person-3', status: 'current', notes: '' },
        
        // 조부모 (부계)
        { id: 'rel-4', type: 'marriage', from: 'person-3', to: 'person-4', status: 'current', notes: '' },
        { id: 'rel-5', type: 'biological', from: 'person-3', to: 'person-7', status: 'current', notes: '' },
        { id: 'rel-6', type: 'biological', from: 'person-4', to: 'person-7', status: 'current', notes: '' },
        
        // 조부모 (모계)
        { id: 'rel-7', type: 'marriage', from: 'person-5', to: 'person-6', status: 'current', notes: '' },
        { id: 'rel-8', type: 'biological', from: 'person-5', to: 'person-8', status: 'current', notes: '' },
        { id: 'rel-9', type: 'biological', from: 'person-6', to: 'person-8', status: 'current', notes: '' },
        
        // 부모
        { id: 'rel-10', type: 'marriage', from: 'person-7', to: 'person-8', status: 'current', notes: '' },
        
        // 자녀들
        { id: 'rel-11', type: 'biological', from: 'person-7', to: 'person-9', status: 'current', notes: '' },
        { id: 'rel-12', type: 'biological', from: 'person-8', to: 'person-9', status: 'current', notes: '' },
        { id: 'rel-13', type: 'biological', from: 'person-7', to: 'person-10', status: 'current', notes: '' },
        { id: 'rel-14', type: 'biological', from: 'person-8', to: 'person-10', status: 'current', notes: '' },
        { id: 'rel-15', type: 'biological', from: 'person-7', to: 'person-11', status: 'current', notes: '' },
        { id: 'rel-16', type: 'biological', from: 'person-8', to: 'person-11', status: 'current', notes: '' },
        { id: 'rel-17', type: 'biological', from: 'person-7', to: 'person-12', status: 'current', notes: '' },
        { id: 'rel-18', type: 'biological', from: 'person-8', to: 'person-12', status: 'current', notes: '' }
      ],
      emotionalLines: [
        // 나 → 부모 (긍정적)
        { id: 'emo-1', from: 'person-10', to: 'person-7', emotion: 'positive', notes: '아빠 좋아요' },
        { id: 'emo-2', from: 'person-10', to: 'person-8', emotion: 'positive', notes: '엄마 사랑해요' },
        
        // 나 → 형제 (복합적)
        { id: 'emo-3', from: 'person-10', to: 'person-9', emotion: 'neutral', notes: '오빠랑은 그냥 그래요' },
        { id: 'emo-4', from: 'person-10', to: 'person-11', emotion: 'negative', notes: '남동생이랑 자주 싸워요' },
        { id: 'emo-5', from: 'person-10', to: 'person-12', emotion: 'positive', notes: '여동생은 귀여워요' },
        
        // 부모간 관계
        { id: 'emo-6', from: 'person-7', to: 'person-8', emotion: 'positive', notes: '' },
        { id: 'emo-7', from: 'person-8', to: 'person-7', emotion: 'positive', notes: '' }
      ]
    },
    tutorialSteps: []
  }
  */

  // ========================================
  // 튜토리얼
  // ========================================
  {
    id: 'tutorial',
    name: '튜토리얼',
    description: '5분이면 주요 기능을 모두 익힐 수 있어요',
    icon: '🎓',
    personCount: 1,
    relationshipCount: 0,
    is2Family: false,
    isTutorial: true,
    data: {
      people: [
        {
          id: 'ct-person',
          name: '내담자',
          gender: 'male',
          age: 16,
          x: 400,
          y: 300,
          notes: '',
          occupation: '',
          education: '',
          tags: [],
          photo: null,
          isCT: true,
          isDeceased: false,
          color: null,
          size: 60
        }
      ],
      relationships: []
    },
    tutorialSteps: [
      {
        step: 1,
        title: '안녕하세요! 튜토리얼을 시작합니다 👋',
        content: `
          <div class="t-info">
            <p class="t-info__title">지금 화면에는…</p>
            <ul class="t-info__list">
              <li><strong>내담자</strong> — 16세 남성 CT(주요인물)가 캔버스 중앙에 보일 거예요</li>
            </ul>
          </div>
          <p>이번 튜토리얼에서는 가계도를 만들 때 가장 자주 쓰는 7가지 기능을 순서대로 직접 따라 해보면서 익혀볼게요. 각 단계는 안내한 대로 캔버스를 직접 조작해야 다음 단계로 넘어갈 수 있어요.</p>
          <div class="t-tip">
            진행하다가 막히는 부분이 있다면 <strong>'건너뛰기'</strong>로 다음 단계로 넘어갈 수 있고, <strong>'← 이전'</strong> 버튼을 눌러 이전 설명을 다시 확인할 수도 있어요. 천천히 따라오셔도 괜찮아요!
          </div>
        `,
        condition: 'none'
      },
      {
        step: 2,
        title: '1단계 — 부모 추가하기',
        content: `
          <p>가계도는 보통 <strong>부모님부터</strong> 연결하며 시작해요. 내담자에게 부모를 추가해볼게요.</p>
          <div class="t-steps">
            <div class="t-step">
              <span class="t-step__num">1</span>
              <span>캔버스의 <strong>내담자(사각형) 위에서 마우스 오른쪽 클릭</strong>을 해보세요</span>
            </div>
            <div class="t-step">
              <span class="t-step__num">2</span>
              <span>나타난 메뉴에서 <strong>'부모 추가'</strong>에 마우스를 가져가면 옆으로 서브메뉴가 펼쳐져요</span>
            </div>
            <div class="t-step">
              <span class="t-step__num">3</span>
              <span>서브메뉴에서 <strong>'아버지+어머니'</strong>를 클릭하면 두 분이 한 번에 추가돼요</span>
            </div>
          </div>
          <div class="t-tip">
            아버지나 어머니 한 분만 따로 추가하고 싶다면, 같은 서브메뉴에서 <strong>'아버지'</strong> 또는 <strong>'어머니'</strong>만 선택하면 됩니다.
          </div>
        `,
        condition: 'parents_added',
        conditionLabel: '내담자에게 부모를 연결해주세요',
        conditionSuccess: '부모 추가 완료! 잘하셨어요 👏'
      },
      {
        step: 3,
        title: '2단계 — 더블클릭으로 나이 입력하기',
        content: `
          <p>이번엔 방금 추가한 <strong>부모님의 나이</strong>를 입력해볼게요. 인물 위에서 더블클릭하면 정보를 편집할 수 있는 창이 열려요.</p>
          <div class="t-steps">
            <div class="t-step">
              <span class="t-step__num">1</span>
              <span>아버지 또는 어머니 도형을 <strong>마우스로 빠르게 두 번 클릭(더블클릭)</strong>하세요</span>
            </div>
            <div class="t-step">
              <span class="t-step__num">2</span>
              <span>편집창에서 <strong>'나이'</strong> 입력란에 숫자를 입력하세요</span>
            </div>
            <div class="t-step">
              <span class="t-step__num">3</span>
              <span>아래 <strong>'저장'</strong> 버튼을 눌러 변경 내용을 반영하세요</span>
            </div>
          </div>
          <div class="t-tip">
            이 편집창에서는 나이 외에도 이름, 성별, 직업, 학력, 메모 등 다양한 정보를 함께 기록할 수 있어요. 상담 중 알게 된 특이사항을 메모란에 남겨두면 나중에 다시 보기 편해요.
          </div>
        `,
        condition: 'parent_age_edited',
        conditionLabel: '부 또는 모의 나이를 입력해주세요',
        conditionSuccess: '나이 입력 완료! 😊'
      },
      {
        step: 4,
        title: '3단계 — 내담자에게 여자형제 추가하기',
        content: `
          <p>이번에는 <strong>내담자(사각형, 빨간 'CT' 배지가 붙은 도형)</strong>에게 여자형제를 추가해볼게요.</p>
          <div class="t-steps">
            <div class="t-step">
              <span class="t-step__num">1</span>
              <span><strong>내담자 위에서 마우스 오른쪽 클릭</strong>을 하세요</span>
            </div>
            <div class="t-step">
              <span class="t-step__num">2</span>
              <span>메뉴에서 <strong>'형제자매 추가'</strong>에 마우스를 올려 서브메뉴를 펼쳐보세요</span>
            </div>
            <div class="t-step">
              <span class="t-step__num">3</span>
              <span>서브메뉴에서 <strong>'여자형제'</strong>를 클릭하세요</span>
            </div>
          </div>
          <div class="t-tip">
            앞서 부모를 먼저 연결해두었기 때문에, 새로 추가되는 여자형제는 같은 부모님 아래 자동으로 연결돼요. 순서를 지키면 가계도가 훨씬 깔끔하게 만들어져요.
          </div>
        `,
        condition: 'sibling_added',
        conditionLabel: '여자형제를 추가해주세요',
        conditionSuccess: '여자형제 추가 완료!'
      },
      {
        step: 5,
        title: '4단계 — 여자형제를 사망 상태로 표시하기',
        content: `
          <p>가계도에서는 돌아가신 가족도 표시할 수 있어요. 방금 추가한 <strong>여자형제를 사망 상태</strong>로 바꿔볼게요.</p>
          <div class="t-steps">
            <div class="t-step">
              <span class="t-step__num">1</span>
              <span>여자형제 도형 위에서 <strong>마우스 오른쪽 클릭</strong>을 하세요</span>
            </div>
            <div class="t-step">
              <span class="t-step__num">2</span>
              <span>메뉴에서 <strong>'상태'</strong>에 마우스를 올려 서브메뉴를 펼치세요</span>
            </div>
            <div class="t-step">
              <span class="t-step__num">3</span>
              <span>서브메뉴에서 <strong>'사망'</strong>을 클릭하세요</span>
            </div>
          </div>
          <div class="t-tip">
            사망 처리된 인물은 도형 안에 <strong>X 표시</strong>가 나타나요. 이 표시는 ⚙️ 설정에서 언제든지 켜고 끌 수 있습니다.
          </div>
        `,
        condition: 'sibling_deceased',
        conditionLabel: '여자형제를 사망으로 표시해주세요',
        conditionSuccess: '사망 표시 완료!'
      },
      {
        step: 6,
        title: '5단계 — 자동정렬로 깔끔하게 정리하기',
        content: `
          <p>인물이 늘어날수록 도형들이 서로 겹치거나 화면이 복잡해 보일 수 있어요. <strong>자동정렬</strong> 기능을 사용하면 세대와 관계에 맞춰 한 번에 깔끔하게 배치돼요.</p>
          <div class="t-steps">
            <div class="t-step">
              <span class="t-step__num">1</span>
              <span>상단 툴바에서 <strong>'자동정렬' 버튼</strong>을 클릭해보세요</span>
            </div>
          </div>
          <div class="t-tip">
            단축키 <strong>Ctrl + Shift + L</strong>을 누르면 버튼을 클릭하지 않고도 바로 정렬할 수 있어요. 정렬 결과가 마음에 들지 않으면 '실행 취소'로 되돌릴 수 있습니다.
          </div>
        `,
        condition: 'none'
      },
      {
        step: 7,
        title: '6단계 — 감정선으로 관계의 분위기 표현하기',
        content: `
          <p>가계도에는 혈연·혼인 관계뿐 아니라 인물 사이의 <strong>감정적인 관계(감정선)</strong>도 표시할 수 있어요. 친밀함, 갈등, 단절처럼 관계의 분위기를 선의 모양으로 시각화해보겠습니다.</p>
          <div class="t-steps">
            <div class="t-step">
              <span class="t-step__num">1</span>
              <span><strong>내담자 위에서 마우스 오른쪽 클릭</strong>을 하세요</span>
            </div>
            <div class="t-step">
              <span class="t-step__num">2</span>
              <span>메뉴에서 <strong>'감정선 연결'</strong>에 마우스를 올려 서브메뉴를 펼치세요</span>
            </div>
            <div class="t-step">
              <span class="t-step__num">3</span>
              <span>원하는 관계 유형(예: <strong>'친밀한 관계'</strong>)을 클릭하면 내담자 도형에 초록색 점선 테두리가 표시돼요</span>
            </div>
            <div class="t-step">
              <span class="t-step__num">4</span>
              <span>이어서 연결할 <strong>다른 인물을 마우스로 클릭</strong>하면 두 사람 사이에 감정선이 그려져요</span>
            </div>
          </div>
          <div class="t-tip">
            친밀한 관계·사랑처럼 긍정적인 관계부터 거리감·단절·갈등·적대적·융합, 그리고 학대·방임처럼 민감한 관계까지 상황에 맞는 유형을 골라 표시할 수 있어요.
          </div>
        `,
        condition: 'emotional_added',
        conditionLabel: '인물 두 명 사이에 감정선을 연결해주세요',
        conditionSuccess: '감정선 연결 완료! 관계가 한눈에 보이네요 🎨'
      },
      {
        step: 8,
        title: '7단계 — 완성한 가계도 저장하고 내보내기',
        content: `
          <p>여기까지 잘 따라오셨어요! 이제 완성된 가계도를 <strong>저장하거나 이미지 파일로 내보내기</strong> 해볼게요.</p>
          <div class="t-steps">
            <div class="t-step">
              <span class="t-step__num">1</span>
              <span>상단의 <strong>'일시저장'</strong>: 프로젝트 이름을 지정해 저장해두면 나중에 다시 불러올 수 있어요</span>
            </div>
            <div class="t-step">
              <span class="t-step__num">2</span>
              <span>상단의 <strong>'내보내기'</strong>: 완성한 가계도를 PNG 또는 SVG 이미지 파일로 저장할 수 있어요</span>
            </div>
          </div>
          <div class="t-tip">
            ⚙️ 설정에서 자동저장을 켜두면 수정할 때마다 자동으로 저장되어 작업 내용을 잃어버릴 걱정이 줄어들어요.
          </div>
        `,
        condition: 'none'
      }
    ]
  }
];

/**
 * ID로 템플릿 가져오기
 * @param {string} templateId - 템플릿 ID
 * @returns {Object|null} 템플릿 객체
 */
export function getTemplateById(templateId) {
  return TEMPLATES.find(t => t.id === templateId) || null;
}

/**
 * 모든 템플릿 가져오기
 * @returns {Array} 템플릿 배열
 */
export function getAllTemplates() {
  return TEMPLATES;
}

/**
 * 2가계 연결형 템플릿만 가져오기
 * @returns {Array} 2가계 템플릿 배열
 */
export function get2FamilyTemplates() {
  return TEMPLATES.filter(t => t.is2Family);
}
