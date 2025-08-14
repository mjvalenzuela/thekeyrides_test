/**
 * ROUTING SYSTEM FOR MAPBOX - FIXED GOOGLE MAPS NAVIGATION
 * Integrates routes from user location to map points
 * Includes different transport modes with times and distances
 * Supports GPS location and manual start point selection
 */

class RoutingManager {
    constructor(map) {
        this.map = map;
        this.userLocation = null;
        this.manualStartLocation = null; // Manual user location
        this.currentRoute = null;
        this.routeSource = 'route-source';
        this.routeLayer = 'route-layer';
        this.startMarker = null;
        this.endMarker = null;
        this.isSettingStartPoint = false; // State for placing start point

        // Service area configuration for Key West, Florida
        this.serviceArea = {
            north: 25.0905196613355,      
            south: 24.044242791374604,    
            east: -81.63594411815554,     
            west: -81.9138529228222       
        };

        // Transport modes configuration
        this.transportModes = {
            'e-bike': {
                name: 'E-Bike',
                icon: 'bi-bicycle',
                color: '#28a745',
                speed: 20, // km/h average
                profile: 'cycling'
            },
            'golf-cart': {
                name: 'Golf Cart',
                icon: 'bi-truck',
                color: '#17a2b8',
                speed: 15, // km/h average
                profile: 'driving'
            },
            'e-moped': {
                name: 'E-Moped',
                icon: 'bi-scooter',
                color: '#ffc107',
                speed: 35, // km/h average
                profile: 'driving'
            },
            'luxury-ride': {
                name: 'Luxury Ride',
                icon: 'bi-car-front-fill',
                color: '#6f42c1',
                speed: 40, // km/h average
                profile: 'driving'
            }
        };

        this.init();
        console.log('🌎 Service Area configured:', this.serviceArea);
    }

    init() {
        this.setupRouteLayers();
        this.setupMapClickHandler();
        console.log('✅ Routing system initialized');
    }

    /**
     * Setup handler for map clicks (place start point)
     */
    setupMapClickHandler() {
        this.map.on('click', (e) => {
            if (this.isSettingStartPoint) {
                const coords = [e.lngLat.lng, e.lngLat.lat];
                this.setManualStartLocation(coords);
                this.isSettingStartPoint = false;
                this.map.getCanvas().style.cursor = '';
                showToast(getText('start_point_set'), 'success', 2000);
            }
        });
    }

    /**
     * Check if location is within service area
     */
    isLocationInServiceArea(lat, lng) {
        const inArea = lat >= this.serviceArea.south &&
            lat <= this.serviceArea.north &&
            lng >= this.serviceArea.west &&
            lng <= this.serviceArea.east;
            
        console.log('🌍 Location check:', {
            coordinates: { lat, lng },
            serviceArea: this.serviceArea,
            inArea: inArea
        });
        
        return inArea;
    }

    /**
     * Set manual start location
     */
    setManualStartLocation(coords) {
        this.manualStartLocation = coords;

        if (this.startMarker) {
            this.startMarker.remove();
        }

        this.startMarker = new mapboxgl.Marker({
            color: '#007cbf',
            scale: 0.9
        })
            .setLngLat(coords)
            .setPopup(new mapboxgl.Popup().setHTML('<strong>Start point</strong>'))
            .addTo(this.map);
    }

    /**
     * Enable start point selection mode
     */
    enableStartPointSelection() {
        this.isSettingStartPoint = true;
        this.map.getCanvas().style.cursor = 'crosshair';

        const popups = document.querySelectorAll('.mapboxgl-popup');
        popups.forEach(popup => popup.remove());

        showToast(getText('click_to_set_start'), 'info', 4000);
    }

    /**
     * Get start location (manual or GPS)
     */
    getStartLocation() {
        return this.manualStartLocation || this.userLocation;
    }

    /**
     * Convert meters to km and miles
     */
    formatDistance(meters) {
        const km = (meters / 1000).toFixed(1);
        const miles = (meters * 0.000621371).toFixed(1);
        return {
            km: km,
            miles: miles,
            display: `${km} km (${miles} mi)`
        };
    }

    /**
     * Setup layers to display routes
     */
    setupRouteLayers() {
        if (this.map.getLayer(this.routeLayer)) {
            this.map.removeLayer(this.routeLayer);
        }
        if (this.map.getSource(this.routeSource)) {
            this.map.removeSource(this.routeSource);
        }

        this.map.addSource(this.routeSource, {
            type: 'geojson',
            data: {
                type: 'FeatureCollection',
                features: []
            }
        });

        this.map.addLayer({
            id: this.routeLayer,
            type: 'line',
            source: this.routeSource,
            layout: {
                'line-join': 'round',
                'line-cap': 'round'
            },
            paint: {
                'line-color': '#007cbf',
                'line-width': 4,
                'line-opacity': 0.8
            }
        });
    }

    /**
     * Create popup with transport or location options
     */
    createRouteOptionsPopup(destination, destinationName) {
        const startLocation = this.getStartLocation();

        if (!startLocation) {
            const noLocationHTML = `
                <div class="route-options-popup">
                    <div class="route-header">
                        <h6>Where do you want to start from?</h6>
                        <p>You need to set a start point</p>
                    </div>
                    <div class="location-options">
                        <button class="location-option" onclick="window.routingManager.requestUserLocation('${destinationName.replace(/'/g, "\\'")}', [${destination[0]}, ${destination[1]}])">
                            <i class="bi bi-geo-alt" style="color: #28a745;"></i>
                            <span>Use my GPS location</span>
                        </button>
                        <button class="location-option" onclick="window.routingManager.enableStartPointSelection()">
                            <i class="bi bi-cursor" style="color: #007cbf;"></i>
                            <span>Choose point on map</span>
                        </button>
                    </div>
                    <div class="route-info">
                        <small><i class="bi bi-info-circle"></i> You can then choose your transport</small>
                    </div>
                </div>
            `;

            new mapboxgl.Popup({
                closeOnClick: false,
                closeButton: true,
                offset: 25
            })
                .setLngLat(destination)
                .setHTML(noLocationHTML)
                .addTo(this.map);
            return;
        }

        const transportButtons = Object.entries(this.transportModes)
            .map(([key, mode]) => `
                <button class="transport-option" 
                        onclick="window.routingManager.calculateRoute('${key}', [${destination[0]}, ${destination[1]}], '${destinationName.replace(/'/g, "\\'")}')">
                    <i class="${mode.icon}" style="color: ${mode.color}"></i>
                    <span>${mode.name}</span>
                    <small>~${mode.speed} km/h</small>
                </button>
            `).join('');

        const popupContent = `
            <div class="route-options-popup">
                <div class="route-header">
                    <h6>How do you want to get there?</h6>
                    <p>Select your preferred transport mode</p>
                </div>
                <div class="transport-options">
                    ${transportButtons}
                </div>
                <div class="route-info">
                    <small><i class="bi bi-info-circle"></i> Times are approximate</small>
                </div>
            </div>
        `;

        new mapboxgl.Popup({
            closeOnClick: false,
            closeButton: true,
            offset: 25
        })
            .setLngLat(destination)
            .setHTML(popupContent)
            .addTo(this.map);
    }

    /**
     * Request user location with area validation
     */
    async requestUserLocation(destinationName, destination) {
        if (!navigator.geolocation) {
            showToast('Geolocation not supported', 'error');
            return;
        }

        showToast('Getting your location...', 'info', 2000);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const coords = [position.coords.longitude, position.coords.latitude];

                console.log('🌍 GPS coordinates captured:', {
                    latitude: coords[1],
                    longitude: coords[0],
                    accuracy: position.coords.accuracy + ' meters'
                });

                const isInArea = this.isLocationInServiceArea(coords[1], coords[0]);
                
                if (!isInArea) {
                    const areaCheckHTML = `
                        <div class="route-options-popup">
                            <div class="route-header">
                                <h6>⚠️ Outside service area</h6>
                                <p>You are located outside our operation zone</p>
                            </div>
                            <div class="location-options">
                                <button class="location-option" onclick="window.routingManager.enableStartPointSelection()">
                                    <i class="bi bi-cursor" style="color: #007cbf;"></i>
                                    <span>Choose point on map</span>
                                </button>
                                <button class="location-option secondary" onclick="document.querySelectorAll('.mapboxgl-popup').forEach(p => p.remove())">
                                    <i class="bi bi-x"></i>
                                    <span>Cancel</span>
                                </button>
                            </div>
                            <div class="route-info">
                                <small><i class="bi bi-info-circle"></i> You can choose a start point in the map area</small>
                            </div>
                        </div>
                    `;

                    document.querySelectorAll('.mapboxgl-popup').forEach(popup => popup.remove());

                    new mapboxgl.Popup({
                        closeOnClick: false,
                        closeButton: true,
                        offset: 25
                    })
                        .setLngLat(destination)
                        .setHTML(areaCheckHTML)
                        .addTo(this.map);

                    showToast('Location outside service area', 'error', 4000);
                    return;
                }

                this.setUserLocation(coords);
                document.querySelectorAll('.mapboxgl-popup').forEach(popup => popup.remove());
                this.createRouteOptionsPopup(destination, destinationName);

            },
            (error) => {
                console.error('Geolocation error:', error);
                showToast('Error getting location. Choose a point on the map.', 'error', 4000);

                document.querySelectorAll('.mapboxgl-popup').forEach(popup => popup.remove());
                this.enableStartPointSelection();
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
        );
    }

    /**
     * Calculate route using Mapbox Directions API
     */
    async calculateRoute(transportMode, destination, destinationName) {
        const startLocation = this.getStartLocation();

        if (!startLocation) {
            showToast('Start point not available', 'error');
            return;
        }

        const mode = this.transportModes[transportMode];
        if (!mode) {
            showToast('Invalid transport mode', 'error');
            return;
        }

        showToast('Calculating route...', 'info', 2000);

        try {
            const popups = document.querySelectorAll('.mapboxgl-popup');
            popups.forEach(popup => popup.remove());

            const start = startLocation;
            const end = destination;

            const response = await fetch(
                `https://api.mapbox.com/directions/v5/mapbox/${mode.profile}/${start[0]},${start[1]};${end[0]},${end[1]}?` +
                `geometries=geojson&access_token=${mapboxgl.accessToken}`
            );

            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }

            const data = await response.json();

            if (!data.routes || data.routes.length === 0) {
                throw new Error('No route found');
            }

            const route = data.routes[0];
            this.displayRoute(route, mode, start, end, destinationName);

        } catch (error) {
            console.error('Error calculating route:', error);
            showToast('Error calculating route. Please try again.', 'error', 4000);
        }
    }

    /**
     * Display route on map
     */
    displayRoute(route, transportMode, start, end, destinationName) {
        this.currentRoute = route;

        this.map.getSource(this.routeSource).setData({
            type: 'Feature',
            properties: {},
            geometry: route.geometry
        });

        this.map.setPaintProperty(this.routeLayer, 'line-color', transportMode.color);

        if (this.endMarker) {
            this.endMarker.remove();
        }

        if (!this.startMarker) {
            this.startMarker = new mapboxgl.Marker({
                color: this.manualStartLocation ? '#007cbf' : '#28a745',
                scale: 0.8
            })
                .setLngLat(start)
                .setPopup(new mapboxgl.Popup().setHTML(
                    `<strong>${this.manualStartLocation ? 'Start point' : 'Your location'}</strong>`
                ))
                .addTo(this.map);
        }

        this.endMarker = new mapboxgl.Marker({
            color: transportMode.color,
            scale: 0.9
        })
            .setLngLat(end)
            .setPopup(new mapboxgl.Popup().setHTML(`<strong>${destinationName}</strong>`))
            .addTo(this.map);

        const coordinates = route.geometry.coordinates;
        const bounds = coordinates.reduce((bounds, coord) => {
            return bounds.extend(coord);
        }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));

        this.map.fitBounds(bounds, {
            padding: 50,
            maxZoom: 15
        });

        this.showRouteInfo(route, transportMode, destinationName, start, end);
    }

    /**
     * Show route information with movable popup
     */
    showRouteInfo(route, transportMode, destinationName, start, end) {
        const distanceInfo = this.formatDistance(route.distance);
        const duration = Math.round(route.duration / 60);

        const estimatedTime = Math.round((parseFloat(distanceInfo.km) / transportMode.speed) * 60);
        const finalTime = Math.max(duration, estimatedTime);

        const routeCenter = [
            (start[0] + end[0]) / 2,
            (start[1] + end[1]) / 2
        ];

        const mapCenter = this.map.getCenter();
        const offsetLng = routeCenter[0] < mapCenter.lng ? -0.01 : 0.01;
        const offsetLat = routeCenter[1] < mapCenter.lat ? -0.005 : 0.005;

        const popupPosition = [
            routeCenter[0] + offsetLng,
            routeCenter[1] + offsetLat
        ];

        const infoHTML = `
            <div class="route-info-panel">
                <div class="route-summary">
                    <div class="transport-header">
                        <i class="${transportMode.icon}" style="color: ${transportMode.color}; font-size: 1.2em;"></i>
                        <span class="transport-name">${transportMode.name}</span>
                    </div>
                    <h6>${destinationName}</h6>
                </div>
                
                <div class="route-details">
                    <div class="detail-item">
                        <i class="bi bi-geo-alt"></i>
                        <span><strong>${distanceInfo.display}</strong></span>
                    </div>
                    <div class="detail-item">
                        <i class="bi bi-clock"></i>
                        <span><strong>${finalTime} min</strong> approx.</span>
                    </div>
                    <div class="detail-item">
                        <i class="bi bi-speedometer2"></i>
                        <span>~${transportMode.speed} km/h</span>
                    </div>
                </div>
                
                <div class="route-actions">
                    <button class="btn-route-action primary" onclick="window.routingManager.startNavigation()">
                        <i class="bi bi-navigation"></i> Navigation
                    </button>
                    <button class="btn-route-action secondary" onclick="window.routingManager.clearRoute()">
                        <i class="bi bi-x"></i> Clear
                    </button>
                </div>
            </div>
        `;

        new mapboxgl.Popup({
            closeOnClick: false,
            closeButton: true,
            offset: 25,
            className: 'route-info-popup draggable-popup'
        })
            .setLngLat(popupPosition)
            .setHTML(infoHTML)
            .addTo(this.map);

        showToast(`Route calculated: ${distanceInfo.display} in ~${finalTime} min`, 'success', 4000);
    }

    /**
     * 🔧 FIXED: Start navigation with proper Google Maps URLs
     */
    startNavigation() {
        if (!this.currentRoute) {
            showToast('No active route', 'error');
            return;
        }

        const coords = this.currentRoute.geometry.coordinates;
        const destination = coords[coords.length - 1];
        const startLocation = this.getStartLocation();

        if (!startLocation) {
            showToast('Start point not available', 'error');
            return;
        }

        // 🔧 MÚLTIPLES OPCIONES DE URL PARA MEJOR COMPATIBILIDAD
        const urls = this.generateGoogleMapsUrls(startLocation, destination);
        
        // Intentar abrir con diferentes métodos
        this.tryOpenNavigation(urls);
    }

    /**
     * 🔧 NEW: Generate multiple Google Maps URL formats for better compatibility
     */
    generateGoogleMapsUrls(start, end) {
        const startCoords = `${start[1]},${start[0]}`;
        const endCoords = `${end[1]},${end[0]}`;
        
        return {
            // 1. URL de navegación directa (más probable que funcione)
            navigation: `https://www.google.com/maps/dir/?api=1&origin=${startCoords}&destination=${endCoords}&travelmode=driving`,
            
            // 2. URL de Google Maps app (móvil)
            app: `comgooglemaps://?saddr=${startCoords}&daddr=${endCoords}&directionsmode=driving`,
            
            // 3. URL universal de Google Maps
            universal: `https://maps.google.com/?saddr=${startCoords}&daddr=${endCoords}&dirflg=d`,
            
            // 4. URL de navegación con parámetros adicionales
            enhanced: `https://www.google.com/maps/dir/${startCoords}/${endCoords}/@${endCoords},12z/data=!3m1!4b1!4m2!4m1!3e0`,
            
            // 5. URL simple de direcciones
            simple: `https://www.google.com/maps/dir/${startCoords}/${endCoords}`
        };
    }

    /**
     * 🔧 NEW: Try opening navigation with multiple fallback methods
     */
    tryOpenNavigation(urls) {
        const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isAndroid = /Android/.test(navigator.userAgent);

        console.log('🗺️ Opening navigation:', { isMobile, isIOS, isAndroid });

        if (isMobile) {
            if (isIOS) {
                this.openNavigationIOS(urls);
            } else if (isAndroid) {
                this.openNavigationAndroid(urls);
            } else {
                this.openNavigationGeneric(urls);
            }
        } else {
            // Desktop/tablet
            this.openNavigationDesktop(urls);
        }
    }

    /**
     * 🔧 NEW: iOS-specific navigation opening
     */
    openNavigationIOS(urls) {
        // Intentar abrir Google Maps app primero
        const googleMapsApp = `comgooglemaps://?saddr=${this.getStartLocation()[1]},${this.getStartLocation()[0]}&daddr=${this.currentRoute.geometry.coordinates[this.currentRoute.geometry.coordinates.length - 1][1]},${this.currentRoute.geometry.coordinates[this.currentRoute.geometry.coordinates.length - 1][0]}&directionsmode=driving`;
        
        // Crear enlace temporal para intentar abrir la app
        const tempLink = document.createElement('a');
        tempLink.href = googleMapsApp;
        tempLink.style.display = 'none';
        document.body.appendChild(tempLink);
        
        // Intentar abrir la app
        tempLink.click();
        
        // Fallback a navegador después de un pequeño delay
        setTimeout(() => {
            window.open(urls.navigation, '_blank');
            document.body.removeChild(tempLink);
        }, 500);
        
        showToast('Opening Google Maps...', 'info', 3000);
    }

    /**
     * 🔧 NEW: Android-specific navigation opening
     */
    openNavigationAndroid(urls) {
        // Android: intentar intent de Google Maps primero
        const intent = `intent://maps.google.com/maps?saddr=${this.getStartLocation()[1]},${this.getStartLocation()[0]}&daddr=${this.currentRoute.geometry.coordinates[this.currentRoute.geometry.coordinates.length - 1][1]},${this.currentRoute.geometry.coordinates[this.currentRoute.geometry.coordinates.length - 1][0]}#Intent;scheme=https;package=com.google.android.apps.maps;end`;
        
        try {
            window.location.href = intent;
        } catch (e) {
            // Fallback a navegador
            window.open(urls.navigation, '_blank');
        }
        
        showToast('Opening Google Maps...', 'info', 3000);
    }

    /**
     * 🔧 NEW: Generic mobile navigation opening
     */
    openNavigationGeneric(urls) {
        // Intentar múltiples URLs en orden
        const urlsToTry = [urls.navigation, urls.universal, urls.simple];
        
        urlsToTry.forEach((url, index) => {
            setTimeout(() => {
                if (index === 0) {
                    window.open(url, '_blank');
                }
            }, index * 100);
        });
        
        showToast('Opening navigation...', 'info', 3000);
    }

    /**
     * 🔧 NEW: Desktop navigation opening
     */
    openNavigationDesktop(urls) {
        // En desktop, usar la URL de navegación más robusta
        window.open(urls.navigation, '_blank');
        showToast('Opening Google Maps in new tab...', 'info', 3000);
    }

    /**
     * Clear current route
     */
    clearRoute() {
        if (this.map.getSource(this.routeSource)) {
            this.map.getSource(this.routeSource).setData({
                type: 'FeatureCollection',
                features: []
            });
        }

        this.clearMarkers();

        const popups = document.querySelectorAll('.mapboxgl-popup');
        popups.forEach(popup => popup.remove());

        this.manualStartLocation = null;
        this.currentRoute = null;
        this.isSettingStartPoint = false;
        this.map.getCanvas().style.cursor = '';

        showToast('Route deleted', 'info', 2000);
    }

    /**
     * Clear markers
     */
    clearMarkers() {
        if (this.startMarker) {
            this.startMarker.remove();
            this.startMarker = null;
        }
        if (this.endMarker) {
            this.endMarker.remove();
            this.endMarker = null;
        }
    }

    /**
     * Set user location (from GPS)
     */
    setUserLocation(coords) {
        this.userLocation = coords;
        console.log('User location set for routing:', coords);

        if (!this.manualStartLocation && !this.startMarker) {
            this.startMarker = new mapboxgl.Marker({
                color: '#28a745',
                scale: 0.8
            })
                .setLngLat(coords)
                .setPopup(new mapboxgl.Popup().setHTML('<strong>Your location</strong>'))
                .addTo(this.map);
        }

        const routingInfo = document.getElementById('routing-info');
        if (routingInfo) {
            routingInfo.style.display = 'block';
        }
    }

    /**
     * Check if user has location (manual or GPS)
     */
    hasUserLocation() {
        return !!(this.userLocation || this.manualStartLocation);
    }

    /**
     * Get current route information
     */
    getCurrentRouteInfo() {
        return this.currentRoute ? {
            distance: this.currentRoute.distance,
            duration: this.currentRoute.duration,
            geometry: this.currentRoute.geometry,
            distanceFormatted: this.formatDistance(this.currentRoute.distance)
        } : null;
    }

    /**
     * Get service area information
     */
    getServiceAreaInfo() {
        return {
            bounds: this.serviceArea,
            center: [
                (this.serviceArea.east + this.serviceArea.west) / 2,
                (this.serviceArea.north + this.serviceArea.south) / 2
            ]
        };
    }

    /**
     * Update service area
     */
    updateServiceArea(bounds) {
        if (bounds && typeof bounds === 'object') {
            this.serviceArea = {
                north: bounds.north || this.serviceArea.north,
                south: bounds.south || this.serviceArea.south,
                east: bounds.east || this.serviceArea.east,
                west: bounds.west || this.serviceArea.west
            };
            console.log('✅ Service area updated:', this.serviceArea);
        } else {
            console.log('⚠️ updateServiceArea called without valid bounds, keeping current area:', this.serviceArea);
        }
    }

    /**
     * Destroy instance (cleanup)
     */
    destroy() {
        this.clearRoute();

        if (this.map.getLayer(this.routeLayer)) {
            this.map.removeLayer(this.routeLayer);
        }
        if (this.map.getSource(this.routeSource)) {
            this.map.removeSource(this.routeSource);
        }

        this.map.off('click');

        this.isSettingStartPoint = false;
        this.map.getCanvas().style.cursor = '';
    }
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RoutingManager;
}