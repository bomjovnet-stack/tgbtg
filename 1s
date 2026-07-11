(function() {
    const originalFetch = window.fetch;

    window.fetch = async function(...args) {
        const url = args[0];
        
        if (typeof url === 'string' && url.includes('yumata.github.io') && url.includes('vast.js')) {
            console.log('[Блокировщик] Запрос fetch к vast.js заблокирован!');
            
            // Возвращаем пустой фейковый ответ, чтобы плеер не завис, а просто подумал, что скрипт пустой
            return new Response('', {
                status: 200,
                statusText: 'OK',
                headers: { 'Content-Type': 'application/javascript' }
            });
        }
        
        return originalFetch.apply(this, args);
    };
})();
