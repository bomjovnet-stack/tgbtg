// ==UserScript==
// @name         ShowyPro VIP Bypass (Real Token Injection)
// @namespace    showypro-real-token
// @version      7.0.0
// @description  Эмуляция успешной авторизации с подстановкой реального VIP-токена
// @match        *://*/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    if (window.__showyProRealToken) return;
    window.__showyProRealToken = true;

    const LOG_PREFIX = '🎫 [ShowyPro RealToken]';
    const log = (...args) => console.log(LOG_PREFIX, ...args);

    const REAL_VIP_TOKEN = '22cf26b7-c0bf-448b-b9f8-0e072029ff2c'; // ваш актуальный токен
    const FAKE_CODE = '123456'; // любой код, который будет показан (но окно не появится)

    const TARGET = 'showypro.com';
    const INTERCEPT_PATHS = [
        '/api/get_code',
        '/api/check_pro_code',
        '/api/check_pro_auth'
    ];

    // 1. Перехват XHR (основной способ связи в Lampa)
    const origOpen = XMLHttpRequest.prototype.open;
    const origSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function(method, url) {
        this._interceptUrl = (typeof url === 'string' ? url.toLowerCase() : '');
        return origOpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function() {
        const xhr = this;
        const url = this._interceptUrl || '';

        if (url.includes(TARGET) && INTERCEPT_PATHS.some(p => url.includes(p))) {
            log('✅ Эмуляция запроса:', url);
            const clean = url.split('?')[0];
            let responseData = {};

            if (clean.includes('/api/get_code')) {
                responseData = { code: FAKE_CODE };
            } else if (clean.includes('/api/check_pro_code')) {
                responseData = { status: 'success', token: REAL_VIP_TOKEN };
            } else if (clean.includes('/api/check_pro_auth')) {
                responseData = { status: true, vip: true, premium: true, is_vip: 1, expire: 4102444800 };
            }

            // Эмуляция асинхронного ответа
            setTimeout(() => {
                Object.defineProperties(xhr, {
                    readyState: { value: 4 },
                    status: { value: 200 },
                    statusText: { value: 'OK' },
                    responseText: { value: JSON.stringify(responseData) }
                });
                if (xhr.responseType === '' || xhr.responseType === 'text') {
                    Object.defineProperty(xhr, 'response', { value: xhr.responseText });
                } else if (xhr.responseType === 'json') {
                    Object.defineProperty(xhr, 'response', { value: responseData });
                }
                if (xhr.onload) xhr.onload();
                if (xhr.onreadystatechange) xhr.onreadystatechange();
                const event = new Event('load');
                xhr.dispatchEvent(event);
            }, 10);
            return; // реальный запрос не уходит
        }
        return origSend.apply(this, arguments);
    };

    // 2. Перехват fetch (на случай, если используется)
    const origFetch = window.fetch;
    if (origFetch) {
        window.fetch = function(input, init) {
            const url = (typeof input === 'string' ? input : input?.url || '').toLowerCase();
            if (url.includes(TARGET) && INTERCEPT_PATHS.some(p => url.includes(p))) {
                log('✅ Fetch эмуляция:', url);
                const clean = url.split('?')[0];
                let responseData = {};
                if (clean.includes('/api/get_code')) responseData = { code: FAKE_CODE };
                else if (clean.includes('/api/check_pro_code')) responseData = { status: 'success', token: REAL_VIP_TOKEN };
                else if (clean.includes('/api/check_pro_auth')) responseData = { status: true, vip: true, premium: true, is_vip: 1, expire: 4102444800 };
                return Promise.resolve(new Response(JSON.stringify(responseData), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                }));
            }
            return origFetch.apply(this, arguments);
        };
    }

    // 3. Блокировка модальных окон на случай, если плагин всё же попытается их показать
    const blockUI = () => {
        if (window.Lampa && window.Lampa.Modal && !window.__showyUIBlocked) {
            window.__showyUIBlocked = true;
            const origModalOpen = Lampa.Modal.open;
            Lampa.Modal.open = function(config) {
                if (config && config.html && (
                    config.html.includes('randomCodeDisplay') ||
                    config.html.includes('showybot') ||
                    config.html.includes('subscription'))) {
                    log('🚫 Заблокировано окно авторизации');
                    return;
                }
                return origModalOpen.apply(this, arguments);
            };
        }
    };
    setInterval(blockUI, 300);

    log('🎉 Готово! Плагин Showy получит реальный VIP-токен автоматически.');
})();
