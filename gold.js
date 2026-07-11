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
        AD_CLASS_REGEXP: /(^|\s)(ad-preroll|lampa-advert|ad-banner|cub-advert)(\s|$)/i,
        CHECK_INTERVAL: 1000,
        OBSERVER_CONFIG: { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'id'] }
    }; 

    // Кеш для проверок
    var cache = {
        blockedPatterns: {},
        premiumPatterns: {}
    };

    function log(msg) {
        if (window.console && console.log) {
            console.log('[' + PLUGIN_ID + '] ' + msg);
        }
    }

    function isBlockedRequest(url) {
        if (cache.blockedPatterns[url] !== undefined) {
            return cache.blockedPatterns[url];
        }
        var result = false;
        for (var i = 0; i < CONFIG.BLOCKED_REQUEST_PATTERNS.length; i++) {
            if (url.indexOf(CONFIG.BLOCKED_REQUEST_PATTERNS[i]) !== -1) {
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
        for (var i = 0; i < CONFIG.PREMIUM_RESPONSE_PATTERNS.length; i++) {
            if (url.indexOf(CONFIG.PREMIUM_RESPONSE_PATTERNS[i]) !== -1) {
                result = true;
                break;
            }
        }
        cache.premiumPatterns[url] = result;
        return result;
    }

    // ============================================================
    // 1. БЛОКИРОВКА ЗАГРУЗКИ РЕКЛАМНЫХ СКРИПТОВ (ES5)
    // ============================================================
    function blockAdScripts() { 
        try {
            var origAppend = Element.prototype.appendChild; 
            var origInsert = Element.prototype.insertBefore; 

            function isAdScript(el) {
                try {
                    if (el && el.tagName === 'SCRIPT' && el.src) {
                        var srcStr = String(el.src);
                        for (var i = 0; i < CONFIG.BLOCKED_SCRIPT_PATTERNS.length; i++) {
                            if (srcStr.indexOf(CONFIG.BLOCKED_SCRIPT_PATTERNS[i]) !== -1) return true;
                        }
                    }
                } catch (e) {
                    log('Error checking ad script: ' + e.message);
                }
                return false;
            }

            Element.prototype.appendChild = function(el) { 
                try {
                    if (isAdScript(el)) { 
                        el.src = 'data:text/javascript;base64,Y29uc29sZS5sb2coJ0FkQmxvY2tlZCcpOw=='; 
                        log('Blocked ad script: ' + el.src);
                    } 
                } catch (e) {
                    log('Error in appendChild: ' + e.message);
                }
                return origAppend.call(this, el); 
            }; 

            Element.prototype.insertBefore = function(el, ref) { 
                try {
                    if (isAdScript(el)) { 
                        el.src = 'data:text/javascript;base64,Y29uc29sZS5sb2coJ0FkQmxvY2tlZCcpOw=='; 
                        log('Blocked ad script in insertBefore: ' + el.src);
                    } 
                } catch (e) {
                    log('Error in insertBefore: ' + e.message);
                }
                return origInsert.call(this, el, ref); 
            }; 
        } catch (e) {
            log('Failed to initialize script blocking: ' + e.message);
        }
    } 

    // ============================================================
    // 2. ПЕРЕХВАТ FETCH И XMLHTTPREQUEST (ES5)
    // ============================================================
    function interceptNetwork() { 
        try {
            var origFetch = window.fetch; 
            if (origFetch) {
                window.fetch = function(input, init) { 
                    try {
                        var url = typeof input === 'string' ? input : (input && input.url ? input.url : ''); 
                        if (url) {
                            if (isBlockedRequest(url)) { 
                                log('Fetch blocked: ' + url); 
                                return Promise.resolve(new Response('{}', { status: 200 })); 
                            } 

                            if (isPremiumRequest(url)) { 
                                log('Fetch spoofed as premium: ' + url); 
                                var fake = JSON.stringify({ 
                                    premium: true, pro: true, vip: true, 
                                    expired: false, active: true, end: '2030-12-31' 
                                }); 
                                return Promise.resolve(new Response(fake, { status: 200 })); 
                            } 
                        }
                    } catch (e) {
                        log('Error in fetch interception: ' + e.message);
                    }
                    return origFetch.call(this, input, init); 
                }; 
            }
        } catch (e) {
            log('Failed to initialize fetch interception: ' + e.message);
        }

        try {
            var OrigXHR = window.XMLHttpRequest; 
            if (OrigXHR) {
                window.XMLHttpRequest = function() { 
                    var xhr = new OrigXHR(); 
                    var origOpen = xhr.open; 
                    var origSend = xhr.send; 

                    xhr.open = function(method, url, async, user, pass) { 
                        try {
                            this._url = url; 
                        } catch (e) {
                            log('Error in XHR open: ' + e.message);
                        }
                        return origOpen.call(this, method, url, async, user, pass); 
                    }; 

                    xhr.send = function(body) { 
                        try {
                            var url = this._url || ''; 
                            if (url) {
                                if (isBlockedRequest(url)) { 
                                    log('XHR blocked: ' + url); 
                                    var selfBlock = this;
                                    setTimeout(function() { 
                                        try {
                                            selfBlock.readyState = 4;
                                            selfBlock.status = 200;
                                            selfBlock.statusText = 'OK'; 
                                            selfBlock.responseText = '{}';
                                            selfBlock.response = '{}'; 
                                            if (selfBlock.onreadystatechange) selfBlock.onreadystatechange(); 
                                            if (selfBlock.onload) selfBlock.onload(); 
                                        } catch (e) {
                                            log('Error in blocked XHR response: ' + e.message);
                                        }
                                    }, 0); 
                                    return; 
                                } 

                                if (isPremiumRequest(url)) { 
                                    log('XHR spoofed as premium: ' + url); 
                                    var selfPro = this;
                                    setTimeout(function() { 
                                        try {
                                            selfPro.readyState = 4;
                                            selfPro.status = 200;
                                            selfPro.statusText = 'OK'; 
                                            var fake = JSON.stringify({ 
                                                premium: true, pro: true, vip: true, 
                                                expired: false, active: true, end: '2030-12-31' 
                                            }); 
                                            selfPro.responseText = fake;
                                            selfPro.response = fake; 
                                            if (selfPro.onreadystatechange) selfPro.onreadystatechange(); 
                                            if (selfPro.onload) selfPro.onload(); 
                                        } catch (e) {
                                            log('Error in premium XHR response: ' + e.message);
                                        }
                                    }, 0); 
                                    return; 
                                } 
                            }
                        } catch (e) {
                            log('Error in XHR send: ' + e.message);
                        }
                        return origSend.call(this, body); 
                    }; 
                    return xhr; 
                }; 
                window.XMLHttpRequest.prototype = OrigXHR.prototype; 
            }
        } catch (e) {
            log('Failed to initialize XHR interception: ' + e.message);
        }
    } 

    // ============================================================
    // 3. БЕЗОПАСНАЯ БЛОКИРОВКА ЭЛЕМЕНТОВ (БЕЗ ТРОГАНИЯ innerHTML)
    // ============================================================
    function blockAdElements() { 
        try {
            var origCreate = document.createElement; 
            document.createElement = function(tag, options) { 
                try {
                    var el = origCreate.call(this, tag, options); 
                    var className = el.className || ''; 
                    var id = el.id || ''; 
                    
                    if (CONFIG.AD_CLASS_REGEXP.test(className) || id === 'cub-advert') { 
                        log('Blocking element creation: ' + tag + ' class=' + className); 
                        var replacement = origCreate.call(this, 'div'); 
                        replacement.style.display = 'none'; 
                        return replacement; 
                    } 
                    return el;
                } catch (e) {
                    log('Error in createElement: ' + e.message);
                    return origCreate.call(this, tag, options);
                }
            }; 
        } catch (e) {
            log('Failed to initialize element blocking: ' + e.message);
        }
    } 

    // ============================================================
    // 4. ФИЗИЧЕСКОЕ УДАЛЕНИЕ РЕКЛАМНЫХ ЭЛЕМЕНТОВ ИЗ DOM (ES5)
    // ============================================================
    function removeAdElements() { 
        try {
            if (!CONFIG.AD_SELECTORS) return;
            for (var i = 0; i < CONFIG.AD_SELECTORS.length; i++) {
                try {
                    var elements = document.querySelectorAll(CONFIG.AD_SELECTORS[i]);
                    for (var j = 0; j < elements.length; j++) {
                        if (elements[j]) {
                            elements[j].remove();
                            log('Removed ad element: ' + CONFIG.AD_SELECTORS[i]);
                        }
                    }
                } catch (e) {
                    log('Error removing elements with selector ' + CONFIG.AD_SELECTORS[i] + ': ' + e.message);
                }
            }
        } catch (e) {
            log('Error in removeAdElements: ' + e.message);
        }
    } 

    // ============================================================
    // 5. ИНЪЕКЦИЯ CSS СТИЛЕЙ
    // ============================================================
    function injectStyles() {
        try {
            var style = document.createElement('style');
            style.textContent = '.ad-preroll, .ad-preroll__bg, .lampa-advert, #cub-advert, .player-video__advert, .ad-banner, [data-ad] { display: none !important; opacity: 0 !important; visibility: hidden !important; width: 0 !important; height: 0 !important; margin: 0 !important; padding: 0 !important; }';
            if (document.head) {
                document.head.appendChild(style);
            } else if (document.documentElement) {
                document.documentElement.appendChild(style);
            }
            log('Styles injected');
        } catch (e) {
            log('Error injecting styles: ' + e.message);
        }
    }

    // ============================================================
    // 6. ЗАГЛУШКИ ДЛЯ VAST И IMA SDK (ES5)
    // ============================================================
    function blockAdSDK() { 
        try {
            var MockVAST = function() { 
                log('VASTPlayer mock initialized'); 
                this.load = function() { return Promise.resolve(); }; 
                this.startAd = function() { return Promise.resolve(); }; 
                this.stopAd = function() { return Promise.resolve(); }; 
                this.play = function() { return Promise.resolve(); };
                this.pause = function() { return Promise.resolve(); };
                this.on = function() { return this; }; 
                this.once = function() { return this; }; 
                this.off = function() { return this; };
                this._events = {}; 
                this.container = document.createElement('div');
            };

            try {
                Object.defineProperty(window, 'VASTPlayer', { 
                    get: function() { return MockVAST; }, 
                    set: function() {}, 
                    configurable: false 
                });
                log('VASTPlayer mocked');
            } catch (e) {
                window.VASTPlayer = MockVAST;
                log('VASTPlayer assigned directly: ' + e.message);
            }

            var MockIMA = function() {
                log('IMA SDK mock initialized');
                this.AdsLoader = function() {};
                this.AdsManager = function() {};
                this.AdDisplayContainer = function() {};
            };

            try {
                Object.defineProperty(window, 'google', {
                    value: { ima: MockIMA },
                    writable: false,
                    configurable: false
                });
                log('IMA SDK mocked');
            } catch (e) {
                window.google = { ima: MockIMA };
                log('IMA SDK assigned directly: ' + e.message);
            }
        } catch (e) {
            log('Failed to initialize SDK blocking: ' + e.message);
        }
    } 

    // ============================================================
    // 7. MUTATION OBSERVER ДЛЯ ДИНАМИЧЕСКИХ ЭЛЕМЕНТОВ
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
                    removeAdElements();
                } catch (e) {
                    log('Error in mutation observer: ' + e.message);
                }
            });

            var config = CONFIG.OBSERVER_CONFIG;
            if (document.documentElement) {
                observer.observe(document.documentElement, config);
                log('DOM observer started');
            }
        } catch (e) {
            log('Failed to initialize DOM observer: ' + e.message);
            setInterval(removeAdElements, CONFIG.CHECK_INTERVAL);
        }
    }

    // ============================================================
    // 8. ИНИЦИАЛИЗАЦИЯ
    // ============================================================
    function initialize() {
        try {
            log('Plugin initialization started');
            
            blockAdScripts();
            log('✓ Ad scripts blocking enabled');
            
            interceptNetwork();
            log('✓ Network interception enabled');
            
            blockAdElements();
            log('✓ Element blocking enabled');
            
            injectStyles();
            log('✓ Styles injected');
            
            blockAdSDK();
            log('✓ SDK mocking enabled');
            
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', function() {
                    removeAdElements();
                    observeDOMChanges();
                    log('✓ DOM observer started');
                });
            } else {
                removeAdElements();
                observeDOMChanges();
                log('✓ DOM observer started');
            }
            
            log('Plugin initialization completed successfully');
        } catch (e) {
            log('FATAL: Initialization failed: ' + e.message);
        }
    }

    // Запуск при загрузке
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

})();
