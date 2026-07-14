// ==UserScript==
// @name         ShowyPro VIP Token Injector (Singularity/God-Tier)
// @namespace    showypro-token-injector-god
// @version      1000.0.0
// @description  Абсолютный перехват сетевого стека, иммунитет к детекту и нулевой след в памяти
// @match        *://showypro.com/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 1. СИГНАТУРА ПРИЗРАКА
    // Используем Symbol.for, чтобы спрятать флаг инициализации в глобальном реестре символов,
    // где его невозможно случайно перезаписать.
    const GHOST_SIG = Symbol.for('[[ShowyPro_Singularity_Matrix]]');
    if (window[GHOST_SIG]) return;
    window[GHOST_SIG] = true;

    // 2. КЭШИРОВАНИЕ НАТИВНЫХ ИНСТРУКЦИЙ (IMMUNITY VAULT)
    // Сохраняем ссылки на оригинальные методы ДО того, как сайт сможет их переопределить.
    const { apply, construct, defineProperty, getOwnPropertyDescriptor } = Reflect;
    const { freeze, create, defineProperties } = Object;
    const OriginalXHR = window.XMLHttpRequest;
    const OriginalFetch = window.fetch;
    const OriginalURL = window.URL;

    // 3. БРОНИРОВАННАЯ КОНФИГУРАЦИЯ (FROZEN STATE)
    // Объект создается без прототипа (Object.create(null)), исключая атаки через Object.prototype
    const CONFIG = freeze(Object.assign(create(null), {
        TOKEN: '22cf26b7-c0bf-448b-b9f8-0e072029ff2c',
        TARGET: 'showypro.com',
        LITE_PATH: '/lite/',
        LOG: true,
        PREFIX: '🌌 [S-Tier Core]'
    }));

    // Изолированный логгер
    const Log = freeze({
        sync: (msg, ...args) => CONFIG.LOG && console.log(`%c${CONFIG.PREFIX}%c ${msg}`, 'color: #ff00ff; text-shadow: 0 0 5px #ff00ff; font-weight: bold;', 'color: inherit;', ...args)
    });

    // 4. НЕВИДИМОЕ ХРАНИЛИЩЕ СОСТОЯНИЙ (WEAKMAPS)
    // Данные существуют только пока существует сам объект XHR/Fetch. Сборщик мусора всё очистит сам.
    const XhrVault = new WeakMap();

    // Виртуальные ответы API (без прототипа)
    const MOCK_API = freeze(Object.assign(create(null), {
        '/api/check_pro_auth': { status: true, vip: true, premium: true, is_vip: 1, expire: 4102444800 },
        '/api/check_pro_code': { status: 'success', token: CONFIG.TOKEN },
        '/api/get_code': { code: '123456' }
    }));

    // 5. УТИЛИТА ТРАНСМУТАЦИИ URL
    const URLAlchemist = {
        inject(rawUrl) {
            if (typeof rawUrl !== 'string') return rawUrl;
            try {
                const urlObj = construct(OriginalURL, [rawUrl, window.location.origin]);
                urlObj.searchParams.set('showy_token', CONFIG.TOKEN);
                return urlObj.toString();
            } catch {
                return rawUrl.replace(/[?&]showy_token=[^&]*/g, '') + 
                       (rawUrl.includes('?') ? '&' : '?') + 'showy_token=' + CONFIG.TOKEN;
            }
        },
        shouldMutate(url) {
            return typeof url === 'string' && url.includes(CONFIG.TARGET);
        }
    };

    // 6. АБСОЛЮТНЫЙ ПЕРЕХВАТ СЕТИ (ES6 PROXIES)
    // Proxy делает перехватчики неотличимыми от нативного кода браузера.
    const NetworkMatrix = {
        init() {
            // --- ПЕРЕХВАТ FETCH ---
            window.fetch = new Proxy(OriginalFetch, {
                apply(target, thisArg, args) {
                    let [resource, options] = args;
                    let url = typeof resource === 'string' ? resource : (resource?.url || '');

                    // Виртуализация API
                    const mockKey = Object.keys(MOCK_API).find(k => url.includes(k));
                    if (mockMatch) {
                        Log.sync(`Эмуляция Fetch: ${mockKey}`);
                        return Promise.resolve(new Response(JSON.stringify(MOCK_API[mockKey]), {
                            status: 200, headers: { 'Content-Type': 'application/json' }
                        }));
                    }

                    // Инъекция токена
                    if (URLAlchemist.shouldMutate(url) && url.includes(CONFIG.LITE_PATH)) {
                        const newUrl = URLAlchemist.inject(url);
                        Log.sync(`Квантовый сдвиг URL (Fetch): ${newUrl}`);
                        
                        if (typeof resource === 'string') args[0] = newUrl;
                        else if (resource instanceof Request) args[0] = new Request(newUrl, resource);
                        else args[0] = { ...resource, url: newUrl };
                    }
                    return apply(target, thisArg, args);
                }
            });

            // --- ПЕРЕХВАТ XHR (Конструктор и Прототип) ---
            window.XMLHttpRequest = new Proxy(OriginalXHR, {
                construct(target, args) {
                    const xhrInstance = construct(target, args);
                    
                    // Перехватываем методы экземпляра через Proxy, сохраняя его идентичность
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

                    // Переопределяем методы только для этого экземпляра
                    defineProperty(xhrInstance, 'open', { value: openProxy });
                    defineProperty(xhrInstance, 'send', { value: sendProxy });

                    return xhrInstance;
                }
            });
        }
    };

    // 7. ЭКЗЕКУТОР ИНТЕРФЕЙСА (ДВОЙНОЙ КОНТУР)
    const UIExecutioner = {
        init() {
            this.hijackLampaAPI();
            this.activateShadowObserver();
        },

        // Контур 1: Перехват API
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
                                Log.sync(`Превентивное уничтожение модального окна на уровне API`);
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

        // Контур 2: Эвристический рендеринг-перехватчик (До отрисовки кадра)
        activateShadowObserver() {
            const observer = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === 1 && node.classList) {
                            // Если узел похож на модальное окно оплаты Lampa
                            const text = node.textContent?.toLowerCase() || '';
                            const isModal = node.className.includes('modal') || node.className.includes('layer');
                            if (isModal && /(премиум|premium|введите код|подписка|showypro)/i.test(text)) {
                                node.remove(); // Уничтожение до paint-цикла
                                Log.sync(`Теневой наблюдатель сжег DOM-узел: ${node.className}`);
                            }
                        }
                    }
                }
            });
            
            // Наблюдаем за всем документом с максимальной агрессией
            observer.observe(document.documentElement, { childList: true, subtree: true });
        }
    };

    // 8. ЗАПУСК ЯДРА
    try {
        NetworkMatrix.init();
        UIExecutioner.init();
        Log.sync('Матрица переписана. Ожидание сигналов.');
    } catch (e) {
        console.error(`${CONFIG.PREFIX} Фатальный сбой инъекции:`, e);
    }
})();
