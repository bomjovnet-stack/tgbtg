// ==UserScript==
// @name         ShowyPro Ultimate Bypass (99 lvl)
// @namespace    showypro-ultimate-bypass
// @version      4.0.0
// @description  Гарантированный обход авторизации ShowyPro для плагина Showy RU
// @match        *://*/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    if (window.__showyProUltimate) return;
    window.__showyProUltimate = true;

    const LOG_PREFIX = '🔓 [ShowyPro Ultimate]';
    const log = (...args) => console.log(LOG_PREFIX, ...args);

    const TARGET = 'showypro.com';
    const API_PATHS = ['/api/get_code', '/api/check_pro_code', '/api/check_pro_auth',
                       '/api/delete_token', '/api/check_subscription', '/api/plugin_liontech_payment'];

    // 1. Максимально ранняя инъекция токена
    const FAKE_TOKEN = 'ultimate_bypass_token_' + Date.now();
    try {
        localStorage.setItem('showy_token', FAKE_TOKEN);
        sessionStorage.setItem('showy_token', FAKE_TOKEN);
        // Пробуем сразу записать в глобальный Lampa.Storage, если он появится
        const storageInterval = setInterval(() => {
            if (window.Lampa && window.Lampa.Storage) {
                window.Lampa.Storage.set('showy_token', FAKE_TOKEN);
                clearInterval(storageInterval);
            }
        }, 50);
        // Остановим попытки через 5 секунд
        setTimeout(() => clearInterval(storageInterval), 5000);
    } catch(e) {}

    // 2. Перехват на уровне прототипа XMLHttpRequest (надежнее конструктора)
    const origOpen = XMLHttpRequest.prototype.open;
    const origSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function(method, url) {
        this._interceptUrl = (typeof url === 'string' ? url.toLowerCase() : '');
        return origOpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function() {
        const url = this._interceptUrl;
        if (url && url.includes(TARGET) && API_PATHS.some(p => url.includes(p))) {
            log('✅ Перехвачен XHR:', url);
            const xhr = this;
            // Блокируем реальный запрос и эмулируем ответ
            setTimeout(() => {
                const fakeData = getFakeResponse(url);
                Object.defineProperties(xhr, {
                    readyState: { value: 4, writable: false },
                    status: { value: 200, writable: false },
                    statusText: { value: 'OK', writable: false },
                    responseText: { value: JSON.stringify(fakeData), writable: false }
                });
                if (xhr.responseType === '' || xhr.responseType === 'text') {
                    Object.defineProperty(xhr, 'response', { value: xhr.responseText });
                } else if (xhr.responseType === 'json') {
                    Object.defineProperty(xhr, 'response', { value: fakeData });
                }
                // Вызываем колбэки
                if (xhr.onload) xhr.onload();
                if (xhr.onreadystatechange) xhr.onreadystatechange();
                // Для jQuery: диспатчим событие load
                const event = new Event('load');
                xhr.dispatchEvent(event);
            }, 10);
            return; // реальный send не вызываем
        }
        return origSend.apply(this, arguments);
    };

    // 3. Перехват fetch на всякий случай
    const origFetch = window.fetch;
    if (origFetch) {
        window.fetch = function(input, init) {
            const url = (typeof input === 'string' ? input : input?.url || '').toLowerCase();
            if (url.includes(TARGET) && API_PATHS.some(p => url.includes(p))) {
                log('✅ Перехвачен Fetch:', url);
                return Promise.resolve(new Response(JSON.stringify(getFakeResponse(url)), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                }));
            }
            return origFetch.apply(this, arguments);
        };
    }

    // 4. Нейтрализация модальных окон авторизации (уничтожаем функции, если они появятся)
    function neutralizeUI() {
        if (!window.Lampa || !window.Lampa.Modal) return;
        // Безопасно переопределим показ окна авторизации
        if (!window.__showyModalNeutralized) {
            window.__showyModalNeutralized = true;
            const origModalOpen = window.Lampa.Modal.open;
            window.Lampa.Modal.open = function(config) {
                // Если это окно с кодом или подпиской – игнорируем
                if (config && config.html && (
                    config.html.includes('randomCodeDisplay') ||
                    config.html.includes('showybot') ||
                    config.html.includes('showideo.ru') ||
                    config.html.includes('subscription'))) {
                    log('🚫 Заблокировано окно авторизации/оплаты');
                    return;
                }
                return origModalOpen.apply(this, arguments);
            };
        }
    }
    setInterval(neutralizeUI, 300);

    function getFakeResponse(url) {
        const clean = url.split('?')[0];
        if (clean.includes('/api/check_pro_auth')) {
            return { status: true, vip: true, premium: true, is_vip: 1, expire: 4102444800 };
        }
        if (clean.includes('/api/check_subscription')) {
            return { status: 'success' };
        }
        if (clean.includes('/api/check_pro_code')) {
            return { status: 'success', token: FAKE_TOKEN };
        }
        if (clean.includes('/api/get_code')) {
            return { code: '000000' };
        }
        // Остальные – просто успех
        return { status: true };
    }

    log('🚀 Активирован. Авторизация ShowyPro нейтрализована.');
})();
