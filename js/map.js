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
        // VALIDACIONES ANTES DE INICIALIZAR
        console.log('=== VALIDANDO CONFIGURACIÓN ===');
        console.log('MAP_TOKENS existe?', typeof MAP_TOKENS !== 'undefined');
        console.log('MAP_TOKENS.mapbox:', typeof MAP_TOKENS !== 'undefined' ? MAP_TOKENS.mapbox : 'undefined');
        console.log('mapboxgl existe?', typeof mapboxgl !== 'undefined');

        // Verificar que MAP_TOKENS esté definido
        if (typeof MAP_TOKENS === 'undefined') {
            throw new Error('MAP_TOKENS no está definido. Verifica que config/config.js se esté cargando correctamente.');
        }

        // Verificar que el token de Mapbox esté configurado
        if (!MAP_TOKENS.mapbox || MAP_TOKENS.mapbox === 'tu_token_real_aqui') {
            throw new Error('Token de Mapbox no configurado. Edita config/config.js y agrega tu token real.');
        }

        // Configurar token de acceso
        mapboxgl.accessToken = MAP_TOKENS.mapbox;
        console.log('Token configurado correctamente');

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

        // Configurar eventos del mapa
        setupMapEvents();

        // Configurar controles
        setupMapControls();

        console.log('Mapa inicializado correctamente');

    } catch (error) {
        console.error('Error inicializando el mapa:', error);
        showError(getText('error_load'));
    }
}

/**
 * Configurar eventos del mapa
 */
function setupMapEvents() {
    
    // Evento cuando el mapa se carga completamente
    map.on('load', function() {
        console.log('Mapa cargado');
        
        // 1. PRIMERO: Configurar capas de clustering
        setupClusterLayers();
        
        // 2. SEGUNDO: Cargar datos de puntos
        loadMapData();
        
        // 3. TERCERO: Configurar interacciones (después de que existan las capas)
        setupMapInteractions();
        
        // 4. CUARTO: Ocultar loading
        toggleLoading(false);
        
        console.log('Inicialización completa');
    });
    
    // Evento de error del mapa
    map.on('error', function(e) {
        console.error('Error del mapa:', e.error);
        showToast(getText('error_load'), 'error');
    });
    
    // Eventos de zoom para clustering dinámico (solo después de que las capas existan)
    map.on('zoomend', function() {
        // Verificar que las capas existan antes de intentar usarlas
        if (map.getLayer('clusters') && map.getLayer('cluster-count')) {
            updateClusterVisibility();
        }
    });
    
    // Evento de clic en el mapa (para cerrar popups)
    map.on('click', function(e) {
        if (!e.defaultPrevented) {
            closeAllPopups();
        }
    });
}

/**
 * Configurar controles del mapa
 */
function setupMapControls() {

    // Control de navegación (zoom, rotación)
    const navControl = new mapboxgl.NavigationControl({
        visualizePitch: true,
        showZoom: true,
        showCompass: true
    });
    map.addControl(navControl, 'top-right');

    // Control de pantalla completa
    const fullscreenControl = new mapboxgl.FullscreenControl();
    map.addControl(fullscreenControl, 'top-right');

    // Control de escala
    const scaleControl = new mapboxgl.ScaleControl({
        maxWidth: 100,
        unit: 'metric'
    });
    map.addControl(scaleControl, 'bottom-right');

    // Configurar botón de geolocalización personalizado
    setupGeolocationControl();
}

/**
 * Configurar control de geolocalización personalizado
 */
function setupGeolocationControl() {
    const locateBtn = document.getElementById('locate-btn');

    if (locateBtn) {
        locateBtn.addEventListener('click', function () {
            requestUserLocation();
        });
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

    // Mostrar estado de carga
    locateBtn.classList.add('active');
    locateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    navigator.geolocation.getCurrentPosition(
        function (position) {
            // Éxito
            const coords = [position.coords.longitude, position.coords.latitude];
            userLocation = coords;

            // Centrar mapa en la ubicación del usuario
            map.flyTo({
                center: coords,
                zoom: 16,
                duration: 1500
            });

            // Agregar marcador del usuario
            addUserLocationMarker(coords);

            // Restaurar botón
            locateBtn.classList.remove('active');
            locateBtn.innerHTML = '<i class="fas fa-location-arrow"></i>';

            console.log('Ubicación obtenida:', coords);
        },
        function (error) {
            // Error
            console.error('Error de geolocalización:', error);
            showError(getText('error_location'));

            // Restaurar botón
            locateBtn.classList.remove('active');
            locateBtn.innerHTML = '<i class="fas fa-location-arrow"></i>';
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000 // 5 minutos
        }
    );
}

/**
 * Agregar marcador de ubicación del usuario
 */
function addUserLocationMarker(coords) {
    // Remover marcador anterior si existe
    if (map.getSource('user-location')) {
        map.removeLayer('user-location-layer');
        map.removeSource('user-location');
    }

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

    // Capa del marcador del usuario
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

    // Agregar animación de pulso
    addUserLocationPulse(coords);
}

/**
 * Agregar animación de pulso para ubicación del usuario
 */
function addUserLocationPulse(coords) {
    // Remover pulso anterior si existe
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
 * Configurar capas de clustering - SIN GLIFOS PROBLEMÁTICOS
 */
function setupClusterLayers() {
    try {
        console.log('Configurando capas de clustering...');
        
        if (!map.isStyleLoaded()) {
            console.log('Esperando a que el estilo del mapa se cargue...');
            map.once('styledata', setupClusterLayers);
            return;
        }
        
        // Remover capas existentes
        const layersToRemove = ['clusters', 'cluster-count', 'unclustered-point'];
        layersToRemove.forEach(layerId => {
            if (map.getLayer(layerId)) {
                map.removeLayer(layerId);
            }
        });
        
        if (map.getSource('points')) {
            map.removeSource('points');
        }
        
        // Crear fuente de datos
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
                    '#007cbf',  // Azul para clusters pequeños
                    5, '#28a745',  // Verde para clusters medianos
                    10, '#dc3545'  // Rojo para clusters grandes
                ],
                'circle-radius': [
                    'step',
                    ['get', 'point_count'],
                    22,  // Radio base más grande
                    5, 28,  // Radio mediano
                    10, 35  // Radio grande
                ],
                'circle-stroke-width': 4,
                'circle-stroke-color': '#ffffff',
                'circle-opacity': 0.9
            }
        });
        
        // Números en clusters - CON FUENTE ESTÁNDAR
        map.addLayer({
            id: 'cluster-count',
            type: 'symbol',
            source: 'points',
            filter: ['has', 'point_count'],
            layout: {
                'text-field': '{point_count}',
                'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'], // Fuentes estándar de Mapbox
                'text-size': 18,
                'text-anchor': 'center'
            },
            paint: {
                'text-color': '#ffffff',
                'text-halo-color': 'rgba(0,0,0,0.7)',
                'text-halo-width': 2
            }
        });
        
        // Puntos individuales - SOLO CÍRCULOS COLOREADOS (sin símbolos)
        map.addLayer({
            id: 'unclustered-point',
            type: 'circle',
            source: 'points',
            filter: ['!', ['has', 'point_count']],
            paint: {
                'circle-color': [
                    'case',
                    ['==', ['get', 'category'], 'pickup'], MAP_CONFIG.categories.pickup.color,
                    ['==', ['get', 'category'], 'office'], MAP_CONFIG.categories.office.color,
                    ['==', ['get', 'category'], 'route'], MAP_CONFIG.categories.route.color,
                    ['==', ['get', 'category'], 'restaurant'], MAP_CONFIG.categories.restaurant.color,
                    ['==', ['get', 'category'], 'shop'], MAP_CONFIG.categories.shop.color,
                    ['==', ['get', 'category'], 'tourist'], MAP_CONFIG.categories.tourist.color,
                    ['==', ['get', 'category'], 'restricted'], MAP_CONFIG.categories.restricted.color,
                    '#6c757d'  // Color por defecto
                ],
                'circle-radius': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    10, 10,  // Radio mínimo más grande
                    15, 14,  // Radio medio
                    18, 18   // Radio máximo
                ],
                'circle-stroke-width': 3,
                'circle-stroke-color': '#ffffff',
                'circle-opacity': 0.95,
                // Efecto de pulso sutil
                'circle-stroke-opacity': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    10, 0.8,
                    18, 1
                ]
            }
        });
        
        console.log('Capas de clustering configuradas correctamente (sin símbolos)');
        
    } catch (error) {
        console.error('Error configurando capas de clustering:', error);
        showToast('Error configurando el mapa', 'error');
    }
}

/**
 * Configurar interacciones del mapa - ACTUALIZADO
 */
function setupMapInteractions() {
    try {
        console.log('Configurando interacciones del mapa...');
        
        // Verificar que las capas existan
        const requiredLayers = ['clusters', 'unclustered-point'];
        const missingLayers = requiredLayers.filter(layerId => !map.getLayer(layerId));
        
        if (missingLayers.length > 0) {
            console.warn('Capas faltantes para interacciones:', missingLayers);
            return;
        }
        
        // Hover effects para clusters
        map.on('mouseenter', 'clusters', function() {
            map.getCanvas().style.cursor = 'pointer';
        });
        
        map.on('mouseleave', 'clusters', function() {
            map.getCanvas().style.cursor = '';
        });
        
        // Hover effects para puntos
        map.on('mouseenter', 'unclustered-point', function() {
            map.getCanvas().style.cursor = 'pointer';
        });
        
        map.on('mouseleave', 'unclustered-point', function() {
            map.getCanvas().style.cursor = '';
        });
        
        // Click en clusters - expandir
        map.on('click', 'clusters', function(e) {
            const features = map.queryRenderedFeatures(e.point, {
                layers: ['clusters']
            });
            
            if (features.length > 0) {
                const clusterId = features[0].properties.cluster_id;
                
                map.getSource('points').getClusterExpansionZoom(
                    clusterId,
                    function(err, zoom) {
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
        });
        
        // Click en puntos - mostrar popup
        map.on('click', 'unclustered-point', function(e) {
            if (e.features.length > 0) {
                showPointPopup(e.features[0], e.lngLat);
            }
            e.preventDefault();
        });
        
        console.log('Interacciones configuradas correctamente');
        
    } catch (error) {
        console.error('Error configurando interacciones:', error);
    }
}

/**
 * Actualizar visibilidad de clusters basado en zoom
 */
function updateClusterVisibility() {
    try {
        // Verificar que las capas existan
        if (!map.getLayer('clusters') || !map.getLayer('cluster-count')) {
            return;
        }
        
        const currentZoom = map.getZoom();
        
        if (currentZoom > MAP_CONFIG.clusterSettings.clusterMaxZoom) {
            // En zoom alto, ocultar clusters
            map.setLayoutProperty('clusters', 'visibility', 'none');
            map.setLayoutProperty('cluster-count', 'visibility', 'none');
        } else {
            // En zoom bajo, mostrar clusters
            map.setLayoutProperty('clusters', 'visibility', 'visible');
            map.setLayoutProperty('cluster-count', 'visibility', 'visible');
        }
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

    // Crear contenido del popup
    const popupContent = `
        <div class="popup-content">
            <div class="popup-header">
                <h3>${properties[`nombre_${currentLanguage}`] || properties.nombre_es || 'Sin nombre'}</h3>
                <span class="popup-category" style="color: ${category ? category.color : '#000'}">${categoryName}</span>
            </div>
            <div class="popup-body">
                ${properties[`descripcion_${currentLanguage}`] || properties.descripcion_es ?
            `<p class="popup-description">${properties[`descripcion_${currentLanguage}`] || properties.descripcion_es}</p>` : ''
        }
                ${properties.horario ? `<p class="popup-schedule"><strong>Horario:</strong> ${properties.horario}</p>` : ''}
                ${properties.telefono ? `<p class="popup-phone"><strong>Teléfono:</strong> ${properties.telefono}</p>` : ''}
                ${properties.website ? `<p class="popup-website"><a href="${properties.website}" target="_blank">Sitio web</a></p>` : ''}
            </div>
            <div class="popup-actions">
                ${userLocation ?
            `<button onclick="calculateRoute([${lngLat.lng}, ${lngLat.lat}])" class="btn-route">
                        <i class="fas fa-directions"></i> ${getText('route_to')}
                    </button>` : ''
        }
            </div>
        </div>
    `;

    // Crear y mostrar popup
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
 * Cerrar todos los popups
 */
function closeAllPopups() {
    const popups = document.getElementsByClassName('mapboxgl-popup');
    for (let i = 0; i < popups.length; i++) {
        popups[i].remove();
    }
}

/**
 * Mostrar mensaje de error
 */
function showError(message) {
    console.error('Error:', message);

    // Crear toast de error simple
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-toast';
    errorDiv.textContent = message;
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #dc3545;
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(errorDiv);

    // Remover después de 5 segundos
    setTimeout(() => {
        errorDiv.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(errorDiv);
        }, 300);
    }, 5000);
}

/**
 * Función placeholder para cargar datos
 * (Se implementará en el siguiente paso)
 */
function loadMapData() {
    console.log('Cargando datos del mapa...');
    // Por ahora, datos de prueba
    loadTestData();
}

/**
 * Datos de prueba mejorados - CON INICIALIZACIÓN DE FILTROS
 */
function loadTestData() {
    const testData = {
        type: 'FeatureCollection',
        features: [
            {
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [-86.7308, 21.2313]
                },
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
                geometry: {
                    type: 'Point',
                    coordinates: [-86.7280, 21.2320]
                },
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
                geometry: {
                    type: 'Point',
                    coordinates: [-86.7350, 21.2280]
                },
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
                geometry: {
                    type: 'Point',
                    coordinates: [-86.7320, 21.2350]
                },
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
                geometry: {
                    type: 'Point',
                    coordinates: [-86.7290, 21.2300]
                },
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
                geometry: {
                    type: 'Point',
                    coordinates: [-86.7240, 21.2250]
                },
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
                geometry: {
                    type: 'Point',
                    coordinates: [-86.7310, 21.2290]
                },
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
    
    // Actualizar fuente de datos
    map.getSource('points').setData(testData);
    
    // Resetear filtros activos (todos activados inicialmente)
    activeFilters.clear();
    Object.keys(MAP_CONFIG.categories).forEach(category => {
        activeFilters.add(category);
    });
    
    // Aplicar filtros iniciales
    setTimeout(() => {
        applyFilters();
    }, 100);
    
    console.log(`${testData.features.length} puntos de prueba cargados`);
    showToast(`${testData.features.length} puntos cargados`, 'success', 3000);
}

/**
 * Función placeholder para calcular rutas
 * (Se implementará en pasos posteriores)
 */
function calculateRoute(destination) {
    console.log('Calculando ruta hacia:', destination);
    // Por implementar
}

/**
 * Función para toggle de filtros de categorías
 */
function toggleCategoryFilter(category, enabled) {
    try {
        console.log(`Toggle filtro ${category}: ${enabled}`);
        
        if (enabled) {
            activeFilters.add(category);
        } else {
            activeFilters.delete(category);
        }
        
        // Aplicar filtros con un pequeño delay para evitar errores
        setTimeout(() => {
            applyFilters();
        }, 50);
        
        // Actualizar UI
        const filterElement = document.querySelector(`#filter-${category}`);
        if (filterElement) {
            const container = filterElement.closest('.filter-checkbox');
            if (container) {
                container.classList.toggle('active', enabled);
            }
        }
        
        console.log('Filtros activos actualizados:', Array.from(activeFilters));
        
    } catch (error) {
        console.error('Error en toggleCategoryFilter:', error);
        showToast('Error cambiando filtro', 'error');
    }
}

/**
 * Aplicar filtros - SINTAXIS CORRECTA DE MAPBOX
 */
function applyFilters() {
    try {
        console.log('Aplicando filtros:', Array.from(activeFilters));
        
        // Verificar que las capas existan
        if (!map.getLayer('unclustered-point') || !map.getSource('points')) {
            console.warn('Capas no disponibles para filtros');
            return;
        }
        
        if (activeFilters.size === 0) {
            // Si no hay filtros activos, ocultar todos los puntos
            map.setLayoutProperty('unclustered-point', 'visibility', 'none');
            console.log('Todos los filtros desactivados - puntos ocultos');
            return;
        } else {
            // Mostrar la capa si estaba oculta
            map.setLayoutProperty('unclustered-point', 'visibility', 'visible');
        }
        
        // Si todos los filtros están activos, mostrar todos los puntos
        if (activeFilters.size === Object.keys(MAP_CONFIG.categories).length) {
            map.setFilter('unclustered-point', ['!', ['has', 'point_count']]);
            console.log('Todos los filtros activos - mostrando todos los puntos');
            return;
        }
        
        // Crear array de condiciones para el filtro
        const categoryConditions = [];
        activeFilters.forEach(category => {
            categoryConditions.push(['==', ['get', 'category'], category]);
        });
        
        // Crear filtro final
        let filter;
        if (categoryConditions.length === 1) {
            // Un solo filtro activo
            filter = [
                'all',
                ['!', ['has', 'point_count']],
                categoryConditions[0]
            ];
        } else {
            // Múltiples filtros activos
            filter = [
                'all',
                ['!', ['has', 'point_count']],
                ['any', ...categoryConditions]
            ];
        }
        
        // Aplicar el filtro
        map.setFilter('unclustered-point', filter);
        
        console.log('Filtros aplicados correctamente');
        
    } catch (error) {
        console.error('Error aplicando filtros:', error);
        console.error('Error details:', error.message);
        showToast('Error aplicando filtros', 'error');
    }
}

// CSS adicional para popups y errores
const additionalCSS = `
<style>
@keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
}

@keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
}

.popup-content {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    line-height: 1.4;
}

.popup-header {
    margin-bottom: 10px;
    border-bottom: 1px solid #eee;
    padding-bottom: 8px;
}

.popup-header h3 {
    margin: 0 0 4px 0;
    font-size: 16px;
    color: #333;
}

.popup-category {
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
}

.popup-body {
    margin: 10px 0;
}

.popup-body p {
    margin: 6px 0;
    font-size: 14px;
}

.popup-description {
    color: #666;
}

.popup-schedule, .popup-phone {
    font-size: 13px;
    color: #555;
}

.popup-website a {
    color: #007cbf;
    text-decoration: none;
}

.popup-website a:hover {
    text-decoration: underline;
}

.popup-actions {
    margin-top: 10px;
    padding-top: 8px;
    border-top: 1px solid #eee;
}

.btn-route {
    background: #007cbf;
    color: white;
    border: none;
    padding: 8px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    justify-content: center;
}

.btn-route:hover {
    background: #0056b3;
}
</style>
`;

// Inyectar CSS adicional
document.head.insertAdjacentHTML('beforeend', additionalCSS);

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function () {
    // Esperar un poco para que todo se cargue
    setTimeout(() => {
        initializeMap();
    }, 100);
});

/**
 * Función de debugging para reiniciar el mapa - ACTUALIZADA
 */
function resetMap() {
    console.log('Reiniciando mapa...');
    
    try {
        // Limpiar todas las capas
        const layersToRemove = ['clusters', 'cluster-count', 'unclustered-point'];
        layersToRemove.forEach(layerId => {
            if (map.getLayer(layerId)) {
                map.removeLayer(layerId);
            }
        });
        
        if (map.getSource('points')) {
            map.removeSource('points');
        }
        
        // Reconfigurar todo
        setTimeout(() => {
            setupClusterLayers();
            setTimeout(() => {
                loadTestData();
                console.log('Mapa reiniciado correctamente');
                showToast('Mapa reiniciado', 'success', 2000);
            }, 100);
        }, 100);
        
    } catch (error) {
        console.error('Error reiniciando mapa:', error);
        showToast('Error reiniciando mapa', 'error');
    }
}

window.resetMap = resetMap;

/**
 * Función para validar estado de filtros
 */
function validateFilters() {
    console.log('=== VALIDACIÓN DE FILTROS ===');
    console.log('Filtros activos:', Array.from(activeFilters));
    console.log('Total categorías:', Object.keys(MAP_CONFIG.categories).length);
    console.log('Capa unclustered-point existe:', !!map.getLayer('unclustered-point'));
    console.log('Fuente points existe:', !!map.getSource('points'));
    
    // Verificar checkboxes
    Object.keys(MAP_CONFIG.categories).forEach(category => {
        const checkbox = document.querySelector(`#filter-${category}`);
        const isChecked = checkbox ? checkbox.checked : false;
        const isActive = activeFilters.has(category);
        console.log(`${category}: checkbox=${isChecked}, active=${isActive}`);
        
        if (isChecked !== isActive) {
            console.warn(`¡Inconsistencia en ${category}!`);
        }
    });
    
    return {
        activeFilters: Array.from(activeFilters),
        inconsistencies: 0
    };
}

// Exponer función globalmente para debugging
window.validateFilters = validateFilters;