// Google Sheets Configuration
// IMPORTANT: You must configure this URL for the map to work
const SHEETS_CONFIG = {
    url: 'https://docs.google.com/spreadsheets/d/1Jr2BNf7HeG1wHmZ1nt-stelqGggq0i0wWeFykm4oKJ4',
    gid: 0, // Sheet tab ID (0 for first sheet, or get from URL #gid=123456)
    cacheTimeout: 10 * 60 * 1000, // 10 minutes cache
    autoRefresh: true // Auto-refresh every cacheTimeout interval
};

// Map configuration
const MAP_CONFIG = {
    // Map initial settings
    center: [-81.7702488352143,24.565619159423512], // Initial coordinates [longitude, latitude]
    zoom: 13,
    minZoom: 10,
    maxZoom: 18,
    style: 'mapbox://styles/mapbox/light-v11', // You can change this to any Mapbox style
    //mapbox://styles/mapbox/navigation-day-v1
    
    // Clustering settings
    clusterSettings: {
        enableClustering: true,
        clusterMaxZoom: 14, // Zoom level where clustering stops
        clusterRadius: 50 // Pixel radius for clustering
    },
    
// CATEGORÍAS CON NOMBRES CORRECTOS - CORREGIDO
categories: {
        office: {
            name_en: 'Offices',
            name_es: 'Oficinas',
            color: '#ffd700', // Dorado
            maki: 'building' // Icono Maki
        },
        pickup: {
            name_en: 'Pickup Points',
            name_es: 'Puntos de Recogida',
            color: '#007cbf', // Azul
            maki: 'marker'
        },
        restaurant: {
            name_en: 'Restaurants',
            name_es: 'Restaurantes',
            color: '#dc3545', // Rojo
            maki: 'restaurant'
        },
        tourist: {
            name_en: 'Tourist Spots',
            name_es: 'Sitios Turísticos',
            color: '#28a745', // Verde
            maki: 'monument'
        },
        shop: {
            name_en: 'Shops & Services',
            name_es: 'Tiendas y Servicios',
            color: '#17a2b8', // Cian
            maki: 'shop'
        },
        route: {
            name_en: 'Routes',
            name_es: 'Rutas',
            color: '#6f42c1', // Púrpura
            maki: 'arrow'
        }
    }
};

// Map tokens - REPLACE WITH YOUR REAL TOKENS
const MAP_TOKENS = {
    // Get your free token at: https://account.mapbox.com/access-tokens/
    mapbox: 'pk.eyJ1IjoibWp2YWxlbnp1ZWxhIiwiYSI6ImNtYWlndzJlMzBmdW8ya3E0M3RhMnliM3oifQ.-rgsmcznF6HGDzqUMNo8GQ', // REPLACE WITH REAL TOKEN
    
    // Optional: Google Maps API key for additional features
    google: 'AIzaSyAqEPwp6Yrao9WnxjMeGWqfZsWsJlTQUf8' // Optional
};

// Expose globally - DO NOT MODIFY
window.SHEETS_CONFIG = SHEETS_CONFIG;
window.MAP_CONFIG = MAP_CONFIG;
window.MAP_TOKENS = MAP_TOKENS;

// Log configuration for debugging
console.log('Map configuration loaded:', {
    sheetsUrl: SHEETS_CONFIG.url ? 'Configured' : 'NOT CONFIGURED',
    mapboxToken: MAP_TOKENS.mapbox.includes('example') ? 'NEEDS REPLACEMENT' : 'Configured',
    categories: Object.keys(MAP_CONFIG.categories).length + ' categories'
});

/**
 * Cargar Google Maps API dinámicamente usando la configuración
 */
function loadGoogleMapsAPI() {
    return new Promise((resolve, reject) => {
        // Si ya está cargado, resolver inmediatamente
        if (typeof google !== 'undefined' && google.maps) {
            resolve();
            return;
        }

        // Verificar que tenemos la API key
        if (!MAP_TOKENS.google) {
            console.warn('Google Maps API key not configured - Street View will be disabled');
            resolve(); // No rechazar, solo continuar sin Street View
            return;
        }

        // Crear el script
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${MAP_TOKENS.google}&libraries=geometry`;
        script.async = true;
        script.defer = true;

        script.onload = () => {
            console.log('✅ Google Maps API loaded successfully');
            resolve();
        };

        script.onerror = (error) => {
            console.error('❌ Error loading Google Maps API:', error);
            console.warn('Street View functionality will be disabled');
            resolve(); // No rechazar para que el mapa principal funcione
        };

        // Agregar al documento
        document.head.appendChild(script);
    });
}

// Exponer globalmente
window.loadGoogleMapsAPI = loadGoogleMapsAPI;