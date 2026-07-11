(function () {
  'use strict';

  var PLUGIN_ID = 'lampa-ultra-tizen';

  if (window.__lampaUltraTizenPlugin) return;
  window.__lampaUltraTizenPlugin = true;

  var state = {
    blockedRequests: 0,
    removedUnits: 0
  };

  // Флаги регулярных выражений для отлова рекламы (vast, adfox, метрика и т.д.)
  var adPattern = /ad[-_]preroll|ad[-_]manager|vast\.js|yumata\.github|between\.digital|adfox|yandex\.ru\/ad|mc\.yandex/i;

  function log(msg) {
    if (window.console && console.log) console.log('[' + PLUGIN_ID + '] ' + msg);
  }

  // Функция, которая делает профиль Premium/PRO на телевизоре
  function makeLampaPremium() {
    if (window.Lampa && window.Lampa.account) {
      window.Lampa.account.is_premium = true;
      window.Lampa.account.premium = function() { return true; };
      window.Lampa.account.pro = function() { return true; };
      window.Lampa.account.vip = function() { return true; };
      window.Lampa.account.status = function() {
        return { premium: true, pro: true, vip: true, expired: false, active: true, end: "2030-12-31" };
      };
    }
    // Подмена локального хранилища настроек телевизора
    if (window.Lampa && window.Lampa.Storage) {
      var orgGet = window.Lampa.Storage.get;
      window.Lampa.Storage.get = function(key) {
        if (key === 'account_premium' || key === 'premium' || key === 'cub_premium' || key === 'account_pro' || key === 'vip_status') {
          return true;
        }
        return orgGet.apply(this, arguments);
      };
    }
    // Заглушка для серверной платформы CUB
    if (window.CUB) {
      window.CUB.premium = true;
      window.CUB.pro = true;
      window.CUB.vip = true;
      window.CUB.ads = false;
      window.CUB.advert = function() { return false; };
    }
    // Моментальный пропуск компонента Preroll в ядре без ожидания таймеров
    if (window.Lampa && window.Lampa.Component) {
      try {
        var Preroll = window.Lampa.Component.get('preroll');
        if (Preroll) {
          Preroll.init = function() {};
          Preroll.run = function(ready) { if (ready) ready(); };
        }
      } catch(e) {}
    }
  }

  // Запуск эмуляции PRO в циклическом режиме на старте приложения
  var proInterval = setInterval(makeLampaPremium, 20);
  setTimeout(function() { clearInterval(proInterval); }, 15000);
  // 2. ПЕРЕХВАТ СЕТЕВЫХ ЗАПРОСОВ FETCH (БЕЗ REFACTORING И PROXY)
  if (window.fetch && !original.fetch) {
    original.fetch = window.fetch;
    window.fetch = function (input, init) {
      var url = typeof input === 'string' ? input : (input && input.url ? input.url : '');
      
      // Если запрос содержит признаки рекламы, подменяем его пустой пустышкой
      if (url && adPattern.test(url)) {
        state.blockedRequests++;
        log('Заблокирован fetch-запрос рекламы: ' + url);
        
        var isJson = url.indexOf('json') !== -1 || url.indexOf('stat') !== -1;
        var contentType = isJson ? 'application/json' : 'application/xml';
        var mockBody = isJson ? '{"status":200,"ad":[],"premium":true,"pro":true}' : '<?xml version="1.0" encoding="UTF-8"?><VAST version="3.0"></VAST>';
        
        return Promise.resolve(new Response(mockBody, {
          status: 200,
          statusText: 'OK',
          headers: { 'Content-Type': contentType }
        }));
      }
      return original.fetch.apply(this, arguments);
    };
  }

  // 3. ТОЧЕЧНОЕ СРЕЗАНИЕ ТАЙМЕРОВ ОЖИДАНИЯ РЕКЛАМЫ ДО 0 МС
  var originalSetTimeout = window.setTimeout;
  window.setTimeout = function (callback, delay) {
    var args = Array.prototype.slice.call(arguments, 2);
    
    // Если код функции-таймера содержит упоминание рекламы, убираем задержку
    if (delay && delay > 0 && callback && adPattern.test(callback.toString())) {
      log('Срезана искусственная рекламная задержка до 0мс');
      return originalSetTimeout.apply(this, [callback, 0].concat(args));
    }
    return originalSetTimeout.apply(this, arguments);
  };
  // 4. ИНЪЕКЦИЯ СТИЛЕЙ ДЛЯ МГНОВЕННОГО СКРЫТИЯ ПЛАШЕК AD-PREROLL
  var style = document.createElement('style');
  style.innerHTML = '.ad-preroll, [class*="ad-preroll"], .ad-preroll__bg, .lampa-advert, #cub-advert, .player-video__advert { display: none !important; opacity: 0 !important; visibility: hidden !important; width: 0px !important; height: 0px !important; transition: none !important; animation: none !important; }';
  if (document.head) { document.head.appendChild(style); } else if (document.documentElement) { document.documentElement.appendChild(style); }

  // 5. ОЧИСТКА ЭЛЕМЕНТОВ ИНТЕРФЕЙСА (DOM) И СЛЕДУЮЩИЙ КОНТРОЛЬ ВИДЕО
  function removeAdUnits(node) {
    if (!node || node.nodeType !== 1) return;
    try {
      var isAd = node.className && adPattern.test(String(node.className)) || node.id && adPattern.test(String(node.id));
      if (isAd || (node.matches && node.matches('.ad-preroll, .ad-preroll__bg, .lampa-advert, #cub-advert'))) {
        
        // Гасим скрытые видео-потоки рекламы, если они запущены в Tizen
        var videos = node.getElementsByTagName ? node.getElementsByTagName('video') : [];
        for (var i = 0; i < videos.length; i++) {
          try {
            videos[i].pause();
            videos[i].removeAttribute('src');
            videos[i].load();
          } catch (e2) {}
        }
        
        if (node.parentNode) {
          node.parentNode.removeChild(node);
          state.removedUnits++;
          log('Рекламный элемент ad-preroll успешно вырезан из DOM');
        }
      }
    } catch (e) {}
  }

  // Наблюдатель за структурой страницы телевизора Samsung
  if (window.MutationObserver) {
    var observer = new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var addedNodes = mutations[i].addedNodes;
        if (addedNodes) {
          for (var j = 0; j < addedNodes.length; j++) {
            removeAdUnits(addedNodes[j]);
          }
        }
      }
    });
    if (document.documentElement) {
      observer.observe(document.documentElement, { childList: true, subtree: true });
    }
  }

  // Первичный запуск очистки существующих элементов
  try {
    var existingBad = document.querySelectorAll('.ad-preroll, .ad-preroll__bg, .lampa-advert, #cub-advert');
    for (var k = 0; k < existingBad.length; k++) {
      removeAdUnits(existingBad[k]);
    }
  } catch (e3) {}

  log('Плагин полностью загружен и запущен в режиме Tizen ES5.');
})();
