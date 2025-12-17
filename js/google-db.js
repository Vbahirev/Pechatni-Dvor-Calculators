// Ссылка на опубликованную CSV таблицу
const GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRpKsp1Z0YcD2ILkM17QmpVPcSPBkjJ22JRM6i9AR-UR5mBI32NckAxtxIr4OLzRHQDyrmyUOpuUejK/pub?output=csv';

export async function fetchGoogleData() {
    try {
        const response = await fetch(GOOGLE_SHEET_URL);
        const text = await response.text();
        return parseCSV(text);
    } catch (error) {
        console.error("Ошибка загрузки Google Таблицы:", error);
        return null;
    }
}

function parseCSV(csvText) {
    const lines = csvText.split('\n').map(line => line.trim()).filter(line => line);
    // Пропускаем заголовок (первая строка)
    
    const db = {}; 

    for (let i = 1; i < lines.length; i++) {
        // Разбиваем строку по запятым
        const row = lines[i].split(',');
        
        // Проверяем, что строка не пустая
        if (row.length < 5) continue;

        const calcId = row[0].trim();
        const category = row[1].trim();
        
        if (!db[calcId]) {
            db[calcId] = { materials: [], extras: [], rates: [] };
        }

        const item = {
            id: row[2].trim(),
            name: row[3].trim(), // Здесь будет русское название
            cost: parseFloat(row[4]),
        };

        // Берем параметр (если есть)
        const param = row[5] ? row[5].trim() : '';

        if (category === 'material') {
            item.group = param; // plywood / acrylic
            db[calcId].materials.push(item);
        } 
        else if (category === 'rate') {
            item.type = param; // linear / area
            db[calcId].rates.push(item);
        } 
        else if (category === 'extra') {
            item.type = param; // fixed / qty
            db[calcId].extras.push(item);
        }
    }

    return db;
}