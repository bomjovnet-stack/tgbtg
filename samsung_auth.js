// ==UserScript==
// @name         ShowyPro VIP Token Injector (Lampa Core Hijack)
// @namespace    showypro-token-injector-core
// @version      1000.2.0
// @description  Глубокая инъекция в ядро Lampa. Абсолютный Premium-unlock без перехвата XHR и Observer'ов.
// @match        *://showypro.com/*
// @match        *://cub.watch/*
// @match        *://lampa.mx/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Защита от дублирования инъекции
    const CORE_SIG = Symbol.for('[[Lampa_Core_Matrix]]');
    if (window[CORE_SIG]) return;
    window[CORE_SIG] = true;

    // Полный слепок премиум-сессии для функции account() и requestParams()
    const VIP_PAYLOAD = Object.freeze({
        showy_token: '22cf26b7-c0bf-448b-b9f8-0e072029ff2c',
        account_email: 'irinakrisa555@ya.ru',
        lampac_unic_id: 'xfp4fi4j',
        cub_id: '967951967'
    });

    const Log = {
        godMode: (msg) => console.log(`%c🧠 [Core Hijack]%c ${msg}`, 'color: #ff0055; text-shadow: 0 0 5px #ff0055; font-weight: bold;', 'color: inherit;')
    };

    // ============================================================
    // 1. ПОДМЕНА ЯДРА LAMPA (STORAGE & REQUEST)
    // ============================================================
    function pacifyLampaCore(Lampa) {
        if (Lampa.__isHijacked) return;
        Lampa.__isHijacked = true;

        // Шаг 1: Подмена памяти фреймворка
        // Плагин вызывает Lampa.Storage.get() в функции account()
        const origStorageGet = Lampa.Storage.get;
        Lampa.Storage.get = function(name, def) {
            // Если плагин просит ключи авторизации, отдаем наши VIP-данные
            if (VIP_PAYLOAD[name]) {
                return VIP_PAYLOAD[name];
            }
            return origStorageGet.call(this, name, def);
        };
        Log.godMode('Lampa.Storage успешно виртуализирован.');

        // Шаг 2: Векторная инъекция параметров прямо в сетевой класс Lampa
        // Плагин использует Lampa.Reguest для обращения к /lite/
        if (Lampa.Reguest && Lampa.Reguest.prototype) {
            ['native', 'silent'].forEach(method => {
                const origMethod = Lampa.Reguest.prototype[method];
                if (!origMethod) return;

                Lampa.Reguest.prototype[method] = function(url, ...args) {
                    if (typeof url === 'string' && url.includes('/lite/')) {
                        try {
                            const urlObj = new URL(url, window.location.origin);
                            // Форсированно встраиваем cub_id и другие параметры, перекрывая сгенерированные
                            urlObj.searchParams.set('cub_id', VIP_PAYLOAD.cub_id);
                            urlObj.searchParams.set('account_email', VIP_PAYLOAD.account_email);
                            urlObj.searchParams.set('uid', VIP_PAYLOAD.lampac_unic_id);
                            urlObj.searchParams.set('showy_token', VIP_PAYLOAD.showy_token);
                            url = urlObj.toString();
                        } catch (e) {
                            // Игнорируем ошибки парсинга, Lampa.Utils.addUrlComponent отработает внутри самого плагина
                        }
                    }
                    return origMethod.call(this, url, ...args);
                };
            });
            Log.godMode('Lampa.Reguest (Сетевой стек) взят под контроль.');
        }
    }

    // ============================================================
    // 2. НЕЙТРАЛИЗАЦИЯ ПРОВЕРОК АВТОРИЗАЦИИ JQUERY
    // ============================================================
    // Плагин осуществляет валидацию VIP-статуса через вызовы $.ajax
    function pacifyJQuery($) {
        if (!$) return;
        if ($.__isHijacked) return;
        $.__isHijacked = true;

        const origAjax = $.ajax;
        $.ajax = function(config) {
            const url = config.url || '';

            // Эмулируем успешный ответ для проверки auth
            if (url.includes('/api/check_pro_auth/')) {
                Log.godMode('Блокировка ajax: check_pro_auth (Возврат Premium статуса)');
                setTimeout(() => {
                    if (typeof config.success === 'function') {
                        config.success({ status: true, vip: true, premium: true, is_vip: 1, expire: 4102444800 });
                    }
                }, 0);
                return { abort: () => {} };
            }

            // Эмулируем успешный ответ для проверки подписки
            if (url.includes('/api/check_subscription/')) {
                Log.godMode('Блокировка ajax: check_subscription');
                setTimeout(() => {
                    if (typeof config.success === 'function') {
                        config.success({ status: 'success' });
                    }
                }, 0);
                return { abort: () => {} };
            }

            // Пропускаем все остальные легитимные ajax-запросы
            return origAjax.apply(this, arguments);
        };
        Log.godMode('Протоколы валидации jQuery ($) нейтрализованы.');
    }

    // ============================================================
    // 3. ПЕРЕХВАТ ИНИЦИАЛИЗАЦИИ
    // ============================================================
    // Поскольку мы не знаем точного момента загрузки Lampa и jQuery, мы
    // перехватываем их создание в глобальном пространстве имен.
    let cachedLampa = window.Lampa;
    let cachedJQuery = window.$ || window.jQuery;

    if (cachedLampa) pacifyLampaCore(cachedLampa);
    if (cachedJQuery) pacifyJQuery(cachedJQuery);

    Object.defineProperty(window, 'Lampa', {
        configurable: true,
        enumerable: true,
        get: () => cachedLampa,
        set: (val) => {
            cachedLampa = val;
            if (val) pacifyLampaCore(val);
        }
    });

    Object.defineProperty(window, '$', {
        configurable: true,
        enumerable: true,
        get: () => cachedJQuery,
        set: (val) => {
            cachedJQuery = val;
            if (val) pacifyJQuery(val);
        }
    });

    Log.godMode('Матрица Lampa Core Hijack установлена. Ожидание загрузки плагинов...');
})();
