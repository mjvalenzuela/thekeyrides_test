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
 * Generate category filters
 */
function generateCategoryFilters() {
    const container = document.querySelector('.filters-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    Object.entries(MAP_CONFIG.categories).forEach(([categoryKey, category]) => {
        const filterElement = createFilterElement(categoryKey, category);
        container.appendChild(filterElement);
    });
}

/**
 * Create individual filter element
 */
function createFilterElement(categoryKey, category) {
    const name = category.name; // Only English now
    
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
            toggleCategoryFilter(categoryKey, isChecked);
            
        } catch (error) {
            console.error('Filter error:', error);
            // Revert checkbox if error
            e.target.checked = !e.target.checked;
            showToast('Error applying filter', 'error');
        }
    };
}

/**
 * Generate legend
 */
function generateLegend() {
    const container = document.getElementById('legend-items');
    if (!container) return;
    
    container.innerHTML = '';
    
    Object.entries(MAP_CONFIG.categories).forEach(([categoryKey, category]) => {
        const legendItem = createLegendItem(categoryKey, category);
        container.appendChild(legendItem);
    });
}

/**
 * Create individual legend item
 */
function createLegendItem(categoryKey, category) {
    const name = category.name; // Only English now
    
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
 * Setup sidebar functionality with enhanced controls
 */
function setupSidebar() {
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebarToggleExternal = document.getElementById('sidebar-toggle-external');
    
    if (!sidebar || !sidebarToggle) {
        console.warn('Sidebar elements not found');
        return;
    }
    
    // Internal toggle button
    sidebarToggle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleSidebar();
    });
    
    // External toggle button
    if (sidebarToggleExternal) {
        sidebarToggleExternal.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            showSidebar();
        });
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !sidebar.classList.contains('collapsed')) {
            hideSidebar();
        }
        if (e.ctrlKey && e.key === 'm') {
            e.preventDefault();
            toggleSidebar();
        }
    });
    
    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768) {
            const isClickInsideSidebar = sidebar.contains(e.target);
            const isToggleButton = sidebarToggleExternal && sidebarToggleExternal.contains(e.target);
            const isInternalToggle = sidebarToggle.contains(e.target);
            
            if (!isClickInsideSidebar && !isToggleButton && !isInternalToggle && !sidebar.classList.contains('collapsed')) {
                hideSidebar();
            }
        }
    });
    
    console.log('Sidebar setup completed');
}

/**
 * Toggle sidebar visibility
 */
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    
    if (sidebar.classList.contains('collapsed')) {
        showSidebar();
    } else {
        hideSidebar();
    }
}

/**
 * Show sidebar
 */
function showSidebar() {
    const sidebar = document.getElementById('sidebar');
    const toggleIcon = document.querySelector('#sidebar-toggle i');
    
    if (!sidebar) return;
    
    sidebar.classList.remove('collapsed');
    
    if (toggleIcon) {
        toggleIcon.className = 'bi bi-chevron-left';
    }
    
    // Store preference
    try {
        localStorage.setItem('sidebarCollapsed', 'false');
    } catch (e) {
        console.warn('Could not save sidebar state to localStorage');
    }
    
    // Trigger map resize
    setTimeout(() => {
        if (window.map && typeof window.map.resize === 'function') {
            window.map.resize();
        }
    }, 350);
    
    console.log('Sidebar shown');
}

/**
 * Hide sidebar
 */
function hideSidebar() {
    const sidebar = document.getElementById('sidebar');
    const toggleIcon = document.querySelector('#sidebar-toggle i');
    
    if (!sidebar) return;
    
    sidebar.classList.add('collapsed');
    
    if (toggleIcon) {
        toggleIcon.className = 'bi bi-chevron-right';
    }
    
    // Store preference
    try {
        localStorage.setItem('sidebarCollapsed', 'true');
    } catch (e) {
        console.warn('Could not save sidebar state to localStorage');
    }
    
    // Trigger map resize
    setTimeout(() => {
        if (window.map && typeof window.map.resize === 'function') {
            window.map.resize();
        }
    }, 350);
    
    console.log('Sidebar hidden');
}

/**
 * Restore sidebar state from localStorage
 */
function restoreSidebarState() {
    try {
        const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
        
        if (isCollapsed) {
            hideSidebar();
        } else {
            showSidebar();
        }
        
        console.log('Sidebar state restored:', isCollapsed ? 'collapsed' : 'expanded');
    } catch (e) {
        console.warn('Could not restore sidebar state from localStorage');
        // Default to shown
        showSidebar();
    }
}

/**
 * Validate required configuration
 */
function validateRequiredConfig() {
    const requiredObjects = ['MAP_CONFIG', 'MAP_TOKENS', 'SHEETS_CONFIG'];
    const missing = requiredObjects.filter(obj => typeof window[obj] === 'undefined');
    
    if (missing.length > 0) {
        console.error('Missing configuration objects:', missing);
        console.error('Make sure config/config.js is loaded and contains MAP_CONFIG, MAP_TOKENS, and SHEETS_CONFIG');
        
        // Create minimal fallback config to prevent crashes
        if (typeof window.MAP_CONFIG === 'undefined') {
            window.MAP_CONFIG = {
                center: [-86.7308, 21.2313],
                zoom: 14,
                minZoom: 10,
                maxZoom: 18,
                style: 'mapbox://styles/mapbox/streets-v12',
                clusterSettings: {
                    enableClustering: true,
                    clusterMaxZoom: 14,
                    clusterRadius: 50
                },
                categories: {
                    office: { name: 'Offices', color: '#007cbf', icon: 'bi-building' },
                    pickup: { name: 'Pickup Points', color: '#28a745', icon: 'bi-geo-alt' },
                    restaurant: { name: 'Restaurants', color: '#dc3545', icon: 'bi-cup-hot' },
                    tourist: { name: 'Tourist Attractions', color: '#ffc107', icon: 'bi-camera' },
                    shop: { name: 'Shops', color: '#6f42c1', icon: 'bi-bag' },
                    route: { name: 'Routes', color: '#fd7e14', icon: 'bi-signpost' }
                }
            };
            console.warn('Using fallback MAP_CONFIG');
        }
        
        if (typeof window.MAP_TOKENS === 'undefined') {
            window.MAP_TOKENS = {
                mapbox: 'pk.eyJ1IjoieW91cl91c2VybmFtZSIsImEiOiJjbGV4YW1wbGUifQ.example-token-here'
            };
            console.warn('Using fallback MAP_TOKENS - UPDATE WITH REAL TOKENS!');
        }
        
        if (typeof window.SHEETS_CONFIG === 'undefined') {
            window.SHEETS_CONFIG = {
                url: '', // No default URL - must be configured
                gid: 0,
                cacheTimeout: 2 * 60 * 1000,
                autoRefresh: true
            };
            console.error('SHEETS_CONFIG missing! You must configure the Google Sheets URL in config/config.js');
        }
        
        showToast('Configuration loaded with defaults. Check console for details.', 'info', 5000);
        return true; // Continue despite missing config
    }
    
    // Validate Mapbox token
    if (!window.MAP_TOKENS.mapbox || window.MAP_TOKENS.mapbox.includes('example')) {
        console.warn('Mapbox token appears to be invalid or example token');
        showToast('Warning: Please update Mapbox token in config/config.js', 'warning', 8000);
    }
    
    return true;
}

/**
 * Initialize utilities
 */
function initializeUtils() {
    applyEmbeddedStyles();
    setupSidebar();
    restoreSidebarState(); // Restore saved state
    generateCategoryFilters();
    generateLegend();
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
    console.log('DOM loaded, initializing utilities...');
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

// Expose sidebar functions globally
window.toggleSidebar = toggleSidebar;
window.showSidebar = showSidebar;
window.hideSidebar = hideSidebar;