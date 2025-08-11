# Mapa Interactivo - The Key Rides

Un mapa interactivo que muestra puntos de interés cargados desde Google Sheets en tiempo real.

## 🚀 Configuración inicial

### 1. Copiar archivo de configuración
```bash
cp config/config.example.js config/config.js
```

### 2. Configurar Google Sheets

#### Estructura requerida del Sheet
Tu Google Sheet debe tener **exactamente** estas columnas (nombres exactos en inglés):

| Columna | Descripción | Ejemplo |
|---------|-------------|---------|
| `Active` | true/false para mostrar/ocultar el punto | `true` |
| `NamePOI` | Nombre del punto (se muestra en el popup) | `The Key Rides - Main Office` |
| `Category` | Categoría del punto | `office` |
| `Lat` | Latitud | `21.2313` |
| `Lng` | Longitud | `-86.7308` |
| `Address` | Dirección del punto | `Downtown Isla Mujeres` |
| `Review` | Descripción del punto | `Main office for reservations` |
| `Schedule` | Horarios de apertura | `8:00 AM - 6:00 PM` |
| `Phone` | Número de teléfono | `+52 998 123 4567` |
| `URLRedirect` | Sitio web | `https://thekeyrides.com` |

#### Categorías disponibles
Las siguientes categorías están configuradas en el sistema:
- `office` - Oficinas
- `pickup` - Puntos de recogida/entrega
- `restaurant` - Restaurantes
- `tourist` - Sitios turísticos
- `shop` - Tiendas y servicios
- `route` - Rutas

#### Hacer el Sheet público
1. En Google Sheets: **Archivo > Compartir > Cambiar a "Cualquier persona con el enlace"**
2. Asegurar que el permiso sea "Lector"
3. Copiar la URL del navegador

### 3. Configurar Mapbox
1. Crear cuenta en [Mapbox](https://account.mapbox.com/)
2. Ir a [Access Tokens](https://account.mapbox.com/access-tokens/)
3. Copiar tu token de acceso público

### 4. Actualizar config/config.js
```javascript
const MAP_TOKENS = {
    mapbox: 'pk.eyJ1IjoieW91cnVzZXJuYW1lIiwiaCI6InlvdXJyZWFsdG9rZW4ifQ.example'
};

const SHEETS_CONFIG = {
    url: 'https://docs.google.com/spreadsheets/d/TU_SHEET_ID_AQUI',
    gid: 0,
    cacheTimeout: 2 * 60 * 1000,
    autoRefresh: true
};
```

## 📁 Estructura del proyecto

```
mapa-interactivo/
├── index.html              # Página principal
├── config/
│   ├── config.example.js   # Ejemplo de configuración
│   └── config.js           # Tu configuración (crear desde example)
├── css/
│   ├── styles.css          # Estilos principales
│   ├── components.css      # Componentes UI
│   └── responsive.css      # Diseño responsivo
├── js/
│   ├── map.js             # Lógica principal del mapa
│   ├── dataService.js     # Servicio para cargar datos del Sheet
│   └── utils.js           # Utilidades y funciones helper
├── assets/
│   └── icons/             # Iconos personalizados
└── README.md              # Este archivo
```

## 🎯 Características principales

- **Carga automática desde Google Sheets**: Los datos se actualizan automáticamente cada 2 minutos
- **Filtros por categoría**: Muestra/oculta puntos según la categoría
- **Popups informativos**: Información detallada de cada punto
- **Diseño responsivo**: Funciona perfecto en móvil y desktop
- **Geolocalización**: Localiza al usuario en el mapa
- **Clustering**: Agrupa puntos cercanos automáticamente
- **Iconos personalizados**: Cada categoría tiene su icono distintivo

## 🔧 Mapeo de campos

El sistema mapea automáticamente los campos del Google Sheet:

| Campo del Sheet | Se muestra como | Ubicación en popup |
|-----------------|-----------------|-------------------|
| `NamePOI` | Título principal | Header del popup |
| `Review` | Descripción | Cuerpo del popup |
| `Address` | Dirección | Con icono de ubicación |
| `Schedule` | Horarios | Con icono de reloj |
| `Phone` | Teléfono | Con icono de teléfono |
| `URLRedirect` | Sitio web | Enlace clickeable |

## 🎨 Personalización

### Cambiar colores de categorías
Edita en `config/config.js`:
```javascript
categories: {
    office: {
        name_en: 'Offices',
        color: '#ffd700', // Cambiar este color
        icon: 'bi bi-building'
    }
}
```

### Añadir nuevas categorías
1. Agregar la categoría en `config/config.js`
2. Usar el valor exacto en la columna `Category` del Google Sheet

## 🚀 Deployment

### GitHub Pages
1. Subir código a GitHub
2. Ir a Settings > Pages
3. Seleccionar branch `main`
4. La URL será: `https://tu-usuario.github.io/nombre-repo`

### Netlify
1. Conectar tu repositorio de GitHub
2. Deploy automático en cada commit

### Servidor web tradicional
Subir todos los archivos a tu servidor web. Asegurar que:
- Los archivos están en la raíz o en una carpeta accesible
- El servidor puede servir archivos estáticos (HTML, CSS, JS)

## 🔍 Debugging

### Verificar configuración
Abre las Developer Tools del navegador (F12) y revisa:
- ✅ "Configuration validated successfully"
- ❌ Errores de configuración se muestran en rojo

### Verificar datos del Sheet
- Los logs muestran cuántos puntos se cargaron
- Verifica que las coordenadas estén en formato decimal (21.2313, no 21°13'53")
- Asegurar que la columna `Active` contenga `true` para puntos visibles

### Problemas comunes
1. **Mapa no carga**: Verificar token de Mapbox
2. **No aparecen puntos**: Verificar URL del Google Sheet y que sea público
3. **Coordenadas incorrectas**: Usar formato decimal, no grados/minutos/segundos

## 📱 Funcionalidades móviles

- Sidebar colapsible automáticamente en móvil
- Controles de ubicación optimizados para touch
- Popups adaptados al tamaño de pantalla
- Filtros compactos en pantallas pequeñas

## 🔄 Auto-refresh

El sistema actualiza automáticamente los datos cada 2 minutos. Para desactivar:
```javascript
const SHEETS_CONFIG = {
    autoRefresh: false // Cambiar a false
};
```

## 📞 Soporte

Si encuentras problemas:
1. Revisa la consola del navegador (F12)
2. Verifica que tu Google Sheet sea público
3. Confirma que los nombres de columnas sean exactos
4. Asegurar que las coordenadas estén en formato correcto

---

**Nota**: Este mapa está optimizado para funcionar con Google Sheets públicos. No requiere APIs adicionales más allá de Mapbox.