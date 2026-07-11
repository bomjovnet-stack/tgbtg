(function () {
    'use strict';

    // РџР»Р°РіРёРЅ РґР»СЏ РѕС‚РєР»СЋС‡РµРЅРёСЏ Shots РІ Lampa
    // РћС‚РєР»СЋС‡Р°РµС‚ С„СѓРЅРєС†РёРѕРЅР°Р»СЊРЅРѕСЃС‚СЊ СЃРєСЂРёРЅС€РѕС‚РѕРІ (shots)
    
    // РћС‚РєР»СЋС‡Р°РµРј Shots С‡РµСЂРµР· РЅР°СЃС‚СЂРѕР№РєРё
    window.lampa_settings = window.lampa_settings || {};
    window.lampa_settings.disable_features = window.lampa_settings.disable_features || {};
    window.lampa_settings.disable_features.shots = true;
    
    // РђР»СЊС‚РµСЂРЅР°С‚РёРІРЅС‹Р№ СЃРїРѕСЃРѕР± С‡РµСЂРµР· Storage
    if (typeof Lampa !== 'undefined' && Lampa.Storage) {
        Lampa.Storage.set('shots_enabled', 'false');
        Lampa.Storage.set('disable_shots', 'true');
    }
    
    // РћС‚РєР»СЋС‡Р°РµРј Shots С‡РµСЂРµР· РіР»РѕР±Р°Р»СЊРЅС‹Рµ РїРµСЂРµРјРµРЅРЅС‹Рµ
    window.lampa_shots_enabled = false;
    window.shots_enabled = false;
    
    // РџРµСЂРµС…РІР°С‚С‹РІР°РµРј РІРѕР·РјРѕР¶РЅС‹Рµ С„СѓРЅРєС†РёРё Shots
    if (typeof Lampa !== 'undefined') {
        // Р‘Р»РѕРєРёСЂСѓРµРј РёРЅРёС†РёР°Р»РёР·Р°С†РёСЋ Shots
        Lampa.Shots = {
            init: function() { return false; },
            show: function() { return false; },
            hide: function() { return false; },
            enabled: false
        };
        
        // РћС‚РєР»СЋС‡Р°РµРј РІ РєРѕРјРїРѕРЅРµРЅС‚Р°С…
        if (Lampa.Component && Lampa.Component.prototype) {
            var originalCreate = Lampa.Component.prototype.create;
            Lampa.Component.prototype.create = function() {
                var result = originalCreate.apply(this, arguments);
                
                // РЈРґР°Р»СЏРµРј СЌР»РµРјРµРЅС‚С‹ Shots РёР· DOM
                if (this.render && this.render()) {
                    var shotsElements = this.render().querySelectorAll('[data-shots], .shots, .shot, .screenshot, .shots-button, .shots-item');
                    shotsElements.forEach(function(el) {
                        el.style.display = 'none';
                        el.remove();
                    });
                }
                
                return result;
            };
        }
        
        // РџРµСЂРµС…РІР°С‚С‹РІР°РµРј Рё Р±Р»РѕРєРёСЂСѓРµРј РјРµРЅСЋ
        if (Lampa.Controller && Lampa.Controller.prototype) {
            var originalMenu = Lampa.Controller.prototype.menu;
            Lampa.Controller.prototype.menu = function() {
                var result = originalMenu.apply(this, arguments);
                
                // РЈРґР°Р»СЏРµРј РїСѓРЅРєС‚ Shots РёР· РјРµРЅСЋ - Р±РѕР»РµРµ С‚РѕС‡РЅР°СЏ РїСЂРѕРІРµСЂРєР°
                setTimeout(function() {
                    var menuItems = document.querySelectorAll('.menu__item, .menu-item');
                    menuItems.forEach(function(item) {
                        var text = item.textContent || item.innerText || '';
                        // РС‰РµРј РёРјРµРЅРЅРѕ Shots, Р° РЅРµ РґСЂСѓРіРёРµ РїСѓРЅРєС‚С‹
                        if (text === 'Shots' || text === 'РЅР°СЂРµР·РєРё' || text === 'СЃРєСЂРёРЅС€РѕС‚С‹' || text.includes('СЃРјРѕС‚СЂРµС‚СЊ РЅР°СЂРµР·РєРё')) {
                            item.style.display = 'none';
                            item.remove();
                        }
                    });
                    
                    // Р”РѕРїРѕР»РЅРёС‚РµР»СЊРЅР°СЏ РїСЂРѕРІРµСЂРєР° РїРѕ data-Р°С‚СЂРёР±СѓС‚Р°Рј
                    var shotsItems = document.querySelectorAll('[data-component="shots"], [data-action="shots"], [data-name="shots"]');
                    shotsItems.forEach(function(item) {
                        item.style.display = 'none';
                        item.remove();
                    });
                }, 100);
                
                return result;
            };
        }
        
        // Р‘Р»РѕРєРёСЂСѓРµРј РґРµС‚Р°Р»СЊРЅСѓСЋ РёРЅС„РѕСЂРјР°С†РёСЋ РєР°СЂС‚РѕС‡РєРё
        if (Lampa.Card && Lampa.Card.prototype) {
            var originalRender = Lampa.Card.prototype.render;
            Lampa.Card.prototype.render = function() {
                var result = originalRender.apply(this, arguments);
                
                setTimeout(function() {
                    // РЈРґР°Р»СЏРµРј РєРЅРѕРїРєРё Shots РІ РґРµС‚Р°Р»СЊРЅРѕР№ РёРЅС„РѕСЂРјР°С†РёРё
                    var shotsButtons = document.querySelectorAll('.card__shots, .full-info__shots, .shots-btn, [data-action="shots"]');
                    shotsButtons.forEach(function(btn) {
                        btn.style.display = 'none';
                        btn.remove();
                    });
                }, 200);
                
                return result;
            };
        }
    }
    
    // РЎС‚РёР»Рё РґР»СЏ СЃРєСЂС‹С‚РёСЏ СЌР»РµРјРµРЅС‚РѕРІ Shots
    var style = document.createElement('style');
    style.textContent = `
        [data-component="shots"],
        [data-action="shots"],
        [data-name="shots"],
        .shots-button,
        .shots-container,
        .shots-modal,
        .card__shots,
        .full-info__shots,
        .shots-btn,
        .shots-item {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            pointer-events: none !important;
            height: 0 !important;
            width: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
        }
    `;
    document.head.appendChild(style);
    
    // РћС‚РєР»СЋС‡Р°РµРј СЃРѕР±С‹С‚РёСЏ Shots
    document.addEventListener('DOMContentLoaded', function() {
        // РЈРґР°Р»СЏРµРј РѕР±СЂР°Р±РѕС‚С‡РёРєРё СЃРѕР±С‹С‚РёР№ РґР»СЏ Shots
        var shotsButtons = document.querySelectorAll('[onclick*="shots"], [onclick*="screenshot"]');
        shotsButtons.forEach(function(button) {
            button.onclick = null;
            button.style.display = 'none';
        });
    });
    
    // РђРіСЂРµСЃСЃРёРІРЅР°СЏ РѕС‡РёСЃС‚РєР° DOM - Р·Р°РїСѓСЃРєР°РµРј РїРµСЂРёРѕРґРёС‡РµСЃРєРё
    function removeShotsElements() {
        // РС‰РµРј Рё СѓРґР°Р»СЏРµРј С‚РѕР»СЊРєРѕ РєРѕРЅРєСЂРµС‚РЅС‹Рµ СЌР»РµРјРµРЅС‚С‹ Shots
        var selectors = [
            '[data-component="shots"]',
            '[data-action="shots"]',
            '[data-name="shots"]',
            '.shots-button',
            '.shots-container',
            '.shots-modal',
            '.card__shots',
            '.full-info__shots',
            '.shots-btn'
        ];
        
        selectors.forEach(function(selector) {
            var elements = document.querySelectorAll(selector);
            elements.forEach(function(el) {
                el.style.display = 'none';
                el.remove();
            });
        });
        
        // Р‘РѕР»РµРµ С‚РѕС‡РЅР°СЏ РїСЂРѕРІРµСЂРєР° РїРѕ С‚РµРєСЃС‚РѕРІРѕРјСѓ СЃРѕРґРµСЂР¶РёРјРѕРјСѓ
        var allElements = document.querySelectorAll('.menu__item, .menu-item, .button, [class*="shots"]');
        allElements.forEach(function(el) {
            var text = (el.textContent || el.innerText || '').trim();
            // РС‰РµРј С‚РѕР»СЊРєРѕ С‚РѕС‡РЅС‹Рµ СЃРѕРІРїР°РґРµРЅРёСЏ РґР»СЏ Shots
            if (text === 'Shots' || text === 'РЅР°СЂРµР·РєРё' || text === 'СЃРєСЂРёРЅС€РѕС‚С‹' || text === 'СЃРјРѕС‚СЂРµС‚СЊ РЅР°СЂРµР·РєРё') {
                el.style.display = 'none';
                el.remove();
            }
        });
    }
    
    // Р—Р°РїСѓСЃРєР°РµРј РѕС‡РёСЃС‚РєСѓ СЃСЂР°Р·Сѓ
    removeShotsElements();
    
    // Р—Р°РїСѓСЃРєР°РµРј РїРµСЂРёРѕРґРёС‡РµСЃРєРё РґР»СЏ РґРёРЅР°РјРёС‡РµСЃРєРё СЃРѕР·РґР°РІР°РµРјС‹С… СЌР»РµРјРµРЅС‚РѕРІ (СЂРµР¶Рµ)
    setInterval(removeShotsElements, 3000);
    
    // РќР°Р±Р»СЋРґР°РµРј Р·Р° РёР·РјРµРЅРµРЅРёСЏРјРё РІ DOM
    var observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes.length) {
                removeShotsElements();
            }
        });
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    // Р›РѕРіРёСЂРѕРІР°РЅРёРµ РґР»СЏ РѕС‚Р»Р°РґРєРё
    console.log('[Lampa Plugin] Shots РѕС‚РєР»СЋС‡РµРЅ');
    
})();
