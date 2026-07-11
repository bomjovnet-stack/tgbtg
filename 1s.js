(function() {
    // Функция-инициализатор заглушки
    function initMock() {
        // Создаем фейковый класс-конструктор
        const MockVASTPlayer = function() {
            console.log('[Блокировщик] Создан пустой экземпляр VASTPlayer');
            
            // Заглушаем стандартные методы, которые плеер обычно вызывает после создания
            this.load = function() { return Promise.resolve(); };
            this.play = function() { console.log('[Блокировщик] Вызов VASTPlayer.play заблокирован'); return Promise.resolve(); };
            this.pause = function() {};
            this.stop = function() {};
            this.on = function() { return this; };
            this.once = function() { return this; };
            this.off = function() { return this; };
        };

        // Заменяем оригинальный объект в глобальной видимости
        Object.defineProperty(window, 'VASTPlayer', {
            get: function() {
                return MockVASTPlayer;
            },
            set: function(val) {
                // Если оригинальный скрипт попытается перезаписать VASTPlayer,
                // мы все равно оставляем нашу безопасную заглушку
                console.log('[Блокировщик] Попытка регистрации оригинального VASTPlayer отклонена');
            },
            configurable: true
        });
        
        console.log('[Блокировщик] Заглушка для VASTPlayer успешно установлена');
    }

    // Запускаем перехватчик немедленно
    initMock();
})();
