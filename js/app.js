let productos = [], categoria = 'todos', esAdmin = false;
// Métricas: una visita por sesión de navegación; no se cuentan las del administrador logueado
(async function trackVisita() {
  if (!CONFIGURADO) return;
  try {
    const { data: { session } } = await db.auth.getSession(); esAdmin = !!session;
    if (esAdmin || sessionStorage.getItem('bb-visita')) return;
    sessionStorage.setItem('bb-visita', '1');
    await db.from('visitas').insert({ visitor_id: visitorId(), path: location.pathname.slice(0, 200) });
  } catch (e) { /* las métricas nunca deben romper la tienda */ }
})();
const grid = $('#grid'), filtros = $('#filtros');

// ---- Filtros ----
filtros.innerHTML = ['todos', ...CATEGORIAS].map(c =>
  `<button class="chip${c === 'todos' ? ' on' : ''}" data-cat="${c}" aria-pressed="${c === 'todos'}">${cap(c)}</button>`).join('');
filtros.addEventListener('click', e => {
  const b = e.target.closest('.chip'); if (!b) return;
  categoria = b.dataset.cat;
  filtros.querySelectorAll('.chip').forEach(x => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); });
  render();
});

// ---- Tarjetas ----
const talles = p => (p.talles || '').split(/[,/|]+/).map(t => t.trim()).filter(Boolean);
function stockBadge(n) {
  if (n <= 0) return '<span class="badge out">Sin stock</span>';
  if (n <= 3) return `<span class="badge low">Últimas ${n} unidades</span>`;
  return '<span class="badge ok">En stock</span>';
}
function card(p) {
  const t = talles(p);
  return `<article class="pcard" data-id="${p.id}">
    <div class="pimg">${p.destacado ? '<span class="star">Destacado</span>' : ''}
      <img src="${esc(p.imagen_url)}" alt="${esc(p.nombre)}" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'noimg',textContent:'Sin foto'}))"></div>
    <div class="pbody"><div class="prow"><span class="pcat">${cap(esc(p.categoria))}</span>${stockBadge(p.stock)}</div>
      <h3>${esc(p.nombre)}</h3><p class="price">${ars(p.precio)}</p>
      ${t.length ? `<div class="talles" role="group" aria-label="Talles">${t.map((x, i) => `<button class="talle${i === 0 ? ' on' : ''}" data-t="${esc(x)}">${esc(x)}</button>`).join('')}</div>` : ''}
      <button class="btn buy" ${p.stock <= 0 ? 'disabled' : ''}>${p.stock <= 0 ? 'Sin stock' : 'Comprar por WhatsApp'}</button></div></article>`;
}
function render() {
  const lista = productos.filter(p => categoria === 'todos' || p.categoria === categoria);
  grid.innerHTML = lista.length ? lista.map(card).join('') : '<p class="empty">No hay productos en esta categoría por ahora.</p>';
}
grid.addEventListener('click', e => {
  const art = e.target.closest('.pcard'); if (!art) return;
  const tb = e.target.closest('.talle');
  if (tb) { art.querySelectorAll('.talle').forEach(x => x.classList.toggle('on', x === tb)); return; }
  if (!e.target.closest('.buy')) return;
  const p = productos.find(x => x.id == art.dataset.id); if (!p) return;
  const t = art.querySelector('.talle.on')?.dataset.t;
  if (CONFIGURADO && !esAdmin) db.from('clicks_pedidos').insert({ producto_id: p.id, producto_nombre: String(p.nombre).slice(0, 200), categoria: p.categoria, talle: t || null, visitor_id: visitorId() }).then(() => {}, () => {});
  const msg = `Hola Lean Importados! Me interesa la prenda: ${p.nombre}${t ? ` en talle ${t}` : ''}`;
  window.open(`https://wa.me/${CONFIG.WHATSAPP}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
});

// ---- Carga desde Supabase (solo estado = true) ----
async function cargar() {
  if (!CONFIGURADO) { grid.innerHTML = '<p class="empty">Falta configurar Supabase: completá la URL y la anon key en js/supabase.js.</p>'; heroInit(); return; }
  grid.innerHTML = Array(6).fill('<div class="pcard sk"></div>').join('');
  const { data, error } = await db.from(CONFIG.TABLA).select('*').eq('estado', true)
    .order('destacado', { ascending: false }).order('id', { ascending: false });
  if (error) { grid.innerHTML = '<p class="empty">No pudimos cargar el catálogo. Probá de nuevo en unos minutos.</p>'; console.error(error); heroInit(); return; }
  productos = data; render(); heroInit();
}

// ---- Hero carrusel (productos destacados) ----
const COLORES = ['#F4845F', '#6BBF7A', '#E882B4', '#6EB5FF'];
let hItems = [], ai = 0, lock = false;
const hero = $('#destacados'), car = $('#car');
$('#wa-link').href = `https://wa.me/${CONFIG.WHATSAPP}?text=${encodeURIComponent('Hola Lean Importados!')}`;
$('#wa-fab').href = `https://wa.me/${CONFIG.WHATSAPP}?text=${encodeURIComponent('Hola Lean Importados! Quiero hacer una consulta')}`;
function heroInit() {
  if (CONFIG.SPLINE_URL) { // Opcional: escena 3D de Spline en lugar del carrusel
    const s = document.createElement('script'); s.type = 'module'; s.src = CONFIG.SPLINE_VIEWER_SRC;
    s.onload = () => { const v = document.createElement('spline-viewer'); v.setAttribute('url', CONFIG.SPLINE_URL); car.replaceChildren(v); };
    document.head.appendChild(s); $('.h-nav').hidden = true; return;
  }
  hItems = productos.filter(p => p.imagen_url).slice(0, 6); ai = 0;
  hero.hidden = !hItems.length;
  if (!hItems.length) return;
  car.innerHTML = hItems.map(p => `<div class="fig"><img src="${esc(p.imagen_url)}" alt="${esc(p.nombre)}" draggable="false"></div>`).join('');
  heroPos();
}
function heroPos() {
  const n = hItems.length, m = innerWidth < 640;
  hero.style.backgroundColor = COLORES[ai % COLORES.length];
  car.querySelectorAll('.fig').forEach((el, i) => {
    const d = (i - ai + n) % n;
    const s = d === 0 ? { l: 50, h: m ? 60 : 92, b: m ? 22 : 0, sc: m ? 1.25 : 1.68, bl: 0, op: 1, z: 20 }
      : d === 1 ? { l: m ? 80 : 70, h: m ? 16 : 28, b: m ? 32 : 12, sc: 1, bl: 2, op: .85, z: 10 }
      : d === n - 1 ? { l: m ? 20 : 30, h: m ? 16 : 28, b: m ? 32 : 12, sc: 1, bl: 2, op: .85, z: 10 }
      : { l: 50, h: m ? 13 : 22, b: m ? 32 : 12, sc: 1, bl: 4, op: 1, z: 5 };
    Object.assign(el.style, { left: s.l + '%', height: s.h + '%', bottom: s.b + '%', transform: `translateX(-50%) scale(${s.sc})`, filter: `blur(${s.bl}px)`, opacity: s.op, zIndex: s.z });
  });
  $('#h-name').textContent = hItems[ai].nombre; $('#h-price').textContent = ars(hItems[ai].precio);
}
function mover(dir) {
  if (lock || hItems.length < 2) return; lock = true;
  ai = (ai + (dir === 'next' ? 1 : hItems.length - 1)) % hItems.length; heroPos();
  setTimeout(() => lock = false, 650);
}
$('#next').addEventListener('click', () => mover('next'));
$('#prev').addEventListener('click', () => mover('prev'));
addEventListener('keydown', e => { if (e.key === 'ArrowRight') mover('next'); if (e.key === 'ArrowLeft') mover('prev'); });
addEventListener('resize', () => hItems.length && heroPos());
// ---- Banner: la foto en color se revela con un spotlight que sigue al cursor ----
(function banner() {
  const b = $('#inicio');
  let W = innerWidth, H = b.clientHeight, mx = W * .5, my = H * .5, sx = mx, sy = my, moved = false;
  const size = () => { W = innerWidth; H = b.clientHeight; b.style.setProperty('--r', (W < 640 ? 170 : 260) + 'px'); };
  size(); addEventListener('resize', size);
  addEventListener('pointermove', e => { mx = e.clientX; my = e.clientY; moved = true; });
  (function loop(ms) {
    const t = ms * .001;
    if (!moved) { mx = W * .5 + Math.cos(t * .8) * W * .12; my = H * .5 + Math.sin(t * 1.1) * H * .2; }
    sx += (mx - sx) * .1; sy += (my - sy) * .1;
    b.style.setProperty('--x', sx + 'px'); b.style.setProperty('--y', (sy - b.getBoundingClientRect().top) + 'px');
    requestAnimationFrame(loop);
  })(0);
})();
cargar();
