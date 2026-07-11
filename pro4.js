(function() {
    // Функция полной зачистки рекламных модулей ядра Lampa
    function patchLampaCore() {
        // 1. Полностью глушим модуль Preroll (именно он запускает vast.js)
        if (window.Lampa && window.Lampa.Component && window.Lampa.Component.get('preroll')) {
            try {
                const Preroll = window.Lampa.Component.get('preroll');
                if (Preroll) {
                    Preroll.init = function() { console.log('[LampaPRO] Вызов Preroll.init заблокирован.'); };
                    Preroll.run = function(ready) { if(ready) ready(); }; // Сразу переходим к фильму
                }
            } catch(e) {}
        }

        // Альтернативный глобальный объект Preroll (зависит от версии сборки)
        if (window.Preroll) {
            window.Preroll.init = function() { console.log('[LampaPRO] Глобальный Preroll отключен.'); };
            window.Preroll.run = function(ready) { if(ready) ready(); };
        }

        // 2. Эмуляция PRO/Premium для отключения серверных проверок рекламы
        if (window.Lampa && window.Lampa.Storage) {
            try {
                // Подменяем метод чтения статуса премиума из локального хранилища
                const originalGet = window.Lampa.Storage.get;
                window.Lampa.Storage.get = function(key, fallback) {
                    if (key === 'account_premium' || key === 'premium' || key === 'cub_premium') {
                        return true; // Всегда возвращаем TRUE при проверке PRO
                    }
                    return originalGet.apply(this, arguments);
                };
            } catch(e) {}
        }

        // Дополнительный объект синхронизации CUB
        if (window.CUB) {
            window.CUB.premium = true;
            window.CUB.ads = false;
        }
    }

    // Запускаем циклический опрос, чтобы успеть пропатчить ядро до запуска видео
    const coreTimer = setInterval(function() {
        patchLampaCore();
        if (window.Lampa && window.Lampa.Component) {
            patchLampaCore();
        }
    }, 50);

    // Останавливаем таймер через 10 секунд
    setTimeout(() => clearInterval(coreTimer), 10000);
})();
