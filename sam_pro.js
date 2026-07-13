// ==UserScript==
// @name         Lampa Gold: Diamond & OLED Edition
// @namespace    lampa-gold-diamond
// @version      999.0.0
// @description  Абсолютный обход, кэш, Fast-Stream и премиальный True OLED дизайн
// @match        *://*/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function() { 
    'use strict';

    if (window.__lampaDiamondLoaded) return;
    window.__lampaDiamondLoaded = true;

    var LOG_PREFIX = '💎 [Lampa Diamond]';
    function log(msg) { if (window.console && console.log) console.log(LOG_PREFIX + ' ' + msg); }

    // ============================================================
    // 1. КОНФИГУРАЦИЯ СИСТЕМЫ
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
            end: '2099-12-31', verification_hash: 'diamond_bypass_' + new Date().getTime(),
            account: { 
                premium: true, 
                profile: { id: 777, age: 99, child: false }, // Открывает весь контент 18+
                token: 'diamond_token_' + Math.random().toString(36).substring(2), 
                username: 'Diamond_VIP' 
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
    // 2. ИНЖЕНЕРИЯ ИНТЕРФЕЙСА (TRUE OLED & PREMIUM DESIGN)
    // ============================================================
    function injectPremiumDesign() {
        if (document.getElementById('diamond-css')) return;
        var style = document.createElement('style');
        style.id = 'diamond-css';
        style.type = 'text/css';
        
        var cssText = 
            /* === БЛОКИРОВКА РЕКЛАМЫ === */
            CONFIG.AD_SELECTORS.join(', ') + ' { display: none !important; opacity: 0 !important; visibility: hidden !important; width: 0 !important; height: 0 !important; pointer-events: none !important; position: absolute !important; left: -9999px !important; } ' +
            
            /* === TRUE OLED BACKGROUNDS === */
            'body, .wrap, .layer--width, .scroll__content, .menu, .settings, .player, .search__body, .console__body { background-color: #000000 !important; background: #000000 !important; } ' +
            '.ad-preroll__bg, .player-video__advert { background: #000000 !important; } ' +
            
            /* === ОПТИМИЗАЦИЯ СТЕКЛА (ОТКЛЮЧЕНИЕ ТОРМОЗОВ) === */
            '.glass, .settings__content, .selectbox__content, .modal__content { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; background: #0c0c0c !important; border: 1px solid #222 !important; box-shadow: 0 15px 30px rgba(0,0,0,0.9) !important; } ' +
            
            /* === СОВРЕМЕННЫЕ КАРТОЧКИ ФИЛЬМОВ === */
            '.card__view { border-radius: 12px !important; overflow: hidden !important; box-shadow: 0 4px 15px rgba(0,0,0,0.5) !important; } ' +
            '.card__age { background: rgba(229, 169, 61, 0.95) !important; color: #000 !important; font-weight: 800 !important; border-radius: 4px !important; padding: 2px 6px !important; } ' +
            '.card { margin-bottom: 15px !important; } ' +
            
            /* === ЭЛИТНЫЙ ФОКУС (GOLD GLOW) === */
            '.selector.focus { transform: scale(1.06) !important; box-shadow: 0 0 0 3px #e5a93d, 0 10px 25px rgba(229, 169, 61, 0.2) !important; border-radius: 12px !important; z-index: 99; transition: transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94), box-shadow 0.2s ease !important; background-color: rgba(229, 169, 61, 0.1) !important; } ' +
            '.card.focus .card__view { box-shadow: none !important; border: none !important; } ' +
            '.menu__item.focus, .settings-param.focus { box-shadow: inset 4px 0 0 #e5a93d !important; background: linear-gradient(90deg, rgba(229,169,61,0.15) 0%, transparent 100%) !important; transform: scale(1.02) !important; border-radius: 0 !important; } ' +
            
            /* === ПЛЕЕР ВО ВРЕМЯ ПРОСМОТРА === */
            '.player-panel { background: linear-gradient(to top, #000000 0%, rgba(0,0,0,0.7) 40%, transparent 100%) !important; padding-bottom: 25px !important; border: none !important; } ' +
            '.player-panel__timeline { height: 6px !important; border-radius: 3px !important; background: rgba(255,255,255,0.2) !important; } ' +
            '.player-panel__position { background: #e5a93d !important; border-radius: 3px !important; } ' +
            '.player-panel__position div { background: #ffffff !important; box-shadow: 0 0 12px #e5a93d, 0 0 6px #e5a93d !important; width: 14px !important; height: 14px !important; top: -4px !important; border-radius: 50% !important; } ' +
            '.player-info__name { font-size: 1.5em !important; font-weight: 600 !important; text-shadow: 0 2px 4px rgba(0,0,0,0.8) !important; } ' +
            
            /* === АППАРАТНОЕ УСКОРЕНИЕ === */
            '.selector, .card, .layer--render { transform: translateZ(0); -webkit-transform: translateZ(0); will-change: transform; } ' +
            
            /* === СКРЫТИЕ ПОЛОС ПРОКРУТКИ === */
            '::-webkit-scrollbar { width: 0px !important; background: transparent !important; }';

        if (style.styleSheet) { style.styleSheet.cssText = cssText; } 
        else { style.appendChild(document.createTextNode(cssText)); }
        
        (document.head || document.documentElement).appendChild(style);
        
        // Защита от удаления
        try { Object.defineProperty(style, 'parentNode', { get: function() { return null; } }); style.remove = function(){}; } catch(e) {}
    }

    // ============================================================
    // 3. СВЕРХБЫСТРАЯ СЕТЬ И API КЭШИРОВАНИЕ
    // ============================================================
    var apiCache = {};
    var CACHE_TTL = 1000 * 60 * 5; // 5 минут

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

                var method = (init && init.method) ? init.method.toUpperCase() : 'GET';

                if (url) {
                    if (checkMatch(url, CONFIG.AD_DOMAINS)) {
                        return Promise.resolve(new Response('{}', { status: 200 }));
                    }
                    if (checkMatch(url, CONFIG.PREMIUM_ENDPOINTS)) {
                        return Promise.resolve(new Response(JSON.stringify(getFakePremium()), {
                            status: 200, headers: { 'Content-Type': 'application/json' }
                        }));
                    }

                    // Кэширование запросов каталога TMDB для моментального возврата назад
                    if (method === 'GET' && (url.indexOf('tmdb') !== -1 || url.indexOf('cub') !== -1) && url.indexOf('account') === -1) {
                        var now = new Date().getTime();
                        if (apiCache[url] && (now - apiCache[url].timestamp < CACHE_TTL)) {
                            return Promise.resolve(new Response(apiCache[url].data, {
                                status: 200, headers: { 'Content-Type': 'application/json' }
                            }));
                        }
                        return origFetch.apply(this, arguments).then(function(response) {
                            var resClone = response.clone();
                            resClone.text().then(function(textData) {
                                try { JSON.parse(textData); apiCache[url] = { data: textData, timestamp: new Date().getTime() }; } catch(e) {}
                            });
                            return response;
                        });
                    }
                }
            } catch(e) {}
            return origFetch.apply(this, arguments);
        };
    }

    if (window.WebSocket) {
        var OrigWebSocket = window.WebSocket;
        window.WebSocket = function(url, protocols) {
            var ws = protocols ? new OrigWebSocket(url, protocols) : new OrigWebSocket(url);
            var origSend = ws.send;
            ws.send = function(data) {
                if (typeof data === 'string' && data.indexOf('premium') !== -1) {
                    setTimeout(function() {
                        try {
                            var event = document.createEvent('Event');
                            event.initEvent('message', false, false);
                            event.data = JSON.stringify({ type: 'premium_status', data: getFakePremium() });
                            ws.dispatchEvent(event);
                        } catch(e) {}
                    }, 50);
                    return;
                }
                return origSend.apply(this, arguments);
            };
            return ws;
        };
        window.WebSocket.prototype = OrigWebSocket.prototype;
    }

    // ============================================================
    // 4. ЗАХВАТ ЯДРА И FAST-LOAD СКРИПТОВ
    // ============================================================
    var _lampaStore = window.Lampa;
    Object.defineProperty(window, 'Lampa', {
        get: function() { return _lampaStore; },
        set: function(val) {
            if (val && !val.__diamondLoaded) {
                val.__diamondLoaded = true;
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

    // Отменяем долгую загрузку видео (Сброс рекламы)
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
    var lastKeyTime = 0;
    window.addEventListener('keydown', function(e) {
        if (e.keyCode >= 37 && e.keyCode <= 40) {
            var now = new Date().getTime();
            if (now - lastKeyTime < 60) { // Ограничение: не чаще 1 кадра навигации в 60мс
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

    log('✅ Система загружена. Приятного просмотра в наилучшем качестве.');

})();
