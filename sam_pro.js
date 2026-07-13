// ==UserScript==
// @name         Lampa: YouTube Premium & OLED Edition
// @namespace    lampa-youtube-premium
// @version      1000.0.0
// @description  Дизайн уровня YouTube TV, абсолютный черный фон (OLED), оптимизация Tizen и обход подписок
// @match        *://*/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function() { 
    'use strict';

    if (window.__lampaYouTubePremium) return;
    window.__lampaYouTubePremium = true;

    var LOG_PREFIX = '🔴 [Lampa Premium]';
    function log(msg) { if (window.console && console.log) console.log(LOG_PREFIX + ' ' + msg); }

    // ============================================================
    // 1. КОНФИГУРАЦИЯ СИСТЕМЫ И БЛОКИРОВОК
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
                profile: { id: 777, age: 99, child: false }, // Открывает весь 18+ контент
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
    // 2. ИНЖЕНЕРИЯ ИНТЕРФЕЙСА (YOUTUBE TV DESIGN)
    // ============================================================
    function injectPremiumDesign() {
        if (document.getElementById('yt-premium-css')) return;
        var style = document.createElement('style');
        style.id = 'yt-premium-css';
        style.type = 'text/css';
        
        var cssText = 
            /* === БЛОКИРОВКА РЕКЛАМЫ (Скрытие из интерфейса) === */
            CONFIG.AD_SELECTORS.join(', ') + ' { display: none !important; opacity: 0 !important; visibility: hidden !important; width: 0 !important; height: 0 !important; pointer-events: none !important; position: absolute !important; left: -9999px !important; } ' +
            
            /* === TRUE OLED BLACK === */
            'body, .wrap, .layer--width, .scroll__content, .menu, .settings, .player, .search__body, .console__body { background-color: #000000 !important; background: #000000 !important; } ' +
            '.ad-preroll__bg, .player-video__advert { background: #000000 !important; } ' +
            
            /* === СОВРЕМЕННОЕ МЕНЮ И НАСТРОЙКИ (Идеальная читаемость) === */
            '.menu__item, .settings-param, .selectbox-item, .button, .simple-button { border-radius: 8px !important; transition: transform 0.15s ease, background 0.15s ease !important; margin: 2px 10px !important; width: calc(100% - 20px) !important; } ' +
            // Состояние фокуса: белый фон, черный текст и черные иконки (Стиль YouTube/Apple TV)
            '.menu__item.focus, .settings-param.focus, .selectbox-item.focus, .button.focus, .simple-button.focus { background: #f1f1f1 !important; transform: scale(1.04) !important; box-shadow: 0 8px 20px rgba(255,255,255,0.15) !important; z-index: 99; } ' +
            // Принудительная перекраска ВСЕГО текста и иконок внутри активного элемента в черный цвет
            '.menu__item.focus *, .settings-param.focus *, .selectbox-item.focus *, .button.focus *, .simple-button.focus * { color: #0f0f0f !important; fill: #0f0f0f !important; text-shadow: none !important; } ' +
            
            /* === КАРТОЧКИ ФИЛЬМОВ (Плавность и фокус) === */
            '.card__view { border-radius: 12px !important; overflow: hidden !important; transition: transform 0.2s ease, box-shadow 0.2s ease !important; background: #111 !important; } ' +
            '.card.focus .card__view { transform: scale(1.06) !important; box-shadow: 0 0 0 4px #f1f1f1, 0 12px 30px rgba(255,255,255,0.1) !important; border: none !important; } ' +
            // Красный акцент для бейджей 
            '.card__age, .torrent-item__bitrate { background: #ff0000 !important; color: #ffffff !important; font-weight: bold !important; border-radius: 4px !important; padding: 2px 6px !important; } ' +
            '.card { margin-bottom: 15px !important; } ' +
            
            /* === ПЛЕЕР В СТИЛЕ YOUTUBE === */
            '.player-panel { background: linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.6) 60%, transparent 100%) !important; padding-bottom: 25px !important; border: none !important; } ' +
            '.player-panel__timeline { height: 5px !important; border-radius: 3px !important; background: rgba(255,255,255,0.2) !important; } ' +
            '.player-panel__peding { background: rgba(255,255,255,0.4) !important; } ' +
            // Красный прогресс-бар
            '.player-panel__position { background: #ff0000 !important; border-radius: 3px !important; } ' +
            '.player-panel__position div { background: #ff0000 !important; box-shadow: 0 0 10px #ff0000 !important; width: 14px !important; height: 14px !important; top: -4.5px !important; border-radius: 50% !important; } ' +
            '.player-info__name { font-size: 1.6em !important; font-weight: 500 !important; text-shadow: 0 2px 4px rgba(0,0,0,0.9) !important; } ' +
            
            /* === ОТКЛЮЧЕНИЕ "МЫЛЬНОГО СТЕКЛА" (Легкость для ТВ процессора) === */
            '.glass, .settings__content, .selectbox__content, .modal__content { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; background: #0f0f0f !important; border: 1px solid #222 !important; } ' +
            
            /* === АППАРАТНОЕ УСКОРЕНИЕ === */
            '.selector, .card, .layer--render { transform: translateZ(0); -webkit-transform: translateZ(0); will-change: transform; } ' +
            
            /* === СКРЫТИЕ ПОЛОС ПРОКРУТКИ === */
            '::-webkit-scrollbar { width: 0px !important; background: transparent !important; }';

        if (style.styleSheet) { style.styleSheet.cssText = cssText; } 
        else { style.appendChild(document.createTextNode(cssText)); }
        
        (document.head || document.documentElement).appendChild(style);
        
        try { Object.defineProperty(style, 'parentNode', { get: function() { return null; } }); style.remove = function(){}; } catch(e) {}
    }

    // ============================================================
    // 3. БЕЗОПАСНЫЙ СЕТЕВОЙ ПЕРЕХВАТ (HLS.JS И СТРИМИНГ)
    // ============================================================
    // В этой версии используется ES5 для максимальной скорости на Tizen

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
        // Необходимо для работы плеера hls.js (проверка instanceof)
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
    // 4. ЗАХВАТ ЯДРА И FAST-LOAD СКРИПТОВ
    // ============================================================
    var _lampaStore = window.Lampa;
    Object.defineProperty(window, 'Lampa', {
        get: function() { return _lampaStore; },
        set: function(val) {
            if (val && !val.__ytPremiumLoaded) {
                val.__ytPremiumLoaded = true;
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

    // Моментальный запуск видео (Отключение ожидания рекламы)
    var origAppend = Element.prototype.appendChild;
    Element.prototype.appendChild = function(el) {
        try {
            if (el && el.tagName === 'SCRIPT' && el.src) {
                var src = el.src.toLowerCase();
                if (checkMatch(src, CONFIG.AD_DOMAINS) || src.indexOf('vast.js') !== -1 || src.indexOf('ima.js') !== -1) {
                    el.src = 'data:text/javascript;base64,Y29uc29sZS5sb2coJ0FkQmxvY2tlZCcpOw==';
                    log('⚡ Видео-заглушка сброшена, запуск фильма.');
                }
            }
        } catch(e) {}
        return origAppend.apply(this, arguments);
    };

    // ============================================================
    // 5. ОПТИМИЗАТОР ДВИЖКА (THROTTLE & CORE SETTINGS)
    // ============================================================
    // Защита процессора ТВ от залипания стрелок пульта
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
        
        // Премиум-флаги
        window.lampa_settings.premium = true;
        window.lampa_settings.pro = true;
        window.lampa_settings.vip = true;
        window.lampa_settings.gold = true;
        window.lampa_settings.account_use = true;
        window.lampa_settings.fix_widget = true;
        
        // Оптимизация процессора (Выключаем лагучее стекло, включаем легкие анимации)
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
        setInterval(enforceCoreSettings, 2000);
    }

    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', boot); } 
    else { boot(); }

    log('✅ YouTube Premium Edition загружен.');

})();
