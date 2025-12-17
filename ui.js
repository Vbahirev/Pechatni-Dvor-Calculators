export function $(sel, root=document){ return root.querySelector(sel); }
export function $all(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }

export function createToastContainer(){
  let el = document.getElementById('toast-container');
  if(!el){
    el = document.createElement('div');
    el.id = 'toast-container';
    el.className = 'toast-wrap';
    document.body.appendChild(el);
  }
  return el;
}

export function toast(message, type='error', title=null){
  const container = createToastContainer();
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  const t = title || (type==='success' ? 'Готово' : 'Внимание');
  el.innerHTML = `
    <div style="width:10px;height:10px;border-radius:50%;margin-top:4px;background:${type==='success'?'rgba(34,197,94,.9)':'rgba(239,68,68,.9)'}"></div>
    <div>
      <div class="t-title">${t}</div>
      <div class="t-msg">${message}</div>
    </div>
  `;
  container.appendChild(el);
  setTimeout(()=>{
    el.style.animation = 'toastOut .22s ease-in forwards';
    setTimeout(()=>el.remove(), 220);
  }, 2600);
}

let confirmState = { cb:null };

export function mountConfirmModal(){
  if(document.getElementById('confirmModal')) return;
  const modal = document.createElement('div');
  modal.id = 'confirmModal';
  modal.className = 'fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/55 backdrop-blur-sm hidden opacity-0 transition-opacity duration-200';
  modal.innerHTML = `
    <div class="glass p-5 w-full max-w-sm transform scale-95 transition-transform duration-200" id="confirmContent">
      <div style="font-weight:900; font-size:16px; margin-bottom:6px;">Подтверждение</div>
      <div id="confirmMessage" style="color: rgba(15,23,42,.72); font-weight:650; margin-bottom:14px;">Вы уверены?</div>
      <div style="display:flex; justify-content:flex-end; gap:10px;">
        <button class="btn btn-ghost" id="confirmNo">Отмена</button>
        <button class="btn btn-primary" id="confirmYes">Да</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  modal.querySelector('#confirmNo').addEventListener('click', ()=>closeConfirm(false));
  modal.querySelector('#confirmYes').addEventListener('click', ()=>closeConfirm(true));
}

export function confirm(message, cb){
  mountConfirmModal();
  const modal = document.getElementById('confirmModal');
  const content = document.getElementById('confirmContent');
  document.getElementById('confirmMessage').textContent = message;
  confirmState.cb = cb;

  modal.classList.remove('hidden');
  setTimeout(()=>{
    modal.classList.remove('opacity-0');
    content.classList.remove('scale-95');
  }, 10);
}

function closeConfirm(result){
  const modal = document.getElementById('confirmModal');
  const content = document.getElementById('confirmContent');
  content.classList.add('scale-95');
  modal.classList.add('opacity-0');
  setTimeout(()=>modal.classList.add('hidden'), 200);

  if(result && confirmState.cb) confirmState.cb();
  confirmState.cb = null;
}
