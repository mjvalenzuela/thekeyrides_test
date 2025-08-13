// ===============================
// MAP WITH INTEGRATED ROUTING SYSTEM
// ===============================

let map;
let userLocation = null;
let activeFilters = new Set(Object.keys(MAP_CONFIG.categories));
let routingManager; // Routing manager

/** Category mapping -> Maki icon name (v7) */
const MAKI_ICONS = {
  office: 'building',
  restaurant: 'cafe',
  tourist: 'attraction',
  shop: 'shop',
  pickup: 'marker',
  route: 'arrow'
};

// ---------- Start ----------
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(initializeMap, 100);
});

function initializeMap() {
  try {
    validateConfiguration();
    mapboxgl.accessToken = MAP_TOKENS.mapbox;

    // Responsive zoom configuration
    let initialZoom = MAP_CONFIG.zoom;
    let initialCenter = MAP_CONFIG.center;
    
    // Adjust zoom for mobile devices
    if (window.innerWidth <= 768) {
      initialZoom = MAP_CONFIG.zoom - 1; // Reduce zoom by 1 on mobile
    }
    if (window.innerWidth <= 480) {
      initialZoom = MAP_CONFIG.zoom - 1.5; // Reduce zoom by 1.5 on very small screens
    }

    map = new mapboxgl.Map({
      container: 'map',
      style: MAP_CONFIG.style,
      center: initialCenter,
      zoom: initialZoom,
      minZoom: MAP_CONFIG.minZoom,
      maxZoom: MAP_CONFIG.maxZoom,
      attributionControl: true,
      logoPosition: 'bottom-left'
    });

    map.on('load', handleMapLoad);
    map.on('error', (e) => {
      console.error('Map error:', e.error);
      showToast(getText('error_load'), 'error');
      toggleLoading(false);
    });

    setupControls();
    
    // Listen for window resize to adjust zoom
    window.addEventListener('resize', debounce(handleWindowResize, 300));
    
  } catch (err) {
    console.error('Error initializing map:', err);
    showToast(getText('error_load'), 'error');
    toggleLoading(false);
  }
}

function handleWindowResize() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;
  if (window.innerWidth <= 768) hideSidebar(); else showSidebar();
  
  // Adjust zoom on resize if needed
  if (map) {
    const currentZoom = map.getZoom();
    let targetZoom = MAP_CONFIG.zoom;
    
    if (window.innerWidth <= 768) {
      targetZoom = MAP_CONFIG.zoom - 1;
    }
    if (window.innerWidth <= 480) {
      targetZoom = MAP_CONFIG.zoom - 1.5;
    }
    
    // Only adjust if zoom difference is significant
    if (Math.abs(currentZoom - targetZoom) > 0.5) {
      map.easeTo({ zoom: targetZoom, duration: 500 });
    }
  }
}

async function handleMapLoad() {
  await loadMakiIcons();   
  setupSourceAndLayer();   
  await loadMapData();     
  setupInteractions();     
  
  // Initialize routing system
  await initializeRoutingSystem();
  
  // Load Street View after everything is ready
  await initializeStreetView();
  
  toggleLoading(false);
}

// Initialize routing system
async function initializeRoutingSystem() {
  try {
    routingManager = new RoutingManager(map);
    window.routingManager = routingManager; // Expose globally
    console.log('✅ Routing system initialized');
  } catch (error) {
    console.error('❌ Error initializing routing system:', error);
    showToast(getText('routing_not_available'), 'error', 3000);
  }
}

async function initializeStreetView() {
  try {
    if (typeof google === 'undefined') {
      await window.loadGoogleMapsAPI();
    }

    if (typeof google !== 'undefined' && google.maps) {
      window.streetViewManager = new StreetViewManager(map);
      console.log('✅ Street View integration initialized');
    } else {
      console.warn('⚠️ Google Maps API not available - Street View disabled');
    }
  } catch (error) {
    console.error('❌ Error initializing Street View:', error);
  }
}

// ---------- Controls ----------
function setupControls() {
  map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'top-right');
  map.addControl(new mapboxgl.FullscreenControl(), 'top-right');
  map.addControl(new mapboxgl.ScaleControl({ maxWidth: 120, unit: 'metric' }), 'bottom-right');

  const locateBtn = document.getElementById('locate-btn');
  if (locateBtn) locateBtn.addEventListener('click', requestUserLocation);

  const input = document.getElementById('search-input');
  const btn = document.getElementById('search-btn');
  if (input && btn) {
    btn.addEventListener('click', () => doSearch(input.value));
    input.addEventListener('keypress', (e) => e.key === 'Enter' && doSearch(input.value));
  }
}

function doSearch(q) {
  q = (q || '').trim();
  if (!q) return showToast(getText('enter_search'), 'info', 2000);
  showToast(`${getText('searching')}: "${q}"`, 'info', 1500);
}

// ---------- MAKI Icons (SDF) ----------
async function loadMakiIcons() {
  map.on('styleimagemissing', (e) => ensureMakiIcon(e.id));

  const needed = new Set([...Object.values(MAKI_ICONS), 'marker']);
  for (const name of needed) await ensureMakiIcon(`maki-${name}`);

  console.log('Maki icons ready for use');
}

async function ensureMakiIcon(requestedId) {
  if (map.hasImage(requestedId)) return;
  const name = requestedId.replace(/^maki-/, '');
  try {
    const url = `https://unpkg.com/@mapbox/maki@7.2.0/icons/${name}.svg`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const svg = await res.text();

    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try { if (!map.hasImage(requestedId)) map.addImage(requestedId, img, { sdf: true }); }
      catch (e) { console.warn('addImage failed', requestedId, e); }
      finally { URL.revokeObjectURL(img.src); }
    };
    img.src = URL.createObjectURL(blob);
  } catch (err) {
    console.warn(`[Maki] Could not load "${requestedId}": ${err.message}`);
  }
}

// ---------- Source + Layer (no clusters) ----------
function setupSourceAndLayer() {
  if (map.getLayer('points-layer')) map.removeLayer('points-layer');
  if (map.getLayer('points-badge')) map.removeLayer('points-badge');
  if (map.getSource('points')) map.removeSource('points');

  map.addSource('points', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] }
  });

  // 1) Badge background (colored circle)
  map.addLayer({
    id: 'points-badge',
    type: 'circle',
    source: 'points',
    paint: {
      'circle-radius': [
        'interpolate', ['linear'], ['zoom'],
        10, 10,
        14, 14,
        16, 18
      ],
      'circle-color': [
        'match', ['get', 'category'],
        'office',      MAP_CONFIG.categories.office?.color || '#238F9E',
        'restaurant',  MAP_CONFIG.categories.restaurant?.color || '#41ACBB',
        'tourist',     MAP_CONFIG.categories.tourist?.color || '#92DDE8',
        'shop',        MAP_CONFIG.categories.shop?.color || '#65C6D4',
        'pickup',      MAP_CONFIG.categories.pickup?.color || '#004494',
        'route',       MAP_CONFIG.categories.route?.color || '#004494',
        '#238F9E'
      ],
      'circle-opacity': 0.95,
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 2
    }
  });

  // 2) White pictogram (SDF) on top of circle
  map.addLayer({
    id: 'points-layer',
    type: 'symbol',
    source: 'points',
    layout: {
      'icon-image': getMakiIconExpression(),
      'icon-size': [
        'interpolate', ['linear'], ['zoom'],
        10, 0.9,
        14, 1.1,
        16, 1.3
      ],
      'icon-allow-overlap': true
    },
    paint: {
      'icon-color': '#ffffff',
      'icon-halo-color': 'rgba(0,0,0,0.15)',
      'icon-halo-width': 0.5,
      'icon-opacity': 0.98
    }
  });
}

function getMakiIconExpression() {
  const expr = ['case'];
  Object.entries(MAKI_ICONS).forEach(([cat, name]) => {
    expr.push(['==', ['get', 'category'], cat], `maki-${name}`);
  });
  expr.push('maki-marker');
  return expr;
}

// ---------- Interactions ----------
function setupInteractions() {
  const L = 'points-layer';
  map.on('mouseenter', L, () => map.getCanvas().style.cursor = 'pointer');
  map.on('mouseleave', L, () => map.getCanvas().style.cursor = '');

  map.on('click', L, (e) => {
    if (!e.features?.length) return;
    const f = e.features[0];
    showPointPopup(f, e.lngLat);
    e.preventDefault();
  });
}

// Updated popup with side-by-side "Go" and "See" buttons
function showPointPopup(feature, lngLat) {
  const p = feature.properties || {};
  const cat = MAP_CONFIG.categories[p.category];
  const catName = cat ? (cat.name_en || cat.name_es) : 'Unknown';
  const title = p.nombre_en || p.nombre_es || p.name || 'Unnamed Point';
  const color = cat?.color || '#000';
  const coordinates = feature.geometry.coordinates;

  // Street View button if available
  const streetViewBtn = window.streetViewManager ? 
    `<button class="popup-streetview-btn" onclick="window.streetViewManager.loadStreetView(${coordinates[1]}, ${coordinates[0]}, '${sanitizeText(title)}')">
       <i class="bi bi-camera"></i>
       See
     </button>` : '';

  // "Go" button - always visible
  const routeBtn = `
    <button class="popup-route-btn" onclick="window.routingManager?.createRouteOptionsPopup([${coordinates[0]}, ${coordinates[1]}], '${sanitizeText(title)}')">
      <i class="bi bi-geo-alt"></i>
      Go
    </button>`;

  // Button container for side-by-side layout
  const buttonsHtml = streetViewBtn ? 
    `<div class="popup-buttons-container">${routeBtn}${streetViewBtn}</div>` : 
    routeBtn;

  const html = `
    <div class="popup-content">
      <div class="popup-header">
        <h4>${sanitizeText(title)}</h4>
        <span class="popup-category" style="background-color:${color}">${sanitizeText(catName)}</span>
      </div>
      <div class="popup-body">
        ${p.descripcion_en || p.descripcion_es ? `<p class="popup-description">${sanitizeText(p.descripcion_en || p.descripcion_es)}</p>` : ''}
        ${p.horario ? `<p class="popup-detail"><strong>${getText('schedule')}:</strong> ${sanitizeText(p.horario)}</p>` : ''}
        ${p.telefono ? `<p class="popup-detail"><strong>${getText('phone')}:</strong> ${sanitizeText(p.telefono)}</p>` : ''}
        ${p.website ? `<p class="popup-website"><a href="${sanitizeText(p.website)}" target="_blank" rel="noopener">${getText('website')}</a></p>` : ''}
        ${buttonsHtml}
      </div>
    </div>`;
    
  new mapboxgl.Popup({ offset: 25, closeOnClick: true, closeButton: true })
    .setLngLat(lngLat).setHTML(html).addTo(map);
}

// ---------- Data + Filters ----------
async function loadMapData() {
  try {
    toggleLoading(true);
    const data = await window.dataService.loadData();
    if (!data?.features?.length) throw new Error('No data');

    map.getSource('points').setData(data);

    activeFilters = new Set(Object.keys(MAP_CONFIG.categories));
    updateCategoryFiltersFromData(data);
    applyFilters();

    console.log('Data loaded successfully:', {
      features: data.features.length,
      metadata: data.metadata || {},
      cacheInfo: window.dataService.getCacheInfo?.()
    });
  } catch (err) {
    console.error('Error loading data:', err);
    showToast(getText('error_load'), 'error');
  } finally {
    toggleLoading(false);
  }
}

function updateCategoryFiltersFromData(geojson) {
  const present = new Set();
  geojson.features.forEach(f => { if (f.properties?.category) present.add(f.properties.category); });

  Object.keys(MAP_CONFIG.categories).forEach(k => {
    const el = document.querySelector(`#filter-${k}`);
    const box = el?.closest('.unified-filter-item');
    if (!box) return;
    box.style.display = present.has(k) ? 'flex' : 'none';
    box.classList.toggle('active', present.has(k));
    if (el) el.checked = present.has(k);
  });

  console.log('Categories found in data:', Array.from(present));
}

function toggleCategoryFilter(category, enabled) {
  if (enabled) activeFilters.add(category); else activeFilters.delete(category);
  applyFilters();
}

function applyFilters() {
  const layers = ['points-badge', 'points-layer'];
  const all = Object.keys(MAP_CONFIG.categories);

  layers.forEach(id => {
    if (!map.getLayer(id)) return;

    if (activeFilters.size === 0) {
      map.setLayoutProperty(id, 'visibility', 'none');
      return;
    }
    map.setLayoutProperty(id, 'visibility', 'visible');

    if (activeFilters.size === all.length) {
      map.setFilter(id, true);
    } else {
      const checks = Array.from(activeFilters).map(c => ['==', ['get', 'category'], c]);
      map.setFilter(id, checks.length === 1 ? checks[0] : ['any', ...checks]);
    }
  });
}

// ---------- Updated Geolocation ----------
function requestUserLocation() {
  if (!navigator.geolocation) return showToast('Geolocation not supported', 'error');
  const btn = document.getElementById('locate-btn');
  setLocateBtn(btn, true);
  navigator.geolocation.getCurrentPosition(
    pos => onLocationOK(pos, btn),
    err => onLocationErr(err, btn),
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
  );
}

// Updated to sync with routing system (including manual locations)
function onLocationOK(position, btn) {
  const coords = [position.coords.longitude, position.coords.latitude];
  userLocation = coords;
  
  // Sync with routing system
  if (routingManager) {
    routingManager.setUserLocation(coords);
  }
  
  map.flyTo({ center: coords, zoom: 16, duration: 1500 });
  addUserLocationMarker(coords);
  setLocateBtn(btn, false);
  showToast(getText('location_found'), 'success', 2000);
}

function onLocationErr(err, btn) {
  console.error('Geolocation error:', err);
  showToast(getText('error_location'), 'error');
  setLocateBtn(btn, false);
}

function setLocateBtn(button, busy) {
  if (!button) return;
  button.classList.toggle('active', !!busy);
  button.innerHTML = busy ? '<i class="bi bi-arrow-repeat spinner-border spinner-border-sm"></i>' : '<i class="bi bi-geo-alt"></i>';
}

function addUserLocationMarker(coords) {
  if (map.getSource('user-location')) { 
    map.removeLayer('user-location-layer'); 
    map.removeSource('user-location'); 
  }

  map.addSource('user-location', {
    type: 'geojson',
    data: { 
      type: 'FeatureCollection', 
      features: [{ 
        type: 'Feature', 
        geometry: { type: 'Point', coordinates: coords } 
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
      'circle-opacity': 0.85
    }
  });
}

// ---------- Validation ----------
function validateConfiguration() {
  if (typeof MAP_TOKENS === 'undefined') throw new Error('MAP_TOKENS missing');
  if (!MAP_TOKENS.mapbox || MAP_TOKENS.mapbox === 'your_real_token_here') throw new Error('Mapbox token not configured');
  if (typeof mapboxgl === 'undefined') throw new Error('Mapbox GL not loaded');
}

// Helper functions for routing system
function getUserLocation() {
  return userLocation;
}

function hasUserLocation() {
  return !!userLocation;
}

// Expose global functions
window.toggleCategoryFilter = toggleCategoryFilter;
window.toggleSidebar = toggleSidebar;
window.showSidebar = showSidebar;
window.hideSidebar = hideSidebar;
window.getUserLocation = getUserLocation;
window.hasUserLocation = hasUserLocation;