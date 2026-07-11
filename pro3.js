(function() {
    // 1. Принудительная подмена флагов премиума в глобальном объекте Lampa
    function forcePremium() {
        if (window.Lampa && window.Lampa.account) {
            // Эмулируем CUB Premium аккаунт
            window.Lampa.account.premium = function() { return true; };
            window.Lampa.account.pro = function() { return true; };
            window.Lampa.account.vip = function() { return true; };
            window.Lampa.account.is_premium = true;
        }
        
        // Отключаем инициализацию рекламы в модулях CUB
        if (window.CUB) {
            window.CUB.premium = true;
            window.CUB.ads = false;
            window.CUB.advert = function() { return false; }; 
        }
    }

    // Постоянно проверяем появление объектов Lampa и CUB на странице
    const premiumTimer = setInterval(function() {
        forcePremium();
        if (window.Lampa && window.CUB) {
            // Как только объекты нашлись, фиксируем значения
            forcePremium();
        }
    }, 100);

    // Стоп-таймер через 15 секунд, чтобы не тратить ресурсы
    setTimeout(() => clearInterval(premiumTimer), 15000);

    // 2. Полное уничтожение рекламных плееров в коде
    // Перехватываем создание объекта VASTPlayer на случай, если его вызывают изнутри других JS-скриптов
    Object.defineProperty(window, 'VASTPlayer', {
        get: function() {
            return function() {
                this.load = function() { return Promise.resolve(); };
                this.play = function() { console.log('[LampaPRO] Рекламный плеер остановлен.'); return Promise.resolve(); };
                this.on = function() { return this; };
                this.once = function() { return this; };
            };
        },
        configurable: true
    });

    // 3. Блокировка рекламного HTML-элемента в DOM
    // Если плеер пытается вставить контейнер с рекламой в интерфейс, мы его уничтожаем
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            mutation.addedNodes.forEach(function(node) {
                if (node.nodeType === 1) {
                    // Ищем рекламные контейнеры Lampa/CUB
                    if (node.classList.contains('lampa-advert') || 
                        node.id === 'cub-advert' || 
                        node.querySelector('[class*="advert"]')) {
                        node.remove();
                        console.log('[LampaPRO] Рекламный блок вырезан из интерфейса.');
                    }
                }
            });
        });
    });

    // Запускаем слежку за элементами на странице
    observer.observe(document.documentElement, { childList: true, subtree: true });

})();
