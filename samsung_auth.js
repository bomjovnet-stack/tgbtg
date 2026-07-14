// ==UserScript==
// @name         ShowyPro VIP Token Injector (Singularity/God-Tier)
// @namespace    showypro-token-injector-god
// @version      1000.1.0
// @description  Абсолютный перехват сетевого стека с полным спуфингом сессии (Token + UID + Email)
// @match        *://showypro.com/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 1. СИГНАТУРА ПРИЗРАКА
    const GHOST_SIG = Symbol.for('[[ShowyPro_Singularity_Matrix]]');
    if (window[GHOST_SIG]) return;
    window[GHOST_SIG] = true;

    // 2. КЭШИРОВАНИЕ НАТИВНЫХ ИНСТРУКЦИЙ (IMMUNITY VAULT)
    const { apply, construct, defineProperty } = Reflect;
    const { freeze, create, defineProperties } = Object;
    const OriginalXHR = window.XMLHttpRequest;
    const OriginalFetch = window.fetch;
    const OriginalURL = window.URL;

    // 3. БРОНИРОВАННАЯ КОНФИГУРАЦИЯ С ПОЛНЫМ СЛЕПКОМ СЕССИИ (SESSION SPOOFING)
    const CONFIG = freeze(Object.assign(create(null), {
        TARGET: 'showypro.com',
        LITE_PATH: '/lite/',
        LOG: true,
        PREFIX: '🌌 [S-Tier Core]'
    }));

    // Вектор инъекции: эти параметры будут насильно встроены во все запросы /lite/
    const VIP_PAYLOAD = freeze({
        showy_token: '22cf26b7-c0bf-448b-b9f8-0e072029ff2c',
        account_email: 'irinakrisa555@ya.ru',
        cub_id: '967951967',
        uid: 'xfp4fi4j'
    });

    const Log = freeze({
        sync: (msg, ...args) => CONFIG.LOG && console.log(`%c${CONFIG.PREFIX}%c ${msg}`, 'color: #00ffcc; text-shadow: 0 0 5px #00ffcc; font-weight: bold;', 'color: inherit;', ...args)
    });

    const XhrVault = new WeakMap();

    const MOCK_API = freeze(Object.assign(create(null), {
        '/api/check_pro_auth': { status: true, vip: true, premium: true, is_vip: 1, expire: 4102444800 },
        '/api/check_pro_code': { status: 'success', token: VIP_PAYLOAD.showy_token },
        '/api/get_code': { code: '123456' }
    }));

    // 4. УТИЛИТА ТРАНСМУТАЦИИ URL (ВЕКТОРНЫЙ ИНЖЕКТОР)
    const URLAlchemist = {
        inject(rawUrl) {
            if (typeof rawUrl !== 'string') return rawUrl;
            try {
                // Используем нативный URL конструктор для безопасного парсинга
                const urlObj = construct(OriginalURL, [rawUrl, window.location.origin]);
                
                // Встраиваем полный слепок сессии (перезапишет существующие или добавит новые)
                for (const [key, value] of Object.entries(VIP_PAYLOAD)) {
                    urlObj.searchParams.set(key, value);
                }
                
                return urlObj.toString();
            } catch (err) {
                // Резервный механизм на случай аномальных строк
                let modifiedUrl = rawUrl;
                for (const [key, value] of Object.entries(VIP_PAYLOAD)) {
                    // Вырезаем старый ключ, если есть
                    const regex = new RegExp(`[?&]${key}=[^&]*`, 'g');
                    modifiedUrl = modifiedUrl.replace(regex, '');
                    // Добавляем наш VIP-ключ
                    modifiedUrl += (modifiedUrl.includes('?') ? '&' : '?') + `${key}=${encodeURIComponent(value)}`;
                }
                return modifiedUrl;
            }
        },
        shouldMutate(url) {
            return typeof url === 'string' && url.includes(CONFIG.TARGET);
        }
    };

    // 5. АБСОЛЮТНЫЙ ПЕРЕХВАТ СЕТИ (ES6 PROXIES)
    const NetworkMatrix = {
        init() {
            // --- ПЕРЕХВАТ FETCH ---
            window.fetch = new Proxy(OriginalFetch, {
                apply(target, thisArg, args) {
                    let [resource, options] = args;
                    let url = typeof resource === 'string' ? resource : (resource?.url || '');

                    const mockKey = Object.keys(MOCK_API).find(k => url.includes(k));
                    if (mockKey) {
                        Log.sync(`Эмуляция Fetch: ${mockKey}`);
                        return Promise.resolve(new Response(JSON.stringify(MOCK_API[mockKey]), {
                            status: 200, headers: { 'Content-Type': 'application/json' }
                        }));
                    }

                    if (URLAlchemist.shouldMutate(url) && url.includes(CONFIG.LITE_PATH)) {
                        const newUrl = URLAlchemist.inject(url);
                        Log.sync(`Полный спуфинг сессии (Fetch): ${newUrl}`);
                        
                        if (typeof resource === 'string') args[0] = newUrl;
                        else if (resource instanceof Request) args[0] = new Request(newUrl, resource);
                        else args[0] = { ...resource, url: newUrl };
                    }
                    return apply(target, thisArg, args);
                }
            });

            // --- ПЕРЕХВАТ XHR ---
            window.XMLHttpRequest = new Proxy(OriginalXHR, {
                construct(target, args) {
                    const xhrInstance = construct(target, args);
                    
                    const openProxy = new Proxy(xhrInstance.open, {
                        apply(openTarget, thisArg, openArgs) {
                            let [method, url] = openArgs;
                            XhrVault.set(thisArg, { originalUrl: url });

                            if (URLAlchemist.shouldMutate(url) && url.includes(CONFIG.LITE_PATH)) {
                                openArgs[1] = URLAlchemist.inject(url);
                            }
                            return apply(openTarget, thisArg, openArgs);
                        }
                    });

                    const sendProxy = new Proxy(xhrInstance.send, {
                        apply(sendTarget, thisArg, sendArgs) {
                            const state = XhrVault.get(thisArg);
                            const url = state?.originalUrl || '';
                            const mockKey = Object.keys(MOCK_API).find(k => url.includes(k));

                            if (mockKey) {
                                Log.sync(`Глубокая виртуализация XHR: ${mockKey}`);
                                const mockData = MOCK_API[mockKey];
                                const jsonStr = JSON.stringify(mockData);

                                defineProperties(thisArg, {
                                    readyState: { value: 4 },
                                    status: { value: 200 },
                                    statusText: { value: 'OK' },
                                    responseText: { value: jsonStr },
                                    response: { get: () => thisArg.responseType === 'json' ? mockData : jsonStr }
                                });

                                queueMicrotask(() => {
                                    ['readystatechange', 'load', 'loadend'].forEach(e => {
                                        if (typeof thisArg[`on${e}`] === 'function') thisArg[`on${e}`]();
                                        thisArg.dispatchEvent(new Event(e));
                                    });
                                });
                                return;
                            }
                            return apply(sendTarget, thisArg, sendArgs);
                        }
                    });

                    defineProperty(xhrInstance, 'open', { value: openProxy });
                    defineProperty(xhrInstance, 'send', { value: sendProxy });

                    return xhrInstance;
                }
            });
        }
    };

    // 6. ЭКЗЕКУТОР ИНТЕРФЕЙСА (ДВОЙНОЙ КОНТУР)
    const UIExecutioner = {
        init() {
            this.hijackLampaAPI();
            this.activateShadowObserver();
        },
        hijackLampaAPI() {
            let lampaRef = window.Lampa;
            const patchModal = (lampaObj) => {
                if (lampaObj?.Modal && !lampaObj.Modal[GHOST_SIG]) {
                    lampaObj.Modal[GHOST_SIG] = true;
                    lampaObj.Modal.open = new Proxy(lampaObj.Modal.open, {
                        apply(target, thisArg, args) {
                            const conf = args[0] || {};
                            const content = String(conf.html || '') + String(conf.title || '');
                            if (/(code|auth|login|premium|subscription)/i.test(content)) {
                                Log.sync(`Превентивное уничтожение модального окна`);
                                return { close: () => {}, toggle: () => {} };
                            }
                            return apply(target, thisArg, args);
                        }
                    });
                }
            };
            defineProperty(window, 'Lampa', {
                configurable: false,
                get: () => lampaRef,
                set: (val) => { lampaRef = val; patchModal(val); }
            });
            if (lampaRef) patchModal(lampaRef);
        },
        activateShadowObserver() {
            const observer = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === 1 && node.classList) {
                            const text = node.textContent?.toLowerCase() || '';
                            const isModal = node.className.includes('modal') || node.className.includes('layer');
                            if (isModal && /(премиум|premium|введите код|подписка|showypro)/i.test(text)) {
                                node.remove();
                            }
                        }
                    }
                }
            });
            observer.observe(document.documentElement, { childList: true, subtree: true });
        }
    };

    // 7. ЗАПУСК ЯДРА
    try {
        NetworkMatrix.init();
        UIExecutioner.init();
        Log.sync('Матрица переписана. Полный спуфинг сессии активирован.');
    } catch (e) {
        console.error(`${CONFIG.PREFIX} Фатальный сбой инъекции:`, e);
    }
})();
