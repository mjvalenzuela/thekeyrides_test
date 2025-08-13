/**
 * DRAGGABLE POPUP FUNCTIONALITY
 * Permite mover popups en móviles para que no oculten la ruta
 */

class DraggablePopup {
    constructor() {
        this.isDragging = false;
        this.startX = 0;
        this.startY = 0;
        this.currentPopup = null;
        this.originalTransform = '';
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Escuchar cuando se agregan nuevos popups al DOM
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1 && node.classList?.contains('mapboxgl-popup')) {
                        this.makePopupDraggable(node);
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    makePopupDraggable(popup) {
        // Solo hacer draggable en móviles y tablets
        if (window.innerWidth > 768) return;

        const popupContent = popup.querySelector('.mapboxgl-popup-content');
        if (!popupContent) return;

        // Buscar el header draggable (route-summary o popup-header)
        const draggableHeader = popupContent.querySelector('.route-summary') || 
                               popupContent.querySelector('.popup-header');
        
        if (!draggableHeader) return;

        // Agregar clase para estilos
        popup.classList.add('draggable-popup');
        
        // Touch events para móviles
        draggableHeader.addEventListener('touchstart', (e) => this.handleTouchStart(e, popup), { passive: false });
        draggableHeader.addEventListener('touchmove', (e) => this.handleTouchMove(e, popup), { passive: false });
        draggableHeader.addEventListener('touchend', (e) => this.handleTouchEnd(e, popup), { passive: false });
        
        // Mouse events para tablets/desktop con touch
        draggableHeader.addEventListener('mousedown', (e) => this.handleMouseDown(e, popup));
        document.addEventListener('mousemove', (e) => this.handleMouseMove(e, popup));
        document.addEventListener('mouseup', (e) => this.handleMouseUp(e, popup));
        
        console.log('✅ Popup made draggable');
    }

    handleTouchStart(e, popup) {
        if (e.touches.length !== 1) return;
        
        e.preventDefault();
        this.startDrag(e.touches[0].clientX, e.touches[0].clientY, popup);
    }

    handleTouchMove(e, popup) {
        if (!this.isDragging || this.currentPopup !== popup) return;
        if (e.touches.length !== 1) return;
        
        e.preventDefault();
        this.updateDrag(e.touches[0].clientX, e.touches[0].clientY, popup);
    }

    handleTouchEnd(e, popup) {
        if (!this.isDragging || this.currentPopup !== popup) return;
        
        e.preventDefault();
        this.endDrag(popup);
    }

    handleMouseDown(e, popup) {
        e.preventDefault();
        this.startDrag(e.clientX, e.clientY, popup);
    }

    handleMouseMove(e, popup) {
        if (!this.isDragging || this.currentPopup !== popup) return;
        
        e.preventDefault();
        this.updateDrag(e.clientX, e.clientY, popup);
    }

    handleMouseUp(e, popup) {
        if (!this.isDragging || this.currentPopup !== popup) return;
        
        e.preventDefault();
        this.endDrag(popup);
    }

    startDrag(clientX, clientY, popup) {
        this.isDragging = true;
        this.currentPopup = popup;
        this.startX = clientX;
        this.startY = clientY;
        
        const popupContent = popup.querySelector('.mapboxgl-popup-content');
        if (popupContent) {
            this.originalTransform = popupContent.style.transform || '';
            popupContent.style.transition = 'none';
            popupContent.style.zIndex = '10000';
        }
        
        // Cambiar cursor
        document.body.style.cursor = 'grabbing';
        
        // Agregar clase visual
        popup.classList.add('dragging');
    }

    updateDrag(clientX, clientY, popup) {
        if (!this.isDragging || this.currentPopup !== popup) return;
        
        const deltaX = clientX - this.startX;
        const deltaY = clientY - this.startY;
        
        const popupContent = popup.querySelector('.mapboxgl-popup-content');
        if (popupContent) {
            // Aplicar transformación relativa a la posición original
            const newTransform = `${this.originalTransform} translate(${deltaX}px, ${deltaY}px)`;
            popupContent.style.transform = newTransform;
        }
    }

    endDrag(popup) {
        this.isDragging = false;
        this.currentPopup = null;
        
        const popupContent = popup.querySelector('.mapboxgl-popup-content');
        if (popupContent) {
            popupContent.style.transition = '';
            popupContent.style.zIndex = '';
        }
        
        // Restaurar cursor
        document.body.style.cursor = '';
        
        // Quitar clase visual
        popup.classList.remove('dragging');
        
        // Verificar que el popup siga visible en pantalla
        this.keepPopupInBounds(popup);
    }

    keepPopupInBounds(popup) {
        const popupContent = popup.querySelector('.mapboxgl-popup-content');
        if (!popupContent) return;
        
        const rect = popupContent.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        let deltaX = 0;
        let deltaY = 0;
        
        // Verificar límites horizontales
        if (rect.left < 10) {
            deltaX = 10 - rect.left;
        } else if (rect.right > viewportWidth - 10) {
            deltaX = (viewportWidth - 10) - rect.right;
        }
        
        // Verificar límites verticales
        if (rect.top < 10) {
            deltaY = 10 - rect.top;
        } else if (rect.bottom > viewportHeight - 10) {
            deltaY = (viewportHeight - 10) - rect.bottom;
        }
        
        // Aplicar ajuste si es necesario
        if (deltaX !== 0 || deltaY !== 0) {
            const currentTransform = popupContent.style.transform || '';
            const newTransform = `${currentTransform} translate(${deltaX}px, ${deltaY}px)`;
            popupContent.style.transform = newTransform;
            popupContent.style.transition = 'transform 0.3s ease';
        }
    }

    // Método para resetear posición de un popup
    resetPopupPosition(popup) {
        const popupContent = popup.querySelector('.mapboxgl-popup-content');
        if (popupContent) {
            popupContent.style.transform = this.originalTransform;
            popupContent.style.transition = 'transform 0.3s ease';
        }
        popup.classList.remove('dragging');
    }

    // Método para resetear todas las posiciones
    resetAllPopups() {
        const popups = document.querySelectorAll('.mapboxgl-popup.draggable-popup');
        popups.forEach(popup => this.resetPopupPosition(popup));
    }
}

// Estilos CSS adicionales para el dragging
const draggableStyles = `
    <style>
        .mapboxgl-popup.dragging {
            opacity: 0.9;
        }
        
        .mapboxgl-popup.dragging .mapboxgl-popup-content {
            box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3) !important;
            transform-origin: center center !important;
        }
        
        .draggable-popup .route-summary,
        .draggable-popup .popup-header {
            user-select: none;
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
        }
        
        /* Indicador visual de que se puede arrastrar */
        .draggable-popup .route-summary::after,
        .draggable-popup .popup-header::after {
            content: '✥';
            position: absolute;
            top: 50%;
            right: 8px;
            transform: translateY(-50%);
            color: var(--text-muted);
            font-size: 12px;
            opacity: 0.6;
            pointer-events: none;
        }
        
        @media (max-width: 576px) {
            .draggable-popup .route-summary::after,
            .draggable-popup .popup-header::after {
                font-size: 10px;
                right: 6px;
            }
        }
        
        /* Animación suave cuando se suelta */
        .mapboxgl-popup-content {
            transition: transform 0.2s ease-out;
        }
        
        .mapboxgl-popup.dragging .mapboxgl-popup-content {
            transition: none !important;
        }
    </style>
`;

// Inyectar estilos
document.head.insertAdjacentHTML('beforeend', draggableStyles);

// Inicializar funcionalidad de popup arrastrable
let draggablePopupInstance;

document.addEventListener('DOMContentLoaded', () => {
    draggablePopupInstance = new DraggablePopup();
    console.log('✅ Draggable popup functionality initialized');
});

// Exponer funciones globalmente para uso desde otros scripts
window.DraggablePopup = DraggablePopup;
window.draggablePopupInstance = draggablePopupInstance;

// Función helper para hacer un popup específico draggable manualmente
window.makeDraggable = function(popupElement) {
    if (draggablePopupInstance && popupElement) {
        draggablePopupInstance.makePopupDraggable(popupElement);
    }
};

// Función helper para resetear posiciones
window.resetPopupPositions = function() {
    if (draggablePopupInstance) {
        draggablePopupInstance.resetAllPopups();
    }
};

// Auto-reset cuando cambia la orientación del dispositivo
window.addEventListener('orientationchange', () => {
    setTimeout(() => {
        if (draggablePopupInstance) {
            draggablePopupInstance.resetAllPopups();
        }
    }, 100);
});

// Auto-reset cuando cambia el tamaño de ventana
window.addEventListener('resize', debounce(() => {
    if (draggablePopupInstance) {
        draggablePopupInstance.resetAllPopups();
    }
}, 300));

// Función debounce helper
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}