// Configuración: reemplazá estos valores (Supabase > Project Settings > API).
// La anon key es pública por diseño; la seguridad la dan las políticas RLS (ver supabase/setup.sql).
const CONFIG = {
  SUPABASE_URL: 'https://menwkbvqzeyctbfrgyol.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1lbndrYnZxemV5Y3RiZnJneW9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5MzQ3ODksImV4cCI6MjEwNzUxMDc4OX0.6itGh2UJJqibIOnXdS_oQd2XVZqPiFlDBJ1avVA3oQE',
  TABLA: 'productos',
  INACTIVIDAD_MIN: 30,         // minutos sin actividad en el panel antes de cerrar la sesión (30 o 60)
  WHATSAPP: '5491157597489',   // formato internacional sin + ni espacios (ej: 54911XXXXXXXX)
  SPLINE_URL: '',              // pegá acá la URL de tu escena de Spline (https://prod.spline.design/.../scene.splinecode)
  SPLINE_VIEWER_SRC: 'https://unpkg.com/@splinetool/viewer/build/spline-viewer.js'
};
const CATEGORIAS = ['remeras', 'pantalones', 'buzos', 'conjuntos', 'medias', 'zapatillas', 'gorras', 'perfumes'];
const CONFIGURADO = !CONFIG.SUPABASE_URL.includes('TU-PROYECTO') && !CONFIG.SUPABASE_ANON_KEY.includes('TU_ANON_KEY');
const db = CONFIGURADO ? window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY) : null;
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ars = n => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0);
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
// Identificador anónimo del visitante (para contar visitantes únicos; no guarda datos personales)
const visitorId = () => { try { let v = localStorage.getItem('bb-vid'); if (!v) { v = (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2) + Date.now()); localStorage.setItem('bb-vid', v); } return v; } catch (e) { return 'anon-' + Date.now(); } };
