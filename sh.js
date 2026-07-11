(function() {
    'use strict';

    var FAKE_TOKEN = 'fa60590b-c35b-4636-bf7c-0b1a46548df6';
    var FAKE_RESPONSE = { status: 'success', token: FAKE_TOKEN };
    var FAKE_JSON = JSON.stringify(FAKE_RESPONSE);

    // ============================================================
    // 1. Storage – всегда возвращаем поддельный токен
    // ============================================================
    if (window.Lampa && window.Lampa.Storage) {
        var origGet = window.Lampa.Storage.get;
        window.Lampa.Storage.get = function(key, fallback) {
            if (key === 'showy_token') return FAKE_TOKEN;
            if (key === 'random_code') return '123456';
            return origGet.call(this, key, fallback);
        };
        window.Lampa.Storage.set('showy_token', FAKE_TOKEN, true);
    }

    // ============================================================
    // 2. Перехват XMLHttpRequest (основной канал)
    // ============================================================
    var OrigXHR = window.XMLHttpRequest;
    if (OrigXHR) {
        window.XMLHttpRequest = function() {
            var xhr = new OrigXHR();
            var origOpen = xhr.open;
            var origSend = xhr.send;

            xhr.open = function(method, url, async, user, pass) {
                this._url = url;
                return origOpen.apply(this, arguments);
            };

            xhr.send = function(body) {
                var url = this._url || '';
                // Перехватываем все запросы к API авторизации и подписки
                if (url && url.indexOf('showypro.com/api/') !== -1 &&
                    (url.indexOf('/check_pro_auth/') !== -1 ||
                     url.indexOf('/check_subscription/') !== -1 ||
                     url.indexOf('/check_pro_code/') !== -1)) {
                    console.log('[ShowyCrack] XHR intercepted:', url);
                    var self = this;
                    setTimeout(function() {
                        // Устанавливаем свойства ответа
                        self.status = 200;
                        self.statusText = 'OK';
                        self.response = FAKE_JSON;
                        self.responseText = FAKE_JSON;
                        // Вызываем события
                        if (self.onreadystatechange) {
                            self.readyState = 4;
                            self.onreadystatechange();
                        }
                        if (self.onload) {
                            self.onload();
                        }
                    }, 0);
                    return;
                }
                // Перехват получения кода
                if (url && url.indexOf('showypro.com/api/get_code/') !== -1) {
                    console.log('[ShowyCrack] XHR get_code intercepted');
                    var self = this;
                    setTimeout(function() {
                        self.status = 200;
                        self.statusText = 'OK';
                        var resp = JSON.stringify({ code: '123456' });
                        self.response = resp;
                        self.responseText = resp;
                        if (self.onreadystatechange) {
                            self.readyState = 4;
                            self.onreadystatechange();
                        }
                        if (self.onload) self.onload();
                    }, 0);
                    return;
                }
                // Перехват оплаты
                if (url && url.indexOf('showypro.com/api/plugin_liontech_payment/') !== -1) {
                    console.log('[ShowyCrack] XHR payment intercepted');
                    var self = this;
                    setTimeout(function() {
                        self.status = 200;
                        self.statusText = 'OK';
                        var resp = JSON.stringify({ status: 'success', payment_url: 'https://example.com' });
                        self.response = resp;
                        self.responseText = resp;
                        if (self.onreadystatechange) {
                            self.readyState = 4;
                            self.onreadystatechange();
                        }
                        if (self.onload) self.onload();
                    }, 0);
                    return;
                }
                return origSend.apply(this, arguments);
            };
            return xhr;
        };
        // Сохраняем прототип для совместимости
        window.XMLHttpRequest.prototype = OrigXHR.prototype;
    }

    // ============================================================
    // 3. Перехват fetch
    // ============================================================
    if (window.fetch) {
        var origFetch = window.fetch;
        window.fetch = function(input, init) {
            var url = typeof input === 'string' ? input : (input && input.url ? input.url : '');
            if (url && url.indexOf('showypro.com/api/') !== -1 &&
                (url.indexOf('/check_pro_auth/') !== -1 ||
                 url.indexOf('/check_subscription/') !== -1 ||
                 url.indexOf('/check_pro_code/') !== -1)) {
                console.log('[ShowyCrack] fetch intercepted:', url);
                return Promise.resolve(new Response(FAKE_JSON, { status: 200 }));
            }
            if (url && url.indexOf('showypro.com/api/get_code/') !== -1) {
                return Promise.resolve(new Response(JSON.stringify({ code: '123456' }), { status: 200 }));
            }
            if (url && url.indexOf('showypro.com/api/plugin_liontech_payment/') !== -1) {
                return Promise.resolve(new Response(JSON.stringify({ status: 'success', payment_url: 'https://example.com' }), { status: 200 }));
            }
            return origFetch.call(this, input, init);
        };
    }

    // ============================================================
    // 4. Перехват jQuery.ajax (если используется)
    // ============================================================
    if (window.jQuery && window.jQuery.ajax) {
        var origAjax = window.jQuery.ajax;
        window.jQuery.ajax = function(settings) {
            var url = settings.url || '';
            if (url && url.indexOf('showypro.com/api/') !== -1) {
                if (url.indexOf('/check_pro_auth/') !== -1 ||
                    url.indexOf('/check_subscription/') !== -1 ||
                    url.indexOf('/check_pro_code/') !== -1) {
                    console.log('[ShowyCrack] jQuery.ajax intercepted:', url);
                    if (settings.success) settings.success(FAKE_RESPONSE, 'success');
                    if (settings.complete) settings.complete(FAKE_RESPONSE, 'success');
                    return;
                }
                if (url.indexOf('/api/get_code/') !== -1) {
                    if (settings.success) settings.success({ code: '123456' });
                    return;
                }
                if (url.indexOf('/api/plugin_liontech_payment/') !== -1) {
                    if (settings.success) settings.success({ status: 'success', payment_url: 'https://example.com' });
                    return;
                }
            }
            return origAjax.call(this, settings);
        };
    }

    // ============================================================
    // 5. Перехват Lampa.Reguest (используется в плагине)
    // ============================================================
    if (window.Lampa && window.Lampa.Reguest && window.Lampa.Reguest.prototype) {
        var origNative = window.Lampa.Reguest.prototype.native;
        var origSilent = window.Lampa.Reguest.prototype.silent;

        function isAuthUrl(url) {
            return url && url.indexOf('showypro.com/api/') !== -1 &&
                (url.indexOf('/check_pro_auth/') !== -1 ||
                 url.indexOf('/check_subscription/') !== -1 ||
                 url.indexOf('/check_pro_code/') !== -1);
        }

        function fakeResponse(success) {
            if (success) success(FAKE_RESPONSE);
        }

        window.Lampa.Reguest.prototype.native = function(url, success, error, data, options) {
            if (isAuthUrl(url)) {
                console.log('[ShowyCrack] Lampa.Reguest.native:', url);
                fakeResponse(success);
                return;
            }
            if (url && url.indexOf('showypro.com/api/get_code/') !== -1) {
                if (success) success({ code: '123456' });
                return;
            }
            if (url && url.indexOf('showypro.com/api/plugin_liontech_payment/') !== -1) {
                if (success) success({ status: 'success', payment_url: 'https://example.com' });
                return;
            }
            return origNative.call(this, url, success, error, data, options);
        };

        window.Lampa.Reguest.prototype.silent = function(url, success, error, data, options) {
            if (isAuthUrl(url)) {
                console.log('[ShowyCrack] Lampa.Reguest.silent:', url);
                fakeResponse(success);
                return;
            }
            if (url && url.indexOf('showypro.com/api/get_code/') !== -1) {
                if (success) success({ code: '123456' });
                return;
            }
            if (url && url.indexOf('showypro.com/api/plugin_liontech_payment/') !== -1) {
                if (success) success({ status: 'success', payment_url: 'https://example.com' });
                return;
            }
            return origSilent.call(this, url, success, error, data, options);
        };
    }

    // ============================================================
    // 6. Блокировка модальных окон авторизации
    // ============================================================
    if (window.Lampa && window.Lampa.Modal) {
        var origModalOpen = window.Lampa.Modal.open;
        window.Lampa.Modal.open = function(params) {
            var html = params.html && params.html[0] ? params.html[0].outerHTML : '';
            if (html && (html.indexOf('showybot') !== -1 ||
                         html.indexOf('Продлите PRO-подписку') !== -1 ||
                         html.indexOf('Авторизация') !== -1 ||
                         html.indexOf('подписку') !== -1 ||
                         html.indexOf('Подписка') !== -1)) {
                console.log('[ShowyCrack] Блокировка модального окна');
                if (params.onBack) params.onBack();
                return;
            }
            return origModalOpen.call(this, params);
        };
    }

    // ============================================================
    // 7. Принудительное завершение авторизации (если функция доступна)
    // ============================================================
    if (window.showyFinishAuth) {
        window.showyFinishAuth(FAKE_TOKEN);
    }

    // ============================================================
    // 8. Подмена премиум-статуса в Lampa и CUB
    // ============================================================
    if (window.Lampa && window.Lampa.Account) {
        window.Lampa.Account.is_premium = true;
        if (typeof window.Lampa.Account.hasPremium === 'function') {
            window.Lampa.Account.hasPremium = function() { return true; };
        }
        if (window.Lampa.Account.Permit) {
            try {
                Object.defineProperty(window.Lampa.Account.Permit, 'access', { get: function() { return true; }, configurable: false });
                Object.defineProperty(window.Lampa.Account.Permit, 'sync', { get: function() { return true; }, configurable: false });
            } catch(e) {
                window.Lampa.Account.Permit.access = true;
                window.Lampa.Account.Permit.sync = true;
            }
        }
    }
    if (window.CUB) {
        window.CUB.premium = true;
        window.CUB.pro = true;
        window.CUB.vip = true;
        window.CUB.ads = false;
        window.CUB.advert = function() { return false; };
    }
    if (window.Lampa && window.Lampa.Personal) {
        window.Lampa.Personal.confirm = function() { return true; };
    }

    console.log('[ShowyCrack] Обход Showy RU полностью активирован');
})();
