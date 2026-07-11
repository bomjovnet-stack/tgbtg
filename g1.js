(function() {
    'use strict';

    // ============================================================
    // 1. РАСШИРЕННАЯ КОНФИГУРАЦИЯ
    // ============================================================
    const CONFIG = {
        AD_SELECTORS: [
            '.ad-preroll', '.ad-preroll__bg', '[class*="ad-preroll"]',
            '.lampa-advert', '#cub-advert', '.player-video__advert',
            '.ad-banner', 'iframe[src*="ad"]', '[data-ad]', '[id*="ad-"]'
        ],
        PRO_STORAGE_KEYS: [
            'account_premium', 'premium', 'cub_premium',
            'account_pro', 'vip_status', 'account_user'
        ],
        BLOCKED_SCRIPT_PATTERNS: ['vast.js', 'yumata.github.io/lampa'],
        BLOCKED_REQUEST_PATTERNS: [
            '/vast', '/ad/', '/preroll', '/advert', 'yumata', 'cub-ads',
            '/api/ad/get/preroll', '/api/ad/get/banner', '/api/checker'
        ],
        PREMIUM_RESPONSE_PATTERNS: [
            '/account/status', '/premium/check', '/cub/premium',
            '/users/get', '/profiles/all'
        ]
    };

    // ============================================================
    // 2. БЛОКИРОВКА ЗАГРУЗКИ РЕКЛАМНЫХ СКРИПТОВ
    // ============================================================
    function blockAdScripts() {
        const origAppend = Element.prototype.appendChild;
        const origInsert = Element.prototype.insertBefore;

        const isAdScript = (el) =>
            el && el.tagName === 'SCRIPT' && el.src &&
            CONFIG.BLOCKED_SCRIPT_PATTERNS.some(p => el.src.includes(p));

        Element.prototype.appendChild = function(el) {
            if (isAdScript(el)) {
                el.src = 'data:text/javascript;base64,Y29uc29sZS5sb2coJ0FkQmxvY2tlZCcpOw==';
            }
            return origAppend.apply(this, arguments);
        };
        Element.prototype.insertBefore = function(el, ref) {
            if (isAdScript(el)) {
                el.src = 'data:text/javascript;base64,Y29uc29sZS5sb2coJ0FkQmxvY2tlZCcpOw==';
            }
            return origInsert.apply(this, arguments);
        };
    }

    // ============================================================
    // 3. ПЕРЕХВАТ FETCH И XMLHttpRequest
    // ============================================================
    function interceptNetwork() {
        const origFetch = window.fetch;
        window.fetch = function(input, init) {
            const url = typeof input === 'string' ? input : input.url;
            if (CONFIG.BLOCKED_REQUEST_PATTERNS.some(p => url.includes(p))) {
                console.log('[LampaPRO] Заблокирован fetch:', url);
                return Promise.resolve(new Response('{}', { status: 200 }));
            }
            if (CONFIG.PREMIUM_RESPONSE_PATTERNS.some(p => url.includes(p))) {
                console.log('[LampaPRO] Подменён fetch:', url);
                const fake = JSON.stringify({
                    premium: true, pro: true, vip: true,
                    expired: false, active: true, end: '2030-12-31'
                });
                return Promise.resolve(new Response(fake, { status: 200 }));
            }
            return origFetch.apply(this, arguments);
        };

        const OrigXHR = window.XMLHttpRequest;
        window.XMLHttpRequest = function() {
            const xhr = new OrigXHR();
            const origOpen = xhr.open;
            const origSend = xhr.send;

            xhr.open = function(method, url, async, user, pass) {
                this._url = url;
                return origOpen.apply(this, arguments);
            };

            xhr.send = function(body) {
                const url = this._url;
                if (CONFIG.BLOCKED_REQUEST_PATTERNS.some(p => url.includes(p))) {
                    console.log('[LampaPRO] Заблокирован XHR:', url);
                    setTimeout(() => {
                        this.readyState = 4;
                        this.status = 200;
                        this.statusText = 'OK';
                        this.responseText = '{}';
                        this.response = '{}';
                        if (this.onreadystatechange) this.onreadystatechange();
                        if (this.onload) this.onload();
                    }, 0);
                    return;
                }
                if (CONFIG.PREMIUM_RESPONSE_PATTERNS.some(p => url.includes(p))) {
                    console.log('[LampaPRO] Подменён XHR:', url);
                    setTimeout(() => {
                        this.readyState = 4;
                        this.status = 200;
                        this.statusText = 'OK';
                        const fake = JSON.stringify({
                            premium: true, pro: true, vip: true,
                            expired: false, active: true, end: '2030-12-31'
                        });
                        this.responseText = fake;
                        this.response = fake;
                        if (this.onreadystatechange) this.onreadystatechange();
                        if (this.onload) this.onload();
                    }, 0);
                    return;
                }
                return origSend.apply(this, arguments);
            };
            return xhr;
        };
        window.XMLHttpRequest.prototype = OrigXHR.prototype;
    }

    // ============================================================
    // 4. PROXY ДЛЯ ГЛОБАЛЬНЫХ ОБЪЕКТОВ Lampa И CUB
    // ============================================================
    function protectGlobals() {
        const proxyHandler = {
            get(target, prop) {
                if (['is_premium', 'premium', 'pro', 'vip', 'ads'].includes(prop)) {
                    return true;
                }
                if (prop === 'status' && typeof target.status === 'function') {
                    return function() {
                        return { premium: true, pro: true, vip: true,
                                 expired: false, active: true, end: '2030-12-31' };
                    };
                }
                if (prop === 'advert' && typeof target.advert === 'function') {
                    return function() { return false; };
                }
                if (prop in target) {
                    const val = target[prop];
                    return typeof val === 'function' ? val.bind(target) : val;
                }
                return undefined;
            },
            set(target, prop, value) {
                if (['is_premium', 'premium', 'pro', 'vip', 'ads'].includes(prop)) {
                    console.log('[LampaPRO] Попытка перезаписи', prop, 'заблокирована');
                    return true;
                }
                target[prop] = value;
                return true;
            }
        };

        if (window.Lampa) {
            window.Lampa = new Proxy(window.Lampa, proxyHandler);
        } else {
            Object.defineProperty(window, 'Lampa', {
                get: function() {
                    if (!this._lampaProxy) {
                        this._lampaProxy = new Proxy({}, proxyHandler);
                    }
                    return this._lampaProxy;
                },
                set: function() { console.log('[LampaPRO] Перезапись Lampa заблокирована'); },
                configurable: false
            });
        }

        if (window.CUB) {
            window.CUB = new Proxy(window.CUB, proxyHandler);
        } else {
            Object.defineProperty(window, 'CUB', {
                get: function() {
                    if (!this._cubProxy) {
                        this._cubProxy = new Proxy({}, proxyHandler);
                    }
                    return this._cubProxy;
                },
                set: function() { console.log('[LampaPRO] Перезапись CUB заблокирована'); },
                configurable: false
            });
        }
    }

    // ============================================================
    // 5. ПЕРЕХВАТ СОЗДАНИЯ DOM-ЭЛЕМЕНТОВ И ВСТАВКИ HTML
    // ============================================================
    function blockAdElements() {
        const origCreate = document.createElement;
        document.createElement = function(tag, options) {
            const el = origCreate.call(this, tag, options);
            const className = el.className || '';
            const id = el.id || '';
            if (className.includes('ad') || className.includes('preroll') || id.includes('ad')) {
                console.log('[LampaPRO] Блокировка создания:', tag, className, id);
                const replacement = origCreate.call(this, 'div');
                replacement.style.display = 'none';
                return replacement;
            }
            return el;
        };

        const origInnerHTML = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML').set;
        Object.defineProperty(Element.prototype, 'innerHTML', {
            set: function(html) {
                if (/class="[^"]*ad[^"]*"/i.test(html)) {
                    console.log('[LampaPRO] innerHTML с рекламой заблокирован');
                    return origInnerHTML.call(this, '');
                }
                return origInnerHTML.call(this, html);
            },
            get: function() { return this.textContent; },
            configurable: true
        });

        const origInsertAdjacent = Element.prototype.insertAdjacentHTML;
        Element.prototype.insertAdjacentHTML = function(pos, text) {
            if (/class="[^"]*ad[^"]*"/i.test(text)) {
                console.log('[LampaPRO] insertAdjacentHTML с рекламой заблокирован');
                return;
            }
            return origInsertAdjacent.call(this, pos, text);
        };

        const origReplaceChildren = Element.prototype.replaceChildren;
        Element.prototype.replaceChildren = function(...nodes) {
            const filtered = nodes.filter(node => {
                if (node.nodeType === 1) {
                    const cls = node.className || '';
                    if (cls.includes('ad') || cls.includes('preroll')) {
                        console.log('[LampaPRO] replaceChildren с рекламой заблокирован');
                        return false;
                    }
                }
                return true;
            });
            return origReplaceChildren.call(this, ...filtered);
        };
    }

    // ============================================================
    // 6. УДАЛЕНИЕ РЕКЛАМНЫХ ЭЛЕМЕНТОВ ИЗ DOM
    // ============================================================
    function removeAdElements() {
        CONFIG.AD_SELECTORS.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => {
                el.remove();
                console.log('[LampaPRO] Удалён:', selector);
            });
        });
    }

    // ============================================================
    // 7. ЗАГЛУШКИ ДЛЯ VAST И IMA SDK
    // ============================================================
    function blockAdSDK() {
        // VASTPlayer (VAST 2)
        const MockVAST = function() {
            console.log('[LampaPRO] VASTPlayer заглушка');
            this.load = () => Promise.resolve();
            this.startAd = () => Promise.resolve();
            this.stopAd = () => Promise.resolve();
            this.on = () => this;
            this.once = () => this;
            this._events = {};
            this.container = document.createElement('div');
        };
        Object.defineProperty(window, 'VASTPlayer', {
            get: () => MockVAST,
            set: () => console.log('[LampaPRO] Перезапись VASTPlayer заблокирована'),
            configurable: false
        });

        // Google IMA (VAST 3)
        const MockIMA = {
            AdDisplayContainer: function() { this.initialize = () => {}; },
            AdsLoader: function() {
                this.requestAds = () => {};
                this.addEventListener = () => {};
                this.destroy = () => {};
            },
            AdsManager: function() {
                this.init = () => {};
                this.start = () => {};
                this.stop = () => {};
                this.destroy = () => {};
                this.setVolume = () => {};
                this.addEventListener = () => {};
                this.resize = () => {};
            },
            AdsRequest: function() {},
            AdEvent: { Type: { STARTED: 'started', COMPLETE: 'complete', ALL_ADS_COMPLETED: 'allAdsCompleted', SKIPPED: 'skipped', AD_PROGRESS: 'adProgress', PAUSED: 'paused', RESUMED: 'resumed' } },
            AdErrorEvent: { Type: { AD_ERROR: 'adError' } },
            AdsManagerLoadedEvent: { Type: { ADS_MANAGER_LOADED: 'adsManagerLoaded' } },
            ViewMode: { NORMAL: 'normal' },
            ImaSdkSettings: { setVpaidMode: () => {}, setLocale: () => {} }
        };
        Object.defineProperty(window, 'google', {
            get: () => ({ ima: MockIMA }),
            set: () => console.log('[LampaPRO] Перезапись google.ima заблокирована'),
            configurable: false
        });

        // Также блокируем загрузку ima3.js через перехват
    }

    // ============================================================
    // 8. ПЕРЕХВАТ ВЫЗОВОВ Lampa.Preroll И Lampa.Banner
    // ============================================================
    function blockAdManagers() {
        // Переопределяем Preroll.show, чтобы сразу вызывать колбэк
        if (window.Lampa && window.Lampa.Preroll) {
            window.Lampa.Preroll.show = function(data, callback) {
                console.log('[LampaPRO] Preroll.show перехвачен, пропускаем рекламу');
                callback();
            };
        }
        // Переопределяем Banner (если существует)
        if (window.Lampa && window.Lampa.Banner) {
            window.Lampa.Banner.start = function() {
                console.log('[LampaPRO] Banner.start перехвачен');
            };
        }
    }

    // ============================================================
    // 9. ПЕРЕОПРЕДЕЛЕНИЕ Personal.confirm И Account.hasPremium
    // ============================================================
    function overridePremiumChecks() {
        // Personal.confirm – проверка файла personal.lampa
        if (window.Lampa && window.Lampa.Personal) {
            window.Lampa.Personal.confirm = function() { return true; };
        }
        // Account.hasPremium – если функция, то возвращаем true
        if (window.Lampa && window.Lampa.Account && typeof window.Lampa.Account.hasPremium === 'function') {
            window.Lampa.Account.hasPremium = function() { return true; };
        }
        // Переопределяем геттер Lampa.Account.Permit
        if (window.Lampa && window.Lampa.Account && window.Lampa.Account.Permit) {
            Object.defineProperty(window.Lampa.Account.Permit, 'access', {
                get: () => true,
                configurable: false
            });
            Object.defineProperty(window.Lampa.Account.Permit, 'sync', {
                get: () => true,
                configurable: false
            });
        }
        // Storage.get для всех премиум-ключей уже переопределено ранее,
        // но добавим переопределение Lampa.Storage.cache для надёжности
        if (window.Lampa && window.Lampa.Storage) {
            const origCache = window.Lampa.Storage.cache;
            window.Lampa.Storage.cache = function(name, max, empty) {
                if (CONFIG.PRO_STORAGE_KEYS.includes(name)) {
                    return true;
                }
                return origCache.call(this, name, max, empty);
            };
        }
    }

    // ============================================================
    // 10. ПЕРЕХВАТ WEB-SOCKET СООБЩЕНИЙ О ПРЕМИУМЕ
    // ============================================================
    function interceptSocket() {
        if (!window.Lampa || !window.Lampa.Socket) return;
        const origSend = window.Lampa.Socket.send;
        window.Lampa.Socket.send = function(method, data) {
            if (method === 'check_token' || method === 'storage' || method === 'timeline') {
                console.log('[LampaPRO] Сокетное сообщение', method, 'перехвачено');
                return;
            }
            origSend.call(this, method, data);
        };
        // Также можно перехватить listener, чтобы игнорировать входящие сообщения о премиуме
        if (window.Lampa.Socket.listener) {
            const origFollow = window.Lampa.Socket.listener.follow;
            window.Lampa.Socket.listener.follow = function(type, callback) {
                if (type === 'message') {
                    const wrapped = function(e) {
                        if (e.method === 'token_status' || e.method === 'buy_premium') {
                            console.log('[LampaPRO] Сообщение сокета о премиуме проигнорировано');
                            return;
                        }
                        callback.call(this, e);
                    };
                    return origFollow.call(this, type, wrapped);
                }
                return origFollow.call(this, type, callback);
            };
        }
    }

    // ============================================================
    // 11. ПОДАВЛЕНИЕ ОШИБОК РЕКЛАМНЫХ МОДУЛЕЙ
    // ============================================================
    function suppressAdErrors() {
        window.addEventListener('error', function(e) {
            const msg = e.message || '';
            if (msg.includes('adPreroll') || msg.includes('AdPreroll') ||
                msg.includes('vast') || msg.includes('IMA')) {
                console.log('[LampaPRO] Подавлена ошибка рекламы:', msg);
                e.preventDefault();
                e.stopPropagation();
                return true;
            }
        }, true);
    }

    // ============================================================
    // 12. ИНЪЕКЦИЯ CSS ДЛЯ СКРЫТИЯ РЕКЛАМЫ
    // ============================================================
    function injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .ad-preroll, [class*="ad-preroll"], [id*="ad-preroll"],
            .ad-preroll__bg, .ad-preroll__bg.animate,
            .lampa-advert, #cub-advert,
            iframe[src*="ad"], [data-ad], [id*="ad-"] {
                display: none !important;
                opacity: 0 !important;
                visibility: hidden !important;
                pointer-events: none !important;
                width: 0 !important;
                height: 0 !important;
            }
        `;
        (document.head || document.documentElement).appendChild(style);
    }

    // ============================================================
    // 13. ЗАПУСК ВСЕХ МЕХАНИЗМОВ
    // ============================================================
    function init() {
        blockAdScripts();
        interceptNetwork();
        protectGlobals();
        blockAdElements();
        removeAdElements();
        blockAdSDK();
        blockAdManagers();
        overridePremiumChecks();
        interceptSocket();
        suppressAdErrors();
        injectStyles();

        // MutationObserver для постоянной очистки
        const observer = new MutationObserver(() => removeAdElements());
        if (document.documentElement) {
            observer.observe(document.documentElement, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['class', 'id']
            });
        }

        // Дополнительный цикл через requestAnimationFrame (первые 30 сек)
        let rafId = null;
        function rafLoop() {
            removeAdElements();
            rafId = requestAnimationFrame(rafLoop);
        }
        rafLoop();
        setTimeout(() => {
            if (rafId) cancelAnimationFrame(rafId);
        }, 30000);

        console.log('[LampaPRO] Все механизмы обхода активированы');
    }

    // ============================================================
    // 14. СТАРТ
    // ============================================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
