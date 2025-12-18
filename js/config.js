// Глобальные константы и настройки по умолчанию

const defaultLaserMinuteCost = 60; // RUB/min
const defaultEngravingPricePerCm2 = 5; // RUB/cm2

// База материалов по умолчанию
const defaultMaterials = [
    { id: 'ac_2', inStock: true, type: 'acrylic', name: 'Акрил 2мм', sheetW: 2050, sheetH: 3050, sheetPrice: 8500, speed: 25 },
    { id: 'ac_3', inStock: true, type: 'acrylic', name: 'Акрил 3мм', sheetW: 2050, sheetH: 3050, sheetPrice: 12500, speed: 20 },
    { id: 'ac_5', inStock: true, type: 'acrylic', name: 'Акрил 5мм', sheetW: 2050, sheetH: 3050, sheetPrice: 21000, speed: 12 },
    { id: 'ac_8', inStock: true, type: 'acrylic', name: 'Акрил 8мм', sheetW: 2050, sheetH: 3050, sheetPrice: 34000, speed: 6 },
    { id: 'ac_10', inStock: true, type: 'acrylic', name: 'Акрил 10мм', sheetW: 2050, sheetH: 3050, sheetPrice: 42000, speed: 4 },
    { id: 'ac_3c', inStock: true, type: 'acrylic', name: 'Акрил 3мм Цвет', sheetW: 2050, sheetH: 3050, sheetPrice: 16000, speed: 20 },
    { id: 'ac_3m', inStock: true, type: 'acrylic', name: 'Акрил 3мм Зеркало', sheetW: 1220, sheetH: 2440, sheetPrice: 8500, speed: 18 },
    { id: 'pw_3', inStock: true, type: 'plywood', name: 'Фанера 3мм', sheetW: 1525, sheetH: 1525, sheetPrice: 800, speed: 25 },
    { id: 'pw_6', inStock: true, type: 'plywood', name: 'Фанера 6мм', sheetW: 1525, sheetH: 1525, sheetPrice: 1400, speed: 12 },
    { id: 'pvc_met', inStock: true, type: 'pvc', name: 'ПВХ Металлик', sheetW: 2440, sheetH: 1220, sheetPrice: 5500, speed: 30 }
];

// База покрытий (Цена за м2)
const defaultCoatings = [
    { id: 'none', name: 'Без покрытия', price: 0, inStock: true, forAcrylic: true, forWood: true },
    { id: 'stain', name: 'Морилка (Тонировка)', price: 900, inStock: true, forAcrylic: false, forWood: true },
    { id: 'varnish', name: 'Лак (Матовый)', price: 1200, inStock: true, forAcrylic: false, forWood: true },
    { id: 'paint', name: 'Эмаль (Покраска)', price: 2500, inStock: true, forAcrylic: true, forWood: true },
    { id: 'vinyl', name: 'Пленка Oracal', price: 1800, inStock: true, forAcrylic: true, forWood: false }
];

// База фурнитуры (Цена за штуку)
const defaultHardware = [
    { id: 'h1', name: 'Дистанционный держатель 15мм', price: 150, inStock: true },
    { id: 'h2', name: 'Дистанционный держатель 25мм', price: 220, inStock: true },
    { id: 'h3', name: 'Петля для шкатулки (золото)', price: 45, inStock: true },
    { id: 'h4', name: 'Комплект крепежа', price: 100, inStock: true },
    { id: 'h5', name: 'Скотч 3M (метр)', price: 80, inStock: true },
    { id: 'h6', name: 'Упаковка (стрейч+картон)', price: 300, inStock: true }
];

// База типовых услуг
const defaultServicesDB = [
    { id: 'srv_layout', name: 'Подготовка макета', type: 'fixed', value: 500, active: true },
    { id: 'srv_design', name: 'Дизайн с нуля', type: 'fixed', value: 1500, active: true },
    { id: 'srv_glue', name: 'Склейка изделий', type: 'percent', value: 20, active: true },
    { id: 'srv_assembly', name: 'Сборка конструкции', type: 'percent', value: 15, active: true },
    { id: 'srv_bend', name: 'Термогибка', type: 'fixed', value: 300, active: true },
    { id: 'srv_pack', name: 'Упаковка (Жесткая)', type: 'fixed', value: 400, active: true },
    { id: 'srv_delivery', name: 'Доставка (Курьер)', type: 'fixed', value: 600, active: true },
    { id: 'srv_urgent', name: 'Срочность (День в день)', type: 'percent', value: 50, active: true }
];

const rates = { 
    work: { bend: 75, generalPaint: 0.25 } 
};