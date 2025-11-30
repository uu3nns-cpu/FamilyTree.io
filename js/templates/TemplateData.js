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
  // 튜토리얼
  // ========================================
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
    tutorialSteps: [
      {
        step: 1,
        title: '튜토리얼 시작!',
        instruction: `
          <p style="margin-bottom: 16px; font-size: 16px;">환영합니다! 가계도 만들기를 처음부터 배워보겠습니다.</p>
          
          <p style="margin-bottom: 12px;">이 튜토리얼에서는 <strong>이미 만들어진 4세대 12명의 가계도</strong>를 수정하며 모든 기능을 실습해볼 수 있습니다.</p>
          
          <div style="background: var(--color-bg-tertiary); padding: 16px; border-radius: 8px; margin-bottom: 12px;">
            <p style="margin: 0 0 12px 0; font-weight: 600;">포함된 인물</p>
            <p style="margin: 0 0 6px 0;">• 증조부모 (고인)</p>
            <p style="margin: 0 0 6px 0;">• 조부모 (친가, 외가)</p>
            <p style="margin: 0 0 6px 0;">• 부모</p>
            <p style="margin: 0;">• 형제자매 4명 (본인 포함)</p>
          </div>
          
          <div style="background: var(--color-bg-tertiary); padding: 16px; border-radius: 8px; margin-bottom: 12px;">
            <p style="margin: 0 0 12px 0; font-weight: 600;">배울 내용</p>
            <p style="margin: 0 0 6px 0;">• 인물 추가/삭제/수정</p>
            <p style="margin: 0 0 6px 0;">• 관계선 연결하기</p>
            <p style="margin: 0 0 6px 0;">• 감정선 표현하기</p>
            <p style="margin: 0 0 6px 0;">• 화면 조작 및 자동 정렬</p>
            <p style="margin: 0;">• 설정 및 내보내기</p>
          </div>
          
          <p style="color: var(--color-text-tertiary); font-size: 14px;">언제든 우측 상단의 [✕ 종료] 버튼을 클릭하면 튜토리얼을 빠져나갈 수 있습니다.</p>
        `,
        highlight: null,
        nextCondition: 'complete'
      },
      {
        step: 2,
        title: '화면 탐색하기',
        instruction: `
          <p style="margin-bottom: 16px;">먼저 전체 가계도를 살펴보겠습니다.</p>
          
          <div style="background: var(--color-bg-tertiary); padding: 16px; border-radius: 8px; margin-bottom: 12px;">
            <p style="margin: 0 0 12px 0; font-weight: 600;">화면 조작 방법</p>
            <p style="margin: 0 0 8px 0;">• <strong>마우스 휠</strong>: 확대/축소</p>
            <p style="margin: 0 0 8px 0;">• <strong>스페이스 + 드래그</strong>: 화면 이동</p>
            <p style="margin: 0;">• <strong>우측 하단 버튼</strong>: +/- 버튼으로도 확대/축소 가능</p>
          </div>
          
          <p style="color: var(--color-primary); font-weight: 600;">화면을 이동하거나 확대/축소해보세요!</p>
        `,
        highlight: null,
        nextCondition: 'userInteracted'
      },
      {
        step: 3,
        title: '인물 추가하기',
        instruction: `
          <p style="margin-bottom: 16px;">가계도에 <strong>새로운 인물을 추가</strong>하는 방법을 배워보겠습니다.</p>
          
          <div style="background: var(--color-bg-tertiary); padding: 16px; border-radius: 8px; margin-bottom: 16px;">
            <p style="margin: 0 0 12px 0; font-weight: 600;">💡 인물 추가 방법</p>
            <p style="margin: 0 0 8px 0;">• 캔버스의 <strong>빈 곳을 더블클릭</strong></p>
            <p style="margin: 0;">• 또는 빈 곳을 <strong>우클릭</strong> 후 "인물 추가" 선택</p>
          </div>
          
          <p style="color: var(--color-primary); font-weight: 600;">캔버스에 새로운 인물을 추가해보세요!</p>
          <p style="color: var(--color-text-tertiary); font-size: 14px; margin-top: 12px;">※ 추가한 인물은 다음 단계에서 삭제해볼 겁니다.</p>
        `,
        highlight: 'canvas',
        nextCondition: 'personCount >= 13'
      },
      {
        step: 4,
        title: '인물 삭제하기',
        instruction: `
          <p style="margin-bottom: 16px;">가계도를 정리하다 보면 <strong>불필요한 인물을 삭제</strong>해야 할 때가 있습니다.</p>
          
          <div style="background: var(--color-bg-tertiary); padding: 16px; border-radius: 8px; margin-bottom: 16px;">
            <p style="margin: 0 0 12px 0; font-weight: 600;">삭제 방법</p>
            <p style="margin: 0 0 8px 0;">1. 삭제할 인물을 <strong>우클릭</strong></p>
            <p style="margin: 0 0 8px 0;">2. 메뉴에서 <strong>"삭제"</strong> 선택</p>
            <p style="margin: 0; color: var(--color-text-tertiary); font-size: 14px;">※ 인물과 연결된 모든 관계선도 함께 삭제됩니다</p>
          </div>
          
          <p style="color: var(--color-primary); font-weight: 600;">"증조할아버지"를 우클릭하고 삭제해보세요!</p>
        `,
        highlight: 'person-1',
        nextCondition: 'person-1-deleted'
      },
      {
        step: 5,
        title: '인물 정보 수정하기',
        instruction: `
          <p style="margin-bottom: 16px;">가계도의 인물 정보를 <strong>실제 정보로 변경</strong>해보겠습니다.</p>
          
          <div style="background: var(--color-bg-tertiary); padding: 16px; border-radius: 8px; margin-bottom: 16px;">
            <p style="margin: 0 0 12px 0; font-weight: 600;">수정 방법</p>
            <p style="margin: 0 0 8px 0;">• <strong>더블클릭</strong>: 인물 편집 창 열기</p>
            <p style="margin: 0 0 8px 0;">• <strong>우클릭</strong>: 빠른 수정 메뉴</p>
            <p style="margin: 0; color: var(--color-text-tertiary); font-size: 14px;">→ "이름 수정", "나이 수정" 등</p>
          </div>
          
          <p style="color: var(--color-primary); font-weight: 600;">"나" 인물을 더블클릭하여 정보를 수정해보세요!</p>
        `,
        highlight: 'person-10',
        nextCondition: 'person-10-edited'
      },
      {
        step: 6,
        title: '감정선 표현하기',
        instruction: `
          <p style="margin-bottom: 16px;">가족 간의 <strong>감정적 관계</strong>를 표현해보겠습니다.</p>
          
          <div style="background: var(--color-bg-tertiary); padding: 16px; border-radius: 8px; margin-bottom: 16px;">
            <p style="margin: 0 0 12px 0; font-weight: 600;">💡 감정선이란?</p>
            <p style="margin: 0;">가족 구성원 간의 <strong>심리적·정서적 관계</strong>를 시각화한 선입니다.</p>
          </div>
          
          <div style="background: var(--color-bg-tertiary); padding: 16px; border-radius: 8px; margin-bottom: 16px;">
            <p style="margin: 0 0 12px 0; font-weight: 600;">💡 감정선 표시하기</p>
            <p style="margin: 0 0 8px 0;">우측 상단의 <strong>"감정선 표시"</strong> 버튼을 클릭하면 숨겨진 감정선을 볼 수 있습니다.</p>
            <p style="margin: 0; color: var(--color-text-tertiary); font-size: 14px;">※ 설정 메뉴에서도 켜고 끌 수 있습니다</p>
          </div>
          
          <div style="background: var(--color-bg-tertiary); padding: 16px; border-radius: 8px; margin-bottom: 16px;">
            <p style="margin: 0 0 12px 0; font-weight: 600;">💡 감정선 추가하기</p>
            <p style="margin: 0 0 8px 0;">1. 첫 번째 인물을 <strong>우클릭</strong></p>
            <p style="margin: 0 0 8px 0;">2. "감정선 추가" 메뉴에서 감정 선택</p>
            <p style="margin: 0;">3. 두 번째 인물을 <strong>클릭</strong>하여 연결</p>
          </div>
          
          <div style="background: var(--color-bg-tertiary); padding: 16px; border-radius: 8px; margin-bottom: 16px;">
            <p style="margin: 0 0 12px 0; font-weight: 600;">💡 감정 종류</p>
            <p style="margin: 0 0 6px 0;">• 긍정적: 조화로운, 친밀한, 사랑</p>
            <p style="margin: 0 0 6px 0;">• 부정적: 멀어진, 단절, 불화</p>
            <p style="margin: 0;">• 기타: 적대적, 융합된, 학대</p>
          </div>
          
          <p style="color: var(--color-primary); font-weight: 600;">감정선 표시 버튼을 클릭하고, 인물들 사이에 감정선을 하나 추가해보세요!</p>
        `,
        highlight: 'emotional-mode-btn',
        nextCondition: 'emotionalLineCount >= 8'
      },
      {
        step: 7,
        title: '설정 메뉴 둘러보기',
        instruction: `
          <p style="margin-bottom: 16px;">오른쪽 상단의 <strong>⚙️ 버튼</strong>을 클릭하면 다양한 설정을 변경할 수 있습니다.</p>
          
          <div style="background: var(--color-bg-tertiary); padding: 16px; border-radius: 8px; margin-bottom: 12px;">
            <p style="margin: 0 0 12px 0; font-weight: 600;">💡 화면 설정</p>
            <p style="margin: 0 0 6px 0;">• <strong>그리드</strong>: 점선, 실선, 숨김 선택</p>
            <p style="margin: 0;">• <strong>선 두께</strong>: 가느다람, 보통, 굵게</p>
          </div>
          
          <div style="background: var(--color-bg-tertiary); padding: 16px; border-radius: 8px; margin-bottom: 12px;">
            <p style="margin: 0 0 12px 0; font-weight: 600;">💡 표시 설정</p>
            <p style="margin: 0 0 6px 0;">• <strong>이름/나이 표시</strong>: 인물 정보 보기/숨김</p>
            <p style="margin: 0;">• <strong>감정선 표시</strong>: 감정선 보기/숨김</p>
          </div>
          
          <div style="background: var(--color-bg-tertiary); padding: 16px; border-radius: 8px; margin-bottom: 16px;">
            <p style="margin: 0 0 12px 0; font-weight: 600;">💡 편의 기능</p>
            <p style="margin: 0 0 6px 0;">• <strong>마그넷</strong>: 그리드에 자동 정렬</p>
            <p style="margin: 0;">• <strong>자동 저장</strong>: 주기적으로 자동 저장</p>
          </div>
          
          <p style="color: var(--color-primary); font-weight: 600;">설정 버튼을 클릭해서 다양한 옵션을 확인해보세요!</p>
        `,
        highlight: 'settings-button',
        nextCondition: 'complete'
      },
      {
        step: 8,
        title: '내보내기 기능',
        instruction: `
          <p style="margin-bottom: 16px;">완성된 가계도를 다양한 형식으로 내보낼 수 있습니다.</p>
          
          <div style="background: var(--color-bg-tertiary); padding: 16px; border-radius: 8px; margin-bottom: 16px;">
            <p style="margin: 0 0 12px 0; font-weight: 600;">📤 내보내기 형식</p>
            <p style="margin: 0 0 6px 0;">• <strong>PNG 이미지</strong>: 고품질 이미지 파일</p>
            <p style="margin: 0 0 6px 0;">• <strong>PDF 문서</strong>: 인쇄 가능한 PDF 파일</p>
            <p style="margin: 0;">• <strong>JSON 데이터</strong>: 백업 및 공유용 데이터</p>
          </div>
          
          <div style="background: var(--color-bg-tertiary); padding: 16px; border-radius: 8px; margin-bottom: 16px;">
            <p style="margin: 0 0 12px 0; font-weight: 600;">💡 참고사항</p>
            <p style="margin: 0;">이미지는 현재 화면에 보이는 부분만 내보냅니다.</p>
          </div>
          
          <p style="color: var(--color-text-tertiary); font-size: 14px;">내보내기 기능은 상단의 "📥 내보내기" 버튼을 클릭하면 사용할 수 있습니다.</p>
        `,
        highlight: 'export-button',
        nextCondition: 'complete'
      },
      {
        step: 9,
        title: '튜토리얼 완료!',
        instruction: `
          <p style="margin-bottom: 16px; font-size: 16px;"><strong>축하합니다!</strong> 모든 기본 기능을 익혔습니다!</p>
          
          <div style="background: var(--color-bg-tertiary); padding: 16px; border-radius: 8px; margin-bottom: 16px;">
            <p style="margin: 0 0 12px 0; font-weight: 600;">배운 내용 정리</p>
            <p style="margin: 0 0 6px 0;">• 화면 탐색 (확대/축소/이동)</p>
            <p style="margin: 0 0 6px 0;">• 인물 추가/삭제/수정</p>
            <p style="margin: 0 0 6px 0;">• 감정선 표현하기</p>
            <p style="margin: 0 0 6px 0;">• 다양한 설정 옵션</p>
            <p style="margin: 0;">• 내보내기 기능</p>
          </div>
          
          <div style="background: var(--color-bg-tertiary); padding: 16px; border-radius: 8px; margin-bottom: 16px;">
            <p style="margin: 0 0 12px 0; font-weight: 600;">유용한 팁</p>
            <p style="margin: 0 0 6px 0;">• <strong>인물 드래그</strong>: 원하는 위치로 이동</p>
            <p style="margin: 0 0 6px 0;">• <strong>우클릭 메뉴</strong>: 모든 편집 기능 빠르게 접근</p>
            <p style="margin: 0 0 6px 0;">• <strong>자동 저장</strong>: 설정에서 활성화 권장</p>
            <p style="margin: 0;">• <strong>수동 저장</strong>: 작업 중간중간 저장 하세요</p>
          </div>
          
          <p style="font-size: 16px; font-weight: 600;">이제 자유롭게 가계도를 만들어보세요!</p>
        `,
        highlight: null,
        nextCondition: 'complete'
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
