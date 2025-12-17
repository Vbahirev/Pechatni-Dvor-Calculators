import { state } from './state.js';

// === УВЕДОМЛЕНИЯ ===
export function showToast(m,t='error'){const c=document.getElementById('toast-container');const e=document.createElement('div');const i=t==='success'?'<i class="fas fa-check-circle text-green-500 text-xl"></i>':(t==='info'?'<i class="fas fa-info-circle text-blue-500 text-xl"></i>':'<i class="fas fa-exclamation-circle text-red-500 text-xl"></i>');e.className=`toast ${t}`;e.innerHTML=`${i} <span class="font-medium text-slate-700 text-sm">${m}</span>`;c.appendChild(e);setTimeout(()=>{e.style.animation='fadeOut 0.3s forwards';setTimeout(()=>e.remove(),300)},3000);}
let confirmCallback=null;export function showConfirm(m,c){const md=document.getElementById('confirmModal');const ct=document.getElementById('confirmContent');document.getElementById('confirmMessage').innerText=m;confirmCallback=c;md.classList.remove('hidden');setTimeout(()=>{md.classList.remove('opacity-0');ct.classList.remove('scale-95')},10);const b=document.getElementById('confirmBtnYes');const nb=b.cloneNode(true);b.parentNode.replaceChild(nb,b);nb.addEventListener('click',()=>closeConfirm(true));}
export function closeConfirm(r){const md=document.getElementById('confirmModal');const ct=document.getElementById('confirmContent');ct.classList.add('scale-95');md.classList.add('opacity-0');setTimeout(()=>md.classList.add('hidden'),200);if(r&&confirmCallback)confirmCallback();confirmCallback=null;}

// === ВЫБОР МАТЕРИАЛОВ ===
export function renderMaterialsSelect() {
    const s = document.getElementById('newPartMaterial'); 
    s.innerHTML = '';
    const groups = {}; 
    const groupNames = {
        'plywood': 'ДЕРЕВО / ФАНЕРА',
        'acrylic': 'ПЛАСТИК / АКРИЛ',
        'metal': 'МЕТАЛЛ',
        'other': 'ДРУГОЕ'
    };
    state.materialList.forEach(m => {
        let gKey = m.group ? m.group.toLowerCase().trim() : 'other';
        const label = groupNames[gKey] || gKey.toUpperCase();
        if (!groups[label]) groups[label] = [];
        groups[label].push(m);
    });
    for(let label in groups) {
        if(groups[label].length === 0) continue;
        const grp = document.createElement('optgroup'); 
        grp.label = label;
        groups[label].forEach(m => {
            const o = document.createElement('option'); 
            o.value = m.id; 
            o.text = m.name; 
            grp.appendChild(o);
        });
        s.appendChild(grp);
    }
}

// === ТАБЛИЦЫ И СПИСКИ (Без изменений) ===
export function renderPartsTable(){const tb=document.getElementById('partsTableBody');tb.innerHTML='';state.parts.forEach(p=>{const m=state.materialList.find(x=>x.id===p.matId)||{name:'?',group:'plywood'};let cr=state.processingRates.find(r=>r.id===(m.group==='plywood'?'cut_plywood':'cut_acrylic'));if(!cr)cr=state.processingRates.find(r=>r.type==='linear');const rc=cr?cr.cost:0;const mc=(p.w*p.h*p.qty*1.2*(m.cost||0));const cc=p.cutLen*rc;tb.innerHTML+=`<tr class="hover:bg-slate-50 transition-colors"><td class="px-5 py-3 font-medium text-slate-700">${m.name}<div class="text-xs text-slate-400">Кол-во: ${p.qty} шт</div></td><td class="px-5 py-3 text-center text-slate-500 font-mono text-xs">${p.w} x ${p.h} см</td><td class="px-5 py-3 text-center"><div class="stepper-group h-8 w-28 mx-auto bg-white border-slate-200"><div class="stepper-btn w-8 text-sm" onclick="stepPartCut(${p.id},-0.1)">-</div><input type="number" value="${p.cutLen}" readonly class="stepper-input text-xs text-blue-600 font-bold"><div class="stepper-btn w-8 text-sm" onclick="stepPartCut(${p.id},0.1)">+</div></div></td><td class="px-5 py-3 text-center font-bold text-slate-700 text-sm">${Math.round(mc+cc)} ₽</td><td class="px-5 py-3 text-right"><button onclick="removePart(${p.id})" class="btn-delete">Удалить</button></td></tr>`;});}
export function renderProcessingSection(){const ar=state.processingRates.filter(r=>r.type==='area');const c=document.getElementById('processingContainer');if(ar.length===0){c.innerHTML=`<div class="text-xs text-slate-400 text-center italic py-2">Нет услуг. Добавьте в базе.</div>`;return;}c.innerHTML=ar.map(r=>`<div id="box_${r.id}" class="border border-slate-200 rounded-lg p-3 transition-colors bg-white ${state.activeProcessingChecks[r.id]?'border-orange-200 bg-orange-50/30':''}"><div class="flex items-center justify-between mb-2"><div class="flex items-center gap-2"><input type="checkbox" id="has_${r.id}" onchange="toggleProcessing('${r.id}')" class="w-4 h-4 text-orange-600 rounded focus:ring-orange-500" ${state.activeProcessingChecks[r.id]?'checked':''}><label for="has_${r.id}" class="text-xs font-bold uppercase select-none cursor-pointer text-slate-700">${r.name}</label></div></div><div class="flex gap-2 items-center ${state.activeProcessingChecks[r.id]?'':'opacity-50 pointer-events-none'}" id="inputs_${r.id}"><input type="number" id="w_${r.id}" placeholder="Ш" class="input-field h-8 w-14 text-xs bg-slate-50" oninput="calcArea('${r.id}')"><span class="text-slate-300 text-xs">x</span><input type="number" id="h_${r.id}" placeholder="В" class="input-field h-8 w-14 text-xs bg-slate-50" oninput="calcArea('${r.id}')"><i class="fas fa-arrow-right text-slate-300 text-[10px] mx-1"></i><input type="number" id="area_${r.id}" value="${state.activeProcessingAreas[r.id]||0}" class="input-field h-8 flex-grow text-xs font-bold text-orange-600 bg-white" oninput="manualArea('${r.id}',this.value)"><span class="text-[10px] text-slate-400">см²</span></div></div>`).join('');}
export function renderExtrasSection(){document.getElementById('extrasContainer').innerHTML=state.extrasCatalogue.map(e=>{if(state.activeExtras[e.id]===undefined)state.activeExtras[e.id]=0;const a=state.activeExtras[e.id]>0;const s=e.type==='qty'?1:100;const u=e.type==='qty'?'шт':'₽';return `<div class="flex items-center justify-between p-2 rounded-lg border ${a?'border-blue-300 bg-blue-50':'border-slate-100 hover:bg-slate-50'} transition-colors"><div class="text-xs font-bold text-slate-600 w-1/2 truncate" title="${e.name}">${e.name}</div><div class="flex items-center gap-1"><div class="stepper-group h-8 w-32 bg-white"><div class="stepper-btn w-8 text-sm" onclick="modExtra('${e.id}',-${s})">-</div><input type="number" value="${state.activeExtras[e.id]}" class="stepper-input text-xs font-bold" readonly><div class="stepper-btn w-8 text-sm" onclick="modExtra('${e.id}',${s})">+</div></div><span class="text-[10px] w-4 text-slate-400">${u}</span></div></div>`;}).join('');}
export function printReceipt(){window.calculate();const co=document.getElementById('clientOrder').value||'---';const cn=document.getElementById('clientName').value||'Не указан';const t=document.getElementById('totalPrice').innerText;let ih=state.parts.map(p=>{const m=state.materialList.find(x=>x.id===p.matId)||{name:'Материал'};return `<div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:11px;"><span>${m.name} (${p.qty}шт)</span> <span style="font-family:monospace">${p.w}x${p.h}</span></div>`;}).join('');if(!ih)ih='<div style="font-style:italic; font-size:10px;">Нет деталей</div>';let ph='';state.processingRates.filter(r=>r.type==='area').forEach(r=>{if(state.activeProcessingChecks[r.id]&&state.activeProcessingAreas[r.id]>0){ph+=`<div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:11px;"><span>${r.name}</span><span>${state.activeProcessingAreas[r.id]} см²</span></div>`;}});let eh='';state.extrasCatalogue.forEach(e=>{if(state.activeExtras[e.id]>0){const u=e.type==='qty'?'шт':'руб';eh+=`<div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:11px;"><span>${e.name}</span><span>${state.activeExtras[e.id]} ${u}</span></div>`;}});const h=`<div style="font-family:'Inter',sans-serif;padding:20px;color:#000;"><div style="text-align:center;border-bottom:2px solid #000;padding-bottom:10px;margin-bottom:15px;"><h1 style="margin:0;font-size:18px;font-weight:bold;">ПЕЧАТНЫЙ ДВОР</h1><div style="font-size:12px;margin-top:5px;">Заказ № ${co}</div><div style="font-size:10px;color:#555;">${new Date().toLocaleString('ru-RU')}</div></div><div style="margin-bottom:15px;"><div style="font-weight:bold;font-size:12px;border-bottom:1px solid #ccc;">Клиент:</div><div style="font-size:12px;padding-top:2px;">${cn}</div></div><div style="margin-bottom:15px;"><div style="font-weight:bold;font-size:12px;border-bottom:1px solid #ccc;margin-bottom:5px;">ДЕТАЛИ:</div>${ih}</div>${ph?`<div style="margin-bottom:15px;"><div style="font-weight:bold;font-size:12px;border-bottom:1px solid #ccc;margin-bottom:5px;">ОБРАБОТКА:</div>${ph}</div>`:''}${eh?`<div style="margin-bottom:15px;"><div style="font-weight:bold;font-size:12px;border-bottom:1px solid #ccc;margin-bottom:5px;">ДОП. УСЛУГИ:</div>${eh}</div>`:''}<div style="margin-top:20px;border-top:2px solid #000;padding-top:10px;display:flex;justify-content:space-between;align-items:center;"><span style="font-size:14px;font-weight:bold;">ИТОГО:</span><span style="font-size:20px;font-weight:bold;">${t}</span></div>${document.getElementById('isUrgent').checked?'<div style="text-align:center;margin-top:10px;font-weight:bold;border:1px solid #000;padding:5px;">СРОЧНЫЙ ЗАКАЗ</div>':''}</div>`;document.getElementById('receiptArea').innerHTML=h;setTimeout(()=>window.print(),100);}
export function openSettings(){renderSettingsLists();const m=document.getElementById('settingsModal');m.classList.remove('hidden','opacity-0');setTimeout(()=>document.getElementById('settingsContent').classList.remove('scale-95'),10);}
export function closeSettings(){document.getElementById('settingsContent').classList.add('scale-95');setTimeout(()=>document.getElementById('settingsModal').classList.add('hidden','opacity-0'),200);}
export function resetOrder(){showConfirm('Очистить?',()=>{state.parts=[];state.activeExtras={};state.activeProcessingAreas={};state.activeProcessingChecks={};window.loadProfile(state.currentCalcId);showToast("Сброшено","success");});}

// === 3. МЕНЮ БАЗЫ ДАННЫХ (ФОРМЫ И СПИСКИ) ===
export function renderSettingsLists() {
    
    // Формы добавления: Обратите внимание, input type="text" для цены, чтобы принимать запятые
    const renderAddForm = (id, optionsHtml) => `
        <div class="flex gap-2 items-center mb-4 bg-slate-50 p-2 rounded border border-slate-100">
            <input type="text" id="${id}Name" placeholder="Название" class="input-field h-8 flex-grow text-xs text-left px-2 bg-white">
            <select id="${id}Param" class="input-field h-8 w-32 text-xs px-1 bg-white cursor-pointer font-bold text-slate-600">
                ${optionsHtml}
            </select>
            <input type="text" id="${id}Cost" placeholder="Цена" class="input-field h-8 w-20 text-xs text-right px-2 bg-white">
            <button onclick="addDbItem('${id === 'addMat' ? 'material' : (id === 'addRate' ? 'rate' : 'extra')}', '${id}')" 
                class="bg-slate-900 text-white px-3 h-8 rounded text-[10px] font-bold uppercase hover:bg-slate-700 transition shadow-sm">
                ДОБАВИТЬ
            </button>
        </div>
    `;

    document.getElementById('addMatForm').innerHTML = renderAddForm('addMat', `
        <option value="plywood">Дерево / Фанера</option>
        <option value="acrylic">Пластик / Акрил</option>
        <option value="metal">Металл</option>
        <option value="other">Другое</option>
    `);
    document.getElementById('addRateForm').innerHTML = renderAddForm('addRate', `
        <option value="area">За м² (площадь)</option>
        <option value="linear">За метр (рез)</option>
    `);
    document.getElementById('addExtraForm').innerHTML = renderAddForm('addExtra', `
        <option value="qty">За штуку</option>
        <option value="fixed">Фикс. цена</option>
    `);

    // Строки списка: тоже input type="text" для цены
    const makeRow = (i, unit) => `
        <div id="row_${i.id}" class="flex justify-between items-center p-2 border-b border-slate-50 text-xs hover:bg-slate-50 transition">
            <span class="font-medium text-slate-700 w-1/3 truncate" title="${i.name}">${i.name}</span>
            <div class="flex items-center gap-2 justify-end flex-grow">
                <input type="text" value="${i.cost}" id="cost_${i.id}" class="w-16 border border-slate-300 rounded h-7 text-sm text-right focus:border-orange-500 outline-none px-1">
                <span class="text-[10px] text-slate-400 w-3">${unit}</span>
                <button onclick="updatePrice('${state.currentCalcId}', '${i.id}', document.getElementById('cost_${i.id}').value)" data-save-id="${i.id}" class="bg-green-600 hover:bg-green-700 text-white px-3 h-7 rounded text-[9px] font-bold uppercase tracking-wider transition ml-2">СОХРАНИТЬ</button>
                <button onclick="deleteDbItem('${state.currentCalcId}', '${i.id}')" class="bg-red-500 hover:bg-red-600 text-white px-3 h-7 rounded text-[9px] font-bold uppercase tracking-wider transition">УДАЛИТЬ</button>
            </div>
        </div>
    `;

    document.getElementById('dbMaterialsList').innerHTML = state.materialList.map(i => makeRow(i, '₽')).join('');
    document.getElementById('dbRatesList').innerHTML = state.processingRates.map(i => makeRow(i, '₽')).join('');
    document.getElementById('dbExtrasList').innerHTML = state.extrasCatalogue.map(i => makeRow(i, '₽')).join('');
}
