import { calculatorsDb } from './data/db.js';

export const state = {
    currentCalcId: null,
    materialList: [],
    extrasCatalogue: [],
    processingRates: [],
    
    // Данные текущего расчета
    parts: [],
    activeExtras: {},
    activeProcessingAreas: {},
    activeProcessingChecks: {},

    loadProfile(id) {
        this.currentCalcId = id;
        localStorage.setItem('pd_active_calc_id', id);
        
        // Грузим дефолт из локального файла (на случай если инета нет)
        const config = calculatorsDb.find(c => c.id === id) || calculatorsDb[0];
        
        this.materialList = [...config.defaultMaterials];
        this.extrasCatalogue = [...config.defaultExtras];
        this.processingRates = [...config.defaultRates];

        // Очистка полей
        this.parts = []; 
        this.activeExtras = {}; 
        this.activeProcessingAreas = {}; 
        this.activeProcessingChecks = {};
        
        return config.name;
    },

    // Метод для внедрения данных из Google
    injectExternalData(externalDb) {
        if (!externalDb) return;

        const currentData = externalDb[this.currentCalcId];

        if (currentData) {
            console.log(`Применены данные Google Таблицы для: ${this.currentCalcId}`);
            
            if (currentData.materials.length > 0) this.materialList = currentData.materials;
            if (currentData.extras.length > 0) this.extrasCatalogue = currentData.extras;
            if (currentData.rates.length > 0) this.processingRates = currentData.rates;
        }
    },

    saveData() {
        // Мы больше не сохраняем базу в LocalStorage, так как она приходит из Гугла.
        // Сохраняем только введенные пользователем данные заказа (номер, имя)
        // Реализовано в полях ввода через localStorage.setItem напрямую в app.js если нужно
    }
};