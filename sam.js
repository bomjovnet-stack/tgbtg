// ==UserScript==
// @name         Lampa Gold: Tizen Optimized Edition
// @namespace    lampa-gold-tizen
// @version      200.0.0
// @description  Легковесный и быстрый обход для слабых процессоров Smart TV (Samsung Tizen)
// @match        *://*/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function() { 
    'use strict';

    if (window.__lampaTizenOptimized) return;
    window.__lampaTizenOptimized = true;

    var LOG_PREFIX = '📺 [Lampa Tizen]';
    function log(msg) {
        if (window.console && console.log) console.log(LOG_PREFIX + ' ' + msg);
    }

    // ============================================================
    // 1. КОНФИГУРАЦИЯ (TIZEN PERFORMANCE)
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
            end: '2099-12-31', verification_hash: 'tizen_bypass_hash_' + new Date().getTime(),
            account: { 
                premium: true, 
                profile: { id: 777, age: 99, child: false }, 
                token: 'tizen_token_' + Math.random().toString(36).substring(2), 
                username: 'Tizen_VIP' 
            },
            status: 200
        };
    }

    // Быстрая проверка URL без array.some() (экономия тактов процессора ТВ)
    function checkMatch(url, list) {
        for (var i = 0; i < list.length; i++) {
            if (url.indexOf(list[i]) !== -1) return true;
        }
        return false;
    }

    // ============================================================
    // 2. БЫСТРЫЙ СЕТЕВОЙ ПЕРЕХВАТ (БЕЗ PROXY)
    // ============================================================
    
    // 2.1 XHR Перехватчик (Самый важный для Tizen)
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
        // Восстанавливаем прототип для HLS.js
        window.XMLHttpRequest.prototype = OrigXHR.prototype;
    }

    // 2.2 FETCH Перехватчик (Может отсутствовать на старых Tizen, проверяем)
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

    // 2.3 WEBSOCKET Перехватчик
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
    // 3. ПЕРЕХВАТ ОБЪЕКТОВ ЯДРА (ПОДДЕРЖКА ES5)
    // ============================================================
    
    // Перехват Lampa.Account
    var _lampaStore = window.Lampa;
    Object.defineProperty(window, 'Lampa', {
        get: function() { return _lampaStore; },
        set: function(val) {
            if (val && !val.__tizenOptimized) {
                val.__tizenOptimized = true;
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

    // Настройка глобальных параметров
    function enforceSettings() {
        if (!window.lampa_settings) window.lampa_settings = {};
        window.lampa_settings.premium = true;
        window.lampa_settings.pro = true;
        window.lampa_settings.vip = true;
        window.lampa_settings.gold = true;
        window.lampa_settings.account_use = true;
        window.lampa_settings.fix_widget = true;
    }

    // ============================================================
    // 4. ОЧИСТКА DOM И БЫСТРАЯ ЗАГРУЗКА СКРИПТОВ (FAST-LOAD)
    // ============================================================
    function injectStyles() {
        if (document.getElementById('tizen-css')) return;
        var style = document.createElement('style');
        style.id = 'tizen-css';
        style.type = 'text/css';
        var cssText = CONFIG.AD_SELECTORS.join(', ') + 
            ' { display: none !important; opacity: 0 !important; visibility: hidden !important; width: 0 !important; height: 0 !important; }';
        
        if (style.styleSheet) {
            style.styleSheet.cssText = cssText; // Fallback для очень старых движков
        } else {
            style.appendChild(document.createTextNode(cssText));
        }
        (document.head || document.documentElement).appendChild(style);
    }

    var origAppend = Element.prototype.appendChild;
    Element.prototype.appendChild = function(el) {
        try {
            if (el && el.tagName === 'SCRIPT' && el.src) {
                var src = el.src.toLowerCase();
                if (checkMatch(src, CONFIG.AD_DOMAINS) || src.indexOf('vast.js') !== -1 || src.indexOf('ima.js') !== -1) {
                    el.src = 'data:text/javascript;base64,Y29uc29sZS5sb2coJ0FkQmxvY2tlZCcpOw==';
                    log('⚡ Реклама сброшена (Fast-Load): ' + src);
                }
            }
        } catch(e) {}
        return origAppend.apply(this, arguments);
    };

    // ============================================================
    // 5. ЗАПУСК И ПОДДЕРЖАНИЕ СТАТУСА
    // ============================================================
    function init() {
        injectStyles();
        enforceSettings();
        // В Tizen иногда настройки сбрасываются ядром позже, 
        // дешевый интервал на старых ТВ работает лучше, чем тяжелый Proxy
        setInterval(enforceSettings, 1000); 
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    log('✅ Версия Tizen Optimized загружена. Максимальная производительность.');

})();
