(function () {
    console.log("[Lampa-PRO] Интегрированная ультра-блокировка запущена");

    // 1. МГНОВЕННАЯ ЭМУЛЯЦИЯ PRO ДЛЯ ЯДРА LAMPA И CUB
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
    const proInterval = setInterval(fakeLampaPremium, 15);
    setTimeout(() => clearInterval(proInterval), 10000);

    // 2. МОДЕРНИЗИРОВАННЫЙ ПЕРЕХВАТ <VIDEO> (Идея из вашего скрипта, но без задержек)
    document.createElement = new Proxy(document.createElement, {
        apply(target, thisArg, args) {
            let element = target.apply(thisArg, args);
            
            if (args[0] === "video") {
                // Делаем копию метода play
                const originalPlay = element.play;
                
                element.play = function () {
                    // Проверяем, не является ли это видео основным фильмом (в Лампе у фильмов длинные src или стримы)
                    // Рекламные vast-ролики обычно короткие mp4 или блобы
                    if (element.src && (element.src.includes('vast') || element.src.includes('advert') || element.src.length < 5)) {
                        console.log("[Lampa-PRO] Рекламный видеопоток заблокирован мгновенно!");
                        
                        // Вместо ожидания 500мс, симулируем конец рекламы в эту же микросекунду (0мс)
                        element.ended = true;
                        element.dispatchEvent(new Event("ended")); 
                        return Promise.resolve();
                    }
                    // Если это настоящий фильм — запускаем его как обычно
                    return originalPlay.apply(this, arguments);
                };
            }
            return element;
        }
    });

    // 3. УДАЛЕНИЕ КЛАССА AD-PREROLL И ФОНА ИЗ CSS
    const style = document.createElement('style');
    style.innerHTML = `
        .ad-preroll, [class*="ad-preroll"], .ad-preroll__bg, .lampa-advert, #cub-advert { 
            display: none !important; opacity: 0 !important; visibility: hidden !important; 
            pointer-events: none !important; width: 0px !important; height: 0px !important;
            transition: none !important; animation: none !important;
        }
    `;
    if (document.head) { document.head.appendChild(style); } else { document.documentElement.appendChild(style); }

    // 4. БЕЗОПАСНАЯ ОЧИСТКА ТОЛЬКО РЕКЛАМНЫХ ТАЙМЕРОВ (Вместо массового удаления)
    const originalSetTimeout = window.setTimeout;
    window.setTimeout = function(callback, delay, ...args) {
        if (delay && delay > 0 && callback && callback.toString().match(/(ad-|preroll|vast|advert)/i)) {
            return originalSetTimeout.apply(this, [callback, 0, ...args]); // Срезаем задержку рекламы до нуля
        }
        return originalSetTimeout.apply(this, arguments);
    };

    // 5. ЖЕСТКОЕ УДАЛЕНИЕ ОСТАТКОВ ПЛАШЕК ИЗ DOM
    const adSelectors = ['.ad-preroll', '.ad-preroll__bg', '[class*="ad-preroll"]', '.lampa-advert', '#cub-advert'];
    function removeAdPlacards() {
        adSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => el.remove());
        });
    }
    const observer = new MutationObserver(removeAdPlacards);
    if (document.documentElement) observer.observe(document.documentElement, { childList: true, subtree: true });
    removeAdPlacards();

})();
