// ==UserScript==
// @name         Lampa Gold Titanium (Stable Stream)
// @namespace    lampa-gold-titanium-stable
// @version      99.9.11
// @description  Бескомпромиссный обход Lampa, совместимость с hls.js, мгновенное видео
// @match        *://*/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function() { 
    'use strict';

    if (window.__lampaTitaniumLoaded) return;
    window.__lampaTitaniumLoaded = true;

    const LOG_PREFIX = '⚡ [Lampa Titanium]';
    const log = (...args) => console.log(LOG_PREFIX, ...args);

    // ============================================================
    // 1. КОНФИГУРАЦИЯ
    // ============================================================
    const CONFIG = {
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
            '.ad-video-block'
        ]
    };

    const getFakePremium = () => ({
        premium: true, pro: true, vip: true, gold: true, active: true,
        end: '2099-12-31', verification_hash: 'titanium_bypass_hash_' + Date.now(),
        account: { 
            premium: true, 
            profile: { id: 1, age: 99, child: false }, 
            token: 'god_token_' + Math.random().toString(36).substring(2), 
            username: 'Titanium_VIP' 
        },
        status: 200
    });

    // ============================================================
    // 2. ИСКАЖЕНИЕ РЕАЛЬНОСТИ (STEALTH MODE)
    // ============================================================
    const origToString = Function.prototype.toString;
    Function.prototype.toString = new Proxy(origToString, {
        apply: function(target, thisArg, args) {
            if (thisArg && thisArg.__isTitaniumHook) {
                return `function ${thisArg.name || ''}() { [native code] }`;
            }
            return Reflect.apply(target, thisArg, args);
        }
    });
    
    const makeNative = (fn, name) => {
        Object.defineProperty(fn, '__isTitaniumHook', { value: true, enumerable: false });
        if (name) Object.defineProperty(fn, 'name', { value: name, configurable: true });
        return fn;
    };

    // Отвод Object.freeze
    const origFreeze = Object.freeze;
    Object.freeze = makeNative(function(obj) {
        if (obj && (obj.Permit || obj.premium !== undefined || obj.account_use !== undefined)) return obj;
        return origFreeze(obj);
    }, 'freeze');

    // ============================================================
    // 3. БЕЗОПАСНЫЙ СЕТЕВОЙ ПЕРЕХВАТ (HLS.JS SAFE)
    // ============================================================
    
    // 3.1 ПРОТОТИПНО-БЕЗОПАСНЫЙ XHR
    const OrigXHR = window.XMLHttpRequest;
    window.XMLHttpRequest = makeNative(function() {
        const xhr = new OrigXHR();
        const origOpen = xhr.open;
        const origSend = xhr.send;
        
        xhr.open = function(method, url) {
            this._interceptUrl = (typeof url === 'string' ? url : '').toLowerCase();
            return origOpen.apply(this, arguments);
        };
        
        xhr.send = function(body) {
            try {
                const url = this._interceptUrl;
                if (url) {
                    if (CONFIG.AD_DOMAINS.some(d => url.includes(d))) {
                        setTimeout(() => {
                            Object.defineProperties(this, { readyState: { value: 4 }, status: { value: 200 }, responseText: { value: '{}' } });
                            this.onload?.(); this.onreadystatechange?.();
                        }, 0);
                        return;
                    }
                    if (CONFIG.PREMIUM_ENDPOINTS.some(ep => url.includes(ep))) {
                        setTimeout(() => {
                            Object.defineProperties(this, { readyState: { value: 4 }, status: { value: 200 }, responseText: { value: JSON.stringify(getFakePremium()) } });
                            this.onload?.(); this.onreadystatechange?.();
                        }, 0);
                        return;
                    }
                }
            } catch(e) {}
            return origSend.apply(this, arguments);
        };
        return xhr;
    }, 'XMLHttpRequest');
    
    // Восстанавливаем цепочку прототипов, чтобы `xhr instanceof XMLHttpRequest` работало!
    window.XMLHttpRequest.prototype = OrigXHR.prototype;

    // 3.2 БЕЗОПАСНЫЙ FETCH
    const origFetch = window.fetch;
    window.fetch = makeNative(function(input, init) {
        try {
            const url = (typeof input === 'string' ? input : input?.url || '').toLowerCase();
            if (url) {
                if (CONFIG.AD_DOMAINS.some(d => url.includes(d))) {
                    return Promise.resolve(new Response('{}', { status: 200 }));
                }
                if (CONFIG.PREMIUM_ENDPOINTS.some(ep => url.includes(ep))) {
                    return Promise.resolve(new Response(JSON.stringify(getFakePremium()), {
                        status: 200, headers: { 'Content-Type': 'application/json' }
                    }));
                }
            }
        } catch(e) {}
        return origFetch.apply(this, arguments);
    }, 'fetch');

    // 3.3 WEBSOCKET PROXY
    const OrigWebSocket = window.WebSocket;
    window.WebSocket = makeNative(function(...args) {
        const ws = new OrigWebSocket(...args);
        const origSend = ws.send;
        ws.send = function(data) {
            if (typeof data === 'string' && data.includes('premium')) {
                setTimeout(() => {
                    ws.dispatchEvent(new MessageEvent('message', {
                        data: JSON.stringify({ type: 'premium_status', data: getFakePremium() })
                    }));
                }, 50);
                return;
            }
            origSend.apply(this, arguments);
        };
        return ws;
    }, 'WebSocket');
    window.WebSocket.prototype = OrigWebSocket.prototype;

    // ============================================================
    // 4. ВЕЧНЫЙ ПРЕМИУМ
    // ============================================================
    let _lampaStore = window.Lampa;
    Object.defineProperty(window, 'Lampa', {
        get: () => _lampaStore,
        set: (val) => {
            if (val && !val.__titanium) {
                val.__titanium = true;
                let _accountRef = val.Account;
                Object.defineProperty(val, 'Account', {
                    get: () => _accountRef,
                    set: (acc) => {
                        if (acc) {
                            acc.Permit = new Proxy(getFakePremium(), {
                                get: (t, p) => t[p],
                                set: () => true 
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

    const goldSettings = { premium: true, pro: true, vip: true, gold: true, account_use: true, fix_widget: true };
    window.lampa_settings = new Proxy(window.lampa_settings || {}, {
        get: (t, p) => p in goldSettings ? goldSettings[p] : t[p],
        set: (t, p, v) => { if (!(p in goldSettings)) t[p] = v; return true; }
    });

    // ============================================================
    // 5. БЕССМЕРТНЫЙ CSS И FAST-LOAD СКРИПТОВ
    // ============================================================
    const injectImmortalStyles = () => {
        if (document.getElementById('titanium-css')) return;
        const style = document.createElement('style');
        style.id = 'titanium-css';
        style.textContent = CONFIG.AD_SELECTORS.join(', ') + 
            ' { display: none !important; opacity: 0 !important; visibility: hidden !important; width: 0 !important; height: 0 !important; pointer-events: none !important; position: absolute !important; left: -9999px !important; }';
        
        (document.head || document.documentElement).appendChild(style);
        try { Object.defineProperty(style, 'parentNode', { get: () => null }); style.remove = makeNative(function(){}); } catch(e) {}
    };

    const origAppend = Element.prototype.appendChild;
    Element.prototype.appendChild = makeNative(function(el) {
        if (el?.tagName === 'SCRIPT' && el.src) {
            const src = el.src.toLowerCase();
            if (CONFIG.AD_DOMAINS.some(d => src.includes(d)) || src.includes('vast.js') || src.includes('ima.js')) {
                el.src = 'data:text/javascript;base64,Y29uc29sZS5sb2coJ0FkQmxvY2tlZCcpOw==';
                log('⚡ Реклама сброшена (Fast-Load):', src);
            }
        }
        return Reflect.apply(origAppend, this, arguments);
    }, 'appendChild');

    // ============================================================
    // 6. ИНИЦИАЛИЗАЦИЯ
    // ============================================================
    injectImmortalStyles();
    document.addEventListener('DOMContentLoaded', injectImmortalStyles);

    log('✅ Система Titanium Stable (HLS Safe) активирована. Видео летит без задержек.');

})();
