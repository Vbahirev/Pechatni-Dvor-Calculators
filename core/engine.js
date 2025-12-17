export function computeTotals({
  parts,
  materials,
  rates,
  extrasCatalogue,
  activeExtras,
  activeProcessingChecks,
  activeProcessingAreas,
  markupPct,
  urgentMultiplier
}){
  let totalMat = 0, totalCut = 0;

  // Parts: material + cutting
  for(const p of parts){
    const m = materials.find(x=>x.id===p.matId);
    const matCost = m ? m.cost : 0;

    let cutRateObj = null;
    if(m && m.group === 'plywood') cutRateObj = rates.find(r=>r.id==='cut_plywood');
    else if(m && m.group === 'acrylic') cutRateObj = rates.find(r=>r.id==='cut_acrylic');

    if(!cutRateObj) cutRateObj = rates.find(r=>r.type==='linear');
    const cutRate = cutRateObj ? cutRateObj.cost : 0;

    const area = p.w * p.h * p.qty;
    totalMat += (area * 1.2) * matCost; // waste 20%
    totalCut += (parseFloat(p.cutLen)||0) * cutRate;
  }

  // Processing (area-based)
  let totalFinish = 0;
  for(const rate of rates.filter(r=>r.type==='area')){
    if(activeProcessingChecks[rate.id]){
      const area = activeProcessingAreas[rate.id] || 0;
      totalFinish += area * rate.cost;
    }
  }

  // Extras
  let totalExtras = 0;
  for(const ex of extrasCatalogue){
    const q = activeExtras[ex.id] || 0;
    totalExtras += ex.type === 'qty' ? q * ex.cost : q;
  }

  const costPrice = totalMat + totalCut + totalFinish + totalExtras;
  let salePrice = costPrice * (1 + (markupPct||0)/100);
  if(urgentMultiplier && urgentMultiplier > 1) salePrice *= urgentMultiplier;

  return { totalMat, totalCut, totalFinish, totalExtras, costPrice, salePrice };
}

export function fmtRub(n){
  return Math.round(n||0).toLocaleString('ru-RU') + ' ₽';
}
