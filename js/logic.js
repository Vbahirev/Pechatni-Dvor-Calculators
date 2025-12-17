import { state } from './state.js';

export function calculateTotals() {
    let totalMat = 0, totalCut = 0;
    const markup = parseFloat(document.getElementById('markup').value) || 0;
    const isUrgent = document.getElementById('isUrgent').checked;
    
    // 1. Считаем Детали
    state.parts.forEach(p => {
        const m = state.materialList.find(x => x.id === p.matId);
        const cost = m ? m.cost : 0;
        
        // --- УМНЫЙ ПОИСК ТАРИФА ---
        let cutRateObj = null;
        if (m) {
            // Если материал - Дерево, ищем тариф, где в названии есть "дерев" или "фанер"
            if (m.group === 'plywood') {
                cutRateObj = state.processingRates.find(r => r.type === 'linear' && (r.name.toLowerCase().includes('дерев') || r.name.toLowerCase().includes('фанер')));
            } 
            // Если материал - Пластик
            else if (m.group === 'acrylic') {
                cutRateObj = state.processingRates.find(r => r.type === 'linear' && (r.name.toLowerCase().includes('пластик') || r.name.toLowerCase().includes('акрил')));
            }
        }
        // Если умный поиск не нашел, берем первый попавшийся тариф "за метр"
        if (!cutRateObj) cutRateObj = state.processingRates.find(r => r.type === 'linear');

        const cutRateCost = cutRateObj ? cutRateObj.cost : 0;
        const area = p.w * p.h * p.qty;
        
        totalMat += (area * 1.2) * cost; 
        totalCut += p.cutLen * cutRateCost;
    });

    // 2. Обработка (Area)
    let totalFinish = 0;
    state.processingRates.filter(r => r.type === 'area').forEach(rate => {
        if(state.activeProcessingChecks[rate.id]) {
            const area = state.activeProcessingAreas[rate.id] || 0;
            totalFinish += area * rate.cost;
        }
    });

    // 3. Допы
    let totalExtras = 0;
    state.extrasCatalogue.forEach(ex => {
        const q = state.activeExtras[ex.id] || 0;
        totalExtras += ex.type === 'qty' ? q * ex.cost : q;
    });

    const costPrice = totalMat + totalCut + totalFinish + totalExtras;
    let salePrice = costPrice * (1 + markup/100);
    if(isUrgent) salePrice *= 1.5;

    return { totalMat, totalCut, totalFinish, totalExtras, costPrice, salePrice };
}
