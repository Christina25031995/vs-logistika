const BUILT_D = ['primorskiy','moskovskiy','krasnoselskiy','vyborgskiy','nevskiy','kalininskiy','vasileostrovskiy','petrogradskiy','centralnyy','admiralteyskiy','kirovskiy','frunzenskiy','krasnogvardeyskiy']; // районы, у которых есть своя страница
/* ВС-Логистика — логика главной страницы.
   Состояние и расчёт вызова — класс Component (ниже), без фреймворков.
   Разметка связана через data-атрибуты:
     data-action="путь"     — клик вызывает функцию из renderVals()
     data-on-input="путь"   — ввод в поле
     data-bind="путь"       — текст элемента
     data-bind-attr='{…}'   — атрибуты (value, disabled…)
     data-bind-style='{…}'  — динамические стили
     data-if="путь"         — показать / скрыть блок */
(function () {
'use strict';
const VW = () => (document.documentElement && document.documentElement.clientWidth) || window.innerWidth || 1440;
class DCLogic {
  constructor() { this.props = {}; this.state = {}; }
  setState(p) { const patch = typeof p === 'function' ? p(this.state) : p; this.state = Object.assign({}, this.state, patch); schedule(); }
  forceUpdate() { schedule(); }
}

const SIT = [
  { id: 'start', t: 'Не заводится', sub: 'Аккумулятор, стартер, электрика', tech: 'Платформа' },
  { id: 'dtp', t: 'ДТП', sub: 'Заберём, даже если не катится', tech: 'Платформа или тележки' },
  { id: 'blocked', t: 'Колёса заблокированы', sub: 'Колёса, руль или КПП', tech: 'Подкатные тележки' },
  { id: 'ditch', t: 'Машина в кювете', sub: 'Съехала с дороги, снег, грязь', tech: 'Манипулятор' },
  { id: 'flip', t: 'Перевёрнута или сильно повреждена', sub: 'На боку, на крыше, без колеса', tech: 'Манипулятор' },
  { id: 'low', t: 'Низкий клиренс', sub: 'Обвес, заниженная подвеска', tech: 'Платформа, пологий заезд' },
  { id: 'move', t: 'Нужна перевозка', sub: 'Исправное авто к удобному времени', tech: 'Платформа' },
  { id: 'other', t: 'Другое', sub: 'Опишите, и диспетчер подскажет', tech: 'Подберём' }
];
const VEH = [
  { id: 'car', t: 'Легковой' }, { id: 'suv', t: 'Кроссовер / SUV' }, { id: 'van', t: 'Микроавтобус' },
  { id: 'truck', t: 'Грузовой' }, { id: 'moto', t: 'Мотоцикл' }
];
const TO = [
  { id: 'sto', t: 'На СТО или в сервис', sub: 'Назовите сервис, найдём адрес' },
  { id: 'home', t: 'Домой или на стоянку', sub: '' },
  { id: 'unknown', t: 'Пока не знаю', sub: 'Решим вместе с диспетчером' }
];
const DISTRICTS = [
  ['Приморский', 'primorskiy', '20–30'], ['Красносельский', 'krasnoselskiy', '25–35'], ['Московский', 'moskovskiy', '20–30'],
  ['Выборгский', 'vyborgskiy', '20–35'], ['Невский', 'nevskiy', '20–30'], ['Калининский', 'kalininskiy', '20–30'],
  ['Василеостровский', 'vasileostrovskiy', '20–30'], ['Петроградский', 'petrogradskiy', '20–30'], ['Центральный', 'centralnyy', '25–40'],
  ['Адмиралтейский', 'admiralteyskiy', '25–35'], ['Кировский', 'kirovskiy', '20–30'], ['Фрунзенский', 'frunzenskiy', '20–30']
];
const KEY = 'vsl-calc-v3';
const GEO_M = ['Приморский', 'Московский', 'Невский', 'Выборгский', 'Калининский', 'Красносельский', 'Василеостровский', 'Петроградский'];
const CASES = [
  { id: 'case-1', district: 'Ленобласть · Кудрово', car: 'Hyundai Solaris', what: 'Съехал в кювет в снегопад, колёса ушли в снег', a: 'Трасса за КАД, кювет', b: 'СТО, Кудрово', km: '3 км', tech: 'Манипулятор', eta: '35 мин', cost: 'демо ₽' },
  { id: 'case-2', district: 'Ночной вызов', car: 'Автомобиль после пожара', what: 'Кузов после возгорания, своим ходом не катится', a: 'Парковка у ТЦ', b: 'Стоянка', km: '9 км', tech: 'Манипулятор + прицеп', eta: '34 мин', cost: 'демо ₽' },
  { id: 'case-3', district: 'Двор жилого комплекса', car: 'BMW X1', what: 'Погрузка стрелой у дома, без заезда на платформу', a: 'Двор ЖК', b: 'СТО', km: '6 км', tech: 'Манипулятор', eta: '28 мин', cost: 'демо ₽' }
];
const MINI = (() => {
  const z = 14, n = Math.pow(2, z);
  const tx = lon => (lon + 180) / 360 * n;
  const ty = lat => { const r = lat * Math.PI / 180; return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * n; };
  const A = [59.9035, 30.5530], B = [59.9060, 30.5180];
  const ax = tx(A[1]), ay = ty(A[0]), bx = tx(B[1]), by = ty(B[0]);
  const mx = (ax + bx) / 2, my = (ay + by) / 2, ox = Math.floor(mx) - 2, oy = Math.floor(my) - 2;
  const P = (x, y) => [Math.round((x - ox) * 256), Math.round((y - oy) * 256)];
  const [pax, pay] = P(ax, ay), [pbx, pby] = P(bx, by), [pmx, pmy] = P(mx, my);
  const cx = pmx - (pby - pay) * 0.25, cy = pmy + (pbx - pax) * 0.25;
  const tiles = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) tiles.push({ bg: 'url(https://tile.openstreetmap.org/' + z + '/' + (ox + c) + '/' + (oy + r) + '.png)' });
  return { tiles, left: 'calc(50% - ' + pmx + 'px)', top: 'calc(50% - ' + pmy + 'px)', path: 'M' + pax + ' ' + pay + ' Q' + Math.round(cx) + ' ' + Math.round(cy) + ' ' + pbx + ' ' + pby, ax: pax, ay: pay, bx0: pbx - 7, by0: pby - 7 };
})();
const sel = on => ({ bd: on ? '#2350E6' : '#E3E6EB', bg: on ? '#EAF0FF' : '#fff' });

class Component extends DCLogic {
  state = { w: typeof window !== 'undefined' ? VW() : 1440, step: 1, from: '', to: '', toKind: '', sit: '', sitPre: false, cx: false, veh: '', q1: '', q2: '', menuOpen: false, flowOpen: false, fResume: false, fForm: false, fstep: 1, q3: '', phone: '', comment: '', showComment: false, sent: false, phoneErr: false, locating: false, locErr: false };

  componentDidMount() {
    try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s) this.setState(s); } catch (e) {}
    try { const f = JSON.parse(sessionStorage.getItem('vsl-flow') || 'null'); if (f) this.setState(f); } catch (e) {}
    const demo = new URLSearchParams(location.search).get('demo');
    if (demo) {
      this.demo = true;
      const base = { from: '', to: '', toKind: '', sit: '', sitPre: false, veh: '', q1: '', q2: '', q3: '', sent: false, phone: '', menuOpen: false, step: 1, flowOpen: false, fResume: false, fForm: false, fstep: 1 };
      const FROM = 'Приморский р-н, Комендантский пр., 30';
      const S = { menu: { menuOpen: true }, calc4: { step: 4, from: 'КАД, съезд на Выборгское ш.', toKind: 'sto', to: 'СТО, Парголово', sit: 'dtp', sitPre: true, veh: 'car', q1: 'Нет' },
        f1: { flowOpen: true, fstep: 1 },
        f2: { flowOpen: true, fstep: 2, from: FROM },
        f3: { flowOpen: true, fstep: 3, from: FROM, toKind: 'sto', to: 'СТО на ул. Савушкина' },
        f4: { flowOpen: true, fstep: 4, from: FROM, toKind: 'sto', to: 'СТО на ул. Савушкина', sit: 'dtp', veh: 'car', q1: 'Нет' },
        f5: { flowOpen: true, fstep: 5, from: FROM, toKind: 'sto', to: 'СТО на ул. Савушкина', sit: 'blocked', veh: 'car', q1: 'Нет', q2: 'Да' },
        f5form: { flowOpen: true, fstep: 5, fForm: true, from: FROM, toKind: 'sto', to: 'СТО на ул. Савушкина', sit: 'blocked', veh: 'car', q1: 'Нет', q2: 'Да' },
        f6: { flowOpen: true, fstep: 6, sent: true, phone: '+7 911 000-00-00', from: FROM, toKind: 'sto', to: 'СТО на ул. Савушкина', sit: 'blocked', veh: 'car' },
        resume: { flowOpen: true, fResume: true, fstep: 3, from: FROM, toKind: 'sto', to: 'СТО на ул. Савушкина' },
        dtp: { flowOpen: true, fstep: 1, sit: 'dtp', sitPre: true },
        full: { step: 5, from: 'Приморский пр., 72', toKind: 'sto', to: 'СТО, ул. Савушкина', sit: 'blocked', sitPre: true, veh: 'car', q1: 'Нет' },
        result: { step: 5, from: 'Приморский пр., 72', toKind: 'sto', to: 'СТО, ул. Савушкина', sit: 'blocked', sitPre: true, veh: 'car', q1: 'Нет' } }[demo] || {};
      this.setState({ ...base, ...S });
      const target = { mid: 'price', map: 'live-map', sit: 'sit', calc1: 'calc', calc4: 'calc', result: 'calc' }[demo];
      const go = () => { const el = document.getElementById(target); if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 64, behavior: 'instant' }); };
      if (target) { setTimeout(go, 900); setTimeout(go, 2200); window.addEventListener('load', () => setTimeout(go, 300)); }
    }
    this.onResize = () => this.setState({ w: VW() });
    this.setState({ w: VW() });
    requestAnimationFrame(() => this.setState({ w: VW() }));
    window.addEventListener('load', this.onResize);
    if (window.ResizeObserver) { this.ro = new ResizeObserver(() => { if (VW() !== this.state.w) this.setState({ w: VW() }); }); this.ro.observe(document.documentElement); }
    window.addEventListener('resize', this.onResize);
    this.onMsg = e => { const m = e.data || {}; if (m.type !== 'vsl-map' || m.action !== 'call') return; if (this.state.w < 820) return this.openFlow({ from: m.district ? m.district + ' район' : this.state.from, fstep: 2 }); this.setState({ from: m.district ? m.district + ' район, ' : this.state.from, step: 1 }); this.scrollTo('calc'); };
    window.addEventListener('message', this.onMsg);
  }
  componentWillUnmount() { window.removeEventListener('resize', this.onResize); window.removeEventListener('message', this.onMsg); window.removeEventListener('load', this.onResize); if (this.ro) this.ro.disconnect(); }
  componentDidUpdate() {
    try { document.documentElement.style.overflow = (this.state.flowOpen && this.state.w < 820) ? 'hidden' : ''; } catch (e) {}
    if (this.demo) return;
    try { const s = this.state; sessionStorage.setItem('vsl-flow', JSON.stringify({ cx: s.cx, fstep: s.fstep, from: s.from, to: s.to, toKind: s.toKind, sit: s.sit, sitPre: s.sitPre, veh: s.veh, q1: s.q1, q2: s.q2, q3: s.q3, phone: s.phone, comment: s.comment })); } catch (e) {}
    const { step, from, to, toKind, sit, sitPre, veh, q1, q2, phone, comment } = this.state;
    try { localStorage.setItem(KEY, JSON.stringify({ step, from, to, toKind, sit, sitPre, veh, q1, q2, phone, comment })); } catch (e) {}
  }
  scrollTo(id) {
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - (this.state.w < 820 ? 64 : 84), behavior: 'smooth' });
  }
  openFlow = (patch) => {
    const st = this.state;
    if (!patch && st.fstep > 1 && st.fstep < 6) return this.setState({ flowOpen: true, fResume: true, menuOpen: false });
    const next = Object.assign({ flowOpen: true, fResume: false, fForm: false, sent: false, menuOpen: false }, patch || {});
    const from = (next.from !== undefined ? next.from : st.from).trim();
    if (next.fstep === undefined) next.fstep = from ? 2 : 1;
    this.setState(next);
  };
  resetFlow = { cx: false, fstep: 1, to: '', toKind: '', sit: '', sitPre: false, veh: '', q1: '', q2: '', q3: '', sent: false, fForm: false, fResume: false, showComment: false, comment: '' };
  locate = () => {
    if (!navigator.geolocation) return this.setState({ locErr: true });
    this.setState({ locating: true, locErr: false });
    navigator.geolocation.getCurrentPosition(
      p => { this.setState({ locating: false, from: 'Моё местоположение · ' + p.coords.latitude.toFixed(4) + ', ' + p.coords.longitude.toFixed(4) }); document.querySelectorAll('iframe[data-map]').forEach(f => { try { f.contentWindow.postMessage({ type: 'vsl-locate', lat: p.coords.latitude, lon: p.coords.longitude }, '*'); } catch (e) {} }); },
      () => this.setState({ locating: false, locErr: true }),
      { timeout: 8000, maximumAge: 60000 }
    );
  };
  eta() {
    const f = this.state.from.toLowerCase();
    if (this.state.sit === 'move') return 'к согласованному времени';
    if (/кад|зсд|трасс|м-1|ленобласт|гатчин|всеволож|мурино|кудрово|колпин|пушкин/.test(f)) return '≈30–40 мин';
    return '≈20–40 мин';
  }
  result() {
    const { sit, veh, q1, q2 } = this.state;
    const s = SIT.find(x => x.id === sit) || SIT[7];
    const v = VEH.find(x => x.id === veh);
    let tech = 'Сдвижная платформа', why = 'Автомобиль заезжает или затягивается лебёдкой на платформу. Подходит для большинства легковых машин.';
    if (veh === 'truck') { tech = 'Грузовой эвакуатор'; why = 'Для грузового транспорта нужен эвакуатор большей грузоподъёмности, диспетчер уточнит массу и габариты.'; }
    else if (sit === 'ditch' || sit === 'flip' || (this.state.cx && sit === 'other')) { tech = 'Манипулятор'; why = 'Стрела поднимает автомобиль и ставит на платформу без протаскивания, так не добавится новых повреждений.'; }
    else if (sit === 'blocked' || q1 === 'Нет' || q2 === 'Да' || this.state.q3 === 'Да') { tech = 'Платформа + подкатные тележки'; why = 'Тележки ставятся под заблокированные колёса, и машину можно закатить на платформу без волочения.'; }
    else if (sit === 'low') { tech = 'Платформа с пологим заездом'; why = 'Низкий угол погрузки и мягкие крепления за колёса, без касания бампера и обвеса.'; }
    else if (veh === 'moto') { tech = 'Платформа с креплением для мото'; why = 'Мотоцикл фиксируется в стойке и ремнями за раму.'; }
    else if (sit === 'other') { tech = 'Подберём по описанию'; why = 'Позвоните или оставьте номер, и диспетчер задаст пару вопросов и назовёт подходящую технику.'; }
    const eta = (sit === 'ditch' || sit === 'flip') ? '≈30–40 мин' : this.eta();
    const f = this.state.from.toLowerCase();
    const dm = DISTRICTS.find(([n]) => f.includes(n.slice(0, 5).toLowerCase()));
    return { tech, why, eta, district: dm ? dm[0] : 'уточнит диспетчер', summary: s.t + (v ? ' · ' + v.t : '') };
  }
  flowVals(st, mobile, set) {
    const fs = st.fstep, res = st.fResume;
    const sitL = { start: 'Не заводится', dtp: 'ДТП', blocked: 'Колёса заблокированы', ditch: 'Машина в кювете', flip: 'Перевёрнута / разбита', low: 'Низкий клиренс', move: 'Нужна перевозка', other: 'Другое' };
    const short = s => { s = s.replace(/[,\s]+$/, ''); return s.length > 30 ? s.slice(0, 29) + '…' : s; };
    const known = [];
    if (!res && fs <= 4) { if (st.cx && !st.sit) known.push('Сложная эвакуация'); if (st.sit && fs !== 3) known.push('Ситуация: ' + sitL[st.sit]); if (fs >= 2 && st.from.trim()) known.push('Откуда: ' + short(st.from.trim())); }
    const needQ1 = ['dtp', 'blocked', 'flip', 'other'].includes(st.sit), needQ2 = ['dtp', 'blocked'].includes(st.sit), needQ3 = st.sit === 'dtp';
    const q = (key, text) => ({ q: text, opts: ['Да', 'Нет', 'Не знаю'].map(t => ({ t, ...sel(st[key] === t), pick: set({ [key]: t }) })) });
    const mark = on => ({ dot: on ? '#2350E6' : '#fff', mark: on ? '✓' : '' });
    const VM = [['car', 'Легковой'], ['suv', 'Кроссовер / внедорожник'], ['van', 'Коммерческий'], ['truck', 'Грузовой'], ['moto', 'Другой']];
    const TM = [['sto', 'На СТО', 'Назовите сервис, найдём адрес'], ['addr', 'Другой адрес', 'Дом, стоянка, парковка'], ['unknown', 'Пока не знаю', 'Решим вместе с диспетчером']];
    const after2 = st.sit && st.sitPre ? 4 : 3;
    const dis = (fs === 1 && !st.from.trim()) || (fs === 2 && !st.toKind) || (fs === 3 && !st.sit) || (fs === 4 && !st.veh);
    const f = st.from.toLowerCase(); const dm = DISTRICTS.find(([n]) => f.includes(n.slice(0, 5).toLowerCase()));
    const toTxt = st.toKind === 'unknown' ? 'решим с диспетчером' : (st.to.trim() || (st.toKind === 'sto' ? 'СТО' : 'адрес уточним'));
    return {
      flowOn: mobile && st.flowOpen, fResumeOn: res,
      fs1: !res && fs === 1, fs2: !res && fs === 2, fs3: !res && fs === 3, fs4: !res && fs === 4, fs5: !res && fs === 5, fs6: !res && fs === 6,
      fShowProgress: !res && fs <= 5, fStepLabel: fs <= 4 ? 'Шаг ' + fs + ' из 4' : 'Расчёт готов',
      fProgress: [1, 2, 3, 4].map(i => ({ c: i <= fs ? '#2350E6' : '#E3E6EB' })),
      fKnown: known, fHasKnown: known.length > 0,
      fBarNext: !res && fs <= 4, fBarResult: !res && fs === 5 && !st.fForm, fBarForm: !res && fs === 5 && st.fForm, fBarDone: !res && fs === 6, fBarResume: res,
      fBackLabel: (res || fs === 1 || fs === 6) ? 'На сайт' : 'Назад', fEtaShort: String(this.result().eta).replace('≈', ''),
      fNextLabel: fs === 4 ? 'Рассчитать вызов' : 'Продолжить', fNextDisabled: dis, fNextBg: dis ? '#A9B9F2' : '#2350E6',
      fNext: () => { if (dis) return; this.setState({ fstep: fs === 1 ? 2 : fs === 2 ? after2 : fs === 3 ? 4 : 5 }); },
      fBack: () => { if (res || fs === 1) return this.setState({ flowOpen: false, fResume: false }); if (fs === 6) return this.setState(Object.assign({}, this.resetFlow, { flowOpen: false })); if (fs === 5 && st.fForm) return this.setState({ fForm: false }); this.setState({ fstep: fs === 4 && st.sit && st.sitPre ? 2 : fs - 1 }); },
      fClose: () => this.setState({ flowOpen: false, fResume: false }),
      fContinue: set({ fResume: false }),
      fRestart: () => this.setState(Object.assign({}, this.resetFlow, { fstep: st.from.trim() ? 2 : 1 })),
      fDone: () => this.setState(Object.assign({}, this.resetFlow, { flowOpen: false })),
      fOpenForm: () => { this.setState({ fForm: true }); setTimeout(() => { const el = document.getElementById('flow-phone'); if (el) el.focus(); }, 60); }, fForm: st.fForm, fNoForm: !st.fForm,
      fSummary: [st.sit ? sitL[st.sit] : '', st.from.trim() ? short(st.from.trim()) : ''].filter(Boolean).join(', ') || 'адрес и детали',
      fChips: ['КАД', 'ЗСД', 'Ленобласть'].map(t => ({ t, pick: set({ from: t + ', ' }) })),
      fDistrictLine: dm ? 'Вы указали: ' + dm[0] + ' район' : 'Адрес принят',
      fToOpts: TM.map(([id, t, sub]) => ({ t, sub, ...sel(st.toKind === id), ...mark(st.toKind === id), pick: () => this.setState(id === 'unknown' ? { toKind: id, to: '', fstep: after2 } : { toKind: id, to: st.toKind === id ? st.to : '' }) })),
      fNeedTo: st.toKind === 'sto' || st.toKind === 'addr', fToPh: st.toKind === 'sto' ? 'Название или адрес СТО' : 'Куда отвезти: улица, дом',
      fSitOpts: (st.cx ? ['ditch', 'flip', 'dtp', 'blocked', 'low', 'start', 'move', 'other'] : Object.keys(sitL)).map(id => ({ t: sitL[id], ...sel(st.sit === id), pick: set({ sit: id, sitPre: false, q1: '', q2: '', q3: '', fstep: 4 }) })),
      fVehOpts: VM.map(([id, t]) => ({ t, ...sel(st.veh === id), ...mark(st.veh === id), pick: set({ veh: id }) })),
      fQs: [needQ1 && q('q1', 'Колёса вращаются?'), needQ2 && q('q2', 'Руль заблокирован?'), needQ3 && q('q3', 'Есть сильные повреждения?')].filter(Boolean),
      fRoute: short(st.from.trim() || 'адрес уточним') + ' → ' + toTxt
    };
  }
  renderVals() {
    const st = this.state;
    const mobile = st.w < 820;
    const go = id => () => this.scrollTo(id);
    const set = patch => () => this.setState(patch);
    const needQ1 = ['dtp', 'blocked', 'flip', 'other'].includes(st.sit);
    const needQ2 = ['dtp', 'blocked'].includes(st.sit);
    const opt3 = (key) => ['Да', 'Нет', 'Не знаю'].map(t => ({ t, ...sel(st[key] === t), pick: () => { const patch = { [key]: t }; const n = { ...st, ...patch }; if (mobile && n.veh && (!needQ1 || n.q1) && (!needQ2 || n.q2)) patch.step = 5; this.setState(patch); } }));
    return {
      mobile, desktop: !mobile, wideNav: st.w >= 1220, padBottom: mobile ? 'calc(84px + env(safe-area-inset-bottom))' : '0px',
      optH: mobile ? '68px' : '58px', qH: mobile ? '56px' : '50px', priceMin: mobile ? '150px' : '210px', gridGap: mobile ? '14px' : '28px', cxOrder: mobile ? '-1' : '0', cxRow: mobile ? 'minmax(0,1fr)' : 'minmax(0,0.9fr) minmax(0,1.3fr)',
      restDisplay: mobile ? 'flex' : 'grid', restOverflow: mobile ? 'auto' : 'visible', restBleed: mobile ? '-16px' : '0px', restPad: mobile ? '16px' : '0px', restCard: mobile ? '86%' : 'auto',
      trustMin: mobile ? '140px' : '220px', fleetAR: mobile ? '16/10' : '4/3', geoMin: mobile ? '100%' : '230px', footMin: mobile ? '140px' : '200px', footSpan: mobile ? '1 / -1' : 'auto',
      heroCols: st.w < 1120 ? 'minmax(0,1fr)' : 'minmax(0,45fr) minmax(0,55fr)',
      heroMinH: st.w < 1120 ? '0px' : 'clamp(720px,calc(100vh - 72px),900px)',
      heroGridPadL: st.w < 1120 ? '0px' : 'max(clamp(16px,3.4vw,56px), calc((100% - 1680px) / 2 + 56px))',
      heroColPadL: st.w < 1120 ? 'clamp(16px,3.4vw,56px)' : '0px',
      heroMapH: st.w < 1120 ? '520px' : '720px',
      headerH: mobile ? '56px' : '72px', headerGap: mobile ? '10px' : '28px', subDisplay: mobile ? 'none' : 'block', subFlex: mobile ? 'none' : 'flex', sitGridDisplay: mobile ? 'none' : 'grid',
      menuOpen: st.menuOpen, menuClosed: !st.menuOpen, menuOpenM: mobile && st.menuOpen, toggleMenu: () => this.setState({ menuOpen: !st.menuOpen }),
      sitTop: SIT.slice(0, 4).map(s => ({ t: s.t, pick: () => { if (mobile) return this.openFlow({ sit: s.id, sitPre: true, q1: '', q2: '', q3: '' }); this.setState({ sit: s.id, sitPre: true, q1: '', q2: '', step: st.from.trim() ? 2 : 1, sent: false }); this.scrollTo('calc'); } })),
      sitRest: SIT.slice(4).map(s => ({ t: s.id === 'flip' ? 'Перевёрнута / повреждена' : s.t, pick: () => { if (mobile) return this.openFlow({ sit: s.id, sitPre: true, q1: '', q2: '', q3: '' }); this.setState({ sit: s.id, sitPre: true, q1: '', q2: '', step: st.from.trim() ? 2 : 1, sent: false }); this.scrollTo('calc'); } })),
      stickyLabel: 'Рассчитать',
      calcDisplay: mobile ? 'none' : 'block',
      ...this.flowVals(st, mobile, set),
      stickyAction: () => this.openFlow(), stickyOn: mobile && !st.flowOpen,
      goComplex: () => { if (mobile) return this.openFlow({ cx: true, sit: '', sitPre: false, q1: '', q2: '', q3: '', fstep: st.from.trim() ? 2 : 1 }); this.scrollTo('call'); },
      districtsV: (mobile ? GEO_M.map(n => DISTRICTS.find(d => d[0] === n)) : DISTRICTS).map(([name, slug, eta]) => ({ name, url: (BUILT_D.includes(slug) ? 'evakuator-' + slug + '-rayon/' : 'rayony/'), eta: eta + ' мин' })),
      stickyActionOld: () => {
        if (st.step === 5) { this.scrollTo('calc'); setTimeout(() => { const el = document.getElementById('calc-phone'); if (el) el.focus(); }, 450); return; }
        if (st.step > 1) { this.scrollTo('calc'); return; }
        this.setState({ step: st.from.trim() ? 2 : 1, sent: false }); this.scrollTo('calc');
      },
      sitMin: mobile ? '150px' : 'min(100%,280px)', sitH: mobile ? '118px' : '176px',
      from: st.from, to: st.to, phone: st.phone,
      onFrom: e => this.setState({ from: e.target.value }),
      onTo: e => this.setState({ to: e.target.value, toKind: '' }),
      onPhone: e => this.setState({ phone: e.target.value }),
      onLocate: this.locate,
      locateLabel: st.locating ? 'Определяем…' : st.locErr ? 'Не получилось, введите адрес' : 'Определить, где я',
      heroCall: () => { if (mobile) return this.openFlow(); this.setState({ step: st.from.trim() ? 2 : 1, sent: false }); this.scrollTo('calc'); },
      comment: st.comment, onComment: e => this.setState({ comment: e.target.value }),
      showComment: st.showComment, noComment: !st.showComment, toggleComment: set({ showComment: true }),
      phoneErr: st.phoneErr, phoneBd: st.phoneErr ? '#C8342B' : '#CDD3DC',
      showSitChip: !!st.sit && st.sitPre && st.step >= 1 && st.step <= 4, sitLabel: (SIT.find(x => x.id === st.sit) || {}).t || '',
      changeSit: set({ step: 3, sitPre: false }),
      receipt: [
        { t: 'Подача, погрузка, разгрузка', d: 'сдвижная платформа', v: '3 500 ₽' },
        { t: 'Маршрут', d: '14 км × 80 ₽', v: '1 120 ₽' },
        { t: 'Подкатные тележки', d: '2 шт. × 350 ₽, заблокирована АКПП', v: '700 ₽' }
      ],

      goCalc: () => { if (mobile) return this.openFlow(); this.scrollTo('calc'); }, goCall: go('call'),
      districts: DISTRICTS.map(([name, slug, eta]) => ({ name, url: (BUILT_D.includes(slug) ? 'evakuator-' + slug + '-rayon/' : 'rayony/'), eta: eta + ' мин' })),
      situations: SIT.map(s => ({ ...s, pick: () => { if (mobile) return this.openFlow({ sit: s.id, sitPre: true, q1: '', q2: '', q3: '' }); this.setState({ sit: s.id, sitPre: true, q1: '', q2: '', step: st.from.trim() ? 2 : 1, sent: false }); this.scrollTo('calc'); } })),
      s1: st.step === 1, s2: st.step === 2, s3: st.step === 3, s4: st.step === 4, s5: st.step === 5,
      canBack: st.step > 1, back: () => this.setState({ step: st.step === 4 && st.sit && st.sitPre ? 2 : Math.max(1, st.step - 1), sent: false }),
      stepLabel: st.step < 5 ? 'Шаг ' + st.step + ' из 4' : 'Результат',
      progress: [1, 2, 3, 4].map(i => ({ c: i <= st.step ? '#2350E6' : '#E3E6EB' })),
      next: () => this.setState({ step: Math.min(5, st.step + (st.step === 2 && st.sit ? 2 : 1)) }),
      hasFrom: !!st.from.trim(), noFrom: !st.from.trim(), nextBg: st.from.trim() ? '#2350E6' : '#A9B9F2',
      eta: this.eta(),
      fromChips: ['На КАД', 'На ЗСД', 'Ленобласть', 'Трасса М-10 / М-11'].map(t => ({ t, pick: set({ from: t + ', ' }) })),
      toOpts: TO.map(o => ({ ...o, ...sel(st.toKind === o.id), pick: set(Object.assign({ toKind: o.id, to: o.id === 'sto' ? st.to : o.t }, mobile ? { step: st.sit ? 4 : 3 } : {})) })),
      sitOpts: SIT.map(o => ({ t: o.t, ...sel(st.sit === o.id), pick: set({ sit: o.id, sitPre: false, step: 4, q1: '', q2: '' }) })),
      vehOpts: VEH.map(o => ({ t: o.t, ...sel(st.veh === o.id), pick: set(Object.assign({ veh: o.id }, mobile && !needQ1 && !needQ2 ? { step: 5 } : {})) })),
      showQ1: needQ1, showQ2: needQ2, q1: opt3('q1'), q2: opt3('q2'),
      noVeh: !st.veh, vehBg: st.veh ? '#2350E6' : '#A9B9F2',
      result: this.result(),
      fromShow: st.from || 'уточнит диспетчер', toShow: st.to || 'решим с диспетчером',
      sent: st.sent, notSent: !st.sent,
      send: () => { const n = st.phone.replace(/\D/g, '').length; if (!(n >= 10 && n <= 11)) return this.setState({ phoneErr: true }); if (!st.agree) return this.setState({ agreeErr: true, phoneErr: false }); this.setState({ sent: true, phoneErr: false, agreeErr: false, fstep: st.flowOpen ? 6 : st.fstep }); if (window.vslGoal) window.vslGoal('lead'); },
      agree: !!st.agree, agreeErr: !!st.agreeErr, onAgree: e => this.setState({ agree: e.target.checked, agreeErr: false }),
      restart: set({ step: 1, sit: '', sitPre: false, veh: '', q1: '', q2: '', to: '', toKind: '', sent: false, comment: '', showComment: false }),
      factors: [
        { n: '01', t: 'Подача', d: 'Выезд экипажа к автомобилю. За КАД по километражу.' },
        { n: '02', t: 'Маршрут', d: 'Расстояние от места погрузки до точки выгрузки.' },
        { n: '03', t: 'Тип автомобиля', d: 'Легковой, кроссовер, микроавтобус, грузовой: разная масса и платформа.' },
        { n: '04', t: 'Состояние', d: 'На ходу, после ДТП, с заблокированными колёсами или рулём.' },
        { n: '05', t: 'Сложность погрузки', d: 'Кювет, паркинг, низкий клиренс, работа манипулятора.' }
      ],
      prices: [
        { t: 'Сдвижная платформа', d: 'подача, погрузка, разгрузка + км', v: 'от 3\u00a0500\u00a0₽ + 80\u00a0₽/\u2060км' },
        { t: 'Манипулятор', d: 'кювет, двор, сложный доступ', v: 'от 8\u00a0000\u00a0₽ + 100\u00a0₽/\u2060км' },
        { t: 'Подкатные тележки', d: 'заблокированные колёса', v: 'от 350 ₽ за тележку' },
        { t: 'Паркинг', d: 'подземный или надземный', v: 'от 12 000 ₽' },
        { t: 'Грузовая эвакуация', d: 'до 5 т, тяжелее по тарифу', v: 'от 12\u00a0000\u00a0₽ + 200\u00a0₽/\u2060км' },
        { t: 'Кювет, яма', d: 'нестандартные случаи', v: 'по сложности' }
      ],

      complex: [
        { p: 'Машина в кювете', s: 'Манипулятор поднимает стрелой, без протаскивания по грунту', link: 'Манипулятор →', url: 'manipulyator/' },
        { p: 'Перевёрнута или на боку', s: 'Ставим на колёса стрелой и грузим на платформу', link: 'Сложная эвакуация →', url: 'slozhnaya-evakuaciya/' },
        { p: 'После ДТП', s: 'Заберём с места, подскажем порядок действий и дадим документы для страховой', link: 'После ДТП →', url: 'posle-dtp/' },
        { p: 'Нет колеса или сломана подвеска', s: 'Подкатные тележки или манипулятор по состоянию', link: 'Подкатные тележки →', url: 'evakuator-s-podkatnymi-telezhkami/' },
        { p: 'Заблокированы колёса, руль, КПП', s: 'Ставим тележки под колёса, закатываем без волочения', link: 'Подкатные тележки →', url: 'evakuator-s-podkatnymi-telezhkami/' },
        { p: 'Сложный доступ', s: 'Двор, узкий проезд, подземный паркинг: подберём технику по габаритам', link: 'Описать ситуацию →', url: '#call' }
      ].concat(mobile ? [{ p: 'Нужен манипулятор', s: 'Погрузка стрелой без заезда на платформу и без волочения', url: 'manipulyator/' }] : []),
      caseMain: CASES[0], caseRest: CASES.slice(1), mini: MINI,
      process: ['Звонок', 'Расчёт', 'Подтверждение', 'Выезд', 'Погрузка', 'Доставка', 'Оплата'],
      fleet: [
        { id: 'fleet-1', task: 'Стандартный легковой автомобиль', tech: 'Сдвижная платформа', ph: 'Фото: сдвижная платформа', url: 'ceny/' },
        { id: 'fleet-2', task: 'Заблокированы колёса, руль, КПП', tech: 'Подкатные тележки', ph: 'Фото: тележки под колёсами', url: 'evakuator-s-podkatnymi-telezhkami/' },
        { id: 'fleet-3', task: 'Кювет, перевёртыш, сложный доступ', tech: 'Манипулятор', ph: 'Фото: манипулятор в работе', url: 'manipulyator/' },
        { id: 'fleet-4', task: 'Грузовой транспорт, спецтехника', tech: 'Грузовой эвакуатор', ph: 'Фото: грузовой эвакуатор', url: 'gruzovoy-evakuator/' }
      ],
      lo: ['Гатчина', 'Всеволожск', 'Пушкин', 'Колпино', 'Мурино', 'Кудрово'].map((name, i) => ({ name, url: ['lenoblast/gatchina/', 'lenoblast/vsevolozhsk/', 'evakuator-pushkin/', 'evakuator-kolpino/', 'lenoblast/murino/', 'lenoblast/kudrovo/'][i] })),
      faq: [
        { q: 'Сколько стоит эвакуатор?', a: 'Зависит от подачи, маршрута, типа автомобиля, его состояния и сложности погрузки. Диспетчер назовёт стоимость до выезда. Если условия на месте соответствуют заявленным, сумма не меняется.' },
        { q: 'Через сколько приедете?', a: 'Ориентир подачи по Петербургу 20–40 минут: в лучшем случае около 20, обычно около 30, в час пик до 40. Точное время диспетчер назовёт по адресу.' },
        { q: 'Работаете ночью?', a: 'Да. Ночью ориентир подачи обычно даже меньше: дороги свободнее.' },
        { q: 'Работаете 24/7?', a: 'Да, круглосуточно, в выходные и праздники тоже.' },
        { q: 'Выезжаете за КАД?', a: 'Да, по всей Ленинградской области. Межгород до 150–200 км от Петербурга, стоимость считаем по маршруту заранее.' },
        { q: 'Можно после ДТП?', a: 'Да. Заберём с места, подскажем порядок действий и дадим документы для страховой. Если автомобиль не катится, используем подкатные тележки или манипулятор.' },
        { q: 'Что если колёса заблокированы?', a: 'Ничего делать не нужно, просто скажите об этом диспетчеру. Приедем с подкатными тележками и закатим машину на платформу без волочения.' },
        { q: 'Можно ли ехать пассажиром?', a: 'Да, в кабине эвакуатора можно поехать вместе с автомобилем.' },
        { q: 'Может ли измениться стоимость?', a: 'Только если ситуация на месте отличается от описанной, например, машина в кювете, а не на дороге. Тогда водитель предупредит до погрузки, и вы решите, продолжать ли.' },
        { q: 'Кто отвечает, если машину повредят?', a: 'Мы. Ответственность компании застрахована, за автомобиль отвечаем от погрузки до выгрузки.' }
      ].map((f, i) => ({ ...f, open: i === 0 }))
    };
  }
}

const comp = new Component();
let vals = {}, pending = false;
const get = (o, p) => p.split('.').reduce((a, k) => (a == null ? undefined : a[k]), o);
const interp = t => t.replace(/\{\{([^}]+)\}\}/g, (m, p) => { const v = get(vals, p); return v == null ? '' : v; });
function schedule() {
  if (pending) return; pending = true;
  Promise.resolve().then(() => { pending = false; update(); if (comp.componentDidUpdate) comp.componentDidUpdate(); });
}
function update() {
  vals = comp.renderVals();
  document.documentElement.classList.toggle('is-m', !!vals.mobile);
  document.querySelectorAll('[data-if]').forEach(el => { el.hidden = !get(vals, el.dataset.if); });
  document.querySelectorAll('[data-bind]').forEach(el => { const v = get(vals, el.dataset.bind); const s = v == null ? '' : String(v); if (el.textContent !== s) el.textContent = s; });
  document.querySelectorAll('[data-bind-attr]').forEach(el => {
    const m = JSON.parse(el.dataset.bindAttr);
    for (const a in m) {
      const v = get(vals, m[a]);
      if (a === 'value') { const s = v == null ? '' : String(v); if (el.value !== s) el.value = s; }
      else if (a === 'disabled' || a === 'open' || a === 'hidden' || a === 'checked') el[a] = !!v;
      else el.setAttribute(a, v == null ? '' : v);
    }
  });
  document.querySelectorAll('[data-bind-style]').forEach(el => { const m = JSON.parse(el.dataset.bindStyle); for (const p in m) el.style.setProperty(p, interp(m[p])); });
}
document.addEventListener('click', e => {
  const el = e.target.closest('[data-action]'); if (!el || el.disabled) return;
  const fn = get(vals, el.dataset.action); if (typeof fn === 'function') { e.preventDefault(); fn(e); }
});
document.addEventListener('input', e => {
  const el = e.target.closest('[data-on-input]'); if (!el) return;
  const fn = get(vals, el.dataset.onInput); if (typeof fn === 'function') fn(e);
});
update();
if (comp.componentDidMount) comp.componentDidMount();
})();
