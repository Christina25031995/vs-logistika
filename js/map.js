/* Карта экипажей по районам СПб. Параметры: ?hero — большая карта, ?compact — компактная (мобильная). */
const Q = new URLSearchParams(location.search);
const compact = Q.has('compact');
if (compact) { document.body.classList.add('compact'); document.getElementById('liveTxt').textContent = 'Эвакуаторы на линии'; }
const D = [
  {n:'Приморский', g:'Приморском', s:'primorskiy', c:[60.006,30.285], crews:3, free:2, eta:24, manip:1},
  {n:'Выборгский', g:'Выборгском', s:'vyborgskiy', c:[60.043,30.345], crews:3, free:1, eta:32, peak:1},
  {n:'Калининский', g:'Калининском', s:'kalininskiy', c:[59.998,30.408], crews:2, free:2, eta:26},
  {n:'Петроградский', g:'Петроградском', s:'petrogradskiy', c:[59.962,30.300], crews:2, free:1, eta:22, sub:'включая Крестовский остров'},
  {n:'Василеостровский', g:'Василеостровском', s:'vasileostrovskiy', c:[59.940,30.240], crews:2, free:2, eta:25, manip:1},
  {n:'Центральный', g:'Центральном', s:'centralnyy', c:[59.934,30.362], crews:2, free:1, eta:30},
  {n:'Красногвардейский', g:'Красногвардейском', s:'krasnogvardeyskiy', c:[59.965,30.462], crews:2, free:1, eta:28},
  {n:'Невский', g:'Невском', s:'nevskiy', c:[59.884,30.462], crews:3, free:2, eta:27, manip:1},
  {n:'Адмиралтейский', g:'Адмиралтейском', s:'admiralteyskiy', c:[59.910,30.296], crews:2, free:1, eta:29},
  {n:'Московский', g:'Московском', s:'moskovskiy', c:[59.852,30.318], crews:2, free:2, eta:30},
  {n:'Фрунзенский', g:'Фрунзенском', s:'frunzenskiy', c:[59.866,30.385], crews:2, free:1, eta:28},
  {n:'Кировский', g:'Кировском', s:'kirovskiy', c:[59.876,30.258], crews:2, free:2, eta:26, manip:1},
  {n:'Красносельский', g:'Красносельском', s:'krasnoselskiy', c:[59.832,30.170], crews:3, free:2, eta:29, manip:1}
];
const KEY = compact ? ['Петроградский','Московский'] : ['Приморский','Петроградский','Московский'];
const map = L.map('map', {zoomControl:!compact, scrollWheelZoom:false, dragging:!compact, tap:true, attributionControl:true})
  .setView(compact ? [59.94,30.31] : [59.943,30.31], compact ? 10 : 11);
if (!compact) map.zoomControl.setPosition('bottomright');
const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom:18, attribution:'© OpenStreetMap contributors'}).addTo(map);
// заглушка на главной: сообщаем, когда плитки видимой области загрузились (или через 6 с)
let readySent = false; const ready = () => { if (readySent) return; readySent = true; try { parent.postMessage({type:'vsl-map', action:'ready'}, '*'); } catch (e) {} };
tiles.once('load', ready); setTimeout(ready, 6000);

const TOW = '<svg width="30" height="16" viewBox="0 0 30 16" fill="currentColor"><rect x="1" y="9" width="19" height="2.6" rx=".6"/><path d="M1.5 9l1.5-1.6h14.5L19 9z" opacity=".55"/><path d="M20 11.6V5.5c0-.6.4-1 1-1h3.6c.4 0 .7.2.9.5l2.8 3.6c.2.2.2.5.2.7v2.3z"/><path d="M22 6h2.7l2 2.6H22z" fill="#fff" opacity=".9"/><circle cx="5" cy="13" r="2.2"/><circle cx="11" cy="13" r="2.2"/><circle cx="24.5" cy="13" r="2.2"/></svg>';
const MANIP = '<svg width="30" height="16" viewBox="0 0 30 16" fill="currentColor"><rect x="1" y="9" width="19" height="2.6" rx=".6"/><path d="M20 11.6V5.5c0-.6.4-1 1-1h3.6c.4 0 .7.2.9.5l2.8 3.6c.2.2.2.5.2.7v2.3z"/><path d="M22 6h2.7l2 2.6H22z" fill="#fff" opacity=".9"/><rect x="16" y="5.4" width="3" height="3.6" rx=".5"/><path d="M17.5 6.2L5 1.6" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/><path d="M5 1.6v3.6" stroke="currentColor" stroke-width="1.2"/><circle cx="5" cy="13" r="2.2"/><circle cx="11" cy="13" r="2.2"/><circle cx="24.5" cy="13" r="2.2"/></svg>';

const status = d => d.peak ? 'повышенная загрузка' : (d.free===1 ? '1 свободен' : d.free+' свободны');
const col = d => d.peak ? '#C77700' : '#1F9D55';
const isKey = d => KEY.includes(d.n);
const chipHtml = (d, sel) => `<div class="chip ${sel?'sel':''}"><b>${d.n}</b><span><i style="background:${col(d)}"></i>${status(d)} · <em>≈${d.eta} мин</em></span></div>`;

let cur = null, hov = null;
const OFFS = {2:[[-10,0],[10,0]], 3:[[-18,0],[0,0],[18,0]]};
function crewIcon(d, k){
  const open = cur === d || hov === d, busy = k >= d.free;
  if (open) {
    const manip = d.manip && k === d.crews - 1;
    return L.divIcon({className:'', html:`<div class="truck ${busy?'':'free'}" title="${manip?'Манипулятор':'Эвакуатор'}">${manip?MANIP:TOW}</div>`, iconSize:[30,16], iconAnchor:[15,8]});
  }
  return L.divIcon({className:'', html:`<div class="dot ${busy?'busy':''}" style="--d:${(k*0.8+d.eta*0.07)%2.4}s"></div>`, iconSize:[12,12], iconAnchor:[6,6]});
}
function spread(d){ const open = cur === d || hov === d; return open ? 1.9 : 1; }
function place(d, jit){
  const s = spread(d);
  d.crewM.forEach((m, k) => {
    const o = OFFS[d.crews][k], j = jit ? [(Math.random()-.5)*4, (Math.random()-.5)*3] : [0,0];
    m.setLatLng(map.containerPointToLatLng(map.latLngToContainerPoint(d.c).add([o[0]*s + j[0], o[1]*s + j[1]])));
  });
}
function refresh(d){
  const active = cur === d || hov === d;
  if (active && !d.chipM) { d.chipM = L.marker(d.c, {icon:L.divIcon({className:'', html:chipHtml(d, cur===d), iconSize:[0,0]}), zIndexOffset:1000}).addTo(map).on('click', () => select(d)).on('mouseover', () => setHov(d)).on('mouseout', () => setHov(null)); }
  if (!active && d.chipM && !isKey(d)) { map.removeLayer(d.chipM); d.chipM = null; }
  if (d.chipM) d.chipM.setIcon(L.divIcon({className:'', html:chipHtml(d, cur===d), iconSize:[0,0]}));
  if (d.chipM) d.chipM.setZIndexOffset(cur===d ? 1200 : 900);
  d.crewM.forEach((m, k) => m.setIcon(crewIcon(d, k)));
  d.zone.setStyle({fillOpacity: (cur===d||hov===d) ? .16 : .06, opacity: (cur===d||hov===d) ? .6 : .25});
  place(d, false);
}
const setHov = d => { const p = hov; hov = d; if (p && p !== d) refresh(p); if (d) refresh(d); };

D.forEach(d => {
  d.zone = L.circle(d.c, {radius:2300, color:'#2350E6', weight:1, opacity:.25, dashArray:'3 5', fillColor:'#2350E6', fillOpacity:.06}).addTo(map);
  d.zone.on('click', () => select(d)).on('mouseover', () => setHov(d)).on('mouseout', () => setHov(null));
  if (isKey(d)) d.chipM = L.marker(d.c, {icon:L.divIcon({className:'', html:chipHtml(d), iconSize:[0,0]}), zIndexOffset:900}).addTo(map).on('click', () => select(d));
  d.crewM = [];
  for (let k = 0; k < d.crews; k++) {
    const m = L.marker(d.c, {icon:crewIcon(d,k), keyboard:false, zIndexOffset:600}).addTo(map);
    m.on('click', () => select(d)).on('mouseover', () => setHov(d)).on('mouseout', () => setHov(null));
    d.crewM.push(m);
  }
  place(d, false);
});
map.on('zoomend', () => D.forEach(d => place(d, false)));
setInterval(() => D.forEach(d => place(d, true)), 2600);

[['КАД',[60.078,30.40]],['КАД',[59.812,30.36]],['ЗСД',[59.925,30.200]],['ЗСД',[60.03,30.212]]].forEach(([t,ll]) =>
  L.marker(ll,{icon:L.divIcon({className:'',html:`<span class="road">${t}</span>`,iconSize:[0,0]}),interactive:false}).addTo(map));
[
  [[60.012,30.232],[60.004,30.255],[59.992,30.272],[59.980,30.286]],
  [[59.840,30.330],[59.852,30.318],[59.866,30.345],[59.878,30.372]]
].forEach(p => L.polyline(p,{color:'#2350E6',weight:3.5,opacity:.8,className:'route',interactive:false}).addTo(map));

const $ = id => document.getElementById(id);
function select(d){
  const prev = cur; cur = d; if (prev && prev !== d) refresh(prev); refresh(d);
  $('pName').textContent = d.n + ' район';
  $('pSub').textContent = (d.sub ? d.sub + ' · ' : '') + d.crews + ' экипажа на линии' + (d.manip ? ', есть манипулятор' : '');
  $('pEta').textContent = d.peak ? '≈30–40 мин' : '≈' + (d.eta-4) + '–' + (d.eta+6) + ' мин';
  $('pSt').innerHTML = `<i style="width:8px;height:8px;border-radius:50%;background:${col(d)};display:inline-block"></i>${status(d)}`;
  $('pLink').textContent = 'Эвакуатор в ' + d.g + ' районе →';
  $('pLink').href = '/evakuator-' + d.s + '-rayon/';
  $('panel').classList.add('on'); $('legend').style.visibility = 'hidden';
  map.panTo([d.c[0] - (compact?0.03:0.02), d.c[1]], {animate:true});
  parent.postMessage({type:'vsl-map', action:'select', district:d.n}, '*');
}
$('pX').onclick = () => { $('panel').classList.remove('on'); $('legend').style.visibility = ''; const p = cur; cur = null; if (p) refresh(p); };
$('pCall').onclick = () => parent.postMessage({type:'vsl-map', action:'call', district:cur && cur.n}, '*');

let me = null, myRoute = null;
window.addEventListener('message', e => {
  const m = e.data || {};
  if (m.type !== 'vsl-locate') return;
  const ll = [m.lat, m.lon];
  let best = D[0], bd = 1e9;
  D.forEach(d => { const dd = (d.c[0]-ll[0])**2 + ((d.c[1]-ll[1])*0.5)**2; if (dd < bd) { bd = dd; best = d; } });
  if (me) map.removeLayer(me); if (myRoute) map.removeLayer(myRoute);
  me = L.marker(ll,{icon:L.divIcon({className:'',html:'<div class="me"></div>',iconSize:[20,20],iconAnchor:[10,10]}),zIndexOffset:1000}).addTo(map);
  myRoute = L.polyline([best.c, ll],{color:'#16191F',weight:3,className:'route'}).addTo(map);
  select(best);
  map.fitBounds(L.latLngBounds([best.c, ll]).pad(compact?1.2:1.6));
});

function tick(){ const t = new Date(); $('clk').textContent = String(t.getHours()).padStart(2,'0') + ':' + String(t.getMinutes()).padStart(2,'0'); }
tick(); setInterval(tick, 15000);
setInterval(() => {
  D.forEach(d => { d.eta += [0,1,-1][Math.floor(Math.random()*3)]; d.eta = Math.max(20, Math.min(d.peak?40:34, d.eta)); if (d.chipM) d.chipM.setIcon(L.divIcon({className:'', html:chipHtml(d, cur===d), iconSize:[0,0]})); });
}, 5000);
