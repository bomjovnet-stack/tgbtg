// ==UserScript==
// @name         Lampa: Tizen Ultimate (Enterprise Core)
// @namespace    lampa-tizen-enterprise-core
// @version      1000.200.0
// @description  Zero-CPU Overhead, Singleton Pattern, Transparent XHR Proxy, OLED Black, Pure API Auto-Next
// @match        *://*/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function() { 
    'use strict';

    // Защита от двойной инициализации (Singleton)
    if (window.__lampaEnterpriseInit) return;
    window.__lampaEnterpriseInit = true;

    var LampaCoreMod = (function() {
        var LOG_PREFIX = '💎 [Lampa Enterprise]';
        var log = function(msg) { if (window.console && console.log) console.log(LOG_PREFIX + ' ' + msg); };

        // Изолированная конфигурация (Immutable State)
        var CONFIG = Object.freeze({
            USER: {
                email: 'irinakrisa555@ya.ru',
                cub_id: '967951967',
                uid: 'xfp4fi4j'
            },
            AD_DOMAINS: [
                '/vast', '/ad/', '/preroll', '/advert', 'cub-ads', '/api/ad/get', 
                'doubleclick', 'googlesyndication', 'an.yandex', 'adfox'
            ],
            PREMIUM_ENDPOINTS: [
                '/account/status', '/premium/check', '/cub/premium', 
                '/users/get', '/api/profile', '/subscription', '/verify/premium'
            ],
            AD_SELECTORS: [
                '.ad-preroll', '.ad-preroll__bg', '.lampa-advert', '#cub-advert', 
                '.player-video__advert', '.ad-banner', '[data-ad]', '.preroll',
                '.advertisement-container', '.player-footer__row', '.ad-server', 
                '.ad-video-block', '.cub-premium', '.cub-premium--detail'
            ]
        });

        // ============================================================
        // 1. ГЕНЕРАТОР PAYLOAD'А (Strict Mode Safe)
        // ============================================================
        function generateAuthPayload() {
            return {
                premium: true, pro: true, vip: true, gold: true, active: true,
                end: '2099-12-31', verification_hash: 'yt_premium_bypass_' + Date.now(),
                account_email: CONFIG.USER.email,
                cub_id: CONFIG.USER.cub_id,
                uid: CONFIG.USER.uid,
                account: { 
                    premium: true, 
                    account_email: CONFIG.USER.email,
                    cub_id: CONFIG.USER.cub_id,
                    uid: CONFIG.USER.uid,
                    profile: { 
                        id: parseInt(CONFIG.USER.cub_id, 10), 
                        age: 99, 
                        child: false,
                        account_email: CONFIG.USER.email,
                        cub_id: CONFIG.USER.cub_id,
                        uid: CONFIG.USER.uid
                    },
                    token: 'enterprise_token_' + Math.random().toString(36).substring(2), 
                    username: CONFIG.USER.email.split('@')[0] 
                },
                status: 200
            };
        }

        function isMatch(url, list) {
            for (var i = 0; i < list.length; i++) {
                if (url.indexOf(list[i]) !== -1) return true;
            }
            return false;
        }

        // ============================================================
        // 2. ИНЖЕНЕРИЯ СЕТИ: ТРАНСПАРЕНТНЫЙ ПРОКСИ
        // ============================================================
        function setupNetworkHooks() {
            // Заморозка объектов от изменения ядром
            var origFreeze = Object.freeze;
            Object.freeze = function(obj) {
                if (obj && (obj.Permit || obj.premium !== undefined || obj.account_use !== undefined)) return obj;
                return origFreeze(obj);
            };

            // Перехват XHR с сохранением Prototype Chain
            var OrigXHR = window.XMLHttpRequest;
            if (OrigXHR) {
                window.XMLHttpRequest = function() {
                    var xhr = new OrigXHR();
                    var origOpen = xhr.open;
                    var origSend = xhr.send;
                    var interceptUrl = '';
                    
                    xhr.open = function(method, url) {
                        interceptUrl = (typeof url === 'string' ? url.toLowerCase() : '');
                        return origOpen.apply(this, arguments);
                    };
                    
                    xhr.send = function() {
                        try {
                            if (interceptUrl) {
                                if (isMatch(interceptUrl, CONFIG.AD_DOMAINS)) {
                                    var selfBlock = this;
                                    setTimeout(function() {
                                        Object.defineProperty(selfBlock, 'readyState', { value: 4 });
                                        Object.defineProperty(selfBlock, 'status', { value: 200 });
                                        Object.defineProperty(selfBlock, 'responseText', { value: '{}' });
                                        if (typeof selfBlock.onload === 'function') selfBlock.onload();
                                        if (typeof selfBlock.onreadystatechange === 'function') selfBlock.onreadystatechange();
                                    }, 0);
                                    return;
                                }
                                if (isMatch(interceptUrl, CONFIG.PREMIUM_ENDPOINTS)) {
                                    var selfPrem = this;
                                    setTimeout(function() {
                                        Object.defineProperty(selfPrem, 'readyState', { value: 4 });
                                        Object.defineProperty(selfPrem, 'status', { value: 200 });
                                        Object.defineProperty(selfPrem, 'responseText', { value: JSON.stringify(generateAuthPayload()) });
                                        if (typeof selfPrem.onload === 'function') selfPrem.onload();
                                        if (typeof selfPrem.onreadystatechange === 'function') selfPrem.onreadystatechange();
                                    }, 0);
                                    return;
                                }
                            }
                        } catch(e) {}
                        return origSend.apply(this, arguments);
                    };
                    return xhr;
                };
                window.XMLHttpRequest.prototype = OrigXHR.prototype;
            }

            // Перехват Fetch
            if (window.fetch) {
                var origFetch = window.fetch;
                window.fetch = function(input, init) {
                    try {
                        var url = (typeof input === 'string') ? input.toLowerCase() : (input && input.url ? input.url.toLowerCase() : '');
                        if (url) {
                            if (isMatch(url, CONFIG.AD_DOMAINS)) return Promise.resolve(new Response('{}', { status: 200 }));
                            if (isMatch(url, CONFIG.PREMIUM_ENDPOINTS)) return Promise.resolve(new Response(JSON.stringify(generateAuthPayload()), { status: 200, headers: { 'Content-Type': 'application/json' } }));
                        }
                    } catch(e) {}
                    return origFetch.apply(this, arguments);
                };
            }

            // Скушивание рекламных скриптов в DOM (VAST/IMA)
            var origAppend = Element.prototype.appendChild;
            Element.prototype.appendChild = function(el) {
                if (el && el.tagName === 'SCRIPT' && el.src) {
                    var src = el.src.toLowerCase();
                    if (isMatch(src, CONFIG.AD_DOMAINS) || src.indexOf('vast.js') !== -1 || src.indexOf('ima.js') !== -1) {
                        el.src = 'data:text/javascript;base64,Y29uc29sZS5sb2coJ0FkQmxvY2tlZCcpOw==';
                    }
                }
                return origAppend.apply(this, arguments);
            };
        }

        // ============================================================
        // 3. ИНЪЕКЦИЯ СТИЛЕЙ С ИММУНИТЕТОМ
        // ============================================================
        function injectImmutableStyles() {
            var styleId = 'lampa-enterprise-ui-fix';
            if (document.getElementById(styleId)) return;
            
            var style = document.createElement('style');
            style.id = styleId;
            style.type = 'text/css';
            
            var cssText = 
                CONFIG.AD_SELECTORS.join(', ') + ' { display: none !important; opacity: 0 !important; pointer-events: none !important; } ' +
                'html body .full-start__button.button--play { display: none !important; opacity: 0 !important; pointer-events: none !important; } ' +
                'html body { background-color: rgb(0,0,0) !important; } ' +
                'html body .wrap, html body .scroll__content, html body .layer--width { background: transparent !important; } ' +
                'html body .background { opacity: 0.3 !important; filter: blur(20px) !important; mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 20%, rgba(0,0,0,0) 85%); -webkit-mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 20%, rgba(0,0,0,0) 85%); } ' +
                'html body .menu__item { background: transparent !important; border-radius: 8px !important; margin: 4px 10px !important; width: calc(100% - 20px) !important; transition: none !important; } ' +
                'html body .menu__item .menu__text { color: #aaaaaa !important; opacity: 1 !important; font-weight: 500 !important; } ' +
                'html body .menu__item .menu__ico svg, html body .menu__item .menu__ico use { fill: #aaaaaa !important; opacity: 1 !important; } ' +
                'html body .menu__item.focus { background-color: #f1f1f1 !important; background-image: none !important; transform: scale(1.04) !important; box-shadow: 0 8px 20px rgba(255,255,255,0.15) !important; z-index: 99; border: none !important; } ' +
                'html body .menu__item.focus .menu__text { color: rgb(0,0,0) !important; text-shadow: none !important; font-weight: 600 !important; } ' +
                'html body .menu__item.focus .menu__ico svg, html body .menu__item.focus .menu__ico use { fill: rgb(0,0,0) !important; } ' +
                'html body .card__age, html body .card__age::before, html body .card__age::after { display: block !important; position: static !important; background: transparent !important; background-color: transparent !important; background-image: none !important; color: #aaaaaa !important; font-size: 0.9em !important; font-weight: 400 !important; padding: 0 !important; margin: 4px 0 0 0 !important; width: auto !important; min-width: 0 !important; height: auto !important; text-align: left !important; box-shadow: none !important; border: none !important; } ' +
                'html body .card__title { font-weight: 600 !important; font-size: 1.05em !important; color: #ffffff !important; margin-top: 8px !important; white-space: normal !important; } ' +
                'html body .card__view { border-radius: 8px !important; background: transparent !important; transition: transform 0.1s ease !important; } ' +
                'html body .card.focus .card__view { transform: scale(1.05) !important; box-shadow: 0 0 0 4px #f1f1f1, 0 10px 25px rgba(0,0,0,0.8) !important; border: none !important; } ' +
                'html body .button, html body .simple-button, html body .full-start__button { border-radius: 20px !important; background-color: rgba(255,255,255,0.1) !important; font-weight: 500 !important; transition: transform 0.1s ease, background-color 0.1s ease !important; } ' +
                'html body .settings-param, html body .selectbox-item { border-radius: 8px !important; margin: 4px 10px !important; width: calc(100% - 20px) !important; transition: transform 0.1s ease, background-color 0.1s ease !important; } ' +
                'html body .button.focus, html body .simple-button.focus, html body .full-start__button.focus, html body .settings-param.focus, html body .selectbox-item.focus { background-color: #f1f1f1 !important; transform: scale(1.04) !important; box-shadow: 0 8px 20px rgba(0,0,0,0.4) !important; z-index: 99; } ' +
                'html body .button.focus *, html body .simple-button.focus *, html body .full-start__button.focus *, html body .settings-param.focus *, html body .selectbox-item.focus * { color: rgb(0,0,0) !important; fill: rgb(0,0,0) !important; text-shadow: none !important; } ' +
                'html body .player-panel { background: linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.5) 70%, transparent 100%) !important; padding-bottom: 25px !important; border: none !important; } ' +
                'html body .player-panel__timeline { height: 5px !important; border-radius: 3px !important; background: rgba(255,255,255,0.2) !important; } ' +
                'html body .player-panel__position { background-color: #ff0000 !important; border-radius: 3px !important; } ' +
                'html body .player-panel__position div { background-color: #ff0000 !important; box-shadow: 0 0 10px #ff0000 !important; width: 14px !important; height: 14px !important; top: -4.5px !important; border-radius: 50% !important; } ' +
                'html body .glass, html body .settings__content, html body .selectbox__content, html body .modal__content { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; background-color: rgb(15,15,15) !important; border: 1px solid #2a2a2a !important; box-shadow: 20px 0 50px rgba(0,0,0,0.9) !important; } ' +
                'html body .selector, html body .card, html body .layer--render { transform: translateZ(0); -webkit-transform: translateZ(0); will-change: transform; } ' +
                '::-webkit-scrollbar { width: 0px !important; background: transparent !important; }';

            if (style.styleSheet) { style.styleSheet.cssText = cssText; } 
            else { style.appendChild(document.createTextNode(cssText)); }
            
            // Иммунитет к очистке DOM (Запрещаем движку удалять этот тег)
            Object.defineProperty(style, 'parentNode', { get: function() { return null; } });
            style.remove = function() {};
            
            (document.documentElement || document.head).appendChild(style);
        }

        // ============================================================
        // 4. ОПТИМИЗАЦИЯ ДВИЖКА И ПЕРЕХВАТ АККАУНТА
        // ============================================================
        function enforceEngineOptimizations() {
            if (!window.lampa_settings) window.lampa_settings = {};
            
            // Аппаратные твики
            window.lampa_settings.fix_widget = true;
            window.lampa_settings.glass_style = false; 
            window.lampa_settings.mask = false;
            window.lampa_settings.advanced_animation = false;
            window.lampa_settings.light_version = true;
            
            // Премиум-флаги ядра
            window.lampa_settings.premium = true;
            window.lampa_settings.pro = true;
            window.lampa_settings.vip = true;
            window.lampa_settings.gold = true;
            window.lampa_settings.account_use = true;
            
            // Фильтры
            if (!window.lampa_settings.disable_features) window.lampa_settings.disable_features = {};
            window.lampa_settings.disable_features.lgbt = true;

            // Локальный инжект данных аккаунта (если сеть не сработала)
            if (window.Lampa && window.Lampa.Account && !window.Lampa.Account.__enterpriseMock) {
                window.Lampa.Account.__enterpriseMock = true;
                Object.defineProperty(window.Lampa.Account, 'Permit', {
                    get: function() { return generateAuthPayload(); },
                    set: function() {},
                    configurable: true
                });
            }
        }

        // Управление дребезгом кнопок (Throttle)
        var lastKeyTime = 0;
        window.addEventListener('keydown', function(e) {
            if (e.keyCode >= 37 && e.keyCode <= 40) {
                var now = performance.now();
                if (now - lastKeyTime < 50) { 
                    e.stopImmediatePropagation();
                    e.preventDefault();
                    return false;
                }
                lastKeyTime = now;
            }
        }, true);

        // ============================================================
        // 5. AUTO-NEXT PURE API (С Оптимизацией Event Loop)
        // ============================================================
        var autoNextAttached = false;
        function attachAutoNext() {
            if (autoNextAttached || !window.Lampa || !window.Lampa.Player) return;
            
            window.Lampa.Player.listener.follow('message', function(e) {
                if (e.type === 'ended') {
                    // Асинхронный вызов для предотвращения блокировки UI потока
                    setTimeout(function() {
                        var player = window.Lampa.Player;
                        if (!player.playlist || !player.opened) return;
                        
                        var currentIndex = player.playlist.indexOf(player.opened);
                        
                        if (window.Lampa.Timeline && typeof window.Lampa.Timeline.update === 'function') {
                            window.Lampa.Timeline.update(player.opened);
                        }
                        
                        if (currentIndex !== -1 && currentIndex < player.playlist.length - 1) {
                            player.play(player.playlist[currentIndex + 1]);
                            player.playlist = player.playlist; 
                        } else {
                            player.close();
                            var activity = window.Lampa.Activity.active();
                            if (activity && activity.component) {
                                typeof activity.component.nextSeason === 'function' 
                                    ? activity.component.nextSeason() 
                                    : window.Lampa.Controller.trigger('next_season', player.opened);
                            }
                        }
                    }, 500); 
                }
            });
            autoNextAttached = true;
            log('Модуль Auto-Next подключен к событийной шине.');
        }

        // ============================================================
        // 6. УМНЫЙ DEBOUNCED OBSERVER (Замена setInterval)
        // ============================================================
        function initSmartObserver() {
            if (!window.MutationObserver) return;
            var timeout;
            var observer = new MutationObserver(function() {
                if (timeout) clearTimeout(timeout);
                timeout = setTimeout(function() {
                    injectImmutableStyles();
                    enforceEngineOptimizations();
                    attachAutoNext();
                }, 300); // Проверяем и восстанавливаем стейт не чаще 1 раза в 300мс после изменений DOM
            });
            observer.observe(document.documentElement, { childList: true, subtree: true });
        }

        // ============================================================
        // 7. ЗАПУСК
        // ============================================================
        return {
            init: function() {
                setupNetworkHooks();
                injectImmutableStyles();
                enforceEngineOptimizations();
                
                if (window.Lampa && window.Lampa.Listener) {
                    window.Lampa.Listener.follow('app', function (e) {
                        if (e.type === 'ready') {
                            injectImmutableStyles();
                            enforceEngineOptimizations();
                            attachAutoNext();
                        }
                    });
                }
                
                initSmartObserver();
                log('Сборка Enterprise Core инициализирована без оверхеда CPU.');
            }
        };
    })();

    // Безопасный старт при готовности документа
    if (document.readyState === 'loading') { 
        document.addEventListener('DOMContentLoaded', LampaCoreMod.init); 
    } else { 
        LampaCoreMod.init(); 
    }

})();
