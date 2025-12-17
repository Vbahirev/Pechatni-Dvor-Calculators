import { state } from './state.js';

export function calculateTotals() {
    let totalMat = 0, totalCut = 0;
    
    const markupEl = document.getElementById('markup');
    const markup = markupEl ? parseFloat(markupEl.value) || 0 : 0;
    const isUrgent = document.getElementById('isUrgent')?.checked;
    
    // 1. Детали
    state.parts.forEach(p => {
        const m = state.materialList.find(x => x.id === p.matId);
        const cost = m ? m.cost : 0;
        
        let cutRateObj = null;
        if(m && m.group === 'plywood') cutRateObj = state.processingRates.find(r => r.id === 'cut_plywood');
        else if(m && m.group === 'acrylic') cutRateObj = state.processingRates.find(r => r.id === 'cut_acrylic');
        
        // Фоллбэк (если спец тарифа нет, ищем любой линейный)
        if(!cutRateObj) cutRateObj = state.processingRates.find(r => r.type === 'linear');

        const cutRateCost = cutRateObj ? cutRateObj.cost : 0;
        
        // Расчет (с отходом 20%)
        const area = p.w * p.h * p.qty;
        totalMat += (area * 1.2) * cost; 
        totalCut += p.cutLen * cutRateCost;
    });

    // 2. Обработка (по площади)
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
        totalExtras += ex.type === 'qty' ? q * ex.cost : q; // q = цена для фиксов
    });

    const costPrice = totalMat + totalCut + totalFinish + totalExtras;
    let salePrice = costPrice * (1 + markup/100);
    if(isUrgent) salePrice *= 1.5;

    return { totalMat, totalCut, totalFinish, totalExtras, costPrice, salePrice };
}