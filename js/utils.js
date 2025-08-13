// ===============================
// UTILITIES + UI (filters/legend)
// ===============================
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
  search: 'Search',
  // New English texts
  location_found: 'Location found successfully',
  searching: 'Searching',
  enter_search: 'Enter something to search',
  route_calculated: 'Route calculated',
  start_point_set: 'Start point set',
  click_to_set_start: 'Click on the map to set your start point',
  loading_streetview: 'Loading Street View...',
  streetview_loaded: 'Street View loaded successfully',
  streetview_not_available: 'Street View not available at this location',
  outside_service_area: 'Outside service area',
  location_outside_area: 'Location outside service area',
  choose_point_on_map: 'You can choose a start point in the map area',
  error_getting_location: 'Error getting location. Choose a point on the map.',
  calculating_route: 'Calculating route...',
  opening_navigation: 'Opening navigation in Google Maps...',
  route_deleted: 'Route deleted',
  no_active_route: 'No active route',
  start_point_not_available: 'Start point not available',
  routing_not_available: 'Routing system not available',
  error_applying_filter: 'Error applying filter'
};

document.addEventListener('DOMContentLoaded', () => {
  applyEmbeddedStyles();
  setupSidebar();
  generateUnifiedFilters();   // creates the "legend" with checkboxes
});

// ---------- Legend/Filters ----------
function generateUnifiedFilters() {
  const container = document.querySelector('.unified-filters-container');
  if (!container || !MAP_CONFIG?.categories) return;
  container.innerHTML = '';

  Object.entries(MAP_CONFIG.categories).forEach(([key, cat]) => {
    container.appendChild(createUnifiedFilterElement(key, cat));
  });
}

function createUnifiedFilterElement(categoryKey, category) {
  const name = category.name_en || category.name_es || categoryKey;

  const div = document.createElement('div');
  div.className = 'unified-filter-item active';
  div.innerHTML = `
    <input type="checkbox" id="filter-${categoryKey}" value="${categoryKey}" class="filter-checkbox-input" checked>
    <div class="filter-icon ${categoryKey}" style="background-color:${category.color}"></div>
    <span class="filter-label">${name}</span>
  `;

  const checkbox = div.querySelector('input');
  checkbox.addEventListener('change', (e) => unifiedFilterChanged(e, categoryKey, div));

  // click on the entire row
  div.addEventListener('click', (e) => { if (e.target !== checkbox) checkbox.click(); });

  return div;
}

function unifiedFilterChanged(e, categoryKey, container) {
  try {
    e.preventDefault(); e.stopPropagation();
    const enabled = e.target.checked;
    container.classList.toggle('active', enabled);
    // calls map.js
    window.toggleCategoryFilter?.(categoryKey, enabled);
  } catch (err) {
    console.error('Filter error:', err);
    e.target.checked = !e.target.checked;
    showToast(getText('error_applying_filter'), 'error');
  }
}

// ---------- Sidebar ----------
function applyEmbeddedStyles() {
  try { if (window.self !== window.top) document.body.classList.add('embedded'); }
  catch { document.body.classList.add('embedded'); }
}

function setupSidebar() {
  const sidebar = document.getElementById('sidebar');
  const toggleBtn = document.getElementById('sidebar-toggle');
  const toggleExternal = document.getElementById('sidebar-toggle-external');
  const icon = toggleBtn?.querySelector('i');
  if (!sidebar || !toggleBtn) return;

  if (window.innerWidth <= 768) { sidebar.classList.add('collapsed'); if (icon) icon.className = 'bi bi-chevron-right'; }

  toggleBtn.addEventListener('click', (e) => { e.preventDefault(); toggleSidebar(); });
  if (toggleExternal) toggleExternal.addEventListener('click', (e) => { e.preventDefault(); showSidebar(); });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !sidebar.classList.contains('collapsed')) hideSidebar();
    if (e.ctrlKey && e.key === 'm') { e.preventDefault(); toggleSidebar(); }
  });

  window.addEventListener('resize', debounce(handleWindowResize, 300));
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const icon = document.querySelector('#sidebar-toggle i');
  if (!sidebar) return;
  const collapsed = sidebar.classList.toggle('collapsed');
  if (icon) icon.className = collapsed ? 'bi bi-chevron-right' : 'bi bi-chevron-left';
  if (window.map?.resize) setTimeout(() => window.map.resize(), 250);
}
function showSidebar() { const s = document.getElementById('sidebar'); s?.classList.remove('collapsed'); document.querySelector('#sidebar-toggle i')?.classList.remove('bi-chevron-right'); document.querySelector('#sidebar-toggle i')?.classList.add('bi-chevron-left'); setTimeout(()=>window.map?.resize(),250); }
function hideSidebar() { const s = document.getElementById('sidebar'); s?.classList.add('collapsed'); document.querySelector('#sidebar-toggle i')?.classList.remove('bi-chevron-left'); document.querySelector('#sidebar-toggle i')?.classList.add('bi-chevron-right'); setTimeout(()=>window.map?.resize(),250); }

function handleWindowResize() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;
  if (window.innerWidth <= 768) hideSidebar(); else showSidebar();
}

// ---------- Toasts / Utils ----------
function getText(key){ return TEXTS[key] || key; }

function showToast(message, type='error', duration=4000) {
  if (!message) return;
  const el = document.createElement('div');
  el.className = `${type}-toast`;
  el.textContent = message;
  el.style.cssText = `
    position: fixed; top: 20px; right: 20px; color: white;
    padding: 12px 16px; border-radius: 8px; z-index: 10000;
    box-shadow: 0 4px 20px rgba(0,0,0,.3); border: 1px solid rgba(255,255,255,.2);
  `;
  el.style.background = type==='success' ? 'linear-gradient(135deg,#28a745,#218838)'
                     : type==='info' ? 'linear-gradient(135deg,#17a2b8,#138496)'
                     : 'linear-gradient(135deg,#dc3545,#c82333)';
  document.body.appendChild(el);
  setTimeout(()=>{ el.style.opacity='0'; setTimeout(()=>el.remove(),300); }, duration);
}

function toggleLoading(show=true){
  const el = document.getElementById('loading');
  if (el) el.classList.toggle('hidden', !show); // .loading-overlay.hidden { display:none; }
}

function debounce(fn, wait){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), wait); }; }
function sanitizeText(s){ if (typeof s!=='string') return ''; const d=document.createElement('div'); d.textContent=s; return d.innerHTML; }

// Expose utilities used by map.js
window.getText = getText;
window.showToast = showToast;
window.toggleLoading = toggleLoading;
window.debounce = debounce;
window.sanitizeText = sanitizeText;
window.toggleSidebar = toggleSidebar;
window.showSidebar = showSidebar;
window.hideSidebar = hideSidebar;