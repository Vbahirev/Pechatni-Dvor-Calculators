import { loadCalcData, saveCalcData, loadUiState, saveUiState } from '../../core/store.js';
import { toast, confirm } from '../../core/ui.js';
import { computeTotals, fmtRub } from '../../core/engine.js';

let calcMeta = null;

let materialList = [];
let extrasCatalogue = [];
let processingRates = [];

let parts = [];
let activeExtras = {};
let activeProcessingAreas = {};
let activeProcessingChecks = {};

function $(id){ return document.getElementById(id); }

function initStateFromStorage(calcId, defaults){
  const stored = loadCalcData(calcId);
  if(stored){
    materialList = stored.materials || defaults.defaultMaterials;
    extrasCatalogue = stored.extras || defaults.defaultExtras;
    processingRates = stored.rates || defaults.defaultRates;
  }else{
    materialList = [...defaults.defaultMaterials];
    extrasCatalogue = [...defaults.defaultExtras];
    processingRates = [...defaults.defaultRates];
  }

  // UI state (parts etc.)
  const ui = loadUiState(calcId);
  if(ui){
    parts = ui.parts || [];
    activeExtras = ui.activeExtras || {};
    activeProcessingAreas = ui.activeProcessingAreas || {};
    activeProcessingChecks = ui.activeProcessingChecks || {};
    $('clientOrder').value = ui.clientOrder || '';
    $('clientName').value = ui.clientName || '';
    $('markup').value = ui.markup ?? 100;
    $('isUrgent').checked = !!ui.isUrgent;
    $('markupVal').textContent = $('markup').value;
  }else{
    parts = [];
    activeExtras = {};
    activeProcessingAreas = {};
    activeProcessingChecks = {};
    $('markup').value = 100;
    $('markupVal').textContent = '100';
    $('isUrgent').checked = false;
  }
}

function persist(calcId){
  saveCalcData(calcId, { materials: materialList, extras: extrasCatalogue, rates: processingRates });
  saveUiState(calcId, {
    parts,
    activeExtras,
    activeProcessingAreas,
    activeProcessingChecks,
    clientOrder: $('clientOrder').value || '',
    clientName: $('clientName').value || '',
    markup: parseFloat($('markup').value) || 0,
    isUrgent: $('isUrgent').checked
  });
}

function renderMaterialsSelect(){
  const s = $('newPartMaterial');
  s.innerHTML = '';
  const groups = { plywood:'ДЕРЕВО', acrylic:'ПЛАСТИК' };
  Object.keys(groups).forEach(k=>{
    const og = document.createElement('optgroup');
    og.label = groups[k];
    materialList.filter(m=>m.group===k).forEach(m=>{
      const o = document.createElement('option');
      o.value = m.id;
      o.textContent = m.name;
      og.appendChild(o);
    });
    s.appendChild(og);
  });
}

function stepQty(step){
  const el = $('newPartQty');
  let v = parseFloat(el.value)||1;
  v += step;
  if(v<1) v=1;
  el.value = v;
}

function addPart(){
  const matId = $('newPartMaterial').value;
  const w = parseFloat($('newPartW').value)||0;
  const h = parseFloat($('newPartH').value)||0;
  const qty = parseFloat($('newPartQty').value)||1;
  if(w<=0 || h<=0){
    toast('Введите корректные размеры!', 'error');
    return;
  }
  const perimM = ((w+h)*2*qty)/100;
  parts.push({ id: Date.now(), matId, w, h, qty, cutLen: perimM.toFixed(2) });
  $('newPartW').value = '';
  $('newPartH').value = '';
  $('newPartQty').value = '1';
  renderPartsTable();
  calculate();
  toast('Позиция добавлена', 'success');
}

function removePart(id){
  parts = parts.filter(p=>p.id!==id);
  renderPartsTable();
  calculate();
}

function stepPartCut(id, step){
  const p = parts.find(x=>x.id===id);
  if(!p) return;
  let v = (parseFloat(p.cutLen)||0) + step;
  if(v<0) v=0;
  p.cutLen = v.toFixed(2);
  renderPartsTable();
  calculate();
}

function renderPartsTable(){
  const tbody = $('partsTableBody');
  tbody.innerHTML = '';
  for(const p of parts){
    const m = materialList.find(x=>x.id===p.matId) || { name:'?', group:'plywood', cost:0 };
    let cutRateObj = null;
    if(m.group==='plywood') cutRateObj = processingRates.find(r=>r.id==='cut_plywood');
    else cutRateObj = processingRates.find(r=>r.id==='cut_acrylic');
    if(!cutRateObj) cutRateObj = processingRates.find(r=>r.type==='linear');
    const cRate = cutRateObj ? cutRateObj.cost : 0;

    const mCost = (p.w * p.h * p.qty * 1.2 * (m.cost||0));
    const cCost = (parseFloat(p.cutLen)||0) * cRate;
    const row = document.createElement('tr');
    row.innerHTML = `
      <td class="px-4 py-3">
        <div style="font-weight:900;">${m.name}</div>
        <div style="font-size:12px; color: rgba(15,23,42,.55); font-weight:800;">Кол-во: ${p.qty} шт</div>
      </td>
      <td class="px-4 py-3 text-center" style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size:12px; color: rgba(15,23,42,.62);">
        ${p.w} × ${p.h} см
      </td>
      <td class="px-4 py-3 text-center">
        <div class="stepper" style="height:36px; max-width:140px; margin:0 auto;">
          <button type="button" data-cut="-">-</button>
          <input type="number" value="${p.cutLen}" readonly style="font-size:13px; font-weight:1000; color: rgba(37,99,235,.95);">
          <button type="button" data-cut="+">+</button>
        </div>
      </td>
      <td class="px-4 py-3 text-center" style="font-weight:1000;">${Math.round(mCost+cCost)} ₽</td>
      <td class="px-4 py-3 text-right">
        <button class="btn btn-ghost" style="height:36px;border-radius:12px;" data-del="1">Удалить</button>
      </td>
    `;
    // bind
    row.querySelector('[data-del]').addEventListener('click', ()=>removePart(p.id));
    row.querySelector('[data-cut="-"]').addEventListener('click', ()=>stepPartCut(p.id, -0.1));
    row.querySelector('[data-cut="+"]').addEventListener('click', ()=>stepPartCut(p.id, 0.1));
    tbody.appendChild(row);
  }
}

function renderProcessingSection(){
  const areaRates = processingRates.filter(r=>r.type==='area');
  const container = $('processingContainer');
  if(areaRates.length===0){
    container.innerHTML = `<div style="opacity:.6; font-weight:800; font-size:13px; padding:6px 2px;">Нет услуг. Добавьте в базе.</div>`;
    return;
  }
  container.innerHTML = '';
  for(const r of areaRates){
    const checked = !!activeProcessingChecks[r.id];
    const box = document.createElement('div');
    box.className = 'card-soft p-3';
    box.style.borderColor = checked ? 'rgba(234,88,12,.35)' : 'rgba(15,23,42,.08)';
    box.style.background = checked ? 'rgba(255,247,237,.70)' : 'rgba(255,255,255,.70)';
    box.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-between;">
        <label style="display:flex; gap:10px; align-items:center; cursor:pointer;">
          <input type="checkbox" ${checked?'checked':''} class="w-4 h-4 accent-orange-600">
          <span style="font-weight:1000; font-size:12px; text-transform:uppercase; letter-spacing:.08em; color: rgba(15,23,42,.78);">${r.name}</span>
        </label>
        <span style="font-size:12px; opacity:.55; font-weight:900;">${r.cost} ₽/см²</span>
      </div>
      <div class="mt-2" style="display:flex; gap:8px; align-items:center; ${checked?'':'opacity:.45; pointer-events:none;'}">
        <input type="number" placeholder="Ш" class="input-soft" style="height:36px; width:70px;" data-w>
        <span style="opacity:.4; font-weight:1000;">×</span>
        <input type="number" placeholder="В" class="input-soft" style="height:36px; width:70px;" data-h>
        <span style="opacity:.4; font-weight:1000;">→</span>
        <input type="number" class="input-soft" style="height:36px; flex:1; font-weight:1000; color: rgba(234,88,12,.95);" data-area>
        <span style="font-size:11px; opacity:.55; font-weight:900;">см²</span>
      </div>
    `;
    const chk = box.querySelector('input[type="checkbox"]');
    const wEl = box.querySelector('[data-w]');
    const hEl = box.querySelector('[data-h]');
    const aEl = box.querySelector('[data-area]');

    aEl.value = activeProcessingAreas[r.id] || 0;

    chk.addEventListener('change', ()=>{
      activeProcessingChecks[r.id] = chk.checked;
      if(!chk.checked){
        activeProcessingAreas[r.id] = 0;
      }
      renderProcessingSection();
      calculate();
    });

    const recalc = ()=>{
      const w = parseFloat(wEl.value)||0;
      const h = parseFloat(hEl.value)||0;
      const val = Math.ceil(w*h);
      aEl.value = isFinite(val) ? val : 0;
      activeProcessingAreas[r.id] = parseFloat(aEl.value)||0;
      calculate();
    };
    wEl.addEventListener('input', recalc);
    hEl.addEventListener('input', recalc);
    aEl.addEventListener('input', ()=>{
      activeProcessingAreas[r.id] = parseFloat(aEl.value)||0;
      calculate();
    });

    container.appendChild(box);
  }
}

function renderExtrasSection(){
  const container = $('extrasContainer');
  container.innerHTML = '';
  for(const ex of extrasCatalogue){
    if(activeExtras[ex.id] === undefined) activeExtras[ex.id] = 0;
    const act = activeExtras[ex.id] > 0;
    const step = ex.type==='qty' ? 1 : 100;
    const unit = ex.type==='qty' ? 'шт' : '₽';

    const row = document.createElement('div');
    row.className = 'card-soft p-2';
    row.style.borderColor = act ? 'rgba(59,130,246,.25)' : 'rgba(15,23,42,.08)';
    row.style.background = act ? 'rgba(239,246,255,.72)' : 'rgba(255,255,255,.70)';
    row.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
        <div style="min-width:0;">
          <div style="font-weight:1000; font-size:12px; color: rgba(15,23,42,.78); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${ex.name}">${ex.name}</div>
          <div style="font-size:11px; opacity:.55; font-weight:900;">${ex.cost} ₽ ${ex.type==='qty' ? '/шт' : ''}</div>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <div class="stepper" style="height:36px; width:150px;">
            <button type="button" data-minus>-</button>
            <input type="number" value="${activeExtras[ex.id]}" readonly style="font-size:13px; font-weight:1000;">
            <button type="button" data-plus>+</button>
          </div>
          <div style="font-size:11px; opacity:.55; font-weight:900; width:24px; text-align:left;">${unit}</div>
        </div>
      </div>
    `;
    row.querySelector('[data-minus]').addEventListener('click', ()=>{
      const v = activeExtras[ex.id] - step;
      if(v>=0){ activeExtras[ex.id] = v; renderExtrasSection(); calculate(); }
    });
    row.querySelector('[data-plus]').addEventListener('click', ()=>{
      activeExtras[ex.id] = (activeExtras[ex.id]||0) + step;
      renderExtrasSection(); calculate();
    });

    container.appendChild(row);
  }
}

function calculate(){
  const markupPct = parseFloat($('markup').value)||0;
  const urgent = $('isUrgent').checked ? 1.5 : 1;

  const totals = computeTotals({
    parts,
    materials: materialList,
    rates: processingRates,
    extrasCatalogue,
    activeExtras,
    activeProcessingChecks,
    activeProcessingAreas,
    markupPct,
    urgentMultiplier: urgent
  });

  $('resMat').textContent = fmtRub(totals.totalMat);
  $('resCut').textContent = fmtRub(totals.totalCut);
  $('resFinish').textContent = fmtRub(totals.totalFinish);
  $('resExtras').textContent = fmtRub(totals.totalExtras);
  $('costPrice').textContent = Math.round(totals.costPrice);
  $('totalPrice').textContent = fmtRub(totals.salePrice);

  persist(calcMeta.id);
}

function openSettings(){
  $('settingsCalcName').textContent = calcMeta.name;
  renderSettingsLists();
  const modal = $('settingsModal');
  modal.style.display = '';
  modal.classList.remove('hidden');
}
function closeSettings(){
  const modal = $('settingsModal');
  modal.style.display = 'none';
  modal.classList.add('hidden');
}

function renderSettingsLists(){
  // Materials
  $('dbMaterialsList').innerHTML = materialList.map(m=>`
    <div class="card-soft p-3" style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
      <div style="min-width:0;">
        <div style="font-weight:1000; font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${m.name}</div>
        <div style="font-size:11px; opacity:.55; font-weight:900;">${m.group}</div>
      </div>
      <div style="display:flex; gap:8px; align-items:center;">
        <input type="number" value="${m.cost}" data-cost class="input-soft" style="height:36px; width:96px;">
        <button class="btn btn-ghost" data-del style="height:36px;border-radius:12px;">Удалить</button>
      </div>
    </div>
  `).join('');

  $('dbMaterialsList').querySelectorAll('[data-del]').forEach((btn, idx)=>{
    btn.addEventListener('click', ()=>{
      const id = materialList[idx].id;
      confirm('Удалить материал навсегда?', ()=>{
        materialList = materialList.filter(x=>x.id!==id);
        renderMaterialsSelect();
        renderSettingsLists();
        calculate();
        toast('Удалено', 'success');
      });
    });
  });
  $('dbMaterialsList').querySelectorAll('[data-cost]').forEach((inp, idx)=>{
    inp.addEventListener('change', ()=>{
      materialList[idx].cost = parseFloat(inp.value)||0;
      calculate();
    });
  });

  // Rates
  $('dbRatesList').innerHTML = processingRates.map(r=>`
    <div class="card-soft p-3" style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
      <div style="min-width:0;">
        <div style="font-weight:1000; font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${r.name}</div>
        <div style="font-size:11px; opacity:.55; font-weight:900;">${r.type==='linear'?'метр':'см²'}</div>
      </div>
      <div style="display:flex; gap:8px; align-items:center;">
        <input type="number" value="${r.cost}" data-rcost class="input-soft" style="height:36px; width:96px;">
        <button class="btn btn-ghost" data-rdel style="height:36px;border-radius:12px;">Удалить</button>
      </div>
    </div>
  `).join('');

  $('dbRatesList').querySelectorAll('[data-rdel]').forEach((btn, idx)=>{
    btn.addEventListener('click', ()=>{
      const id = processingRates[idx].id;
      confirm('Удалить тариф навсегда?', ()=>{
        processingRates = processingRates.filter(x=>x.id!==id);
        renderSettingsLists();
        renderProcessingSection();
        calculate();
        toast('Удалено', 'success');
      });
    });
  });
  $('dbRatesList').querySelectorAll('[data-rcost]').forEach((inp, idx)=>{
    inp.addEventListener('change', ()=>{
      processingRates[idx].cost = parseFloat(inp.value)||0;
      renderProcessingSection();
      calculate();
    });
  });

  // Extras
  $('dbExtrasList').innerHTML = extrasCatalogue.map(e=>`
    <div class="card-soft p-3" style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
      <div style="min-width:0;">
        <div style="font-weight:1000; font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${e.name}</div>
        <div style="font-size:11px; opacity:.55; font-weight:900;">${e.type}</div>
      </div>
      <div style="display:flex; gap:8px; align-items:center;">
        <input type="number" value="${e.cost}" data-ecost class="input-soft" style="height:36px; width:96px;">
        <button class="btn btn-ghost" data-edel style="height:36px;border-radius:12px;">Удалить</button>
      </div>
    </div>
  `).join('');

  $('dbExtrasList').querySelectorAll('[data-edel]').forEach((btn, idx)=>{
    btn.addEventListener('click', ()=>{
      const id = extrasCatalogue[idx].id;
      confirm('Удалить услугу навсегда?', ()=>{
        extrasCatalogue = extrasCatalogue.filter(x=>x.id!==id);
        renderSettingsLists();
        renderExtrasSection();
        calculate();
        toast('Удалено', 'success');
      });
    });
  });
  $('dbExtrasList').querySelectorAll('[data-ecost]').forEach((inp, idx)=>{
    inp.addEventListener('change', ()=>{
      extrasCatalogue[idx].cost = parseFloat(inp.value)||0;
      calculate();
    });
  });
}

function addDbItemMaterial(){
  const name = $('dbMatName').value.trim();
  const cost = parseFloat($('dbMatCost').value);
  const group = $('dbMatGroup').value;
  if(!name || !isFinite(cost)){
    toast('Заполните название и цену', 'error');
    return;
  }
  materialList.push({ id:'m_'+Date.now(), name, cost, group });
  $('dbMatName').value = '';
  $('dbMatCost').value = '';
  renderMaterialsSelect();
  renderSettingsLists();
  calculate();
  toast('Материал добавлен', 'success');
}

function addDbItemRate(){
  const name = $('dbRateName').value.trim();
  const cost = parseFloat($('dbRateCost').value);
  const type = $('dbRateType').value;
  if(!name || !isFinite(cost)){
    toast('Заполните название и цену', 'error');
    return;
  }
  processingRates.push({ id:'r_'+Date.now(), name, type, cost });
  $('dbRateName').value = '';
  $('dbRateCost').value = '';
  renderSettingsLists();
  renderProcessingSection();
  calculate();
  toast('Тариф добавлен', 'success');
}

function addDbItemExtra(){
  const name = $('dbExtraName').value.trim();
  const cost = parseFloat($('dbExtraCost').value)||0;
  const type = $('dbExtraType').value;
  if(!name){
    toast('Заполните название', 'error');
    return;
  }
  extrasCatalogue.push({ id:'e_'+Date.now(), name, type, cost });
  $('dbExtraName').value = '';
  $('dbExtraCost').value = '';
  renderSettingsLists();
  renderExtrasSection();
  calculate();
  toast('Услуга добавлена', 'success');
}

function printReceipt(){
  calculate();
  const clientOrder = $('clientOrder').value || '---';
  const clientName = $('clientName').value || 'Не указан';
  const total = $('totalPrice').textContent;

  let itemsHtml = parts.map(p=>{
    const m = materialList.find(x=>x.id===p.matId) || {name:'Материал'};
    return `<div style="display:flex;justify-content:space-between;margin:4px 0;font-size:11px;">
      <span>${m.name} (${p.qty}шт)</span><span style="font-family:monospace">${p.w}x${p.h}</span>
    </div>`;
  }).join('');
  if(!itemsHtml) itemsHtml = '<div style="font-style:italic;font-size:10px;">Нет деталей</div>';

  let procHtml = '';
  for(const r of processingRates.filter(x=>x.type==='area')){
    if(activeProcessingChecks[r.id] && (activeProcessingAreas[r.id]||0)>0){
      procHtml += `<div style="display:flex;justify-content:space-between;margin:4px 0;font-size:11px;">
        <span>${r.name}</span><span>${activeProcessingAreas[r.id]} см²</span>
      </div>`;
    }
  }

  let extrasHtml = '';
  for(const ex of extrasCatalogue){
    if((activeExtras[ex.id]||0)>0){
      const unit = ex.type==='qty' ? 'шт' : 'руб';
      extrasHtml += `<div style="display:flex;justify-content:space-between;margin:4px 0;font-size:11px;">
        <span>${ex.name}</span><span>${activeExtras[ex.id]} ${unit}</span>
      </div>`;
    }
  }

  const html = `
  <div style="font-family: Inter, Arial, sans-serif; padding:20px; color:#000;">
    <div style="text-align:center; border-bottom:2px solid #000; padding-bottom:10px; margin-bottom:15px;">
      <h1 style="margin:0; font-size:18px; font-weight:900;">ПЕЧАТНЫЙ ДВОР</h1>
      <div style="font-size:12px; margin-top:6px;">Заказ № ${clientOrder}</div>
      <div style="font-size:10px; color:#555; margin-top:4px;">${new Date().toLocaleString('ru-RU')}</div>
    </div>

    <div style="margin-bottom:14px;">
      <div style="font-weight:900; font-size:12px; border-bottom:1px solid #ccc;">Клиент:</div>
      <div style="font-size:12px; padding-top:4px;">${clientName}</div>
    </div>

    <div style="margin-bottom:14px;">
      <div style="font-weight:900; font-size:12px; border-bottom:1px solid #ccc; margin-bottom:6px;">ДЕТАЛИ:</div>
      ${itemsHtml}
    </div>

    ${procHtml ? `<div style="margin-bottom:14px;">
      <div style="font-weight:900; font-size:12px; border-bottom:1px solid #ccc; margin-bottom:6px;">ОБРАБОТКА:</div>
      ${procHtml}
    </div>` : ''}

    ${extrasHtml ? `<div style="margin-bottom:14px;">
      <div style="font-weight:900; font-size:12px; border-bottom:1px solid #ccc; margin-bottom:6px;">ДОП. УСЛУГИ:</div>
      ${extrasHtml}
    </div>` : ''}

    <div style="margin-top:18px; border-top:2px solid #000; padding-top:10px; display:flex; justify-content:space-between; align-items:center;">
      <span style="font-size:14px; font-weight:900;">ИТОГО:</span>
      <span style="font-size:20px; font-weight:900;">${total}</span>
    </div>

    ${$('isUrgent').checked ? '<div style="text-align:center; margin-top:10px; font-weight:900; border:1px solid #000; padding:6px;">СРОЧНЫЙ ЗАКАЗ</div>' : ''}
  </div>`;

  const area = $('receiptArea');
  area.innerHTML = html;
  setTimeout(()=>window.print(), 80);
}

export async function init(meta){
  calcMeta = meta;

  const defaults = await fetch(`${meta.base}/config.json`).then(r=>r.json());

  // bind ui events
  $('qtyMinus').addEventListener('click', ()=>stepQty(-1));
  $('qtyPlus').addEventListener('click', ()=>stepQty(1));
  $('addPart').addEventListener('click', addPart);

  $('clearParts').addEventListener('click', ()=>{
    if(parts.length===0) return;
    confirm('Удалить все детали из сметы?', ()=>{
      parts = [];
      renderPartsTable();
      calculate();
      toast('Смета очищена', 'success');
    });
  });

  $('markup').addEventListener('input', ()=>{
    $('markupVal').textContent = $('markup').value;
    calculate();
  });
  $('isUrgent').addEventListener('change', calculate);

  $('clientOrder').addEventListener('input', ()=>persist(meta.id));
  $('clientName').addEventListener('input', ()=>persist(meta.id));

  $('resetOrder').addEventListener('click', ()=>{
    confirm('Очистить весь расчет?', ()=>{
      parts = [];
      activeExtras = {};
      activeProcessingAreas = {};
      activeProcessingChecks = {};
      $('clientOrder').value = '';
      $('clientName').value = '';
      $('markup').value = 100;
      $('markupVal').textContent = '100';
      $('isUrgent').checked = false;
      renderPartsTable();
      renderExtrasSection();
      renderProcessingSection();
      calculate();
      toast('Расчет сброшен', 'success');
    });
  });

  $('openSettings').addEventListener('click', openSettings);
  $('openSettingsRates').addEventListener('click', openSettings);
  $('openSettingsExtras').addEventListener('click', openSettings);
  $('closeSettings').addEventListener('click', closeSettings);

  $('addMat').addEventListener('click', addDbItemMaterial);
  $('addRate').addEventListener('click', addDbItemRate);
  $('addExtra').addEventListener('click', addDbItemExtra);

  $('printReceipt').addEventListener('click', printReceipt);

  initStateFromStorage(meta.id, defaults);
  renderMaterialsSelect();
  renderPartsTable();
  renderProcessingSection();
  renderExtrasSection();
  calculate();
}
