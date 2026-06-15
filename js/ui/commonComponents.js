/**
 * ==============================================
 * 공통 컴포넌트 (Common Components)
 * 모든 페이지에서 사용되는 헤더 컴포넌트
 * ==============================================
 */

(function() {
    'use strict';

    /**
     * 공통 헤더 HTML 생성
     */
    function getHeaderHTML() {
        return `
            <div class="header-content">
                <div class="header-left">
                    <a href="index.html" class="header-logo">
                        <span class="logo-icon">🔗</span>
                        <span class="logo-text">결속</span>
                    </a>
                </div>
                <nav class="header-nav">
                    <a href="guide.html" class="nav-link">사용 안내서</a>
                    <a href="projects.html" class="nav-link">내 프로젝트</a>
                    <a href="canvas.html" class="nav-link">캔버스</a>
                    <button id="theme-toggle" class="theme-toggle" aria-label="테마 전환" type="button">
                        <span class="theme-icon">🌙</span>
                    </button>
                </nav>
            </div>
        `;
    }

    /**
     * 헤더 렌더링
     */
    function renderHeader() {
        const headerElements = document.querySelectorAll('.header');
        
        if (headerElements.length === 0) {
            console.warn('[CommonComponents] Header element not found');
            return;
        }

        // 모든 .header 요소에 동일한 HTML 삽입
        headerElements.forEach(function(headerElement) {
            headerElement.innerHTML = getHeaderHTML();
        });

        console.log('[CommonComponents] Header rendered on', headerElements.length, 'element(s)');

        // 테마 토글 초기화
        initializeThemeToggle();
    }

    /**
     * 테마 토글 초기화
     */
    function initializeThemeToggle() {
        const themeToggle = document.getElementById('theme-toggle');
        if (!themeToggle) {
            console.warn('[CommonComponents] Theme toggle button not found');
            return;
        }

        // 현재 테마 확인 및 아이콘 설정 (통합 키 사용)
        const currentTheme = localStorage.getItem('gyeolsok-theme') || localStorage.getItem('theme') || 'dark';
        updateThemeIcon(currentTheme);

        // 클릭 이벤트
        themeToggle.addEventListener('click', function() {
            const html = document.documentElement;
            const currentTheme = html.getAttribute('data-theme') || 'dark';
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            html.setAttribute('data-theme', newTheme);
            html.style.colorScheme = newTheme;
            localStorage.setItem('gyeolsok-theme', newTheme); // 통합 키 사용
            updateThemeIcon(newTheme);
            
            console.log('[CommonComponents] Theme changed to:', newTheme);
        });

        console.log('[CommonComponents] Theme toggle initialized');
    }

    /**
     * 테마 아이콘 업데이트
     */
    function updateThemeIcon(theme) {
        const themeIcon = document.querySelector('.theme-icon');
        if (themeIcon) {
            themeIcon.textContent = theme === 'dark' ? '🌙' : '☀️';
        }
    }

    /**
     * 초기화 함수
     */
    function init() {
        console.log('[CommonComponents] Initializing...');
        renderHeader();
    }

    /**
     * 페이지 로드 시 초기화
     */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        // 이미 로드된 경우 즉시 실행
        init();
    }

    // 전역으로 노출
    window.CommonComponents = {
        renderHeader: renderHeader,
        init: init
    };

})();
