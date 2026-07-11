(function() {
    'use strict';
    if (window.Lampa && window.Lampa.Storage) {
        var origGet = window.Lampa.Storage.get;
        window.Lampa.Storage.get = function(key, fallback) {
            if (key === 'showy_token') {
                return 'fa60590b-c35b-4636-bf7c-0b1a46548df6'; // поддельный токен
            }
            if (key === 'random_code') {
                return '123456';
            }
            return origGet.call(this, key, fallback);
        };
    }
    var origFetch = window.fetch;
    if (origFetch) {
        window.fetch = function(input, init) {
            var url = typeof input === 'string' ? input : (input && input.url ? input.url : '');
            if (url && url.indexOf('showypro.com') !== -1) {
                if (url.indexOf('/api/check_pro_auth/') !== -1 || url.indexOf('/api/check_subscription/') !== -1) {
                    console.log('[LampaPRO] Showy: подмена fetch для', url);
                    return Promise.resolve(new Response(
                        JSON.stringify({ status: 'success', token: 'fa60590b-c35b-4636-bf7c-0b1a46548df6' }),
                        { status: 200 }
                    ));
                }
                if (url.indexOf('/api/get_code/') !== -1) {
                    console.log('[LampaPRO] Showy: подмена fetch get_code');
                    return Promise.resolve(new Response(
                        JSON.stringify({ code: '123456' }),
                        { status: 200 }
                    ));
                }
                if (url.indexOf('/api/check_pro_code/') !== -1) {
                    console.log('[LampaPRO] Showy: подмена fetch check_pro_code');
                    return Promise.resolve(new Response(
                        JSON.stringify({ status: 'success', token: 'fa60590b-c35b-4636-bf7c-0b1a46548df6' }),
                        { status: 200 }
                    ));
                }
                if (url.indexOf('/api/plugin_liontech_payment/') !== -1) {
                    console.log('[LampaPRO] Showy: подмена fetch payment');
                    return Promise.resolve(new Response(
                        JSON.stringify({ status: 'success', payment_url: 'https://example.com' }),
                        { status: 200 }
                    ));
                }
            }
            return origFetch.call(this, input, init);
        };
    }
    var OrigXHR = window.XMLHttpRequest;
    if (OrigXHR) {
        window.XMLHttpRequest = function() {
            var xhr = new OrigXHR();
            var origOpen = xhr.open;
            var origSend = xhr.send;

            xhr.open = function(method, url, async, user, pass) {
                this._url = url;
                return origOpen.call(this, method, url, async, user, pass);
            };

            xhr.send = function(body) {
                var url = this._url || '';
                if (url && url.indexOf('showypro.com') !== -1) {
                    if (url.indexOf('/api/check_pro_auth/') !== -1 || url.indexOf('/api/check_subscription/') !== -1) {
                        console.log('[LampaPRO] Showy: подмена XHR для', url);
                        var self = this;
                        setTimeout(function() {
                            self.readyState = 4;
                            self.status = 200;
                            self.statusText = 'OK';
                            var response = JSON.stringify({ status: 'success', token: 'fa60590b-c35b-4636-bf7c-0b1a46548df6' });
                            self.responseText = response;
                            self.response = response;
                            if (self.onreadystatechange) self.onreadystatechange();
                            if (self.onload) self.onload();
                        }, 0);
                        return;
                    }
                    if (url.indexOf('/api/get_code/') !== -1) {
                        console.log('[LampaPRO] Showy: подмена XHR get_code');
                        var self = this;
                        setTimeout(function() {
                            self.readyState = 4;
                            self.status = 200;
                            self.statusText = 'OK';
                            var response = JSON.stringify({ code: '123456' });
                            self.responseText = response;
                            self.response = response;
                            if (self.onreadystatechange) self.onreadystatechange();
                            if (self.onload) self.onload();
                        }, 0);
                        return;
                    }
                    if (url.indexOf('/api/check_pro_code/') !== -1) {
                        console.log('[LampaPRO] Showy: подмена XHR check_pro_code');
                        var self = this;
                        setTimeout(function() {
                            self.readyState = 4;
                            self.status = 200;
                            self.statusText = 'OK';
                            var response = JSON.stringify({ status: 'success', token: 'fa60590b-c35b-4636-bf7c-0b1a46548df6' });
                            self.responseText = response;
                            self.response = response;
                            if (self.onreadystatechange) self.onreadystatechange();
                            if (self.onload) self.onload();
                        }, 0);
                        return;
                    }
                    if (url.indexOf('/api/plugin_liontech_payment/') !== -1) {
                        console.log('[LampaPRO] Showy: подмена XHR payment');
                        var self = this;
                        setTimeout(function() {
                            self.readyState = 4;
                            self.status = 200;
                            self.statusText = 'OK';
                            var response = JSON.stringify({ status: 'success', payment_url: 'https://example.com' });
                            self.responseText = response;
                            self.response = response;
                            if (self.onreadystatechange) self.onreadystatechange();
                            if (self.onload) self.onload();
                        }, 0);
                        return;
                    }
                }
                return origSend.call(this, body);
            };
            return xhr;
        };
        window.XMLHttpRequest.prototype = OrigXHR.prototype;
    }
    if (window.Lampa && window.Lampa.Reguest && window.Lampa.Reguest.prototype) {
        var origNative = window.Lampa.Reguest.prototype.native;
        var origSilent = window.Lampa.Reguest.prototype.silent;

        window.Lampa.Reguest.prototype.native = function(url, success, error, data, options) {
            if (url && url.indexOf('showypro.com') !== -1) {
                if (url.indexOf('/api/check_pro_auth/') !== -1 || url.indexOf('/api/check_subscription/') !== -1) {
                    console.log('[LampaPRO] Showy: подмена native для', url);
                    if (success) success({ status: 'success', token: 'fa60590b-c35b-4636-bf7c-0b1a46548df6' });
                    return;
                }
                if (url.indexOf('/api/get_code/') !== -1) {
                    console.log('[LampaPRO] Showy: подмена native get_code');
                    if (success) success({ code: '123456' });
                    return;
                }
                if (url.indexOf('/api/check_pro_code/') !== -1) {
                    console.log('[LampaPRO] Showy: подмена native check_pro_code');
                    if (success) success({ status: 'success', token: 'fa60590b-c35b-4636-bf7c-0b1a46548df6' });
                    return;
                }
                if (url.indexOf('/api/plugin_liontech_payment/') !== -1) {
                    console.log('[LampaPRO] Showy: подмена native payment');
                    if (success) success({ status: 'success', payment_url: 'https://example.com' });
                    return;
                }
            }
            return origNative.call(this, url, success, error, data, options);
        };

        window.Lampa.Reguest.prototype.silent = function(url, success, error, data, options) {
            if (url && url.indexOf('showypro.com') !== -1) {
                if (url.indexOf('/api/check_pro_auth/') !== -1 || url.indexOf('/api/check_subscription/') !== -1) {
                    console.log('[LampaPRO] Showy: подмена silent для', url);
                    if (success) success({ status: 'success', token: 'fa60590b-c35b-4636-bf7c-0b1a46548df6' });
                    return;
                }
                if (url.indexOf('/api/get_code/') !== -1) {
                    console.log('[LampaPRO] Showy: подмена silent get_code');
                    if (success) success({ code: '123456' });
                    return;
                }
                if (url.indexOf('/api/check_pro_code/') !== -1) {
                    console.log('[LampaPRO] Showy: подмена silent check_pro_code');
                    if (success) success({ status: 'success', token: 'fa60590b-c35b-4636-bf7c-0b1a46548df6' });
                    return;
                }
                if (url.indexOf('/api/plugin_liontech_payment/') !== -1) {
                    console.log('[LampaPRO] Showy: подмена silent payment');
                    if (success) success({ status: 'success', payment_url: 'https://example.com' });
                    return;
                }
            }
            return origSilent.call(this, url, success, error, data, options);
        };
    }

    console.log('[LampaPRO] Все механизмы обхода активированы, включая Showy RU');
})();
