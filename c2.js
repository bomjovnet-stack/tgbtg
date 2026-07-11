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

    // 2. ИНЪЕКЦИЯ СТИЛЕЙ ДЛЯ СКРЫТИЯ ПЛАШЕК (Резервный вариант)
    const style = document.createElement('style');
    style.innerHTML = `
        .ad-preroll__bg, 
        .ad-preroll__bg.animate, 
        .lampa-advert, 
        #cub-advert { 
            display: none !important; 
            opacity: 0 !important; 
            visibility: hidden !important; 
            pointer-events: none !important; 
        }
    `;
    if (document.head) {
        document.head.appendChild(style);
    } else {
        document.documentElement.appendChild(style);
    }

    // 3. УДАЛЕНИЕ РЕКЛАМНЫХ ПЛАШЕК ИЗ INTERFACE (Основной вариант)
    const adSelectors = [
        '.ad-preroll__bg',
        '.lampa-advert', 
        '#cub-advert', 
        '[class*="advert"]', 
        '[id*="advert"]',
        '.player-video__advert',
        '.ad-banner'
    ];

    function removeAdPlacards() {
        adSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                el.remove();
                console.log('[Lampa-PRO] Рекламный элемент вырезан:', selector);
            });
        });
    }

    // Следим за изменениями структуры страницы и удаляем фон на лету
    const observer = new MutationObserver(function(mutations) {
        removeAdPlacards();
    });

    if (document.documentElement) {
        observer.observe(document.documentElement, { childList: true, subtree: true });
    }
    
    // Первичный вызов очистки
    removeAdPlacards();
})();
