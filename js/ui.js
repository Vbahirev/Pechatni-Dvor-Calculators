import { state } from './state.js';

export function showToast(message, type = 'error') {
    const container = document.getElementById('toast-container');
    const el = document.createElement('div');
    const icon = type === 'success' ? '<i class="fas fa-check-circle text-green-500 text-xl"></i>' : (type === 'info' ? '<i class="fas fa-info-circle text-blue-500 text-xl"></i>' : '<i class="fas fa-exclamation-circle text-red-500 text-xl"></i>');
    el.className = `toast ${type}`;
    el.innerHTML = `${icon} <span class="font-medium text-slate-700 text-sm">${message}</span>`;
    container.appendChild(el);
    setTimeout(() => {
        el.style.animation = 'fadeOut 0.3s forwards';
        setTimeout(() => el.remove(), 300);
    }, 3000);
}

// --- CONFIRMATION ---
let confirmCallback = null;
export function showConfirm(message, callback) {
    const modal = document.getElementById('confirmModal');
    const content = document.getElementById('confirmContent');
    document.getElementById('confirmMessage').innerText = message;
    confirmCallback = callback;
    modal.classList.remove('hidden');
    setTimeout(() => { modal.classList.remove('opacity-0'); content.classList.remove('scale-95'); }, 10);
    
    const btn = document.getElementById('confirmBtnYes');
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    newBtn.addEventListener('click', () => closeConfirm(true));
}

export function closeConfirm(result) {
    const modal = document.getElementById('confirmModal');
    const content = document.getElementById('confirmContent');
    content.classList.add('scale-95');
    modal.classList.add('opacity-0');
    setTimeout(() => modal.classList.add('hidden'), 200);
    if (result && confirmCallback) confirmCallback();
    confirmCallback = null;
}

// --- RENDERS ---
export function renderMaterialsSelect() {
    const s = document.getElementById('newPartMaterial'); s.innerHTML = '';
    const groups = {}; 
    state.materialList.forEach(m => {
        const gName = m.group === 'plywood' ? 'ДЕРЕВО' : (m.group === 'acrylic' ? 'ПЛАСТИК' : 'ДРУГОЕ');
        if(!groups[gName]) groups[gName] = [];
        groups[gName].push(m);
    });

    for(let k in groups) {
        const grp = document.createElement('optgroup'); grp.label = k;
        groups[k].forEach(m=>{
            const o = document.createElement('option'); o.value=m.id; o.text=m.name; grp.appendChild(o);
        });
        s.appendChild(grp);
    }
}

export function renderPartsTable() {
    const tbody = document.getElementById('partsTableBody'); tbody.innerHTML = '';
    state.parts.forEach(p => {
        const m = state.materialList.find(x => x.id === p.matId) || {name:'?', group:'plywood'};
        let cutRateObj = state.processingRates.find(r => r.id === (m.group === 'plywood' ? 'cut_plywood' : 'cut_acrylic'));
        if(!cutRateObj) cutRateObj = state.processingRates.find(r => r.type === 'linear');
        
        const cRate = cutRateObj ? cutRateObj.cost : 0;
        const mCost = (p.w * p.h * p.qty * 1.2 * (m.cost||0));
        const cCost = p.cutLen * cRate;
        
        tbody.innerHTML += `
        <tr class="hover:bg-slate-50 transition-colors">
            <td class="px-5 py-3 font-medium text-slate-700">${m.name} <div class="text-xs text-slate-400">Кол-во: ${p.qty} шт</div></td>
            <td class="px-5 py-3 text-center text-slate-500 font-mono text-xs">${p.w} x ${p.h} см</td>
            <td class="px-5 py-3 text-center">
                <div class="stepper-group h-8 w-28 mx-auto bg-white border-slate-200">
                    <div class="stepper-btn w-8 text-sm" onclick="stepPartCut(${p.id}, -0.1)">-</div>
                    <input type="number" value="${p.cutLen}" readonly class="stepper-input text-xs text-blue-600 font-bold">
                    <div class="stepper-btn w-8 text-sm" onclick="stepPartCut(${p.id}, 0.1)">+</div>
                </div>
            </td>
            <td class="px-5 py-3 text-center font-bold text-slate-700 text-sm">${Math.round(mCost + cCost)} ₽</td>
            <td class="px-5 py-3 text-right">
                <button onclick="removePart(${p.id})" class="btn-delete">Удалить</button>
            </td>
        </tr>`;
    });
}

export function renderProcessingSection() {
    const areaRates = state.processingRates.filter(r => r.type === 'area');
    const container = document.getElementById('processingContainer');
    
    if(areaRates.length === 0) {
        container.innerHTML = `<div class="text-xs text-slate-400 text-center italic py-2">Нет услуг. Добавьте в таблицу.</div>`;
        return;
    }

    container.innerHTML = areaRates.map(r => `
        <div id="box_${r.id}" class="border border-slate-200 rounded-lg p-3 transition-colors bg-white ${state.activeProcessingChecks[r.id] ? 'border-orange-200 bg-orange-50/30' : ''}">
            <div class="flex items-center justify-between mb-2">
                 <div class="flex items-center gap-2">
                     <input type="checkbox" id="has_${r.id}" onchange="toggleProcessing('${r.id}')" class="w-4 h-4 text-orange-600 rounded focus:ring-orange-500" ${state.activeProcessingChecks[r.id] ? 'checked' : ''}>
                     <label for="has_${r.id}" class="text-xs font-bold uppercase select-none cursor-pointer text-slate-700">${r.name}</label>
                 </div>
            </div>
            <div class="flex gap-2 items-center ${state.activeProcessingChecks[r.id] ? '' : 'opacity-50 pointer-events-none'}" id="inputs_${r.id}">
                 <input type="number" id="w_${r.id}" placeholder="Ш" class="input-field h-8 w-14 text-xs bg-slate-50" oninput="calcArea('${r.id}')">
                 <span class="text-slate-300 text-xs">x</span>
                 <input type="number" id="h_${r.id}" placeholder="В" class="input-field h-8 w-14 text-xs bg-slate-50" oninput="calcArea('${r.id}')">
                 <i class="fas fa-arrow-right text-slate-300 text-[10px] mx-1"></i>
                 <input type="number" id="area_${r.id}" value="${state.activeProcessingAreas[r.id] || 0}" class="input-field h-8 flex-grow text-xs font-bold text-orange-600 bg-white" oninput="manualArea('${r.id}', this.value)">
                 <span class="text-[10px] text-slate-400">см²</span>
            </div>
        </div>
    `).join('');
}

export function renderExtrasSection() {
    document.getElementById('extrasContainer').innerHTML = state.extrasCatalogue.map(ex => {
        if(state.activeExtras[ex.id] === undefined) state.activeExtras[ex.id] = 0;
        const act = state.activeExtras[ex.id] > 0;
        const step = ex.type === 'qty' ? 1 : 100;
        const unit = ex.type === 'qty' ? 'шт' : '₽';
        return `
        <div class="flex items-center justify-between p-2 rounded-lg border ${act?'border-blue-300 bg-blue-50':'border-slate-100 hover:bg-slate-50'} transition-colors">
            <div class="text-xs font-bold text-slate-600 w-1/2 truncate" title="${ex.name}">${ex.name}</div>
            <div class="flex items-center gap-1">
                <div class="stepper-group h-8 w-32 bg-white">
                    <div class="stepper-btn w-8 text-sm" onclick="modExtra('${ex.id}', -${step})">-</div>
                    <input type="number" value="${state.activeExtras[ex.id]}" class="stepper-input text-xs font-bold" readonly>
                    <div class="stepper-btn w-8 text-sm" onclick="modExtra('${ex.id}', ${step})">+</div>
                </div>
                <span class="text-[10px] w-4 text-slate-400">${unit}</span>
            </div>
        </div>`;
    }).join('');
}

// === ОБНОВЛЕННЫЙ РЕНДЕР СПИСКОВ (С кнопками сохранения) ===
export function renderSettingsLists() {
    const makeRow = (i, unit) => `
        <div class="flex justify-between items-center p-2 border-b border-slate-50 text-xs">
            <span class="font-medium text-slate-700 w-2/3 truncate" title="${i.name}">${i.name}</span>
            <div class="flex items-center gap-2">
                <input type="number" value="${i.cost}" id="cost_${i.id}" class="w-16 border border-slate-300 rounded p-1 text-sm text-right focus:border-orange-500 outline-none">
                <span class="text-[10px] text-slate-400 w-3">${unit}</span>
                <button onclick="updatePrice('${state.currentCalcId}', '${i.id}', document.getElementById('cost_${i.id}').value)" class="bg-slate-100 hover:bg-green-500 hover:text-white text-slate-500 px-2 py-1 rounded transition h-7 w-7 flex items-center justify-center">
                    <i class="fas fa-save"></i>
                </button>
            </div>
        </div>
    `;

    document.getElementById('dbMaterialsList').innerHTML = state.materialList.map(i => makeRow(i, '₽')).join('');
    document.getElementById('dbRatesList').innerHTML = state.processingRates.map(i => makeRow(i, '₽')).join('');
    document.getElementById('dbExtrasList').innerHTML = state.extrasCatalogue.map(i => makeRow(i, '₽')).join('');
}

export function printReceipt() {
     window.calculate(); 
     const clientOrder = document.getElementById('clientOrder').value || '---';
     const clientName = document.getElementById('clientName').value || 'Не указан';
     const total = document.getElementById('totalPrice').innerText;
     
     let itemsHtml = state.parts.map(p => {
        const m = state.materialList.find(x=>x.id===p.matId) || {name: 'Материал'};
        return `<div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:11px;"><span>${m.name} (${p.qty}шт)</span> <span style="font-family:monospace">${p.w}x${p.h}</span></div>`;
     }).join('');
     
     if(!itemsHtml) itemsHtml = '<div style="font-style:italic; font-size:10px;">Нет деталей</div>';

     let procHtml = '';
     state.processingRates.filter(r => r.type === 'area').forEach(r => {
         if(state.activeProcessingChecks[r.id] && state.activeProcessingAreas[r.id] > 0) {
             procHtml += `<div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:11px;"><span>${r.name}</span><span>${state.activeProcessingAreas[r.id]} см²</span></div>`;
         }
     });

     let extrasHtml = '';
     state.extrasCatalogue.forEach(ex => {
         if(state.activeExtras[ex.id] > 0) {
             const unit = ex.type === 'qty' ? 'шт' : 'руб';
             extrasHtml += `<div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:11px;"><span>${ex.name}</span><span>${state.activeExtras[ex.id]} ${unit}</span></div>`;
         }
     });

     const html = `
     <div style="font-family: 'Inter', sans-serif; padding:20px; color:#000;">
        <div style="text-align:center; border-bottom:2px solid #000; padding-bottom:10px; margin-bottom:15px;">
            <h1 style="margin:0; font-size:18px; font-weight:bold;">ПЕЧАТНЫЙ ДВОР</h1>
            <div style="font-size:12px; margin-top:5px;">Заказ № ${clientOrder}</div>
            <div style="font-size:10px; color:#555;">${new Date().toLocaleString('ru-RU')}</div>
        </div>
        <div style="margin-bottom:15px;"><div style="font-weight:bold; font-size:12px; border-bottom:1px solid #ccc;">Клиент:</div><div style="font-size:12px; padding-top:2px;">${clientName}</div></div>
        <div style="margin-bottom:15px;"><div style="font-weight:bold; font-size:12px; border-bottom:1px solid #ccc; margin-bottom:5px;">ДЕТАЛИ:</div>${itemsHtml}</div>
        ${procHtml ? `<div style="margin-bottom:15px;"><div style="font-weight:bold; font-size:12px; border-bottom:1px solid #ccc; margin-bottom:5px;">ОБРАБОТКА:</div>${procHtml}</div>` : ''}
        ${extrasHtml ? `<div style="margin-bottom:15px;"><div style="font-weight:bold; font-size:12px; border-bottom:1px solid #ccc; margin-bottom:5px;">ДОП. УСЛУГИ:</div>${extrasHtml}</div>` : ''}
        <div style="margin-top:20px; border-top:2px solid #000; padding-top:10px; display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:14px; font-weight:bold;">ИТОГО:</span><span style="font-size:20px; font-weight:bold;">${total}</span>
        </div>
        ${document.getElementById('isUrgent').checked ? '<div style="text-align:center; margin-top:10px; font-weight:bold; border:1px solid #000; padding:5px;">СРОЧНЫЙ ЗАКАЗ</div>' : ''}
     </div>`;
     
     document.getElementById('receiptArea').innerHTML = html;
     setTimeout(() => window.print(), 100);
}

export function openSettings() { 
    renderSettingsLists();
    const m = document.getElementById('settingsModal'); m.classList.remove('hidden','opacity-0');
    setTimeout(()=>document.getElementById('settingsContent').classList.remove('scale-95'),10);
}
export function closeSettings() {
    document.getElementById('settingsContent').classList.add('scale-95');
    setTimeout(()=>document.getElementById('settingsModal').classList.add('hidden','opacity-0'),200);
}
export function resetOrder() { 
    showConfirm('Очистить расчет?', () => { 
        state.parts=[]; state.activeExtras={}; state.activeProcessingAreas={}; state.activeProcessingChecks={}; 
        window.loadProfile(state.currentCalcId); 
        showToast("Сброшено", "success");
    }); 
}
