/**
 * UI Debug Helper
 * 개선된 UI의 로딩 및 렌더링 상태를 확인하는 디버깅 도구
 */

(function() {
    'use strict';
    
    // 페이지 로드 시 UI 상태 체크
    window.addEventListener('DOMContentLoaded', function() {
        console.log('%c🎨 UI Improved System Check', 'color: #9b8bff; font-size: 16px; font-weight: bold;');
        
        // CSS 파일 로드 확인
        checkCSSLoaded();
        
        // JavaScript 파일 로드 확인
        checkJSLoaded();
        
        // 템플릿 렌더링 확인
        setTimeout(checkTemplateRendering, 500);
        
        // 아이콘 크기 확인
        checkIconSizes();
        
        // 섹션 아이콘 확인
        checkSectionIcons();
    });
    
    function checkCSSLoaded() {
        const uiImprovedCSS = Array.from(document.styleSheets).find(sheet => 
            sheet.href && sheet.href.includes('ui-improved.css')
        );
        
        if (uiImprovedCSS) {
            console.log('%c✅ ui-improved.css 로드됨', 'color: #34c759;');
        } else {
            console.warn('%c⚠️ ui-improved.css 로드 실패', 'color: #ff9f1a;');
        }
    }
    
    function checkJSLoaded() {
        const checks = {
            'templates.js': typeof GENOGRAM_TEMPLATES !== 'undefined',
            'templateRenderer.js': typeof TemplateRenderer !== 'undefined'
        };
        
        Object.entries(checks).forEach(([file, loaded]) => {
            if (loaded) {
                console.log(`%c✅ ${file} 로드됨`, 'color: #34c759;');
            } else {
                console.warn(`%c⚠️ ${file} 로드 실패`, 'color: #ff9f1a;');
            }
        });
    }
    
    function checkTemplateRendering() {
        const templateList = document.querySelector('#templateList');
        const templateButtons = document.querySelectorAll('.template-btn');
        
        if (templateList) {
            console.log('%c✅ 템플릿 컨테이너 발견', 'color: #34c759;');
            console.log(`   렌더링된 템플릿: ${templateButtons.length}개`);
            
            if (templateButtons.length === 0) {
                console.error('%c❌ 템플릿이 렌더링되지 않음!', 'color: #ff3b30;');
                console.log('%c💡 확인사항:', 'color: #0066cc;');
                console.log('   1. templates.js가 올바르게 로드되었는가?');
                console.log('   2. templateRenderer.js가 올바르게 로드되었는가?');
                console.log('   3. 초기화 스크립트가 실행되었는가?');
            } else {
                // 카테고리별 분포 확인
                const categories = {};
                templateButtons.forEach(btn => {
                    const template = btn.dataset.template;
                    if (template) {
                        const found = GENOGRAM_TEMPLATES.find(t => t.id === template);
                        if (found) {
                            const cat = found.category || 'other';
                            categories[cat] = (categories[cat] || 0) + 1;
                        }
                    }
                });
                console.log('   카테고리별 분포:', categories);
            }
        } else {
            console.error('%c❌ 템플릿 컨테이너를 찾을 수 없음', 'color: #ff3b30;');
        }
    }
    
    function checkIconSizes() {
        const icons = {
            'icon-sm': document.querySelectorAll('.icon-sm'),
            'icon-md': document.querySelectorAll('.icon-md'),
            'icon-lg': document.querySelectorAll('.icon-lg')
        };
        
        console.log('%c🎯 아이콘 크기 분포:', 'color: #0066cc;');
        Object.entries(icons).forEach(([className, elements]) => {
            if (elements.length > 0) {
                console.log(`   ${className}: ${elements.length}개`);
            }
        });
    }
    
    function checkSectionIcons() {
        const sections = document.querySelectorAll('.sidebar-section');
        let iconCount = 0;
        
        sections.forEach((section, index) => {
            const title = section.querySelector('.sidebar-title');
            if (title) {
                const hasIcon = window.getComputedStyle(title, '::before').content !== 'none';
                if (hasIcon) iconCount++;
            }
        });
        
        console.log(`%c🎨 섹션 아이콘: ${iconCount}/${sections.length}개 표시됨`, 'color: #34c759;');
    }
    
    // 전역 디버그 함수 제공
    window.debugUI = {
        checkAll: function() {
            console.clear();
            checkCSSLoaded();
            checkJSLoaded();
            checkTemplateRendering();
            checkIconSizes();
            checkSectionIcons();
        },
        
        showTemplateData: function() {
            if (typeof GENOGRAM_TEMPLATES !== 'undefined') {
                console.table(GENOGRAM_TEMPLATES);
            } else {
                console.error('GENOGRAM_TEMPLATES가 정의되지 않음');
            }
        },
        
        testTemplateRenderer: function() {
            if (window.templateRenderer) {
                console.log('현재 활성 템플릿:', window.templateRenderer.getActiveTemplate());
                console.log('템플릿 렌더러 객체:', window.templateRenderer);
            } else {
                console.error('templateRenderer가 초기화되지 않음');
            }
        }
    };
    
    console.log('%c💡 디버그 명령어: window.debugUI.checkAll()', 'color: #0066cc; font-style: italic;');
})();
