// Global map variables
let map;
let userLocation = null;
let activeFilters = new Set(Object.keys(MAP_CONFIG.categories));
let markersLayer = null;
let clustersLayer = null;

/**
 * Initialize main map
 */
function initializeMap() {
    try {
        validateConfiguration();
        
        // Set access token
        mapboxgl.accessToken = MAP_TOKENS.mapbox;

        // Create map instance
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
        setupAutoUpdateListener();
        setupMobileDefaults(); // Nueva función para móvil

    } catch (error) {
        console.error('Error initializing map:', error);
        showToast(getText('error_load'), 'error');
    }
}

/**
 * Setup default behavior for mobile devices
 */
function setupMobileDefaults() {
    // En móvil, ocultar sidebar por defecto
    if (window.innerWidth <= 768) {
        setTimeout(() => {
            hideSidebar();
        }, 100);
    }
}

/**
 * Setup listener for automatic data updates
 */
function setupAutoUpdateListener() {
    document.addEventListener('dataUpdated', (event) => {
        const { source, data } = event.detail;
        
        if (data && data.features && map.getSource('points')) {
            console.log(`Updating map with ${data.features.length} points from ${source}`);
            
            // Update map silently
            map.getSource('points').setData(data);
            
            // Update filters to show new categories if any
            updateCategoryFiltersFromData(data);
            
            // Apply current filters
            setTimeout(() => {
                applyFilters();
            }, 100);
            
            // Show subtle notification
            if (source === 'auto-refresh') {
                showToast(`Map updated: ${data.features.length} points`, 'success', 2000);
            }
        }
    });
}

/**
 * Validate configuration before initialization
 */
function validateConfiguration() {
    if (typeof MAP_TOKENS === 'undefined') {
        throw new Error('MAP_TOKENS is not defined. Check that config/config.js is loading correctly.');
    }

    if (!MAP_TOKENS.mapbox || MAP_TOKENS.mapbox === 'your_real_token_here') {
        throw new Error('Mapbox token not configured. Edit config/config.js and add your real token.');
    }

    if (typeof mapboxgl === 'undefined') {
        throw new Error('Mapbox GL JS is not loaded correctly.');
    }
}

/**
 * Setup map events
 */
function setupMapEvents() {
    map.on('load', handleMapLoad);
    map.on('error', handleMapError);
    map.on('zoomend', handleZoomEnd);
    map.on('click', handleMapClick);
}

/**
 * Handle map load event
 */
function handleMapLoad() {
    loadMapIcons(); // Cargar iconos primero
    setupClusterLayers();
    loadMapData();
    setupMapInteractions();
    toggleLoading(false);
}

/**
 * Load custom icons for categories - NUEVO
 */
function loadMapIcons() {
    const iconPromises = [];
    
    Object.entries(MAP_CONFIG.categories).forEach(([categoryKey, category]) => {
        if (category.icon && category.icon.includes('bi-')) {
            // Crear icono SVG para Bootstrap Icons
            const iconName = category.icon.replace('bi bi-', '');
            const svg = createSVGIcon(iconName, category.color);
            
            const promise = new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                    if (!map.hasImage(`icon-${categoryKey}`)) {
                        map.addImage(`icon-${categoryKey}`, img);
                    }
                    resolve();
                };
                img.src = 'data:image/svg+xml;base64,' + btoa(svg);
            });
            
            iconPromises.push(promise);
        }
    });
    
    return Promise.all(iconPromises);
}

/**
 * Create SVG icon - NUEVO
 */
function createSVGIcon(iconName, color) {
    // Mapeo de iconos Bootstrap a SVG paths
    const iconPaths = {
        'building': 'M6.5 14.5v-3.505c0-.245.25-.495.5-.495h2c.25 0 .5.25.5.495V14.5h4.5a.5.5 0 0 0 .5-.5V2a.5.5 0 0 0-.5-.5H1.5A.5.5 0 0 0 1 2v12a.5.5 0 0 0 .5.5h5zM3 2.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm0 3a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm0 3a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm6-6a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm0 3a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1z',
        'geo-alt': 'M12.166 8.94c-.524 1.062-1.234 2.12-1.96 3.07A31.493 31.493 0 0 1 8 14.58a31.481 31.481 0 0 1-2.206-2.57c-.726-.95-1.436-2.008-1.96-3.07C3.304 7.867 3 6.862 3 6a5 5 0 0 1 10 0c0 .862-.305 1.867-.834 2.94zM8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10z M8 8a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm0 1a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
        'cup-hot': 'M.5 6a.5.5 0 0 0-.488.608l1.652 7.434A2.5 2.5 0 0 0 4.104 16h5.792a2.5 2.5 0 0 0 2.44-1.958l.131-.59a3 3 0 0 0 1.3-5.854l.221-.99A.5.5 0 0 0 13.5 6H.5zM13 12.5a2.01 2.01 0 0 1-.316-.025l.081-.36.063-.283a1 1 0 0 0-1.97-.347l-.483 2.183a1.5 1.5 0 0 1-1.464 1.179H4.104a1.5 1.5 0 0 1-1.464-1.179L1.124 8.5h11.26l-.045.201-.183.82c.292.15.54.37.729.631.15.2.286.434.386.699.014.039.028.078.042.118.093.282.154.583.154.898zM4.553 7.776c.82-1.641 1.717-2.753 2.093-3.13l.708.708c-.29.29-1.128 1.311-1.907 2.87l-.894-.448z',
        'camera': 'M15 12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h1.172a3 3 0 0 0 2.12-.879l.83-.828A1 1 0 0 1 6.827 3h2.344a1 1 0 0 1 .707.293l.828.828A3 3 0 0 0 12.828 5H14a1 1 0 0 1 1 1v6zM2 4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-1.172a2 2 0 0 1-1.414-.586l-.828-.828A2 2 0 0 0 9.172 2H6.828a2 2 0 0 0-1.414.586l-.828.828A2 2 0 0 1 3.172 4H2z M8 11a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5zm0 1a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
        'shop': 'M2.97 1.35A1 1 0 0 1 3.73 1h8.54a1 1 0 0 1 .76.35l2.609 3.044A1.5 1.5 0 0 1 16 5.37v.255a2.375 2.375 0 0 1-4.25 1.458A2.371 2.371 0 0 1 9.875 8 2.37 2.37 0 0 1 8 7.083 2.37 2.37 0 0 1 6.125 8a2.37 2.37 0 0 1-1.875-.917A2.375 2.375 0 0 1 0 5.625V5.37a1.5 1.5 0 0 1 .361-.976l2.61-3.045zm1.78 4.275a1.375 1.375 0 0 0 2.75 0 .5.5 0 0 1 1 0 1.375 1.375 0 0 0 2.75 0 .5.5 0 0 1 1 0 1.375 1.375 0 1 0 2.75 0V5.37a.5.5 0 0 0-.12-.325L12.27 2H3.73L1.12 5.045A.5.5 0 0 0 1 5.37v.255a1.375 1.375 0 0 0 2.75 0 .5.5 0 0 1 1 0zM1.5 8.5A.5.5 0 0 1 2 9v6h1v-5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v5h6V9a.5.5 0 0 1 1 0v6.5a.5.5 0 0 1-.5.5H2a.5.5 0 0 1-.5-.5V9a.5.5 0 0 1 .5-.5zM4 15h3v-5H4v5z',
        'arrow-right': 'M1 8a.5.5 0 0 1 .5-.5h11.793l-3.147-3.146a.5.5 0 0 1 .708-.708l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L13.293 8.5H1.5A.5.5 0 0 1 1 8z'
    };
    
    const path = iconPaths[iconName] || iconPaths['geo-alt']; // fallback
    
    return `<svg width="24" height="24" viewBox="0 0 16 16" fill="${color}" xmlns="http://www.w3.org/2000/svg">
        <circle cx="8" cy="8" r="8" fill="white" stroke="${color}" stroke-width="2"/>
        <path d="${path}" fill="${color}"/>
    </svg>`;
}

/**
 * Handle map errors
 */
function handleMapError(e) {
    console.error('Map error:', e.error);
    showToast(getText('error_load'), 'error');
}

/**
 * Handle zoom changes
 */
function handleZoomEnd() {
    if (map.getLayer('clusters') && map.getLayer('cluster-count')) {
        updateClusterVisibility();
    }
}

/**
 * Handle map clicks
 */
function handleMapClick(e) {
    if (!e.defaultPrevented) {
        closeAllPopups();
    }
}

/**
 * Setup map controls
 */
function setupMapControls() {
    // Navigation control
    const navControl = new mapboxgl.NavigationControl({
        visualizePitch: true,
        showZoom: true,
        showCompass: true
    });
    map.addControl(navControl, 'top-right');

    // Fullscreen control
    map.addControl(new mapboxgl.FullscreenControl(), 'top-right');

    // Scale control
    const scaleControl = new mapboxgl.ScaleControl({
        maxWidth: 100,
        unit: 'metric'
    });
    map.addControl(scaleControl, 'bottom-right');

    setupGeolocationControl();
    setupSearchControl();
}

/**
 * Setup custom geolocation control
 */
function setupGeolocationControl() {
    const locateBtn = document.getElementById('locate-btn');
    if (locateBtn) {
        locateBtn.addEventListener('click', requestUserLocation);
    }
}

/**
 * Setup search control
 */
function setupSearchControl() {
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    
    if (searchInput && searchBtn) {
        searchBtn.addEventListener('click', handleSearch);
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleSearch();
            }
        });
        
        // Debounced search while typing
        searchInput.addEventListener('input', debounce(handleLiveSearch, 300));
    }
}

/**
 * Handle search functionality
 */
function handleSearch() {
    const searchInput = document.getElementById('search-input');
    const query = searchInput?.value.trim();
    
    if (!query) {
        showToast('Please enter a search term', 'info', 3000);
        return;
    }
    
    // Simple search implementation - can be enhanced with Mapbox Geocoding API
    console.log('Searching for:', query);
    showToast(`Searching for "${query}"...`, 'info', 2000);
}

/**
 * Handle live search (while typing)
 */
function handleLiveSearch() {
    const searchInput = document.getElementById('search-input');
    const query = searchInput?.value.trim();
    
    if (query && query.length > 2) {
        // Implement live search suggestions here
        console.log('Live search:', query);
    }
}

/**
 * Request user location
 */
function requestUserLocation() {
    const locateBtn = document.getElementById('locate-btn');

    if (!navigator.geolocation) {
        showToast('Geolocation not supported by this browser', 'error');
        return;
    }

    setLocationButtonState(locateBtn, true);

    const locationOptions = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
    };

    navigator.geolocation.getCurrentPosition(
        (position) => handleLocationSuccess(position, locateBtn),
        (error) => handleLocationError(error, locateBtn),
        locationOptions
    );
}

/**
 * Handle successful location retrieval
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
    showToast('Location found successfully', 'success', 2000);
}

/**
 * Handle location error
 */
function handleLocationError(error, locateBtn) {
    console.error('Geolocation error:', error);
    showToast(getText('error_location'), 'error');
    setLocationButtonState(locateBtn, false);
}

/**
 * Set location button state
 */
function setLocationButtonState(button, isLoading) {
    if (isLoading) {
        button.classList.add('active');
        button.innerHTML = '<i class="bi bi-arrow-repeat spinner-border spinner-border-sm"></i>';
    } else {
        button.classList.remove('active');
        button.innerHTML = '<i class="bi bi-geo-alt"></i>';
    }
}

/**
 * Add user location marker
 */
function addUserLocationMarker(coords) {
    removeExistingUserLocation();

    // Add new marker
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
 * Remove existing user location marker
 */
function removeExistingUserLocation() {
    if (map.getSource('user-location')) {
        map.removeLayer('user-location-layer');
        map.removeSource('user-location');
    }
    if (map.getSource('user-location-pulse')) {
        map.removeLayer('user-location-pulse-layer');
        map.removeSource('user-location-pulse');
    }
}

/**
 * Add pulse animation for user location
 */
function addUserLocationPulse(coords) {
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
 * Setup clustering layers
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
        console.error('Error setting up clustering layers:', error);
        showToast('Error setting up map', 'error');
    }
}

/**
 * Remove existing layers
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
 * Create map data source
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
 * Create clustering layers - MODIFICADO para iconos
 */
function createClusterLayers() {
    // Cluster layer
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
    
    // Cluster count layer
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
    
    // Individual points layer with ICONS
    map.addLayer({
        id: 'unclustered-point',
        type: 'symbol',
        source: 'points',
        filter: ['!', ['has', 'point_count']],
        layout: {
            'icon-image': getCategoryIconExpression(),
            'icon-size': [
                'interpolate',
                ['linear'],
                ['zoom'],
                10, 0.8,
                15, 1.0,
                18, 1.2
            ],
            'icon-allow-overlap': true,
            'icon-ignore-placement': false
        }
    });
}

/**
 * Generate icon expression by category - NUEVO
 */
function getCategoryIconExpression() {
    const iconExpression = ['case'];
    
    Object.keys(MAP_CONFIG.categories).forEach(category => {
        iconExpression.push(
            ['==', ['get', 'category'], category],
            `icon-${category}`
        );
    });
    
    iconExpression.push('icon-office'); // Default icon
    return iconExpression;
}

/**
 * Generate color expression by category - MANTENIDO para fallback
 */
function getCategoryColorExpression() {
    const colorExpression = ['case'];
    
    Object.keys(MAP_CONFIG.categories).forEach(category => {
        colorExpression.push(
            ['==', ['get', 'category'], category],
            MAP_CONFIG.categories[category].color
        );
    });
    
    colorExpression.push('#6c757d'); // Default color
    return colorExpression;
}

/**
 * Setup map interactions
 */
function setupMapInteractions() {
    try {
        const requiredLayers = ['clusters', 'unclustered-point'];
        const missingLayers = requiredLayers.filter(layerId => !map.getLayer(layerId));
        
        if (missingLayers.length > 0) {
            console.warn('Missing layers for interactions:', missingLayers);
            return;
        }
        
        setupHoverEffects();
        setupClickEvents();
        
    } catch (error) {
        console.error('Error setting up interactions:', error);
    }
}

/**
 * Setup hover effects
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
 * Setup click events
 */
function setupClickEvents() {
    map.on('click', 'clusters', handleClusterClick);
    map.on('click', 'unclustered-point', handlePointClick);
}

/**
 * Handle cluster click
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
                    console.error('Error getting cluster zoom:', err);
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
 * Handle point click
 */
function handlePointClick(e) {
    if (e.features.length > 0) {
        showPointPopup(e.features[0], e.lngLat);
    }
    e.preventDefault();
}

/**
 * Update cluster visibility based on zoom
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
        console.error('Error updating cluster visibility:', error);
    }
}

/**
 * Show point popup - CORREGIDO para mostrar nombre correcto
 */
function showPointPopup(feature, lngLat) {
    const properties = feature.properties;
    const category = MAP_CONFIG.categories[properties.category];
    const categoryName = category ? (category.name_en || category.name_es) : 'Unknown';

    // CORREGIDO: usar los nombres reales del punto
    const title = properties.nombre_en || properties.nombre_es || properties.name || 'Unnamed Point';

    const popupContent = createPopupContent(properties, category, categoryName, lngLat, title);

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
 * Create popup content - CORREGIDO con título correcto
 */
function createPopupContent(properties, category, categoryName, lngLat, title) {
    const description = properties.descripcion_en || properties.descripcion_es || properties.description || '';
    const color = category ? category.color : '#000';
    
    return `
        <div class="popup-content">
            <div class="popup-header">
                <h4>${sanitizeText(title)}</h4>
                <span class="popup-category" style="background-color: ${color}">${sanitizeText(categoryName)}</span>
            </div>
            <div class="popup-body">
                ${description ? `<p class="popup-description">${sanitizeText(description)}</p>` : ''}
                ${properties.horario ? `<p class="popup-detail"><i class="bi bi-clock"></i> <strong>Schedule:</strong> ${sanitizeText(properties.horario)}</p>` : ''}
                ${properties.telefono ? `<p class="popup-detail"><i class="bi bi-telephone"></i> <strong>Phone:</strong> ${sanitizeText(properties.telefono)}</p>` : ''}
                ${properties.website ? `<p class="popup-website"><i class="bi bi-globe"></i> <a href="${sanitizeText(properties.website)}" target="_blank" rel="noopener">Website</a></p>` : ''}
            </div>
            <div class="popup-actions">
                ${userLocation ? createRouteButton(lngLat) : ''}
            </div>
        </div>
    `;
}

/**
 * Create route button
 */
function createRouteButton(lngLat) {
    return `
        <button onclick="calculateRoute([${lngLat.lng}, ${lngLat.lat}])" class="btn-route">
            <i class="bi bi-signpost-2"></i> ${getText('route_to')}
        </button>
    `;
}

/**
 * Close all popups
 */
function closeAllPopups() {
    const popups = document.getElementsByClassName('mapboxgl-popup');
    Array.from(popups).forEach(popup => popup.remove());
}

/**
 * Load map data
 */
async function loadMapData() {
    try {
        toggleLoading(true);
        
        // Wait for icons to load first
        await loadMapIcons();
        
        // Load data from Google Sheets using the data service
        const geoJsonData = await window.dataService.loadData();
        
        if (!geoJsonData || !geoJsonData.features || geoJsonData.features.length === 0) {
            throw new Error('No valid data received from Google Sheets');
        }
        
        // Update map with new data
        map.getSource('points').setData(geoJsonData);
        
        // Reset active filters
        activeFilters.clear();
        Object.keys(MAP_CONFIG.categories).forEach(category => {
            activeFilters.add(category);
        });
        
        // Apply filters and update UI
        setTimeout(() => {
            applyFilters();
            updateCategoryFiltersFromData(geoJsonData);
            
            // Show success message with metadata
            const metadata = geoJsonData.metadata || {};
            const message = `Loaded ${geoJsonData.features.length} points from ${metadata.source || 'data source'}`;
            showToast(message, 'success', 4000);
            
            // Log metadata for debugging
            console.log('Data loaded successfully:', {
                features: geoJsonData.features.length,
                metadata: metadata,
                cacheInfo: window.dataService.getCacheInfo()
            });
            
        }, 100);
        
    } catch (error) {
        console.error('Error loading map data:', error);
        showToast('Error loading data from Google Sheets. Using fallback data.', 'error', 5000);
        
        // Load fallback data
        loadFallbackData();
    } finally {
        toggleLoading(false);
    }
}

/**
 * Load fallback data if Google Sheets fails
 */
function loadFallbackData() {
    const fallbackData = window.dataService.getFallbackData();
    
    map.getSource('points').setData(fallbackData);
    
    // Reset active filters
    activeFilters.clear();
    Object.keys(MAP_CONFIG.categories).forEach(category => {
        activeFilters.add(category);
    });
    
    setTimeout(() => {
        applyFilters();
        showToast('Using fallback data', 'info', 3000);
    }, 100);
}

/**
 * Update category filters based on actual data
 */
function updateCategoryFiltersFromData(geoJsonData) {
    // Get unique categories from the data
    const categoriesInData = new Set();
    geoJsonData.features.forEach(feature => {
        if (feature.properties.category) {
            categoriesInData.add(feature.properties.category);
        }
    });
    
    // Update filter UI to show/hide categories based on available data
    Object.keys(MAP_CONFIG.categories).forEach(categoryKey => {
        const filterElement = document.querySelector(`#filter-${categoryKey}`);
        const container = filterElement?.closest('.filter-checkbox');
        
        if (container) {
            if (categoriesInData.has(categoryKey)) {
                container.style.display = 'flex';
                container.style.opacity = '1';
            } else {
                container.style.opacity = '0.5';
                container.title = 'No data available for this category';
            }
        }
    });
    
    console.log('Categories found in data:', Array.from(categoriesInData));
}

/**
 * Create test data
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
                    horario: '24 hours',
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
 * Calculate route to destination
 */
function calculateRoute(destination) {
    if (!userLocation) {
        showToast('Please enable location first', 'info', 3000);
        requestUserLocation();
        return;
    }
    
    console.log('Calculating route to:', destination);
    showToast('Route calculation feature coming soon!', 'info', 3000);
    
    // Here you can implement route calculation using Mapbox Directions API
    // or integrate with Google Maps/Apple Maps
}

/**
 * Toggle category filter
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
        console.error('Error in toggleCategoryFilter:', error);
        showToast('Error changing filter', 'error');
    }
}

/**
 * Update filter UI
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
 * Apply filters
 */
function applyFilters() {
    try {
        if (!map.getLayer('unclustered-point') || !map.getSource('points')) {
            console.warn('Layers not available for filters');
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
        console.error('Error applying filters:', error);
        showToast('Error applying filters', 'error');
    }
}

/**
 * Create filter expression
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
 * Add refresh data functionality
 */
function refreshMapData() {
    showToast('Refreshing data...', 'info', 2000);
    loadMapData();
}

/**
 * Debug function to reset map
 */
function resetMap() {
    try {
        removeExistingLayers();
        
        setTimeout(() => {
            setupClusterLayers();
            setTimeout(() => {
                loadMapData(); // Now loads from Google Sheets
                showToast('Map reset', 'success', 2000);
            }, 100);
        }, 100);
        
    } catch (error) {
        console.error('Error resetting map:', error);
        showToast('Error resetting map', 'error');
    }
}

/**
 * Validate filter state
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

// Expose functions globally
window.resetMap = resetMap;
window.validateFilters = validateFilters;
window.calculateRoute = calculateRoute;
window.toggleSidebar = toggleSidebar;
window.showSidebar = showSidebar;
window.hideSidebar = hideSidebar;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function () {
    setTimeout(() => {
        initializeMap();
    }, 100);
});