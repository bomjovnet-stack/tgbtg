// ==UserScript==
// @name         Lampa: YouTube Premium Edition (CSS Fix)
// @namespace    lampa-youtube-premium-css-fix
// @version      1000.3.0
// @description  Абсолютный приоритет стилей (body prefix), Tizen UI, OLED Black
// @match        *://*/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function() { 
    'use strict';

    if (window.__lampaYTPremiumCSSFix) return;
    window.__lampaYTPremiumCSSFix = true;

    var LOG_PREFIX = '🔴 [Lampa Premium]';
    function log(msg) { if (window.console && console.log) console.log(LOG_PREFIX + ' ' + msg); }

    // ============================================================
    // 1. КОНФИГУРАЦИЯ
    // ============================================================
    var CONFIG = {
        AD_DOMAINS: [
            '/vast', '/ad/', '/preroll', '/advert', 'cub-ads', '/api/ad/get', 
            'doubleclick', 'googlesyndication', 'an.yandex', 'adfox'
        ],
        PREMIUM_ENDPOINTS: [
            '/account/status', '/premium/check', '/cub/premium', 
            '/users/get', '/api/profile', '/subscription', '/verify/premium'
        ],
        AD_SELECTORS: [
            '.ad-preroll', '.ad-preroll__bg', '.lampa-advert', '#cub-advert', 
            '.player-video__advert', '.ad-banner', '[data-ad]', '.preroll',
            '.advertisement-container', '.player-footer__row', '.ad-server', 
            '.ad-video-block', '.cub-premium', '.cub-premium--detail'
        ]
    };

    function getFakePremium() {
        return {
            premium: true, pro: true, vip: true, gold: true, active: true,
            end: '2099-12-31', verification_hash: 'yt_premium_bypass_' + new Date().getTime(),
            account: { 
                premium: true, 
                profile: { id: 777, age: 99, child: false },
                token: 'premium_token_' + Math.random().toString(36).substring(2), 
                username: 'Premium_User' 
            },
            status: 200
        };
    }

    function checkMatch(url, list) {
        for (var i = 0; i < list.length; i++) {
            if (url.indexOf(list[i]) !== -1) return true;
        }
        return false;
    }

    // ============================================================
    // 2. ИНЖЕНЕРИЯ ИНТЕРФЕЙСА (MAXIMUM CSS SPECIFICITY)
    // ============================================================
    function injectPremiumDesign() {
        var styleId = 'yt-premium-css-v3';
        if (document.getElementById(styleId)) return;
        
        var style = document.createElement('style');
        style.id = styleId;
        style.type = 'text/css';
        
        // Префикс 'body ' удваивает вес селектора. Lampa не сможет его перекрыть.
        var cssText = 
            /* БЛОКИРОВКА РЕКЛАМЫ */
            CONFIG.AD_SELECTORS.join(', ') + ' { display: none !important; opacity: 0 !important; visibility: hidden !important; width: 0 !important; height: 0 !important; } ' +
            
            /* ФОНЫ (Прозрачные обертки, темный body) */
            'body { background-color: #0f0f0f !important; } ' +
            'body .wrap, body .scroll__content, body .layer--width, body .activity { background: transparent !important; } ' +
            'body .background { opacity: 0.45 !important; filter: blur(15px) !important; -webkit-mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 30%, rgba(0,0,0,0) 90%); mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 30%, rgba(0,0,0,0) 90%); } ' +
            
            /* КАРТОЧКИ ФИЛЬМОВ */
            'body .card__view { border-radius: 12px !important; overflow: hidden !important; background: transparent !important; transition: transform 0.2s ease, box-shadow 0.2s ease !important; } ' +
            'body .card.focus .card__view { transform: scale(1.05) !important; box-shadow: 0 0 0 4px #f1f1f1, 0 10px 25px rgba(0,0,0,0.8) !important; border: none !important; } ' +
            'body .card__title { font-weight: 600 !important; font-size: 1.1em !important; margin-top: 8px !important; color: #ffffff !important; text-shadow: 0 1px 3px rgba(0,0,0,0.8) !important; } ' +
            'body .card__age { background: transparent !important; color: #aaaaaa !important; font-size: 0.9em !important; font-weight: 400 !important; padding: 0 !important; text-align: left !important; margin-top: 2px !important; } ' +
            
            /* БАЗОВЫЕ ЭЛЕМЕНТЫ УПРАВЛЕНИЯ */
            'body .button, body .simple-button, body .full-start__button { border-radius: 20px !important; background-color: rgba(255,255,255,0.1) !important; font-weight: 500 !important; transition: transform 0.15s ease, background-color 0.15s ease !important; } ' +
            'body .menu__item, body .settings-param, body .selectbox-item { border-radius: 8px !important; margin: 4px 10px !important; width: calc(100% - 20px) !important; transition: transform 0.15s ease, background-color 0.15s ease !important; } ' +
            
            /* ИСПРАВЛЕНИЕ TIZEN FOCUS (Жесткое перекрытие цвета текста) */
            'body .focus { ' +
                'background-color: #f1f1f1 !important; ' +
                'background-image: none !important; ' +
                'transform: scale(1.04) !important; ' +
                'box-shadow: 0 8px 20px rgba(0,0,0,0.4) !important; ' +
                'z-index: 99; ' +
            '} ' +
            
            /* Таргетинг на КАЖДЫЙ внутренний тег внутри сфокусированного элемента */
            'body .focus, body .focus div, body .focus span, body .focus svg, body .focus use, body .focus .menu__text, body .focus .settings-param__name { ' +
                'color: #0f0f0f !important; ' +
                'fill: #0f0f0f !important; ' +
                'text-shadow: none !important; ' +
            '} ' +
            
            /* ПЛЕЕР YOUTUBE STYLE */
            'body .player-panel { background: linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.5) 70%, transparent 100%) !important; padding-bottom: 25px !important; border: none !important; } ' +
            'body .player-panel__timeline { height: 5px !important; border-radius: 3px !important; background: rgba(255,255,255,0.2) !important; } ' +
            'body .player-panel__peding { background: rgba(255,255,255,0.4) !important; } ' +
            'body .player-panel__position { background-color: #ff0000 !important; border-radius: 3px !important; } ' +
            'body .player-panel__position div { background-color: #ff0000 !important; box-shadow: 0 0 10px #ff0000 !important; width: 14px !important; height: 14px !important; top: -4.5px !important; border-radius: 50% !important; } ' +
            'body .player-info__name { font-size: 1.8em !important; font-weight: 600 !important; text-shadow: 0 2px 6px rgba(0,0,0,0.9) !important; } ' +
            
            /* ОТКЛЮЧЕНИЕ СТЕКЛА ДЛЯ ТВ ПРОИЗВОДИТЕЛЬНОСТИ */
            'body .glass, body .settings__content, body .selectbox__content, body .modal__content { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; background-color: #141414 !important; border: 1px solid #2a2a2a !important; box-shadow: 20px 0 50px rgba(0,0,0,0.9) !important; } ' +
            
            /* АППАРАТНОЕ УСКОРЕНИЕ */
            'body .selector, body .card, body .layer--render { transform: translateZ(0); -webkit-transform: translateZ(0); will-change: transform; } ' +
            '::-webkit-scrollbar { width: 0px !important; background: transparent !important; }';

        if (style.styleSheet) { style.styleSheet.cssText = cssText; } 
        else { style.appendChild(document.createTextNode(cssText)); }
        
        (document.head || document.documentElement).appendChild(style);
        try { Object.defineProperty(style, 'parentNode', { get: function() { return null; } }); style.remove = function(){}; } catch(e) {}
    }

    // ============================================================
    // 3. БЕЗОПАСНЫЙ СЕТЕВОЙ ПЕРЕХВАТ (ES5 + HLS SAFE)
    // ============================================================
    var origFreeze = Object.freeze;
    Object.freeze = function(obj) {
        if (obj && (obj.Permit || obj.premium !== undefined || obj.account_use !== undefined)) return obj;
        return origFreeze(obj);
    };

    var OrigXHR = window.XMLHttpRequest;
    if (OrigXHR) {
        window.XMLHttpRequest = function() {
            var xhr = new OrigXHR();
            var origOpen = xhr.open;
            var origSend = xhr.send;
            
            xhr.open = function(method, url) {
                this._interceptUrl = (typeof url === 'string' ? url.toLowerCase() : '');
                return origOpen.apply(this, arguments);
            };
            
            xhr.send = function(body) {
                try {
                    var url = this._interceptUrl;
                    if (url) {
                        if (checkMatch(url, CONFIG.AD_DOMAINS)) {
                            var selfBlock = this;
                            setTimeout(function() {
                                Object.defineProperty(selfBlock, 'readyState', { value: 4 });
                                Object.defineProperty(selfBlock, 'status', { value: 200 });
                                Object.defineProperty(selfBlock, 'responseText', { value: '{}' });
                                if (selfBlock.onload) selfBlock.onload();
                                if (selfBlock.onreadystatechange) selfBlock.onreadystatechange();
                            }, 0);
                            return;
                        }
                        if (checkMatch(url, CONFIG.PREMIUM_ENDPOINTS)) {
                            var selfPremium = this;
                            setTimeout(function() {
                                Object.defineProperty(selfPremium, 'readyState', { value: 4 });
                                Object.defineProperty(selfPremium, 'status', { value: 200 });
                                Object.defineProperty(selfPremium, 'responseText', { value: JSON.stringify(getFakePremium()) });
                                if (selfPremium.onload) selfPremium.onload();
                                if (selfPremium.onreadystatechange) selfPremium.onreadystatechange();
                            }, 0);
                            return;
                        }
                    }
                } catch(e) {}
                return origSend.apply(this, arguments);
            };
            return xhr;
        };
        window.XMLHttpRequest.prototype = OrigXHR.prototype;
    }

    if (window.fetch) {
        var origFetch = window.fetch;
        window.fetch = function(input, init) {
            try {
                var url = '';
                if (typeof input === 'string') url = input.toLowerCase();
                else if (input && input.url) url = input.url.toLowerCase();

                if (url) {
                    if (checkMatch(url, CONFIG.AD_DOMAINS)) {
                        return Promise.resolve(new Response('{}', { status: 200 }));
                    }
                    if (checkMatch(url, CONFIG.PREMIUM_ENDPOINTS)) {
                        return Promise.resolve(new Response(JSON.stringify(getFakePremium()), {
                            status: 200, headers: { 'Content-Type': 'application/json' }
                        }));
                    }
                }
            } catch(e) {}
            return origFetch.apply(this, arguments);
        };
    }

    // ============================================================
    // 4. ЗАХВАТ ЯДРА И FAST-LOAD
    // ============================================================
    var _lampaStore = window.Lampa;
    Object.defineProperty(window, 'Lampa', {
        get: function() { return _lampaStore; },
        set: function(val) {
            if (val && !val.__ytPremiumCSSFix) {
                val.__ytPremiumCSSFix = true;
                var _accountRef = val.Account;
                Object.defineProperty(val, 'Account', {
                    get: function() { return _accountRef; },
                    set: function(acc) {
                        if (acc) {
                            Object.defineProperty(acc, 'Permit', {
                                get: function() { return getFakePremium(); },
                                set: function() {},
                                configurable: true
                            });
                        }
                        _accountRef = acc;
                    },
                    configurable: true
                });
            }
            _lampaStore = val;
        },
        configurable: true
    });

    var origAppend = Element.prototype.appendChild;
    Element.prototype.appendChild = function(el) {
        try {
            if (el && el.tagName === 'SCRIPT' && el.src) {
                var src = el.src.toLowerCase();
                if (checkMatch(src, CONFIG.AD_DOMAINS) || src.indexOf('vast.js') !== -1 || src.indexOf('ima.js') !== -1) {
                    el.src = 'data:text/javascript;base64,Y29uc29sZS5sb2coJ0FkQmxvY2tlZCcpOw==';
                }
            }
        } catch(e) {}
        return origAppend.apply(this, arguments);
    };

    // ============================================================
    // 5. ОПТИМИЗАТОР ДВИЖКА (THROTTLE & CORE)
    // ============================================================
    var lastKeyTime = 0;
    window.addEventListener('keydown', function(e) {
        if (e.keyCode >= 37 && e.keyCode <= 40) {
            var now = new Date().getTime();
            if (now - lastKeyTime < 60) { 
                e.stopImmediatePropagation();
                e.preventDefault();
                return false;
            }
            lastKeyTime = now;
        }
    }, true);

    function enforceCoreSettings() {
        if (!window.lampa_settings) window.lampa_settings = {};
        window.lampa_settings.premium = true;
        window.lampa_settings.pro = true;
        window.lampa_settings.vip = true;
        window.lampa_settings.gold = true;
        window.lampa_settings.account_use = true;
        window.lampa_settings.fix_widget = true;
        
        window.lampa_settings.glass_style = false; 
        window.lampa_settings.mask = false;
        window.lampa_settings.advanced_animation = false;
        window.lampa_settings.light_version = true;
    }

    // ============================================================
    // 6. ЗАПУСК
    // ============================================================
    function boot() {
        injectPremiumDesign();
        enforceCoreSettings();
        // Циклическое добавление стилей (если Lampa их сбросит при навигации)
        setInterval(function() {
            injectPremiumDesign();
            enforceCoreSettings();
        }, 1500);
    }

    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', boot); } 
    else { boot(); }

    log('✅ YouTube Premium Edition загружен с абсолютным приоритетом CSS.');

})();
