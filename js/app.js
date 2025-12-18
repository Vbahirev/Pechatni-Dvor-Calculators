// Основная логика приложения

let materials = JSON.parse(JSON.stringify(defaultMaterials));
let coatings = JSON.parse(JSON.stringify(defaultCoatings));
let hardware = JSON.parse(JSON.stringify(defaultHardware));
let servicesDB = JSON.parse(JSON.stringify(defaultServicesDB));

let wastage = 1.25;
let laserMinuteCost = defaultLaserMinuteCost;
let engravingPrice = defaultEngravingPricePerCm2;

let layers = [];
let services = [];
let goods = [];

let isUrgent = false;
let itemToDeleteIndex = -1;
let deleteType = ''; 

// --- Core Functions ---

function init() {
    const savedSettings = localStorage.getItem('monocalc_settings_v98');
    if(savedSettings) {
        const s = JSON.parse(savedSettings);
        materials = s.materials || materials;
        coatings = s.coatings || coatings;
        hardware = s.hardware || hardware;
        servicesDB = s.servicesDB || servicesDB;
        wastage = s.wastage || 1.25;
        laserMinuteCost = s.laserMinuteCost || defaultLaserMinuteCost;
        engravingPrice = s.engravingPrice || defaultEngravingPricePerCm2;
    }

    // Миграция настроек
    coatings.forEach(c => {
        if(typeof c.inStock === 'undefined') c.inStock = true;
        if(typeof c.forAcrylic === 'undefined') c.forAcrylic = true;
        if(typeof c.forWood === 'undefined') c.forWood = true;
    });
    servicesDB.forEach(s => {
        if(typeof s.active === 'undefined') s.active = true;
    });

    const savedData = localStorage.getItem('monocalc_data_v6');
    if (savedData) {
        const d = JSON.parse(savedData);
        document.getElementById('projectName').value = d.proj || "";
        document.getElementById('clientName').value = d.clnt || "";
        layers = d.layers || [];
        
        layers.forEach(l => {
            if (typeof l.hasEngraving === 'undefined') l.hasEngraving = false;
            if (typeof l.engravingMode === 'undefined') l.engravingMode = 'auto';
            if (typeof l.engravingArea === 'undefined') l.engravingArea = 0;
            if (typeof l.engravingW === 'undefined') l.engravingW = 0;
            if (typeof l.engravingH === 'undefined') l.engravingH = 0;
        });

        isUrgent = d.isUrgent || false;
        
        if (d.services) {
            services = d.services.map(s => {
                const dbItem = servicesDB.find(db => db.id === s.dbId);
                if(dbItem) {
                    s.type = dbItem.type;
                    if(s.name === dbItem.name) s.name = ''; 
                }
                return {...s, price: s.price || 0};
            }); 
        }
        
        goods = d.goods || [];
        document.getElementById('discount').value = (d.works && d.works.disc) ? d.works.disc : 0;
        
        if (isUrgent) {
            const btn = document.getElementById('urgencyToggle');
            btn.classList.add('bg-red-600', 'text-white', 'border-red-600');
            btn.classList.remove('bg-white', 'text-gray-500');
        }
        renderLayers();
        renderServices();
        renderGoods();
    } else { 
        if(layers.length === 0) addLayer(false); 
        else renderLayers();
        if(services.length === 0) addService(false);
        else renderServices();
        renderGoods();
    }
    
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.custom-select')) {
            document.querySelectorAll('.custom-select.open').forEach(el => el.classList.remove('open'));
        }
    });

    updateCalc();
    updatePrintLabels(); 
}

function saveState() {
    const data = {
        proj: document.getElementById('projectName').value,
        clnt: document.getElementById('clientName').value,
        layers, services, goods, isUrgent,
        works: { disc: document.getElementById('discount').value }
    };
    localStorage.setItem('monocalc_data_v6', JSON.stringify(data));
}

function saveToLocal() { saveState(); updatePrintLabels(); }

function updatePrintLabels() {
    const proj = document.getElementById('projectName').value || "Без названия";
    const client = document.getElementById('clientName').value || "Частное лицо";
    document.getElementById('printProjectName').innerText = proj;
    document.getElementById('printClientName').innerText = client;
}

// --- Modals & Tabs ---
function openSettings() {
    document.getElementById('settingsModal').classList.remove('hidden');
    document.getElementById('wastageInput').value = wastage;
    document.getElementById('wastageVal').innerText = wastage;
    document.getElementById('laserCostInput').value = laserMinuteCost;
    document.getElementById('engravingPriceInput').value = engravingPrice;
    renderMaterialsSettings();
    renderCoatingsSettings();
    renderHardwareSettings();
    renderServicesSettings();
}
function closeSettings() { document.getElementById('settingsModal').classList.add('hidden'); }
function openProjectInfo() { document.getElementById('projectModal').classList.remove('hidden'); }
function closeProjectInfo() { document.getElementById('projectModal').classList.add('hidden'); }

function switchSettingsTab(tab) {
    document.getElementById('stab-materials').className = `tab-btn ${tab === 'materials' ? 'active' : ''} flex-1 py-2 text-[11px] uppercase tracking-wide font-bold whitespace-nowrap px-4`;
    document.getElementById('stab-coatings').className = `tab-btn ${tab === 'coatings' ? 'active' : ''} flex-1 py-2 text-[11px] uppercase tracking-wide font-bold whitespace-nowrap px-4`;
    document.getElementById('stab-hardware').className = `tab-btn ${tab === 'hardware' ? 'active' : ''} flex-1 py-2 text-[11px] uppercase tracking-wide font-bold whitespace-nowrap px-4`;
    document.getElementById('stab-services').className = `tab-btn ${tab === 'services' ? 'active' : ''} flex-1 py-2 text-[11px] uppercase tracking-wide font-bold whitespace-nowrap px-4`;
    
    document.getElementById('scontent-materials').classList.toggle('hidden', tab !== 'materials');
    document.getElementById('scontent-coatings').classList.toggle('hidden', tab !== 'coatings');
    document.getElementById('scontent-hardware').classList.toggle('hidden', tab !== 'hardware');
    document.getElementById('scontent-services').classList.toggle('hidden', tab !== 'services');
}

function confirmDelete(idx, type) {
    itemToDeleteIndex = idx;
    deleteType = type;
    document.getElementById('deleteConfirmModal').classList.remove('hidden');
}

function closeDeleteConfirm() {
    document.getElementById('deleteConfirmModal').classList.add('hidden');
    itemToDeleteIndex = -1;
}

function performDelete() {
    if (itemToDeleteIndex > -1) {
        if(deleteType === 'material') { materials.splice(itemToDeleteIndex, 1); renderMaterialsSettings(); }
        else if(deleteType === 'coating') { coatings.splice(itemToDeleteIndex, 1); renderCoatingsSettings(); }
        else if(deleteType === 'hardware') { hardware.splice(itemToDeleteIndex, 1); renderHardwareSettings(); }
        else if(deleteType === 'service') { servicesDB.splice(itemToDeleteIndex, 1); renderServicesSettings(); }
        closeDeleteConfirm();
    }
}

// Функции сброса
function openResetConfirm() { document.getElementById('resetConfirmModal').classList.remove('hidden'); }
function closeResetConfirm() { document.getElementById('resetConfirmModal').classList.add('hidden'); }
function performReset() { localStorage.removeItem('monocalc_data_v6'); location.reload(); }
function resetAll() { openResetConfirm(); }


// --- Goods Logic ---
function addGoodsItem() {
    goods.push({ id: Date.now(), hardId: '', customName: '', qty: 1, price: 0 });
    renderGoods(); updateCalc(); saveState();
}

function removeGoodsItem(id) {
    goods = goods.filter(g => g.id !== id);
    renderGoods(); updateCalc(); saveState();
}

function adjGoods(id, delta) {
    const g = goods.find(x => x.id === id);
    if(!g) return;
    g.qty = Math.max(0, parseInt(g.qty || 0) + delta);
    const inp = document.getElementById(`goods-qty-${id}`);
    if(inp) inp.value = g.qty;
    updateCalc(); saveState();
}

function selectGoodsItem(id, hardId) {
    const g = goods.find(x => x.id === id);
    if(!g) return;
    
    if (!hardId) {
        g.hardId = '';
        g.customName = '';
        g.price = 0;
    } else {
        g.hardId = hardId;
        const hItem = hardware.find(h => h.id === hardId);
        if (hItem) {
            g.customName = hItem.name;
            g.price = hItem.price;
        }
    }
    
    document.querySelectorAll('.custom-select.open').forEach(el => el.classList.remove('open'));
    renderGoods(); updateCalc(); saveState();
}

function updateGoodsItem(id, field, val) {
    const g = goods.find(x => x.id === id);
    if(!g) return;

    if (field === 'qty') g.qty = Math.max(0, parseInt(val) || 0);
    else if (field === 'price') g.price = Math.max(0, parseFloat(val) || 0);
    
    updateCalc(); saveState();
}

function buildGoodsSelectHTML(g) {
    let options = [];
    options.push({ value: '', label: 'Выберите товар...', active: !g.hardId });

    hardware.forEach(h => {
        if(h.inStock) {
            options.push({ 
                value: h.id, 
                label: h.name, 
                sub: `${h.price} ₽`, 
                active: g.hardId === h.id 
            });
        }
    });
    
    const activeOpt = options.find(o => o.active) || options[0];
    const currentLabel = activeOpt.label;
    
    const arrowSVG = `<svg class="select-arrow shrink-0 ml-2" width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 1L5 5L9 1"/></svg>`;

    const optionsHTML = options.map(opt => `
        <div class="custom-option ${opt.active ? 'selected' : ''}" 
             onclick="selectGoodsItem(${g.id}, '${opt.value}')">
            <span class="truncate block w-full">${opt.label}</span>
            ${opt.sub ? `<span class="sub-text whitespace-nowrap">${opt.sub}</span>` : ''}
        </div>
    `).join('');

    return `
        <div class="custom-select w-full min-w-0" id="goods-sel-${g.id}">
            <div class="select-trigger" onclick="toggleSelect(this, event)">
                <span class="truncate block w-full">${currentLabel}</span>
                ${arrowSVG}
            </div>
            <div class="select-options custom-scroll">
                ${optionsHTML}
            </div>
        </div>
    `;
}

function renderGoods() {
    const list = document.getElementById('goodsList');
    const emptyMsg = document.getElementById('emptyGoodsMsg');

    if (goods.length === 0) {
        list.innerHTML = ''; emptyMsg.classList.remove('hidden'); return;
    }
    emptyMsg.classList.add('hidden');

    list.innerHTML = goods.map((g, i) => {
        return `
        <tr class="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
            <td class="py-2 pl-4 relative">
                <div class="h-[38px] flex items-center w-full">
                    ${buildGoodsSelectHTML(g)}
                </div>
            </td>
            <td class="py-2 px-2 text-center w-32">
                 <div class="stepper-group h-[38px] border-gray-200">
                    <div class="stepper-btn no-print" onclick="adjGoods(${g.id}, -1)">−</div>
                    <input type="number" id="goods-qty-${g.id}" min="0" value="${g.qty}" onchange="updateGoodsItem(${g.id}, 'qty', this.value)" class="stepper-input font-bold text-gray-900">
                    <div class="stepper-btn no-print" onclick="adjGoods(${g.id}, 1)">+</div>
                 </div>
            </td>
            <td class="py-2 px-2 text-center w-32">
                <div class="flex items-center justify-center gap-2 h-[38px]">
                    <input type="number" min="0" value="${g.price}" onchange="updateGoodsItem(${g.id}, 'price', this.value)" class="w-20 p-1 border border-gray-200 rounded text-center font-bold text-gray-500 outline-none focus:border-black h-[38px]">
                    <span class="text-xs text-gray-400 font-medium whitespace-nowrap">₽</span>
                </div>
            </td>
            <td class="py-2 pr-4 text-right w-24">
                <span class="font-bold text-gray-900 text-xs">${(g.price * g.qty).toLocaleString()} ₽</span>
            </td>
             <td class="py-2 w-8 text-center no-print">
                <button onclick="removeGoodsItem(${g.id})" class="text-gray-300 hover:text-red-500 transition-colors" title="Удалить">✕</button>
            </td>
        </tr>
        `;
    }).join('');
}

// --- Services Logic ---

function addService(animate = true) {
    services.push({ id: Date.now(), dbId: '', name: '', type: 'fixed', value: 0, price: 0 });
    renderServices(animate); updateCalc(); saveState();
}

function removeService(id) {
    services = services.filter(s => s.id !== id);
    renderServices(); updateCalc(); saveState();
}

function adjService(id, delta) {
    const s = services.find(x => x.id === id);
    if (!s) return;
    let val = parseFloat(s.value) || 0;
    val += delta;
    s.value = Math.max(0, val);
    const inp = document.getElementById(`srv-val-${id}`);
    if(inp) inp.value = s.value;
    updateCalc(); saveState();
}

function selectServiceDB(id, dbId) {
    const s = services.find(x => x.id === id);
    if (!s) return;
    
    if (!dbId) {
        s.dbId = '';
        s.value = 0;
        s.price = 0;
    } else {
        s.dbId = dbId;
        const dbItem = servicesDB.find(db => db.id === dbId);
        if (dbItem) {
            s.name = ''; 
            s.type = dbItem.type;
            if (s.type === 'pieces') {
                s.price = dbItem.value; 
                s.value = 1; 
            } else {
                s.value = dbItem.value;
                s.price = 0;
            }
        }
    }
    document.querySelectorAll('.custom-select.open').forEach(el => el.classList.remove('open'));
    renderServices(); updateCalc(); saveState();
}

function updateService(id, field, val) {
    const s = services.find(x => x.id === id);
    if (!s) return;
    if (field === 'value') s.value = Math.max(0, parseFloat(val) || 0);
    updateCalc(); saveState();
}

function buildServiceSelectHTML(s) {
    let options = [];
    options.push({ value: '', label: 'Выберите услугу...', active: !s.dbId });

    servicesDB.forEach(db => {
         if(db.active || db.id === s.dbId) { 
             let subText = '';
             if (db.type === 'fixed') subText = `${db.value} ₽`;
             else if (db.type === 'percent') subText = `${db.value}%`;
             else if (db.type === 'pieces') subText = `x ${db.value} ₽`;

             options.push({ 
                 value: db.id, 
                 label: db.name, 
                 sub: subText,
                 active: s.dbId === db.id 
             });
         }
    });
    
    const activeOpt = options.find(o => o.active) || options[0];
    const currentLabel = activeOpt.label;
    
    const arrowSVG = `<svg class="select-arrow shrink-0 ml-2" width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 1L5 5L9 1"/></svg>`;

    const optionsHTML = options.map(opt => `
        <div class="custom-option ${opt.active ? 'selected' : ''}" 
             onclick="selectServiceDB(${s.id}, '${opt.value}')">
            <span class="truncate block w-full">${opt.label}</span>
            ${opt.sub ? `<span class="sub-text whitespace-nowrap">${opt.sub}</span>` : ''}
        </div>
    `).join('');

    return `
        <div class="custom-select w-full min-w-0" id="srv-sel-${s.id}">
            <div class="select-trigger" onclick="toggleSelect(this, event)">
                <span class="truncate block w-full">${currentLabel}</span>
                ${arrowSVG}
            </div>
            <div class="select-options custom-scroll">
                ${optionsHTML}
            </div>
        </div>
    `;
}

function renderServices(animateLast = false) {
    const list = document.getElementById('servicesList');
    const emptyMsg = document.getElementById('emptyServicesMsg');
    
    if (services.length === 0) {
        list.innerHTML = ''; emptyMsg.classList.remove('hidden'); return;
    }
    emptyMsg.classList.add('hidden');
    
    list.innerHTML = services.map((s, i) => {
        let typeLabel = "RUB";
        if(s.type === 'percent') typeLabel = "%";
        else if(s.type === 'pieces') typeLabel = "ШТ";

        return `
        <tr class="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors relative">
            <td class="py-2 pl-4">
                 <div class="flex items-center gap-2 h-[38px] w-full">
                    ${buildServiceSelectHTML(s)}
                </div>
            </td>
            <td class="py-2 px-2 text-center w-32 relative">
                <div class="h-[38px] flex items-center justify-center">
                    <div class="w-full h-full bg-gray-100 border border-gray-200 rounded-lg flex items-center justify-center text-xs font-bold text-gray-500 select-none" title="Тип задается в настройках">
                        ${typeLabel}
                    </div>
                </div>
            </td>
            <td class="py-2 px-2 text-center w-32">
                <div class="stepper-group h-[38px] border-gray-200">
                    <div class="stepper-btn no-print" onclick="adjService(${s.id}, -1)">−</div>
                    <input type="number" id="srv-val-${s.id}" min="0" value="${s.value}" onchange="updateService(${s.id}, 'value', this.value)" class="stepper-input font-bold text-gray-900" placeholder="${s.type === 'pieces' ? 'Кол-во' : 'Сумма'}">
                    <div class="stepper-btn no-print" onclick="adjService(${s.id}, 1)">+</div>
                </div>
            </td>
            <td class="py-2 pr-4 text-right w-24">
                <span id="srv-res-${s.id}" class="font-bold text-gray-900 text-xs">0 ₽</span>
            </td>
            <td class="py-2 w-8 text-center no-print">
                <button onclick="removeService(${s.id})" class="text-gray-300 hover:text-red-500 transition-colors" title="Удалить">✕</button>
            </td>
        </tr>
    `}).join('');
}

// --- Settings Custom Select Helper ---
function buildSettingsCustomSelect(rowId, currentType) {
    const options = [
        { value: 'fixed', label: 'RUB' },
        { value: 'percent', label: '%' },
        { value: 'pieces', label: 'ШТ' }
    ];
    
    const activeOpt = options.find(o => o.value === currentType) || options[0];
    const arrowSVG = `<svg class="select-arrow" width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 1L5 5L9 1"/></svg>`;
    
    const optionsHTML = options.map(opt => `
        <div class="custom-option ${opt.value === currentType ? 'selected' : ''}" 
             onclick="selectSettingsType(${rowId}, '${opt.value}')">
            <span>${opt.label}</span>
        </div>
    `).join('');

    return `
        <div class="custom-select w-20 mx-auto" id="set-sel-${rowId}">
            <div class="select-trigger" onclick="toggleSelect(this, event)">
                <span class="truncate pr-1">${activeOpt.label}</span>
                ${arrowSVG}
            </div>
            <div class="select-options custom-scroll">
                ${optionsHTML}
            </div>
        </div>
    `;
}

function selectSettingsType(rowIndex, typeVal) {
    servicesDB[rowIndex].type = typeVal;
    renderServicesSettings();
}

// --- Helper: Scroll & Highlight ---
function scrollToLastItem(containerId) {
    setTimeout(() => {
        const container = document.getElementById(containerId);
        if (container && container.lastElementChild) {
            const row = container.lastElementChild;
            row.scrollIntoView({ behavior: 'smooth', block: 'center' });
            row.classList.add('highlight-row');
            setTimeout(() => {
                row.classList.remove('highlight-row');
            }, 2000);
        }
    }, 50);
}

// --- Settings Render ---
// ТИМЛИД ФИКС: Иконка драга теперь имеет pointer-events-none и класс для стиля
const dragIcon = `<svg class="w-4 h-4 mx-auto text-gray-400 pointer-events-none" viewBox="0 0 24 24" fill="currentColor"><path d="M7 19c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm10 12c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>`;

function renderMaterialsSettings() {
    const currentLaserCost = parseFloat(document.getElementById('laserCostInput')?.value) || laserMinuteCost;
    const container = document.getElementById('materialsSettingsList');

    container.innerHTML = materials.map((m, i) => {
        // ТИМЛИД ФИКС: Класс drag-handle теперь на TD для максимальной зоны клика
        return `
        <tr class="draggable-row ${m.inStock ? '' : 'out-of-stock'}" draggable="true" data-list="materials" data-mat-id="${m.id}">
            <td class="pl-2 cursor-grab drag-handle w-10 text-center select-none" title="Потяните для сортировки"><div class="py-3">${dragIcon}</div></td>
            <td class="pl-1 pr-4"><input type="checkbox" ${m.inStock ? 'checked' : ''} onchange="toggleStock(${i}, 'material')" class="stock-checkbox"></td>
            <td class="pl-2"><input type="text" value="${m.name}" onchange="updateMatProp(${i}, 'name', this.value)" class="settings-input text-left border-dashed"></td>
            <td><div class="flex items-center gap-1 justify-center"><input type="number" min="0" value="${m.sheetW}" onchange="updateMatProp(${i}, 'sheetW', this.value)" class="settings-input w-12"><span class="text-gray-400">x</span><input type="number" min="0" value="${m.sheetH}" onchange="updateMatProp(${i}, 'sheetH', this.value)" class="settings-input w-12"></div></td>
            <td><input type="number" min="0" value="${m.sheetPrice}" onchange="updateMatProp(${i}, 'sheetPrice', this.value)" class="settings-input w-16 mx-auto block"></td>
            <td><input type="number" min="0" value="${m.speed}" onchange="updateMatProp(${i}, 'speed', this.value)" class="settings-input w-12 mx-auto block"></td>
            <td class="text-right pr-2"><button onclick="confirmDelete(${i}, 'material')" class="text-[10px] font-bold text-red-400 bg-red-50 hover:bg-red-100 hover:text-red-600 py-1 px-2 rounded transition-colors uppercase">Удалить</button></td>
        </tr>
    `}).join('');
    initDragEvents();
}

function renderCoatingsSettings() {
    const container = document.getElementById('coatingsSettingsList');
    
    container.innerHTML = coatings.map((c, i) => {
        if(c.id === 'none') return ''; 
        return `
        <tr class="draggable-row ${c.inStock ? '' : 'out-of-stock'}" draggable="true" data-list="coatings" data-coat-id="${c.id}">
            <td class="pl-2 cursor-grab drag-handle w-10 text-center select-none"><div class="py-3">${dragIcon}</div></td>
            <td class="pl-1 pr-4"><input type="checkbox" ${c.inStock ? 'checked' : ''} onchange="toggleStock(${i}, 'coating')" class="stock-checkbox"></td>
            <td class="pl-2"><input type="text" value="${c.name}" onchange="updateCoatingProp(${i}, 'name', this.value)" class="settings-input text-left border-dashed"></td>
            <td><input type="number" min="0" value="${c.price}" onchange="updateCoatingProp(${i}, 'price', this.value)" class="settings-input w-24 mx-auto block"></td>
            <td class="text-center"><input type="checkbox" ${c.forAcrylic ? 'checked' : ''} onchange="toggleCoatingType(${i}, 'forAcrylic')" class="type-checkbox"></td>
            <td class="text-center"><input type="checkbox" ${c.forWood ? 'checked' : ''} onchange="toggleCoatingType(${i}, 'forWood')" class="type-checkbox"></td>
            <td class="text-right pr-2"><button onclick="confirmDelete(${i}, 'coating')" class="text-[10px] font-bold text-red-400 bg-red-50 hover:bg-red-100 hover:text-red-600 py-1 px-2 rounded transition-colors uppercase">Удалить</button></td>
        </tr>
    `}).join('');
    initDragEvents(); 
}

function renderHardwareSettings() {
    const container = document.getElementById('hardwareSettingsList');
    
    container.innerHTML = hardware.map((h, i) => {
        return `
        <tr class="draggable-row ${h.inStock ? '' : 'out-of-stock'}" draggable="true" data-list="hardware" data-hard-id="${h.id}">
            <td class="pl-2 cursor-grab drag-handle w-10 text-center select-none"><div class="py-3">${dragIcon}</div></td>
            <td class="pl-1 pr-4"><input type="checkbox" ${h.inStock ? 'checked' : ''} onchange="toggleStock(${i}, 'hardware')" class="stock-checkbox"></td>
            <td class="pl-2"><input type="text" value="${h.name}" onchange="updateHardwareProp(${i}, 'name', this.value)" class="settings-input text-left border-dashed"></td>
            <td><input type="number" min="0" value="${h.price}" onchange="updateHardwareProp(${i}, 'price', this.value)" class="settings-input w-24 mx-auto block"></td>
            <td class="text-right pr-2"><button onclick="confirmDelete(${i}, 'hardware')" class="text-[10px] font-bold text-red-400 bg-red-50 hover:bg-red-100 hover:text-red-600 py-1 px-2 rounded transition-colors uppercase">Удалить</button></td>
        </tr>
    `}).join('');
    initDragEvents(); 
}

function renderServicesSettings() {
    const container = document.getElementById('servicesSettingsList');
    
    container.innerHTML = servicesDB.map((s, i) => {
        return `
        <tr class="draggable-row" draggable="true" data-list="servicesDB" data-srv-id="${s.id}">
            <td class="pl-2 cursor-grab drag-handle w-10 text-center select-none"><div class="py-3">${dragIcon}</div></td>
            <td class="pl-1 pr-4"><input type="checkbox" ${s.active ? 'checked' : ''} onchange="toggleStock(${i}, 'service')" class="stock-checkbox" title="Отображать в калькуляторе"></td>
            <td class="pl-2"><input type="text" value="${s.name}" onchange="updateServiceDBProp(${i}, 'name', this.value)" class="settings-input text-left border-dashed"></td>
            <td class="text-center relative">
                ${buildSettingsCustomSelect(i, s.type)}
            </td>
            <td><input type="number" min="0" value="${s.value}" onchange="updateServiceDBProp(${i}, 'value', this.value)" class="settings-input w-20 mx-auto block"></td>
            <td class="text-right pr-2"><button onclick="confirmDelete(${i}, 'service')" class="text-[10px] font-bold text-red-400 bg-red-50 hover:bg-red-100 hover:text-red-600 py-1 px-2 rounded transition-colors uppercase">Удалить</button></td>
        </tr>
    `}).join('');
    initDragEvents();
}

function updateServiceDBProp(idx, field, val) {
    if(field === 'name' || field === 'type') servicesDB[idx][field] = val;
    else servicesDB[idx][field] = Math.max(0, parseFloat(val) || 0);
}

function addNewServiceInSettings() {
    servicesDB.push({ id: `srv_${Date.now()}`, name: 'Новая услуга', type: 'fixed', value: 500, active: true });
    renderServicesSettings();
    scrollToLastItem('servicesSettingsList');
}

function updateHardwareProp(idx, field, val) {
    if(field === 'name') hardware[idx][field] = val;
    else hardware[idx][field] = Math.max(0, parseFloat(val) || 0);
}

function addNewHardware() {
    hardware.push({ id: `hard_${Date.now()}`, name: 'Новый товар', price: 100, inStock: true });
    renderHardwareSettings();
    scrollToLastItem('hardwareSettingsList');
}

function updateCoatingProp(idx, field, val) {
    if(field === 'name') coatings[idx][field] = val;
    else coatings[idx][field] = Math.max(0, parseFloat(val) || 0);
}

function toggleCoatingType(idx, field) { coatings[idx][field] = !coatings[idx][field]; }

function addNewCoating() {
    coatings.push({ id: `coat_${Date.now()}`, name: 'Новое покрытие', price: 1000, inStock: true, forAcrylic: true, forWood: true });
    renderCoatingsSettings();
    scrollToLastItem('coatingsSettingsList');
}

function updateMatProp(idx, field, val) { 
    if(field === 'name') materials[idx][field] = val;
    else {
        materials[idx][field] = Math.max(0, parseFloat(val));
        if(field === 'speed') renderMaterialsSettings();
    }
}
function toggleStock(idx, type) { 
    if(type === 'material') { materials[idx].inStock = !materials[idx].inStock; renderMaterialsSettings(); }
    else if(type === 'coating') { coatings[idx].inStock = !coatings[idx].inStock; renderCoatingsSettings(); }
    else if(type === 'hardware') { hardware[idx].inStock = !hardware[idx].inStock; renderHardwareSettings(); }
    else if(type === 'service') { servicesDB[idx].active = !servicesDB[idx].active; renderServicesSettings(); }
}

function addNewMaterial() {
    materials.push({ id: `custom_${Date.now()}`, inStock: true, type: 'custom', name: 'Новый материал', sheetW: 2000, sheetH: 3000, sheetPrice: 5000, speed: 20 });
    renderMaterialsSettings();
    scrollToLastItem('materialsSettingsList');
}

let dragRowEl = null;

function initDragEvents() {
    const rows = document.querySelectorAll('.draggable-row'); 
    rows.forEach(row => {
        row.addEventListener('dragstart', (e) => {
            // ТИМЛИД ФИКС: Если клик не по ручке (td.drag-handle), то запрещаем драг
            if (!e.target.closest('.drag-handle')) {
                e.preventDefault();
                return;
            }
            dragRowEl = row; 
            e.dataTransfer.effectAllowed = 'move';
            // Задержка чтобы браузер успел создать "призрак" перетаскивания
            setTimeout(() => row.classList.add('dragging'), 0);
        });
        
        row.addEventListener('dragend', () => {
            row.classList.remove('dragging'); 
            dragRowEl = null;
            const listType = row.getAttribute('data-list');
            
            // Синхронизация
            if(listType === 'materials') syncOrder('materials');
            else if(listType === 'coatings') syncOrder('coatings');
            else if(listType === 'hardware') syncOrder('hardware');
            else if(listType === 'servicesDB') syncOrder('servicesDB');
        });
        
        row.addEventListener('dragover', (e) => {
            e.preventDefault(); 
            e.dataTransfer.dropEffect = 'move';
            
            if (!dragRowEl || row === dragRowEl) return;
            if (dragRowEl.getAttribute('data-list') !== row.getAttribute('data-list')) return;
            
            const container = row.parentElement; 
            const siblings = [...container.children];
            const draggingIdx = siblings.indexOf(dragRowEl);
            const targetIdx = siblings.indexOf(row);
            
            // Простая логика перестановки в DOM
            if (draggingIdx < targetIdx) {
                container.insertBefore(dragRowEl, row.nextSibling);
            } else {
                container.insertBefore(dragRowEl, row);
            }
        });
    });
}

function syncOrder(listType) {
    if(listType === 'materials') {
        const rows = document.querySelectorAll('#materialsSettingsList .draggable-row');
        const newOrder = [];
        rows.forEach(row => { const id = row.getAttribute('data-mat-id'); const item = materials.find(m => m.id === id); if (item) newOrder.push(item); });
        materials = newOrder; renderMaterialsSettings();
    } else if (listType === 'coatings') {
        const rows = document.querySelectorAll('#coatingsSettingsList .draggable-row');
        const newOrder = [];
        const noneCoating = coatings.find(c => c.id === 'none'); if(noneCoating) newOrder.push(noneCoating);
        rows.forEach(row => { const id = row.getAttribute('data-coat-id'); const item = coatings.find(c => c.id === id); if (item) newOrder.push(item); });
        coatings = newOrder; renderCoatingsSettings();
    } else if (listType === 'hardware') {
        const rows = document.querySelectorAll('#hardwareSettingsList .draggable-row');
        const newOrder = [];
        rows.forEach(row => { const id = row.getAttribute('data-hard-id'); const item = hardware.find(h => h.id === id); if (item) newOrder.push(item); });
        hardware = newOrder; renderHardwareSettings();
    } else if (listType === 'servicesDB') {
        const rows = document.querySelectorAll('#servicesSettingsList .draggable-row');
        const newOrder = [];
        rows.forEach(row => { const id = row.getAttribute('data-srv-id'); const item = servicesDB.find(s => s.id === id); if (item) newOrder.push(item); });
        servicesDB = newOrder; renderServicesSettings();
    }
}

function saveSettings() {
    wastage = Math.max(1, parseFloat(document.getElementById('wastageInput').value));
    laserMinuteCost = Math.max(0, parseFloat(document.getElementById('laserCostInput').value));
    engravingPrice = Math.max(0, parseFloat(document.getElementById('engravingPriceInput').value));
    localStorage.setItem('monocalc_settings_v98', JSON.stringify({ materials, coatings, hardware, servicesDB, wastage, laserMinuteCost, engravingPrice }));
    closeSettings(); updateCalc(); renderLayers(); renderGoods(); renderServices();
}

function adjLayer(id, field, delta) {
    const l = layers.find(x => x.id === id);
    if (!l) return;
    let val = parseFloat(l[field]) || 0;
    if (field === 'cut') val = Math.round((val + delta) * 10) / 10;
    else val += delta;
    l[field] = Math.max(0, val);
    
    const inp = document.getElementById(`in-${field}-${id}`);
    if(inp) inp.value = l[field];
    
    if (field === 'w' || field === 'h') {
        l.area = l.w * l.h;
        const aInp = document.getElementById(`in-area-${id}`);
        if(aInp) aInp.value = l.area;
    }
    updateCalc(); saveState();
}

function updateLayerDirect(id, field, val) {
    const l = layers.find(x => x.id === id);
    if (!l) return;
    if (field === 'hasEngraving') { l[field] = val; renderLayers(); }
    else {
        l[field] = Math.max(0, parseFloat(val) || 0);
        if (field === 'w' || field === 'h') {
            l.area = l.w * l.h;
            const aInp = document.getElementById(`in-area-${id}`);
            if(aInp) aInp.value = l.area;
        }
    }
    updateCalc(); saveState();
}

function toggleEngravingMode(id, mode) {
    const l = layers.find(x => x.id === id);
    if (!l) return;
    l.engravingMode = mode; renderLayers(); saveState();
}

function updateEngravingData(id, type, val) {
    const l = layers.find(x => x.id === id);
    if (!l) return;
    const value = Math.max(0, parseFloat(val) || 0);

    if (type === 'manual_area') l.engravingArea = value;
    else {
        if (type === 'w') l.engravingW = value;
        if (type === 'h') l.engravingH = value;
        l.engravingArea = Math.round((l.engravingW * l.engravingH) * 10) / 10;
    }
    if (l.engravingMode === 'auto') {
        const areaSpan = document.getElementById(`engrav-area-display-${id}`);
        if(areaSpan) areaSpan.innerText = l.engravingArea;
    }
    updateCalc(); saveState();
}

function addLayer(animate = true) {
    const newId = Date.now();
    layers.push({ id: newId, matId: materials[0]?.id, w: 10, h: 10, area: 100, cut: 0.5, qty: 1, finishing: 'none', hasEngraving: false, engravingMode: 'auto', engravingArea: 0, engravingW: 0, engravingH: 0 });
    renderLayers(animate); updateCalc(); saveState();
}

function removeLayer(id) {
    // Анимация удаления
    const div = document.getElementById('layersList').children[[...document.getElementById('layersList').children].findIndex(el => el.innerHTML.includes(`removeLayer(${id})`))];
    if (div) {
        div.classList.add('removing');
        setTimeout(() => {
            layers = layers.filter(x => x.id !== id);
            renderLayers(); updateCalc(); saveState();
        }, 300); // 300ms matches CSS animation
    } else {
        layers = layers.filter(x => x.id !== id);
        renderLayers(); updateCalc(); saveState();
    }
}

function buildCustomSelectHTML(layerId, type, currentValue) {
    let options = [];
    let currentLabel = "Выбрать";
    
    if (type === 'material') {
        options = materials.map(m => ({
            value: m.id, label: m.name, sub: m.inStock ? '' : 'Нет в наличии', active: m.id === currentValue, disabled: !m.inStock
        }));
    } else if (type === 'finishing') {
        const l = layers.find(x => x.id === layerId);
        const mat = materials.find(m => m.id === l.matId) || materials[0];
        const isAcrylicType = (mat.type === 'acrylic' || mat.type === 'pvc');
        
        options = coatings.filter(c => {
             if (c.id === 'none') return true;
             if (!c.inStock && c.id !== currentValue) return false;
             if (isAcrylicType) return c.forAcrylic;
             else return c.forWood;
        }).map(c => ({
            value: c.id, label: c.name, sub: c.price > 0 ? `${c.price} ₽/м²` : '', active: c.id === currentValue
        }));
        
        if (!options.some(o => o.active)) {
             const defaultOpt = options.find(o => o.value === 'none'); if(defaultOpt) defaultOpt.active = true;
        }
    }

    const activeOpt = options.find(o => o.active) || options[0];
    currentLabel = activeOpt ? activeOpt.label : "Выбрать";

    const optionsHTML = options.map(opt => `
        <div class="custom-option ${opt.active ? 'selected' : ''} ${opt.disabled ? 'opacity-50 cursor-not-allowed' : ''}" 
             onclick="${!opt.disabled ? `selectOption('${layerId}', '${type === 'material' ? 'matId' : 'finishing'}', '${opt.value}')` : ''}">
            <span>${opt.label}</span>
            ${opt.sub ? `<span class="sub-text">${opt.sub}</span>` : ''}
        </div>
    `).join('');

    const arrowSVG = `<svg class="select-arrow" width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 1L5 5L9 1"/></svg>`;

    return `
        <div class="custom-select" id="select-${type}-${layerId}">
            <div class="select-trigger" onclick="toggleSelect(this, event)">
                <span class="truncate pr-2">${currentLabel}</span>
                ${arrowSVG}
            </div>
            <div class="select-options custom-scroll">
                ${optionsHTML}
            </div>
        </div>
    `;
}

function toggleSelect(trigger, e) {
    e.stopPropagation();
    const parent = trigger.parentElement;
    if (parent.classList.contains('open')) { parent.classList.remove('open'); } 
    else { document.querySelectorAll('.custom-select.open').forEach(el => el.classList.remove('open')); parent.classList.add('open'); }
}

function selectOption(layerId, field, value) {
    const id = parseInt(layerId);
    const l = layers.find(x => x.id === id);
    if (!l) return;
    l[field] = value;
    if(field === 'matId') l.finishing = 'none';
    document.querySelectorAll('.custom-select.open').forEach(el => el.classList.remove('open'));
    updateCalc(); saveState(); renderLayers(); 
}

function renderLayers(animateLast = false) {
    const list = document.getElementById('layersList');
    list.innerHTML = '';
    
    layers.forEach((l, i) => {
        const div = document.createElement('div');
        div.className = 'pro-card p-5 bg-white part-row relative';
        if (animateLast && i === layers.length - 1) {
            div.classList.add('adding');
            requestAnimationFrame(() => { setTimeout(() => div.classList.remove('adding'), 50); });
        }

        let engravingInputs = '';
        const isManual = l.engravingMode === 'manual';

        if (!isManual) {
            engravingInputs = `
                <div class="flex items-center gap-1 animate-fade-in">
                    <input type="number" min="0" placeholder="W" value="${l.engravingW}" oninput="updateEngravingData(${l.id}, 'w', this.value)" class="w-12 p-1 border border-gray-200 rounded text-center text-xs font-bold focus:border-black outline-none bg-gray-50">
                    <span class="text-gray-400 text-xs">x</span>
                    <input type="number" min="0" placeholder="H" value="${l.engravingH}" oninput="updateEngravingData(${l.id}, 'h', this.value)" class="w-12 p-1 border border-gray-200 rounded text-center text-xs font-bold focus:border-black outline-none bg-gray-50">
                    <span class="text-xs font-bold text-gray-400 ml-2">= <span id="engrav-area-display-${l.id}" class="text-gray-900">${l.engravingArea}</span> см²</span>
                </div>
            `;
        } else {
            engravingInputs = `
                <div class="flex items-center gap-2 animate-fade-in">
                    <input type="number" min="0" placeholder="Площадь" value="${l.engravingArea}" oninput="updateEngravingData(${l.id}, 'manual_area', this.value)" class="w-20 p-1 border border-gray-200 rounded text-center text-xs font-bold focus:border-black outline-none bg-white">
                    <span class="text-xs font-bold text-gray-400">см²</span>
                </div>
            `;
        }

        div.innerHTML = `
            <div class="flex justify-between items-center mb-4">
                <div class="flex items-center gap-2">
                    <span class="bg-gray-900 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-sm">СЛОЙ #${i+1}</span>
                </div>
                <button onclick="removeLayer(${l.id})" class="text-[10px] font-bold text-gray-300 hover:text-red-500 uppercase no-print transition-colors">Удалить слой</button>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4">
                <div class="md:col-span-5 relative z-20">
                    <label class="label-xs mb-1.5 block">Материал</label>
                    ${buildCustomSelectHTML(l.id, 'material', l.matId)}
                </div>
                <div class="md:col-span-2"><label class="label-xs mb-1.5 block">Ширина (см)</label>
                    <div class="stepper-group"><div class="stepper-btn no-print" onclick="adjLayer(${l.id}, 'w', -1)">-</div>
                    <input type="number" id="in-w-${l.id}" min="0" value="${l.w}" oninput="updateLayerDirect(${l.id}, 'w', this.value)" class="stepper-input">
                    <div class="stepper-btn no-print" onclick="adjLayer(${l.id}, 'w', 1)">+</div></div>
                </div>
                <div class="md:col-span-2"><label class="label-xs mb-1.5 block">Высота (см)</label>
                    <div class="stepper-group"><div class="stepper-btn no-print" onclick="adjLayer(${l.id}, 'h', -1)">-</div>
                    <input type="number" id="in-h-${l.id}" min="0" value="${l.h}" oninput="updateLayerDirect(${l.id}, 'h', this.value)" class="stepper-input">
                    <div class="stepper-btn no-print" onclick="adjLayer(${l.id}, 'h', 1)">+</div></div>
                </div>
                 <div class="md:col-span-3"><label class="label-xs mb-1.5 block">Площадь (кв/см)</label>
                    <div class="stepper-group border-gray-200 bg-gray-50">
                    <input type="number" id="in-area-${l.id}" min="0" value="${l.area}" oninput="updateLayerDirect(${l.id}, 'area', this.value)" class="stepper-input font-bold text-gray-600">
                    </div>
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-4 pt-4 border-t border-gray-100 relative z-10">
                 <div class="md:col-span-3"><label class="label-xs mb-1.5 block">Рез (метр)</label>
                    <div class="stepper-group"><div class="stepper-btn no-print" onclick="adjLayer(${l.id}, 'cut', -0.1)">-</div>
                    <input type="number" id="in-cut-${l.id}" min="0" value="${l.cut}" step="0.1" oninput="updateLayerDirect(${l.id}, 'cut', this.value)" class="stepper-input">
                    <div class="stepper-btn no-print" onclick="adjLayer(${l.id}, 'cut', 0.1)">+</div></div>
                </div>
                <div class="md:col-span-5 relative z-10">
                    <label class="label-xs mb-1.5 block">Отделка (Покрытие)</label>
                    ${buildCustomSelectHTML(l.id, 'finishing', l.finishing)}
                </div>
                <div class="md:col-span-4"><label class="label-xs mb-1.5 block">Количество (шт)</label>
                    <div class="stepper-group border-gray-300">
                        <div class="stepper-btn no-print" onclick="adjLayer(${l.id}, 'qty', -1)">−</div>
                        <input type="number" id="in-qty-${l.id}" min="0" value="${l.qty}" oninput="updateLayerDirect(${l.id}, 'qty', this.value)" class="stepper-input font-bold text-lg">
                        <div class="stepper-btn no-print" onclick="adjLayer(${l.id}, 'qty', 1)">+</div>
                    </div>
                </div>
            </div>
            <div class="mt-4 pt-3 border-t border-dashed border-gray-200">
                <div class="flex flex-col sm:flex-row sm:items-center gap-3 min-h-[38px]">
                    <div class="flex items-center gap-3">
                        <label class="flex items-center gap-2 cursor-pointer select-none">
                            <input type="checkbox" ${l.hasEngraving ? 'checked' : ''} onchange="updateLayerDirect(${l.id}, 'hasEngraving', this.checked)" class="w-4 h-4 accent-gray-900 rounded border-gray-300">
                            <span class="text-xs font-bold text-gray-700">Гравировка</span>
                        </label>
                        ${l.hasEngraving ? `
                            <div class="flex bg-gray-100 p-0.5 rounded-lg no-print">
                                <button onclick="toggleEngravingMode(${l.id}, 'auto')" class="px-2 py-0.5 rounded text-[10px] font-bold transition-all ${!isManual ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-gray-600'}">ШхВ</button>
                                <button onclick="toggleEngravingMode(${l.id}, 'manual')" class="px-2 py-0.5 rounded text-[10px] font-bold transition-all ${isManual ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-gray-600'}">Ручной</button>
                            </div>
                        ` : ''}
                    </div>
                    ${l.hasEngraving ? `<div class="ml-0 sm:ml-auto">${engravingInputs}</div>` : ''}
                </div>
            </div>
        `;
        list.appendChild(div);
    });
}

function updateCalc() {
    let lSum = 0, fSum = 0;
    layers.forEach(l => {
        const m = materials.find(x => x.id === l.matId) || materials[0];
        const sheetAreaCm2 = (m.sheetW / 10) * (m.sheetH / 10);
        const pricePerCm2 = m.sheetPrice / sheetAreaCm2;
        const matCost = l.area * pricePerCm2 * wastage;
        
        const cutLengthMm = l.cut * 1000;
        const cutTimeSeconds = cutLengthMm / m.speed;
        const cutTimeMinutes = cutTimeSeconds / 60;
        const cutCost = cutTimeMinutes * parseFloat(document.getElementById('laserCostInput')?.value || laserMinuteCost);
        
        const engravingCost = l.hasEngraving ? (l.engravingArea * engravingPrice) : 0;

        lSum += (matCost + cutCost + engravingCost) * l.qty;
        
        if (l.finishing !== 'none') {
            const coat = coatings.find(c => c.id === l.finishing);
            if (coat) {
                const pricePerCm2Finish = coat.price / 10000;
                fSum += (l.area * pricePerCm2Finish) * l.qty;
            }
        }
    });

    let servicesSum = 0;
    const baseCostForPercent = lSum; 

    services.forEach(s => {
        let val = 0;
        if (s.type === 'fixed') val = s.value;
        else if (s.type === 'pieces') val = s.value * (s.price || 0); 
        else val = baseCostForPercent * (s.value / 100);
        
        servicesSum += val;
        
        const el = document.getElementById(`srv-res-${s.id}`);
        if(el) el.innerText = Math.round(val).toLocaleString() + ' ₽';
    });

    let goodsSum = 0;
    goods.forEach(g => { goodsSum += (g.price * g.qty); });

    const discount = Math.max(0, parseFloat(document.getElementById('discount').value) || 0);

    let sub = lSum + fSum + servicesSum + goodsSum;
    let urg = isUrgent ? sub * 0.5 : 0;
    let grand = Math.max(0, sub + urg - discount);

    document.getElementById('resLayers').innerText = Math.round(lSum).toLocaleString() + ' ₽';
    document.getElementById('resFinishing').innerText = Math.round(fSum).toLocaleString() + ' ₽';
    document.getElementById('resWorks').innerText = Math.round(servicesSum).toLocaleString() + ' ₽';
    document.getElementById('resGoods').innerText = Math.round(goodsSum).toLocaleString() + ' ₽';
    document.getElementById('resUrgency').innerText = '+ ' + Math.round(urg).toLocaleString() + ' ₽';
    document.getElementById('totalPrice').innerText = Math.round(grand).toLocaleString() + ' ₽';
}

function switchTab(t) {
    document.getElementById('sectionLayers').classList.toggle('hidden', t !== 'layers');
    document.getElementById('sectionWorks').classList.toggle('hidden', t !== 'works');
    document.getElementById('tabLayers').classList.toggle('active', t === 'layers');
    document.getElementById('tabWorks').classList.toggle('active', t === 'works');
}

function toggleUrgency() {
    isUrgent = !isUrgent;
    const btn = document.getElementById('urgencyToggle');
    if(isUrgent) { btn.classList.add('bg-red-600', 'text-white', 'border-red-600'); btn.classList.remove('bg-white', 'text-gray-500'); }
    else { btn.classList.remove('bg-red-600', 'text-white', 'border-red-600'); btn.classList.add('bg-white', 'text-gray-500'); }
    document.getElementById('urgencyRow').classList.toggle('hidden', !isUrgent);
    updateCalc(); saveState();
}

function copyQuote() {
    const pr = document.getElementById('projectName').value || "Проект";
    const cl = document.getElementById('clientName').value || "Клиент";
    const tot = document.getElementById('totalPrice').innerText;
    let t = `ЗАКАЗ: ${pr}\nКлиент: ${cl}\n\n`;
    layers.forEach((l,i) => {
        const m = materials.find(x => x.id === l.matId);
        t += `${i+1}. ${m.name} (${l.w}x${l.h}см) x ${l.qty} шт.\n`;
        if(l.hasEngraving) t += `   + Гравировка: ${l.engravingArea} см²\n`;
        if(l.finishing !== 'none') {
             const c = coatings.find(x => x.id === l.finishing); if(c) t += `   + Покрытие: ${c.name}\n`;
        }
    });
    if(services.length > 0) {
        t += `\nУслуги:\n`;
        services.forEach(s => {
            let val = '';
            if (s.type === 'fixed') val = s.value + ' ₽';
            else if (s.type === 'percent') val = s.value + '%';
            else if (s.type === 'pieces') val = `${s.value} шт x ${s.price} ₽`;
            
            const dbItem = servicesDB.find(x => x.id === s.dbId);
            const mainName = dbItem ? dbItem.name : 'Услуга';
            const note = s.name ? ` (${s.name})` : '';
            
            t += `- ${mainName}${note}: ${val}\n`;
        });
    }
    if(goods.length > 0) {
        t += `\nТовары:\n`;
        goods.forEach(g => { t += `- ${g.customName || 'Товар'}: ${g.qty} шт. x ${g.price} ₽\n`; });
    }
    t += `\nИТОГО: ${tot}`;
    const el = document.createElement('textarea'); el.value = t; document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el);
    const a = document.getElementById('copyAlert'); a.classList.remove('hidden'); setTimeout(() => a.classList.add('hidden'), 1500);
}

function resetAll() { if(confirm("Очистить?")) { localStorage.removeItem('monocalc_data_v6'); location.reload(); } }

window.onload = init;