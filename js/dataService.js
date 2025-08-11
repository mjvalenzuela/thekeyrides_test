/**
 * Data Service for loading and managing map data from Google Sheets
 */

class DataService {
    constructor() {
        // Get configuration from global config - REQUIRED
        if (typeof window.SHEETS_CONFIG === 'undefined') {
            throw new Error('SHEETS_CONFIG is not defined. Make sure config/config.js is loaded.');
        }
        
        const sheetsConfig = window.SHEETS_CONFIG;
        
        // Validate required configuration
        if (!sheetsConfig.url) {
            throw new Error('SHEETS_CONFIG.url is required but not provided.');
        }
        
        this.sheetsUrl = sheetsConfig.url;
        this.csvUrl = `${sheetsConfig.url}/export?format=csv&gid=${sheetsConfig.gid || 0}`;
        this.cache = null;
        this.lastFetch = null;
        this.cacheTimeout = sheetsConfig.cacheTimeout || 2 * 60 * 1000; // Default 2 minutes
        this.autoRefreshInterval = null;
        
        // Setup auto-refresh if enabled
        if (sheetsConfig.autoRefresh !== false) { // Default true unless explicitly false
            this.setupAutoRefresh();
        }
        
        console.log('DataService initialized with:', {
            url: this.sheetsUrl,
            cacheTimeout: this.cacheTimeout / 60000 + ' minutes',
            autoRefresh: sheetsConfig.autoRefresh !== false
        });
    }

    /**
     * Setup automatic refresh every 2 minutes
     */
    setupAutoRefresh() {
        // Clear any existing interval
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
        }
        
        // Set up new interval
        this.autoRefreshInterval = setInterval(async () => {
            try {
                console.log('Auto-refreshing data from Google Sheets...');
                await this.refreshData();
                
                // Notify map to update if data changed
                if (window.map && window.map.getSource('points')) {
                    const event = new CustomEvent('dataUpdated', { 
                        detail: { source: 'auto-refresh', data: this.cache } 
                    });
                    document.dispatchEvent(event);
                }
            } catch (error) {
                console.log('Auto-refresh failed, will retry next cycle:', error.message);
            }
        }, this.cacheTimeout);
        
        console.log(`Auto-refresh setup: every ${this.cacheTimeout / 60000} minutes`);
    }

    /**
     * Load data from Google Sheets
     */
    async loadData() {
        try {
            // Check cache first
            if (this.cache && this.lastFetch && 
                (Date.now() - this.lastFetch) < this.cacheTimeout) {
                console.log('Using cached data');
                return this.cache;
            }

            showToast('Loading data from Google Sheets...', 'info', 2000);
            
            const response = await fetch(this.csvUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const csvText = await response.text();
            const data = this.parseCSV(csvText);
            const geoJsonData = this.convertToGeoJSON(data);
            
            // Cache the result
            this.cache = geoJsonData;
            this.lastFetch = Date.now();
            
            console.log(`Loaded ${geoJsonData.features.length} points from Google Sheets`);
            showToast(`Loaded ${geoJsonData.features.length} points successfully`, 'success', 3000);
            
            return geoJsonData;
            
        } catch (error) {
            console.error('Error loading data from Google Sheets:', error);
            showToast('Error loading data. Using fallback data.', 'error', 5000);
            
            // Return fallback data if Google Sheets fails
            return this.getFallbackData();
        }
    }

    /**
     * Parse CSV data
     */
    parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        const headers = this.parseCSVLine(lines[0]);
        const data = [];

        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);
            if (values.length === headers.length) {
                const row = {};
                headers.forEach((header, index) => {
                    row[header.trim()] = values[index] ? values[index].trim() : '';
                });
                data.push(row);
            }
        }

        return data;
    }

    /**
     * Parse a single CSV line (handles quotes and commas)
     */
    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current);
        return result;
    }

    /**
     * Convert CSV data to GeoJSON format
     */
    convertToGeoJSON(data) {
        const features = [];

        if (!data || !Array.isArray(data)) {
            console.warn('Invalid data provided to convertToGeoJSON');
            return {
                type: 'FeatureCollection',
                features: [],
                metadata: {
                    source: 'Google Sheets',
                    url: this.sheetsUrl,
                    loadTime: new Date().toISOString(),
                    totalRows: 0,
                    validPoints: 0,
                    error: 'Invalid data structure'
                }
            };
        }

        data.forEach((row, index) => {
            try {
                // Skip empty rows
                if (!row || Object.keys(row).length === 0) {
                    return;
                }

                // Extract coordinates - adjust these field names based on your sheet structure
                const lat = this.parseCoordinate(row['Latitude'] || row['lat'] || row['Lat']);
                const lng = this.parseCoordinate(row['Longitude'] || row['lng'] || row['Lng'] || row['lon']);

                // Skip if coordinates are invalid
                if (!this.isValidCoordinate(lat, lng)) {
                    console.warn(`Skipping row ${index + 1}: Invalid coordinates`, { lat, lng, row });
                    return;
                }

                // Determine category - adjust field name based on your sheet
                const categoryField = row['Category'] || row['category'] || row['Type'] || row['type'] || 'office';
                const category = this.mapCategory(categoryField.toLowerCase());

                // Create feature
                const feature = {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [lng, lat]
                    },
                    properties: {
                        id: row['ID'] || row['id'] || `point_${index + 1}`,
                        category: category,
                        
                        // Names (English only)
                        nombre_en: row['Name'] || row['name'] || row['Name_EN'] || row['Title'] || `Point ${index + 1}`,
                        
                        // Descriptions (English only) 
                        descripcion_en: row['Description'] || row['description'] || row['Description_EN'] || '',
                        
                        // Additional properties
                        horario: row['Schedule'] || row['schedule'] || row['Hours'] || row['hours'] || '',
                        telefono: row['Phone'] || row['phone'] || row['Telephone'] || row['telephone'] || '',
                        website: row['Website'] || row['website'] || row['URL'] || row['url'] || '',
                        
                        // Status
                        activo: this.parseBoolean(row['Active'] || row['active'] || row['Enabled'] || row['enabled'] || 'true'),
                        
                        // Raw data for debugging
                        _rawData: row
                    }
                };

                // Only add if the point is active
                if (feature.properties.activo) {
                    features.push(feature);
                }

            } catch (error) {
                console.error(`Error processing row ${index + 1}:`, error, row);
            }
        });

        return {
            type: 'FeatureCollection',
            features: features,
            metadata: {
                source: 'Google Sheets',
                url: this.sheetsUrl,
                loadTime: new Date().toISOString(),
                totalRows: data.length,
                validPoints: features.length
            }
        };
    }

    /**
     * Parse coordinate value
     */
    parseCoordinate(value) {
        if (!value || value === '') return null;
        
        // Remove any non-numeric characters except decimal point and minus sign
        const cleaned = value.toString().replace(/[^\d.-]/g, '');
        const parsed = parseFloat(cleaned);
        
        return isNaN(parsed) ? null : parsed;
    }

    /**
     * Validate coordinates
     */
    isValidCoordinate(lat, lng) {
        return lat !== null && lng !== null &&
               lat >= -90 && lat <= 90 &&
               lng >= -180 && lng <= 180;
    }

    /**
     * Map category names to standard categories
     */
    mapCategory(categoryString) {
        const categoryMap = {
            'office': 'office',
            'oficina': 'office',
            'headquarters': 'office',
            
            'pickup': 'pickup',
            'station': 'pickup',
            'stop': 'pickup',
            'estacion': 'pickup',
            'parada': 'pickup',
            
            'restaurant': 'restaurant',
            'restaurante': 'restaurant',
            'food': 'restaurant',
            'comida': 'restaurant',
            
            'tourist': 'tourist',
            'tourism': 'tourist',
            'attraction': 'tourist',
            'turismo': 'tourist',
            'atraccion': 'tourist',
            
            'shop': 'shop',
            'store': 'shop',
            'tienda': 'shop',
            'shopping': 'shop',
            
            'route': 'route',
            'ruta': 'route',
            'path': 'route',
            'camino': 'route'
        };

        return categoryMap[categoryString] || 'office'; // Default to office
    }

    /**
     * Parse boolean values
     */
    parseBoolean(value) {
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') {
            const lower = value.toLowerCase().trim();
            return lower === 'true' || lower === 'yes' || lower === 'si' || lower === '1' || lower === 'active';
        }
        return Boolean(value);
    }

    /**
     * Get fallback data if Google Sheets fails
     */
    getFallbackData() {
        return {
            type: 'FeatureCollection',
            features: [
                {
                    type: 'Feature',
                    geometry: { type: 'Point', coordinates: [-86.7308, 21.2313] },
                    properties: {
                        id: 'fallback_1',
                        category: 'office',
                        nombre_en: 'The Key Rides - Main Office (Fallback)',
                        descripcion_en: 'Fallback data - Main office location',
                        horario: '8:00 AM - 6:00 PM',
                        telefono: '+52 998 123 4567',
                        website: 'https://thekeyrides.com',
                        activo: true
                    }
                }
            ],
            metadata: {
                source: 'Fallback Data',
                loadTime: new Date().toISOString(),
                totalRows: 1,
                validPoints: 1,
                note: 'Using fallback data because Google Sheets could not be loaded'
            }
        };
    }

    /**
     * Refresh data (clear cache and reload)
     */
    async refreshData() {
        this.cache = null;
        this.lastFetch = null;
        return await this.loadData();
    }

    /**
     * Destroy auto-refresh (cleanup)
     */
    destroy() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
        }
    }

    /**
     * Get cache info
     */
    getCacheInfo() {
        return {
            cached: !!this.cache,
            lastFetch: this.lastFetch,
            age: this.lastFetch ? Date.now() - this.lastFetch : null,
            expired: this.lastFetch ? (Date.now() - this.lastFetch) > this.cacheTimeout : true
        };
    }
}

// Create global instance
window.dataService = new DataService();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataService;
}