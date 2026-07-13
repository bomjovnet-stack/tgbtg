// ==UserScript==
// @name         Lampa: ShowyPro VIP Bypass
// @namespace    lampa-showypro-bypass
// @version      1.0.0
// @description  Локальный серверный эмулятор для обхода авторизации showypro.com/online.js
// @match        *://*/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    if (window.__showyProBypass) return;
    window.__showyProBypass = true;

    const LOG_PREFIX = '🔓 [ShowyPro Bypass]';
    const log = (...args) => console.log(LOG_PREFIX, ...args);

    // Целевой домен плагина
    const TARGET_DOMAIN = 'showypro.com';

    // Шаблон успешного ответа сервера ShowyPro (эмуляция VIP)
    // Структура адаптирована под типичные ответы закрытых балансеров Lampa
    const getFakeShowyAuth = () => ({
        status: true,
        success: true,
        vip: true,
        premium: true,
        is_vip: 1,
        expire: 4102444800, // 2099 год в Unix Time
        user: {
            id: 9999,
            login: "GodMode_User",
            group: "VIP",
            balance: "9999"
        },
        // Подмена токенов или ссылок на балансеры, если плагин требует их для плеера
        token: "showypro_bypassed_token_" + Date.now(),
        message: "Авторизация успешно пройдена"
    });

    // ============================================================
    // 1. ПЕРЕХВАТ FETCH API
    // ============================================================
    const origFetch = window.fetch;
    if (origFetch) {
        window.fetch = async function(input, init) {
            try {
                const url = (typeof input === 'string' ? input : input?.url || '').toLowerCase();
                
                // Ловим запросы только к ShowyPro
                if (url.includes(TARGET_DOMAIN)) {
                    // Перехватываем эндпоинты авторизации, проверки профиля и статуса
                    if (url.includes('/auth') || url.includes('/check') || url.includes('/user') || url.includes('/profile') || url.includes('/api/vip')) {
                        log('Перехвачен Fetch-запрос авторизации:', url);
                        return new Response(JSON.stringify(getFakeShowyAuth()), {
                            status: 200,
                            headers: { 'Content-Type': 'application/json' }
                        });
                    }
                }
            } catch (e) {
                console.error(LOG_PREFIX, 'Fetch Bypass Error:', e);
            }
            return origFetch.apply(this, arguments);
        };
        // Маскировка
        Object.defineProperty(window.fetch, 'name', { value: 'fetch', configurable: true });
    }

    // ============================================================
    // 2. ПЕРЕХВАТ XMLHTTPREQUEST (XHR)
    // ============================================================
    const OrigXHR = window.XMLHttpRequest;
    if (OrigXHR) {
        window.XMLHttpRequest = function() {
            const xhr = new OrigXHR();
            const origOpen = xhr.open;
            const origSend = xhr.send;

            xhr.open = function(method, url) {
                this._interceptUrl = (typeof url === 'string' ? url.toLowerCase() : '');
                return origOpen.apply(this, arguments);
            };

            xhr.send = function() {
                try {
                    const url = this._interceptUrl;
                    if (url && url.includes(TARGET_DOMAIN)) {
                        if (url.includes('/auth') || url.includes('/check') || url.includes('/user') || url.includes('/profile') || url.includes('/api/vip')) {
                            log('Перехвачен XHR-запрос авторизации:', url);
                            const self = this;
                            
                            // Эмулируем задержку сети и успешный ответ
                            setTimeout(() => {
                                Object.defineProperties(self, {
                                    readyState: { value: 4 },
                                    status: { value: 200 },
                                    statusText: { value: 'OK' },
                                    responseText: { value: JSON.stringify(getFakeShowyAuth()) },
                                    response: { value: JSON.stringify(getFakeShowyAuth()) }
                                });
                                
                                if (self.onload) self.onload();
                                if (self.onreadystatechange) self.onreadystatechange();
                            }, 50);
                            return;
                        }
                    }
                } catch (e) {
                    console.error(LOG_PREFIX, 'XHR Bypass Error:', e);
                }
                return origSend.apply(this, arguments);
            };
            return xhr;
        };
        window.XMLHttpRequest.prototype = OrigXHR.prototype;
    }

    // ============================================================
    // 3. ПЕРЕХВАТ СОЗДАНИЯ DOM-СКРИПТОВ (Если параметры передаются в URL)
    // ============================================================
    const origAppend = Element.prototype.appendChild;
    Element.prototype.appendChild = function(el) {
        try {
            if (el && el.tagName === 'SCRIPT' && el.src) {
                let src = el.src;
                if (src.includes(TARGET_DOMAIN) && src.includes('online.js')) {
                    // Если online.js требует передачи токена прямо в URL (например, online.js?token=123)
                    // Мы можем модифицировать ссылку на лету
                    if (!src.includes('token=') && !src.includes('vip=')) {
                        const separator = src.includes('?') ? '&' : '?';
                        el.src = src + separator + 'vip=1&token=god_mode_bypassed';
                        log('Модифицирован URL загрузки скрипта:', el.src);
                    }
                }
            }
        } catch (e) {}
        return origAppend.apply(this, arguments);
    };

    log('Серверный эмулятор успешно запущен. Мониторинг трафика активен.');

})();
