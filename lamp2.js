// ==UserScript==
// @name         Lampa: Tizen Ultimate (Native Payload & Hardware Acceleration Edition)
// @namespace    lampa-tizen-enterprise-gold
// @version      1000.MAX.5
// @description  XHR/Fetch Prototype Interceptor, Ultra OLED TV Engine, Deep Match Auto-Next, Smart Remote D-Pad, Native CUB VIP Sync, YouTube Player Integration
// @match        *://*/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    if (window.__lampaGoldSolidInit) return;
    window.__lampaGoldSolidInit = true;

    var LOG_PREFIX = '⚡ [Lampa Gold Ultimate]';
    function log(msg, type) {
        if (!window.console) return;
        var method = type === 'error' ? console.error : type === 'warn' ? console.warn : console.log;
        method(LOG_PREFIX + ' ' + msg);
    }

    // Вспомогательная функция проверки URL на принадлежность к Skaz / TV плагину (для исключения конфликтов)
    function isSkazUrl(url) {
        if (!url || typeof url !== 'string') return false;
        var lower = url.toLowerCase();
        return lower.indexOf('skaz') !== -1 || lower.indexOf('tvskaz') !== -1;
    }

    // ============================================================
    // 1. ДИНАМИЧЕСКАЯ КОНФИГУРАЦИЯ И VIP-ПРОФИЛЬ
    // ============================================================
    var customCfg = window.LAMPA_CUSTOM_CONFIG || {};

    var CONFIG = {
        EMAIL: customCfg.email || 'irinakrisa555@ya.ru',
        CUB_ID: customCfg.cub_id || '967951967',
        UID: customCfg.uid || 'xfp4fi4j',
        SHOWY_TOKEN: customCfg.showy_token || '22cf26b7-c0bf-448b-b9f8-0e072029ff2c',
        USER_ID: 688675,
        PROFILE_ID: 729497,
        EXPIRE_TIME: 1782035286566, // 2099+ Year
        THROTTLE_MS: typeof customCfg.throttle === 'number' ? customCfg.throttle : 60,
        AUTO_NEXT: customCfg.autonext !== undefined ? customCfg.autonext : true,
        OLED_MODE: customCfg.oled !== undefined ? customCfg.oled : true,
        AD_DOMAINS: [
            '/vast', '/ad/', '/preroll', '/advert', 'cub-ads', '/api/ad/get', 
            'doubleclick', 'googlesyndication', 'an.yandex', 'adfox', 'mail.ru', 
            'rambler', 'scorecardresearch', 'beeline', 'kaspersky', 'yaad'
        ],
        PREMIUM_ENDPOINTS: [
            '/account/status', '/premium/check', '/cub/premium', 
            '/users/get', '/api/profile', '/subscription', '/verify/premium', '/sync'
        ],
        AD_SELECTORS: [
            '.ad-preroll', '.ad-preroll__bg', '.lampa-advert', '#cub-advert', 
            '.player-video__advert', '.ad-banner', '[data-ad]', '.preroll',
            '.advertisement-container', '.ad-server', 
            '.ad-video-block', '.cub-premium', '.cub-premium--detail'
        ]
    };

    function getAuthPayload(url) {
        url = url || '';
        if (url.indexOf('/users/get') !== -1) {
            return {
                "secuses": true,
                "user": {
                    "id": CONFIG.USER_ID,
                    "email": CONFIG.EMAIL,
                    "profile": CONFIG.PROFILE_ID,
                    "telegram_id": 0,
                    "telegram_chat": 0,
                    "n_movie": 1,
                    "n_tv": 1,
                    "n_voice": 1,
                    "n_premium": 1,
                    "premium": CONFIG.EXPIRE_TIME,
                    "backup": 0,
                    "permission": 0,
                    "bet": "",
                    "payout": 0,
                    "banned_until": 0,
                    "registered": 1774082061131,
                    "pending_delete": 0,
                    "nickname": "VIP User"
                },
                "duration": 0.05
            };
        }

        return {
            premium: true,
            pro: true,
            vip: true,
            gold: true,
            active: true,
            end: '2099-12-31',
            verification_hash: 'gold_bypass_' + Date.now(),
            account_email: CONFIG.EMAIL,
            cub_id: CONFIG.CUB_ID,
            uid: CONFIG.UID,
            showy_token: CONFIG.SHOWY_TOKEN,
            account: {
                premium: true,
                account_email: CONFIG.EMAIL,
                cub_id: CONFIG.CUB_ID,
                uid: CONFIG.UID,
                showy_token: CONFIG.SHOWY_TOKEN,
                profile: { id: CONFIG.PROFILE_ID, age: 99, child: false },
                token: 'gold_token_' + Math.random().toString(36).substring(2),
                username: CONFIG.EMAIL.split('@')[0]
            },
            status: 200
        };
    }

    function isMatch(url, list) {
        if (!url || typeof url !== 'string') return false;
        var lower = url.toLowerCase();
        for (var i = 0; i < list.length; i++) {
            if (lower.indexOf(list[i]) !== -1) return true;
        }
        return false;
    }

    // ============================================================
    // 2. БЕЗОПАСНЫЙ СЕТЕВОЙ ПЕРЕХВАТ (PROTOTYPE INJECTION XHR & FETCH)
    // ============================================================
    var origOpen = XMLHttpRequest.prototype.open;
    var origSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function(method, url) {
        this._reqUrl = typeof url === 'string' ? url : (url && url.toString ? url.toString() : '');
        return origOpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function() {
        var self = this;
        try {
            if (self._reqUrl) {
                // Исключаем запросы TV/Skaz плагина, чтобы не мешать его работе
                if (isSkazUrl(self._reqUrl)) {
                    return origSend.apply(this, arguments);
                }
                if (isMatch(self._reqUrl, CONFIG.AD_DOMAINS)) {
                    log('Заблокирован рекламный запрос: ' + self._reqUrl);
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
                    log('Перехвачен эндпоинт авторизации VIP: ' + self._reqUrl);
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
        } catch(e) {
            log('Ошибка в XHR hook: ' + e.message, 'warn');
        }
        return origSend.apply(this, arguments);
    };

    if (window.fetch) {
        var origFetch = window.fetch;
        window.fetch = function(input, init) {
            try {
                var url = (typeof input === 'string') ? input : (input && input.url ? input.url : '');
                if (url) {
                    if (isSkazUrl(url)) {
                        return origFetch.apply(this, arguments);
                    }
                    if (isMatch(url, CONFIG.AD_DOMAINS)) {
                        return Promise.resolve(new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } }));
                    }
                    if (isMatch(url, CONFIG.PREMIUM_ENDPOINTS)) {
                        return Promise.resolve(new Response(JSON.stringify(getAuthPayload(url)), {
                            status: 200,
                            headers: { 'Content-Type': 'application/json' }
                        }));
                    }
                }
            } catch(e) {
                log('Ошибка в Fetch hook: ' + e.message, 'warn');
            }
            return origFetch.apply(this, arguments);
        };
    }

    // ============================================================
    // 3. НАТИВНЫЙ БЛОКИРАТОР СКРИПТОВ VAST И ЯДРА LAMPA
    // ============================================================
    var origAppend = Element.prototype.appendChild;
    Element.prototype.appendChild = function(el) {
        if (el && el.tagName === 'SCRIPT' && el.src) {
            var src = el.src.toLowerCase();
            if (isSkazUrl(src)) {
                return origAppend.apply(this, arguments);
            }
            if (isMatch(src, CONFIG.AD_DOMAINS) || src.indexOf('vast.js') !== -1 || src.indexOf('ima.js') !== -1) {
                log('Заблокирована загрузка внешнего рекламного скрипта: ' + src);
                el.src = 'data:text/javascript;base64,Y29uc29sZS5sb2coJ1BsdWdpbiBBZEJsb2NrZWQnKTs=';
            }
        }
        return origAppend.apply(this, arguments);
    };

    // Захват глобального объекта Lampa для автоматического разблокирования
    function patchLampaAccount(val) {
        if (!val || val.__goldSolidAccountPatched) return;
        val.__goldSolidAccountPatched = true;
        var _acc = val.Account;
        if (_acc) {
            try {
                Object.defineProperty(_acc, 'Permit', {
                    get: function() { return getAuthPayload('core'); },
                    set: function() {},
                    configurable: true
                });
            } catch(e) {}
        }
        try {
            Object.defineProperty(val, 'Account', {
                get: function() { return _acc; },
                set: function(a) {
                    _acc = a;
                    if (_acc) {
                        try {
                            Object.defineProperty(_acc, 'Permit', {
                                get: function() { return getAuthPayload('core'); },
                                set: function() {},
                                configurable: true
                            });
                        } catch(e) {}
                    }
                },
                configurable: true
            });
        } catch(e) {}
    }

    if (window.Lampa) {
        patchLampaAccount(window.Lampa);
    }
    var _lampa = window.Lampa;
    Object.defineProperty(window, 'Lampa', {
        get: function() { return _lampa; },
        set: function(val) {
            if (val) patchLampaAccount(val);
            _lampa = val;
        },
        configurable: true
    });

    // ============================================================
    // 4. СТАБИЛЬНЫЙ И БЕЗОТКАЗНЫЙ CSS (OLED TV & TIZEN HARDWARE ACCELERATED)
    // ============================================================
    function injectUI() {
        var id = 'lampa-gold-solid-css';
        if (document.getElementById(id)) return;
        
        var style = document.createElement('style');
        style.id = id;
        style.type = 'text/css';
        
        var css = 
            CONFIG.AD_SELECTORS.join(', ') + ' { display: none !important; opacity: 0 !important; pointer-events: none !important; } ' +
            'html body { background-color: #000000 !important; } ' +
            'html body .wrap, html body .scroll__content, html body .layer--width { background: transparent !important; } ' +
            'html body .background { opacity: 0.25 !important; filter: blur(25px) !important; mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 20%, rgba(0,0,0,0) 85%); -webkit-mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 20%, rgba(0,0,0,0) 85%); } ' +
            'html body .menu__item { background: transparent !important; border-radius: 8px !important; margin: 4px 10px !important; width: calc(100% - 20px) !important; transition: none !important; } ' +
            'html body .menu__item .menu__text { color: #bbbbbb !important; opacity: 1 !important; font-weight: 500 !important; } ' +
            'html body .menu__item .menu__ico svg, html body .menu__item .menu__ico use { fill: #bbbbbb !important; opacity: 1 !important; } ' +
            'html body .menu__item.focus { background-color: #ffffff !important; transform: scale(1.04) !important; box-shadow: 0 8px 24px rgba(255,255,255,0.2) !important; z-index: 99; border: none !important; } ' +
            'html body .menu__item.focus .menu__text { color: #000000 !important; text-shadow: none !important; font-weight: 700 !important; } ' +
            'html body .menu__item.focus .menu__ico svg, html body .menu__item.focus .menu__ico use { fill: #000000 !important; } ' +
            'html body .card__age, html body .card__age::before, html body .card__age::after { display: block !important; position: static !important; background: transparent !important; color: #aaaaaa !important; font-size: 0.9em !important; font-weight: 400 !important; padding: 0 !important; margin: 4px 0 0 0 !important; width: auto !important; min-width: 0 !important; height: auto !important; text-align: left !important; box-shadow: none !important; border: none !important; } ' +
            'html body .card__title { font-weight: 600 !important; font-size: 1.05em !important; color: #ffffff !important; margin-top: 8px !important; white-space: normal !important; } ' +
            'html body .card__view { border-radius: 10px !important; background: transparent !important; transition: transform 0.12s cubic-bezier(0.16, 1, 0.3, 1) !important; } ' +
            'html body .card.focus .card__view { transform: scale(1.06) !important; box-shadow: 0 0 0 4px #ffffff, 0 12px 30px rgba(0,0,0,0.95) !important; border: none !important; } ' +
            'html body .button, html body .simple-button { border-radius: 20px !important; background-color: rgba(255,255,255,0.12) !important; font-weight: 500 !important; transition: transform 0.1s ease, background-color 0.1s ease !important; } ' +
            'html body .full-start__button { border-radius: 20px !important; background-color: rgba(255,255,255,0.12) !important; font-weight: 500 !important; transition: transform 0.1s ease, background-color 0.1s ease !important; display: inline-flex !important; width: auto !important; max-width: max-content !important; flex: 0 0 auto !important; margin-right: 0.8em !important; margin-bottom: 0.5em !important; } ' +
            'html body .settings-param, html body .selectbox-item { border-radius: 8px !important; margin: 4px 10px !important; width: calc(100% - 20px) !important; transition: transform 0.1s ease, background-color 0.1s ease !important; } ' +
            'html body .button.focus, html body .simple-button.focus, html body .full-start__button.focus, html body .settings-param.focus, html body .selectbox-item.focus { background-color: #ffffff !important; transform: scale(1.04) !important; box-shadow: 0 8px 24px rgba(0,0,0,0.5) !important; z-index: 99; } ' +
            'html body .button.focus *, html body .simple-button.focus *, html body .full-start__button.focus *, html body .settings-param.focus *, html body .selectbox-item.focus * { color: #000000 !important; fill: #000000 !important; text-shadow: none !important; } ' +
            'html body .player-panel { background: linear-gradient(to top, rgba(0,0,0,0.98) 0%, rgba(0,0,0,0.6) 70%, transparent 100%) !important; padding-bottom: 25px !important; border: none !important; } ' +
            'html body .player-panel__timeline { height: 6px !important; border-radius: 3px !important; background: rgba(255,255,255,0.2) !important; } ' +
            'html body .player-panel__position { background-color: #e50914 !important; border-radius: 3px !important; } ' +
            'html body .player-panel__position div { background-color: #e50914 !important; box-shadow: 0 0 12px #e50914 !important; width: 16px !important; height: 16px !important; top: -5px !important; border-radius: 50% !important; } ' +
            'html body .glass, html body .settings__content, html body .selectbox__content, html body .modal__content { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; background-color: #111111 !important; border: 1px solid #282828 !important; box-shadow: 20px 0 60px rgba(0,0,0,0.95) !important; } ' +
            'html body .selector, html body .card, html body .layer--render { transform: translateZ(0); -webkit-transform: translateZ(0); will-change: transform; } ' +
            '::-webkit-scrollbar { width: 0px !important; background: transparent !important; }';
        
        if (style.styleSheet) style.styleSheet.cssText = css;
        else style.appendChild(document.createTextNode(css));
        
        (document.documentElement || document.head).appendChild(style);
    }

    // ============================================================
    // 5. ОПТИМИЗАТОР ПУЛЬТА И ОБРАБОТКА Д-ПАДА
    // ============================================================
    var lastKeyTime = 0;
    window.addEventListener('keydown', function(e) {
        // D-Pad keys (Left, Up, Right, Down: 37, 38, 39, 40)
        if (e.keyCode >= 37 && e.keyCode <= 40) {
            var now = Date.now();
            if (now - lastKeyTime < CONFIG.THROTTLE_MS) { 
                e.stopImmediatePropagation(); 
                e.preventDefault(); 
                return false; 
            }
            lastKeyTime = now;
        }

        // Зеленая кнопка на пульте или Ctrl+Shift+D - открытие OSD состояния
        if (e.keyCode === 404 || e.keyCode === 114 || (e.ctrlKey && e.shiftKey && e.keyCode === 68)) {
            toggleOSD();
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

        // Внедрение в хранилище Lampa.Storage для мгновенного CUB VIP
        try {
            if (window.Lampa && window.Lampa.Storage) {
                if (window.Lampa.Storage.get('account_email') !== CONFIG.EMAIL) {
                    window.Lampa.Storage.set('account_email', CONFIG.EMAIL);
                }
                if (window.Lampa.Storage.get('account_uid') !== CONFIG.UID) {
                    window.Lampa.Storage.set('account_uid', CONFIG.UID);
                }
                if (window.Lampa.Storage.get('cub_id') !== CONFIG.CUB_ID) {
                    window.Lampa.Storage.set('cub_id', CONFIG.CUB_ID);
                }
                if (window.Lampa.Storage.get('account_cub_id') !== CONFIG.CUB_ID) {
                    window.Lampa.Storage.set('account_cub_id', CONFIG.CUB_ID);
                }
                if (window.Lampa.Storage.get('lampac_unic_id') !== CONFIG.UID) {
                    window.Lampa.Storage.set('lampac_unic_id', CONFIG.UID);
                }
            }
        } catch(e) {}
    }

    // ============================================================
    // 6. УМНЫЙ DEEP-MATCH AUTO-NEXT С АВТОМАТИЧЕСКИМ СОХРАНЕНИЕМ
    // ============================================================
    var _anInited = false;
    function initAutoNext() {
        if (_anInited || !window.Lampa || !window.Lampa.Player) return;
        
        window.Lampa.Player.listener.follow('message', function(e) {
            if (!CONFIG.AUTO_NEXT) return;

            if (e.type === 'ended') {
                log('Событие ended получено. Авто-переключение серии...');
                
                // Пропускаем авто-переключение для TV/SkazTV компонента или IPTV потоков
                var act = (window.Lampa && window.Lampa.Activity) ? window.Lampa.Activity.active() : null;
                if (act && (act.component === 'tvskaz' || act.component === 'tv' || act.component === 'iptv')) {
                    log('Пропуск авто-переключения для TV компонента.');
                    return;
                }
                
                setTimeout(function() {
                    var p = window.Lampa.Player;
                    if (!p) return;
                    if (p.opened && (p.opened.iptv || p.opened.is_tv || p.opened.tvskaz)) {
                        log('Пропуск авто-переключения для TV потока.');
                        return;
                    }
                    
                    // Сохраняем таймлайн текущей серии перед переключением
                    if (window.Lampa.Timeline && window.Lampa.Timeline.update && p.opened) {
                        try {
                            window.Lampa.Timeline.update(p.opened);
                        } catch(err) {}
                    }

                    // 1. Попытка переключить через внутренний плейлист Lampa
                    if (p.playlist && p.opened && p.playlist.length > 0) {
                        var currentIndex = -1;
                        
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
                            var nextItem = p.playlist[currentIndex + 1];
                            log('Найдена следующая серия (' + (nextItem.title || nextItem.episode || 'Серия ' + (currentIndex + 2)) + '). Запуск!');
                            
                            if (window.Lampa.Noty) {
                                window.Lampa.Noty.show('Следующая серия: ' + (nextItem.title || 'Эпизод ' + (currentIndex + 2)));
                            }
                            
                            p.play(nextItem);
                            return;
                        }
                    }

                    // 2. Fallback: Эмуляция клика по системной кнопке Next плеера
                    var nextBtn = document.querySelector('.player-panel__next, .player-panel [data-action="next"]');
                    if (nextBtn && !nextBtn.classList.contains('hide')) {
                        log('Используется fallback: Эмуляция клика Next');
                        nextBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
                        return;
                    }

                    // 3. Если это конец сезона — запрашиваем следующий сезон
                    log('Конец текущего списка. Запрос следующего сезона.');
                    p.close();
                    
                    setTimeout(function() {
                        var activeAct = window.Lampa.Activity.active();
                        if (activeAct && activeAct.component) {
                            typeof activeAct.component.nextSeason === 'function' 
                                ? activeAct.component.nextSeason() 
                                : window.Lampa.Controller.trigger('next_season', p.opened);
                        }
                    }, 500);

                }, 600);
            }
        });
        _anInited = true;
    }

    // ============================================================
    // 7. ИНФОРМАЦИОННЫЙ OSD ЭКРАН СОСТОЯНИЯ (GREEN KEY / CTRL+SHIFT+D)
    // ============================================================
    function toggleOSD() {
        var existing = document.getElementById('lampa-gold-osd');
        if (existing) {
            existing.remove();
            return;
        }

        var div = document.createElement('div');
        div.id = 'lampa-gold-osd';
        div.style.cssText = 'position:fixed; top:20px; right:20px; background:rgba(0,0,0,0.92); border:1px solid #333; color:#00ffcc; padding:15px; border-radius:10px; z-index:999999; font-family:monospace; font-size:12px; box-shadow:0 10px 30px rgba(0,0,0,0.8); max-width:320px;';
        
        div.innerHTML = 
            '<div style="font-weight:bold; color:#fff; font-size:14px; margin-bottom:8px;">⚡ Gold Ultimate State</div>' +
            '<div>VIP Status: <span style="color:#00ff00">ACTIVE (2099)</span></div>' +
            '<div>Account: ' + CONFIG.EMAIL + '</div>' +
            '<div>CUB ID: ' + CONFIG.CUB_ID + '</div>' +
            '<div>D-Pad Throttle: ' + CONFIG.THROTTLE_MS + 'ms</div>' +
            '<div>Auto-Next: ' + (CONFIG.AUTO_NEXT ? 'ENABLED' : 'DISABLED') + '</div>' +
            '<div>OLED Mode: ENABLED</div>' +
            '<div style="margin-top:8px; font-size:10px; color:#888;">Нажмите [Зеленую кнопку] чтобы закрыть</div>';

        document.body.appendChild(div);
        setTimeout(function() {
            var el = document.getElementById('lampa-gold-osd');
            if (el) el.remove();
        }, 8000);
    }

    // ============================================================
    // 8. ЗАПУСК И ИНИЦИАЛИЗАЦИЯ
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

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }

    log('Lampa Gold Ultimate Plugin Active & Ready.');
})();
