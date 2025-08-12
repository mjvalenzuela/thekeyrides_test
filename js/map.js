// ===============================
// MAPA SIN CLÚSTERES + MAKI SDF
// ===============================

let map;
let userLocation = null;
let activeFilters = new Set(Object.keys(MAP_CONFIG.categories));

/** Mapeo de categorías -> nombre de icono Maki (v7) */
const MAKI_ICONS = {
  office: 'building',
  restaurant: 'cafe',
  tourist: 'attraction', // alterna: 'landmark' o 'monument'
  shop: 'shop',
  pickup: 'marker',
  route: 'arrow'
};

// ---------- Inicio ----------
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(initializeMap, 100);
});

function initializeMap() {
  try {
    validateConfiguration();
    mapboxgl.accessToken = MAP_TOKENS.mapbox;

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

    map.on('load', handleMapLoad);
    map.on('error', (e) => {
      console.error('Map error:', e.error);
      showToast(getText('error_load'), 'error');
      toggleLoading(false);
    });

    setupControls();
  } catch (err) {
    console.error('Error initializing map:', err);
    showToast(getText('error_load'), 'error');
    toggleLoading(false);
  }
}

async function handleMapLoad() {
  await loadMakiIcons();   // SDF, con ids propios "maki-<icon>"
  setupSourceAndLayer();   // una sola capa de puntos
  await loadMapData();     // carga datos y aplica filtros
  setupInteractions();     // hover/click
  toggleLoading(false);
}

// ---------- Controles ----------
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
  if (!q) return showToast('Enter something to search', 'info', 2000);
  showToast(`Searching: "${q}"`, 'info', 1500);
}

// ---------- Íconos MAKI (SDF propios) ----------
/** Todos los iconos se registran como SDF con id "maki-<nombre>". */
async function loadMakiIcons() {
  // bajo demanda si falta un icono
  map.on('styleimagemissing', (e) => ensureMakiIcon(e.id));

  // pre-carga los que usamos + default
  const needed = new Set([...Object.values(MAKI_ICONS), 'marker']);
  for (const name of needed) await ensureMakiIcon(`maki-${name}`);

  console.log('Iconos Maki listos para usar');
}

async function ensureMakiIcon(requestedId) {
  // requestedId viene ya como "maki-<name>"
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
      catch (e) { console.warn('addImage fallo', requestedId, e); }
      finally { URL.revokeObjectURL(img.src); }
    };
    img.src = URL.createObjectURL(blob);
  } catch (err) {
    console.warn(`[Maki] No se pudo cargar "${requestedId}": ${err.message}`);
  }
}

// ---------- Fuente + Capa (sin clústeres) ----------
function setupSourceAndLayer() {
  if (map.getLayer('points-layer')) map.removeLayer('points-layer');
  if (map.getSource('points')) map.removeSource('points');

  map.addSource('points', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] }
  });

  /*
  map.addLayer({
    id: 'points-layer',
    type: 'symbol',
    source: 'points',
    layout: {
      'icon-image': getMakiIconExpression(),
      'icon-size': [
        'interpolate', ['linear'], ['zoom'],
        10, 1.3,   // ajusta aquí si los quieres más grandes
        14, 1.9,
        16, 2.4
      ],
      'icon-allow-overlap': true
    },
    paint: {
      'icon-color': [
        'match', ['get', 'category'],
        'office',      MAP_CONFIG.categories.office?.color || '#238F9E',
        'restaurant',  MAP_CONFIG.categories.restaurant?.color || '#41ACBB',
        'tourist',     MAP_CONFIG.categories.tourist?.color || '#92DDE8',
        'shop',        MAP_CONFIG.categories.shop?.color || '#65C6D4',
        'pickup',      MAP_CONFIG.categories.pickup?.color || '#004494',
        'route',       MAP_CONFIG.categories.route?.color || '#004494',
        // default   '#238F9E'
      ],
      'icon-halo-color': '#ffffff',
      'icon-halo-width': 2,
      'icon-opacity': 0.98
    }
  });
  */
// 1) Fondo tipo “badge” (círculo de color)
map.addLayer({
  id: 'points-badge',
  type: 'circle',
  source: 'points',
  paint: {
    // radio escalado por zoom (ajusta a tu gusto)
    'circle-radius': [
      'interpolate', ['linear'], ['zoom'],
      10, 10,   // zoom 10 -> 10 px
      14, 14,   // zoom 14 -> 14 px
      16, 18    // zoom 16 -> 18 px
    ],
    // color por categoría (los mismos del MAP_CONFIG / leyenda)
    'circle-color': [
      'match', ['get', 'category'],
      'office',      MAP_CONFIG.categories.office?.color || '#238F9E',
      'restaurant',  MAP_CONFIG.categories.restaurant?.color || '#41ACBB',
      'tourist',     MAP_CONFIG.categories.tourist?.color || '#92DDE8',
      'shop',        MAP_CONFIG.categories.shop?.color || '#65C6D4',
      'pickup',      MAP_CONFIG.categories.pickup?.color || '#004494',
      'route',       MAP_CONFIG.categories.route?.color || '#004494',
      /* default */  '#238F9E'
    ],
    'circle-opacity': 0.95,
    'circle-stroke-color': '#ffffff',
    'circle-stroke-width': 2
  }
});

// 2) Pictograma blanco (SDF) encima del círculo
map.addLayer({
  id: 'points-layer',
  type: 'symbol',
  source: 'points',
  layout: {
    'icon-image': getMakiIconExpression(),
    'icon-size': [
      'interpolate', ['linear'], ['zoom'],
      10, 0.9,   // el icono va más pequeño que el círculo
      14, 1.1,
      16, 1.3
    ],
    'icon-allow-overlap': true
  },
  paint: {
    'icon-color': '#ffffff',       // pictograma blanco para que calce con la leyenda
    'icon-halo-color': 'rgba(0,0,0,0.15)',
    'icon-halo-width': 0.5,
    'icon-opacity': 0.98
  }
});



}

function getMakiIconExpression() {
  // usamos SIEMPRE ids con prefijo "maki-"
  const expr = ['case'];
  Object.entries(MAKI_ICONS).forEach(([cat, name]) => {
    expr.push(['==', ['get', 'category'], cat], `maki-${name}`);
  });
  expr.push('maki-marker'); // default
  return expr;
}

// ---------- Interacciones ----------
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

function showPointPopup(feature, lngLat) {
  const p = feature.properties || {};
  const cat = MAP_CONFIG.categories[p.category];
  const catName = cat ? (cat.name_en || cat.name_es) : 'Unknown';
  const title = p.nombre_en || p.nombre_es || p.name || 'Unnamed Point';
  const color = cat?.color || '#000';

  const html = `
    <div class="popup-content">
      <div class="popup-header">
        <h4>${sanitizeText(title)}</h4>
        <span class="popup-category" style="background-color:${color}">${sanitizeText(catName)}</span>
      </div>
      <div class="popup-body">
        ${p.descripcion_en || p.descripcion_es ? `<p class="popup-description">${sanitizeText(p.descripcion_en || p.descripcion_es)}</p>` : ''}
        ${p.horario ? `<p class="popup-detail"><strong>Schedule:</strong> ${sanitizeText(p.horario)}</p>` : ''}
        ${p.telefono ? `<p class="popup-detail"><strong>Phone:</strong> ${sanitizeText(p.telefono)}</p>` : ''}
        ${p.website ? `<p class="popup-website"><a href="${sanitizeText(p.website)}" target="_blank" rel="noopener">Website</a></p>` : ''}
      </div>
    </div>`;
  new mapboxgl.Popup({ offset: 25, closeOnClick: true, closeButton: true })
    .setLngLat(lngLat).setHTML(html).addTo(map);
}

// ---------- Datos + Filtros ----------
async function loadMapData() {
  try {
    toggleLoading(true);
    const data = await window.dataService.loadData();
    if (!data?.features?.length) throw new Error('No data');

    map.getSource('points').setData(data);

    // mostrar todas por defecto
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

  // esconder categorías sin datos
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

/*
function applyFilters() {
  const L = 'points-layer';
  if (!map.getLayer(L)) return;

  if (activeFilters.size === 0) {
    map.setLayoutProperty(L, 'visibility', 'none');
    return;
  }
  map.setLayoutProperty(L, 'visibility', 'visible');

  if (activeFilters.size === Object.keys(MAP_CONFIG.categories).length) {
    map.setFilter(L, true);
    return;
  }
  const checks = Array.from(activeFilters).map(c => ['==', ['get', 'category'], c]);
  map.setFilter(L, ['any', ...checks]);
}*/

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


// ---------- Geolocalización ----------
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
function onLocationOK(position, btn) {
  const coords = [position.coords.longitude, position.coords.latitude];
  userLocation = coords;
  map.flyTo({ center: coords, zoom: 16, duration: 1500 });
  addUserLocationMarker(coords);
  setLocateBtn(btn, false);
  showToast('Location found successfully', 'success', 2000);
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
  // limpia anteriores
  if (map.getSource('user-location')) { map.removeLayer('user-location-layer'); map.removeSource('user-location'); }

  map.addSource('user-location', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: coords } }] }
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

// ---------- Validación ----------
function validateConfiguration() {
  if (typeof MAP_TOKENS === 'undefined') throw new Error('MAP_TOKENS missing');
  if (!MAP_TOKENS.mapbox || MAP_TOKENS.mapbox === 'your_real_token_here') throw new Error('Mapbox token not configured');
  if (typeof mapboxgl === 'undefined') throw new Error('Mapbox GL not loaded');
}

// Exponer para utils/checkbox
window.toggleCategoryFilter = toggleCategoryFilter;
window.toggleSidebar = toggleSidebar;
window.showSidebar = showSidebar;
window.hideSidebar = hideSidebar;