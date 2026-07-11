(function() {
    'use strict';

    // =========================================================================
    // 1. ИМИТАЦИЯ PRO-АККАУНТА (ОБМАН ЯДРА LAMPA)
    // =========================================================================
    function injectProStatus() {
        // Проверяем, загрузилось ли глобальное ядро Lampa
        if (window.Lampa && window.Lampa.Storage) {
            
            // Подменяем метод получения параметров аккаунта CUB
            const originalGet = window.Lampa.Storage.get;
            window.Lampa.Storage.get = function(key, defaultValue) {
                // Если Lampa спрашивает статус аккаунта или подписку Premium/PRO
                if (key === 'account' || key === 'cub_premium' || key === 'cub_pro' || key === 'account_pro') {
                    return {
                        premium: true,
                        pro: true,
                        active: true,
                        status: 1,
                        username: "ProUser_Bypass",
                        email: "bypass@lampa.mx",
                        // Продлеваем "подписку" до бесконечности
                        till: "2035-12-31 23:59:59", 
                        vip: true
                    };
                }
                return originalGet.apply(this, arguments);
            };

            // Дополнительный перехват для внутренних флагов CUB-платформы
            if (window.Lampa.Account) {
                window.Lampa.Account.isPremium = () => true;
                window.Lampa.Account.isPro = () => true;
                window.Lampa.Account.isActive = () => true;
                // Заглушаем функцию показа нативной рекламы CUB
                if (window.Lampa.Account.showAd) {
                    window.Lampa.Account.showAd = function() { return false; };
                }
            }
            console.log("[Lampa-Bypass] PRO статус успешно эмулирован.");
        }
    }

    // Циклический запуск для надежности (пока ядро Lampa инициализируется в памяти)
    const proInterval = setInterval(() => {
        if (window.Lampa) {
            injectProStatus();
            clearInterval(proInterval);
        }
    }, 50);

    // =========================================================================
    // 2. БЛОКИРОВКА ЗАПРОСОВ К СЕРВЕРАМ СИНХРОНИЗАЦИИ РЕКЛАМЫ CUB
    // =========================================================================
    const cubAdPattern = /cub\.red\/api\/account|cub\.red\/api\/ad|lampa\.mx\/ad|reklama|adv/i;

    // Перехват fetch-запросов (блокируем синхронизацию статуса рекламы с сервером)
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
        const url = args[0];
        if (typeof url === 'string' && cubAdPattern.test(url)) {
            // Если Lampa проверяет статус аккаунта на сервере, возвращаем фейковый PRO-ответ
            if (url.includes('account/info') || url.includes('user/profile')) {
                return new Response(JSON.stringify({ premium: 1, pro: 1, status: "active", till: "2035-12-31" }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            // Все остальные явные рекламные запросы CUB просто сбрасываем
            return new Response(`{}`, { status: 200 });
        }
        return originalFetch.apply(this, args);
    };

    // Перехват XHR-запросов
    const originalXHR = window.XMLHttpRequest.prototype.open;
    window.XMLHttpRequest.prototype.open = function(method, url) {
        if (typeof url === 'string' && cubAdPattern.test(url)) {
            // Подменяем запрос на безопасную локальную JSON-пустышку
            url = 'data:application/json;charset=utf-8,' + encodeURIComponent('{"premium":true,"pro":true}');
        }
        return originalXHR.apply(this, arguments);
    };

    // =========================================================================
    // 3. КОСМЕТИЧЕСКАЯ ОЧИСТКА ИНТЕРФЕЙСА (УДАЛЕНИЕ ПЛАШЕК КУПИТЬ PRO)
    // =========================================================================
    const observer = new MutationObserver((mutations) => {
        for (let i = 0; i < mutations.length; i++) {
            const addedNodes = mutations[i].addedNodes;
            for (let j = 0; j < j < addedNodes.length; j++) {
                const node = addedNodes[j];
                if (node.nodeType === Node.ELEMENT_NODE) {
                    // Удаляем нативные контейнеры рекламы CUB, баннеры и надписи "Купить Premium"
                    if (node.classList.contains('ad-loader') || node.classList.contains('lampa-premium-alert') || node.id === 'cub-ad-container') {
                        node.remove();
                    }
                    // Поиск по тексту внутри кнопок (для динамических меню)
                    if (node.innerText && (node.innerText.includes('CUB Premium') || node.innerText.includes('Подписка PRO'))) {
                        node.style.display = 'none';
                    }
                }
            }
        }
    });

    if (document.documentElement) {
        observer.observe(document.documentElement, { childList: true, subtree: true });
    }
})();
