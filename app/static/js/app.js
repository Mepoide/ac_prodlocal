// ── Estado de la Aplicación ───────────────────────────
let msgs    = [];
let task    = null;
let busy    = false;
let mdl     = 'ollama';
let ollamaOnline = true;
let agents  = [];
let currentAgent = null;

// ── Agile Timeline Steps & Keywords ──────────────────
const stepKeywords = [
  { step: 1, keys: ['tipo', 'épica', 'epic', 'historia', 'story', 'bug', 'tarea', 'task', 'subtarea', 'sub-tarea'] },
  { step: 2, keys: ['título', 'title', 'llamar', 'nombre', 'resumen', 'cómo se llamará'] },
  { step: 3, keys: ['objetivo', 'propósito', 'why', 'para qué', 'valor', 'problema', 'resuelve'] },
  { step: 4, keys: ['alcance', 'incluye', 'incluir', 'scope', 'abarca'] },
  { step: 5, keys: ['no incluye', 'excluye', 'exclusiones', 'fuera', 'out of scope', 'descartado'] },
  { step: 6, keys: ['entregable', 'output', 'entregar', 'producto', 'resultado'] },
  { step: 7, keys: ['criterio', 'aceptación', 'dod', 'done', 'terminado', 'validación', 'probar'] },
  { step: 8, keys: ['depende', 'dependencia', 'prerrequisito', 'requiere', 'bloqueo'] },
  { step: 9, keys: ['riesgo', 'bloqueo', 'amenaza', 'mitigación', 'contingencia'] },
  { step: 10, keys: ['contexto', 'sprint', 'épica padre', 'padre', 'incremento', 'referencia'] }
];

// ── Arranque e Inicialización ────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  loadOllamaDetails(); // Corre en segundo plano sin bloquear el arranque del chat
  await loadAgents();
  applyAgentUI();
  startConversation();

  // Registrar preventDefault para clicks dentro del panel desplegable
  const dropdown = document.getElementById('ollama-dropdown');
  if (dropdown) {
    dropdown.addEventListener('click', (e) => e.stopPropagation());
  }
});

// ── Selección de Agente ───────────────────────────────
async function loadAgents() {
  const select = document.getElementById('agent-select');
  try {
    const data = await fetch('/api/agents').then(r => r.json());
    agents = data.agents || [];

    select.innerHTML = '';
    agents.forEach(a => {
      const opt = document.createElement('option');
      opt.value = a.id;
      opt.textContent = a.name;
      select.appendChild(opt);
    });

    const defaultId = data.default || (agents[0] && agents[0].id);
    select.value = defaultId;
    currentAgent = agents.find(a => a.id === defaultId) || agents[0];
    if (currentAgent) mdl = currentAgent.model;
  } catch (e) {
    console.error('Error al cargar agentes:', e);
    select.innerHTML = '<option value="">Sin agentes disponibles</option>';
  }
}

function onAgentChange() {
  if (busy) return;
  const select = document.getElementById('agent-select');
  currentAgent = agents.find(a => a.id === select.value) || currentAgent;
  if (currentAgent) mdl = currentAgent.model;
  applyAgentUI();
  restart();
}

function applyAgentUI() {
  if (!currentAgent) return;
  const app = document.getElementById('app');
  app.classList.toggle('no-task-panel', !currentAgent.has_task_panel);
  app.classList.toggle('ocr-agent', currentAgent.agent_type === 'ocr');
}

// ── OCR: drag & drop + file upload ───────────────────
function ocrDragOver(e) {
  e.preventDefault();
  document.getElementById('ocr-drop').classList.add('drag-over');
}
function ocrDragLeave(e) {
  document.getElementById('ocr-drop').classList.remove('drag-over');
}
function ocrDrop(e) {
  e.preventDefault();
  document.getElementById('ocr-drop').classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) processOcrFile(file);
}
function ocrFileSelected(e) {
  const file = e.target.files[0];
  if (file) processOcrFile(file);
}

async function processOcrFile(file) {
  if (busy) return;
  busy = true;

  const dropEl = document.getElementById('ocr-drop');
  const progressEl = document.getElementById('ocr-progress');
  dropEl.style.display = 'none';
  progressEl.style.display = 'flex';

  addUserBubble(`📄 ${esc(file.name)}`);
  const bubble = addAgentBubble();

  try {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/ocr', { method: 'POST', body: formData });
    const data = await res.json();

    if (data.error) {
      setBubble(bubble, `<span style="color:#ef4444;font-weight:600;">⚠️ ${esc(data.error)}</span>`);
    } else {
      const txt = data.text || '(sin texto detectado)';
      setBubble(bubble, `<div style="white-space:pre-wrap;font-family:var(--font-mono);font-size:13px;">${esc(txt)}</div>`);
    }
  } catch (e) {
    setBubble(bubble, `<span style="color:#ef4444;font-weight:600;">⚠️ Error al conectar con el servidor OCR.</span>`);
  } finally {
    busy = false;
    progressEl.style.display = 'none';
    dropEl.style.display = '';
    // Reset file input so el mismo fichero se puede subir de nuevo
    document.getElementById('ocr-file-input').value = '';
  }
}

// ── Lógica de Temas (Oscuro/Claro) ────────────────────
function initTheme() {
  try {
    const savedTheme = localStorage.getItem('theme') || 'dark'; // Dark theme por defecto
    document.body.setAttribute('data-theme', savedTheme);
    updateThemeIcons(savedTheme);
  } catch (e) {
    console.error('Error al inicializar tema:', e);
  }
}

function toggleTheme() {
  try {
    const currentTheme = document.body.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcons(newTheme);
  } catch (e) {
    console.error('Error al alternar tema:', e);
  }
}

function updateThemeIcons(theme) {
  const sunIcon = document.querySelector('.theme-icon.sun');
  const moonIcon = document.querySelector('.theme-icon.moon');
  if (sunIcon && moonIcon) {
    if (theme === 'dark') {
      sunIcon.style.display = 'block';
      moonIcon.style.display = 'none';
    } else {
      sunIcon.style.display = 'none';
      moonIcon.style.display = 'block';
    }
  }
}

// ── Menú Desplegable de Ollama ────────────────────────
function toggleOllamaDropdown(event) {
  event.stopPropagation();
  const wrapper = document.getElementById('ollama-status-wrapper');
  wrapper.classList.toggle('open');
}

// Cerrar panel al hacer click fuera
window.addEventListener('click', () => {
  const wrapper = document.getElementById('ollama-status-wrapper');
  if (wrapper) {
    wrapper.classList.remove('open');
  }
});

// Obtener detalles de Ollama y Listar modelos
async function loadOllamaDetails() {
  const urlVal = document.getElementById('ollama-val-url');
  const modelVal = document.getElementById('ollama-val-model');
  const connBadge = document.getElementById('ollama-conn-badge');
  const statusTxt = document.getElementById('status-text');
  const statusDot = document.getElementById('status-dot');
  const modelsList = document.getElementById('ollama-models-list');

  try {
    const config = await fetch('/api/config').then(r => r.json());
    if (urlVal) urlVal.textContent = config.ollama_url || 'http://localhost:11434';
    if (modelVal) modelVal.textContent = config.model || 'desconocido';
    mdl = config.model;

    // Obtener modelos instalados
    const data = await fetch('/api/models').then(r => r.json());
    if (data.error) {
      throw new Error(data.error);
    }
    
    // Conexión exitosa
    ollamaOnline = true;
    if (connBadge) {
      connBadge.textContent = 'Conectado';
      connBadge.className = 'status-badge';
    }
    if (statusDot) {
      statusDot.className = ''; 
      statusDot.classList.remove('disconnected');
    }
    if (statusTxt) {
      statusTxt.className = '';
      statusTxt.textContent = config.model;
    }

    // Renderizar modelos
    if (modelsList) {
      modelsList.innerHTML = '';
      if (data.models && data.models.length > 0) {
        data.models.forEach(m => {
          const li = document.createElement('li');
          const isActive = m.includes(config.model) || config.model.includes(m);
          if (isActive) {
            li.className = 'active-model';
          }
          li.innerHTML = `
            <span>${esc(m)}</span>
            ${isActive ? '<span style="font-size:9.5px;color:var(--color-primary);font-weight:700;">ACTIVO</span>' : ''}
          `;
          modelsList.appendChild(li);
        });
      } else {
        modelsList.innerHTML = '<li class="loading-models">No hay modelos descargados</li>';
      }
    }
  } catch(e) {
    console.error('Error al conectar con Ollama:', e);
    ollamaOnline = false;
    if (connBadge) {
      connBadge.textContent = 'Sin conexión';
      connBadge.className = 'status-badge disconnected';
    }
    if (statusDot) statusDot.className = 'disconnected';
    if (statusTxt) {
      statusTxt.className = 'disconnected';
      statusTxt.textContent = 'Ollama Offline';
    }
    
    if (modelsList) {
      modelsList.innerHTML = '<li class="loading-models" style="color:#ef4444;font-weight:600;">Servidor Ollama no detectado</li>';
    }
  }
}

// ── Iniciar Conversación ──────────────────────────────
async function startConversation() {
  clearMsgs();
  msgs = [];
  task = null;
  setStatus(true);

  try {
    updateProgressTracker();

    const greeting = (currentAgent && currentAgent.greeting) || 'Hola';

    // Agentes OCR: mostrar saludo estático sin llamar al LLM
    if (currentAgent && currentAgent.agent_type === 'ocr') {
      const bubble = addAgentBubble();
      setBubble(bubble, md(greeting));
      return;
    }

    const initMsgs = [{ role: 'user', content: greeting }];
    const bubble   = addAgentBubble();
    let   full     = '';

    try {
      full = await stream(initMsgs, bubble);
    } catch(e) {
      setBubble(bubble, `<span style="color:#ef4444;font-weight:600;">⚠️ ${esc(e.message)}</span>`);
      throw e;
    }

    const { chatText, newTask } = parse(full);
    setBubble(bubble, md(chatText));
    msgs = [
      { role: 'user',      content: greeting },
      { role: 'assistant', content: full   },
    ];

    if (newTask) {
      gotTask(newTask);
    } else {
      updateProgressTracker();
    }
  } catch(e) {
    console.error('Error al iniciar conversación:', e);
  } finally {
    setStatus(false);
    if (!currentAgent || currentAgent.agent_type !== 'ocr') {
      showChips(true);
      document.getElementById('input').disabled = false;
      document.getElementById('input').focus();
    }
  }
}

// ── Enviar Mensaje ────────────────────────────────────
async function submit() {
  const inp  = document.getElementById('input');
  const text = inp.value.trim();
  if (!text || busy) return;
  inp.value = '';
  syncSend();
  await doSend(text);
}

function sendChip(text) {
  if (busy) return;
  doSend(text);
}

async function doSend(text) {
  addUserBubble(text);
  msgs.push({ role: 'user', content: text });
  setStatus(true);

  try {
    updateProgressTracker();

    const bubble = addAgentBubble();
    let   full   = '';

    try {
      full = await stream(msgs, bubble);
    } catch(e) {
      setBubble(bubble, `<span style="color:#ef4444;font-weight:600;">⚠️ ${esc(e.message)}</span>`);
      throw e;
    }

    const { chatText, newTask } = parse(full);
    setBubble(bubble, md(chatText));
    msgs.push({ role: 'assistant', content: full });
    
    if (newTask) {
      gotTask(newTask);
    } else {
      updateProgressTracker();
    }
  } catch(e) {
    console.error('Error al enviar mensaje:', e);
  } finally {
    setStatus(false);
    document.getElementById('input').focus();
  }
}

// ── Streaming SSE (Server-Sent Events) ────────────────
async function stream(history, bubble) {
  const agentId = (currentAgent && currentAgent.id) || 'jira_task_builder';
  const res = await fetch(`/api/chat/${agentId}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ messages: history }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const reader  = res.body.getReader();
  const decoder = new TextDecoder();
  let   buf     = '';
  let   full    = '';
  const bEl     = bubble.querySelector('.agent-bubble');
  bEl.innerHTML = ''; // Limpiar dots animados de cargando

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const raw = line.slice(6).trim();
      if (raw === '[DONE]') return full;

      let parsed;
      try { parsed = JSON.parse(raw); } catch { continue; }
      if (parsed.error) throw new Error(parsed.error);

      if (parsed.token) {
        full += parsed.token;
        const display = full.includes('---TASK_START---')
          ? full.slice(0, full.indexOf('---TASK_START---')).trim()
          : full;
        bEl.innerHTML = md(display) + '<span class="cur"></span>';
        scrollDown();
      }
    }
  }
  return full;
}

// ── Helper Parsers ────────────────────────────────────
function parse(text) {
  const m = text.match(/---TASK_START---([\s\S]*?)---TASK_END---/);
  if (m) {
    const chatText = text.replace(/---TASK_START---[\s\S]*?---TASK_END---/, '').trim();
    return { chatText: chatText || '¡He generado la definición de tarea correctamente!', newTask: m[1].trim() };
  }
  return { chatText: text, newTask: null };
}

function md(text) {
  if (!text) return '';
  return text
    .replace(/\*\*(.*?)\*\*/g,  '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g,      '<em>$1</em>')
    .replace(/^### (.+)$/gm,    '<div class="md-h3">$1</div>')
    .replace(/^- \[ \] (.+)$/gm,'<div class="md-chk"><div class="md-box"></div><div>$1</div></div>')
    .replace(/^- (.+)$/gm,      '<div class="md-li"><span class="md-dot">•</span><div>$1</div></div>')
    .replace(/\n/g,             '<br>');
}

function esc(t) {
  return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── Lógica de Mensajes en el DOM ──────────────────────
function addUserBubble(text) {
  const c = document.getElementById('messages');
  const d = document.createElement('div');
  d.className = 'message user-msg';
  d.innerHTML = `
    <div class="bubble user-bubble">${esc(text)}</div>
    <div class="avatar user-avatar">${icoUser()}</div>`;
  c.appendChild(d);
  scrollDown();
}

function addAgentBubble() {
  const c = document.getElementById('messages');
  const d = document.createElement('div');
  d.className = 'message agent-msg';
  d.innerHTML = `
    <div class="avatar agent-avatar">${icoAgent()}</div>
    <div class="bubble agent-bubble">
      <div class="dots"><span></span><span></span><span></span></div>
    </div>`;
  c.appendChild(d);
  scrollDown();
  return d;
}

function setBubble(el, html) {
  el.querySelector('.agent-bubble').innerHTML = html;
  scrollDown();
}

function clearMsgs() { 
  document.getElementById('messages').innerHTML = ''; 
}

function scrollDown() {
  const el = document.getElementById('messages');
  el.scrollTop = el.scrollHeight;
}

// ── Estado UI y Controles ─────────────────────────────
function setStatus(loading) {
  busy = loading;
  const dot  = document.getElementById('status-dot');
  const txt  = document.getElementById('status-text');
  const inp  = document.getElementById('input');
  const send = document.getElementById('btn-send');

  if (loading) {
    if (dot) dot.className = 'thinking';
    if (txt) {
      txt.className = 'thinking';
      txt.textContent = 'Pensando...';
    }
  } else {
    if (dot) dot.className = ollamaOnline ? '' : 'disconnected';
    if (txt) {
      txt.className = ollamaOnline ? '' : 'disconnected';
      txt.textContent = ollamaOnline ? mdl : 'Ollama Offline';
    }
  }
  
  if (inp) inp.disabled   = loading;
  if (send) send.disabled  = loading;
  document.querySelectorAll('.chip').forEach(c => {
    if (loading) c.setAttribute('disabled',''); else c.removeAttribute('disabled');
  });
  if (!loading) syncSend();
}

function syncSend() {
  const val  = document.getElementById('input').value.trim();
  const btn  = document.getElementById('btn-send');
  btn.classList.toggle('rdy', !!val && !busy);
}

function handleKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) { 
    e.preventDefault(); 
    submit(); 
  }
}

function showChips(show) {
  document.getElementById('chips').style.display = show ? 'flex' : 'none';
}

// ── Lógica de Progreso de Entrevista ──────────────────
function updateProgressTracker() {
  if (task) {
    // Si la tarea ya se ha generado, marcamos todo como completo
    document.querySelectorAll('.step-item').forEach(el => {
      el.className = 'step-item completed';
    });
    const fill = document.getElementById('progress-fill');
    const percentage = document.getElementById('progress-percentage');
    const count = document.getElementById('progress-count');
    if (fill) fill.style.width = '100%';
    if (percentage) percentage.textContent = '100%';
    if (count) count.textContent = '10 de 10 completados';
    return;
  }

  // Escanear el historial acumulado en msgs
  const chatTextCombined = msgs.map(m => m.content.toLowerCase()).join(' ');

  let completedCount = 0;
  let activeStepSet = false;

  stepKeywords.forEach(def => {
    const stepEl = document.getElementById(`step-${def.step}`);
    if (!stepEl) return;

    // Verificar si las palabras clave del paso están en el historial del chat
    const isCompleted = def.keys.some(k => chatTextCombined.includes(k));

    if (isCompleted) {
      stepEl.className = 'step-item completed';
      completedCount++;
    } else {
      if (!activeStepSet) {
        stepEl.className = 'step-item active';
        activeStepSet = true;
      } else {
        stepEl.className = 'step-item pending';
      }
    }
  });

  // Actualizar la interfaz
  const fill = document.getElementById('progress-fill');
  const percentageEl = document.getElementById('progress-percentage');
  const countEl = document.getElementById('progress-count');
  
  const percentage = Math.round((completedCount / 10) * 100);
  if (fill) fill.style.width = `${percentage}%`;
  if (percentageEl) percentageEl.textContent = `${percentage}%`;
  if (countEl) countEl.textContent = `${completedCount} de 10 completados`;
}

// ── Tarea Generada (Got Task) ─────────────────────────
function gotTask(t) {
  task = t;
  
  // Renderizar contenido
  document.getElementById('task-pre').textContent = t;
  
  // Renderizar la ficha interactiva estructurada con Jira visual
  const renderedEl = document.getElementById('task-rendered');
  renderedEl.innerHTML = md(t);
  
  // Alternar estados visibles
  document.getElementById('task-empty').classList.add('off');
  document.getElementById('task-ready').classList.add('on');
  document.getElementById('task-badge').classList.add('on');
  
  // Por defecto, mostrar vista "Ficha" interactiva
  switchTaskView('preview');
  
  // Actualizar Timeline
  updateProgressTracker();
  
  // Mostrar Banner superior
  const b = document.getElementById('banner');
  b.classList.add('show');
  setTimeout(() => b.classList.remove('show'), 8000);
}

// Alternar entre pestaña Ficha (Rendered HTML) y Markdown (Raw Pre)
function switchTaskView(view) {
  const previewBtn = document.getElementById('btn-mode-preview');
  const rawBtn = document.getElementById('btn-mode-raw');
  const previewContainer = document.getElementById('task-preview-container');
  const rawContainer = document.getElementById('task-pre-container');

  if (view === 'preview') {
    previewBtn.classList.add('active');
    rawBtn.classList.remove('active');
    previewContainer.classList.add('active');
    rawContainer.classList.remove('active');
  } else {
    rawBtn.classList.add('active');
    previewBtn.classList.remove('active');
    rawContainer.classList.add('active');
    previewContainer.classList.remove('active');
  }
}

function copyTask() {
  if (!task) return;
  navigator.clipboard.writeText(task).then(() => {
    const btn = document.getElementById('btn-copy');
    btn.classList.add('ok');
    document.getElementById('copy-icon').innerHTML = '<polyline points="20 6 9 17 4 12"/>';
    document.getElementById('copy-icon').setAttribute('stroke-width','2.5');
    document.getElementById('copy-label').textContent = '¡Copiado!';
    setTimeout(() => {
      btn.classList.remove('ok');
      document.getElementById('copy-icon').innerHTML = '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>';
      document.getElementById('copy-label').textContent = 'Copiar markdown';
    }, 2200);
  });
}

// ── Control de Navegación de Pestañas (Móvil) ─────────
function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach((b, i) =>
    b.classList.toggle('active', (i === 0 && tab==='chat') || (i === 1 && tab==='task'))
  );
  
  // Si estamos en pantallas pequeñas (móviles), controlamos el panel activo.
  // En pantallas grandes, CSS sobreescribe la visibilidad para mostrar ambos a la vez.
  document.querySelectorAll('.panel').forEach(p =>
    p.classList.toggle('active', p.id === 'panel-' + tab)
  );
  
  if (tab === 'chat') {
    setTimeout(scrollDown, 40);
  }
}

// ── Reiniciar Aplicación ──────────────────────────────
function restart() {
  task = null;
  document.getElementById('task-badge').classList.remove('on');
  document.getElementById('task-empty').classList.remove('off');
  document.getElementById('task-ready').classList.remove('on');
  document.getElementById('task-pre').textContent = '';
  document.getElementById('task-rendered').innerHTML = '';
  document.getElementById('banner').classList.remove('show');
  document.getElementById('input').value = '';
  showChips(false);
  switchTab('chat');
  
  loadOllamaDetails(); // Cargar modelos en segundo plano
  startConversation();
}

// ── Iconos SVG ────────────────────────────────────────
function icoAgent() {
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
    <rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 9h6M9 12h6M9 15h4"/></svg>`;
}

function icoUser() {
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
}
