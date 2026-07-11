(function() {
    'use strict';

    // ============================================================
    // КОНФИГУРАЦИЯ
    // ============================================================
    var CONFIG = {
        AD_SELECTORS: [
            '.ad-preroll', '.ad-preroll__bg', '[class*="ad-preroll"]',
            '.lampa-advert', '#cub-advert', '.player-video__advert',
            '.ad-banner', 'iframe[src*="ad"]', '[data-ad]', '[id*="ad-"]'
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
        var origAppend = Element.prototype.appendChild;
        var origInsert = Element.prototype.insertBefore;

        function isAdScript(el) {
            return el && el.tagName === 'SCRIPT' && el.src &&
                CONFIG.BLOCKED_SCRIPT_PATTERNS.some(function(p) {
                    return el.src.indexOf(p) !== -1;
                });
        }

        Element.prototype.appendChild = function(el) {
            if (isAdScript(el)) {
                el.src = 'data:text/javascript;base64,Y29uc29sZS5sb2coJ0FkQmxvY2tlZCcpOw==';
            }
            return origAppend.call(this, el);
        };

        Element.prototype.insertBefore = function(el, ref) {
            if (isAdScript(el)) {
                el.src = 'data:text/javascript;base64,Y29uc29sZS5sb2coJ0FkQmxvY2tlZCcpOw==';
            }
            return origInsert.call(this, el, ref);
        };
    }

    // ============================================================
    // 2. ПЕРЕХВАТ FETCH И XMLHttpRequest (с совместимостью)
    // ============================================================
    function interceptNetwork() {
        var origFetch = window.fetch;
        if (origFetch) {
            window.fetch = function(input, init) {
                var url = typeof input === 'string' ? input : (input && input.url);
                if (url) {
                    if (CONFIG.BLOCKED_REQUEST_PATTERNS.some(function(p) { return url.indexOf(p) !== -1; })) {
                        console.log('[LampaPRO] Блокирован fetch:', url);
                        return Promise.resolve(new Response('{}', { status: 200 }));
                    }
                    if (CONFIG.PREMIUM_RESPONSE_PATTERNS.some(function(p) { return url.indexOf(p) !== -1; })) {
                        console.log('[LampaPRO] Подменён fetch:', url);
                        var fake = JSON.stringify({
                            premium: true, pro: true, vip: true,
                            expired: false, active: true, end: '2030-12-31'
                        });
                        return Promise.resolve(new Response(fake, { status: 200 }));
                    }
                }
                return origFetch.call(this, input, init);
            };
        }

        var OrigXHR = window.XMLHttpRequest;
        if (OrigXHR) {
            window.XMLHttpRequest = function() {
                var xhr = new OrigXHR();
                var origOpen = xhr.open;
                var origSend = xhr.send;

                xhr.open = function(method, url, async, user, pass) {
                    this._url = url;
                    return origOpen.call(this, method, url, async, user, pass);
                };

                xhr.send = function(body) {
                    var url = this._url;
                    if (url) {
                        if (CONFIG.BLOCKED_REQUEST_PATTERNS.some(function(p) { return url.indexOf(p) !== -1; })) {
                            console.log('[LampaPRO] Блокирован XHR:', url);
                            var self = this;
                            setTimeout(function() {
                                self.readyState = 4;
                                self.status = 200;
                                self.statusText = 'OK';
                                self.responseText = '{}';
                                self.response = '{}';
                                if (self.onreadystatechange) self.onreadystatechange();
                                if (self.onload) self.onload();
                            }, 0);
                            return;
                        }
                        if (CONFIG.PREMIUM_RESPONSE_PATTERNS.some(function(p) { return url.indexOf(p) !== -1; })) {
                            console.log('[LampaPRO] Подменён XHR:', url);
                            var self = this;
                            setTimeout(function() {
                                self.readyState = 4;
                                self.status = 200;
                                self.statusText = 'OK';
                                var fake = JSON.stringify({
                                    premium: true, pro: true, vip: true,
                                    expired: false, active: true, end: '2030-12-31'
                                });
                                self.responseText = fake;
                                self.response = fake;
                                if (self.onreadystatechange) self.onreadystatechange();
                                if (self.onload) self.onload();
                            }, 0);
                            return;
                        }
                    }
                    return origSend.call(this, body);
                };
                return xhr;
            };
            window.XMLHttpRequest.prototype = OrigXHR.prototype;
        }
    }

    // ============================================================
    // 3. ПЕРЕХВАТ СОЗДАНИЯ DOM-ЭЛЕМЕНТОВ (БЕЗ ОПАСНЫХ ПРОВЕРОК)
    // ============================================================
    function blockAdElements() {
        // Только точные совпадения с рекламными классами (не 'ad' в середине слова)
        var adClassRegex = /(^|\s)(ad-preroll|lampa-advert|ad-banner)(\s|$)/;

        var origCreate = document.createElement;
        document.createElement = function(tag, options) {
            var el = origCreate.call(this, tag, options);
            // Проверяем только если это элемент с классом или id
            var className = el.className || '';
            var id = el.id || '';
            // Опасная проверка убрана! Используем точные классы.
            if (adClassRegex.test(className) || id === 'cub-advert') {
                console.log('[LampaPRO] Блокировка создания элемента:', tag, className, id);
                var replacement = origCreate.call(this, 'div');
                replacement.style.display = 'none';
                return replacement;
            }
            return el;
        };

        var origInnerHTML = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML').set;
        if (origInnerHTML) {
            Object.defineProperty(Element.prototype, 'innerHTML', {
                set: function(html) {
                    // Точная проверка на наличие рекламных классов
                    if (/class="[^"]*(ad-preroll|lampa-advert|ad-banner)[^"]*"/i.test(html)) {
                        console.log('[LampaPRO] innerHTML с рекламой заблокирован');
                        return origInnerHTML.call(this, '');
                    }
                    return origInnerHTML.call(this, html);
                },
                get: function() { return this.textContent; },
                configurable: true
            });
        }

        var origInsertAdjacent = Element.prototype.insertAdjacentHTML;
        if (origInsertAdjacent) {
            Element.prototype.insertAdjacentHTML = function(pos, text) {
                if (/class="[^"]*(ad-preroll|lampa-advert|ad-banner)[^"]*"/i.test(text)) {
                    console.log('[LampaPRO] insertAdjacentHTML с рекламой заблокирован');
                    return;
                }
                return origInsertAdjacent.call(this, pos, text);
            };
        }

        var origReplaceChildren = Element.prototype.replaceChildren;
        if (origReplaceChildren) {
            Element.prototype.replaceChildren = function() {
                var nodes = Array.prototype.slice.call(arguments);
                var filtered = nodes.filter(function(node) {
                    if (node.nodeType === 1) {
                        var cls = node.className || '';
                        if (/^.*(ad-preroll|lampa-advert|ad-banner).*$/.test(cls)) {
                            console.log('[LampaPRO] replaceChildren с рекламой заблокирован');
                            return false;
                        }
                    }
                    return true;
                });
                return origReplaceChildren.apply(this, filtered);
            };
        }
    }

    // ============================================================
    // 4. УДАЛЕНИЕ РЕКЛАМНЫХ ЭЛЕМЕНТОВ ИЗ DOM
    // ============================================================
    function removeAdElements() {
        CONFIG.AD_SELECTORS.forEach(function(selector) {
            var elements = document.querySelectorAll(selector);
            for (var i = 0; i < elements.length; i++) {
                elements[i].remove();
                console.log('[LampaPRO] Удалён:', selector);
            }
        });
    }

    // ============================================================
    // 5. ЗАГЛУШКИ ДЛЯ VAST И IMA SDK (без стрелочных функций)
    // ============================================================
    function blockAdSDK() {
        // VASTPlayer (VAST 2)
        var MockVAST = function() {
            console.log('[LampaPRO] VASTPlayer заглушка');
            this.load = function() { return Promise.resolve(); };
            this.startAd = function() { return Promise.resolve(); };
            this.stopAd = function() { return Promise.resolve(); };
            this.on = function() { return this; };
            this.once = function() { return this; };
            this._events = {};
            this.container = document.createElement('div');
        };
        if (typeof Object.defineProperty === 'function') {
            Object.defineProperty(window, 'VASTPlayer', {
                get: function() { return MockVAST; },
                set: function() {},
                configurable: false
            });
        }

        // Google IMA (VAST 3)
        var MockIMA = {
            AdDisplayContainer: function() { this.initialize = function() {}; },
            AdsLoader: function() {
                this.requestAds = function() {};
                this.addEventListener = function() {};
                this.destroy = function() {};
            },
            AdsManager: function() {
                this.init = function() {};
                this.start = function() {};
                this.stop = function() {};
                this.destroy = function() {};
                this.setVolume = function() {};
                this.addEventListener = function() {};
                this.resize = function() {};
            },
            AdsRequest: function() {},
            AdEvent: { Type: { STARTED: 'started', COMPLETE: 'complete', ALL_ADS_COMPLETED: 'allAdsCompleted', SKIPPED: 'skipped', AD_PROGRESS: 'adProgress', PAUSED: 'paused', RESUMED: 'resumed' } },
            AdErrorEvent: { Type: { AD_ERROR: 'adError' } },
            AdsManagerLoadedEvent: { Type: { ADS_MANAGER_LOADED: 'adsManagerLoaded' } },
            ViewMode: { NORMAL: 'normal' },
            ImaSdkSettings: { setVpaidMode: function() {}, setLocale: function() {} }
        };
        if (typeof Object.defineProperty === 'function') {
            Object.defineProperty(window, 'google', {
                get: function() { return { ima: MockIMA }; },
                set: function() {},
                configurable: false
            });
        }
    }

    // ============================================================
    // 6. ПЕРЕОПРЕДЕЛЕНИЕ МЕТОДОВ Lampa (после инициализации)
    // ============================================================
    function applyLampaPatches() {
        try {
            if (window.Lampa && window.Lampa.Preroll) {
                window.Lampa.Preroll.show = function(data, callback) {
                    console.log('[LampaPRO] Preroll.show перехвачен, пропускаем рекламу');
                    callback();
                };
            }
            if (window.Lampa && window.Lampa.Banner) {
                window.Lampa.Banner.start = function() {
                    console.log('[LampaPRO] Banner.start перехвачен');
                };
            }
            if (window.Lampa && window.Lampa.Personal) {
                window.Lampa.Personal.confirm = function() { return true; };
            }
            if (window.Lampa && window.Lampa.Account) {
                if (typeof window.Lampa.Account.hasPremium === 'function') {
                    window.Lampa.Account.hasPremium = function() { return true; };
                }
                if (window.Lampa.Account.Permit) {
                    if (typeof Object.defineProperty === 'function') {
                        Object.defineProperty(window.Lampa.Account.Permit, 'access', {
                            get: function() { return true; },
                            configurable: false
                        });
                        Object.defineProperty(window.Lampa.Account.Permit, 'sync', {
                            get: function() { return true; },
                            configurable: false
                        });
                    } else {
                        window.Lampa.Account.Permit.access = true;
                        window.Lampa.Account.Permit.sync = true;
                    }
                }
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
        var style = document.createElement('style');
        style.textContent = '.ad-preroll,[class*="ad-preroll"],[id*="ad-preroll"],.ad-preroll__bg,.ad-preroll__bg.animate,.lampa-advert,#cub-advert,iframe[src*="ad"],[data-ad],[id*="ad-"]{display:none!important;opacity:0!important;visibility:hidden!important;pointer-events:none!important;width:0!important;height:0!important}';
        (document.head || document.documentElement).appendChild(style);
    }

    // ============================================================
    // 8. ПОДАВЛЕНИЕ ОШИБОК РЕКЛАМЫ
    // ============================================================
    function suppressAdErrors() {
        window.addEventListener('error', function(e) {
            var msg = e.message || '';
            if (msg.indexOf('adPreroll') !== -1 || msg.indexOf('AdPreroll') !== -1 ||
                msg.indexOf('vast') !== -1 || msg.indexOf('IMA') !== -1) {
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
        blockAdScripts();
        interceptNetwork();
        blockAdElements();
        removeAdElements();
        blockAdSDK();
        injectStyles();
        suppressAdErrors();

        var observer = new MutationObserver(function() {
            removeAdElements();
        });
        if (document.documentElement) {
            observer.observe(document.documentElement, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['class', 'id']
            });
        }

        var rafId = null;
        function rafLoop() {
            removeAdElements();
            rafId = requestAnimationFrame(rafLoop);
        }
        rafLoop();
        setTimeout(function() {
            if (rafId) cancelAnimationFrame(rafId);
        }, 30000);

        if (window.Lampa && window.Lampa.Listener) {
            window.Lampa.Listener.follow('app', function(e) {
                if (e.type === 'ready') {
                    applyLampaPatches();
                }
            });
        } else {
            var attempts = 0;
            var interval = setInterval(function() {
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
