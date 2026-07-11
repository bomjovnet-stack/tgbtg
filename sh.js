(function() {
    'use strict';

    // 1. Подмена токена в Storage
    if (window.Lampa && window.Lampa.Storage) {
        var origGet = window.Lampa.Storage.get;
        window.Lampa.Storage.get = function(key, fallback) {
            if (key === 'showy_token') {
                return 'fa60590b-c35b-4636-bf7c-0b1a46548df6';
            }
            if (key === 'random_code') {
                return '123456';
            }
            return origGet.call(this, key, fallback);
        };
        // Устанавливаем токен напрямую
        window.Lampa.Storage.set('showy_token', 'fa60590b-c35b-4636-bf7c-0b1a46548df6', true);
    }

    // 2. Перехват fetch
    var origFetch = window.fetch;
    if (origFetch) {
        window.fetch = function(input, init) {
            var url = typeof input === 'string' ? input : (input && input.url ? input.url : '');
            if (url && url.indexOf('showypro.com') !== -1) {
                if (url.indexOf('/api/check_pro_auth/') !== -1 ||
                    url.indexOf('/api/check_subscription/') !== -1) {
                    console.log('[ShowyCrack] fetch:', url);
                    return Promise.resolve(new Response(
                        JSON.stringify({ status: 'success', token: 'fa60590b-c35b-4636-bf7c-0b1a46548df6' }),
                        { status: 200 }
                    ));
                }
                if (url.indexOf('/api/get_code/') !== -1) {
                    return Promise.resolve(new Response(
                        JSON.stringify({ code: '123456' }),
                        { status: 200 }
                    ));
                }
                if (url.indexOf('/api/check_pro_code/') !== -1) {
                    return Promise.resolve(new Response(
                        JSON.stringify({ status: 'success', token: 'fa60590b-c35b-4636-bf7c-0b1a46548df6' }),
                        { status: 200 }
                    ));
                }
                if (url.indexOf('/api/plugin_liontech_payment/') !== -1) {
                    return Promise.resolve(new Response(
                        JSON.stringify({ status: 'success', payment_url: 'https://example.com' }),
                        { status: 200 }
                    ));
                }
            }
            return origFetch.call(this, input, init);
        };
    }

    // 3. Перехват Lampa.Reguest (используется плагином)
    if (window.Lampa && window.Lampa.Reguest && window.Lampa.Reguest.prototype) {
        var origNative = window.Lampa.Reguest.prototype.native;
        var origSilent = window.Lampa.Reguest.prototype.silent;

        window.Lampa.Reguest.prototype.native = function(url, success, error, data, options) {
            if (url && url.indexOf('showypro.com') !== -1) {
                if (url.indexOf('/api/check_pro_auth/') !== -1 ||
                    url.indexOf('/api/check_subscription/') !== -1) {
                    console.log('[ShowyCrack] native:', url);
                    if (success) success({ status: 'success', token: 'fa60590b-c35b-4636-bf7c-0b1a46548df6' });
                    return;
                }
                if (url.indexOf('/api/get_code/') !== -1) {
                    if (success) success({ code: '123456' });
                    return;
                }
                if (url.indexOf('/api/check_pro_code/') !== -1) {
                    if (success) success({ status: 'success', token: 'fa60590b-c35b-4636-bf7c-0b1a46548df6' });
                    return;
                }
                if (url.indexOf('/api/plugin_liontech_payment/') !== -1) {
                    if (success) success({ status: 'success', payment_url: 'https://example.com' });
                    return;
                }
            }
            return origNative.call(this, url, success, error, data, options);
        };

        window.Lampa.Reguest.prototype.silent = function(url, success, error, data, options) {
            if (url && url.indexOf('showypro.com') !== -1) {
                if (url.indexOf('/api/check_pro_auth/') !== -1 ||
                    url.indexOf('/api/check_subscription/') !== -1) {
                    console.log('[ShowyCrack] silent:', url);
                    if (success) success({ status: 'success', token: 'fa60590b-c35b-4636-bf7c-0b1a46548df6' });
                    return;
                }
                if (url.indexOf('/api/get_code/') !== -1) {
                    if (success) success({ code: '123456' });
                    return;
                }
                if (url.indexOf('/api/check_pro_code/') !== -1) {
                    if (success) success({ status: 'success', token: 'fa60590b-c35b-4636-bf7c-0b1a46548df6' });
                    return;
                }
                if (url.indexOf('/api/plugin_liontech_payment/') !== -1) {
                    if (success) success({ status: 'success', payment_url: 'https://example.com' });
                    return;
                }
            }
            return origSilent.call(this, url, success, error, data, options);
        };
    }

    // 4. Блокировка модальных окон авторизации
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

    // 5. Принудительное завершение авторизации (если плагин уже в процессе)
    // Пытаемся вызвать функцию завершения авторизации, если она доступна
    if (window.showyFinishAuth) {
        window.showyFinishAuth('fa60590b-c35b-4636-bf7c-0b1a46548df6');
    }

    console.log('[ShowyCrack] Обход Showy RU активирован');
})();
