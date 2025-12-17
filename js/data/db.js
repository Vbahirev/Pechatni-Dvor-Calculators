// Резервная база данных (используется, если Google Таблица недоступна)
export const calculatorsDb = [
    {
        id: 'calc_laser_main',
        name: 'Лазерный Цех (Основной)',
        defaultMaterials: [
            { id: 'p3', group: 'plywood', name: 'Фанера 3мм', cost: 0.15 },
            { id: 'p4', group: 'plywood', name: 'Фанера 4мм', cost: 0.18 },
            { id: 'p6', group: 'plywood', name: 'Фанера 6мм', cost: 0.25 },
            { id: 'a3', group: 'acrylic', name: 'Акрил Прозрачный 3мм', cost: 0.45 },
            { id: 'a5', group: 'acrylic', name: 'Акрил Прозрачный 5мм', cost: 0.70 },
            { id: 'pet1', group: 'acrylic', name: 'ПЭТ 1мм', cost: 0.20 }
        ],
        defaultExtras: [
            { id: 'ex1', name: 'Склейка изделий', type: 'fixed', cost: 100 },
            { id: 'ex2', name: 'Фурнитура / Комплектующие', type: 'qty', cost: 50 },
            { id: 'ex3', name: 'Упаковка (Стрейч)', type: 'fixed', cost: 50 }
        ],
        defaultRates: [
            { id: 'cut_plywood', name: 'Резка Фанеры (метр)', type: 'linear', cost: 30 },
            { id: 'cut_acrylic', name: 'Резка Акрила (метр)', type: 'linear', cost: 50 },
            { id: 'print', name: 'УФ Печать', type: 'area', cost: 0.5 },
            { id: 'engrave', name: 'Гравировка', type: 'area', cost: 0.4 },
            { id: 'vinyl', name: 'Накатка Пленки', type: 'area', cost: 0.3 },
            { id: 'paint', name: 'Покраска', type: 'area', cost: 0.3 }
        ]
    },
    {
        id: 'calc_uv_print',
        name: 'Цех УФ Печати',
        defaultMaterials: [
            { id: 'pvc3', group: 'acrylic', name: 'ПВХ 3мм', cost: 0.25 },
            { id: 'pvc5', group: 'acrylic', name: 'ПВХ 5мм', cost: 0.40 },
            { id: 'comp3', group: 'acrylic', name: 'Композит 3мм', cost: 0.60 }
        ],
        defaultExtras: [
            { id: 'ex_lam', name: 'Ламинация', type: 'fixed', cost: 200 },
            { id: 'ex_cut', name: 'Обрезка в край', type: 'qty', cost: 20 }
        ],
        defaultRates: [
            { id: 'cut_basic', name: 'Резка (общая)', type: 'linear', cost: 20 },
            { id: 'print_uv', name: 'Печать 1440dpi', type: 'area', cost: 0.8 },
            { id: 'print_720', name: 'Печать 720dpi', type: 'area', cost: 0.5 }
        ]
    }
];