// Text constants in English
const TEXTS = {
    filters: 'Filters',
    legend: 'Legend', 
    loading: 'Loading map...',
    search_placeholder: 'Search for a place...',
    my_location: 'My location',
    route_to: 'Get directions',
    error_location: 'Could not get your location',
    error_load: 'Error loading map data',
    schedule: 'Schedule',
    phone: 'Phone',
    website: 'Website',
    map_controls: 'Map Controls',
    search: 'Search'
};

/**
 * Generate category filters - CORREGIDO para mostrar nombres correctos
 */
function generateCategoryFilters() {
    const container = document.querySelector('.filters-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Verificar que MAP_CONFIG existe y tiene categorías
    if (!window.MAP_CONFIG || !window.MAP_CONFIG.categories) {
        console.error('MAP_CONFIG or categories not found');
        return;
    }
    
    Object.entries(MAP_CONFIG.categories).forEach(([categoryKey, category]) => {
        const filterElement = createFilterElement(categoryKey, category);
        container.appendChild(filterElement);
    });
}

/**
 * Create individual filter element - CORREGIDO
 */
function createFilterElement(categoryKey, category) {
    // Asegurar que tengamos un nombre válido
    const name = category.name_en || category.name_es || category.name || categoryKey;
    const color = category.color || '#007cbf';
    const icon = category.icon || 'bi bi-geo-alt';
    
    const filterDiv = document.createElement('div');
    filterDiv.className = 'filter-checkbox form-check-label active';
    filterDiv.setAttribute('data-tooltip', name);
    filterDiv.innerHTML = `
        <input type="checkbox" id="filter-${categoryKey}" value="${categoryKey}" 
               class="form-check-input me-2" checked>
        <i class="${icon} category-icon me-1" style="color: ${color}"></i>
        <span>${name}</span>
    `;
    
    const checkbox = filterDiv.querySelector('input');
    checkbox.addEventListener('change', createFilterChangeHandler(categoryKey, filterDiv));
    
    return filterDiv;
}

/**
 * Create filter change handler
 */
function createFilterChangeHandler(categoryKey, filterDiv) {
    return function(e) {
        try {
            e.preventDefault();
            e.stopPropagation();
            
            const isChecked = e.target.checked;
            
            // Update UI immediately
            filterDiv.classList.toggle('active', isChecked);
            
            // Update filters
            if (window.toggleCategoryFilter) {
                toggleCategoryFilter(categoryKey, isChecked);
            } else {
                console.warn('toggleCategoryFilter function not available');
            }
            
        } catch (error) {
            console.error('Filter error:', error);
            // Revert checkbox if error
            e.target.checked = !e.target.checked;
            showToast('Error applying filter', 'error');
        }
    };
}

/**
 * Generate legend - CORREGIDO usando la función mejorada
 */
function generateLegend() {
    // Si existe la función mejorada, usarla
    if (window.generateEnhancedLegend) {
        window.generateEnhancedLegend();
        return;
    }
    
    // Fallback a la versión original
    const container = document.getElementById('legend-items');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!window.MAP_CONFIG || !window.MAP_CONFIG.categories) {
        console.error('MAP_CONFIG or categories not found');
        return;
    }
    
    Object.entries(MAP_CONFIG.categories).forEach(([categoryKey, category]) => {
        const legendItem = createLegendItem(categoryKey, category);
        container.appendChild(legendItem);
    });
}

/**
 * Create individual legend item - CORREGIDO
 */
function createLegendItem(categoryKey, category) {
    const name = category.name_en || category.name_es || category.name || categoryKey;
    const color = category.color || '#007cbf';
    
    const legendItem = document.createElement('div');
    legendItem.className = 'legend-item';
    legendItem.innerHTML = `
        <div class="legend-icon" 
             style="background-color: ${color}"
             data-category="${categoryKey}">
        </div>
        <span>${name}</span>
    `;
    
    return legendItem;
}

/**
 * Initialize utilities with error handling - MEJORADO
 */
function initializeUtils() {
    try {
        applyEmbeddedStyles();
        setupSidebar();
        restoreSidebarState();
        
        // Esperar a que MAP_CONFIG esté disponible antes de generar filtros y leyenda
        if (window.MAP_CONFIG && window.MAP_CONFIG.categories) {
            generateCategoryFilters();
            generateLegend();
        } else {
            // Retry después de un breve delay
            setTimeout(() => {
                if (window.MAP_CONFIG && window.MAP_CONFIG.categories) {
                    generateCategoryFilters();
                    generateLegend();
                } else {
                    console.error('MAP_CONFIG still not available after delay');
                    showToast('Configuration not loaded properly', 'error');
                }
            }, 500);
        }
    } catch (error) {
        console.error('Error initializing utils:', error);
        showToast('Error initializing interface', 'error');
    }
}

/**
 * Get text
 */
function getText(key) {
    return TEXTS[key] || key;
}

/**
 * Show toast notification
 */
function showToast(message, type = 'error', duration = 5000) {
    if (!message) return;
    
    const toast = createToastElement(message, type);
    document.body.appendChild(toast);
    
    // Entry animation
    requestAnimationFrame(() => {
        toast.style.animation = 'slideIn 0.3s ease';
    });
    
    // Schedule removal
    setTimeout(() => {
        removeToast(toast);
    }, duration);
}

/**
 * Create toast element
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
    
    // Apply colors based on type
    applyToastColors(toast, type);
    
    return toast;
}

/**
 * Apply toast colors based on type
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
 * Remove toast with animation
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
 * Toggle loading indicator
 */
function toggleLoading(show = true) {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.classList.toggle('hidden', !show);
    }
}

/**
 * Check if embedded in iframe
 */
function isEmbedded() {
    try {
        return window.self !== window.top;
    } catch (e) {
        // In case of security error, assume embedded
        return true;
    }
}

/**
 * Apply embedded styles
 */
function applyEmbeddedStyles() {
    if (isEmbedded()) {
        document.body.classList.add('embedded');
    }
}

/**
 * Setup sidebar functionality with enhanced controls - CORREGIDO PARA MÓVIL
 */
function setupSidebar() {
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebarToggleExternal = document.getElementById('sidebar-toggle-external');
    const toggleIcon = sidebarToggle?.querySelector('i');
    
    if (!sidebar || !sidebarToggle) return;
    
    // CONFIGURACIÓN INICIAL PARA MÓVIL
    if (window.innerWidth <= 768) {
        sidebar.classList.add('collapsed');
        if (toggleIcon) {
            toggleIcon.className = 'bi bi-chevron-right';
        }
    }
    
    // Internal toggle button
    sidebarToggle.addEventListener('click', (e) => {
        e.preventDefault();
        toggleSidebar();
    });
    
    // External toggle button
    if (sidebarToggleExternal) {
        sidebarToggleExternal.addEventListener('click', (e) => {
            e.preventDefault();
            showSidebar();
        });
    }
    
    // Keyboard shortcut (ESC to close, CTRL+M to toggle)
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !sidebar.classList.contains('collapsed')) {
            hideSidebar();
        }
        if (e.ctrlKey && e.key === 'm') {
            e.preventDefault();
            toggleSidebar();
        }
    });
    
    // MEJORADO: Close sidebar cuando clicking fuera en móvil
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768) {
            const isClickInsideSidebar = sidebar.contains(e.target);
            const isToggleButton = sidebarToggle.contains(e.target) || 
                                  (sidebarToggleExternal && sidebarToggleExternal.contains(e.target));
            
            if (!isClickInsideSidebar && !isToggleButton && !sidebar.classList.contains('collapsed')) {
                hideSidebar();
            }
        }
    });
    
    // Handle window resize
    window.addEventListener('resize', debounce(handleWindowResize, 300));
}

/**
 * Handle window resize - NUEVO
 */
function handleWindowResize() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    
    // En móvil, asegurar que el sidebar esté oculto por defecto
    if (window.innerWidth <= 768) {
        if (!sidebar.classList.contains('collapsed')) {
            // Solo cerrar si no está siendo usado activamente
            const lastInteraction = sidebar.dataset.lastInteraction || 0;
            if (Date.now() - lastInteraction > 5000) { // 5 segundos
                hideSidebar();
            }
        }
    } else {
        // En desktop, restaurar estado normal si estaba colapsado por móvil
        const wasCollapsedForMobile = sidebar.dataset.collapsedForMobile === 'true';
        if (wasCollapsedForMobile) {
            showSidebar();
            sidebar.dataset.collapsedForMobile = 'false';
        }
    }
}

/**
 * Toggle sidebar visibility - CORREGIDO
 */
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    
    // Marcar interacción
    sidebar.dataset.lastInteraction = Date.now().toString();
    
    if (sidebar.classList.contains('collapsed')) {
        showSidebar();
    } else {
        hideSidebar();
    }
}

/**
 * Show sidebar - CORREGIDO
 */
function showSidebar() {
    const sidebar = document.getElementById('sidebar');
    const toggleIcon = document.querySelector('#sidebar-toggle i');
    
    sidebar.classList.remove('collapsed');
    sidebar.dataset.collapsedForMobile = 'false';
    
    if (toggleIcon) {
        toggleIcon.className = 'bi bi-chevron-left';
    }
    
    // Store preference only for desktop
    if (window.innerWidth > 768) {
        localStorage.setItem('sidebarCollapsed', 'false');
    }
    
    // Trigger resize event for map
    setTimeout(() => {
        if (window.map && window.map.resize) {
            window.map.resize();
        }
    }, 300);
}

/**
 * Hide sidebar - CORREGIDO
 */
function hideSidebar() {
    const sidebar = document.getElementById('sidebar');
    const toggleIcon = document.querySelector('#sidebar-toggle i');
    
    sidebar.classList.add('collapsed');
    
    // Marcar si se cerró por ser móvil
    if (window.innerWidth <= 768) {
        sidebar.dataset.collapsedForMobile = 'true';
    }
    
    if (toggleIcon) {
        toggleIcon.className = 'bi bi-chevron-right';
    }
    
    // Store preference only for desktop
    if (window.innerWidth > 768) {
        localStorage.setItem('sidebarCollapsed', 'true');
    }
    
    // Trigger resize event for map
    setTimeout(() => {
        if (window.map && window.map.resize) {
            window.map.resize();
        }
    }, 300);
}

/**
 * Restore sidebar state from localStorage - CORREGIDO
 */
function restoreSidebarState() {
    // Solo restaurar estado en desktop
    if (window.innerWidth > 768) {
        const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
        
        if (isCollapsed) {
            hideSidebar();
        } else {
            showSidebar();
        }
    } else {
        // En móvil siempre empezar oculto
        hideSidebar();
    }
}

/**
 * Validate required configuration
 */
function validateRequiredConfig() {
    const requiredObjects = ['MAP_CONFIG', 'MAP_TOKENS'];
    const missing = requiredObjects.filter(obj => typeof window[obj] === 'undefined');
    
    if (missing.length > 0) {
        console.error('Missing configuration objects:', missing);
        showToast('Map configuration error', 'error');
        return false;
    }
    
    return true;
}

/**
 * Debounce function to limit execution frequency
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
 * Throttle function to limit execution
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
 * Sanitize text to prevent XSS
 */
function sanitizeText(text) {
    if (typeof text !== 'string') return '';
    
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Format coordinates for display
 */
function formatCoordinates(lng, lat, precision = 4) {
    if (typeof lng !== 'number' || typeof lat !== 'number') {
        return 'Invalid coordinates';
    }
    
    return `${lat.toFixed(precision)}, ${lng.toFixed(precision)}`;
}

/**
 * Calculate distance between two points (Haversine)
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in km
}

/**
 * Check if point is within bounds
 */
function isPointInBounds(lng, lat, bounds) {
    return lng >= bounds.west && lng <= bounds.east &&
           lat >= bounds.south && lat <= bounds.north;
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    if (validateRequiredConfig()) {
        initializeUtils();
    }
});

// Expose useful functions globally
window.getText = getText;
window.showToast = showToast;
window.toggleLoading = toggleLoading;
window.debounce = debounce;
window.throttle = throttle;
window.sanitizeText = sanitizeText;
window.formatCoordinates = formatCoordinates;
window.calculateDistance = calculateDistance;
window.toggleSidebar = toggleSidebar;
window.showSidebar = showSidebar;
window.hideSidebar = hideSidebar;