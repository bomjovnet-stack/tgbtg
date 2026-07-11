(function () {
    console.log("[Lampa-PRO] Улучшенный Proxy-скрипт активирован");

    // 1. АКТИВАЦИЯ PREMIUM / PRO СТАТУСА (Исправлено под синтаксис Lampa и CUB)
    function applySmartPremium() {
        if (window.Lampa && window.Lampa.account) {
            window.Lampa.account.is_premium = true;
            window.Lampa.account.premium = () => true;
            window.Lampa.account.pro = () => true;
            window.Lampa.account.vip = () => true;
            window.Lampa.account.status = () => ({ premium: true, pro: true, vip: true, expired: false, active: true, end: "2030-12-31" });
        }
        if (window.Lampa && window.Lampa.Storage) {
            const orgGet = window.Lampa.Storage.get;
            window.Lampa.Storage.get = function(key) {
                if (['account_premium', 'premium', 'cub_premium', 'account_pro', 'vip_status'].includes(key)) return true;
                return orgGet.apply(this, arguments);
            };
        }
        if (window.CUB) {
            window.CUB.premium = true;
            window.CUB.pro = true;
            window.CUB.ads = false;
            window.CUB.advert = () => false;
        }
    }
    const proInterval = setInterval(applySmartPremium, 20);
    setTimeout(() => clearInterval(proInterval), 12000);

    // 2. ИСПРАВЛЕННЫЙ И БЕЗОПАСНЫЙ ПЕРЕХВАТ <VIDEO> ЧЕРЕЗ PROXY
    document.createElement = new Proxy(document.createElement, {
        apply(target, thisArg, args) {
            let element = target.apply(thisArg, args);

            if (args[0] === "video") {
                console.log("[Lampa-PRO] Перехвачено создание видео-элемента");
                const originalPlay = element.play;

                element.play = function () {
                    const src = element.src || '';
                    const isAdClass = element.className && element.className.includes('ad-');
                    
                    // Умный фильтр: глушим только если это реклама (vast, advert или класс ad-preroll)
                    // Обычные фильмы (где длинный src или m3u8/mp4 потоки) пойдут без ограничений
                    if (src.includes('vast') || src.includes('advert') || isAdClass) {
                        console.log("[Lampa-PRO] Рекламное видео нейтрализовано!");
                        
                        element.ended = true;
                        // Срезаем задержку с 500мс до 0мс, чтобы на ТВ фильм включался мгновенно
                        setTimeout(() => {
                            element.dispatchEvent(new Event("ended")); 
                        }, 0);
                        
                        return Promise.resolve();
                    }
                    
                    // Если это настоящий фильм — запускаем стандартный плеер Samsung
                    return originalPlay.apply(this, arguments);
                };
            }
            return element;
        }
    });

    // 3. БЕЗОПАСНОЕ ОБНУЛЕНИЕ ТОЛЬКО РЕКЛАМНЫХ ТАЙМЕРОВ (Вместо опасного clearAdTimers)
    const originalSetTimeout = window.setTimeout;
    window.setTimeout = function(callback, delay, ...args) {
        if (delay && delay > 0 && callback && callback.toString().match(/(ad-|preroll|vast|advert)/i)) {
            // Сокращаем задержку рекламных таймеров до нуля, не трогая системные таймеры Лампы
            return originalSetTimeout.apply(this, [callback, 0, ...args]); 
        }
        return originalSetTimeout.apply(this, arguments);
    };

    // 4. МГНОВЕННОЕ СКРЫТИЕ СЕРЫХ/ЧЕРНЫХ ПЛАШЕК AD-PREROLL ЧЕРЕЗ CSS
    const style = document.createElement('style');
    style.innerHTML = `
        .ad-preroll, [class*="ad-preroll"], .ad-preroll__bg, .lampa-advert, #cub-advert, .player-video__advert { 
            display: none !important; opacity: 0 !important; visibility: hidden !important; 
            width: 0px !important; height: 0px !important; transition: none !important; animation: none !important;
        }
    `;
    if (document.head) { window.document.head.appendChild(style); } else { window.document.documentElement.appendChild(style); }
})();
