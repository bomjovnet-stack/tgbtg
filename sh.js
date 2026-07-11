(function() {
    'use strict';

    var FAKE_TOKEN = 'fa60590b-c35b-4636-bf7c-0b1a46548df6';

    // 1. Storage – всегда возвращаем поддельный токен
    if (window.Lampa && window.Lampa.Storage) {
        var origGet = window.Lampa.Storage.get;
        window.Lampa.Storage.get = function(key, fallback) {
            if (key === 'showy_token') return FAKE_TOKEN;
            if (key === 'random_code') return '123456';
            return origGet.call(this, key, fallback);
        };
        window.Lampa.Storage.set('showy_token', FAKE_TOKEN, true);
    }

    // 2. Lampa.Reguest – перехват native и silent
    if (window.Lampa && window.Lampa.Reguest && window.Lampa.Reguest.prototype) {
        var origNative = window.Lampa.Reguest.prototype.native;
        var origSilent = window.Lampa.Reguest.prototype.silent;

        function isShowyAuthUrl(url) {
            return url && url.indexOf('showypro.com') !== -1 && (
                url.indexOf('/api/check_pro_auth/') !== -1 ||
                url.indexOf('/api/check_subscription/') !== -1
            );
        }

        function fakeAuthResponse(success) {
            if (success) success({ status: 'success', token: FAKE_TOKEN });
        }

        window.Lampa.Reguest.prototype.native = function(url, success, error, data, options) {
            if (isShowyAuthUrl(url)) {
                console.log('[ShowyCrack] Reguest.native:', url);
                fakeAuthResponse(success);
                return;
            }
            return origNative.call(this, url, success, error, data, options);
        };

        window.Lampa.Reguest.prototype.silent = function(url, success, error, data, options) {
            if (isShowyAuthUrl(url)) {
                console.log('[ShowyCrack] Reguest.silent:', url);
                fakeAuthResponse(success);
                return;
            }
            return origSilent.call(this, url, success, error, data, options);
        };
    }

    // 3. jQuery.ajax – перехват всех AJAX-запросов плагина
    if (window.jQuery && window.jQuery.ajax) {
        var origAjax = window.jQuery.ajax;
        window.jQuery.ajax = function(settings) {
            var url = settings.url || '';
            if (url && url.indexOf('showypro.com') !== -1) {
                // Проверка авторизации/подписки
                if (url.indexOf('/api/check_pro_auth/') !== -1 ||
                    url.indexOf('/api/check_subscription/') !== -1) {
                    console.log('[ShowyCrack] jQuery.ajax:', url);
                    var fake = { status: 'success', token: FAKE_TOKEN };
                    if (settings.success) settings.success(fake, 'success', {});
                    if (settings.complete) settings.complete(fake, 'success');
                    return; // не отправляем реальный запрос
                }
                // Получение кода
                if (url.indexOf('/api/get_code/') !== -1) {
                    console.log('[ShowyCrack] jQuery.ajax get_code');
                    if (settings.success) settings.success({ code: '123456' });
                    return;
                }
                // Проверка введённого кода
                if (url.indexOf('/api/check_pro_code/') !== -1) {
                    console.log('[ShowyCrack] jQuery.ajax check_pro_code');
                    if (settings.success) settings.success({ status: 'success', token: FAKE_TOKEN });
                    return;
                }
                // Оплата
                if (url.indexOf('/api/plugin_liontech_payment/') !== -1) {
                    console.log('[ShowyCrack] jQuery.ajax payment');
                    if (settings.success) settings.success({ status: 'success', payment_url: 'https://example.com' });
                    return;
                }
            }
            return origAjax.call(this, settings);
        };
    }

    // 4. fetch – дополнительный перехват
    if (window.fetch) {
        var origFetch = window.fetch;
        window.fetch = function(input, init) {
            var url = typeof input === 'string' ? input : (input && input.url ? input.url : '');
            if (url && url.indexOf('showypro.com') !== -1) {
                if (url.indexOf('/api/check_pro_auth/') !== -1 ||
                    url.indexOf('/api/check_subscription/') !== -1) {
                    console.log('[ShowyCrack] fetch:', url);
                    return Promise.resolve(new Response(
                        JSON.stringify({ status: 'success', token: FAKE_TOKEN }),
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
                        JSON.stringify({ status: 'success', token: FAKE_TOKEN }),
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

    // 5. Блокировка модальных окон авторизации/подписки
    if (window.Lampa && window.Lampa.Modal) {
        var origModalOpen = window.Lampa.Modal.open;
        window.Lampa.Modal.open = function(params) {
            var html = params.html && params.html[0] ? params.html[0].outerHTML : '';
            if (html && (html.indexOf('showybot') !== -1 ||
                         html.indexOf('Продлите PRO-подписку') !== -1 ||
                         html.indexOf('Авторизация') !== -1 ||
                         html.indexOf('подписку') !== -1)) {
                console.log('[ShowyCrack] Блокировка модального окна');
                if (params.onBack) params.onBack();
                return;
            }
            return origModalOpen.call(this, params);
        };
    }

    // 6. Принудительно завершаем авторизацию, если функция доступна
    if (window.showyFinishAuth) {
        window.showyFinishAuth(FAKE_TOKEN);
    }

    // 7. Подмена премиум-статуса, чтобы плагин не требовал подписки
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
