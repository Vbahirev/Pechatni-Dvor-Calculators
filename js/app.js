import { state } from './state.js';
import { calculateTotals } from './logic.js';
import { calculatorsDb } from './data/db.js';
import { fetchGoogleData } from './google-db.js';
import * as UI from './ui.js';

// Глобальное хранилище данных
let globalData = null;

// === Глобальные функции ===
window.addPart = () => {
    const matId = document.getElementById('newPartMaterial').value;
    const w = parseFloat(document.getElementById('newPartW').value) || 0;
    const h = parseFloat(document.getElementById('newPartH').value) || 0;
    const qty = parseFloat(document.getElementById('newPartQty').value) || 1;
    
    if(w<=0 || h<=0) { UI.showToast("Введите размеры!", "error"); return; }
    
    const perimM = ((w + h) * 2 * qty) / 100;
    state.parts.push({ id: Date.now(), matId, w, h, qty, cutLen: perimM.toFixed(2) });
    
    UI.renderPartsTable();
    window.calculate();
    UI.showToast("Позиция добавлена", "success");
};

window.removePart = (id) => {
    state.parts = state.parts.filter(p => p.id !== id);
    UI.renderPartsTable();
    window.calculate();
};

window.clearParts = () => {
    if(state.parts.length > 0) {
        UI.showConfirm("Удалить все детали?", () => {
            state.parts = []; UI.renderPartsTable(); window.calculate();
        });
    }
};

window.calculate = () => {
    const res = calculateTotals();
    const fmt = (n) => Math.round(n).toLocaleString('ru-RU') + ' ₽';
    
    document.getElementById('resMat').innerText = fmt(res.totalMat);
    document.getElementById('resCut').innerText = fmt(res.totalCut);
    document.getElementById('resFinish').innerText = fmt(res.totalFinish);
    document.getElementById('resExtras').innerText = fmt(res.totalExtras);
    document.getElementById('costPrice').innerText = Math.round(res.costPrice);
    document.getElementById('totalPrice').innerText = fmt(res.salePrice);
};

window.stepInput = (id, step) => {
    const el = document.getElementById(id); let v = parseFloat(el.value) || 0;
    if(v+step >= (id.includes('Qty')?1:0)) el.value = v+step;
};

window.stepPartCut = (id, step) => {
    const p = state.parts.find(x => x.id === id);
    if(p) { let v = parseFloat(p.cutLen) + step; if(v<0) v=0; p.cutLen = v.toFixed(2); UI.renderPartsTable(); window.calculate(); }
};

window.toggleProcessing = (id) => {
    const chk = document.getElementById(`has_${id}`);
    state.activeProcessingChecks[id] = chk.checked;
    if(!chk.checked) {
        state.activeProcessingAreas[id] = 0;
        document.getElementById(`area_${id}`).value = 0;
    }
    UI.renderProcessingSection();
    window.calculate();
};

window.calcArea = (id) => {
    const w = document.getElementById(`w_${id}`).value;
    const h = document.getElementById(`h_${id}`).value;
    const val = Math.ceil(w * h);
    document.getElementById(`area_${id}`).value = val;
    state.activeProcessingAreas[id] = val;
    window.calculate();
};

window.manualArea = (id, val) => {
    state.activeProcessingAreas[id] = parseFloat(val) || 0;
    window.calculate();
};

window.modExtra = (id, step) => {
    if(state.activeExtras[id] === undefined) state.activeExtras[id] = 0;
    const v = state.activeExtras[id] + step;
    if(v>=0) { state.activeExtras[id]=v; UI.renderExtrasSection(); window.calculate(); }
};

window.toggleUrgency = () => {
    const chk = document.getElementById('isUrgent').checked;
    document.getElementById('urgentDot').className = chk ? 'absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition transform translate-x-full bg-red-500' : 'absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition transform';
    window.calculate();
};

window.openCatalog = () => {
    const list = document.getElementById('profilesList');
    list.innerHTML = calculatorsDb.map(c => `
        <div onclick="loadProfile('${c.id}')" class="p-3 mb-2 rounded-lg cursor-pointer transition flex items-center justify-between ${c.id === state.currentCalcId ? 'bg-orange-50 border border-orange-200' : 'bg-white border border-slate-100 hover:border-orange-200'}">
            <span class="font-bold text-slate-700 text-sm">${c.name}</span>
            ${c.id === state.currentCalcId ? '<i class="fas fa-check text-orange-600"></i>' : ''}
        </div>
    `).join('');
    document.getElementById('catalogModal').classList.remove('hidden');
};
window.closeCatalog = () => document.getElementById('catalogModal').classList.add('hidden');

// === УМНАЯ ЗАГРУЗКА ПРОФИЛЯ ===
window.loadProfile = (id) => {
    // 1. Грузим базовый профиль (из db.js)
    const name = state.loadProfile(id);
    
    // 2. Если есть скачанные данные (или кэш), накладываем их сверху
    if(globalData) {
        state.injectExternalData(globalData);
    }
    
    // 3. Рендер
    document.getElementById('currentCalcName').innerText = name;
    document.getElementById('settingsCalcName').innerText = name;
    
    UI.renderMaterialsSelect();
    UI.renderProcessingSection();
    UI.renderExtrasSection();
    UI.renderPartsTable();
    UI.renderSettingsLists();
    window.closeCatalog();
    window.calculate();
};

window.printReceipt = UI.printReceipt;
window.openSettings = UI.openSettings;
window.closeSettings = UI.closeSettings;
window.closeConfirm = UI.closeConfirm;
window.resetOrder = UI.resetOrder;
window.saveData = () => {}; 

// === ГЛАВНАЯ ИНИЦИАЛИЗАЦИЯ ===
async function init() {
    UI.showToast("Проверка цен...", "info");
    
    // 1. Пробуем скачать свежие цены
    const freshData = await fetchGoogleData();

    if (freshData) {
        // УСПЕХ: Интернет есть
        globalData = freshData;
        // Сохраняем "на черный день" в память браузера
        localStorage.setItem('pd_cached_prices', JSON.stringify(freshData));
        UI.showToast("Цены обновлены (Google)", "success");
    } else {
        // ОШИБКА: Интернета нет
        const cached = localStorage.getItem('pd_cached_prices');
        if (cached) {
            // Берем из памяти браузера (то, что скачали в прошлый раз)
            globalData = JSON.parse(cached);
            UI.showToast("Нет сети. Цены из памяти", "info");
        } else {
            // В памяти пусто -> используем db.js
            UI.showToast("Нет сети. Заводские настройки", "error");
        }
    }

    // 2. Запускаем калькулятор
    const lastId = localStorage.getItem('pd_active_calc_id') || calculatorsDb[0].id;
    window.loadProfile(lastId);
}

document.addEventListener('DOMContentLoaded', init);