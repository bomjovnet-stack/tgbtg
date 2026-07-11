(function() { 
    'use strict'; 

    var PLUGIN_ID = 'lampa-gold-advanced';

    if (window.__lampaGoldPlugin) return;
    window.__lampaGoldPlugin = true;

    // ============================================================
    // РАСШИРЕННАЯ КОНФИГУРАЦИЯ НА ОСНОВЕ АНАЛИЗА app.min.js
    // ============================================================
    var CONFIG = { 
        // Селекторы рекламы
        AD_SELECTORS: [ 
            '.ad-preroll', '.ad-preroll__bg', '[class*="ad-preroll"]', 
            '.lampa-advert', '#cub-advert', '.player-video__advert', 
            '.ad-banner', 'iframe[src*="ad"]', '[data-ad]', '[id*="ad-"]',
            '[class*="advertisement"]', '[class*="banner"]', '.preroll',
            '[data-advertisement]', '.advertisement-container',
            '.player-footer__row', '.player-overlay', '[class*="player-ad"]'
        ], 
        // Скрипты для блокировки
        BLOCKED_SCRIPT_PATTERNS: [
            'vast.js', 'yumata.github.io/lampa', 'ima.js', 'adsbygoogle',
            'googlesyndication', 'pagead', 'adn.js', '/ads/', 'advertisement',
            'preroll', 'advert'
        ], 
        // Сетевые запросы для блокировки
        BLOCKED_REQUEST_PATTERNS: [ 
            '/vast', '/ad/', '/preroll', '/advert', 'yumata', 'cub-ads', 
            '/api/ad/get/preroll', '/api/ad/get/banner', '/api/checker',
            '/check/adblock', '/verify/user', '/anti-ad', '/detector',
            'advertisement', '/ads/', 'ima.js', 'vast', 'doubleclick',
            '/api/user/profile', '/viewed', '/account'
        ], 
        // Premium запросы (спуфинг)
        PREMIUM_RESPONSE_PATTERNS: [ 
            '/account/status', '/premium/check', '/cub/premium', 
            '/users/get', '/profiles/all', '/api/user', '/api/profile',
            '/subscription', '/verify/premium', '/viewed'
        ],
        // Паттерны для обнаружения проверок
        AD_DETECTION_PATTERNS: [
            'adblock', 'adblocker', 'anti-ad', 'addetect', 
            'checksForAdblock', 'detectAd', 'hasAdblock', 'checkAdblock',
            'fix_widget', 'account_use', 'account_sync'
        ],
        AD_CLASS_REGEXP: /(^|\s)(ad-preroll|lampa-advert|ad-banner|cub-advert|advertisement|preroll|player-ad)(\s|$)/i,
        CHECK_INTERVAL: 300,
        OBSERVER_CONFIG: { 
            childList: true, 
            subtree: true, 
            attributes: true, 
            attributeFilter: ['class', 'id', 'style', 'data-ad'],
            characterData: false
        }
    };

    // Кеш и флаги
    var cache = {
        blockedPatterns: {},
        premiumPatterns: {},
        detectionPatterns: {},
        removedElements: 0
    };

    var state = {
        playerDetected: false,
        premiumFaked: false,
        checksDisabled: false,
        lampaInitialized: false
    };

    function log(msg) {
        if (window.console && console.log) {
            console.log('[' + PLUGIN_ID + '] ' + msg);
        }
    }

    // ============================================================
    // УТИЛИТЫ ДЛЯ ПРОВЕРОК
    // ============================================================
    function isBlockedRequest(url) {
        if (cache.blockedPatterns[url] !== undefined) {
            return cache.blockedPatterns[url];
        }
        var result = false;
        var urlLower = url.toLowerCase();
        for (var i = 0; i < CONFIG.BLOCKED_REQUEST_PATTERNS.length; i++) {
            if (urlLower.indexOf(CONFIG.BLOCKED_REQUEST_PATTERNS[i]) !== -1) {
                result = true;
                break;
            }
        }
        cache.blockedPatterns[url] = result;
        return result;
    }

    function isPremiumRequest(url) {
        if (cache.premiumPatterns[url] !== undefined) {
            return cache.premiumPatterns[url];
        }
        var result = false;
        var urlLower = url.toLowerCase();
        for (var i = 0; i < CONFIG.PREMIUM_RESPONSE_PATTERNS.length; i++) {
            if (urlLower.indexOf(CONFIG.PREMIUM_RESPONSE_PATTERNS[i]) !== -1) {
                result = true;
                break;
            }
        }
        cache.premiumPatterns[url] = result;
        return result;
    }

    function isAdDetectionCode(code) {
        var codeStr = code.toString().toLowerCase();
        for (var i = 0; i < CONFIG.AD_DETECTION_PATTERNS.length; i++) {
            if (codeStr.indexOf(CONFIG.AD_DETECTION_PATTERNS[i]) !== -1) {
                return true;
            }
        }
        return false;
    }

    function getPremiumResponse() {
        return {
            premium: true, 
            pro: true, 
            vip: true,
            gold: true,
            expired: false, 
            active: true, 
            end: '2099-12-31',
            account: {
                premium: true,
                profile: { id: 1, child: false, age: 99 },
                token: 'fake_token_' + Math.random(),
                username: 'Gold_User'
            },
            status: 200
        };
    }

    // ============================================================
    // 1. БЛОКИРОВКА РЕКЛАМНЫХ СКРИПТОВ И ПРОВЕРОК
    // ============================================================
    function blockAdScripts() { 
        try {
            var origAppend = Element.prototype.appendChild; 
            var origInsert = Element.prototype.insertBefore;
            var origSetAttribute = Element.prototype.setAttribute;

            function isAdScript(el) {
                try {
                    if (el && el.tagName === 'SCRIPT') {
                        var srcStr = String(el.src || '').toLowerCase();
                        var textContent = String(el.textContent || '');
                        
                        // Проверка src
                        for (var i = 0; i < CONFIG.BLOCKED_SCRIPT_PATTERNS.length; i++) {
                            if (srcStr.indexOf(CONFIG.BLOCKED_SCRIPT_PATTERNS[i]) !== -1) {
                                return true;
                            }
                        }
                        
                        // Проверка текстового содержимого на код детекции
                        if (isAdDetectionCode(textContent)) {
                            return true;
                        }
                    }
                } catch (e) {}
                return false;
            }

            Element.prototype.appendChild = function(el) { 
                try {
                    if (isAdScript(el)) { 
                        el.src = 'data:text/javascript;base64,Y29uc29sZS5sb2coJ0FkQmxvY2tlZCcpOw=='; 
                        log('✗ Blocked ad script');
                    } 
                } catch (e) {}
                return origAppend.call(this, el); 
            }; 

            Element.prototype.insertBefore = function(el, ref) { 
                try {
                    if (isAdScript(el)) { 
                        el.src = 'data:text/javascript;base64,Y29uc29sZS5sb2coJ0FkQmxvY2tlZCcpOw=='; 
                        log('✗ Blocked ad script in insertBefore');
                    } 
                } catch (e) {}
                return origInsert.call(this, el, ref); 
            };

            // Блокировка setAttribute для адских атрибутов
            Element.prototype.setAttribute = function(name, value) {
                try {
                    var nameLower = String(name).toLowerCase();
                    var valueLower = String(value).toLowerCase();
                    
                    if ((nameLower === 'data-ad' || nameLower.indexOf('ad-') === 0) && 
                        valueLower !== 'false') {
                        return;
                    }
                } catch (e) {}
                return origSetAttribute.call(this, name, value);
            };

        } catch (e) {
            log('Failed to initialize script blocking');
        }
    } 

    // ============================================================
    // 2. ПЕРЕХВАТ И СПУФИНГ СЕТЕВЫХ ЗАПРОСОВ
    // ============================================================
    function interceptNetwork() { 
        // Перехват Fetch API
        try {
            var origFetch = window.fetch; 
            if (origFetch) {
                window.fetch = function(input, init) { 
                    try {
                        var url = typeof input === 'string' ? input : (input && input.url ? input.url : ''); 
                        if (url) {
                            // Блокировка
                            if (isBlockedRequest(url)) { 
                                log('✗ Fetch blocked: ' + url); 
                                return Promise.resolve(new Response('{}', { status: 200 })); 
                            } 

                            // Premium спуфинг
                            if (isPremiumRequest(url)) { 
                                log('✓ Fetch premium response: ' + url); 
                                var premiumResponse = getPremiumResponse();
                                return Promise.resolve(new Response(JSON.stringify(premiumResponse), { 
                                    status: 200,
                                    headers: { 'Content-Type': 'application/json' }
                                })); 
                            } 
                        }
                    } catch (e) {}
                    return origFetch.call(this, input, init); 
                }; 
            }
        } catch (e) {}

        // Перехват XMLHttpRequest
        try {
            var OrigXHR = window.XMLHttpRequest; 
            if (OrigXHR) {
                window.XMLHttpRequest = function() { 
                    var xhr = new OrigXHR(); 
                    var origOpen = xhr.open; 
                    var origSend = xhr.send;
                    var origSetRequestHeader = xhr.setRequestHeader;

                    xhr.open = function(method, url, async, user, pass) { 
                        try {
                            this._url = url; 
                            this._method = method;
                        } catch (e) {}
                        return origOpen.call(this, method, url, async, user, pass); 
                    }; 

                    xhr.setRequestHeader = function(header, value) {
                        try {
                            var headerLower = String(header).toLowerCase();
                            if (headerLower === 'user-agent' || 
                                headerLower === 'x-requested-with' ||
                                headerLower === 'accept-encoding') {
                                return;
                            }
                        } catch (e) {}
                        return origSetRequestHeader.call(this, header, value);
                    };

                    xhr.send = function(body) { 
                        try {
                            var url = this._url || ''; 
                            if (url) {
                                // Блокировка
                                if (isBlockedRequest(url)) { 
                                    log('✗ XHR blocked: ' + url); 
                                    var selfBlock = this;
                                    setTimeout(function() { 
                                        try {
                                            selfBlock.readyState = 4;
                                            selfBlock.status = 200;
                                            selfBlock.statusText = 'OK'; 
                                            selfBlock.responseText = '{}';
                                            selfBlock.response = '{}';
                                            selfBlock.getAllResponseHeaders = function() { return ''; };
                                            selfBlock.getResponseHeader = function() { return null; };
                                            if (selfBlock.onreadystatechange) selfBlock.onreadystatechange(); 
                                            if (selfBlock.onload) selfBlock.onload(); 
                                        } catch (e) {}
                                    }, 0); 
                                    return; 
                                } 

                                // Premium спуфинг
                                if (isPremiumRequest(url)) { 
                                    log('✓ XHR premium response: ' + url); 
                                    var selfPro = this;
                                    setTimeout(function() { 
                                        try {
                                            selfPro.readyState = 4;
                                            selfPro.status = 200;
                                            selfPro.statusText = 'OK'; 
                                            var premiumResponse = getPremiumResponse();
                                            selfPro.responseText = JSON.stringify(premiumResponse);
                                            selfPro.response = premiumResponse;
                                            selfPro.getAllResponseHeaders = function() { return 'Content-Type: application/json'; };
                                            selfPro.getResponseHeader = function(h) { 
                                                return h.toLowerCase() === 'content-type' ? 'application/json' : null; 
                                            };
                                            if (selfPro.onreadystatechange) selfPro.onreadystatechange(); 
                                            if (selfPro.onload) selfPro.onload(); 
                                        } catch (e) {}
                                    }, 0); 
                                    return; 
                                } 
                            }
                        } catch (e) {}
                        return origSend.call(this, body); 
                    }; 
                    return xhr; 
                }; 
                window.XMLHttpRequest.prototype = OrigXHR.prototype; 
            }
        } catch (e) {}
    } 

    // ============================================================
    // 3. СПУФИНГ LAMPA ОБЪЕКТОВ И ГЛОБАЛЬНЫХ ПЕРЕМЕННЫХ
    // ============================================================
    function spoofLampaObjects() {
        try {
            // Создание fake Lampa объекта если его нет
            if (!window.Lampa) {
                window.Lampa = {};
            }

            // Lampa.Account
            if (!window.Lampa.Account) {
                window.Lampa.Account = {};
            }

            // Spoof Permit объект
            try {
                Object.defineProperty(window.Lampa.Account, 'Permit', {
                    get: function() {
                        return {
                            access: true,
                            use: true,
                            sync: true,
                            premium: true,
                            pro: true,
                            vip: true,
                            gold: true,
                            account: {
                                premium: true,
                                profile: { id: 1, child: false, age: 99 },
                                token: 'fake_premium_' + Math.random(),
                                username: 'Gold_User'
                            }
                        };
                    },
                    configurable: false
                });
            } catch (e) {
                window.Lampa.Account.Permit = getPremiumResponse();
            }

            // Lampa settings
            if (!window.lampa_settings) {
                window.lampa_settings = {};
            }
            window.lampa_settings.fix_widget = true;
            window.lampa_settings.account_use = true;
            window.lampa_settings.account_sync = true;
            window.lampa_settings.premium = true;
            window.lampa_settings.pro = true;
            window.lampa_settings.vip = true;
            window.lampa_settings.gold = true;

            log('✓ Lampa objects spoofed');
        } catch (e) {
            log('Error in spoofLampaObjects');
        }
    }

    // ============================================================
    // 4. БЛОКИРОВКА ЭЛЕМЕНТОВ DOM
    // ============================================================
    function blockAdElements() { 
        try {
            var origCreate = document.createElement; 
            document.createElement = function(tag, options) { 
                try {
                    var el = origCreate.call(this, tag, options); 
                    var className = el.className || ''; 
                    var id = el.id || ''; 
                    
                    if (CONFIG.AD_CLASS_REGEXP.test(className) || 
                        id.toLowerCase().indexOf('ad') !== -1 ||
                        className.toLowerCase().indexOf('advert') !== -1) { 
                        var replacement = origCreate.call(this, 'div'); 
                        replacement.style.display = 'none'; 
                        return replacement; 
                    } 
                    return el;
                } catch (e) {
                    return origCreate.call(this, tag, options);
                }
            }; 
        } catch (e) {}
    } 

    // ============================================================
    // 5. УДАЛЕНИЕ РЕКЛАМНЫХ ЭЛЕМЕНТОВ ИЗ DOM
    // ============================================================
    function removeAdElements() { 
        try {
            if (!CONFIG.AD_SELECTORS) return;
            var removed = 0;
            for (var i = 0; i < CONFIG.AD_SELECTORS.length; i++) {
                try {
                    var elements = document.querySelectorAll(CONFIG.AD_SELECTORS[i]);
                    for (var j = elements.length - 1; j >= 0; j--) {
                        if (elements[j]) {
                            elements[j].style.display = 'none';
                            elements[j].style.visibility = 'hidden';
                            elements[j].style.height = '0';
                            elements[j].style.width = '0';
                            if (elements[j].parentNode) {
                                elements[j].parentNode.removeChild(elements[j]);
                            }
                            removed++;
                        }
                    }
                } catch (e) {}
            }
            if (removed > 0) {
                cache.removedElements += removed;
            }
        } catch (e) {}
    } 

    // ============================================================
    // 6. ИНЪЕКЦИЯ CSS СТИЛЕЙ
    // ============================================================
    function injectStyles() {
        try {
            var style = document.createElement('style');
            style.id = 'lampa-gold-styles';
            style.textContent = 
                '.ad-preroll, .ad-preroll__bg, .lampa-advert, #cub-advert, ' +
                '.player-video__advert, .ad-banner, [data-ad], [class*="advertisement"], ' +
                '[class*="advertisement-container"], .preroll, [data-advertisement], ' +
                '.player-footer__row, .player-overlay, [class*="player-ad"] ' +
                '{ display: none !important; opacity: 0 !important; visibility: hidden !important; ' +
                'width: 0 !important; height: 0 !important; margin: 0 !important; padding: 0 !important; ' +
                'position: absolute !important; left: -9999px !important; top: -9999px !important; } ' +
                'body { overflow: auto !important; } ' +
                '.player-container { height: auto !important; }';
            
            // Проверяем нет ли уже такого стиля
            if (!document.getElementById('lampa-gold-styles')) {
                if (document.head) {
                    document.head.appendChild(style);
                } else if (document.documentElement) {
                    document.documentElement.appendChild(style);
                }
            }
            log('✓ Styles injected');
        } catch (e) {}
    }

    // ============================================================
    // 7. МОКИРОВАНИЕ VAST И IMA SDK
    // ============================================================
    function blockAdSDK() { 
        try {
            // VAST мок
            var MockVAST = function() { 
                this.load = function() { return Promise.resolve(); }; 
                this.startAd = function() { return Promise.resolve(); }; 
                this.stopAd = function() { return Promise.resolve(); }; 
                this.play = function() { return Promise.resolve(); };
                this.pause = function() { return Promise.resolve(); };
                this.on = function() { return this; }; 
                this.once = function() { return this; }; 
                this.off = function() { return this; };
                this.emit = function() { return this; };
                this._events = {}; 
                this.container = document.createElement('div');
            };

            try {
                Object.defineProperty(window, 'VASTPlayer', { 
                    get: function() { return MockVAST; }, 
                    set: function() {}, 
                    configurable: false 
                });
            } catch (e) {
                window.VASTPlayer = MockVAST;
            }

            // IMA мок
            var MockAdsLoader = function() {
                this.addEventListener = function() {};
                this.contentComplete = function() {};
                this.requestAds = function() {};
            };

            var MockAdsManager = function() {
                this.addEventListener = function() {};
                this.start = function() {};
                this.pause = function() {};
                this.resume = function() {};
                this.getAdProgress = function() { return { currentTime: 0, duration: 0 }; };
                this.destroy = function() {};
            };

            var MockAdDisplayContainer = function() {
                this.initialize = function() {};
            };

            var MockIMA = {
                AdsLoader: MockAdsLoader,
                AdsManager: MockAdsManager,
                AdDisplayContainer: MockAdDisplayContainer,
                ImaSdkSettings: { setPlayer: function() {}, setPlayerVersion: function() {} },
                AdEvent: { Type: { LOADED: 'loaded', STARTED: 'started', COMPLETE: 'complete' } }
            };

            try {
                Object.defineProperty(window, 'google', {
                    value: { ima: MockIMA },
                    writable: false,
                    configurable: false
                });
            } catch (e) {
                window.google = { ima: MockIMA };
            }

            log('✓ SDK mocks initialized');
        } catch (e) {}
    }

    // ============================================================
    // 8. MUTATION OBSERVER ДЛЯ ДИНАМИЧЕСКИХ ЭЛЕМЕНТОВ
    // ============================================================
    function observeDOMChanges() {
        try {
            if (typeof MutationObserver === 'undefined') {
                log('MutationObserver not supported, using interval');
                setInterval(removeAdElements, CONFIG.CHECK_INTERVAL);
                return;
            }

            var observer = new MutationObserver(function(mutations) {
                try {
                    var hasAdMutation = false;
                    for (var i = 0; i < mutations.length; i++) {
                        var mutation = mutations[i];
                        if (mutation.addedNodes && mutation.addedNodes.length > 0) {
                            for (var j = 0; j < mutation.addedNodes.length; j++) {
                                var node = mutation.addedNodes[j];
                                if (node.nodeType === 1) { // Element node
                                    var className = (node.className || '').toLowerCase();
                                    if (className.indexOf('ad') !== -1 || 
                                        className.indexOf('advert') !== -1 ||
                                        className.indexOf('banner') !== -1) {
                                        hasAdMutation = true;
                                        break;
                                    }
                                }
                            }
                        }
                        if (hasAdMutation) break;
                    }
                    if (hasAdMutation) {
                        removeAdElements();
                    }
                } catch (e) {}
            });

            var config = CONFIG.OBSERVER_CONFIG;
            if (document.documentElement) {
                observer.observe(document.documentElement, config);
                log('✓ DOM observer started');
            }
        } catch (e) {
            log('Fallback to interval');
            setInterval(removeAdElements, CONFIG.CHECK_INTERVAL);
        }
    }

    // ============================================================
    // 9. ИНИЦИАЛИЗАЦИЯ
    // ============================================================
    function initialize() {
        try {
            log('=== Plugin initialization started ===');
            
            spoofLampaObjects();
            blockAdScripts();
            interceptNetwork();
            blockAdElements();
            injectStyles();
            blockAdSDK();
            
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', function() {
                    removeAdElements();
                    observeDOMChanges();
                    state.lampaInitialized = true;
                });
            } else {
                removeAdElements();
                observeDOMChanges();
                state.lampaInitialized = true;
            }
            
            log('=== Plugin initialization completed ===');
            state.checksDisabled = true;
        } catch (e) {
            log('FATAL: Initialization failed');
        }
    }

    // Запуск при загрузке
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

})();
