(function() {
    'use strict';

    var PLUGIN_ID = 'lampa-gold-tizen';

    if (window.__lampaGoldTizenPlugin) return;
    window.__lampaGoldTizenPlugin = true;

    // ============================================================
    // КОНФИГУРАЦИЯ БЛОКИРОВЩИКА
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
        ],
        // Безопасный точный фильтр классов рекламы (исключает ложные блокировки header/loading)
        AD_CLASS_REGEXP: /(^|\s)(ad-preroll|lampa-advert|ad-banner)(\s|$)/i
    };

    // ============================================================
    // 1. БЛОКИРОВКА ЗАГРУЗКИ РЕКЛАМНЫХ СКРИПТОВ (ES5)
    // ============================================================
    function blockAdScripts() {
        var origAppend = Element.prototype.appendChild;
        var origInsert = Element.prototype.insertBefore;

        function isAdScript(el) {
            if (el && el.tagName === 'SCRIPT' && el.src) {
                var srcStr = String(el.src);
                for (var i = 0; i < CONFIG.BLOCKED_SCRIPT_PATTERNS.length; i++) {
                    if (srcStr.indexOf(CONFIG.BLOCKED_SCRIPT_PATTERNS[i]) !== -1) return true;
                }
            }
            return false;
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
    // 2. ПЕРЕХВАТ FETCH И XMLHTTPREQUEST (ES5)
    // ============================================================
    function interceptNetwork() {
        var origFetch = window.fetch;
        if (origFetch) {
            window.fetch = function(input, init) {
                var url = typeof input === 'string' ? input : (input && input.url ? input.url : '');
                if (url) {
                    var isAd = false;
                    for (var i = 0; i < CONFIG.BLOCKED_REQUEST_PATTERNS.length; i++) {
                        if (url.indexOf(CONFIG.BLOCKED_REQUEST_PATTERNS[i]) !== -1) { isAd = true; break; }
                    }
                    if (isAd) {
                        console.log('[LampaPRO] Блокирован fetch:', url);
                        return Promise.resolve(new Response('{}', { status: 200 }));
                    }

                    var isPro = false;
                    for (var j = 0; j < CONFIG.PREMIUM_RESPONSE_PATTERNS.length; j++) {
                        if (url.indexOf(CONFIG.PREMIUM_RESPONSE_PATTERNS[j]) !== -1) { isPro = true; break; }
                    }
                    if (isPro) {
                        console.log('[LampaPRO] Подменён fetch профиля:', url);
                        var fake = JSON.stringify({
                            premium: true, pro: true, vip: true, expired: false, active: true, end: '2030-12-31'
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
                    var url = this._url || '';
                    if (url) {
                        var isAd = false;
                        for (var i = 0; i < CONFIG.BLOCKED_REQUEST_PATTERNS.length; i++) {
                            if (url.indexOf(CONFIG.BLOCKED_REQUEST_PATTERNS[i]) !== -1) { isAd = true; break; }
                        }
                        if (isAd) {
                            console.log('[LampaPRO] Блокирован XHR:', url);
                            var selfBlock = this;
                            setTimeout(function() {
                                selfBlock.readyState = 4; selfBlock.status = 200; selfBlock.statusText = 'OK';
                                selfBlock.responseText = '{}'; selfBlock.response = '{}';
                                if (selfBlock.onreadystatechange) selfBlock.onreadystatechange();
                                if (selfBlock.onload) selfBlock.onload();
                            }, 0);
                            return;
                        }

                        var isPro = false;
                        for (var j = 0; j < CONFIG.PREMIUM_RESPONSE_PATTERNS.length; j++) {
                            if (url.indexOf(CONFIG.PREMIUM_RESPONSE_PATTERNS[j]) !== -1) { isPro = true; break; }
                        }
                        if (isPro) {
                            console.log('[LampaPRO] Подменён XHR профиля:', url);
                            var selfPro = this;
                            setTimeout(function() {
                                selfPro.readyState = 4; selfPro.status = 200; selfPro.statusText = 'OK';
                                var fake = JSON.stringify({
                                    premium: true, pro: true, vip: true, expired: false, active: true, end: '2030-12-31'
                                });
                                selfPro.responseText = fake; selfPro.response = fake;
                                if (selfPro.onreadystatechange) selfPro.onreadystatechange();
                                if (selfPro.onload) selfPro.onload();
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
    // 3. БЛОКИРОВКА СОЗДАНИЯ РЕКЛАМНЫХ DOM-ЭЛЕМЕНТОВ (БЕЗОПАСНЫЙ ES5)
    // ============================================================
    function blockAdElements() {
        var origCreate = document.createElement;
        document.createElement = function(tag, options) {
            var el = origCreate.call(this, tag, options);
            var className = el.className || '';
            var id = el.id || '';
            
            // Защищено регулярным выражением: не заденет слова header, loading или download
            if (CONFIG.AD_CLASS_REGEXP.test(className) || id === 'cub-advert' || id.indexOf('ad-') === 0) {
                console.log('[LampaPRO] Блокировка создания рекламного элемента:', tag, className, id);
                var replacement = origCreate.call(this, 'div');
                replacement.style.display = 'none';
                return replacement;
            }
            return el;
        };

        var propDesc = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
        var origInnerHTML = propDesc && propDesc.set;
        if (origInnerHTML) {
            Object.defineProperty(Element.prototype, 'innerHTML', {
                set: function(html) {
                    if (CONFIG.AD_CLASS_REGEXP.test(html) || html.indexOf('id="cub-advert"') !== -1) {
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
                if (CONFIG.AD_CLASS_REGEXP.test(text) || text.indexOf('id="cub-advert"') !== -1) {
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
                var filtered = [];
                // Заменено на классический цикл for для 100% совместимости с Tizen OS
                for (var i = 0; i < nodes.length; i++) {
                    var node = nodes[i];
                    if (node && node.nodeType === 1) {
                        var cls = node.className || '';
                        if (CONFIG.AD_CLASS_REGEXP.test(cls)) {
                            console.log('[LampaPRO] replaceChildren с рекламой заблокирован');
                            continue; 
                        }
                    }
                    filtered.push(node);
                }
                return origReplaceChildren.apply(this, filtered);
            };
        }
    }

    // ============================================================
    // 4. ФИЗИЧЕСКОЕ УДАЛЕНИЕ ОСТАТКОВ РЕКЛАМЫ ИЗ DOM (ES5)
    // ============================================================
    function removeAdElements() {
        if (!CONFIG.AD_SELECTORS) return;
        // Заменено .forEach на цикл for для старых процессоров ТВ
        for (var i = 0; i < CONFIG.AD_SELECTORS.length; i++) {
            try {
                var elements = document.querySelectorAll(CONFIG.AD_SELECTORS[i]);
                for (var j = 0; j < elements.length; j++) {
                    if (elements[j]) {
                        elements[j].remove();
                    }
                }
            } catch (e) {}
        }
    }

    // ============================================================
    // 5. ЗАГЛУШКИ ДЛЯ VAST И IMA SDK (БЕЗ СТРЕЛОЧНЫХ ФУНКЦИЙ)
    // ============================================================
    function blockAdSDK() {
        var MockVAST = function() {
            console.log('[LampaPRO] VASTPlayer золотая заглушка');
            this.load = function() { return Promise.resolve(); };
            this.startAd = function() { return Promise.resolve(); };
            this.stopAd = function() { return Promise.resolve(); };
            this.play = function() { return Promise.resolve(); };
            this.on = function() { return this; };
            this.once = function() { return this; };
            this._events = {};
            this.container = document.createElement('div');
        };
        try {
            Object.defineProperty(window, 'VASTPlayer', {
                get: function() { return MockVAST; },
                set: function() {},
                configurable: false
            });
        } catch (e) {}

        var MockIMA = {
            AdDisplayContainer: function() { this.initialize = function() {}; },
            AdsLoader: function() {
                this.requestAds = function() {}; this.addEventListener = function() {}; this.destroy = function() {};
            },
            AdsManager: function() {
                this.init = function() {}; this.start = function() {}; this.stop = function() {};
                this.destroy = function() {}; this.setVolume = function() {}; this.addEventListener = function() {}; this.resize = function() {};
            },
            AdsRequest: function() {},
            AdEvent: { Type: { STARTED: 'started', COMPLETE: 'complete', ALL_ADS_COMPLETED: 'allAdsCompleted', SKIPPED: 'skipped', AD_PROGRESS: 'adProgress', PAUSED: 'paused', RESUMED: 'resumed' } },
            AdErrorEvent: { Type: { AD_ERROR: 'adError' } },
            AdsManagerLoadedEvent: { Type: { ADS_MANAGER_LOADED: 'adsManagerLoaded' } },
            ViewMode: { NORMAL: 'normal' },
            ImaSdkSettings: { setVpaidMode: function() {}, setLocale: function() {} }
        };
        try {
            Object.defineProperty(window, 'google', {
                get: function() { return { ima: MockIMA }; },
                set: function() {},
                configurable: false
            });
        } catch (e) {}
    }
    // ============================================================
    // 6. ПЕРЕОПРЕДЕЛЕНИЕ МЕТОДОВ Lampa (Эмуляция PRO)
    // ============================================================
    function applyLampaPatches() {
        if (!window.Lampa) return;
        try {
            if (window.Lampa.Preroll) {
                window.Lampa.Preroll.show = function(data, callback) {
                    console.log('[LampaPRO] Preroll.show перехвачен, пропускаем рекламу');
                    if (callback) callback();
                };
            }
            if (window.Lampa.Banner) {
                window.Lampa.Banner.start = function() {
                    console.log('[LampaPRO] Banner.start перехвачен');
                };
            }
            if (window.Lampa.Personal) {
                window.Lampa.Personal.confirm = function() { return true; };
            }
            if (window.Lampa.Account) {
                window.Lampa.Account.is_premium = true;
                if (typeof window.Lampa.Account.hasPremium === 'function') {
                    window.Lampa.Account.hasPremium = function() { return true; };
                }
                if (window.Lampa.Account.Permit) {
                    try {
                        Object.defineProperty(window.Lampa.Account.Permit, 'access', { get: function() { return true; }, configurable: false });
                        Object.defineProperty(window.Lampa.Account.Permit, 'sync', { get: function() { return true; }, configurable: false });
                    } catch (e2) {
                        window.Lampa.Account.Permit.access = true;
                        window.Lampa.Account.Permit.sync = true;
                    }
                }
            }
            if (window.Lampa.VastManager && window.Lampa.VastManager.prototype) {
                window.Lampa.VastManager.prototype.get = function() {
                    console.log('[LampaPRO] VastManager.get перехвачен, возвращаем null');
                    return null;
                };
            }
            if (window.CUB) {
                window.CUB.premium = true;
                window.CUB.pro = true;
                window.CUB.vip = true;
                window.CUB.ads = false;
                window.CUB.advert = function() { return false; };
            }
            console.log('[LampaPRO] Патчи Lampa успешно удерживают PRO-статус');
        } catch(e) {
            console.warn('[LampaPRO] Ошибка патчей ядра Lampa:', e);
        }
    }

    // ============================================================
    // 7. ИНЪЕКЦИЯ CSS ДЛЯ СКРЫТИЯ ПЛАШЕК И ФОНА AD-PREROLL
    // ============================================================
    function injectStyles() {
        var style = document.createElement('style');
        style.textContent = '.ad-preroll,[class*="ad-preroll"],[id*="ad-preroll"],.ad-preroll__bg,.ad-preroll__bg.animate,.lampa-advert,#cub-advert,iframe[src*="ad"],[data-ad],[id*="ad-"]{display:none!important;opacity:0!important;visibility:hidden!important;pointer-events:none!important;width:0!important;height:0!important;transition:none!important;animation:none!important;}';
        (document.head || document.documentElement).appendChild(style);
    }

    // ============================================================
    // 8. ПОДАВЛЕНИЕ ОШИБОК ИСЧЕЗНУВШЕЙ РЕКЛАМЫ (Для стабильности Tizen OS)
    // ============================================================
    function suppressAdErrors() {
        window.addEventListener('error', function(e) {
            var msg = e.message || '';
            if (msg.indexOf('adPreroll') !== -1 || msg.indexOf('AdPreroll') !== -1 ||
                msg.indexOf('vast') !== -1 || msg.indexOf('IMA') !== -1) {
                console.log('[LampaPRO] Подавлена ошибка отсутствующего модуля рекламы:', msg);
                if (e.preventDefault) e.preventDefault();
                if (e.stopPropagation) e.stopPropagation();
                return true;
            }
        }, true);
    }

    // ============================================================
    // 9. ЗАПУСК ВСЕХ МЕХАНИЗМОВ ОБХОДА И УСКОРЕНИЯ
    // ============================================================
    function init() {
        blockAdScripts();
        interceptNetwork();
        blockAdElements();
        removeAdElements();
        blockAdSDK();
        injectStyles();
        suppressAdErrors();

        // Фоновый трекер за изменениями на экране телевизора
        if (window.MutationObserver && document.documentElement) {
            var observer = new MutationObserver(function() {
                removeAdElements();
            });
            observer.observe(document.documentElement, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['class', 'id']
            });
        }

        // Супер-быстрый цикл зачистки под частоту экрана (60/120 Гц) для удаления всплывающих баннеров
        var rafId = null;
        if (window.requestAnimationFrame) {
            var rafLoop = function() {
                removeAdElements();
                rafId = requestAnimationFrame(rafLoop);
            };
            rafLoop();
            setTimeout(function() {
                if (rafId && window.cancelAnimationFrame) cancelAnimationFrame(rafId);
            }, 30000);
        }

        // Синхронизация с нативной загрузкой приложения Lampa
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

        // Дополнительный фоновый таймер удержания PRO на случай ленивой загрузки CUB
        var backgroundPROTimer = setInterval(applyLampaPatches, 30);
        setTimeout(function() { clearInterval(backgroundPROTimer); }, 15000);

        console.log('[LampaPRO] Золотая версия плагина успешно активирована.');
    }

    // ============================================================
    // 10. БЕЗОПАСНЫЙ СТАРТ ПОСЛЕ ЗАГРУЗКИ DOM
    // ============================================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
