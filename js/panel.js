// Panel privado: CRUD de productos + dashboard de métricas + cierre de sesión por inactividad.
let items = [];
const form = $('#prod-form'), rows = $('#rows');
$('#f-cat').innerHTML = CATEGORIAS.map(c => `<option value="${c}">${cap(c)}</option>`).join('');
const fmt = n => new Intl.NumberFormat('es-AR').format(n || 0);
function toast(msg, bad) { const t = $('#toast'); t.textContent = msg; t.className = 'toast show' + (bad ? ' bad' : ''); clearTimeout(toast.t); toast.t = setTimeout(() => t.className = 'toast', 3200); }

// ---------- Sesión: acceso, cierre manual e inactividad ----------
async function salir(motivo) {
  if (motivo) sessionStorage.setItem('bb-msg', motivo);
  try { await db.auth.signOut(); } catch (e) {}
  location.replace('admin.html');
}
const LIM = CONFIG.INACTIVIDAD_MIN * 60000, K = 'bb-last';
const ultima = () => +localStorage.getItem(K) || 0;
let t0 = 0;
const actividad = () => { const n = Date.now(); if (n - t0 > 5000) { t0 = n; try { localStorage.setItem(K, n); } catch (e) {} } };
function vigilarInactividad() {
  ['pointerdown', 'keydown', 'scroll', 'touchstart', 'mousemove'].forEach(ev => addEventListener(ev, actividad, { passive: true }));
  setInterval(() => {
    const resta = LIM - (Date.now() - (ultima() || Date.now())), av = $('#aviso');
    if (resta <= 0) return salir('inactividad');
    av.hidden = resta > 60000;
    if (!av.hidden) av.textContent = `Tu sesión se cerrará en ${Math.ceil(resta / 1000)} s por inactividad. Mové el mouse para continuar.`;
  }, 1000);
}
$('#logout').addEventListener('click', () => salir('cerrada'));

async function init() {
  if (!CONFIGURADO) return location.replace('admin.html');
  const { data: { session } } = await db.auth.getSession();
  if (!session) return location.replace('admin.html');
  if (ultima() && Date.now() - ultima() > LIM) return salir('inactividad');   // volvió después de mucho tiempo
  $('#who').textContent = session.user.email; actividad();
  db.auth.onAuthStateChange(ev => { if (ev === 'SIGNED_OUT') location.replace('admin.html'); });
  vigilarInactividad(); listar(); presets('7');
}

// ---------- Dashboard ----------
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
function presets(k) {
  const h = new Date(), d = new Date();
  if (k === 'mes') d.setDate(1); else d.setDate(h.getDate() - (+k - 1));
  $('#d-desde').value = iso(d); $('#d-hasta').value = iso(h); dash();
}
document.querySelector('.presets').addEventListener('click', e => { const b = e.target.closest('[data-d]'); if (b) presets(b.dataset.d); });
['#d-desde', '#d-hasta'].forEach(s => $(s).addEventListener('change', dash));
async function dash() {
  const desde = $('#d-desde').value, hasta = $('#d-hasta').value;
  if (!desde || !hasta) return;
  if (desde > hasta) return toast('La fecha "desde" no puede ser posterior a "hasta"', true);
  if ((new Date(hasta) - new Date(desde)) / 864e5 > 366) return toast('El rango máximo es de 1 año', true);
  const { data, error } = await db.rpc('dash_resumen', { desde, hasta });
  if (error) { console.error(error); return toast('No se pudieron cargar las métricas', true); }
  $('#k-vis').textContent = fmt(data.visitas); $('#k-uni').textContent = fmt(data.visitantes); $('#k-ped').textContent = fmt(data.pedidos);
  const max = Math.max(1, ...data.por_dia.map(d => Math.max(d.visitas, d.pedidos)));
  $('#bars').innerHTML = data.por_dia.map(d => `<div class="bar" title="${esc(d.dia)}: ${d.visitas} visitas, ${d.pedidos} pedidos"><i class="v" style="height:${d.visitas / max * 100}%"></i><i class="p" style="height:${d.pedidos / max * 100}%"></i></div>`).join('');
  $('#ax-a').textContent = desde; $('#ax-b').textContent = hasta;
  const top = data.top, m = Math.max(1, ...top.map(t => t.clicks));
  $('#top').innerHTML = top.length ? top.map(t => `<tr><td>${esc(t.nombre)}</td><td>${cap(esc(t.categoria || '—'))}</td><td><div class="meter"><span>${fmt(t.clicks)}</span><i style="width:${t.clicks / m * 100}%"></i></div></td></tr>`).join('')
    : '<tr><td colspan="3" class="empty">Todavía no hay pedidos en este período.</td></tr>';
}

// ---------- CRUD de productos ----------
async function listar() {
  const { data, error } = await db.from(CONFIG.TABLA).select('*').order('id', { ascending: false });
  if (error) return toast('No se pudo cargar la lista', true);
  items = data;
  rows.innerHTML = items.length ? items.map(p => `<tr data-id="${p.id}">
    <td>${p.imagen_url ? `<img class="thumb" src="${esc(p.imagen_url)}" alt="">` : '—'}</td>
    <td>${esc(p.nombre)}${p.destacado ? ' <span class="badge low">★</span>' : ''}</td><td>${cap(esc(p.categoria))}</td><td>${ars(p.precio)}</td><td>${p.stock}</td>
    <td><span class="badge ${p.estado ? 'ok' : 'out'}">${p.estado ? 'Publicado' : 'Pausado'}</span></td>
    <td class="acts"><button class="rb" data-a="edit">Editar</button><button class="rb" data-a="toggle">${p.estado ? 'Pausar' : 'Activar'}</button><button class="rb danger" data-a="del">Eliminar</button></td></tr>`).join('')
    : '<tr><td colspan="7" class="empty">Todavía no hay productos.</td></tr>';
}
function limpiar() { form.reset(); $('#f-id').value = ''; $('#form-title').textContent = 'Agregar nuevo producto'; $('#f-cancel').hidden = true; }
$('#f-cancel').addEventListener('click', limpiar);
form.addEventListener('submit', async e => {
  e.preventDefault();
  const id = $('#f-id').value;
  const row = { nombre: $('#f-nombre').value.trim(), categoria: $('#f-cat').value, precio: parseInt($('#f-precio').value, 10), stock: parseInt($('#f-stock').value, 10),
    talles: $('#f-talles').value.trim(), imagen_url: $('#f-img').value.trim(), estado: $('#f-estado').checked, destacado: $('#f-dest').checked };
  if (!row.nombre || !(row.precio >= 0) || !(row.stock >= 0)) return toast('Revisá nombre, precio y stock', true);
  $('#f-save').disabled = true;
  const { error } = id ? await db.from(CONFIG.TABLA).update(row).eq('id', id) : await db.from(CONFIG.TABLA).insert(row);
  $('#f-save').disabled = false;
  if (error) { console.error(error); return toast('No se pudo guardar', true); }
  toast(id ? 'Producto actualizado' : 'Producto agregado'); limpiar(); listar();
});
rows.addEventListener('click', async e => {
  const b = e.target.closest('[data-a]'); if (!b) return;
  const id = b.closest('tr').dataset.id, p = items.find(x => x.id == id); if (!p) return;
  if (b.dataset.a === 'edit') {
    $('#f-id').value = p.id; $('#f-nombre').value = p.nombre; $('#f-cat').value = p.categoria; $('#f-precio').value = p.precio; $('#f-stock').value = p.stock;
    $('#f-talles').value = p.talles || ''; $('#f-img').value = p.imagen_url || ''; $('#f-estado').checked = p.estado; $('#f-dest').checked = p.destacado;
    $('#form-title').textContent = 'Editar producto'; $('#f-cancel').hidden = false; form.scrollIntoView({ behavior: 'smooth' });
  } else if (b.dataset.a === 'toggle') {
    const { error } = await db.from(CONFIG.TABLA).update({ estado: !p.estado }).eq('id', id);
    error ? toast('No se pudo cambiar el estado', true) : (toast(p.estado ? 'Producto pausado' : 'Producto activado'), listar());
  } else if (confirm(`¿Eliminar "${p.nombre}"? Esta acción no se puede deshacer.`)) {
    const { error } = await db.from(CONFIG.TABLA).delete().eq('id', id);
    error ? toast('No se pudo eliminar', true) : (toast('Producto eliminado'), listar());
  }
});
init();
