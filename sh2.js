// ==UserScript==
// @name         ShowyPro VIP Token Injector (Real Token Edition)
// @namespace    showypro-token-injector
// @version      8.0.0
// @description  Автоматически добавляет реальный VIP-токен во все запросы к showypro.com/lite/*
// @match        *://*/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    if (window.__showyProTokenInjector) return;
    window.__showyProTokenInjector = true;

    const LOG_PREFIX = '🎯 [ShowyPro Token]';
    const log = (...args) => console.log(LOG_PREFIX, ...args);

    const REAL_VIP_TOKEN = '22cf26b7-c0bf-448b-b9f8-0e072029ff2c';
    const TARGET = 'showypro.com';

    // ============================================================
    // 1. Перехват XHR – добавление токена ко всем lite-запросам
    // ============================================================
    const origXHROpen = XMLHttpRequest.prototype.open;
    const origXHRSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function(method, url) {
        if (typeof url === 'string' && url.includes(TARGET) && url.includes('/lite/')) {
            // Удаляем старый токен, если есть, и добавляем новый
            url = url.replace(/[?&]showy_token=[^&]*/g, '');
            const separator = url.includes('?') ? '&' : '?';
            url += separator + 'showy_token=' + REAL_VIP_TOKEN;
            log('🔧 Токен добавлен в URL:', url);
        }
        this._modifiedUrl = url;
        return origXHROpen.call(this, method, url);
    };

    // На случай, если плагин меняет URL после open (маловероятно)
    XMLHttpRequest.prototype.send = function() {
        // Можно было бы ещё раз проверить this._modifiedUrl, но open уже всё сделал
        return origXHRSend.apply(this, arguments);
    };

    // ============================================================
    // 2. Перехват fetch – аналогично
    // ============================================================
    const origFetch = window.fetch;
    if (origFetch) {
        window.fetch = function(input, init) {
            let url = typeof input === 'string' ? input : (input?.url || '');
            if (url.includes(TARGET) && url.includes('/lite/')) {
                url = url.replace(/[?&]showy_token=[^&]*/g, '');
                const separator = url.includes('?') ? '&' : '?';
                url += separator + 'showy_token=' + REAL_VIP_TOKEN;
                log('🔧 Токен добавлен в fetch URL:', url);
                if (typeof input === 'string') {
                    input = url;
                } else if (input) {
                    input.url = url;
                }
            }
            return origFetch.call(this, input, init);
        };
    }

    // ============================================================
    // 3. Дополнительная эмуляция API (чтобы не ждать ответов сервера)
    // ============================================================
    // Перехватываем XHR для /api/ эндпоинтов
    const origOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url) {
        this._interceptUrl = (typeof url === 'string' ? url.toLowerCase() : '');
        return origOpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function() {
        const xhr = this;
        const url = this._interceptUrl || '';
        if (url.includes(TARGET) && (
            url.includes('/api/check_pro_auth') ||
            url.includes('/api/check_pro_code') ||
            url.includes('/api/get_code')
        )) {
            log('⚡ Эмуляция API:', url);
            const fake = url.includes('/api/check_pro_auth')
                ? { status: true, vip: true, premium: true, is_vip: 1, expire: 4102444800 }
                : url.includes('/api/check_pro_code')
                ? { status: 'success', token: REAL_VIP_TOKEN }
                : { code: '123456' };

            setTimeout(() => {
                Object.defineProperties(xhr, {
                    readyState: { value: 4 },
                    status: { value: 200 },
                    statusText: { value: 'OK' },
                    responseText: { value: JSON.stringify(fake) }
                });
                if (xhr.responseType === 'json') {
                    Object.defineProperty(xhr, 'response', { value: fake });
                }
                if (xhr.onload) xhr.onload();
                if (xhr.onreadystatechange) xhr.onreadystatechange();
                xhr.dispatchEvent(new Event('load'));
            }, 10);
            return; // реальный запрос не идёт
        }
        return origXHRSend.apply(this, arguments);
    };

    // Блокировка окон (подстраховка)
    setInterval(() => {
        if (window.Lampa && window.Lampa.Modal && !window.__showyUILock) {
            window.__showyUILock = true;
            const orig = Lampa.Modal.open;
            Lampa.Modal.open = function(config) {
                if (config && config.html && (
                    config.html.includes('randomCodeDisplay') ||
                    config.html.includes('showybot') ||
                    config.html.includes('subscription')
                )) {
                    log('🚫 Окно авторизации подавлено');
                    return;
                }
                return orig.apply(this, arguments);
            };
        }
    }, 300);

    log('✅ Готово! Все запросы к ShowyPro теперь идут с VIP-токеном.');
})();
