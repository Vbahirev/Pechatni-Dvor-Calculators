import { state } from './state.js';
import { calculateTotals } from './logic.js';
import { calculatorsDb } from './data/db.js';
import { fetchGoogleData } from './google-db.js';
import * as UI from './ui.js';

// ВСТАВЬТЕ ВАШУ ССЫЛКУ СЮДА
const API_URL = "https://script.google.com/macros/s/AKfycbwfJpaH7A3l6Mj1OSwgySv1lZ1dTsFz08byIR4j4oFSopVWepwtE6WPtVdLdIS9qVcq/exec"; 
const API_PASS = "pechatny"; 

let globalData = null;

// === 1. ДОБАВЛЕНИЕ (ADD) ===
window.addDbItem = async (category, formIdPrefix) => {
    const name = document.getElementById(`${formIdPrefix}Name`).value;
    let costStr = document.getElementById(`${formIdPrefix}Cost`).value;
    const param = document.getElementById(`${formIdPrefix}Param`).value;

    if (!name || !costStr) { UI.showToast("Заполните поля", "error"); return; }

    // Превращаем "0,15" в "0.15" для кода
    let cost = parseFloat(costStr.replace(',', '.'));
    if (isNaN(cost)) cost = 0;

    UI.showToast("Добавляем...", "info");
    
    const prefix = category === 'material' ? 'm' : (category === 'rate' ? 'r' : 'e');
    const newItemId = prefix + Date.now();

    // 1. МГНОВЕННО ОБНОВЛЯЕМ НА САЙТЕ (чтобы вы увидели результат)
    const newItem = { id: newItemId, name: name, cost: cost, group: param, type: param }; // group для мат, type для услуг
    
    if (category === 'material') {
        newItem.group = param; // Важно для материалов
        state.materialList.push(newItem);
        UI.renderMaterialsSelect();
    } else if (category === 'rate') {
        newItem.type = param;
        state.processingRates.push(newItem);
        UI.renderProcessingSection();
    } else {
        newItem.type = param;
        state.extrasCatalogue.push(newItem);
        UI.renderExtrasSection();
    }
    
    // Перерисовываем список настроек, чтобы вы увидели новую строку
    UI.renderSettingsLists();
    // Очищаем поля ввода
    document.getElementById(`${formIdPrefix}Name`).value = "";
    document.getElementById(`${formIdPrefix}Cost`).value = "";

    // 2. ОТПРАВЛЯЕМ В ГУГЛ (Фоном)
    try {
        await fetch(API_URL, {
            method: "POST", 
            mode: "no-cors",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({
                password: API_PASS,
                action: "add",
                calcId: state.currentCalcId,
                category: category,
                id: newItemId,
                name: name,
                cost: cost, // Отправляем число
                param: param
            })
        });
        UI.showToast("Сохранено в облако", "success");
    } catch (error) {
        console.error(error);
        UI.showToast("Ошибка сети, но локально добавлено", "warning");
    }
};

// === 2. ОБНОВЛЕНИЕ ЦЕНЫ (UPDATE) ===
window.updatePrice = async (calcId, itemId, newCostStr) => {
    const btn = document.querySelector(`button[data-save-id="${itemId}"]`);
    if(btn) btn.innerHTML = '<i class="fas fa-sync fa-spin"></i>';
    
    // Лечим запятую
    let safeCost = parseFloat(String(newCostStr).replace(',', '.'));
    if (isNaN(safeCost)) safeCost = 0;

    // 1. МГНОВЕННО ОБНОВЛЯЕМ В ПАМЯТИ
    let item = state.materialList.find(i => i.id === itemId) || 
               state.processingRates.find(i => i.id === itemId) || 
               state.extrasCatalogue.find(i => i.id === itemId);
    
    if (item) {
        item.cost = safeCost;
        window.calculate(); // Пересчитываем цены в калькуляторе
        UI.showToast("Цена применена!", "success");
    }

    // 2. ОТПРАВЛЯЕМ В ГУГЛ
    try {
        await fetch(API_URL, {
            method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({
                password: API_PASS,
                action: "update",
                calcId: calcId,
                id: itemId,
                newCost: safeCost
            })
        });
        
        if(btn) btn.innerHTML = '<i class="fas fa-check"></i>';
        setTimeout(() => { if(btn) btn.innerHTML = 'СОХРАНИТЬ'; }, 1500);
        
    } catch (e) { 
        UI.showToast("Ошибка сети", "error"); 
        if(btn) btn.innerText = 'ERR'; 
    }
};

// === 3. УДАЛЕНИЕ (DELETE) ===
window.deleteDbItem = async (calcId, itemId) => {
    UI.showConfirm("Удалить навсегда?", async () => {
        
        // 1. МГНОВЕННО УДАЛЯЕМ С ЭКРАНА
        const row = document.getElementById(`row_${itemId}`);
        if(row) row.remove();

        // Удаляем из памяти
        state.materialList = state.materialList.filter(x => x.id !== itemId);
        state.processingRates = state.processingRates.filter(x => x.id !== itemId);
        state.extrasCatalogue = state.extrasCatalogue.filter(x => x.id !== itemId);
        
        // Обновляем списки в калькуляторе
        UI.renderMaterialsSelect();
        UI.renderProcessingSection();
        UI.renderExtrasSection();
        window.calculate();

        // 2. ОТПРАВЛЯЕМ В ГУГЛ
        try {
            await fetch(API_URL, {
                method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify({ 
                    password: API_PASS, 
                    action: "delete", 
                    calcId: calcId, 
                    id: itemId 
                })
            });
            UI.showToast("Удалено из облака", "success");
        } catch (e) { UI.showToast("Ошибка сети", "error"); }
    });
};

// === СТАНДАРТНЫЕ ФУНКЦИИ (Без изменений) ===
window.addPart = () => { const matId = document.getElementById('newPartMaterial').value; const w = parseFloat(document.getElementById('newPartW').value)||0; const h = parseFloat(document.getElementById('newPartH').value)||0; const qty = parseFloat(document.getElementById('newPartQty').value)||1; if(w<=0||h<=0){UI.showToast("Размеры!","error");return;} const perimM=((w+h)*2*qty)/100; state.parts.push({id:Date.now(),matId,w,h,qty,cutLen:perimM.toFixed(2)}); UI.renderPartsTable(); window.calculate(); UI.showToast("Добавлено","success"); };
window.removePart = (id) => { state.parts=state.parts.filter(p=>p.id!==id); UI.renderPartsTable(); window.calculate(); };
window.clearParts = () => { if(state.parts.length>0) UI.showConfirm("Очистить?",()=>{state.parts=[];UI.renderPartsTable();window.calculate();}); };
window.calculate = () => { const res=calculateTotals(); const fmt=(n)=>Math.round(n).toLocaleString('ru-RU')+' ₽'; document.getElementById('resMat').innerText=fmt(res.totalMat); document.getElementById('resCut').innerText=fmt(res.totalCut); document.getElementById('resFinish').innerText=fmt(res.totalFinish); document.getElementById('resExtras').innerText=fmt(res.totalExtras); document.getElementById('costPrice').innerText=Math.round(res.costPrice); document.getElementById('totalPrice').innerText=fmt(res.salePrice); };
window.stepInput = (id,s) => { const el=document.getElementById(id); let v=parseFloat(el.value)||0; if(v+s>=(id.includes('Qty')?1:0)) el.value=v+s; };
window.stepPartCut = (id,s) => { const p=state.parts.find(x=>x.id===id); if(p){let v=parseFloat(p.cutLen)+s; if(v<0)v=0; p.cutLen=v.toFixed(2); UI.renderPartsTable(); window.calculate();} };
window.toggleProcessing = (id) => { const chk=document.getElementById(`has_${id}`); state.activeProcessingChecks[id]=chk.checked; if(!chk.checked){state.activeProcessingAreas[id]=0; document.getElementById(`area_${id}`).value=0;} UI.renderProcessingSection(); window.calculate(); };
window.calcArea = (id) => { const w=document.getElementById(`w_${id}`).value; const h=document.getElementById(`h_${id}`).value; document.getElementById(`area_${id}`).value=Math.ceil(w*h); state.activeProcessingAreas[id]=Math.ceil(w*h); window.calculate(); };
window.manualArea = (id,v) => { state.activeProcessingAreas[id]=parseFloat(v)||0; window.calculate(); };
window.modExtra = (id,s) => { if(state.activeExtras[id]===undefined)state.activeExtras[id]=0; const v=state.activeExtras[id]+s; if(v>=0){state.activeExtras[id]=v; UI.renderExtrasSection(); window.calculate();} };
window.toggleUrgency = () => { const chk=document.getElementById('isUrgent').checked; document.getElementById('urgentDot').className=chk?'absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition transform translate-x-full bg-red-500':'absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition transform'; window.calculate(); };
window.openCatalog = () => { const list=document.getElementById('profilesList'); list.innerHTML=calculatorsDb.map(c=>`<div onclick="loadProfile('${c.id}')" class="p-3 mb-2 rounded-lg cursor-pointer transition flex items-center justify-between ${c.id===state.currentCalcId?'bg-orange-50 border border-orange-200':'bg-white border border-slate-100 hover:border-orange-200'}"><span class="font-bold text-slate-700 text-sm">${c.name}</span>${c.id===state.currentCalcId?'<i class="fas fa-check text-orange-600"></i>':''}</div>`).join(''); document.getElementById('catalogModal').classList.remove('hidden'); };
window.closeCatalog = () => document.getElementById('catalogModal').classList.add('hidden');
window.printReceipt = UI.printReceipt; window.openSettings = UI.openSettings; window.closeSettings = UI.closeSettings; window.closeConfirm = UI.closeConfirm; window.resetOrder = UI.resetOrder; window.saveData = () => {};

window.loadProfile = (id) => {
    const name = state.loadProfile(id);
    if(globalData) state.injectExternalData(globalData);
    document.getElementById('currentCalcName').innerText = name;
    document.getElementById('settingsCalcName').innerText = name;
    UI.renderMaterialsSelect(); UI.renderProcessingSection(); UI.renderExtrasSection(); UI.renderPartsTable(); UI.renderSettingsLists();
    window.closeCatalog(); window.calculate();
};

async function init() {
    UI.showToast("Проверка цен...", "info");
    const freshData = await fetchGoogleData();
    if (freshData) {
        globalData = freshData;
        localStorage.setItem('pd_cached_prices', JSON.stringify(freshData));
        UI.showToast("Цены обновлены", "success");
    } else {
        const cached = localStorage.getItem('pd_cached_prices');
        if(cached) { globalData = JSON.parse(cached); UI.showToast("Работаем из кэша", "info"); }
        else UI.showToast("Нет сети", "error");
    }
    const lastId = localStorage.getItem('pd_active_calc_id') || calculatorsDb[0].id;
    window.loadProfile(lastId);
}
document.addEventListener('DOMContentLoaded', init);
