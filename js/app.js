import { state } from './state.js';
import { calculateTotals } from './logic.js';
import { calculatorsDb } from './data/db.js';
import { fetchGoogleData } from './google-db.js';
import * as UI from './ui.js';

// === НАСТРОЙКИ СВЯЗИ ===
// Вставьте сюда вашу НОВУЮ ссылку скрипта (после публикации New Version)
const API_URL = "https://script.google.com/macros/s/AKfycbwfJpaH7A3l6Mj1OSwgySv1lZ1dTsFz08byIR4j4oFSopVWepwtE6WPtVdLdIS9qVcq/exec"; 
const API_PASS = "pechatny"; 

let globalData = null;

// === 1. ДОБАВЛЕНИЕ (ADD) ===
window.addDbItem = async (category, formIdPrefix) => {
    const name = document.getElementById(`${formIdPrefix}Name`).value;
    let cost = document.getElementById(`${formIdPrefix}Cost`).value;
    const param = document.getElementById(`${formIdPrefix}Param`).value;

    if (!name || !cost) { UI.showToast("Заполните название и цену", "error"); return; }

    // ЛЕЧИМ ЗАПЯТЫЕ: 0,15 -> 0.15
    cost = cost.replace(',', '.');

    UI.showToast("Отправка в Google...", "info");
    
    // Генерируем уникальный ID (m_..., r_..., e_...)
    const prefix = category === 'material' ? 'm' : (category === 'rate' ? 'r' : 'e');
    const newItemId = prefix + Date.now();

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
                cost: cost,
                param: param
            })
        });

        UI.showToast("Добавлено! Проверьте таблицу.", "success");
        // Очищаем поля
        document.getElementById(`${formIdPrefix}Name`).value = "";
        document.getElementById(`${formIdPrefix}Cost`).value = "";

    } catch (error) {
        console.error(error);
        UI.showToast("Ошибка соединения", "error");
    }
};

// === 2. ОБНОВЛЕНИЕ ЦЕНЫ (UPDATE) ===
window.updatePrice = async (calcId, itemId, newCost) => {
    const btn = document.querySelector(`button[data-save-id="${itemId}"]`);
    if(btn) btn.innerText = '...';
    
    // ЛЕЧИМ ЗАПЯТЫЕ
    let safeCost = String(newCost).replace(',', '.');

    UI.showToast("Сохранение...", "info");

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
        UI.showToast("Сохранено!", "success");
        if(btn) btn.innerText = 'OK';
        setTimeout(() => { if(btn) btn.innerText = 'СОХРАНИТЬ'; }, 2000);
    } catch (e) { 
        UI.showToast("Ошибка", "error"); 
        if(btn) btn.innerText = 'ERR'; 
    }
};

// === 3. УДАЛЕНИЕ (DELETE) ===
window.deleteDbItem = async (calcId, itemId) => {
    UI.showConfirm("Удалить из базы навсегда?", async () => {
        UI.showToast("Удаление...", "info");
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
            
            UI.showToast("Команда отправлена", "success");
            // Визуально скрываем строку, чтобы не ждать обновления гугла
            const row = document.getElementById(`row_${itemId}`);
            if(row) row.style.opacity = '0.3';
            
        } catch (e) { UI.showToast("Ошибка", "error"); }
    });
};

// === СТАНДАРТНЫЕ ФУНКЦИИ КАЛЬКУЛЯТОРА ===
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
    UI.showToast("Синхронизация...", "info");
    const freshData = await fetchGoogleData();
    if (freshData) {
        globalData = freshData;
        localStorage.setItem('pd_cached_prices', JSON.stringify(freshData));
        UI.showToast("Цены обновлены", "success");
    } else {
        const cached = localStorage.getItem('pd_cached_prices');
        if(cached) { globalData = JSON.parse(cached); UI.showToast("Оффлайн (кэш)", "info"); }
        else UI.showToast("Оффлайн (база)", "error");
    }
    const lastId = localStorage.getItem('pd_active_calc_id') || calculatorsDb[0].id;
    window.loadProfile(lastId);
}
document.addEventListener('DOMContentLoaded', init);
