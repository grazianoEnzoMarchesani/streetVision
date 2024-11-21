let map, drawControl, drawnItems;
let points = [];
let editHandler = null; // Variabile globale per gestire l'handler di modifica
let streetViewParams = {
  size: '2000x2000',
  fov: 90,
  heading: 180,
  pitch: 0,
  apiKey: ''
};

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
            featureGroup: drawnItems,
            edit: true,
            remove: false
        }
    });
    map.addControl(drawControl);

    // Aggiungi handler per l'evento di modifica completata
    map.on('draw:edited', function (e) {
        const layers = e.layers;
        layers.eachLayer(function (layer) {
            generatePointsOnRoads(layer);
        });
    });

    // Gestisci gli eventi di disegno
    map.on(L.Draw.Event.CREATED, handleDrawCreated);
    setupEventListeners();
}

function handleDrawCreated(e) {
    drawnItems.clearLayers();
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

    updatePointsList();
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
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        const exportFileDefaultName = 'points.geojson';

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    });

    document.getElementById('citySearch').addEventListener('change', async (event) => {
        const city = event.target.value;
        const response = await fetch(`https://nominatim.openstreetmap.org/search?city=${city}&format=json`);
        const data = await response.json();
        if (data.length > 0) {
            const { lat, lon } = data[0];
            map.setView([lat, lon], 13);
        } else {
            alert('City not found');
        }
    });

    document.getElementById('editArea').addEventListener('click', function() {
        if (!editHandler) {
            // Attiva la modalità di modifica
            editHandler = new L.EditToolbar.Edit(map, {
                featureGroup: drawnItems
            });
            editHandler.enable();
            
            // Mostra i pulsanti di conferma/annulla
            showEditControls();
        }
    });

    ['fov', 'pitch'].forEach(param => {
        const input = document.getElementById(param);
        const valueSpan = document.getElementById(`${param}Value`);
        input.addEventListener('input', (e) => {
            streetViewParams[param] = parseInt(e.target.value);
            valueSpan.textContent = e.target.value;
            updatePointsList();
        });
    });
    
    document.getElementById('imageSize').addEventListener('change', (e) => {
        streetViewParams.size = e.target.value;
        updatePointsList();
    });
    
    document.getElementById('apiKey').addEventListener('change', (e) => {
        streetViewParams.apiKey = e.target.value;
        updatePointsList();
    });
}

function showEditControls() {
    // Rimuovi i controlli esistenti se presenti
    const existingControls = document.getElementById('editControls');
    if (existingControls) {
        existingControls.remove();
    }

    // Crea i nuovi controlli
    const editControls = document.createElement('div');
    editControls.id = 'editControls';
    editControls.innerHTML = `
        <button id="saveEdit" class="edit-btn">Save Changes</button>
        <button id="cancelEdit" class="edit-btn">Cancel</button>
    `;
    document.querySelector('.controls').appendChild(editControls);

    // Aggiungi gli event listener
    document.getElementById('saveEdit').addEventListener('click', function() {
        if (editHandler) {
            editHandler.save();
            editHandler.disable();
            editHandler = null;
            editControls.remove();
            
            // Rigenera i punti dopo la modifica
            drawnItems.eachLayer(function(layer) {
                generatePointsOnRoads(layer);
            });
        }
    });

    document.getElementById('cancelEdit').addEventListener('click', function() {
        if (editHandler) {
            editHandler.revertLayers();
            editHandler.disable();
            editHandler = null;
            editControls.remove();
        }
    });
} 

function setupCustomControls() {
    const controlsContainer = document.querySelector('.controls');

    // Button for draw control
    const drawButton = document.querySelector('#draw');
    drawButton.onclick = () => {
        new L.Draw.Rectangle(map, drawControl.options.draw.rectangle).enable();
    };

    // Button for zoom in control
    const zoomInButton = document.querySelector('#zoomIn');
    zoomInButton.onclick = () => map.zoomIn();

    // Button for zoom out control
    const zoomOutButton = document.querySelector('#zoomOut');
    zoomOutButton.onclick = () => map.zoomOut();
}

function updatePointsList() {
    const pointsList = document.getElementById('points-list');
    pointsList.innerHTML = '<h4>Extracted Points:</h4>';
    
    points.forEach((point, index) => {
        const lat = point.getLatLng().lat;
        const lng = point.getLatLng().lng;
        const link = generateStreetViewLink(lat, lng);
        
        const pointElement = document.createElement('div');
        pointElement.className = 'point-item';
        pointElement.innerHTML = `
            <div>Point ${index + 1}: ${lat.toFixed(6)}, ${lng.toFixed(6)}</div>
            <div class="point-actions">
                <button onclick="previewStreetView('${link}')">Preview</button>
                <button onclick="copyToClipboard('${link}')">Copy Link</button>
            </div>
        `;
        pointsList.appendChild(pointElement);
    });
}

function generateStreetViewLink(lat, lng) {
    const params = new URLSearchParams({
        size: streetViewParams.size,
        location: `${lat},${lng}`,
        fov: streetViewParams.fov,
        heading: streetViewParams.heading,
        pitch: streetViewParams.pitch,
        key: streetViewParams.apiKey
    });
    
    return `https://maps.googleapis.com/maps/api/streetview?${params.toString()}`;
}

function previewStreetView(link) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <img src="${link}" alt="Street View">
            <button onclick="this.parentElement.parentElement.remove()">Close</button>
        </div>
    `;
    document.body.appendChild(modal);
    modal.style.display = 'block';
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text)
        .then(() => alert('Link copied to clipboard!'))
        .catch(err => console.error('Error copying:', err));
}

document.addEventListener('DOMContentLoaded', () => {
    initMap();
    setupCustomControls();
}); 

function updateNumImages() {
    const fov = parseInt(document.getElementById('fov').value);
    const numImages = Math.ceil(360 / fov);
    document.getElementById('numImages').textContent = numImages;
}

document.getElementById('fov').addEventListener('change', (e) => {
    streetViewParams.fov = parseInt(e.target.value);
    document.getElementById('fovValue').textContent = e.target.value;
    updateNumImages();
    updatePointsList();
});

updateNumImages(); 