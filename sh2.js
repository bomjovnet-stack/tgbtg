// ==UserScript==
// @name         ShowyPro VIP Bypass (Full Auth Emulation)
// @namespace    lampa-showypro-bypass
// @version      3.0.0
// @description  Полная эмуляция сервера авторизации ShowyPro для плагина Showy RU
// @match        *://*/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    if (window.__showyProBypass) return;
    window.__showyProBypass = true;

    const LOG_PREFIX = '🔓 [ShowyPro Bypass v3]';
    const log = (...args) => console.log(LOG_PREFIX, ...args);

    const TARGET_DOMAIN = 'showypro.com';

    // Эндпоинты, которые мы подменяем (точное совпадение подстрок)
    const INTERCEPT_PATHS = [
        '/api/get_code',
        '/api/check_pro_code',
        '/api/check_pro_auth',
        '/api/delete_token',
        '/api/check_subscription',
        '/api/plugin_liontech_payment'
    ];

    /**
     * Сразу записываем фейковый токен, если его ещё нет.
     * Это нужно, чтобы verifyProAuth не ушла в ветку "нет токена".
     */
    try {
        const existing = localStorage.getItem('showy_token');
        if (!existing || existing === 'null' || existing === 'undefined') {
            localStorage.setItem('showy_token', 'bypass_token_' + Date.now());
            log('📌 Записан фейковый токен');
        }
    } catch(e) {}

    /**
     * Генератор фейкового ответа в зависимости от URL
     */
    const getFakeResponse = (url) => {
        // Убираем query-параметры, чтобы точнее определять
        const cleanUrl = url.split('?')[0];

        if (cleanUrl.includes('/api/get_code')) {
            return {
                code: '123456' // любой код, окно всё равно не появится
            };
        }
        if (cleanUrl.includes('/api/check_pro_code')) {
            return {
                status: 'success',
                token: 'fake_token_' + Date.now()
            };
        }
        if (cleanUrl.includes('/api/check_pro_auth')) {
            // Любой ответ, который не вызовет ошибку (достаточно пустого объекта)
            return {
                status: true,
                vip: true,
                premium: true,
                is_vip: 1,
                expire: 4102444800
            };
        }
        if (cleanUrl.includes('/api/delete_token')) {
            return {
                status: true,
                message: 'deleted'
            };
        }
        if (cleanUrl.includes('/api/check_subscription')) {
            return {
                status: 'success'
            };
        }
        if (cleanUrl.includes('/api/plugin_liontech_payment')) {
            return {
                status: 'error', // специально, чтобы не открывалось платёжное окно
                message: 'not needed'
            };
        }
        return {};
    };

    /**
     * Проверка – нужно ли перехватывать запрос
     */
    const shouldIntercept = (url) => {
        if (!url || typeof url !== 'string') return false;
        // Строгая проверка домена
        if (!url.includes('://') || !url.match(/\/\/([^/]*\.)?showypro\.com(\/|$)/i)) return false;
        return INTERCEPT_PATHS.some(path => url.includes(path));
    };

    // ==============================
    // 1. Перехват fetch
    // ==============================
    const origFetch = window.fetch;
    if (origFetch) {
        window.fetch = function(input, init) {
            const url = (typeof input === 'string' ? input : input?.url || '').toLowerCase();
            if (shouldIntercept(url)) {
                log('✅ Fetch перехвачен:', url);
                const fakeData = getFakeResponse(url);
                return Promise.resolve(new Response(JSON.stringify(fakeData), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                }));
            }
            return origFetch.apply(this, arguments);
        };
        // Маскировка под нативную функцию
        Object.defineProperties(window.fetch, {
            name: { value: 'fetch', configurable: true },
            toString: { value: () => 'function fetch() { [native code] }', configurable: true }
        });
    }

    // ==============================
    // 2. Перехват XMLHttpRequest
    // ==============================
    const OrigXHR = window.XMLHttpRequest;
    if (OrigXHR) {
        window.XMLHttpRequest = function() {
            const xhr = new OrigXHR();
            const origOpen = xhr.open;
            const origSend = xhr.send;

            let interceptUrl = null;

            xhr.open = function(method, url) {
                interceptUrl = (typeof url === 'string' ? url.toLowerCase() : '');
                return origOpen.apply(this, arguments);
            };

            xhr.send = function() {
                if (interceptUrl && shouldIntercept(interceptUrl)) {
                    log('✅ XHR перехвачен:', interceptUrl);

                    const self = this;
                    // Полностью блокируем реальный запрос
                    setTimeout(() => {
                        Object.defineProperties(self, {
                            readyState: { value: 4, writable: false },
                            status: { value: 200, writable: false },
                            statusText: { value: 'OK', writable: false },
                            responseText: { value: JSON.stringify(getFakeResponse(interceptUrl)), writable: false }
                        });

                        if (self.responseType === '' || self.responseType === 'text') {
                            Object.defineProperty(self, 'response', { value: self.responseText, writable: false });
                        } else if (self.responseType === 'json') {
                            try {
                                Object.defineProperty(self, 'response', {
                                    value: JSON.parse(self.responseText),
                                    writable: false
                                });
                            } catch(e) {}
                        }

                        if (self.onload) self.onload();
                        if (self.onreadystatechange) self.onreadystatechange();
                    }, 10);
                    return; // не вызываем origSend
                }
                return origSend.apply(this, arguments);
            };
            return xhr;
        };
        window.XMLHttpRequest.prototype = OrigXHR.prototype;
    }

    // ==============================
    // 3. Модификация загружаемых скриптов (на всякий случай)
    // ==============================
    const origAppend = Element.prototype.appendChild;
    Element.prototype.appendChild = function(el) {
        try {
            if (el && el.tagName === 'SCRIPT' && el.src) {
                if (el.src.includes(TARGET_DOMAIN) && el.src.includes('online.js')) {
                    if (!el.src.includes('token=') && !el.src.includes('vip=')) {
                        const separator = el.src.includes('?') ? '&' : '?';
                        el.src += separator + 'vip=1&token=god_mode_bypassed';
                        log('🔧 Модифицирован URL online.js:', el.src);
                    }
                }
            }
        } catch (e) {}
        return origAppend.apply(this, arguments);
    };

    log('🚀 Полная эмуляция ShowyPro активна. Авторизация и подписка обойдены.');
})();
