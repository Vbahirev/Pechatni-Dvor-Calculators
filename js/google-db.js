// ВСТАВЬТЕ ВАШУ CSV ССЫЛКУ СЮДА (File -> Share -> Publish to web -> CSV)
const GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/ВАШ_ID/pub?output=csv';

export async function fetchGoogleData() {
    try {
        const response = await fetch(GOOGLE_SHEET_URL);
        const text = await response.text();
        return parseCSV(text);
    } catch (error) {
        console.error("Ошибка загрузки:", error);
        return null;
    }
}

function parseCSV(csvText) {
    // Разбиваем на строки, учитывая кавычки Excel
    const lines = csvText.split(/\r?\n/);
    const db = {}; 

    // СЛОВАРИ ПЕРЕВОДА (Русский -> Системный код)
    const calcMap = { 'Лазер': 'calc_laser_main', 'УФ Печать': 'calc_uv_print' };
    const typeMap = { 'Материал': 'material', 'Тариф': 'rate', 'Доп': 'extra' };
    const paramMap = { 
        'Дерево': 'plywood', 'Пластик': 'acrylic', 'Металл': 'metal', 'Другое': 'other',
        'метр': 'linear', 'м2': 'area', 
        'шт': 'qty', 'фикс': 'fixed'
    };

    // Пропускаем заголовок (i=1)
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i]) continue;
        
        // Парсим CSV строку (учитываем запятые внутри кавычек)
        const row = parseCSVLine(lines[i]);
        if(row.length < 5) continue;

        const calcName = row[0].trim(); // Лазер
        const typeName = row[1].trim(); // Материал
        const name = row[2].trim();     // Фанера
        let costStr = row[3].trim();    // 0,15
        const paramName = row[4].trim();// Дерево
        const id = row[5] ? row[5].trim() : ('auto_' + i);

        // Переводим
        const calcId = calcMap[calcName] || 'calc_laser_main';
        const category = typeMap[typeName] || 'material';
        const cost = parseFloat(costStr.replace(',', '.')) || 0;
        
        // Параметр: если есть в словаре - берем код, если нет - оставляем как есть
        let param = paramMap[paramName] || paramName; 
        if (!param) param = 'other';

        // Создаем структуру
        if (!db[calcId]) db[calcId] = { materials: [], rates: [], extras: [] };

        const item = { id, name, cost };

        if (category === 'material') {
            item.group = param; // plywood
            db[calcId].materials.push(item);
        } else if (category === 'rate') {
            item.type = param; // linear
            db[calcId].rates.push(item);
        } else {
            item.type = param; // qty
            db[calcId].extras.push(item);
        }
    }
    return db;
}

// Простой парсер строки CSV
function parseCSVLine(text) {
    let re_valid = /^\s*(?:'[^'\\]*(?:\\[\S\s][^'\\]*)*'|"[^"\\]*(?:\\[\S\s][^"\\]*)*"|[^,'"\s\\]*(?:\s+[^,'"\s\\]+)*)\s*(?:,\s*(?:'[^'\\]*(?:\\[\S\s][^'\\]*)*'|"[^"\\]*(?:\\[\S\s][^"\\]*)*"|[^,'"\s\\]*(?:\s+[^,'"\s\\]+)*)\s*)*$/;
    let re_value = /(?!\s*$)\s*(?:'([^'\\]*(?:\\[\S\s][^'\\]*)*)'|"([^"\\]*(?:\\[\S\s][^"\\]*)*)"|([^,'"\s\\]*(?:\s+[^,'"\s\\]+)*))\s*(?:,|$)/g;
    if (!re_valid.test(text)) return text.split(','); // Fallback
    let a = [];
    text.replace(re_value, function(m0, m1, m2, m3) {
        if (m1 !== undefined) a.push(m1.replace(/\\'/g, "'"));
        else if (m2 !== undefined) a.push(m2.replace(/\\"/g, '"'));
        else if (m3 !== undefined) a.push(m3);
        return '';
    });
    if (/,\s*$/.test(text)) a.push('');
    return a;
}
