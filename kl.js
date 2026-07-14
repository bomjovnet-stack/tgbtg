(function() {
  'use strict';

  var script = document.currentScript;
  if (!script) {
    var scripts = document.getElementsByTagName('script');
    script = scripts[scripts.length - 1];
  }

  var src = script && script.src ? script.src : '';
  var match = src.match(/^(https?:\/\/[^\/]+)/);
  var host = match ? match[1] : 'https://bomjovnet-stack.github.io';
  var version = new Date().getTime();

  Lampa.Utils.putScriptAsync([host + '/tgbtg/online.js?v=' + version], function() {});
})();
