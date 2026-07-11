(function() {
    'use strict';

    // Безопасная конфигурация — только селекторы для удаления
    var AD_SELECTORS = [
        '.ad-preroll', '.ad-preroll__bg', '[class*="ad-preroll"]',
        '.lampa-advert', '#cub-advert', '.player-video__advert',
        '.ad-banner', 'iframe[src*="ad"]', '[data-ad]', '[id*="ad-"]'
    ];

    var BLOCKED_SCRIPT_PATTERNS = ['vast.js', 'yumata.github.io/lampa'];

    // ============================================================
    // 1. БЛОКИРОВКА ЗАГРУЗКИ РЕКЛАМНЫХ СКРИПТОВ
    // ============================================================
    function blockAdScripts() {
        var origAppend = Element.prototype.appendChild;
        var origInsert = Element.prototype.insertBefore;

        function isAdScript(el) {
            if (!el || el.tagName !== 'SCRIPT' || !el.src) return false;
            for (var i = 0; i < BLOCKED_SCRIPT_PATTERNS.length; i++) {
                if (el.src.indexOf(BLOCKED_SCRIPT_PATTERNS[i]) !== -1) return true;
            }
            return false;
        }

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
    // 2. УДАЛЕНИЕ РЕКЛАМНЫХ ЭЛЕМЕНТОВ ИЗ DOM
    // ============================================================
    function removeAdElements() {
        for (var i = 0; i < AD_SELECTORS.length; i++) {
            var selector = AD_SELECTORS[i];
            var elements = document.querySelectorAll(selector);
            for (var j = 0; j < elements.length; j++) {
                elements[j].remove();
                // console.log('[LampaPRO] Удалён:', selector);
            }
        }
    }

    // ============================================================
    // 3. ЗАГЛУШКИ ДЛЯ VAST И IMA SDK
    // ============================================================
    function blockAdSDK() {
        // VASTPlayer
        function MockVAST() {
            this.load = function() { return Promise.resolve(); };
            this.startAd = function() { return Promise.resolve(); };
            this.stopAd = function() { return Promise.resolve(); };
            this.on = function() { return this; };
            this.once = function() { return this; };
            this._events = {};
            this.container = document.createElement('div');
        }
        Object.defineProperty(window, 'VASTPlayer', {
            get: function() { return MockVAST; },
            set: function() {},
            configurable: false
        });

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
        Object.defineProperty(window, 'google', {
            get: function() { return { ima: MockIMA }; },
            set: function() {},
            configurable: false
        });
    }

    // ============================================================
    // 4. ИНЪЕКЦИЯ CSS ДЛЯ СКРЫТИЯ РЕКЛАМЫ
    // ============================================================
    function injectStyles() {
        var style = document.createElement('style');
        style.textContent = 
            '.ad-preroll, [class*="ad-preroll"], [id*="ad-preroll"], ' +
            '.ad-preroll__bg, .ad-preroll__bg.animate, ' +
            '.lampa-advert, #cub-advert, ' +
            'iframe[src*="ad"], [data-ad], [id*="ad-"] { ' +
            'display: none !important; ' +
            'opacity: 0 !important; ' +
            'visibility: hidden !important; ' +
            'pointer-events: none !important; ' +
            'width: 0 !important; ' +
            'height: 0 !important; ' +
            '}';
        (document.head || document.documentElement).appendChild(style);
    }

    // ============================================================
    // 5. ПОДАВЛЕНИЕ ОШИБОК РЕКЛАМНЫХ МОДУЛЕЙ
    // ============================================================
    function suppressAdErrors() {
        window.addEventListener('error', function(e) {
            var msg = e.message || '';
            if (msg.indexOf('adPreroll') !== -1 || msg.indexOf('AdPreroll') !== -1 ||
                msg.indexOf('vast') !== -1 || msg.indexOf('IMA') !== -1) {
                e.preventDefault();
                e.stopPropagation();
                return true;
            }
        }, true);
    }

    // ============================================================
    // 6. ПРИМЕНЕНИЕ ПАТЧЕЙ ДЛЯ Lampa (ТОЛЬКО ПОСЛЕ APP:READY)
    // ============================================================
    function applyLampaPatches() {
        try {
            // Preroll.show – сразу вызываем callback
            if (window.Lampa && window.Lampa.Preroll) {
                window.Lampa.Preroll.show = function(data, callback) {
                    // console.log('[LampaPRO] Preroll.show перехвачен');
                    callback();
                };
            }
            // Banner.start – заглушка
            if (window.Lampa && window.Lampa.Banner) {
                window.Lampa.Banner.start = function() {
                    // console.log('[LampaPRO] Banner.start перехвачен');
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
                        get: function() { return true; },
                        configurable: false
                    });
                    Object.defineProperty(window.Lampa.Account.Permit, 'sync', {
                        get: function() { return true; },
                        configurable: false
                    });
                }
            }
            // console.log('[LampaPRO] Патчи для Lampa успешно применены');
        } catch(e) {
            // игнорируем ошибки патчей
        }
    }

    // ============================================================
    // 7. ЗАПУСК ВСЕХ МЕХАНИЗМОВ
    // ============================================================
    function init() {
        blockAdScripts();
        blockAdSDK();
        injectStyles();
        suppressAdErrors();

        // Удаляем рекламу сразу
        removeAdElements();

        // MutationObserver для постоянной очистки
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

        // Дополнительный цикл через requestAnimationFrame (первые 30 секунд)
        var rafId = null;
        function rafLoop() {
            removeAdElements();
            rafId = requestAnimationFrame(rafLoop);
        }
        rafLoop();
        setTimeout(function() {
            if (rafId) cancelAnimationFrame(rafId);
        }, 30000);

        // Отложенное применение патчей для Lampa (после загрузки приложения)
        function waitForLampa() {
            if (window.Lampa && window.Lampa.Listener) {
                window.Lampa.Listener.follow('app', function(e) {
                    if (e.type === 'ready') {
                        applyLampaPatches();
                    }
                });
                // На случай, если событие уже произошло, но мы не успели подписаться
                // проверим состояние appready
                if (window.appready) {
                    applyLampaPatches();
                }
            } else {
                // Если Lampa ещё не определена, ждём с интервалом
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
                        if (window.appready) {
                            applyLampaPatches();
                        }
                    } else if (attempts > 50) {
                        clearInterval(interval);
                        // Принудительно через 2 секунды
                        setTimeout(applyLampaPatches, 2000);
                    }
                }, 100);
            }
        }

        waitForLampa();

        // console.log('[LampaPRO] Механизмы обхода активированы (безопасный режим)');
    }

    // ============================================================
    // 8. СТАРТ ПОСЛЕ ЗАГРУЗКИ DOM
    // ============================================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
