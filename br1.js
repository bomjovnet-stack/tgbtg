(function() {
    // 1. ПЕРЕХВАТ И БЛОКИРОВКА ЗАГРУЗКИ КАТАЛОГОВ И СКРИПТОВ VAST
    const originalAppendChild = Element.prototype.appendChild;
    const originalInsertBefore = Element.prototype.insertBefore;

    function isAdScript(element) {
        if (element && element.tagName === 'SCRIPT' && element.src) {
            // Если в адресе скрипта есть vast.js или домен yumata, мы его блокируем
            if (element.src.includes('vast.js') || element.src.includes('yumata.github.io/lampa')) {
                console.log('[LampaPRO] Заблокирована попытка загрузки рекламного JS:', element.src);
                return true;
            }
        }
        return false;
    }

    // Перехватываем метод appendChild (добавление тега на страницу)
    Element.prototype.appendChild = function(element) {
        if (isAdScript(element)) {
            // Вместо блокировки всего приложения, подменяем скрипт пустышкой, чтобы не было синтаксических ошибок
            element.src = 'data:text/javascript;base64,Y29uc29sZS5sb2coJ0FkQmxvY2tlZCcpOw=='; 
        }
        return originalAppendChild.apply(this, arguments);
    };

    // Перехватываем метод insertBefore (иногда скрипты вставляют перед другими тегами)
    Element.prototype.insertBefore = function(element, referenceElement) {
        if (isAdScript(element)) {
            element.src = 'data:text/javascript;base64,Y29uc29sZS5sb2coJ0FkQmxvY2tlZCcpOw==';
        }
        return originalInsertBefore.apply(this, arguments);
    };

    // 2. СОЗДАНИЕ ПУСТОГО ОБЪЕКТА (Если плеер вызовет его, ошибок не будет, но реклама не включится)
    function createMockPlayer() {
        const Mock = function() {
            this.load = function() { return Promise.resolve(); };
            this.play = function() { console.log('[LampaPRO] Запуск рекламы пропущен.'); return Promise.resolve(); };
            this.on = function() { return this; };
            this.once = function() { return this; };
            this.off = function() { return this; };
        };

        Object.defineProperty(window, 'VASTPlayer', {
            get: function() { return Mock; },
            set: function() { console.log('[LampaPRO] Попытка перетереть заглушку отклонена.'); },
            configurable: true
        });
    }

    createMockPlayer();
})();
