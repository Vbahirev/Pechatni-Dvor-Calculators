import { getActiveCalcId, setActiveCalcId } from './core/store.js';

const calculators = [
  { id:'laser', name:'Лазерный Цех (Основной)', base:'./calculators/laser' },
];

function mountShell(){
  document.body.innerHTML = `
    <div class="no-print" style="max-width:1440px;margin:0 auto;padding:14px 14px 28px;">
      <div class="glass" style="padding:14px 14px; display:flex; gap:12px; align-items:center; justify-content:space-between;">
        <div style="display:flex; gap:12px; align-items:center;">
          <div class="card-soft" style="width:46px;height:46px;border-radius:14px;display:flex;align-items:center;justify-content:center;">
            <span style="font-weight:1000; letter-spacing:.02em;">PD</span>
          </div>
          <div>
            <div style="font-weight:1000; letter-spacing:.06em;">ПЕЧАТНЫЙ ДВОР</div>
            <div style="margin-top:4px; font-size:13px; color: rgba(15,23,42,.72);">
              <span id="currentCalcName" class="badge-link">Загрузка...</span>
              <span style="opacity:.55; font-weight:800;"> ▾</span>
            </div>
          </div>
        </div>
        <div style="display:flex; gap:10px; align-items:center;">
          <button class="btn btn-ghost" id="btnDb">База</button>
        </div>
      </div>

      <div id="app" style="margin-top:14px;"></div>
    </div>

    <div id="catalogModal" class="fixed inset-0 z-50 hidden no-print" style="display:none;">
      <div class="fixed inset-0 bg-slate-900/55 backdrop-blur-sm"></div>
      <div class="fixed inset-0 flex items-center justify-center p-4">
        <div class="glass" style="width:100%; max-width:420px; overflow:hidden;">
          <div style="padding:14px 14px; display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid rgba(15,23,42,.08);">
            <div style="font-weight:1000; letter-spacing:.06em;">Выбор калькулятора</div>
            <button class="btn btn-ghost" id="closeCatalog" style="height:36px;border-radius:12px;">✕</button>
          </div>
          <div id="profilesList" style="padding:10px; max-height:70vh; overflow:auto;"></div>
        </div>
      </div>
    </div>
  `;
}

function openCatalog(){
  const modal = document.getElementById('catalogModal');
  const list = document.getElementById('profilesList');
  const activeId = window.__pdActiveCalcId;
  list.innerHTML = calculators.map(c=>`
    <div data-id="${c.id}" class="card-soft" style="padding:12px 12px; margin:8px 0; cursor:pointer; display:flex; align-items:center; justify-content:space-between;">
      <div style="font-weight:900;">${c.name}</div>
      ${c.id===activeId ? '<div style="font-weight:1000; color: var(--accent);">●</div>' : '<div style="opacity:.35;">○</div>'}
    </div>
  `).join('');
  list.querySelectorAll('[data-id]').forEach(el=>{
    el.addEventListener('click', async ()=>{
      await loadCalculator(el.getAttribute('data-id'));
      closeCatalog();
    });
  });
  modal.style.display = '';
  modal.classList.remove('hidden');
}

function closeCatalog(){
  const modal = document.getElementById('catalogModal');
  modal.style.display = 'none';
  modal.classList.add('hidden');
}

async function loadCalculator(id){
  const item = calculators.find(c=>c.id===id) || calculators[0];
  window.__pdActiveCalcId = item.id;
  setActiveCalcId(item.id);
  document.getElementById('currentCalcName').textContent = item.name;

  const uiHtml = await fetch(`${item.base}/ui.html`).then(r=>r.text());
  document.getElementById('app').innerHTML = uiHtml;

  const mod = await import(`${item.base}/logic.js`);
  await mod.init({ id:item.id, name:item.name, base:item.base });
}

async function boot(){
  mountShell();

  document.getElementById('currentCalcName').addEventListener('click', openCatalog);
  document.getElementById('closeCatalog').addEventListener('click', closeCatalog);

  const active = getActiveCalcId(calculators[0].id);
  await loadCalculator(active);
}
boot();
