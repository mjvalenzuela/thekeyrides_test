/**
 * Street View Integration Module
 * Integra Google Street View con el mapa de Mapbox existente
 */

class StreetViewManager {
    constructor(map) {
        this.map = map;
        this.streetView = null;
        this.currentMarker = null;
        this.panelOpen = false;
        this.currentLocation = null;
        this.streetViewContainer = null;
        
        this.init();
    }

    init() {
        this.createPanel();
        this.setupEventListeners();
        console.log('✅ Street View module loaded');
    }

    createPanel() {
        if (document.getElementById('streetview-panel')) return;

        const panelHTML = `
            <div id="streetview-panel" class="streetview-panel">
                <div class="streetview-header">
                    <h5>Street View</h5>
                    <p id="streetview-location">Click en un punto del mapa para ver la vista de calle</p>
                </div>
                
                <div id="streetview" class="streetview-container">
                    <div class="streetview-placeholder">
                        <i class="bi bi-camera" style="font-size: 2rem; color: #6c757d;"></i>
                        <p>Haz click en cualquier punto del mapa</p>
                    </div>
                </div>
                
                <div class="streetview-controls">
                    <button class="btn-streetview" onclick="window.streetViewManager?.centerStreetView()">
                        <i class="bi bi-crosshair"></i> Centrar
                    </button>
                    <button class="btn-streetview secondary" onclick="window.streetViewManager?.closePanel()">
                        <i class="bi bi-x"></i> Cerrar
                    </button>
                </div>
            </div>

            <button id="streetview-toggle" class="streetview-toggle" title="Toggle Street View">
                <i class="bi bi-camera"></i>
            </button>
        `;

        document.body.insertAdjacentHTML('beforeend', panelHTML);
        this.streetViewContainer = document.getElementById('streetview');
    }

    // 🔧 MÉTODO CLAVE: Inicializar Street View cada vez que se necesite
    initStreetView() {
        if (typeof google === 'undefined') {
            console.error('Google Maps API not loaded');
            return null;
        }

        // 🚨 IMPORTANTE: Limpiar el contenedor completamente
        this.streetViewContainer.innerHTML = '';

        // Crear nuevo div para el panorama
        const streetViewDiv = document.createElement('div');
        streetViewDiv.style.width = '100%';
        streetViewDiv.style.height = '100%';
        this.streetViewContainer.appendChild(streetViewDiv);

        // 🆕 Crear una nueva instancia cada vez
        const newStreetView = new google.maps.StreetViewPanorama(streetViewDiv, {
            position: { 
                lat: MAP_CONFIG.center[1], 
                lng: MAP_CONFIG.center[0] 
            },
            pov: { heading: 0, pitch: 0 },
            zoom: 1,
            visible: false,
            addressControl: true,
            showRoadLabels: true,
            motionTracking: false,
            motionTrackingControl: false
        });

        // Event listeners para esta instancia
        newStreetView.addListener('position_changed', () => {
            this.updateLocationInfo();
            this.updateMapMarker();
        });

        return newStreetView;
    }

    setupEventListeners() {
        const toggleBtn = document.getElementById('streetview-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.togglePanel());
        }

        this.map.on('click', (e) => {
            if (this.panelOpen) {
                const { lng, lat } = e.lngLat;
                this.loadStreetView(lat, lng);
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.panelOpen) {
                this.closePanel();
            }
        });
    }

    async loadStreetView(lat, lng, locationName = null) {
        if (!this.panelOpen) {
            this.openPanel();
        }

        this.showLoading();
        this.currentLocation = { lat, lng, name: locationName };

        try {
            // 🔧 SOLUCIÓN: Crear nueva instancia para cada búsqueda
            this.streetView = this.initStreetView();
            
            if (!this.streetView) {
                this.showError('Street View no está disponible');
                return;
            }

            const streetViewService = new google.maps.StreetViewService();
            
            // Buscar Street View
            streetViewService.getPanorama({
                location: { lat, lng },
                radius: 100,
                source: google.maps.StreetViewSource.OUTDOOR
            }, (data, status) => {
                if (status === 'OK') {
                    this.showStreetView(data.location.latLng, locationName);
                } else {
                    // Intentar con radio más grande
                    streetViewService.getPanorama({
                        location: { lat, lng },
                        radius: 500,
                        source: google.maps.StreetViewSource.OUTDOOR
                    }, (data2, status2) => {
                        if (status2 === 'OK') {
                            const distance = this.calculateDistance(
                                lat, lng, 
                                data2.location.latLng.lat(), 
                                data2.location.latLng.lng()
                            );
                            this.showStreetView(data2.location.latLng, locationName, distance);
                        } else {
                            this.showNoStreetView(locationName);
                        }
                    });
                }
            });

        } catch (error) {
            console.error('Error loading Street View:', error);
            this.showError('Error cargando Street View');
        }
    }

    showStreetView(position, locationName, distance = 0) {
        this.hideLoading();
        
        // 🔧 CLAVE: Configurar la nueva instancia
        this.streetView.setPosition(position);
        this.streetView.setVisible(true);
        
        // Calcular ángulo hacia el punto original
        if (this.currentLocation && distance > 10) {
            try {
                const heading = google.maps.geometry.spherical.computeHeading(
                    position,
                    new google.maps.LatLng(this.currentLocation.lat, this.currentLocation.lng)
                );
                
                this.streetView.setPov({
                    heading: heading,
                    pitch: 0
                });
            } catch (error) {
                console.warn('Could not calculate heading:', error);
            }
        }

        this.updateLocationInfo(locationName, distance);
        
        if (distance > 50) {
            showToast(`Street View encontrado a ${Math.round(distance)}m del punto`, 'info', 3000);
        } else {
            showToast('Street View cargado correctamente', 'success', 2000);
        }
    }

    showNoStreetView(locationName) {
        this.hideLoading();
        this.streetViewContainer.innerHTML = `
            <div class="streetview-error">
                <i class="bi bi-camera-video-off" style="font-size: 3rem; color: #dc3545; margin-bottom: 16px;"></i>
                <h6 style="color: #dc3545; margin-bottom: 12px;">Street View no disponible</h6>
                <p style="color: #6c757d; margin-bottom: 16px; text-align: center; line-height: 1.4;">
                    No hay imágenes de Street View disponibles para<br>
                    <strong>${locationName || 'esta ubicación'}</strong>
                </p>
                <small style="color: #6c757d;">Intenta con otro punto del mapa</small>
            </div>
        `;
        showToast('Street View no disponible en esta ubicación', 'error', 3000);
    }

    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371e3; // Radio de la Tierra en metros
        const φ1 = lat1 * Math.PI/180;
        const φ2 = lat2 * Math.PI/180;
        const Δφ = (lat2-lat1) * Math.PI/180;
        const Δλ = (lng2-lng1) * Math.PI/180;

        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        return R * c;
    }

    updateMapMarker() {
        if (!this.streetView) return;
        
        const position = this.streetView.getPosition();
        if (!position) return;

        // Remover marcador anterior
        if (this.currentMarker) {
            this.currentMarker.remove();
        }

        // Agregar nuevo marcador
        this.currentMarker = new mapboxgl.Marker({
            color: '#ff0000',
            scale: 0.8
        })
        .setLngLat([position.lng(), position.lat()])
        .addTo(this.map);
    }

    updateLocationInfo(locationName = null, distance = 0) {
        if (!this.streetView) return;
        
        const position = this.streetView.getPosition();
        if (!position) return;

        const lat = position.lat().toFixed(6);
        const lng = position.lng().toFixed(6);
        
        let infoText = `Coordenadas: ${lat}, ${lng}`;
        if (locationName) {
            infoText = `${locationName} - ${lat}, ${lng}`;
        }
        if (distance > 50) {
            infoText += ` (${Math.round(distance)}m del punto original)`;
        }
        
        const locationElement = document.getElementById('streetview-location');
        if (locationElement) {
            locationElement.textContent = infoText;
        }
    }

    showLoading() {
        this.streetViewContainer.innerHTML = `
            <div class="streetview-loading">
                <div class="spinner-border text-primary mb-3" role="status">
                    <span class="visually-hidden">Cargando...</span>
                </div>
                <p>Cargando Street View...</p>
            </div>
        `;
    }

    hideLoading() {
        const loading = document.querySelector('.streetview-loading');
        if (loading) {
            loading.remove();
        }
    }

    showError(message) {
        this.streetViewContainer.innerHTML = `
            <div class="streetview-error">
                <i class="bi bi-exclamation-triangle-fill mb-2" style="font-size: 24px; color: #dc3545;"></i>
                <p style="color: #dc3545; margin: 8px 0;">${message}</p>
                <small style="color: #6c757d;">Intenta con otra ubicación</small>
            </div>
        `;
        showToast(message, 'error', 3000);
    }

    togglePanel() {
        if (this.panelOpen) {
            this.closePanel();
        } else {
            this.openPanel();
        }
    }

    openPanel() {
        const panel = document.getElementById('streetview-panel');
        const button = document.getElementById('streetview-toggle');
        
        if (panel) panel.classList.add('active');
        if (button) {
            button.classList.add('active');
            button.innerHTML = '<i class="bi bi-x"></i>';
        }
        
        this.panelOpen = true;

        setTimeout(() => {
            if (this.map && this.map.resize) {
                this.map.resize();
            }
        }, 350);
    }

    closePanel() {
        const panel = document.getElementById('streetview-panel');
        const button = document.getElementById('streetview-toggle');
        
        if (panel) panel.classList.remove('active');
        if (button) {
            button.classList.remove('active');
            button.innerHTML = '<i class="bi bi-camera"></i>';
        }
        
        this.panelOpen = false;

        // 🧹 Limpiar todo
        if (this.currentMarker) {
            this.currentMarker.remove();
            this.currentMarker = null;
        }

        if (this.streetView) {
            this.streetView.setVisible(false);
            this.streetView = null; // 🔧 IMPORTANTE: Limpiar referencia
        }

        // Resetear contenedor
        if (this.streetViewContainer) {
            this.streetViewContainer.innerHTML = `
                <div class="streetview-placeholder">
                    <i class="bi bi-camera" style="font-size: 2rem; color: #6c757d;"></i>
                    <p>Haz click en cualquier punto del mapa</p>
                </div>
            `;
        }

        setTimeout(() => {
            if (this.map && this.map.resize) {
                this.map.resize();
            }
        }, 350);
    }

    centerStreetView() {
        if (this.currentLocation) {
            this.map.flyTo({
                center: [this.currentLocation.lng, this.currentLocation.lat],
                zoom: 16,
                duration: 1500
            });
        }
    }
}

// Export para uso en módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StreetViewManager;
}