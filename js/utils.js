// Configuración de idiomas
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
    if (!i18n[lang]) {
        console.warn(`Idioma ${lang} no disponible, usando español por defecto`);
        lang = 'es';
    }
    
    currentLanguage = lang;
    updateTextElements(lang);
    updatePlaceholderElements(lang);
    updateDynamicTexts(lang);
}

/**
 * Actualizar elementos con atributo data-i18n
 */
function updateTextElements(lang) {
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        const text = i18n[lang]?.[key];
        
        if (text) {
            element.textContent = text;
        }
    });
}

/**
 * Actualizar placeholders con atributo data-i18n-placeholder
 */
function updatePlaceholderElements(lang) {
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
        const key = element.getAttribute('data-i18n-placeholder');
        const placeholder = i18n[lang]?.[key];
        
        if (placeholder) {
            element.placeholder = placeholder;
        }
    });
}

/**
 * Actualizar textos dinámicos
 */
function updateDynamicTexts(lang) {
    updateCategoryFilters();
    updateLegend();
}

/**
 * Generar filtros de categorías
 */
function updateCategoryFilters() {
    const container = document.querySelector('.filters-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    Object.entries(MAP_CONFIG.categories).forEach(([categoryKey, category]) => {
        const filterElement = createFilterElement(categoryKey, category);
        container.appendChild(filterElement);
    });
}

/**
 * Crear elemento de filtro individual
 */
function createFilterElement(categoryKey, category) {
    const name = category[`name_${currentLanguage}`] || category.name_es;
    
    const filterDiv = document.createElement('div');
    filterDiv.className = 'filter-checkbox form-check-label active';
    filterDiv.setAttribute('data-tooltip', name);
    filterDiv.innerHTML = `
        <input type="checkbox" id="filter-${categoryKey}" value="${categoryKey}" 
               class="form-check-input me-2" checked>
        <i class="${category.icon} category-icon me-1" style="color: ${category.color}"></i>
        <span>${name}</span>
    `;
    
    const checkbox = filterDiv.querySelector('input');
    checkbox.addEventListener('change', createFilterChangeHandler(categoryKey, filterDiv));
    
    return filterDiv;
}

/**
 * Crear manejador de cambio de filtro
 */
function createFilterChangeHandler(categoryKey, filterDiv) {
    return function(e) {
        try {
            e.preventDefault();
            e.stopPropagation();
            
            const isChecked = e.target.checked;
            
            // Actualizar UI inmediatamente
            filterDiv.classList.toggle('active', isChecked);
            
            // Actualizar filtros
            toggleCategoryFilter(categoryKey, isChecked);
            
        } catch (error) {
            console.error('Error en filtro:', error);
            // Revertir el checkbox si hay error
            e.target.checked = !e.target.checked;
            showToast('Error aplicando filtro', 'error');
        }
    };
}

/**
 * Generar leyenda
 */
function updateLegend() {
    const container = document.getElementById('legend-items');
    if (!container) return;
    
    container.innerHTML = '';
    
    Object.entries(MAP_CONFIG.categories).forEach(([categoryKey, category]) => {
        const legendItem = createLegendItem(categoryKey, category);
        container.appendChild(legendItem);
    });
}

/**
 * Crear elemento de leyenda individual
 */
function createLegendItem(categoryKey, category) {
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
    
    return legendItem;
}

/**
 * Obtener texto traducido
 */
function getText(key) {
    return i18n[currentLanguage]?.[key] || key;
}

/**
 * Mostrar toast de notificación
 */
function showToast(message, type = 'error', duration = 5000) {
    if (!message) return;
    
    const toast = createToastElement(message, type);
    document.body.appendChild(toast);
    
    // Animación de entrada
    requestAnimationFrame(() => {
        toast.style.animation = 'slideIn 0.3s ease';
    });
    
    // Programar eliminación
    setTimeout(() => {
        removeToast(toast);
    }, duration);
}

/**
 * Crear elemento toast
 */
function createToastElement(message, type) {
    const toast = document.createElement('div');
    toast.className = `${type}-toast`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        color: white;
        padding: 16px 20px;
        border-radius: 8px;
        z-index: 10000;
        max-width: 300px;
        font-size: 14px;
        line-height: 1.4;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        border: 1px solid rgba(255, 255, 255, 0.2);
    `;
    
    // Aplicar colores según el tipo
    applyToastColors(toast, type);
    
    return toast;
}

/**
 * Aplicar colores al toast según su tipo
 */
function applyToastColors(toast, type) {
    const colors = {
        error: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
        success: 'linear-gradient(135deg, #28a745 0%, #218838 100%)',
        info: 'linear-gradient(135deg, #17a2b8 0%, #138496 100%)'
    };
    
    toast.style.background = colors[type] || colors.error;
}

/**
 * Remover toast con animación
 */
function removeToast(toast) {
    if (!document.body.contains(toast)) return;
    
    toast.style.animation = 'slideOut 0.3s ease';
    
    setTimeout(() => {
        if (document.body.contains(toast)) {
            document.body.removeChild(toast);
        }
    }, 300);
}

/**
 * Alternar indicador de carga
 */
function toggleLoading(show = true) {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.classList.toggle('hidden', !show);
    }
}

/**
 * Verificar si está en iframe embebido
 */
function isEmbedded() {
    try {
        return window.self !== window.top;
    } catch (e) {
        // En caso de error de seguridad, asumir que está embebido
        return true;
    }
}

/**
 * Aplicar estilos para modo embebido
 */
function applyEmbeddedStyles() {
    if (isEmbedded()) {
        document.body.classList.add('embedded');
    }
}

/**
 * Configurar selector de idioma
 */
function setupLanguageSelector() {
    const languageSelector = document.getElementById('language-selector');
    if (!languageSelector) return;
    
    languageSelector.addEventListener('change', (e) => {
        changeLanguage(e.target.value);
    });
    
    // Establecer idioma inicial
    languageSelector.value = currentLanguage;
}

/**
 * Inicialización de utilidades
 */
function initializeUtils() {
    applyEmbeddedStyles();
    setupLanguageSelector();
    changeLanguage(currentLanguage);
}

/**
 * Validar existencia de configuración requerida
 */
function validateRequiredConfig() {
    const requiredObjects = ['MAP_CONFIG', 'MAP_TOKENS'];
    const missing = requiredObjects.filter(obj => typeof window[obj] === 'undefined');
    
    if (missing.length > 0) {
        console.error('Objetos de configuración faltantes:', missing);
        showToast('Error de configuración del mapa', 'error');
        return false;
    }
    
    return true;
}

/**
 * Debounce para limitar frecuencia de ejecución de funciones
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle para limitar ejecución de funciones
 */
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Sanitizar texto para prevenir XSS
 */
function sanitizeText(text) {
    if (typeof text !== 'string') return '';
    
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Formatear coordenadas para display
 */
function formatCoordinates(lng, lat, precision = 4) {
    if (typeof lng !== 'number' || typeof lat !== 'number') {
        return 'Coordenadas inválidas';
    }
    
    return `${lat.toFixed(precision)}, ${lng.toFixed(precision)}`;
}

/**
 * Calcular distancia entre dos puntos (Haversine)
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distancia en km
}

/**
 * Verificar si un punto está dentro de un bounding box
 */
function isPointInBounds(lng, lat, bounds) {
    return lng >= bounds.west && lng <= bounds.east &&
           lat >= bounds.south && lat <= bounds.north;
}

/**
 * Generar ID único
 */
function generateUniqueId(prefix = 'id') {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    if (validateRequiredConfig()) {
        initializeUtils();
    }
});

// Exponer funciones útiles globalmente
window.getText = getText;
window.showToast = showToast;
window.toggleLoading = toggleLoading;
window.debounce = debounce;
window.throttle = throttle;
window.sanitizeText = sanitizeText;
window.formatCoordinates = formatCoordinates;
window.calculateDistance = calculateDistance;