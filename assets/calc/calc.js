/* Калькулятор стоимости ВС-Логистики. Отдельный блок, анкету заявки не трогает.
   Цифры только из тарифов клиента (тарифы-клиента-2026-09-30.doc). Ставится в любой <div data-vs-calc></div>. */
(function () {
  var NB = ' ';
  var TYPES = [
    { id: 'car', t: 'Легковой или кроссовер', d: 'сдвижная платформа', base: 3500, km: 80, wheels: true },
    { id: 'suv', t: 'Внедорожник или микроавтобус', d: 'сдвижная платформа', base: 3500, km: 80, wheels: true },
    { id: 'man', t: 'Манипулятор', d: 'двор, участок, сложный доступ', base: 8000, km: 100 },
    { id: 't5', t: 'Грузовой до 5 т', d: 'грузовая эвакуация', base: 12000, km: 200 },
    { id: 't10', t: 'Грузовой от 5 до 10 т', d: 'грузовая эвакуация', base: 15000, km: 200 },
    { id: 't20', t: 'Грузовой свыше 10 т', d: 'грузовая эвакуация', base: 20000, km: 250 }
  ];
  var WHEEL = 350, ROW = 800, PARKING = 12000, DEF_KM = 10;

  function rub(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, NB) + NB + '₽'; }
  function h(tag, cls, html) { var el = document.createElement(tag); if (cls) el.className = cls; if (html != null) el.innerHTML = html; return el; }

  function mount(root, n) {
    var st = { type: 'car', km: DEF_KM, wheels: 0, row: false, park: false, ditch: false };
    var tel = root.getAttribute('data-tel') || 'tel:+78129110700';
    var phone = root.getAttribute('data-phone') || '8 (812) 911-07-00';
    root.classList.add('vsc');
    root.innerHTML =
      '<div class="vsc-hd"><b>Калькулятор стоимости</b><span>по тарифам</span></div>' +
      '<fieldset class="vsc-f"><legend>Что везём</legend><div class="vsc-types">' +
      TYPES.map(function (x) {
        return '<label class="vsc-type"><input type="radio" name="vsc-t' + n + '" value="' + x.id + '"' + (x.id === st.type ? ' checked' : '') + '>' +
          '<span><b>' + x.t + '</b><small>от ' + rub(x.base) + ' + ' + x.km + NB + '₽/км</small></span></label>';
      }).join('') + '</div></fieldset>' +
      '<div class="vsc-f"><span class="vsc-l" id="vsc-kml' + n + '">Расстояние, км <small class="vsc-rate"></small></span>' +
      '<div class="vsc-km"><button type="button" class="vsc-step" data-d="-1" aria-label="Меньше на 1 км">−</button>' +
      '<input type="number" inputmode="numeric" min="0" max="2000" value="' + st.km + '" aria-labelledby="vsc-kml' + n + '">' +
      '<button type="button" class="vsc-step" data-d="1" aria-label="Больше на 1 км">+</button></div>' +
      '<small class="vsc-hint">От места, где стоит машина, до места, куда везём</small></div>' +
      '<div class="vsc-f vsc-wh"><span class="vsc-l">Заблокированные колёса <small>' + WHEEL + NB + '₽ за тележку</small></span>' +
      '<div class="vsc-seg" role="radiogroup">' + [0, 1, 2, 3, 4].map(function (i) {
        return '<button type="button" role="radio" data-w="' + i + '" aria-checked="' + (i === 0) + '">' + i + '</button>';
      }).join('') + '</div></div>' +
      '<div class="vsc-f vsc-opts">' +
      '<label class="vsc-ck vsc-plat"><input type="checkbox" data-o="row"><span>Вытащить из ряда <small>+' + NB + rub(ROW) + '</small></span></label>' +
      '<label class="vsc-ck vsc-plat"><input type="checkbox" data-o="park"><span>Подземный или надземный паркинг <small>подача от ' + rub(PARKING) + '</small></span></label>' +
      '<label class="vsc-ck"><input type="checkbox" data-o="ditch"><span>Кювет, яма, канава <small>цену назовём по телефону</small></span></label>' +
      '</div>' +
      '<div class="vsc-rc"></div>' +
      '<div class="vsc-tot"><b>Итого</b><b class="vsc-sum"></b></div>' +
      '<p class="vsc-note">Предварительная стоимость по тарифам. Точную сумму диспетчер назовёт до выезда, и она не изменится, если на месте всё как в описании.</p>' +
      '<div class="vsc-ctas"><a class="vsc-call" href="' + tel + '">Позвонить<span class="vsc-ph">' + NB + phone + '</span></a><button type="button" class="vsc-reset">Сбросить</button></div>';

    var kmIn = root.querySelector('.vsc-km input');
    function type() { for (var i = 0; i < TYPES.length; i++) if (TYPES[i].id === st.type) return TYPES[i]; return TYPES[0]; }

    function draw() {
      var t = type(), plat = !!t.wheels;
      root.classList.toggle('vsc--plat', plat);
      root.querySelector('.vsc-rate').textContent = t.km + NB + '₽/км';
      var base = plat && st.park ? PARKING : t.base;
      var rows = [['Подача, погрузка, разгрузка', plat && st.park ? 'из паркинга' : t.d, base],
                  ['Маршрут', st.km + NB + 'км × ' + t.km + NB + '₽', st.km * t.km]];
      if (plat && st.wheels) rows.push(['Подкатные тележки', st.wheels + NB + 'шт. × ' + WHEEL + NB + '₽', st.wheels * WHEEL]);
      if (plat && st.row) rows.push(['Вытащить из ряда', '', ROW]);
      var sum = 0;
      root.querySelector('.vsc-rc').innerHTML = rows.map(function (r) {
        sum += r[2];
        return '<div class="vsc-r"><span><b>' + r[0] + '</b>' + (r[1] ? '<small>' + r[1] + '</small>' : '') + '</span><span class="vsc-v">' + rub(r[2]) + '</span></div>';
      }).join('') + (st.ditch ? '<div class="vsc-r"><span><b>Кювет, яма</b><small>по сложности, назовём по телефону</small></span><span class="vsc-v">по' + NB + 'звонку</span></div>' : '');
      root.querySelector('.vsc-sum').textContent = 'от' + NB + rub(sum) + (st.ditch ? ' +' + NB + 'кювет' : '');
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
      else if (b.classList.contains('vsc-reset')) {
        st = { type: 'car', km: DEF_KM, wheels: 0, row: false, park: false, ditch: false }; kmIn.value = DEF_KM;
        root.querySelectorAll('input[type=checkbox]').forEach(function (c) { c.checked = false; });
        root.querySelector('input[value=car]').checked = true;
      } else return;
      draw();
    });
    draw();
  }

  function init() { document.querySelectorAll('[data-vs-calc]').forEach(function (el, i) { if (!el.classList.contains('vsc')) mount(el, i); }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
