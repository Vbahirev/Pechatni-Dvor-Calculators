const KEY_ACTIVE = 'pd_active_calc_id';

export function getActiveCalcId(defaultId){
  return localStorage.getItem(KEY_ACTIVE) || defaultId;
}
export function setActiveCalcId(id){
  localStorage.setItem(KEY_ACTIVE, id);
}

export function loadCalcData(id){
  const raw = localStorage.getItem(`pd_data_${id}`);
  if(!raw) return null;
  try{ return JSON.parse(raw); } catch { return null; }
}
export function saveCalcData(id, data){
  localStorage.setItem(`pd_data_${id}`, JSON.stringify(data));
}

export function loadUiState(id){
  const raw = localStorage.getItem(`pd_ui_${id}`);
  if(!raw) return null;
  try{ return JSON.parse(raw); } catch { return null; }
}
export function saveUiState(id, state){
  localStorage.setItem(`pd_ui_${id}`, JSON.stringify(state));
}
