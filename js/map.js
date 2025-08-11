// Variables globales del mapa
let map;
let userLocation = null;
let activeFilters = new Set(Object.keys(MAP_CONFIG.categories));
let markersLayer = null;
let clustersLayer = null;

/**
 * Inicializar el mapa principal
 */
function initializeMap() {
    try {
        validateConfiguration();
        
        // Configurar token de acceso
        mapboxgl.accessToken = MAP_TOKENS.mapbox;

        // Crear instancia del mapa
        map = new mapboxgl.Map({
            container: 'map',
            style: MAP_CONFIG.style,
            center: MAP_CONFIG.center,
            zoom: MAP_CONFIG.zoom,
            minZoom: MAP_CONFIG.minZoom,
            maxZoom: MAP_CONFIG.maxZoom,
            attributionControl: true,
            logoPosition: 'bottom-left'
        });

        setupMapEvents();
        setupMapControls();

    } catch (error) {
        console.error('Error inicializando el mapa:', error);
        showError(getText('error_load'));
    }
}

/**
 * Validar configuración antes de inicializar
 */
function validateConfiguration() {
    if (typeof MAP_TOKENS === 'undefined') {
        throw new Error('MAP_TOKENS no está definido. Verifica que config/config.js se esté cargando correctamente.');
    }

    if (!MAP_TOKENS.mapbox || MAP_TOKENS.mapbox === 'tu_token_real_aqui') {
        throw new Error('Token de Mapbox no configurado. Edita config/config.js y agrega tu token real.');
    }

    if (typeof mapboxgl === 'undefined') {
        throw new Error('Mapbox GL JS no está cargado correctamente.');
    }
}

/**
 * Configurar eventos del mapa
 */
function setupMapEvents() {
    map.on('load', handleMapLoad);
    map.on('error', handleMapError);
    map.on('zoomend', handleZoomEnd);
    map.on('click', handleMapClick);
}

/**
 * Manejar evento de carga del mapa
 */
function handleMapLoad() {
    setupClusterLayers();
    loadMapData();
    setupMapInteractions();
    toggleLoading(false);
}

/**
 * Manejar errores del mapa
 */
function handleMapError(e) {
    console.error('Error del mapa:', e.error);
    showToast(getText('error_load'), 'error');
}

/**
 * Manejar cambios de zoom
 */
function handleZoomEnd() {
    if (map.getLayer('clusters') && map.getLayer('cluster-count')) {
        updateClusterVisibility();
    }
}

/**
 * Manejar clics en el mapa
 */
function handleMapClick(e) {
    if (!e.defaultPrevented) {
        closeAllPopups();
    }
}

/**
 * Configurar controles del mapa
 */
function setupMapControls() {
    // Control de navegación
    const navControl = new mapboxgl.NavigationControl({
        visualizePitch: true,
        showZoom: true,
        showCompass: true
    });
    map.addControl(navControl, 'top-right');

    // Control de pantalla completa
    map.addControl(new mapboxgl.FullscreenControl(), 'top-right');

    // Control de escala
    const scaleControl = new mapboxgl.ScaleControl({
        maxWidth: 100,
        unit: 'metric'
    });
    map.addControl(scaleControl, 'bottom-right');

    setupGeolocationControl();
}

/**
 * Configurar control de geolocalización personalizado
 */
function setupGeolocationControl() {
    const locateBtn = document.getElementById('locate-btn');
    if (locateBtn) {
        locateBtn.addEventListener('click', requestUserLocation);
    }
}

/**
 * Solicitar ubicación del usuario
 */
function requestUserLocation() {
    const locateBtn = document.getElementById('locate-btn');

    if (!navigator.geolocation) {
        showError('Geolocalización no soportada por este navegador');
        return;
    }

    setLocationButtonState(locateBtn, true);

    const locationOptions = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutos
    };

    navigator.geolocation.getCurrentPosition(
        (position) => handleLocationSuccess(position, locateBtn),
        (error) => handleLocationError(error, locateBtn),
        locationOptions
    );
}

/**
 * Manejar éxito en obtención de ubicación
 */
function handleLocationSuccess(position, locateBtn) {
    const coords = [position.coords.longitude, position.coords.latitude];
    userLocation = coords;

    map.flyTo({
        center: coords,
        zoom: 16,
        duration: 1500
    });

    addUserLocationMarker(coords);
    setLocationButtonState(locateBtn, false);
}

/**
 * Manejar error en obtención de ubicación
 */
function handleLocationError(error, locateBtn) {
    console.error('Error de geolocalización:', error);
    showError(getText('error_location'));
    setLocationButtonState(locateBtn, false);
}

/**
 * Establecer estado del botón de ubicación
 */
function setLocationButtonState(button, isLoading) {
    if (isLoading) {
        button.classList.add('active');
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    } else {
        button.classList.remove('active');
        button.innerHTML = '<i class="fas fa-location-arrow"></i>';
    }
}

/**
 * Agregar marcador de ubicación del usuario
 */
function addUserLocationMarker(coords) {
    removeExistingUserLocation();

    // Agregar nuevo marcador
    map.addSource('user-location', {
        type: 'geojson',
        data: {
            type: 'FeatureCollection',
            features: [{
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: coords
                },
                properties: {
                    type: 'user-location'
                }
            }]
        }
    });

    map.addLayer({
        id: 'user-location-layer',
        type: 'circle',
        source: 'user-location',
        paint: {
            'circle-radius': 8,
            'circle-color': '#007cbf',
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 3,
            'circle-opacity': 0.8
        }
    });

    addUserLocationPulse(coords);
}

/**
 * Remover marcador de usuario existente
 */
function removeExistingUserLocation() {
    if (map.getSource('user-location')) {
        map.removeLayer('user-location-layer');
        map.removeSource('user-location');
    }
}

/**
 * Agregar animación de pulso para ubicación del usuario
 */
function addUserLocationPulse(coords) {
    if (map.getSource('user-location-pulse')) {
        map.removeLayer('user-location-pulse-layer');
        map.removeSource('user-location-pulse');
    }

    map.addSource('user-location-pulse', {
        type: 'geojson',
        data: {
            type: 'FeatureCollection',
            features: [{
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: coords
                }
            }]
        }
    });

    map.addLayer({
        id: 'user-location-pulse-layer',
        type: 'circle',
        source: 'user-location-pulse',
        paint: {
            'circle-radius': [
                'interpolate',
                ['linear'],
                ['zoom'],
                0, 0,
                20, 50
            ],
            'circle-color': '#007cbf',
            'circle-opacity': [
                'interpolate',
                ['linear'],
                ['zoom'],
                0, 0.3,
                20, 0.1
            ],
            'circle-stroke-color': '#007cbf',
            'circle-stroke-width': 1,
            'circle-stroke-opacity': 0.5
        }
    });
}

/**
 * Configurar capas de clustering
 */
function setupClusterLayers() {
    try {
        if (!map.isStyleLoaded()) {
            map.once('styledata', setupClusterLayers);
            return;
        }
        
        removeExistingLayers();
        createMapSource();
        createClusterLayers();
        
    } catch (error) {
        console.error('Error configurando capas de clustering:', error);
        showToast('Error configurando el mapa', 'error');
    }
}

/**
 * Remover capas existentes
 */
function removeExistingLayers() {
    const layersToRemove = ['clusters', 'cluster-count', 'unclustered-point'];
    
    layersToRemove.forEach(layerId => {
        if (map.getLayer(layerId)) {
            map.removeLayer(layerId);
        }
    });
    
    if (map.getSource('points')) {
        map.removeSource('points');
    }
}

/**
 * Crear fuente de datos del mapa
 */
function createMapSource() {
    map.addSource('points', {
        type: 'geojson',
        data: {
            type: 'FeatureCollection',
            features: []
        },
        cluster: MAP_CONFIG.clusterSettings.enableClustering,
        clusterMaxZoom: MAP_CONFIG.clusterSettings.clusterMaxZoom,
        clusterRadius: MAP_CONFIG.clusterSettings.clusterRadius
    });
}

/**
 * Crear capas de clustering
 */
function createClusterLayers() {
    // Capa de clusters
    map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'points',
        filter: ['has', 'point_count'],
        paint: {
            'circle-color': [
                'step',
                ['get', 'point_count'],
                '#007cbf',
                5, '#28a745',
                10, '#dc3545'
            ],
            'circle-radius': [
                'step',
                ['get', 'point_count'],
                22,
                5, 28,
                10, 35
            ],
            'circle-stroke-width': 4,
            'circle-stroke-color': '#ffffff',
            'circle-opacity': 0.9
        }
    });
    
    // Números en clusters
    map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'points',
        filter: ['has', 'point_count'],
        layout: {
            'text-field': '{point_count}',
            'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
            'text-size': 18,
            'text-anchor': 'center'
        },
        paint: {
            'text-color': '#ffffff',
            'text-halo-color': 'rgba(0,0,0,0.7)',
            'text-halo-width': 2
        }
    });
    
    // Puntos individuales
    map.addLayer({
        id: 'unclustered-point',
        type: 'circle',
        source: 'points',
        filter: ['!', ['has', 'point_count']],
        paint: {
            'circle-color': getCategoryColorExpression(),
            'circle-radius': [
                'interpolate',
                ['linear'],
                ['zoom'],
                10, 10,
                15, 14,
                18, 18
            ],
            'circle-stroke-width': 3,
            'circle-stroke-color': '#ffffff',
            'circle-opacity': 0.95,
            'circle-stroke-opacity': [
                'interpolate',
                ['linear'],
                ['zoom'],
                10, 0.8,
                18, 1
            ]
        }
    });
}

/**
 * Generar expresión de color por categoría
 */
function getCategoryColorExpression() {
    const colorExpression = ['case'];
    
    Object.keys(MAP_CONFIG.categories).forEach(category => {
        colorExpression.push(
            ['==', ['get', 'category'], category],
            MAP_CONFIG.categories[category].color
        );
    });
    
    colorExpression.push('#6c757d'); // Color por defecto
    return colorExpression;
}

/**
 * Configurar interacciones del mapa
 */
function setupMapInteractions() {
    try {
        const requiredLayers = ['clusters', 'unclustered-point'];
        const missingLayers = requiredLayers.filter(layerId => !map.getLayer(layerId));
        
        if (missingLayers.length > 0) {
            console.warn('Capas faltantes para interacciones:', missingLayers);
            return;
        }
        
        setupHoverEffects();
        setupClickEvents();
        
    } catch (error) {
        console.error('Error configurando interacciones:', error);
    }
}

/**
 * Configurar efectos hover
 */
function setupHoverEffects() {
    const layers = ['clusters', 'unclustered-point'];
    
    layers.forEach(layer => {
        map.on('mouseenter', layer, () => {
            map.getCanvas().style.cursor = 'pointer';
        });
        
        map.on('mouseleave', layer, () => {
            map.getCanvas().style.cursor = '';
        });
    });
}

/**
 * Configurar eventos de clic
 */
function setupClickEvents() {
    map.on('click', 'clusters', handleClusterClick);
    map.on('click', 'unclustered-point', handlePointClick);
}

/**
 * Manejar clic en cluster
 */
function handleClusterClick(e) {
    const features = map.queryRenderedFeatures(e.point, {
        layers: ['clusters']
    });
    
    if (features.length > 0) {
        const clusterId = features[0].properties.cluster_id;
        
        map.getSource('points').getClusterExpansionZoom(
            clusterId,
            (err, zoom) => {
                if (err) {
                    console.error('Error obteniendo zoom del cluster:', err);
                    return;
                }
                
                map.easeTo({
                    center: features[0].geometry.coordinates,
                    zoom: zoom,
                    duration: 750
                });
            }
        );
    }
    
    e.preventDefault();
}

/**
 * Manejar clic en punto
 */
function handlePointClick(e) {
    if (e.features.length > 0) {
        showPointPopup(e.features[0], e.lngLat);
    }
    e.preventDefault();
}

/**
 * Actualizar visibilidad de clusters basado en zoom
 */
function updateClusterVisibility() {
    try {
        if (!map.getLayer('clusters') || !map.getLayer('cluster-count')) {
            return;
        }
        
        const currentZoom = map.getZoom();
        const visibility = currentZoom > MAP_CONFIG.clusterSettings.clusterMaxZoom ? 'none' : 'visible';
        
        map.setLayoutProperty('clusters', 'visibility', visibility);
        map.setLayoutProperty('cluster-count', 'visibility', visibility);
        
    } catch (error) {
        console.error('Error actualizando visibilidad de clusters:', error);
    }
}

/**
 * Mostrar popup de punto
 */
function showPointPopup(feature, lngLat) {
    const properties = feature.properties;
    const category = MAP_CONFIG.categories[properties.category];
    const categoryName = category ? category[`name_${currentLanguage}`] || category.name_es : 'Desconocido';

    const popupContent = createPopupContent(properties, category, categoryName, lngLat);

    new mapboxgl.Popup({
        offset: 25,
        closeOnClick: true,
        closeButton: true
    })
        .setLngLat(lngLat)
        .setHTML(popupContent)
        .addTo(map);
}

/**
 * Crear contenido del popup
 */
function createPopupContent(properties, category, categoryName, lngLat) {
    const title = properties[`nombre_${currentLanguage}`] || properties.nombre_es || 'Sin nombre';
    const description = properties[`descripcion_${currentLanguage}`] || properties.descripcion_es;
    const color = category ? category.color : '#000';
    
    return `
        <div class="popup-content">
            <div class="popup-header">
                <h3>${title}</h3>
                <span class="popup-category" style="color: ${color}">${categoryName}</span>
            </div>
            <div class="popup-body">
                ${description ? `<p class="popup-description">${description}</p>` : ''}
                ${properties.horario ? `<p class="popup-schedule"><strong>Horario:</strong> ${properties.horario}</p>` : ''}
                ${properties.telefono ? `<p class="popup-phone"><strong>Teléfono:</strong> ${properties.telefono}</p>` : ''}
                ${properties.website ? `<p class="popup-website"><a href="${properties.website}" target="_blank">Sitio web</a></p>` : ''}
            </div>
            <div class="popup-actions">
                ${userLocation ? createRouteButton(lngLat) : ''}
            </div>
        </div>
    `;
}

/**
 * Crear botón de ruta
 */
function createRouteButton(lngLat) {
    return `
        <button onclick="calculateRoute([${lngLat.lng}, ${lngLat.lat}])" class="btn-route">
            <i class="fas fa-directions"></i> ${getText('route_to')}
        </button>
    `;
}

/**
 * Cerrar todos los popups
 */
function closeAllPopups() {
    const popups = document.getElementsByClassName('mapboxgl-popup');
    Array.from(popups).forEach(popup => popup.remove());
}

/**
 * Mostrar mensaje de error
 */
function showError(message) {
    console.error('Error:', message);
    showToast(message, 'error', 5000);
}

/**
 * Cargar datos del mapa
 */
function loadMapData() {
    loadTestData();
}

/**
 * Cargar datos de prueba
 */
function loadTestData() {
    const testData = createTestData();
    
    map.getSource('points').setData(testData);
    
    // Resetear filtros activos
    activeFilters.clear();
    Object.keys(MAP_CONFIG.categories).forEach(category => {
        activeFilters.add(category);
    });
    
    setTimeout(() => {
        applyFilters();
        showToast(`${testData.features.length} puntos cargados`, 'success', 3000);
    }, 100);
}

/**
 * Crear datos de prueba
 */
function createTestData() {
    return {
        type: 'FeatureCollection',
        features: [
            {
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [-86.7308, 21.2313] },
                properties: {
                    id: '1',
                    category: 'office',
                    nombre_es: 'The Key Rides - Oficina Principal',
                    nombre_en: 'The Key Rides - Main Office',
                    descripcion_es: 'Oficina principal donde puedes hacer reservas y obtener información',
                    descripcion_en: 'Main office where you can make reservations and get information',
                    horario: '8:00 AM - 6:00 PM',
                    telefono: '+52 998 123 4567',
                    website: 'https://thekeyrides.com',
                    activo: true
                }
            },
            {
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [-86.7280, 21.2320] },
                properties: {
                    id: '2',
                    category: 'pickup',
                    nombre_es: 'Estación Centro',
                    nombre_en: 'Downtown Station',
                    descripcion_es: 'Punto de recogida y entrega en el centro, cerca del ferry',
                    descripcion_en: 'Pickup and drop-off point downtown, near the ferry',
                    horario: '7:00 AM - 8:00 PM',
                    activo: true
                }
            },
            {
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [-86.7350, 21.2280] },
                properties: {
                    id: '3',
                    category: 'restaurant',
                    nombre_es: 'Restaurante La Playa',
                    nombre_en: 'La Playa Restaurant',
                    descripcion_es: 'Deliciosa comida caribeña frente al mar con vista espectacular',
                    descripcion_en: 'Delicious Caribbean food by the sea with spectacular view',
                    horario: '12:00 PM - 10:00 PM',
                    telefono: '+52 998 765 4321',
                    activo: true
                }
            },
            {
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [-86.7320, 21.2350] },
                properties: {
                    id: '4',
                    category: 'tourist',
                    nombre_es: 'Playa Norte',
                    nombre_en: 'North Beach',
                    descripcion_es: 'La playa más hermosa de Isla Mujeres, perfecta para relajarse',
                    descripcion_en: 'The most beautiful beach in Isla Mujeres, perfect for relaxing',
                    horario: '24 horas',
                    activo: true
                }
            },
            {
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [-86.7290, 21.2300] },
                properties: {
                    id: '5',
                    category: 'shop',
                    nombre_es: 'Tienda de Souvenirs Caribe',
                    nombre_en: 'Caribbean Souvenirs Shop',
                    descripcion_es: 'Los mejores recuerdos y artesanías locales de Isla Mujeres',
                    descripcion_en: 'The best souvenirs and local crafts from Isla Mujeres',
                    horario: '9:00 AM - 7:00 PM',
                    telefono: '+52 998 555 1234',
                    activo: true
                }
            },
            {
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [-86.7240, 21.2250] },
                properties: {
                    id: '6',
                    category: 'pickup',
                    nombre_es: 'Estación Playa Sur',
                    nombre_en: 'South Beach Station',
                    descripcion_es: 'Punto de entrega cerca de las mejores playas del sur',
                    descripcion_en: 'Drop-off point near the best southern beaches',
                    horario: '8:00 AM - 6:00 PM',
                    activo: true
                }
            },
            {
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [-86.7310, 21.2290] },
                properties: {
                    id: '7',
                    category: 'route',
                    nombre_es: 'Ruta Turística Centro',
                    nombre_en: 'Downtown Tourist Route',
                    descripcion_es: 'Ruta recomendada para recorrer los principales atractivos del centro',
                    descripcion_en: 'Recommended route to visit main downtown attractions',
                    activo: true
                }
            }
        ]
    };
}

/**
 * Función placeholder para calcular rutas
 */
function calculateRoute(destination) {
    console.log('Calculando ruta hacia:', destination);
    // Por implementar
}

/**
 * Toggle de filtros de categorías
 */
function toggleCategoryFilter(category, enabled) {
    try {
        if (enabled) {
            activeFilters.add(category);
        } else {
            activeFilters.delete(category);
        }
        
        setTimeout(() => {
            applyFilters();
        }, 50);
        
        updateFilterUI(category, enabled);
        
    } catch (error) {
        console.error('Error en toggleCategoryFilter:', error);
        showToast('Error cambiando filtro', 'error');
    }
}

/**
 * Actualizar UI de filtros
 */
function updateFilterUI(category, enabled) {
    const filterElement = document.querySelector(`#filter-${category}`);
    if (filterElement) {
        const container = filterElement.closest('.filter-checkbox');
        if (container) {
            container.classList.toggle('active', enabled);
        }
    }
}

/**
 * Aplicar filtros
 */
function applyFilters() {
    try {
        if (!map.getLayer('unclustered-point') || !map.getSource('points')) {
            console.warn('Capas no disponibles para filtros');
            return;
        }
        
        if (activeFilters.size === 0) {
            map.setLayoutProperty('unclustered-point', 'visibility', 'none');
            return;
        }
        
        map.setLayoutProperty('unclustered-point', 'visibility', 'visible');
        
        if (activeFilters.size === Object.keys(MAP_CONFIG.categories).length) {
            map.setFilter('unclustered-point', ['!', ['has', 'point_count']]);
            return;
        }
        
        const filter = createFilterExpression();
        map.setFilter('unclustered-point', filter);
        
    } catch (error) {
        console.error('Error aplicando filtros:', error);
        showToast('Error aplicando filtros', 'error');
    }
}

/**
 * Crear expresión de filtro
 */
function createFilterExpression() {
    const categoryConditions = Array.from(activeFilters).map(category => 
        ['==', ['get', 'category'], category]
    );
    
    if (categoryConditions.length === 1) {
        return [
            'all',
            ['!', ['has', 'point_count']],
            categoryConditions[0]
        ];
    }
    
    return [
        'all',
        ['!', ['has', 'point_count']],
        ['any', ...categoryConditions]
    ];
}

/**
 * Función de debugging para reiniciar el mapa
 */
function resetMap() {
    try {
        removeExistingLayers();
        
        setTimeout(() => {
            setupClusterLayers();
            setTimeout(() => {
                loadTestData();
                showToast('Mapa reiniciado', 'success', 2000);
            }, 100);
        }, 100);
        
    } catch (error) {
        console.error('Error reiniciando mapa:', error);
        showToast('Error reiniciando mapa', 'error');
    }
}

/**
 * Función para validar estado de filtros
 */
function validateFilters() {
    const inconsistencies = [];
    
    Object.keys(MAP_CONFIG.categories).forEach(category => {
        const checkbox = document.querySelector(`#filter-${category}`);
        const isChecked = checkbox ? checkbox.checked : false;
        const isActive = activeFilters.has(category);
        
        if (isChecked !== isActive) {
            inconsistencies.push(category);
        }
    });
    
    return {
        activeFilters: Array.from(activeFilters),
        inconsistencies: inconsistencies.length,
        details: inconsistencies
    };
}

// Exponer funciones globalmente
window.resetMap = resetMap;
window.validateFilters = validateFilters;

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function () {
    setTimeout(() => {
        initializeMap();
    }, 100);
});