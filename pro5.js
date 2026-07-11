(function() {
    // Функция, которая превращает ваш профиль в PRO
    function fakeLampaPremium() {
        // 1. Подменяем глобальный объект аккаунта Lampa
        if (window.Lampa && window.Lampa.account) {
            window.Lampa.account.is_premium = true;
            window.Lampa.account.premium = function() { return true; };
            window.Lampa.account.pro = function() { return true; };
            window.Lampa.account.vip = function() { return true; };
            
            // Имитируем статус ответа от сервера CUB
            if (window.Lampa.account.status) {
                window.Lampa.account.status = function() {
                    return {
                        premium: true,
                        pro: true,
                        vip: true,
                        expired: false,
                        active: true,
                        end: "2030-12-31" // Бессрочный PRO
                    };
                };
            }
        }

        // 2. Имитируем PRO-статус во внутреннем хранилище (Storage)
        if (window.Lampa && window.Lampa.Storage) {
            const originalGet = window.Lampa.Storage.get;
            window.Lampa.Storage.get = function(key, fallback) {
                const proKeys = ['account_premium', 'premium', 'cub_premium', 'account_pro', 'vip_status'];
                if (proKeys.includes(key)) {
                    return true;
                }
                return originalGet.apply(this, arguments);
            };
        }

        // 3. Подменяем объект платформы CUB
        if (window.CUB) {
            window.CUB.premium = true;
            window.CUB.pro = true;
            window.CUB.vip = true;
            window.CUB.ads = false; // Отключаем рекламу в CUB модулях
            if (window.CUB.advert) {
                window.CUB.advert = function() { return false; };
            }
        }
        
        // 4. Отключаем модуль Preroll (если он пытается провериться до загрузки статуса)
        if (window.Lampa && window.Lampa.Component) {
            try {
                const Preroll = window.Lampa.Component.get('preroll');
                if (Preroll) {
                    Preroll.init = function() { console.log('[PRO] Инициализация рекламы пропущена.'); };
                    Preroll.run = function(ready) { if(ready) ready(); };
                }
            } catch(e) {}
        }
    }

    // Запускаем агрессивный цикл подмены, чтобы успеть до первого рендеринга интерфейса
    const proInterval = setInterval(fakeLampaPremium, 30);

    // Через 15 секунд останавливаем таймер, когда ядро гарантированно загрузилось
    setTimeout(function() {
        clearInterval(proInterval);
        console.log('[Lampa-PRO] Эмуляция Premium-аккаунта успешно завершена.');
    }, 15000);
})();
