(function() {
    // 1. Блокировка <script src="...vast.js">
    const originalAppendChild = Element.prototype.appendChild;
    Element.prototype.appendChild = function(element) {
        if (element && element.tagName === 'SCRIPT' && element.src && 
            element.src.includes('vast.js')) {
            console.log('[Блок] SCRIPT:', element.src);
            return element; // Отмена добавления
        }
        return originalAppendChild.apply(this, arguments);
    };

    // 2. Блокировка fetch('...vast.js')
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
        if (args[0] && typeof args[0] === 'string' && args[0].includes('vast.js')) {
            console.log('[Блок] FETCH:', args[0]);
            return Promise.resolve(new Response(''));
        }
        return originalFetch.apply(this, args);
    };
