(function () {
  'use strict';

  var PLUGIN_ID = 'lampa-no-ads';

  if (window.__lampaNoAdsPlugin) return;
  window.__lampaNoAdsPlugin = true;

  var state = {
    ready: false,
    earlyReady: false,
    startReason: '',
    earlyReason: '',
    blockedScripts: 0,
    blockedRequests: 0,
    removedUnits: 0
  };

  var original = {};
  var earlyTimer = null;
  var startTimer = null;

  function log(message, data) {
    if (!window.console || !console.log) return;
    if (typeof data === 'undefined') console.log('[' + PLUGIN_ID + '] ' + message);
    else console.log('[' + PLUGIN_ID + '] ' + message, data);
  }

  function text(value) {
    return value == null ? '' : String(value);
  }

  function join(parts) {
    return parts.join('');
  }

  function isTargetScript(url) {
    return false;
  }

  function isAdManagerRequest(url) {
    return new RegExp(join(['\\/', 'api', '\\/', 'a', 'd', '\\/', 'va', 'st', '(?:\\?|#|$)']), 'i').test(text(url));
  }

  function isJsonRequest(url) {
    url = text(url);

    return isAdManagerRequest(url) ||
      new RegExp(join(['\\/', 'api', '\\/', 'a', 'd', '\\/', 'stat', '\\?']), 'i').test(url) ||
      new RegExp(join(['\\/', 'api', '\\/', 'metric', '\\/', 'stat', '\\?']), 'i').test(url) ||
      new RegExp(join(['\\/', 'api', '\\/', 'metric', '\\/', 'histogram', '\\?']), 'i').test(url);
  }

  function isTargetRequest(url) {
    url = text(url);

    return isAdManagerRequest(url) ||
      new RegExp(join(['\\/', 'api', '\\/', 'a', 'd', '\\/', 'stat', '\\?']), 'i').test(url) ||
      new RegExp(join(['\\/', 'api', '\\/', 'metric', '\\/', 'stat', '\\?[^#]*method=', 'a', 'd', '_manager_get']), 'i').test(url) ||
      new RegExp(join(['a', 'd', 's', '\\.', 'between', 'digital', '\\.', 'com', '\\/', 'adv']), 'i').test(url) ||
      new RegExp(join(['a', 'd', 's', '\\.', 'between', 'digital', '\\.', 'com', '\\/', 'video']), 'i').test(url) ||
      new RegExp(join(['a', 'd', 's', '\\.', 'between', 'digital', '\\.', 'com', '\\/', 'empty']), 'i').test(url) ||
      new RegExp(join(['lbs-[^/]+\\.', 'a', 'd', 's', '\\.', 'between', 'digital', '\\.', 'com', '\\/']), 'i').test(url) ||
      new RegExp(join(['intcdn\\d+\\.', 'a', 'd', 's', '\\.', 'between', 'digital', '\\.', 'com', '\\/']), 'i').test(url) ||
      new RegExp(join(['vh-', 'a', 'd', 'fox-converted']), 'i').test(url) ||
      new RegExp(join(['yandex', '\\.', 'ru', '\\/', 'a', 'd', 'fox']), 'i').test(url) ||
      new RegExp(join(['pixels', '\\.', 'getshop', '\\.', 'tv', '\\/', 'ctvh', '\\/', 'impression']), 'i').test(url) ||
      new RegExp(join(['vast', '\\.', 'ufouxbwn', '\\.', 'com', '\\/vast', '\\.', 'php']), 'i').test(url) ||
      new RegExp(join(['\\/vast', '\\.', 'php', '\\?[^#]*(partner_id|shema=vast|schema=vast)']), 'i').test(url);
  }

  function isVeoveoResponse(url) {
    return new RegExp(join(['api', '\\.', 'lampa', '\\.', 'stream', '\\/veoveo\\/']), 'i').test(text(url));
  }

  function removeVastFields(value, seen, depth) {
    if (!value || typeof value !== 'object') return false;
    if (value === window || value.nodeType || depth > 20) return false;

    seen = seen || [];
    depth = depth || 0;

    if (seen.indexOf(value) !== -1) return false;
    seen.push(value);

    var changed = false;

    try {
      if (Object.prototype.hasOwnProperty.call(value, 'vast_url')) {
        delete value.vast_url;
        changed = true;
      }

      if (Object.prototype.hasOwnProperty.call(value, 'vast_msg')) {
        delete value.vast_msg;
        changed = true;
      }

      for (var key in value) {
        if (Object.prototype.hasOwnProperty.call(value, key)) changed = removeVastFields(value[key], seen, depth + 1) || changed;
      }
    } catch (e) {}

    return changed;
  }

  function sanitizeResponse(data) {
    if (!data) return false;

    var url = data.params && data.params.url || '';
    var changed = removeVastFields(data.data) || removeVastFields(data);
    if (!changed && !isVeoveoResponse(url)) return false;

    if (changed) {
      state.blockedRequests++;
      log('vast fields removed', url);
      return true;
    }

    return false;
  }

  function isConnected(node) {
    try {
      if (!node) return false;
      if (typeof node.isConnected === 'boolean') return node.isConnected;
      return !!(document.documentElement && document.documentElement.contains(node));
    } catch (e) {
      return false;
    }
  }

  function isTargetNode(node) {
    if (!node || node.nodeType !== 1) return false;

    try {
      if (node.matches && node.matches('.ad-preroll, .ad-preroll *, .ad-video-block, .ad-video-block__status, .ad-video-block__vast, .ad-video-block__vast *')) return true;
      if (node.classList && node.classList.contains('ad-preroll')) return true;
      if (node.classList && node.classList.contains('ad-video-block__vast')) return true;
      if (node.classList && node.classList.contains('ad-video-block__status')) return true;
    } catch (e) {}

    return false;
  }

  function isAdBlock(node) {
    if (!node || node.nodeType !== 1) return false;

    try {
      if (node.matches && node.matches('.ad-preroll')) return true;
      if (node.classList && node.classList.contains('ad-preroll')) return true;
      if (node.matches && node.matches('.ad-video-block')) return true;
      if (node.classList && node.classList.contains('ad-video-block')) return true;
    } catch (e) {}

    return false;
  }

  function hasVastMarker(node) {
    if (!node || node.nodeType !== 1) return false;

    try {
      if (node.querySelector && node.querySelector('.ad-preroll, .ad-video-block__status, .ad-video-block__vast')) return true;
      if (node.matches && node.matches('.ad-preroll, .ad-video-block__status, .ad-video-block__vast')) return true;
      if (node.className && /ad-preroll|ad-video-block|vast/i.test(String(node.className))) return true;
    } catch (e) {}

    return false;
  }

  function emptyResponse(url) {
    if (isAdManagerRequest(url)) return '{"ad":[]}';
    if (isJsonRequest(url)) return '{"status":200,"ad":[]}';
    return '<?xml version="1.0" encoding="UTF-8"?><VAST version="3.0"></VAST>';
  }

  function emptyContentType(url) {
    return isJsonRequest(url) ? 'application/json;charset=utf-8' : 'application/xml;charset=utf-8';
  }

  function blockRequest(url) {
    if (!isTargetRequest(url)) return false;

    state.blockedRequests++;
    log('request skipped', url);
    return true;
  }

  function blockScriptNode(node) {
    if (!node || node.nodeType !== 1 || String(node.tagName).toUpperCase() !== 'SCRIPT') return false;

    var src = '';

    try {
      src = node.src || node.getAttribute('src') || '';
    } catch (e) {}

    if (!isTargetScript(src)) return false;

    state.blockedScripts++;

    try {
      node.type = 'javascript/blocked';
      node.removeAttribute('src');
      node.text = '';
    } catch (e2) {}

    log('script skipped', src);
    return true;
  }

  function removeTargetUnit(node) {
    if (!isTargetNode(node)) return false;

    var unit = node;

    try {
      if (node.closest) {
        unit = node.closest('.ad-preroll') || node.closest('.ad-video-block') || node.closest('.ad-video-block__vast') || node;
      }
    } catch (e) {}

    if (!isConnected(unit)) return false;
    if (isAdBlock(unit) && !hasVastMarker(unit)) return false;

    try {
      var videos = unit.getElementsByTagName ? unit.getElementsByTagName('video') : [];
      for (var i = 0; i < videos.length; i++) {
        try {
          videos[i].pause();
          videos[i].removeAttribute('src');
          videos[i].load();
        } catch (e2) {}
      }

      if (unit.parentNode) unit.parentNode.removeChild(unit);
      state.removedUnits++;
      log('unit removed');
      return true;
    } catch (e3) {
      return false;
    }
  }

  function patchFetch() {
    if (!window.fetch || original.fetch) return;

    original.fetch = window.fetch;

    window.fetch = function (input) {
      var url = typeof input === 'string' ? input : input && input.url;

      if (blockRequest(url)) {
        return Promise.resolve(new Response(emptyResponse(url), {
          status: 200,
          statusText: 'OK',
          headers: { 'Content-Type': emptyContentType(url) }
        }));
      }

      return original.fetch.apply(this, arguments);
    };
  }

  function patchXhr() {
    if (!window.XMLHttpRequest || original.xhrOpen) return;

    original.xhrOpen = XMLHttpRequest.prototype.open;
    original.xhrSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (method, url) {
      this.__lampaNoAdsUrl = url;

      if (isTargetRequest(url)) {
        this.__lampaNoAdsBlocked = true;
        arguments[1] = 'data:' + emptyContentType(url) + ',' + encodeURIComponent(emptyResponse(url));
      }

      return original.xhrOpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function () {
      if (this.__lampaNoAdsBlocked) blockRequest(this.__lampaNoAdsUrl);
      return original.xhrSend.apply(this, arguments);
    };
  }

  function patchSetAttribute() {
    if (!window.Element || original.setAttribute) return;

    original.setAttribute = Element.prototype.setAttribute;

    Element.prototype.setAttribute = function (name, value) {
      if (String(this.tagName).toUpperCase() === 'SCRIPT' && /^src$/i.test(name) && isTargetScript(value)) {
        state.blockedScripts++;
        log('script attribute skipped', value);
        return original.setAttribute.call(this, 'data-skipped-src', value);
      }

      return original.setAttribute.apply(this, arguments);
    };
  }

  function findDescriptor(proto, property) {
    while (proto) {
      var descriptor = Object.getOwnPropertyDescriptor(proto, property);
      if (descriptor) return descriptor;
      proto = Object.getPrototypeOf(proto);
    }

    return null;
  }

  function patchScriptSrc() {
    if (!window.HTMLScriptElement || original.scriptSrc) return;

    var descriptor = findDescriptor(HTMLScriptElement.prototype, 'src');
    if (!descriptor || !descriptor.configurable || !descriptor.set) return;

    original.scriptSrc = descriptor;

    Object.defineProperty(HTMLScriptElement.prototype, 'src', {
      configurable: true,
      enumerable: descriptor.enumerable,
      get: descriptor.get,
      set: function (value) {
        if (isTargetScript(value)) {
          state.blockedScripts++;
          log('script src skipped', value);
          try {
            original.setAttribute.call(this, 'data-skipped-src', value);
          } catch (e) {}
          return;
        }

        return descriptor.set.call(this, value);
      }
    });
  }

  function patchMediaSrc() {
    if (!window.HTMLMediaElement || original.mediaSrc) return;

    var descriptor = findDescriptor(HTMLMediaElement.prototype, 'src');
    if (!descriptor || !descriptor.configurable || !descriptor.set) return;

    original.mediaSrc = descriptor;

    Object.defineProperty(HTMLMediaElement.prototype, 'src', {
      configurable: true,
      enumerable: descriptor.enumerable,
      get: descriptor.get,
      set: function (value) {
        if (isTargetRequest(value) || isTargetNode(this)) {
          blockRequest(value);
          removeTargetUnit(this);
          return;
        }

        return descriptor.set.call(this, value);
      }
    });
  }

  function injectStyles() {
    if (!document.documentElement || document.getElementById(PLUGIN_ID + '-style')) return;

    try {
      var style = document.createElement('style');
      style.id = PLUGIN_ID + '-style';
      style.textContent = '.ad-preroll,.ad-video-block{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;}';
      document.documentElement.appendChild(style);
    } catch (e) {}
  }

  function patchLampaListener() {
    if (!window.Lampa || !Lampa.Listener || !Lampa.Listener.send || original.listenerSend) return false;

    original.listenerSend = Lampa.Listener.send;

    Lampa.Listener.send = function (name, data) {
      var url = data && data.params && data.params.url || '';

      if (/^request_/i.test(String(name)) || isVeoveoResponse(url)) sanitizeResponse(data);
      return original.listenerSend.apply(this, arguments);
    };

    return true;
  }

  function patchLampaListenerLater() {
    var attempts = 0;

    function bind() {
      attempts++;
      if (patchLampaListener()) return;
      if (attempts < 80) setTimeout(bind, 250);
    }

    bind();
  }

  function makeResolved(value) {
    return window.Promise ? Promise.resolve(value) : value;
  }

  function VastPlayerStub(container) {
    this.container = container;
    this.ready = true;
    this.__lampaNoAdsHandlers = {};
  }

  VastPlayerStub.prototype.on = function (name, handler) {
    if (!this.__lampaNoAdsHandlers[name]) this.__lampaNoAdsHandlers[name] = [];
    if (typeof handler === 'function') this.__lampaNoAdsHandlers[name].push(handler);
    return this;
  };

  VastPlayerStub.prototype.once = function (name, handler) {
    var self = this;

    function onceHandler() {
      self.off(name, onceHandler);
      return handler.apply(this, arguments);
    }

    return this.on(name, onceHandler);
  };

  VastPlayerStub.prototype.off = function (name, handler) {
    if (!name) this.__lampaNoAdsHandlers = {};
    else if (!handler) delete this.__lampaNoAdsHandlers[name];
    else {
      var handlers = this.__lampaNoAdsHandlers[name] || [];
      for (var i = handlers.length - 1; i >= 0; i--) {
        if (handlers[i] === handler) handlers.splice(i, 1);
      }
    }

    return this;
  };

  VastPlayerStub.prototype.emit = function (name) {
    var handlers = this.__lampaNoAdsHandlers[name] || [];
    var args = Array.prototype.slice.call(arguments, 1);

    for (var i = 0; i < handlers.length; i++) {
      try {
        handlers[i].apply(this, args);
      } catch (e) {}
    }

    return this;
  };

  VastPlayerStub.prototype.load = function () {
    state.blockedRequests++;
    log('vast player load skipped');
    this.emit('ready');
    return makeResolved(this);
  };

  VastPlayerStub.prototype.startAd = function () {
    var self = this;

    log('vast player start skipped');
    setTimeout(function () {
      self.emit('AdStopped');
    }, 0);
    return makeResolved(this);
  };

  VastPlayerStub.prototype.stopAd = function () {
    return makeResolved(this);
  };

  VastPlayerStub.prototype.pauseAd = function () {
    return makeResolved(this);
  };

  VastPlayerStub.prototype.resumeAd = function () {
    return makeResolved(this);
  };

  function installVastPlayerStub() {
    if (original.vastPlayerStubbed) return;

    original.vastPlayerStubbed = true;

    try {
      original.vastPlayer = window.VASTPlayer;

      Object.defineProperty(window, 'VASTPlayer', {
        configurable: true,
        enumerable: true,
        get: function () {
          return VastPlayerStub;
        },
        set: function (value) {
          original.vastPlayer = value;
          log('vast player replaced');
        }
      });
    } catch (e) {
      window.VASTPlayer = VastPlayerStub;
    }

    log('vast player stub installed');
  }

  function patchNodeInsertion() {
    if (!window.Node || original.appendChild) return;

    original.appendChild = Node.prototype.appendChild;
    original.insertBefore = Node.prototype.insertBefore;

    Node.prototype.appendChild = function (node) {
      if (blockScriptNode(node)) return node;
      var result = original.appendChild.apply(this, arguments);
      removeTargetUnit(node);
      return result;
    };

    Node.prototype.insertBefore = function (node) {
      if (blockScriptNode(node)) return node;
      var result = original.insertBefore.apply(this, arguments);
      removeTargetUnit(node);
      return result;
    };
  }

  function sweepTargetUnits() {
    if (!document.querySelectorAll) return;

    try {
      var nodes = document.querySelectorAll('.ad-preroll, .ad-video-block, .ad-video-block__status, .ad-video-block__vast');
      for (var i = 0; i < nodes.length; i++) removeTargetUnit(nodes[i]);
    } catch (e) {}
  }

  function scheduleSweeps() {
    var delays = [0, 100, 300, 1000, 3000];

    for (var i = 0; i < delays.length; i++) {
      setTimeout(sweepTargetUnits, delays[i]);
    }
  }

  function observeTargetUnits() {
    if (!window.MutationObserver || !document.documentElement) return;

    var observer = new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        for (var j = 0; j < mutations[i].addedNodes.length; j++) {
          removeTargetUnit(mutations[i].addedNodes[j]);
        }
      }
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  function startEarly(reason) {
    if (state.earlyReady) return;

    state.earlyReady = true;
    state.earlyReason = reason || 'early';

    injectStyles();
    patchFetch();
    patchXhr();
    patchSetAttribute();
    patchScriptSrc();
    patchNodeInsertion();
    patchLampaListenerLater();
    installVastPlayerStub();
    observeTargetUnits();
    scheduleSweeps();

    log('early started', state.earlyReason);
  }

  function start(reason) {
    if (state.ready) return;

    startEarly(reason || 'manual');

    state.ready = true;
    state.startReason = reason || 'manual';

    patchMediaSrc();
    scheduleSweeps();

    log('started', state.startReason);
  }

  function scheduleStart() {
    if (!earlyTimer && !state.earlyReady) {
      earlyTimer = setTimeout(function () {
        startEarly('early-deferred');
      }, 250);
    }

    if (startTimer || state.ready) return;

    startTimer = setTimeout(function () {
      start('deferred');
    }, 12000);
  }

  function listenPlayerStart() {
    var attempts = 0;

    function bind() {
      attempts++;

      try {
        if (window.Lampa && Lampa.Listener && typeof Lampa.Listener.follow === 'function') {
          Lampa.Listener.follow('full', function () { start('full'); });
          Lampa.Listener.follow('player', function () { start('player'); });
          Lampa.Listener.follow('video', function () { start('video'); });
          return;
        }
      } catch (e) {}

      if (attempts < 40) setTimeout(bind, 500);
    }

    bind();
  }

  function init() {
    window.LampaNoAds = {
      state: state,
      start: start,
      startEarly: startEarly,
      sweep: sweepTargetUnits,
      isTargetScript: isTargetScript,
      isTargetRequest: isTargetRequest
    };

    startEarly('init');
    scheduleStart();
    listenPlayerStart();
    log('loaded passively');
  }

  function waitForDom() {
    if (document.documentElement) init();
    else setTimeout(waitForDom, 100);
  }

  waitForDom();
})();
