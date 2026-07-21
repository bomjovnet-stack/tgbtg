// ==UserScript==
// @name         Lampa: YouTube Ultra Player Suite
// @namespace    lampa-youtube-player-suite
// @version      1000.YT.1
// @description  YouTube styled HTML5 player for Lampa: Red Scrubber, Gear Settings Menu, Speed & Quality Selectors, Circular Seek Ripples, Next Episode Countdown, Ambient Glow & Stats for Nerds.
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
  'use strict';

  if (window.__lampaYouTubePlayerLoaded) return;
  window.__lampaYouTubePlayerLoaded = true;

  var LOG_PREFIX = '🔴 [YouTube Player Suite]';
  function log(msg) {
    if (window.console) console.log(LOG_PREFIX + ' ' + msg);
  }

  // ============================================================
  // 1. CONFIGURATION & STATE
  // ============================================================
  var YT_CONFIG = {
    RED_ACCENT: '#FF0000',
    DARK_BG: '#0F0F0F',
    SEEK_STEP: 10, // seconds
    SPEED_OPTIONS: [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2],
    QUALITIES: ['Auto', '2160p 4K', '1080p 60fps', '1080p', '720p', '480p', '360p'],
    COUNTDOWN_SECONDS: 10,
    AMBIENT_GLOW: true,
    STATS_FOR_NERDS: false
  };

  var state = {
    statsVisible: false,
    ambientGlow: true,
    speed: 1,
    currentQuality: 'Auto',
    audioTrack: 0,
    subtitleTrack: 0,
    subDelay: 0,
    countdownTimer: null,
    countdownSeconds: YT_CONFIG.COUNTDOWN_SECONDS,
    seekingRipplesTimer: null
  };

  // ============================================================
  // 2. YOUTUBE STYLES & UI CSS INJECTION
  // ============================================================
  function injectYouTubeStyles() {
    var id = 'yt-player-suite-css';
    if (document.getElementById(id)) return;

    var style = document.createElement('style');
    style.id = id;
    style.type = 'text/css';

    var css = `
      /* YouTube Player Container & Overlay */
      .yt-player-overlay {
        position: absolute;
        top: 0; left: 0; right: 0; bottom: 0;
        pointer-events: none;
        z-index: 1000;
        font-family: "YouTube Sans", "Roboto", "Segoe UI", Arial, sans-serif;
        color: #ffffff;
        user-select: none;
      }

      /* Ambient Glow Effect */
      .yt-ambient-glow {
        position: absolute;
        top: -10%; left: -10%; width: 120%; height: 120%;
        pointer-events: none;
        z-index: 1;
        filter: blur(80px) brightness(0.7) opacity(0.4);
        transition: opacity 0.5s ease;
        overflow: hidden;
      }

      /* Circular Seek Ripple Animation (+10s / -10s) */
      .yt-seek-ripple {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        width: 140px; height: 140px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.15);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        pointer-events: none;
        z-index: 1005;
        opacity: 0;
        transition: transform 0.25s cubic-bezier(0,0,0.2,1), opacity 0.25s ease;
      }
      .yt-seek-ripple.left { left: 10%; }
      .yt-seek-ripple.right { right: 10%; }
      .yt-seek-ripple.active {
        opacity: 1;
        transform: translateY(-50%) scale(1.15);
      }
      .yt-seek-ripple-text {
        font-size: 16px;
        font-weight: 700;
        color: #ffffff;
        margin-top: 4px;
        text-shadow: 0 2px 4px rgba(0,0,0,0.8);
      }

      /* Big Center Play/Pause Flash Ripple */
      .yt-center-ripple {
        position: absolute;
        top: 50%; left: 50%;
        transform: translate(-50%, -50%) scale(0.7);
        width: 80px; height: 80px;
        border-radius: 50%;
        background: rgba(0, 0, 0, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1006;
        opacity: 0;
        pointer-events: none;
        transition: transform 0.3s cubic-bezier(0,0,0.2,1), opacity 0.3s ease;
      }
      .yt-center-ripple.active {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1.2);
      }

      /* YouTube Red Modern Progress Scrubber */
      .player-panel__timeline {
        height: 5px !important;
        border-radius: 2px !important;
        background: rgba(255, 255, 255, 0.2) !important;
        transition: height 0.1s ease !important;
        cursor: pointer;
      }
      .player-panel:hover .player-panel__timeline,
      .player-panel.focus .player-panel__timeline {
        height: 8px !important;
      }
      .player-panel__position {
        background-color: #FF0000 !important;
        border-radius: 2px !important;
      }
      .player-panel__position div {
        background-color: #FF0000 !important;
        box-shadow: 0 0 10px #FF0000, 0 0 18px rgba(255, 0, 0, 0.6) !important;
        width: 14px !important; height: 14px !important;
        top: -3px !important;
        border-radius: 50% !important;
        transition: transform 0.15s ease !important;
      }
      .player-panel.focus .player-panel__position div {
        transform: scale(1.3) !important;
      }

      /* Tooltip Timecode Preview */
      .yt-time-tooltip {
        position: absolute;
        bottom: 75px;
        background: rgba(15, 15, 15, 0.9);
        color: #ffffff;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 600;
        border: 1px solid rgba(255, 255, 255, 0.15);
        pointer-events: none;
        transform: translateX(-50%);
        z-index: 1008;
        display: none;
        box-shadow: 0 4px 12px rgba(0,0,0,0.5);
      }

      /* YouTube Gear Settings Modal Overlay */
      .yt-settings-modal {
        position: absolute;
        bottom: 80px; right: 30px;
        width: 320px;
        background: rgba(15, 15, 15, 0.95);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 12px 0;
        z-index: 1010;
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.9);
        display: none;
        pointer-events: auto;
      }
      .yt-settings-modal.visible { display: block; }
      .yt-settings-header {
        padding: 8px 16px;
        font-size: 14px;
        font-weight: 700;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        display: flex;
        align-items: center;
        justify-content: space-between;
        color: #ffffff;
      }
      .yt-settings-list {
        list-style: none;
        margin: 8px 0 0 0;
        padding: 0;
        max-height: 280px;
        overflow-y: auto;
      }
      .yt-settings-item {
        padding: 10px 16px;
        font-size: 13px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        cursor: pointer;
        transition: background 0.15s ease;
        color: #d0d0d0;
      }
      .yt-settings-item:hover,
      .yt-settings-item.focus {
        background: rgba(255, 255, 255, 0.15);
        color: #ffffff;
      }
      .yt-settings-item.active {
        color: #FF0000;
        font-weight: 700;
      }
      .yt-settings-value {
        font-size: 12px;
        color: #aaaaaa;
      }

      /* YouTube Next Episode Countdown Card */
      .yt-next-card {
        position: absolute;
        bottom: 90px; right: 30px;
        width: 340px;
        background: rgba(15, 15, 15, 0.95);
        border: 1px solid rgba(255, 0, 0, 0.3);
        border-radius: 12px;
        padding: 16px;
        z-index: 1009;
        box-shadow: 0 8px 28px rgba(0, 0, 0, 0.8);
        display: none;
        pointer-events: auto;
        animation: ytSlideUp 0.3s cubic-bezier(0,0,0.2,1);
      }
      @keyframes ytSlideUp {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      .yt-next-card.visible { display: block; }
      .yt-next-title {
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        color: #FF0000;
        letter-spacing: 0.5px;
        margin-bottom: 6px;
      }
      .yt-next-name {
        font-size: 14px;
        font-weight: 600;
        color: #ffffff;
        margin-bottom: 12px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .yt-next-actions {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .yt-next-btn {
        flex: 1;
        padding: 8px 12px;
        border-radius: 20px;
        border: none;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        text-align: center;
        transition: all 0.15s ease;
      }
      .yt-next-btn.play {
        background: #FF0000;
        color: #ffffff;
      }
      .yt-next-btn.play:hover, .yt-next-btn.play.focus {
        background: #CC0000;
        transform: scale(1.04);
        box-shadow: 0 0 12px rgba(255, 0, 0, 0.6);
      }
      .yt-next-btn.cancel {
        background: rgba(255, 255, 255, 0.15);
        color: #ffffff;
      }
      .yt-next-btn.cancel:hover, .yt-next-btn.cancel.focus {
        background: rgba(255, 255, 255, 0.25);
      }

      /* Stats for Nerds Panel */
      .yt-stats-panel {
        position: absolute;
        top: 20px; left: 20px;
        background: rgba(0, 0, 0, 0.88);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 8px;
        padding: 12px 16px;
        font-family: monospace;
        font-size: 11px;
        color: #00ffcc;
        z-index: 1012;
        line-height: 1.6;
        box-shadow: 0 10px 25px rgba(0,0,0,0.8);
        display: none;
        pointer-events: none;
        max-width: 380px;
      }
      .yt-stats-panel.visible { display: block; }
      .yt-stats-header {
        color: #ffffff;
        font-weight: 700;
        font-size: 12px;
        margin-bottom: 6px;
        border-bottom: 1px solid rgba(255,255,255,0.2);
        padding-bottom: 4px;
      }
    `;

    if (style.styleSheet) style.styleSheet.cssText = css;
    else style.appendChild(document.createTextNode(css));

    (document.documentElement || document.head).appendChild(style);
  }

  // ============================================================
  // 3. YOUTUBE PLAYER OVERLAY DOM GENERATION
  // ============================================================
  function createYouTubeOverlay() {
    var existing = document.getElementById('yt-player-overlay-root');
    if (existing) return existing;

    var overlay = document.createElement('div');
    overlay.id = 'yt-player-overlay-root';
    overlay.className = 'yt-player-overlay';

    overlay.innerHTML = `
      <!-- Left Seek Ripple (+10s / -10s) -->
      <div class="yt-seek-ripple left" id="yt-seek-left">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="#ffffff">
          <path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z"/>
        </svg>
        <div class="yt-seek-ripple-text">-10 сек</div>
      </div>

      <!-- Right Seek Ripple (+10s) -->
      <div class="yt-seek-ripple right" id="yt-seek-right">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="#ffffff">
          <path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6-8.5-6z"/>
        </svg>
        <div class="yt-seek-ripple-text">+10 сек</div>
      </div>

      <!-- Center Play/Pause Circle Ripple -->
      <div class="yt-center-ripple" id="yt-center-ripple">
        <svg id="yt-center-icon" width="40" height="40" viewBox="0 0 24 24" fill="#ffffff">
          <path d="M8 5v14l11-7z"/>
        </svg>
      </div>

      <!-- Scrubber Tooltip Preview -->
      <div class="yt-time-tooltip" id="yt-time-tooltip">00:00</div>

      <!-- Stats for Nerds Panel -->
      <div class="yt-stats-panel" id="yt-stats-panel">
        <div class="yt-stats-header">📊 Stats for nerds (YouTube Edition)</div>
        <div id="yt-stats-body">Initializing telemetry...</div>
      </div>

      <!-- Next Episode Countdown Card -->
      <div class="yt-next-card" id="yt-next-card">
        <div class="yt-next-title">Следующий эпизод через <span id="yt-countdown-num">10</span>с</div>
        <div class="yt-next-name" id="yt-next-name">Загрузка названия...</div>
        <div class="yt-next-actions">
          <button class="yt-next-btn play" id="yt-next-play-btn">СМОТРЕТЬ СЛЕДУЮЩУЮ</button>
          <button class="yt-next-btn cancel" id="yt-next-cancel-btn">ОТМЕНА</button>
        </div>
      </div>

      <!-- YouTube Gear Settings Modal -->
      <div class="yt-settings-modal" id="yt-settings-modal">
        <div class="yt-settings-header">
          <span>Настройки плеера</span>
          <span style="font-size:11px; color:#FF0000; cursor:pointer;" id="yt-settings-close">✕</span>
        </div>
        <ul class="yt-settings-list" id="yt-settings-list">
          <li class="yt-settings-item" data-action="speed">
            <span>Скорость воспроизведения</span>
            <span class="yt-settings-value" id="yt-val-speed">1x (Обычная)</span>
          </li>
          <li class="yt-settings-item" data-action="quality">
            <span>Качество видео</span>
            <span class="yt-settings-value" id="yt-val-quality">Auto</span>
          </li>
          <li class="yt-settings-item" data-action="audio">
            <span>Аудиодорожка</span>
            <span class="yt-settings-value" id="yt-val-audio">Основная</span>
          </li>
          <li class="yt-settings-item" data-action="subtitles">
            <span>Субтитры</span>
            <span class="yt-settings-value" id="yt-val-subs">Выкл</span>
          </li>
          <li class="yt-settings-item" data-action="stats">
            <span>Stats for Nerds</span>
            <span class="yt-settings-value" id="yt-val-stats">Выкл</span>
          </li>
        </ul>
      </div>
    `;

    document.body.appendChild(overlay);
    bindOverlayEvents();
    return overlay;
  }

  // ============================================================
  // 4. OVERLAY INTERACTION & UI HANDLERS
  // ============================================================
  function bindOverlayEvents() {
    var closeBtn = document.getElementById('yt-settings-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', function() {
        toggleSettingsModal(false);
      });
    }

    var nextPlay = document.getElementById('yt-next-play-btn');
    if (nextPlay) {
      nextPlay.addEventListener('click', function() {
        triggerNextEpisode();
      });
    }

    var nextCancel = document.getElementById('yt-next-cancel-btn');
    if (nextCancel) {
      nextCancel.addEventListener('click', function() {
        cancelCountdown();
      });
    }

    var settingsItems = document.querySelectorAll('.yt-settings-item');
    settingsItems.forEach(function(item) {
      item.addEventListener('click', function() {
        var action = item.getAttribute('data-action');
        handleSettingsAction(action);
      });
    });
  }

  function showSeekRipple(direction) {
    var el = document.getElementById(direction === 'left' ? 'yt-seek-left' : 'yt-seek-right');
    if (!el) return;
    el.classList.add('active');
    clearTimeout(state.seekingRipplesTimer);
    state.seekingRipplesTimer = setTimeout(function() {
      el.classList.remove('active');
    }, 600);
  }

  function showCenterRipple(isPlay) {
    var el = document.getElementById('yt-center-ripple');
    var icon = document.getElementById('yt-center-icon');
    if (!el || !icon) return;

    if (isPlay) {
      icon.innerHTML = '<path d="M8 5v14l11-7z"/>'; // Play icon
    } else {
      icon.innerHTML = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>'; // Pause icon
    }

    el.classList.add('active');
    setTimeout(function() {
      el.classList.remove('active');
    }, 500);
  }

  function toggleSettingsModal(show) {
    var modal = document.getElementById('yt-settings-modal');
    if (!modal) return;
    if (show === undefined) show = !modal.classList.contains('visible');
    if (show) modal.classList.add('visible');
    else modal.classList.remove('visible');
  }

  function handleSettingsAction(action) {
    var p = window.Lampa && window.Lampa.Player;
    if (action === 'speed') {
      var idx = YT_CONFIG.SPEED_OPTIONS.indexOf(state.speed);
      var nextIdx = (idx + 1) % YT_CONFIG.SPEED_OPTIONS.length;
      state.speed = YT_CONFIG.SPEED_OPTIONS[nextIdx];
      
      var video = document.querySelector('video');
      if (video) video.playbackRate = state.speed;

      var valEl = document.getElementById('yt-val-speed');
      if (valEl) valEl.innerText = state.speed + 'x' + (state.speed === 1 ? ' (Обычная)' : '');
      if (window.Lampa && window.Lampa.Noty) window.Lampa.Noty.show('Скорость: ' + state.speed + 'x');
    } else if (action === 'stats') {
      state.statsVisible = !state.statsVisible;
      var statsPanel = document.getElementById('yt-stats-panel');
      if (statsPanel) {
        if (state.statsVisible) statsPanel.classList.add('visible');
        else statsPanel.classList.remove('visible');
      }
      var statsVal = document.getElementById('yt-val-stats');
      if (statsVal) statsVal.innerText = state.statsVisible ? 'Вкл' : 'Выкл';
    } else if (action === 'quality') {
      if (window.Lampa && window.Lampa.Player && window.Lampa.Player.quality) {
        window.Lampa.Player.quality();
      }
    } else if (action === 'audio') {
      if (window.Lampa && window.Lampa.Player && window.Lampa.Player.tracks) {
        window.Lampa.Player.tracks();
      }
    } else if (action === 'subtitles') {
      if (window.Lampa && window.Lampa.Player && window.Lampa.Player.subtitles) {
        window.Lampa.Player.subtitles();
      }
    }
  }

  // ============================================================
  // 5. NEXT EPISODE COUNTDOWN & AUTOMATIC PLAYBACK
  // ============================================================
  function startNextEpisodeCountdown() {
    var p = window.Lampa && window.Lampa.Player;
    if (!p || !p.playlist || p.playlist.length <= 1) return;

    var currentIndex = -1;
    for (var i = 0; i < p.playlist.length; i++) {
      if (p.playlist[i] === p.opened) {
        currentIndex = i;
        break;
      }
    }

    if (currentIndex === -1 || currentIndex >= p.playlist.length - 1) return;

    var nextItem = p.playlist[currentIndex + 1];
    var card = document.getElementById('yt-next-card');
    var nameEl = document.getElementById('yt-next-name');
    var numEl = document.getElementById('yt-countdown-num');

    if (!card || !nameEl) return;

    nameEl.innerText = nextItem.title || ('Эпизод ' + (currentIndex + 2));
    card.classList.add('visible');

    state.countdownSeconds = YT_CONFIG.COUNTDOWN_SECONDS;
    if (numEl) numEl.innerText = state.countdownSeconds;

    clearInterval(state.countdownTimer);
    state.countdownTimer = setInterval(function() {
      state.countdownSeconds--;
      if (numEl) numEl.innerText = state.countdownSeconds;

      if (state.countdownSeconds <= 0) {
        clearInterval(state.countdownTimer);
        triggerNextEpisode();
      }
    }, 1000);
  }

  function cancelCountdown() {
    clearInterval(state.countdownTimer);
    var card = document.getElementById('yt-next-card');
    if (card) card.classList.remove('visible');
  }

  function triggerNextEpisode() {
    cancelCountdown();
    var p = window.Lampa && window.Lampa.Player;
    if (!p) return;

    if (p.playlist && p.opened) {
      var currentIndex = -1;
      for (var i = 0; i < p.playlist.length; i++) {
        if (p.playlist[i] === p.opened) {
          currentIndex = i;
          break;
        }
      }
      if (currentIndex !== -1 && currentIndex < p.playlist.length - 1) {
        p.play(p.playlist[currentIndex + 1]);
      }
    }
  }

  // ============================================================
  // 6. TELEMETRY & STATS FOR NERDS UPDATER
  // ============================================================
  function updateStatsForNerds() {
    if (!state.statsVisible) return;

    var video = document.querySelector('video');
    var statsBody = document.getElementById('yt-stats-body');
    if (!video || !statsBody) return;

    var res = video.videoWidth + 'x' + video.videoHeight;
    var rate = video.playbackRate + 'x';
    var vol = Math.round(video.volume * 100) + '%';
    
    var bufferedEnd = 0;
    if (video.buffered && video.buffered.length > 0) {
      bufferedEnd = (video.buffered.end(video.buffered.length - 1) - video.currentTime).toFixed(1);
    }

    var dropped = 0;
    var total = 0;
    if (typeof video.getVideoPlaybackQuality === 'function') {
      var q = video.getVideoPlaybackQuality();
      dropped = q.droppedVideoFrames;
      total = q.totalVideoFrames;
    }

    statsBody.innerHTML = `
      <div>Resolution: <b style="color:#fff">${res}</b></div>
      <div>Buffer Health: <b style="color:#00ff00">${bufferedEnd}s</b></div>
      <div>Dropped Frames: <b style="color:${dropped > 0 ? '#ff4444' : '#fff'}">${dropped} / ${total}</b></div>
      <div>Speed & Vol: <b style="color:#fff">${rate} | ${vol}</b></div>
      <div>Viewport: <b style="color:#fff">${window.innerWidth}x${window.innerHeight}</b></div>
      <div>Engine: <b style="color:#fff">${Lampa.Platform ? Lampa.Platform.get() : 'HTML5 Native'}</b></div>
    `;
  }

  // ============================================================
  // 7. KEYBOARD & D-PAD SHORTCUTS
  // ============================================================
  function bindKeyControls() {
    window.addEventListener('keydown', function(e) {
      var video = document.querySelector('video');
      var p = window.Lampa && window.Lampa.Player;

      if (!video || !p || !p.opened) return;

      // Space / K : Play / Pause
      if (e.keyCode === 32 || e.keyCode === 75) {
        if (video.paused) {
          video.play();
          showCenterRipple(true);
        } else {
          video.pause();
          showCenterRipple(false);
        }
      }
      // J : Seek Back 10s
      else if (e.keyCode === 74) {
        video.currentTime = Math.max(0, video.currentTime - YT_CONFIG.SEEK_STEP);
        showSeekRipple('left');
      }
      // L : Seek Forward 10s
      else if (e.keyCode === 76) {
        video.currentTime = Math.min(video.duration || 0, video.currentTime + YT_CONFIG.SEEK_STEP);
        showSeekRipple('right');
      }
      // Left Arrow in player
      else if (e.keyCode === 37 && document.activeElement === document.body) {
        video.currentTime = Math.max(0, video.currentTime - 5);
        showSeekRipple('left');
      }
      // Right Arrow in player
      else if (e.keyCode === 39 && document.activeElement === document.body) {
        video.currentTime = Math.min(video.duration || 0, video.currentTime + 5);
        showSeekRipple('right');
      }
      // S : Toggle Stats for Nerds
      else if (e.keyCode === 83) {
        handleSettingsAction('stats');
      }
      // N : Next Episode
      else if (e.keyCode === 78) {
        triggerNextEpisode();
      }
      // 0 - 9 : Jump to percentage
      else if (e.keyCode >= 48 && e.keyCode <= 57 && !e.ctrlKey && !e.altKey) {
        var pct = (e.keyCode - 48) / 10;
        if (video.duration) {
          video.currentTime = video.duration * pct;
          if (window.Lampa && window.Lampa.Noty) window.Lampa.Noty.show('Переход на ' + (pct * 100) + '%');
        }
      }
    }, true);
  }

  // ============================================================
  // 8. INITIALIZATION & HOOKS INTO LAMPA.PLAYER
  // ============================================================
  function bootYouTubePlayerSuite() {
    injectYouTubeStyles();
    createYouTubeOverlay();
    bindKeyControls();

    // Loop interval for telemetry
    setInterval(updateStatsForNerds, 1000);

    // Follow Lampa Player events
    if (window.Lampa && window.Lampa.Player) {
      window.Lampa.Player.listener.follow('message', function(e) {
        if (e.type === 'ready' || e.type === 'play') {
          createYouTubeOverlay();
          cancelCountdown();
        } else if (e.type === 'timeupdate') {
          var video = document.querySelector('video');
          if (video && video.duration && (video.duration - video.currentTime <= YT_CONFIG.COUNTDOWN_SECONDS)) {
            var card = document.getElementById('yt-next-card');
            if (card && !card.classList.contains('visible') && !state.countdownTimer) {
              startNextEpisodeCountdown();
            }
          }
        } else if (e.type === 'ended') {
          startNextEpisodeCountdown();
        } else if (e.type === 'destroy') {
          cancelCountdown();
          toggleSettingsModal(false);
        }
      });
    }

    log('YouTube Player Suite Ready.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootYouTubePlayerSuite);
  } else {
    bootYouTubePlayerSuite();
  }
})();
