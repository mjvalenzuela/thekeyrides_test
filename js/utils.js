// Utilidades generales para el mapa - Actualizado con Bootstrap Icons

const i18n = {
    es: {
        filters: 'Filtros',
        legend: 'Leyenda', 
        loading: 'Cargando mapa...',
        search_placeholder: 'Buscar lugar...',
        my_location: 'Mi ubicación',
        route_to: 'Cómo llegar',
        error_location: 'No se pudo obtener tu ubicación',
        error_load: 'Error al cargar los datos del mapa',
        schedule: 'Horario',
        phone: 'Teléfono',
        website: 'Sitio web'
    },
    en: {
        filters: 'Filters',
        legend: 'Legend',
        loading: 'Loading map...',
        search_placeholder: 'Search place...',
        my_location: 'My location',
        route_to: 'Get directions',
        error_location: 'Could not get your location',
        error_load: 'Error loading map data',
        schedule: 'Schedule',
        phone: 'Phone',
        website: 'Website'
    }
};

let currentLanguage = 'es';

/**
 * Cambiar idioma de la interfaz
 */
function changeLanguage(lang) {
    currentLanguage = lang;
    
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (i18n[lang] && i18n[lang][key]) {
            element.textContent = i18n[lang][key];
        }
    });
    
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
        const key = element.getAttribute('data-i18n-placeholder');
        if (i18n[lang] && i18n[lang][key]) {
            element.placeholder = i18n[lang][key];
        }
    });
    
    updateDynamicTexts(lang);
}

/**
 * Generar filtros de categorías con Bootstrap - MEJORADO
 */
function updateCategoryFilters() {
    const container = document.querySelector('.filters-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    Object.keys(MAP_CONFIG.categories).forEach(categoryKey => {
        const category = MAP_CONFIG.categories[categoryKey];
        const name = category[`name_${currentLanguage}`] || category.name_es;
        
        const filterDiv = document.createElement('div');
        filterDiv.className = 'filter-checkbox form-check-label active'; // Activo por defecto
        filterDiv.setAttribute('data-tooltip', name);
        filterDiv.innerHTML = `
            <input type="checkbox" id="filter-${categoryKey}" value="${categoryKey}" 
                   class="form-check-input me-2" checked>
            <i class="${category.icon} category-icon me-1" style="color: ${category.color}"></i>
            <span>${name}</span>
        `;
        
        container.appendChild(filterDiv);
        
        // Event listener con manejo de errores
        const checkbox = filterDiv.querySelector('input');
        checkbox.addEventListener('change', function(e) {
            try {
                e.preventDefault();
                e.stopPropagation();
                
                const isChecked = e.target.checked;
                console.log(`Filtro ${categoryKey} cambiado a: ${isChecked}`);
                
                // Actualizar UI inmediatamente
                filterDiv.classList.toggle('active', isChecked);
                
                // Actualizar filtros
                toggleCategoryFilter(categoryKey, isChecked);
                
            } catch (error) {
                console.error('Error en event listener de filtro:', error);
                // Revertir el checkbox si hay error
                e.target.checked = !e.target.checked;
                showToast('Error aplicando filtro', 'error');
            }
        });
    });
    
    console.log('Filtros de categorías generados');
}

/**
 * Generar leyenda mejorada - SIN ÍCONOS PROBLEMÁTICOS
 */
function updateLegend() {
    const container = document.getElementById('legend-items');
    if (!container) return;
    
    container.innerHTML = '';
    
    Object.keys(MAP_CONFIG.categories).forEach(categoryKey => {
        const category = MAP_CONFIG.categories[categoryKey];
        const name = category[`name_${currentLanguage}`] || category.name_es;
        
        const legendItem = document.createElement('div');
        legendItem.className = 'legend-item';
        legendItem.innerHTML = `
            <div class="legend-icon" 
                 style="background-color: ${category.color}"
                 data-category="${categoryKey}">
            </div>
            <span>${name}</span>
        `;
        
        container.appendChild(legendItem);
    });
}

/**
 * Mostrar toast de notificación
 */
function showToast(message, type = 'error', duration = 5000) {
    const toastClass = `${type}-toast`;
    
    const toast = document.createElement('div');
    toast.className = toastClass;
    toast.textContent = message;
    toast.style.animation = 'slideIn 0.3s ease';
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (document.body.contains(toast)) {
                document.body.removeChild(toast);
            }
        }, 300);
    }, duration);
}

// Resto de funciones se mantienen igual...
function getText(key) {
    return i18n[currentLanguage] && i18n[currentLanguage][key] 
        ? i18n[currentLanguage][key] 
        : key;
}

function updateDynamicTexts(lang) {
    updateCategoryFilters();
    updateLegend();
}

function toggleLoading(show = true) {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.classList.toggle('hidden', !show);
    }
}

function isEmbedded() {
    return window.self !== window.top;
}

function applyEmbeddedStyles() {
    if (isEmbedded()) {
        document.body.classList.add('embedded');
    }
}

document.addEventListener('DOMContentLoaded', function() {
    applyEmbeddedStyles();
    
    const languageSelector = document.getElementById('language-selector');
    if (languageSelector) {
        languageSelector.addEventListener('change', (e) => {
            changeLanguage(e.target.value);
        });
    }
    
    changeLanguage(currentLanguage);
});