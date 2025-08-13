/**
 * SISTEMA DE RUTAS PARA MAPBOX
 * Integra rutas desde ubicación del usuario hasta puntos del mapa
 * Incluye diferentes medios de transporte con tiempos y distancias
 * Soporta ubicación GPS y selección manual de punto de inicio
 */

class RoutingManager {
    constructor(map) {
        this.map = map;
        this.userLocation = null;
        this.manualStartLocation = null; // 🆕 Ubicación manual del usuario
        this.currentRoute = null;
        this.routeSource = 'route-source';
        this.routeLayer = 'route-layer';
        this.startMarker = null;
        this.endMarker = null;
        this.isSettingStartPoint = false; // 🆕 Estado para colocar punto de inicio

        // 🆕 Configuración de área de servicio (bounding box)
        this.serviceArea = {
            // Área alrededor de Isla Mujeres (ajusta según tu zona de servicio)
            north: 21.3,    // Latitud norte
            south: 21.1,    // Latitud sur  
            east: -86.6,    // Longitud este
            west: -86.8     // Longitud oeste
        };

        // Configuración de medios de transporte
        this.transportModes = {
            'e-bike': {
                name: 'E-Bike',
                icon: 'bi-bicycle',
                color: '#28a745',
                speed: 20, // km/h promedio
                profile: 'cycling'
            },
            'golf-cart': {
                name: 'Golf Cart',
                icon: 'bi-truck',
                color: '#17a2b8',
                speed: 15, // km/h promedio
                profile: 'driving'
            },
            'e-moped': {
                name: 'E-Moped',
                icon: 'bi-scooter',
                color: '#ffc107',
                speed: 35, // km/h promedio
                profile: 'driving'
            },
            'luxury-ride': {
                name: 'Luxury Ride',
                icon: 'bi-car-front-fill',
                color: '#6f42c1',
                speed: 40, // km/h promedio
                profile: 'driving'
            }
        };

        this.init();
    }

    init() {
        this.setupRouteLayers();
        this.setupMapClickHandler(); // 🆕 Handler para colocar punto de inicio
        console.log('✅ Routing system initialized');
    }

    /**
     * 🆕 Configurar handler para clicks en el mapa (colocar punto de inicio)
     */
    setupMapClickHandler() {
        this.map.on('click', (e) => {
            if (this.isSettingStartPoint) {
                const coords = [e.lngLat.lng, e.lngLat.lat];
                this.setManualStartLocation(coords);
                this.isSettingStartPoint = false;
                this.map.getCanvas().style.cursor = '';
                showToast('Punto de inicio establecido', 'success', 2000);
            }
        });
    }

    /**
     * 🆕 Verificar si ubicación está dentro del área de servicio
     */
    isLocationInServiceArea(lat, lng) {
        return lat >= this.serviceArea.south &&
            lat <= this.serviceArea.north &&
            lng >= this.serviceArea.west &&
            lng <= this.serviceArea.east;
    }

    /**
     * 🆕 Establecer ubicación manual de inicio
     */
    setManualStartLocation(coords) {
        this.manualStartLocation = coords;

        // Limpiar marcador de inicio anterior
        if (this.startMarker) {
            this.startMarker.remove();
        }

        // Agregar marcador de inicio manual
        this.startMarker = new mapboxgl.Marker({
            color: '#007cbf',
            scale: 0.9
        })
            .setLngLat(coords)
            .setPopup(new mapboxgl.Popup().setHTML('<strong>Punto de inicio</strong>'))
            .addTo(this.map);
    }

    /**
     * 🆕 Activar modo de selección de punto de inicio
     */
    enableStartPointSelection() {
        this.isSettingStartPoint = true;
        this.map.getCanvas().style.cursor = 'crosshair';

        // Cerrar popups existentes
        const popups = document.querySelectorAll('.mapboxgl-popup');
        popups.forEach(popup => popup.remove());

        showToast('Haz clic en el mapa para establecer tu punto de inicio', 'info', 4000);
    }

    /**
     * 🆕 Obtener ubicación de inicio (manual o GPS)
     */
    getStartLocation() {
        return this.manualStartLocation || this.userLocation;
    }

    /**
     * 🆕 Convertir metros a km y millas
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
     * Configurar capas para mostrar rutas
     */
    setupRouteLayers() {
        // Limpiar capas existentes
        if (this.map.getLayer(this.routeLayer)) {
            this.map.removeLayer(this.routeLayer);
        }
        if (this.map.getSource(this.routeSource)) {
            this.map.removeSource(this.routeSource);
        }

        // Agregar fuente para rutas
        this.map.addSource(this.routeSource, {
            type: 'geojson',
            data: {
                type: 'FeatureCollection',
                features: []
            }
        });

        // Agregar capa para mostrar la ruta
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
     * Crear popup con opciones de transporte o ubicación
     */
    createRouteOptionsPopup(destination, destinationName) {
        const startLocation = this.getStartLocation();

        if (!startLocation) {
            // 🆕 Mostrar opciones cuando no hay ubicación
            const noLocationHTML = `
                <div class="route-options-popup">
                    <div class="route-header">
                        <h6>¿Desde dónde quieres partir?</h6>
                        <p>Necesitas establecer un punto de inicio</p>
                    </div>
                    <div class="location-options">
                        <button class="location-option" onclick="window.routingManager.requestUserLocation('${destinationName.replace(/'/g, "\\'")}', [${destination[0]}, ${destination[1]}])">
                            <i class="bi bi-geo-alt" style="color: #28a745;"></i>
                            <span>Usar mi ubicación GPS</span>
                        </button>
                        <button class="location-option" onclick="window.routingManager.enableStartPointSelection()">
                            <i class="bi bi-cursor" style="color: #007cbf;"></i>
                            <span>Elegir punto en el mapa</span>
                        </button>
                    </div>
                    <div class="route-info">
                        <small><i class="bi bi-info-circle"></i> Después podrás elegir tu transporte</small>
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

        // Popup normal con opciones de transporte
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
                    <h6>¿Cómo quieres llegar?</h6>
                    <p>Selecciona tu medio de transporte preferido</p>
                </div>
                <div class="transport-options">
                    ${transportButtons}
                </div>
                <div class="route-info">
                    <small><i class="bi bi-info-circle"></i> Los tiempos son aproximados</small>
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
     * 🆕 Solicitar ubicación del usuario con validación de área
     */
    async requestUserLocation(destinationName, destination) {
        if (!navigator.geolocation) {
            showToast('Geolocalización no soportada', 'error');
            return;
        }

        showToast('Obteniendo tu ubicación...', 'info', 2000);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const coords = [position.coords.longitude, position.coords.latitude];

                console.log('🌍 Coordenadas GPS capturadas:', {
                    latitude: coords[1],
                    longitude: coords[0],
                    accuracy: position.coords.accuracy + ' metros'
                });

                // 🆕 Verificar si está en área de servicio
                if (!this.isLocationInServiceArea(coords[1], coords[0])) {
                    const areaCheckHTML = `
                        <div class="route-options-popup">
                            <div class="route-header">
                                <h6>⚠️ Fuera del área de servicio</h6>
                                <p>Estás ubicado fuera de nuestra zona de operación</p>
                            </div>
                            <div class="location-options">
                                <button class="location-option" onclick="window.routingManager.enableStartPointSelection()">
                                    <i class="bi bi-cursor" style="color: #007cbf;"></i>
                                    <span>Elegir punto en el mapa</span>
                                </button>
                                <button class="location-option secondary" onclick="document.querySelectorAll('.mapboxgl-popup').forEach(p => p.remove())">
                                    <i class="bi bi-x"></i>
                                    <span>Cancelar</span>
                                </button>
                            </div>
                            <div class="route-info">
                                <small><i class="bi bi-info-circle"></i> Puedes elegir un punto de inicio en el área del mapa</small>
                            </div>
                        </div>
                    `;

                    // Cerrar popup anterior y mostrar nuevo
                    document.querySelectorAll('.mapboxgl-popup').forEach(popup => popup.remove());

                    new mapboxgl.Popup({
                        closeOnClick: false,
                        closeButton: true,
                        offset: 25
                    })
                        .setLngLat(destination)
                        .setHTML(areaCheckHTML)
                        .addTo(this.map);

                    showToast('Ubicación fuera del área de servicio', 'error', 4000);
                    return;
                }

                // Ubicación válida
                this.setUserLocation(coords);

                // Cerrar popup y mostrar opciones de transporte
                document.querySelectorAll('.mapboxgl-popup').forEach(popup => popup.remove());
                this.createRouteOptionsPopup(destination, destinationName);

            },
            (error) => {
                console.error('Geolocation error:', error);
                showToast('Error obteniendo ubicación. Elige un punto en el mapa.', 'error', 4000);

                // Cerrar popup y mostrar opción manual
                document.querySelectorAll('.mapboxgl-popup').forEach(popup => popup.remove());
                this.enableStartPointSelection();
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
        );
    }

    /**
     * Calcular ruta usando Mapbox Directions API
     */
    async calculateRoute(transportMode, destination, destinationName) {
        const startLocation = this.getStartLocation();

        if (!startLocation) {
            showToast('Ubicación de inicio no disponible', 'error');
            return;
        }

        const mode = this.transportModes[transportMode];
        if (!mode) {
            showToast('Modo de transporte no válido', 'error');
            return;
        }

        showToast('Calculando ruta...', 'info', 2000);

        try {
            // Cerrar popups existentes
            const popups = document.querySelectorAll('.mapboxgl-popup');
            popups.forEach(popup => popup.remove());

            const start = startLocation;
            const end = destination;

            // Llamada a Mapbox Directions API
            const response = await fetch(
                `https://api.mapbox.com/directions/v5/mapbox/${mode.profile}/${start[0]},${start[1]};${end[0]},${end[1]}?` +
                `geometries=geojson&access_token=${mapboxgl.accessToken}`
            );

            if (!response.ok) {
                throw new Error(`Error en API: ${response.status}`);
            }

            const data = await response.json();

            if (!data.routes || data.routes.length === 0) {
                throw new Error('No se encontró ruta');
            }

            const route = data.routes[0];
            this.displayRoute(route, mode, start, end, destinationName);

        } catch (error) {
            console.error('Error calculating route:', error);
            showToast('Error al calcular la ruta. Intenta de nuevo.', 'error', 4000);
        }
    }

    /**
     * Mostrar ruta en el mapa
     */
    displayRoute(route, transportMode, start, end, destinationName) {
        this.currentRoute = route;

        // Actualizar fuente de datos con la ruta
        this.map.getSource(this.routeSource).setData({
            type: 'Feature',
            properties: {},
            geometry: route.geometry
        });

        // Actualizar color de la línea según transporte
        this.map.setPaintProperty(this.routeLayer, 'line-color', transportMode.color);

        // Limpiar marcadores anteriores de destino
        if (this.endMarker) {
            this.endMarker.remove();
        }

        // Agregar marcador de inicio si no existe (manual o GPS)
        if (!this.startMarker) {
            this.startMarker = new mapboxgl.Marker({
                color: this.manualStartLocation ? '#007cbf' : '#28a745',
                scale: 0.8
            })
                .setLngLat(start)
                .setPopup(new mapboxgl.Popup().setHTML(
                    `<strong>${this.manualStartLocation ? 'Punto de inicio' : 'Tu ubicación'}</strong>`
                ))
                .addTo(this.map);
        }

        // Agregar marcador de destino
        this.endMarker = new mapboxgl.Marker({
            color: transportMode.color,
            scale: 0.9
        })
            .setLngLat(end)
            .setPopup(new mapboxgl.Popup().setHTML(`<strong>${destinationName}</strong>`))
            .addTo(this.map);

        // Ajustar vista para mostrar toda la ruta
        const coordinates = route.geometry.coordinates;
        const bounds = coordinates.reduce((bounds, coord) => {
            return bounds.extend(coord);
        }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));

        this.map.fitBounds(bounds, {
            padding: 50,
            maxZoom: 15
        });

        // 🆕 Mostrar información de la ruta (popup movible)
        this.showRouteInfo(route, transportMode, destinationName, start, end);
    }

    /**
     * 🆕 Mostrar información de la ruta con popup movible
     */
    showRouteInfo(route, transportMode, destinationName, start, end) {
        const distanceInfo = this.formatDistance(route.distance); // 🆕 km y millas
        const duration = Math.round(route.duration / 60);

        // Calcular tiempo estimado según velocidad del transporte
        const estimatedTime = Math.round((parseFloat(distanceInfo.km) / transportMode.speed) * 60);
        const finalTime = Math.max(duration, estimatedTime);

        // 🆕 Calcular posición del popup (lado opuesto al centro de la ruta para no cubrir)
        const routeCenter = [
            (start[0] + end[0]) / 2,
            (start[1] + end[1]) / 2
        ];

        // Offset del popup para que no cubra la ruta
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
                        <span><strong>${finalTime} min</strong> aprox.</span>
                    </div>
                    <div class="detail-item">
                        <i class="bi bi-speedometer2"></i>
                        <span>~${transportMode.speed} km/h</span>
                    </div>
                </div>
                
                <div class="route-actions">
                    <button class="btn-route-action primary" onclick="window.routingManager.startNavigation()">
                        <i class="bi bi-navigation"></i> Navegación
                    </button>
                    <button class="btn-route-action secondary" onclick="window.routingManager.clearRoute()">
                        <i class="bi bi-x"></i> Limpiar
                    </button>
                </div>
            </div>
        `;

        // 🆕 Popup movible con clase CSS especial
        new mapboxgl.Popup({
            closeOnClick: false,
            closeButton: true,
            offset: 25,
            className: 'route-info-popup draggable-popup'
        })
            .setLngLat(popupPosition)
            .setHTML(infoHTML)
            .addTo(this.map);

        showToast(`Ruta calculada: ${distanceInfo.display} en ~${finalTime} min`, 'success', 4000);
    }

    /**
     * Iniciar navegación (abre en Google Maps)
     */
    startNavigation() {
        if (!this.currentRoute) {
            showToast('No hay ruta activa', 'error');
            return;
        }

        const coords = this.currentRoute.geometry.coordinates;
        const destination = coords[coords.length - 1];
        const startLocation = this.getStartLocation();

        if (!startLocation) {
            showToast('Punto de inicio no disponible', 'error');
            return;
        }

        // Crear URL para Google Maps
        const googleMapsUrl = `https://www.google.com/maps/dir/${startLocation[1]},${startLocation[0]}/${destination[1]},${destination[0]}`;

        // Abrir en nueva ventana
        window.open(googleMapsUrl, '_blank');

        showToast('Abriendo navegación en Google Maps...', 'info', 3000);
    }

    /**
     * Limpiar ruta actual
     */
    clearRoute() {
        // Limpiar datos de ruta
        if (this.map.getSource(this.routeSource)) {
            this.map.getSource(this.routeSource).setData({
                type: 'FeatureCollection',
                features: []
            });
        }

        // Limpiar todos los marcadores
        this.clearMarkers();

        // Cerrar popups
        const popups = document.querySelectorAll('.mapboxgl-popup');
        popups.forEach(popup => popup.remove());

        // 🆕 Limpiar ubicación manual también
        this.manualStartLocation = null;
        this.currentRoute = null;
        this.isSettingStartPoint = false;
        this.map.getCanvas().style.cursor = '';

        showToast('Ruta eliminada', 'info', 2000);
    }

    /**
     * Limpiar marcadores
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
     * Establecer ubicación del usuario (desde GPS)
     */
    setUserLocation(coords) {
        this.userLocation = coords;
        console.log('User location set for routing:', coords);

        // Agregar marcador de ubicación GPS si no hay manual
        if (!this.manualStartLocation && !this.startMarker) {
            this.startMarker = new mapboxgl.Marker({
                color: '#28a745',
                scale: 0.8
            })
                .setLngLat(coords)
                .setPopup(new mapboxgl.Popup().setHTML('<strong>Tu ubicación</strong>'))
                .addTo(this.map);
        }

        // Mostrar información de rutas en sidebar
        const routingInfo = document.getElementById('routing-info');
        if (routingInfo) {
            routingInfo.style.display = 'block';
        }
    }

    /**
     * Verificar si el usuario tiene ubicación (manual o GPS)
     */
    hasUserLocation() {
        return !!(this.userLocation || this.manualStartLocation);
    }

    /**
     * Obtener información de la ruta actual
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
     * 🆕 Obtener información del área de servicio
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
     * 🆕 Actualizar área de servicio
     */
    updateServiceArea(bounds) {
        this.serviceArea = {
            north: 24.5905196613355,
            south: 24.544242791374604,
            east: -81.73594411815554,
            west: -81.8138529228222
        };
        console.log('Service area updated:', this.serviceArea);
    }

    /**
     * Destruir instancia (limpieza)
     */
    destroy() {
        this.clearRoute();

        if (this.map.getLayer(this.routeLayer)) {
            this.map.removeLayer(this.routeLayer);
        }
        if (this.map.getSource(this.routeSource)) {
            this.map.removeSource(this.routeSource);
        }

        // Limpiar event listeners
        this.map.off('click');

        // Reset estado
        this.isSettingStartPoint = false;
        this.map.getCanvas().style.cursor = '';
    }
}

// Export para uso en módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RoutingManager;
}