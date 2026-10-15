// Página de ingreso: solo valida usuario y contraseña. El CRUD y el dashboard están en panel.html.
const flash = (msg, tipo) => { const f = $('#flash'); f.textContent = msg; f.className = 'flash ' + tipo; f.hidden = !msg; };
const msgLogin = e => /invalid login credentials/i.test(e.message) ? 'Email o contraseña incorrectos.'
  : /email not confirmed/i.test(e.message) ? 'El email todavía no está confirmado en Supabase.'
  : (e.status === 401 || /api key/i.test(e.message)) ? 'La anon key de js/supabase.js no es válida para este proyecto.'
  : 'No se pudo ingresar: ' + e.message;

// Mensajes que llegan desde el panel (cierre de sesión manual o por inactividad)
const aviso = sessionStorage.getItem('bb-msg'); sessionStorage.removeItem('bb-msg');
if (aviso === 'cerrada') flash('Sesión cerrada correctamente.', 'ok');
if (aviso === 'inactividad') flash('Tu sesión se cerró por inactividad. Ingresá de nuevo.', 'warn');

(async function init() {
  if (!CONFIGURADO) { $('#login-err').textContent = 'Falta configurar Supabase en js/supabase.js.'; return; }
  const { data: { session } } = await db.auth.getSession();
  if (session) location.replace('panel.html');   // ya tiene sesión: directo al panel
})();

$('#login-form').addEventListener('submit', async e => {
  e.preventDefault(); if (!CONFIGURADO) return;
  const btn = $('#btn-login'); btn.disabled = true; $('#login-err').textContent = '';
  const { error } = await db.auth.signInWithPassword({ email: $('#email').value.trim(), password: $('#pass').value });
  if (error) { btn.disabled = false; $('#login-err').textContent = msgLogin(error); return; }
  try { localStorage.setItem('bb-last', Date.now()); } catch (e) {}
  flash('Ingreso correcto. Entrando al panel…', 'ok');
  e.target.querySelectorAll('input').forEach(i => i.disabled = true);
  setTimeout(() => location.replace('panel.html'), 1200);
});
