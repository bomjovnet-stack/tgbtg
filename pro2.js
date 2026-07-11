(function() {
    // 1. Перехват старых запросов XMLHttpRequest (AJAX)
    const TargetXHR = window.XMLHttpRequest;
    window.XMLHttpRequest = function() {
        const xhr = new TargetXHR();
        const originalOpen = xhr.open;
        
        xhr.open = function(method, url) {
            if (typeof url === 'string' && (url.includes('account') || url.includes('profile'))) {
                this.addEventListener('readystatechange', function() {
                    if (this.readyState === 4 && this.status === 200) {
                        try {
                            let data = JSON.parse(this.responseText);
                            data.premium = true; // Включаем статус PRO
                            data.pro = true;
                            data.vip = true;
                            
                            // Подменяем ответ сервера
                            Object.defineProperty(this, 'responseText', { value: JSON.stringify(data) });
                        } catch (e) {}
                    }
                });
            }
            return originalOpen.apply(this, arguments);
        };
        return xhr;
    };

    // 2. Перехват современных запросов Fetch
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
        const response = await originalFetch.apply(this, args);
        const url = args[0];

        if (typeof url === 'string' && (url.includes('account') || url.includes('profile'))) {
            try {
                const data = await response.json();
                data.premium = true; // Включаем статус PRO
                data.pro = true;
                data.vip = true;

                // Возвращаем модифицированный ответ
                return new Response(JSON.stringify(data), {
                    status: response.status,
                    statusText: response.statusText,
                    headers: response.headers
                });
            } catch (e) {}
        }
        return response;
    };

    console.log('[Lampa PRO] Скрипт эмуляции Premium-аккаунта запущен.');
})();
