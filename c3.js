(function() {
    // 1. ЭМУЛЯЦИЯ PREMIUM / PRO СТАТУСА
    function fakeLampaPremium() {
        if (window.Lampa && window.Lampa.account) {
            window.Lampa.account.is_premium = true;
            window.Lampa.account.premium = function() { return true; };
            window.Lampa.account.pro = function() { return true; };
            window.Lampa.account.vip = function() { return true; };
            if (window.Lampa.account.status) {
                window.Lampa.account.status = function() {
                    return { premium: true, pro: true, vip: true, expired: false, active: true, end: "2030-12-31" };
                };
            }
        }
        if (window.Lampa && window.Lampa.Storage) {
            const originalGet = window.Lampa.Storage.get;
            window.Lampa.Storage.get = function(key, fallback) {
                if (['account_premium', 'premium', 'cub_premium', 'account_pro', 'vip_status'].includes(key)) return true;
                return originalGet.apply(this, arguments);
            };
        }
        if (window.CUB) {
            window.CUB.premium = true;
            window.CUB.pro = true;
            window.CUB.vip = true;
            window.CUB.ads = false;
            if (window.CUB.advert) window.CUB.advert = function() { return false; };
        }
        if (window.Lampa && window.Lampa.Component) {
            try {
                const Preroll = window.Lampa.Component.get('preroll');
                if (Preroll) {
                    Preroll.init = function() {};
                    Preroll.run = function(ready) { if(ready) ready(); };
                }
            } catch(e) {}
        }
    }

    const proInterval = setInterval(fakeLampaPremium, 30);
    setTimeout(() => clearInterval(proInterval), 15000);

    // 2. БЛОКИРОВКА ОБЪЕКТА AD-PREROLL В JS (Заглушка конструктора)
    if (!window.adPreroll || !window.AdPreroll) {
        const MockAdPreroll = function() {
            console.log('[Lampa-PRO] Перехвачена попытка создания ad-preroll');
            this.init = function() {};
            this.start = function() {};
            this.show = function() {};
            this.run = function(ready) { if(ready) ready(); };
        };
        
        // Регистрируем заглушку во всех возможных регистрах названия
        try {
            Object.defineProperty(window, 'adPreroll', { get: function() { return MockAdPreroll; }, configurable: true });
            Object.defineProperty(window, 'AdPreroll', { get: function() { return MockAdPreroll; }, configurable: true });
        } catch(e) {}
    }

    // 3. СТИЛИ ДЛЯ ПРИНУДИТЕЛЬНОГО СКРЫТИЯ (Даже если элемент на миг создается)
    const style = document.createElement('style');
    style.innerHTML = `
        .ad-preroll,
        [class*="ad-preroll"],
        [id*="ad-preroll"],
        .ad-preroll__bg, 
        .ad-preroll__bg.animate, 
        .lampa-advert, 
        #cub-advert { 
            display: none !important; 
            opacity: 0 !important; 
            visibility: hidden !important; 
            pointer-events: none !important; 
            width: 0px !important;
            height: 0px !important;
        }
    `;
    if (document.head) {
        document.head.appendChild(style);
    } else {
        document.documentElement.appendChild(style);
    }

    // 4. УДАЛЕНИЕ ИЗ ИНТЕРФЕЙСА (DOM) НА ЛЕТУ
    const adSelectors = [
        '.ad-preroll',
        '.ad-preroll__bg',
        '[class*="ad-preroll"]',
        '.lampa-advert', 
        '#cub-advert', 
        '.player-video__advert',
        '.ad-banner'
    ];

    function removeAdPlacards() {
        adSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                el.remove();
                console.log('[Lampa-PRO] Удален главный компонент рекламы:', selector);
            });
        });
    }

    // Постоянный трекер изменений на экране телевизора
    const observer = new MutationObserver(function(mutations) {
        removeAdPlacards();
    });

    if (document.documentElement) {
        observer.observe(document.documentElement, { childList: true, subtree: true });
    }
    
    removeAdPlacards();
})();
