/* Калькулятор стоимости ВС-Логистики. Отдельный блок, анкету заявки не трогает.
   Цифры только из тарифов клиента (тарифы-клиента-2026-09-30.doc). Ставится в любой <div data-vs-calc></div>. */
(function () {
  var NB = ' ';
  var TYPES = [
    { id: 'car', t: 'Легковой, кроссовер', d: 'сдвижная платформа', base: 3500, km: 80, wheels: true },
    { id: 'suv', t: 'Внедорожник, микроавтобус', d: 'сдвижная платформа', base: 3500, km: 80, wheels: true },
    { id: 'man', t: 'Манипулятор', d: 'двор, участок, сложный доступ', base: 8000, km: 100 },
    { id: 't5', t: 'Грузовой до 5 т', d: 'грузовая эвакуация', base: 12000, km: 200 },
    { id: 't10', t: 'Грузовой 5–10 т', d: 'грузовая эвакуация', base: 15000, km: 200 },
    { id: 't20', t: 'Грузовой от 10 т', d: 'грузовая эвакуация', base: 20000, km: 250 }
  ];
  var WA = 'https://wa.me/79052131033';
  var WHEEL = 350, ROW = 800, PARKING = 12000, DEF_KM = 10;

  /* Километры по адресам через Яндекс Карты. Пока ключей нет, человек вписывает км сам.
     Как только ключи вставлены, появляются поля «Откуда / Куда» и км считаются по дорогам.
     Ключи получает владелец в кабинете разработчика Яндекса (developer.tech.yandex.ru):
     YMAPS_KEY — «JavaScript API и HTTP Геокодер», SUGGEST_KEY — «API Геосаджеста» (подсказки адресов, можно не ставить).
     В настройках ключа указать домен сайта. */
  var YMAPS_KEY = '';
  var SUGGEST_KEY = '';
  var CFG = window.VSC_CONFIG || {};
  if (CFG.ymapsKey) YMAPS_KEY = CFG.ymapsKey;
  if (CFG.suggestKey) SUGGEST_KEY = CFG.suggestKey;
  var BOUNDS = [[58.4, 27.7], [61.4, 35.7]]; // СПб и Ленобласть: адреса ищем сначала здесь

  var ymapsP = null;
  function loadYmaps() {
    if (ymapsP) return ymapsP;
    ymapsP = new Promise(function (ok, fail) {
      if (window.ymaps) return window.ymaps.ready(function () { ok(window.ymaps); });
      var sc = document.createElement('script');
      sc.src = 'https://api-maps.yandex.ru/2.1/?lang=ru_RU&apikey=' + encodeURIComponent(YMAPS_KEY) + (SUGGEST_KEY ? '&suggest_apikey=' + encodeURIComponent(SUGGEST_KEY) : '');
      sc.async = true;
      sc.onload = function () { window.ymaps.ready(function () { ok(window.ymaps); }); };
      sc.onerror = function () { ymapsP = null; fail(new Error('ymaps')); };
      document.head.appendChild(sc);
    });
    return ymapsP;
  }
  function geocode(ym, q) {
    if (Array.isArray(q)) return Promise.resolve(q);
    return ym.geocode(q, { boundedBy: BOUNDS, results: 1 }).then(function (r) {
      var g = r.geoObjects.get(0); if (!g) throw new Error('nf'); return g.geometry.getCoordinates();
    });
  }

  function rub(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, NB) + NB + '₽'; }
  function h(tag, cls, html) { var el = document.createElement(tag); if (cls) el.className = cls; if (html != null) el.innerHTML = html; return el; }

  function mount(root, n) {
    var st = { type: 'car', km: DEF_KM, wheels: 0, row: false, park: false };
    var ROUTE = !!YMAPS_KEY, fromGeo = null, reqId = 0, tmr = null;
    var tel = root.getAttribute('data-tel') || 'tel:+78129110700';
    var phone = root.getAttribute('data-phone') || '8 (812) 911-07-00';
    root.classList.add('vsc');
    var title = root.hasAttribute('data-title') ? root.getAttribute('data-title') : 'Калькулятор стоимости';
    root.innerHTML =
      (title ? '<div class="vsc-hd"><h2>' + title + '</h2><span>по тарифам, сумма сразу</span></div>' : '') +
      '<div class="vsc-body">' +
      '<div class="vsc-col">' +
      '<fieldset class="vsc-f"><legend>Что везём</legend><div class="vsc-types">' +
      TYPES.map(function (x) {
        return '<label class="vsc-type"><input type="radio" name="vsc-t' + n + '" value="' + x.id + '"' + (x.id === st.type ? ' checked' : '') + '><span>' + x.t + '</span></label>';
      }).join('') + '</div><small class="vsc-tar"></small></fieldset>' +
      '<div class="vsc-f vsc-route"><span class="vsc-l">Где машина</span>' +
        '<div class="vsc-addr"><input type="text" class="vsc-from" autocomplete="off" placeholder="Адрес или ориентир" aria-label="Где стоит машина: адрес или место">' +
        '<button type="button" class="vsc-geo">Определить, где я</button></div>' +
        (ROUTE ? '<div class="vsc-addr"><input type="text" class="vsc-to" autocomplete="off" placeholder="Куда везём" aria-label="Куда везём: адрес"></div>' : '') +
        '<small class="vsc-rst" aria-live="polite"></small>' +
        '<a class="vsc-wa" href="#" target="_blank" rel="noopener" hidden>Отправить место диспетчеру в WhatsApp</a></div>' +
      '</div>' +
      '<div class="vsc-col">' +
      '<div class="vsc-f vsc-kmf"><span class="vsc-l" id="vsc-kml' + n + '">Сколько км везти</span>' +
      '<div class="vsc-km"><button type="button" class="vsc-step" data-d="-1" aria-label="Меньше на 1 км">−</button>' +
      '<input type="number" inputmode="numeric" min="0" max="2000" value="' + st.km + '" aria-labelledby="vsc-kml' + n + '">' +
      '<button type="button" class="vsc-step" data-d="1" aria-label="Больше на 1 км">+</button></div></div>' +
      '<div class="vsc-f vsc-wh"><span class="vsc-l">Заблокировано колёс</span>' +
      '<div class="vsc-seg" role="radiogroup">' + [0, 1, 2, 3, 4].map(function (i) {
        return '<button type="button" role="radio" data-w="' + i + '" aria-checked="' + (i === 0) + '">' + i + '</button>';
      }).join('') + '</div></div>' +
      '<div class="vsc-f vsc-opts vsc-plat">' +
      '<label class="vsc-ck"><input type="checkbox" data-o="row"><span>Из ряда<small>от' + NB + rub(ROW) + '</small></span></label>' +
      '<label class="vsc-ck"><input type="checkbox" data-o="park"><span>Из паркинга<small>подача от' + NB + rub(PARKING) + '</small></span></label>' +
      '</div></div>' +
      '<div class="vsc-col vsc-out">' +
      '<details class="vsc-det"><summary>Из чего сумма</summary><div class="vsc-rc"></div></details>' +
      '<div class="vsc-tot"><b>Итого</b><b class="vsc-sum"></b></div>' +
      '<p class="vsc-note">Предварительно, по тарифам. Точную сумму назовём до выезда.</p>' +
      '<div class="vsc-ctas"><a class="vsc-call" href="' + tel + '">Позвонить<span class="vsc-ph">' + NB + phone + '</span></a><button type="button" class="vsc-reset">Сбросить</button></div>' +
      '</div></div>';

    var kmIn = root.querySelector('.vsc-km input');
    var fromIn = root.querySelector('.vsc-from'), toIn = root.querySelector('.vsc-to'), rst = root.querySelector('.vsc-rst');
    function status(t, bad) { if (rst) { rst.textContent = t; rst.classList.toggle('vsc-bad', !!bad); } }
    function route() {
      clearTimeout(tmr);
      var a = fromGeo || fromIn.value.trim(), b = toIn.value.trim();
      if (!a || !b) return;
      var id = ++reqId;
      status('Считаем маршрут…');
      loadYmaps().then(function (ym) {
        return Promise.all([geocode(ym, a), geocode(ym, b)]).then(function (pts) { return ym.route(pts); });
      }).then(function (r) {
        if (id !== reqId) return;
        st.km = Math.max(1, Math.ceil(r.getLength() / 1000)); kmIn.value = st.km;
        status('По дорогам ' + st.km + NB + 'км'); draw();
      }, function () {
        if (id !== reqId) return;
        status('Не нашли адрес. Уточните его или впишите километры ниже', true);
      });
    }
    var wa = root.querySelector('.vsc-wa');
    function updWA() {
      var where = fromGeo ? 'https://yandex.ru/maps/?pt=' + fromGeo[1].toFixed(6) + ',' + fromGeo[0].toFixed(6) + '&z=17&l=map' : fromIn.value.trim();
      if (!where) { wa.hidden = true; return; }
      var t = type(), sum = root.querySelector('.vsc-sum').textContent.replace(/\u00a0/g, ' ');
      var msg = 'Здравствуйте! Нужен эвакуатор. Машина здесь: ' + where + '\nРасчёт на сайте: ' + t.t + ', ' + st.km + ' км, ' + sum;
      wa.href = WA + '?text=' + encodeURIComponent(msg); wa.hidden = false;
    }
    function later() { clearTimeout(tmr); tmr = setTimeout(route, 700); }
    fromIn.addEventListener('input', function () { fromGeo = null; status(''); updWA(); });
    if (ROUTE) {
      var sugg = false;
      var warm = function () {
        loadYmaps().then(function (ym) {
          if (sugg || !SUGGEST_KEY || !ym.SuggestView) return; sugg = true;
          [fromIn, toIn].forEach(function (inp) {
            var sv = new ym.SuggestView(inp, { boundedBy: BOUNDS });
            sv.events.add('select', function () { if (inp === fromIn) fromGeo = null; setTimeout(route, 0); });
          });
        }, function () { status('Карты не загрузились, впишите километры ниже', true); });
      };
      fromIn.addEventListener('focus', warm); toIn.addEventListener('focus', warm);
      fromIn.addEventListener('input', function () { fromGeo = null; later(); });
      toIn.addEventListener('input', later);
      [fromIn, toIn].forEach(function (inp) {
        inp.addEventListener('change', route);
        inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); route(); } });
      });
    }
    function type() { for (var i = 0; i < TYPES.length; i++) if (TYPES[i].id === st.type) return TYPES[i]; return TYPES[0]; }

    function draw() {
      var t = type(), plat = !!t.wheels;
      root.classList.toggle('vsc--plat', plat);
      root.querySelector('.vsc-tar').textContent = 'Тариф: от ' + rub(t.base) + ' + ' + t.km + NB + '₽/км';
      var base = plat && st.park ? PARKING : t.base;
      var rows = [['Подача, погрузка, разгрузка', plat && st.park ? 'из паркинга' : t.d, base],
                  ['Маршрут', st.km + NB + 'км × ' + t.km + NB + '₽', st.km * t.km]];
      if (plat && st.wheels) rows.push(['Подкатные тележки', st.wheels + NB + 'шт. × ' + WHEEL + NB + '₽', st.wheels * WHEEL]);
      if (plat && st.row) rows.push(['Вытащить из ряда', '', ROW]);
      var sum = 0;
      root.querySelector('.vsc-rc').innerHTML = rows.map(function (r) {
        sum += r[2];
        return '<div class="vsc-r"><span><b>' + r[0] + '</b>' + (r[1] ? '<small>' + r[1] + '</small>' : '') + '</span><span class="vsc-v">' + rub(r[2]) + '</span></div>';
      }).join('');
      root.querySelector('.vsc-sum').textContent = 'от' + NB + rub(sum);
      if (wa) updWA();
      root.querySelectorAll('.vsc-seg button').forEach(function (b) { b.setAttribute('aria-checked', String(+b.getAttribute('data-w') === st.wheels)); });
    }

    root.addEventListener('change', function (e) {
      var x = e.target;
      if (x.type === 'radio') st.type = x.value;
      else if (x.getAttribute('data-o')) st[x.getAttribute('data-o')] = x.checked;
      draw();
    });
    kmIn.addEventListener('input', function () {
      var v = parseInt(kmIn.value, 10); st.km = isNaN(v) ? 0 : Math.max(0, Math.min(2000, v)); draw();
    });
    kmIn.addEventListener('blur', function () { kmIn.value = st.km; });
    root.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b || !root.contains(b)) return;
      if (b.hasAttribute('data-d')) { st.km = Math.max(0, Math.min(2000, st.km + +b.getAttribute('data-d'))); kmIn.value = st.km; }
      else if (b.hasAttribute('data-w')) st.wheels = +b.getAttribute('data-w');
      else if (b.classList.contains('vsc-geo')) {
        if (!navigator.geolocation) { status('Телефон не даёт местоположение, впишите адрес', true); return; }
        status('Определяем, где вы…');
        navigator.geolocation.getCurrentPosition(function (p) {
          fromGeo = [p.coords.latitude, p.coords.longitude]; fromIn.value = 'Моё местоположение';
          updWA();
          if (!ROUTE) { status('Место определено. Отправьте его диспетчеру, чтобы он сразу знал, куда ехать'); return; }
          if (toIn.value.trim()) route(); else { status('Теперь впишите, куда везём'); toIn.focus(); }
        }, function () { status('Не получилось определить место, впишите адрес', true); }, { enableHighAccuracy: true, timeout: 10000 });
        return;
      }
      else if (b.classList.contains('vsc-reset')) {
        st = { type: 'car', km: DEF_KM, wheels: 0, row: false, park: false }; kmIn.value = DEF_KM;
        root.querySelectorAll('input[type=checkbox]').forEach(function (c) { c.checked = false; });
        root.querySelector('input[value=car]').checked = true;
        fromIn.value = ''; fromGeo = null; reqId++; status(''); if (ROUTE) toIn.value = '';
      } else return;
      draw();
    });
    var det = root.querySelector('.vsc-det');
    function openDet() { if (root.offsetWidth >= 900) det.open = true; }
    openDet();
    draw();
  }

  function init() { document.querySelectorAll('[data-vs-calc]').forEach(function (el, i) { if (!el.classList.contains('vsc')) mount(el, i); }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
