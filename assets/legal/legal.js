/* ВС-Логистика — уведомление о cookie + Яндекс Метрика только после согласия.
   METRIKA_ID пуст, пока счётчик не создан: тогда уведомление не показывается (аналитики нет). */
(function(){
  "use strict";
  var METRIKA_ID = '';
  var KEY = 'vsl-cookie-consent-v1'; /* 'all' | 'necessary' */
  var me = document.currentScript;
  var base = me ? me.src.replace(/assets\/legal\/legal\.js.*$/, '') : '/';
  function read(){ try { return localStorage.getItem(KEY); } catch(e){ return null; } }
  function save(v){ try { localStorage.setItem(KEY, v); } catch(e){} }
  var metrikaLoaded = false;
  function loadMetrika(){
    if (metrikaLoaded || !/^\d+$/.test(METRIKA_ID)) return;
    metrikaLoaded = true;
    (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
      m[i].l=1*new Date();k=e.createElement(t),a=e.getElementsByTagName(t)[0];k.async=1;k.src=r;a.parentNode.insertBefore(k,a)})
      (window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js?id=' + METRIKA_ID, 'ym');
    window.ym(Number(METRIKA_ID), 'init', { ssr:true, clickmap:true, referrer:document.referrer, url:location.href, accurateTrackBounce:true, trackLinks:true });
  }
  /* цели: только при согласии и загруженной Метрике */
  function goal(name){ try { if (metrikaLoaded && window.ym) window.ym(Number(METRIKA_ID), 'reachGoal', name); } catch(e){} }
  window.vslGoal = goal;
  document.addEventListener('click', function(e){
    var a = e.target.closest && e.target.closest('a[href]'); if (!a) return;
    var h = a.getAttribute('href') || '';
    if (/^tel:/.test(h)) goal('call');
    else if (/wa\.me\//.test(h)) goal('whatsapp');
    else if (/t\.me\//.test(h)) goal('telegram');
  }, true);
  var bar = null;
  function hide(){ if (!bar) return; bar.classList.remove('is-in'); var b = bar; bar = null; setTimeout(function(){ b.remove(); }, 400); }
  function show(){
    if (bar || !/^\d+$/.test(METRIKA_ID)) return;
    bar = document.createElement('div');
    bar.className = 'vl-cookie'; bar.setAttribute('role', 'dialog'); bar.setAttribute('aria-label', 'Уведомление о cookie');
    bar.innerHTML = '<p class="vl-cookie-text">Сайт использует cookie и&nbsp;Яндекс&nbsp;Метрику, чтобы видеть статистику посещений. Подробнее в&nbsp;<a href="' + base + 'cookies/">политике cookie</a>.</p>' +
      '<div class="vl-cookie-actions"><button type="button" class="vl-btn vl-btn-p" data-v="all">Принять</button><button type="button" class="vl-btn" data-v="necessary">Только необходимые</button></div>';
    bar.addEventListener('click', function(e){ var v = e.target.getAttribute && e.target.getAttribute('data-v'); if (!v) return; save(v); if (v === 'all') loadMetrika(); hide(); });
    document.body.appendChild(bar);
    requestAnimationFrame(function(){ requestAnimationFrame(function(){ bar && bar.classList.add('is-in'); }); });
  }
  document.addEventListener('click', function(e){ var a = e.target.closest && e.target.closest('[data-cookie-settings]'); if (!a) return; e.preventDefault(); show(); });
  function start(){ var v = read(); if (v === 'all') loadMetrika(); else if (v !== 'necessary') setTimeout(show, 1200); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
