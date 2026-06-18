/* ========================================
   Common Header/Footer Loader
   Loads header.html and footer.html into all pages
   ======================================== */

// Header loader function
async function loadHeader() {
    console.log('🎨 Loading common header...');
    console.log('Protocol:', window.location.protocol);
    console.log('Pathname:', window.location.pathname);

    // Check if running from file:// protocol (local file system)
    if (window.location.protocol === 'file:') {
        console.log('⚠️ Running from local file system - using fallback header');
        createFallbackHeader();
        return;
    }

    try {
        // Add timestamp to prevent caching
        const timestamp = new Date().getTime();
        const response = await fetch(`components/header.html?v=6&t=${timestamp}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const headerHTML = await response.text();
        
        // Remove any existing headers
        const existingHeaders = document.querySelectorAll('header, .header');
        existingHeaders.forEach(header => header.remove());
        
        // Insert new header at the start of body
        document.body.insertAdjacentHTML('afterbegin', headerHTML);
        
        console.log('✅ Header loaded successfully');
        console.log('Header HTML length:', headerHTML.length);
        console.log('Theme toggle button:', document.querySelector('.theme-toggle'));
        
        // 현재 테마로 아이콘 업데이트
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        setTimeout(() => {
            updateThemeIcon(currentTheme);
            console.log('🎨 Theme icon updated to:', currentTheme);
        }, 50);
    } catch (error) {
        console.error('❌ Failed to load header:', error);
        // Fallback: create header programmatically
        createFallbackHeader();
    }
}

// Footer loader function
async function loadFooter() {
    console.log('🦶 Loading common footer...');

    // Check if running from file:// protocol (local file system)
    if (window.location.protocol === 'file:') {
        console.log('⚠️ Running from local file system - using fallback footer');
        createFallbackFooter();
        return;
    }

    try {
        // Add timestamp to prevent caching
        const timestamp = new Date().getTime();
        const response = await fetch(`components/footer.html?v=${timestamp}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const footerHTML = await response.text();
        
        // Find all footer elements with class dashboard-footer
        const footerElements = document.querySelectorAll('.dashboard-footer');
        
        // Insert footer content into each footer element
        footerElements.forEach(footer => {
            footer.innerHTML = footerHTML;
        });
        
        console.log(`✅ Footer loaded successfully into ${footerElements.length} element(s)`);
    } catch (error) {
        console.error('❌ Failed to load footer:', error);
        // Fallback: create footer programmatically
        createFallbackFooter();
    }
}

// Fallback footer creation
function createFallbackFooter() {
    console.log('⚠️ Using fallback footer');
    
    const footerElements = document.querySelectorAll('.dashboard-footer');
    
    const fallbackHTML = `
        <div class="footer-content">
            <div class="footer-copy">
                © 2025 결속(Gyeolsok). All Rights Reserved.
                <span class="footer-divider">|</span>
                <a href="privacy.html" class="footer-link">개인정보 보호정책</a>
                <span class="footer-divider">|</span>
                <a href="terms.html" class="footer-link">이용약관</a>
                <span class="footer-divider">|</span>
                <a href="cookie-policy.html" class="footer-link">쿠키 정책</a>
                <span class="footer-divider">|</span>
                <a href="sitemap.html" class="footer-link">사이트맵</a>
                <span class="footer-divider">|</span>
                <a href="guide.html" class="footer-link">사용 안내서</a>
                <span class="footer-divider">|</span>
                <a href="donate.html" class="footer-link">후원하기</a>
            </div>
        </div>
    `;
    
    footerElements.forEach(footer => {
        footer.innerHTML = fallbackHTML;
    });
}

// Fallback header creation
function createFallbackHeader() {
    console.log('⚠️ Using fallback header');
    
    const header = document.createElement('header');
    header.className = 'header';
    header.id = 'main-header';
    header.innerHTML = `
        <div class="header-left">
            <button class="theme-toggle" type="button" onclick="toggleTheme()" aria-label="테마 전환">
                <svg viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="5"></circle>
                    <line x1="12" y1="1" x2="12" y2="3"></line>
                    <line x1="12" y1="21" x2="12" y2="23"></line>
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                    <line x1="1" y1="12" x2="3" y2="12"></line>
                    <line x1="21" y1="12" x2="23" y2="12"></line>
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                </svg>
            </button>
        </div>
        <a href="index.html" class="header-brand" onclick="preserveTheme(event)">
            <span class="brand-mark">결속</span>
            <div class="brand-copy">
                <strong>전문가를 위한 가족 관계도 도구</strong>
            </div>
        </a>
        <div class="header-right">
            <button class="settings-btn" type="button" onclick="openSettings()" title="설정">
                <svg viewBox="0 0 24 24">
                    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                </svg>
            </button>
        </div>
    `;
    
    document.body.insertBefore(header, document.body.firstChild);
}

// ─── Theme functions ───────────────────────────────────────────────────────
// 통합 테마 키: ui-core.js의 THEME_STORAGE_KEY('gyeolsok-theme')와 동일하게 사용
const _THEME_KEY = 'gyeolsok-theme';

// ui-core.js가 로드된 경우 해당 함수를 사용하고,
// 그렇지 않은 경우(headerLoader 단독)에만 아래 함수를 등록합니다.
if (typeof window.toggleTheme !== 'function') {
    window.toggleTheme = function() {
        const html = document.documentElement;
        const currentTheme = html.getAttribute('data-theme') || 'dark';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        html.setAttribute('data-theme', newTheme);
        html.style.colorScheme = newTheme;
        localStorage.setItem(_THEME_KEY, newTheme);
        updateThemeIcon(newTheme);
        console.log(`Theme changed to: ${newTheme}`);
    };
}

if (typeof window.initializeTheme !== 'function') {
    window.initializeTheme = function() {
        // 구버전 키('theme', 'app_theme') 마이그레이션
        const legacyTheme = localStorage.getItem('theme') || localStorage.getItem('app_theme');
        if (legacyTheme && !localStorage.getItem(_THEME_KEY)) {
            localStorage.setItem(_THEME_KEY, legacyTheme);
        }
        const savedTheme = localStorage.getItem(_THEME_KEY) || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
        document.documentElement.style.colorScheme = savedTheme;
        console.log('테마 초기화:', savedTheme);
        setTimeout(() => updateThemeIcon(savedTheme), 100);
    };
}

function preserveTheme(event) {
    // 현재 테마를 localStorage에 명시적으로 저장
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    localStorage.setItem(_THEME_KEY, currentTheme);
    console.log('Theme preserved before navigation:', currentTheme);
    // 링크 기본 동작은 그대로 진행
}

function updateThemeIcon(theme) {
    const themeToggle = document.querySelector('.theme-toggle');
    console.log('updateThemeIcon called with theme:', theme);
    console.log('Theme toggle element found:', !!themeToggle);
    
    if (!themeToggle) return;
    
    if (theme === 'dark') {
        // Show sun icon (light mode available)
        console.log('Setting sun icon (dark theme)');
        themeToggle.innerHTML = `
            <svg viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            </svg>
        `;
    } else {
        // Show moon icon (dark mode available)
        console.log('Setting moon icon (light theme)');
        themeToggle.innerHTML = `
            <svg viewBox="0 0 24 24">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
        `;
    }
    
    console.log('Theme toggle innerHTML after update:', themeToggle.innerHTML);
}

function openSettings() {
    // canvas 페이지에서 실행 시 canvasPage 인스턴스를 통해 설정 모달 열기
    if (window.__canvasPage) {
        window.__canvasPage.openSettingsModal();
    } else {
        alert('설정 기능은 캔버스 페이지에서만 사용 가능합니다.');
    }
}

// Prevent multiple initializations
if (window._headerFooterInitialized) {
    console.log('⚠️ headerLoader.js already initialized - skipping');
} else {
    window._headerFooterInitialized = true;
    
    // 테마 먼저 초기화 (깜박임 방지)
    initializeTheme();
    
    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            console.log('📦 DOMContentLoaded - initializing header and footer');
            loadHeader();
            loadFooter();
        });
    } else {
        console.log('📦 DOM already ready - initializing header and footer');
        loadHeader();
        loadFooter();
    }
}

console.log('📄 headerLoader.js loaded');
