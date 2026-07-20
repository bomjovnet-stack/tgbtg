// ==UserScript==
// @name         Lampa: Tizen Ultimate (Native Payload Edition)
// @namespace    lampa-tizen-enterprise-solid
// @version      1000.MAX.2
// @description  XHR Prototype Hook, Bulletproof UI, Deep Match Auto-Next, Native CUB Sync
// @match        *://*/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    if (window.__lampaSolidInit) return;
    window.__lampaSolidInit = true;

    var LOG = '🛠️ [Lampa Solid]';
    function log(msg) { if (window.console && console.log) console.log(LOG + ' ' + msg); }

    // ============================================================
    // 1. КОНФИГУРАЦИЯ БЛОКИРОВОК И ДАННЫХ
    // ============================================================
    var CONFIG = {
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
    };

    function getAuthPayload(url) {
        var email = 'irinakrisa555@ya.ru';
        var uid = 'xfp4fi4j';
        var userId = 688675;
        var profileId = 729497;
        var premiumExpire = 1782035286566;

        if (url && url.indexOf('/users/get') !== -1) {
            return {
                "secuses": true,
                "user": {
                    "id": userId, "email": email, "profile": profileId,
                    "telegram_id": 0, "telegram_chat": 0, "n_movie": 1,
                    "n_tv": 1, "n_voice": 1, "n_premium": 1, "premium": premiumExpire,
                    "backup": 0, "permission": 0, "bet": "", "payout": 0,
                    "banned_until": 0, "registered": 1774082061131,
                    "pending_delete": 0, "nickname": ""
                },
                "duration": 0.1
            };
        }

        return {
            premium: true, pro: true, vip: true, gold: true, active: true,
            end: '2099-12-31', verification_hash: 'solid_bypass_' + Date.now(),
            account_email: email, cub_id: userId, uid: uid,
            account: {
                premium: true, account_email: email, cub_id: userId, uid: uid,
                profile: { id: profileId, age: 99, child: false },
                token: 'solid_token_' + Math.random().toString(36).substring(2),
                username: email.split('@')[0]
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
    // 2. БЕЗОПАСНЫЙ СЕТЕВОЙ ПЕРЕХВАТ (PROTOTYPE INJECTION)
    // ============================================================
    var origOpen = XMLHttpRequest.prototype.open;
    var origSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function(method, url) {
        this._reqUrl = typeof url === 'string' ? url.toLowerCase() : '';
        return origOpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function() {
        var self = this;
        try {
            if (self._reqUrl) {
                if (isMatch(self._reqUrl, CONFIG.AD_DOMAINS)) {
                    setTimeout(function() {
                        Object.defineProperty(self, 'readyState', { value: 4, configurable: true });
                        Object.defineProperty(self, 'status', { value: 200, configurable: true });
                        Object.defineProperty(self, 'responseText', { value: '{}', configurable: true });
                        if (typeof self.onload === 'function') self.onload();
                        if (typeof self.onreadystatechange === 'function') self.onreadystatechange();
                    }, 0);
                    return; 
                }
                if (isMatch(self._reqUrl, CONFIG.PREMIUM_ENDPOINTS)) {
                    setTimeout(function() {
                        Object.defineProperty(self, 'readyState', { value: 4, configurable: true });
                        Object.defineProperty(self, 'status', { value: 200, configurable: true });
                        Object.defineProperty(self, 'responseText', { value: JSON.stringify(getAuthPayload(self._reqUrl)), configurable: true });
                        if (typeof self.onload === 'function') self.onload();
                        if (typeof self.onreadystatechange === 'function') self.onreadystatechange();
                    }, 0);
                    return;
                }
            }
        } catch(e) {}
        return origSend.apply(this, arguments);
    };

    if (window.fetch) {
        var origFetch = window.fetch;
        window.fetch = function(input, init) {
            try {
                var url = (typeof input === 'string') ? input.toLowerCase() : (input && input.url ? input.url.toLowerCase() : '');
                if (url) {
                    if (isMatch(url, CONFIG.AD_DOMAINS)) return Promise.resolve(new Response('{}', { status: 200 }));
                    if (isMatch(url, CONFIG.PREMIUM_ENDPOINTS)) return Promise.resolve(new Response(JSON.stringify(getAuthPayload(url)), { status: 200, headers: { 'Content-Type': 'application/json' } }));
                }
            } catch(e) {}
            return origFetch.apply(this, arguments);
        };
    }

    // ============================================================
    // 3. БЛОКИРОВКА VAST И ЗАХВАТ ЯДРА LAMPA
    // ============================================================
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

    var _lampa = window.Lampa;
    Object.defineProperty(window, 'Lampa', {
        get: function() { return _lampa; },
        set: function(val) {
            if (val && !val.__solidMod) {
                val.__solidMod = true;
                var _acc = val.Account;
                Object.defineProperty(val, 'Account', {
                    get: function() { return _acc; },
                    set: function(a) {
                        if (a) {
                            Object.defineProperty(a, 'Permit', {
                                get: function() { return getAuthPayload('core'); },
                                set: function() {},
                                configurable: true
                            });
                        }
                        _acc = a;
                    },
                    configurable: true
                });
            }
            _lampa = val;
        },
        configurable: true
    });

    // ============================================================
    // 4. СТАБИЛЬНЫЙ И БЕЗОТКАЗНЫЙ CSS (OLED TIZEN)
    // ============================================================
    function injectUI() {
        var id = 'lampa-solid-css';
        if (document.getElementById(id)) return;
        
        var style = document.createElement('style');
        style.id = id;
        style.type = 'text/css';
        
        var css = 
            CONFIG.AD_SELECTORS.join(', ') + ' { display: none !important; opacity: 0 !important; pointer-events: none !important; } ' +
            'html body .full-start__button.button--play { display: none !important; } ' +
            'html body { background-color: rgb(0,0,0) !important; } ' +
            'html body .wrap, html body .scroll__content, html body .layer--width { background: transparent !important; } ' +
            'html body .background { opacity: 0.3 !important; filter: blur(20px) !important; mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 20%, rgba(0,0,0,0) 85%); -webkit-mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 20%, rgba(0,0,0,0) 85%); } ' +
            'html body .menu__item { background: transparent !important; border-radius: 8px !important; margin: 4px 10px !important; width: calc(100% - 20px) !important; transition: none !important; } ' +
            'html body .menu__item .menu__text { color: #aaaaaa !important; opacity: 1 !important; font-weight: 500 !important; } ' +
            'html body .menu__item .menu__ico svg, html body .menu__item .menu__ico use { fill: #aaaaaa !important; opacity: 1 !important; } ' +
            'html body .menu__item.focus { background-color: #f1f1f1 !important; transform: scale(1.04) !important; box-shadow: 0 8px 20px rgba(255,255,255,0.15) !important; z-index: 99; border: none !important; } ' +
            'html body .menu__item.focus .menu__text { color: rgb(0,0,0) !important; text-shadow: none !important; font-weight: 600 !important; } ' +
            'html body .menu__item.focus .menu__ico svg, html body .menu__item.focus .menu__ico use { fill: rgb(0,0,0) !important; } ' +
            'html body .card__age, html body .card__age::before, html body .card__age::after { display: block !important; position: static !important; background: transparent !important; color: #aaaaaa !important; font-size: 0.9em !important; font-weight: 400 !important; padding: 0 !important; margin: 4px 0 0 0 !important; width: auto !important; min-width: 0 !important; height: auto !important; text-align: left !important; box-shadow: none !important; border: none !important; } ' +
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
        
        if (style.styleSheet) style.styleSheet.cssText = css;
        else style.appendChild(document.createTextNode(css));
        
        (document.documentElement || document.head).appendChild(style);
    }

    // ============================================================
    // 5. ОПТИМИЗАТОР ПУЛЬТА И ДВИЖКА
    // ============================================================
    var lastKeyTime = 0;
    window.addEventListener('keydown', function(e) {
        if (e.keyCode >= 37 && e.keyCode <= 40) {
            var now = Date.now();
            if (now - lastKeyTime < 60) { 
                e.stopImmediatePropagation(); 
                e.preventDefault(); 
                return false; 
            }
            lastKeyTime = now;
        }
    }, true);

    function enforceSettings() {
        if (!window.lampa_settings) window.lampa_settings = {};
        window.lampa_settings.premium = true;
        window.lampa_settings.pro = true;
        window.lampa_settings.vip = true;
        window.lampa_settings.gold = true;
        window.lampa_settings.account_use = true;
        window.lampa_settings.fix_widget = true;
        window.lampa_settings.glass_style = false; 
        window.lampa_settings.mask = false;
        window.lampa_settings.advanced_animation = false;
        window.lampa_settings.light_version = true;
        
        if (!window.lampa_settings.disable_features) window.lampa_settings.disable_features = {};
        window.lampa_settings.disable_features.lgbt = true;
    }

    // ============================================================
    // 6. УМНЫЙ DEEP-MATCH AUTO-NEXT API
    // ============================================================
    var _anInited = false;
    function initAutoNext() {
        if (_anInited || !window.Lampa || !window.Lampa.Player) return;
        
        window.Lampa.Player.listener.follow('message', function(e) {
            if (e.type === 'ended') {
                log('Событие ended получено. Вычисляем следующую серию...');
                
                setTimeout(function() {
                    var p = window.Lampa.Player;
                    
                    // Сохраняем таймлайн текущей серии
                    if (window.Lampa.Timeline && window.Lampa.Timeline.update && p.opened) {
                        window.Lampa.Timeline.update(p.opened);
                    }

                    // 1. Попытка переключить через внутренний плейлист Lampa (Deep Match)
                    if (p.playlist && p.opened && p.playlist.length > 0) {
                        var currentIndex = -1;
                        
                        // Ищем физическое совпадение данных, так как плагины клонируют объекты
                        for (var i = 0; i < p.playlist.length; i++) {
                            var item = p.playlist[i];
                            if (item === p.opened || 
                               (item.url && p.opened.url && item.url === p.opened.url) || 
                               (item.file && p.opened.file && item.file === p.opened.file) ||
                               (item.video && p.opened.video && item.video === p.opened.video)) {
                                currentIndex = i;
                                break;
                            }
                        }

                        if (currentIndex !== -1 && currentIndex < p.playlist.length - 1) {
                            log('Найдена следующая серия в кэше ядра. Воспроизведение.');
                            p.play(p.playlist[currentIndex + 1]);
                            return; // Успешно переключено
                        }
                    }

                    // 2. Если плейлиста нет (или он изолирован балансером) — дергаем нативную кнопку Next в UI плеера
                    var nextBtn = document.querySelector('.player-panel__next, .player-panel [data-action="next"]');
                    if (nextBtn && !nextBtn.classList.contains('hide')) {
                        log('Используем fallback: эмуляция нажатия системной кнопки Next.');
                        nextBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
                        return;
                    }

                    // 3. Если это последняя серия — переключаем сезон
                    log('Конец списка. Вызов перехода на следующий сезон.');
                    p.close();
                    
                    setTimeout(function() {
                        var act = window.Lampa.Activity.active();
                        if (act && act.component) {
                            typeof act.component.nextSeason === 'function' 
                                ? act.component.nextSeason() 
                                : window.Lampa.Controller.trigger('next_season', p.opened);
                        }
                    }, 500);

                }, 800); // Таймаут для завершения внутренних анимаций Lampa
            }
        });
        _anInited = true;
    }

    // ============================================================
    // 7. ЗАПУСК
    // ============================================================
    function boot() {
        injectUI();
        enforceSettings();
        
        setInterval(function() {
            injectUI();
            enforceSettings();
            initAutoNext();
        }, 2000);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();

    log('Ready.');
})();
