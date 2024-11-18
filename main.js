let map, drawControl, drawnItems;
let points = [];

function initMap() {
    // Inizializza la mappa
    map = L.map('map').setView([41.9028, 12.4964], 13);
    
    // Aggiungi layer OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Inizializza il layer per gli elementi disegnati
    drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);

    // Configura i controlli di disegno
    drawControl = new L.Control.Draw({
        draw: {
            polygon: false,
            circle: false,
            circlemarker: false,
            marker: false,
            polyline: false,
            rectangle: {
                shapeOptions: {
                    color: '#2b6cb0',
                    weight: 2
                }
            }
        },
        edit: {
            featureGroup: drawnItems
        }
    });
    map.addControl(drawControl);

    // Gestisci gli eventi di disegno
    map.on(L.Draw.Event.CREATED, handleDrawCreated);
    setupEventListeners();
}

function handleDrawCreated(e) {
    const layer = e.layer;
    drawnItems.addLayer(layer);
    generatePointsOnRoads(layer);
}

async function generatePointsOnRoads(rectangle) {
    const bounds = rectangle.getBounds();
    const distance = document.getElementById('pointDistance').value;
    
    // Ottieni i dati delle strade da OpenStreetMap
    const roads = await fetchRoads(bounds);
    
    // Rimuovi i punti esistenti
    points.forEach(point => map.removeLayer(point));
    points = [];

    // Converti le strade in formato GeoJSON
    const roadsGeoJSON = {
        type: 'FeatureCollection',
        features: roads.map(road => ({
            type: 'Feature',
            geometry: road.geometry,
            properties: {}
        }))
    };

    // Per ogni strada, genera punti equidistanti
    roads.forEach(road => {
        const line = turf.lineString(road.geometry.coordinates);
        const length = turf.length(line, {units: 'meters'});
        const numPoints = Math.floor(length / parseFloat(distance));
        
        // Genera punti equidistanti lungo la strada
        const pointsOnLine = turf.along(line, length, {units: 'meters'});
        for (let i = 0; i <= numPoints; i++) {
            const point = turf.along(line, i * parseFloat(distance), {units: 'meters'});
            const marker = L.circleMarker(
                [point.geometry.coordinates[1], point.geometry.coordinates[0]],
                {
                    radius: 4,
                    fillColor: '#e53e3e',
                    color: '#fff',
                    weight: 1,
                    opacity: 1,
                    fillOpacity: 0.8
                }
            );
            points.push(marker);
            marker.addTo(map);
        }
    });
}

async function fetchRoads(bounds) {
    // Costruisci la query Overpass per ottenere le strade
    const query = `
        [out:json][timeout:25];
        (
            way["highway"]["highway"!~"footway|path|cycleway|service|track"]
            (${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()});
        );
        out body;
        >;
        out skel qt;
    `;

    const overpassUrl = 'https://overpass-api.de/api/interpreter';
    
    try {
        const response = await fetch(overpassUrl, {
            method: 'POST',
            body: query
        });
        
        const data = await response.json();
        
        // Converti i dati OSM in GeoJSON
        const roads = [];
        const nodes = new Map();
        
        // Prima mappa tutti i nodi
        data.elements.forEach(element => {
            if (element.type === 'node') {
                nodes.set(element.id, [element.lon, element.lat]);
            }
        });
        
        // Poi costruisci le geometrie delle strade
        data.elements.forEach(element => {
            if (element.type === 'way' && element.nodes) {
                const coordinates = element.nodes
                    .map(nodeId => nodes.get(nodeId))
                    .filter(coord => coord !== undefined);
                    
                if (coordinates.length >= 2) {
                    roads.push({
                        geometry: {
                            type: 'LineString',
                            coordinates: coordinates
                        }
                    });
                }
            }
        });
        
        return roads;
    } catch (error) {
        console.error('Errore nel recupero delle strade:', error);
        return [];
    }
}

function setupEventListeners() {
    document.getElementById('startDrawing').addEventListener('click', () => {
        new L.Draw.Rectangle(map, drawControl.options.draw.rectangle).enable();
    });

    document.getElementById('clearMap').addEventListener('click', () => {
        drawnItems.clearLayers();
        points.forEach(point => map.removeLayer(point));
        points = [];
    });

    document.getElementById('downloadGeoJSON').addEventListener('click', () => {
        const geojson = {
            type: 'FeatureCollection',
            features: points.map(point => ({
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [point.getLatLng().lng, point.getLatLng().lat]
                },
                properties: {}
            }))
        };

        const dataStr = JSON.stringify(geojson);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        const exportFileDefaultName = 'points.geojson';

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    });
} 

document.addEventListener('DOMContentLoaded', () => {
    initMap();
}); 