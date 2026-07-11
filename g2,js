(function() {
    'use strict';

    // ============================================================
    // КОНФИГУРАЦИЯ
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
    // 1. БЛОКИРОВКА ЗАГРУЗКИ РЕКЛАМНЫХ СКРИПТОВ
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
    // 2. ПЕРЕХВАТ FETCH И XMLHttpRequest
    // ============================================================
    function interceptNetwork() {
        const origFetch = window.fetch;
        window.fetch = function(input, init) {
            const url = typeof input === 'string' ? input : input.url;
            if (CONFIG.BLOCKED_REQUEST_PATTERNS.some(p => url.includes(p))) {
                console.log('[LampaPRO] Блокирован fetch:', url);
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
                    console.log('[LampaPRO] Блокирован XHR:', url);
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
    // 3. ПЕРЕХВАТ СОЗДАНИЯ DOM-ЭЛЕМЕНТОВ И ВСТАВКИ HTML
    // ============================================================
    function blockAdElements() {
        const origCreate = document.createElement;
        document.createElement = function(tag, options) {
            const el = origCreate.call(this, tag, options);
            const className = el.className || '';
            const id = el.id || '';
            if (className.includes('ad') || className.includes('preroll') || id.includes('ad')) {
                console.log('[LampaPRO] Блокировка создания элемента:', tag, className, id);
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
    // 4. УДАЛЕНИЕ РЕКЛАМНЫХ ЭЛЕМЕНТОВ ИЗ DOM
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
    // 5. ЗАГЛУШКИ ДЛЯ VAST И IMA SDK
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
            set: () => {},
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
            set: () => {},
            configurable: false
        });
    }

    // ============================================================
    // 6. ПЕРЕОПРЕДЕЛЕНИЕ МЕТОДОВ Lampa (после инициализации)
    // ============================================================
    function applyLampaPatches() {
        try {
            // Preroll.show – сразу вызываем callback
            if (window.Lampa && window.Lampa.Preroll) {
                window.Lampa.Preroll.show = function(data, callback) {
                    console.log('[LampaPRO] Preroll.show перехвачен, пропускаем рекламу');
                    callback();
                };
            }
            // Banner.start – заглушка
            if (window.Lampa && window.Lampa.Banner) {
                window.Lampa.Banner.start = function() {
                    console.log('[LampaPRO] Banner.start перехвачен');
                };
            }
            // Personal.confirm – всегда true
            if (window.Lampa && window.Lampa.Personal) {
                window.Lampa.Personal.confirm = function() { return true; };
            }
            // Account.hasPremium – всегда true
            if (window.Lampa && window.Lampa.Account) {
                if (typeof window.Lampa.Account.hasPremium === 'function') {
                    window.Lampa.Account.hasPremium = function() { return true; };
                }
                // Permit – переопределяем геттеры
                if (window.Lampa.Account.Permit) {
                    Object.defineProperty(window.Lampa.Account.Permit, 'access', {
                        get: () => true,
                        configurable: false
                    });
                    Object.defineProperty(window.Lampa.Account.Permit, 'sync', {
                        get: () => true,
                        configurable: false
                    });
                }
            }
            // Storage.get и Storage.cache – подмена ключей премиума
            if (window.Lampa && window.Lampa.Storage) {
                const origGet = window.Lampa.Storage.get;
                window.Lampa.Storage.get = function(key, fallback) {
                    if (CONFIG.PRO_STORAGE_KEYS.includes(key)) {
                        return true;
                    }
                    return origGet.call(this, key, fallback);
                };
                const origCache = window.Lampa.Storage.cache;
                window.Lampa.Storage.cache = function(name, max, empty) {
                    if (CONFIG.PRO_STORAGE_KEYS.includes(name)) {
                        return true;
                    }
                    return origCache.call(this, name, max, empty);
                };
            }
            console.log('[LampaPRO] Патчи для Lampa успешно применены');
        } catch(e) {
            console.warn('[LampaPRO] Ошибка при применении патчей:', e);
        }
    }

    // ============================================================
    // 7. ИНЪЕКЦИЯ CSS
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
    // 8. ПОДАВЛЕНИЕ ОШИБОК РЕКЛАМЫ
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
    // 9. ЗАПУСК ВСЕХ МЕХАНИЗМОВ
    // ============================================================
    function init() {
        // Блокировка скриптов и сетевых запросов – сразу
        blockAdScripts();
        interceptNetwork();
        blockAdElements();
        removeAdElements();
        blockAdSDK();
        injectStyles();
        suppressAdErrors();

        // MutationObserver для постоянной очистки DOM
        const observer = new MutationObserver(() => removeAdElements());
        if (document.documentElement) {
            observer.observe(document.documentElement, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['class', 'id']
            });
        }

        // Дополнительный цикл через requestAnimationFrame (первые 30 секунд)
        let rafId = null;
        function rafLoop() {
            removeAdElements();
            rafId = requestAnimationFrame(rafLoop);
        }
        rafLoop();
        setTimeout(() => {
            if (rafId) cancelAnimationFrame(rafId);
        }, 30000);

        // Отложенное применение патчей для Lampa (после загрузки приложения)
        // Используем событие 'app' с типом 'ready'
        if (window.Lampa && window.Lampa.Listener) {
            window.Lampa.Listener.follow('app', function(e) {
                if (e.type === 'ready') {
                    applyLampaPatches();
                }
            });
        } else {
            // Если Lampa ещё не определена, ждём с интервалом
            let attempts = 0;
            const interval = setInterval(() => {
                attempts++;
                if (window.Lampa && window.Lampa.Listener) {
                    clearInterval(interval);
                    window.Lampa.Listener.follow('app', function(e) {
                        if (e.type === 'ready') {
                            applyLampaPatches();
                        }
                    });
                } else if (attempts > 50) {
                    clearInterval(interval);
                    // Если событие не пришло, применяем патчи принудительно через 2 секунды
                    setTimeout(applyLampaPatches, 2000);
                }
            }, 100);
        }

        console.log('[LampaPRO] Все механизмы обхода активированы');
    }

    // ============================================================
    // 10. СТАРТ ПОСЛЕ ЗАГРУЗКИ DOM
    // ============================================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
