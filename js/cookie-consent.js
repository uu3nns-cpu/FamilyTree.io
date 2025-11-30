/**
 * Cookie Consent Manager
 * GDPR/개인정보보호법 준수를 위한 쿠키 동의 관리
 */

class CookieConsent {
    constructor() {
        this.consentKey = 'cookieConsent';
        this.consentStatus = this.getConsentStatus();

        // 동의 여부에 따라 Analytics 로드
        if (this.consentStatus === 'accepted') {
            this.enableAnalytics();
        } else if (this.consentStatus === null) {
            // 처음 방문자
            this.showBanner();
        }
    }

    getConsentStatus() {
        const consent = localStorage.getItem(this.consentKey);
        return consent; // 'accepted', 'rejected', null
    }

    setConsent(status) {
        localStorage.setItem(this.consentKey, status);
        this.consentStatus = status;
    }

    showBanner() {
        // 배너가 이미 존재하면 return
        if (document.getElementById('cookieConsentBanner')) {
            return;
        }

        const banner = document.createElement('div');
        banner.id = 'cookieConsentBanner';
        banner.className = 'cookie-consent-banner';
        banner.innerHTML = `
            <div class="cookie-consent-content">
                <div class="cookie-consent-text">
                    <h3>🍪 쿠키 사용 안내</h3>
                    <p>
                        본 웹사이트는 Google Analytics를 통해 사용자 경험을 개선하기 위해 쿠키를 사용합니다.
                        쿠키 사용에 동의하시면 서비스 이용 통계 분석에 도움이 됩니다.
                        <a href="privacy.html" target="_blank" class="cookie-link">자세히 보기</a>
                    </p>
                </div>
                <div class="cookie-consent-actions">
                    <button id="cookieAccept" class="cookie-btn cookie-btn-accept">동의</button>
                    <button id="cookieReject" class="cookie-btn cookie-btn-reject">거부</button>
                </div>
            </div>
        `;

        document.body.appendChild(banner);

        // 이벤트 리스너 추가
        document.getElementById('cookieAccept').addEventListener('click', () => {
            this.acceptCookies();
        });

        document.getElementById('cookieReject').addEventListener('click', () => {
            this.rejectCookies();
        });
    }

    hideBanner() {
        const banner = document.getElementById('cookieConsentBanner');
        if (banner) {
            banner.classList.add('cookie-consent-hide');
            setTimeout(() => {
                banner.remove();
            }, 300);
        }
    }

    acceptCookies() {
        this.setConsent('accepted');
        this.hideBanner();
        this.enableAnalytics();
        this.showToast('쿠키 사용에 동의하셨습니다.', 'success');
    }

    rejectCookies() {
        this.setConsent('rejected');
        this.hideBanner();
        this.disableAnalytics();
        this.showToast('쿠키 사용을 거부하셨습니다. 일부 기능이 제한될 수 있습니다.', 'info');
    }

    enableAnalytics() {
        // Google Analytics 활성화
        if (typeof gtag !== 'undefined') {
            gtag('consent', 'update', {
                'analytics_storage': 'granted'
            });
            console.log('Google Analytics enabled');
        }
    }

    disableAnalytics() {
        // Google Analytics 비활성화
        if (typeof gtag !== 'undefined') {
            gtag('consent', 'update', {
                'analytics_storage': 'denied'
            });
            console.log('Google Analytics disabled');
        }

        // GA 쿠키 삭제
        this.deleteCookies(['_ga', '_gid', '_gat']);
    }

    deleteCookies(cookieNames) {
        cookieNames.forEach(name => {
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        });
    }

    showToast(message, type = 'info') {
        // 간단한 토스트
        const toast = document.createElement('div');
        toast.className = 'cookie-toast';
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('cookie-toast-hide');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // 설정 페이지 등에서 동의 상태 재설정 가능
    resetConsent() {
        localStorage.removeItem(this.consentKey);
        this.consentStatus = null;
        this.disableAnalytics();
        this.showBanner();
    }
}

// 페이지 로드 시 자동 초기화
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.cookieConsent = new CookieConsent();
    });
} else {
    window.cookieConsent = new CookieConsent();
}
