// Legge le variabili CSS per i colori dei marker
function getCSSColor(varName) {
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || '#823228';
}

// Crea marker con icone Bootstrap Icons e colori da CSS variables
function createMarker(type) {
    const colorPrimary = getCSSColor('--color-primary');
    const colorSecondary = getCSSColor('--color-secondary');
    const colorAccent = getCSSColor('--color-accent');
    const colorInfo = getCSSColor('--color-info');
    const colorWarning = getCSSColor('--color-warning');

    let icon, color;
    switch (type) {
        case 'Servizi Pubblici':
            icon = 'bi-building';
            color = colorPrimary;
            break;
        case 'Servizi Culturali':
            icon = 'bi-bank';
            color = colorSecondary;
            break;
        case 'Prodotti Tipici':
            icon = 'bi-basket';
            color = colorAccent;
            break;
        case 'Ospitalità':
            icon = 'bi-house-door';
            color = colorInfo;
            break;
        case 'Ristorazione':
            icon = 'bi-cup-hot';
            color = colorWarning;
            break;
        case 'Luoghi Capuaniani':
            icon = 'bi-book';
            color = '#6B4E3D';
            break;
        default:
            icon = 'bi-geo-alt';
            color = colorPrimary;
    }

    return L.divIcon({
        className: 'custom-marker',
        html: `<div class="marker-pin" style="background-color: ${color};">
                   <i class="bi ${icon}"></i>
               </div>`,
        iconSize: [30, 42],
        iconAnchor: [15, 42],
        popupAnchor: [0, -35]
    });
}

document.addEventListener('DOMContentLoaded', function() {
    // Inizializza la mappa centrata su Mineo
    var map = L.map('map').setView([37.2648, 14.6925], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Layer group per i marker
    var markers = L.layerGroup().addTo(map);

    // Aggiungi tutti i marker
    function addMarkers(filter) {
        markers.clearLayers();
        mineoPoints.forEach(function(point) {
            if (filter === 'all' || point.type === filter) {
                var marker = L.marker(point.coords, {
                    icon: createMarker(point.type)
                }).bindPopup('<strong>' + point.name + '</strong><br><em>' + point.type + '</em>');
                markers.addLayer(marker);
            }
        });
    }

    // Inizializza con tutti i marker
    addMarkers('all');

    // Gestisci i filtri dal sidebar
    var filterItems = document.querySelectorAll('.filter-item');
    filterItems.forEach(function(item) {
        item.addEventListener('click', function() {
            // Rimuovi active da tutti
            filterItems.forEach(function(el) {
                el.classList.remove('active');
            });
            // Aggiungi active al cliccato
            this.classList.add('active');
            
            var filter = this.getAttribute('data-type');
            addMarkers(filter);
            
            // Centra la mappa se necessario
            if (markers.getLayers().length > 0) {
                var group = new L.featureGroup(markers.getLayers());
                map.fitBounds(group.getBounds().pad(0.1));
            }
        });
    });

    // Fix per rendering della mappa quando diventa visibile
    setTimeout(function() {
        map.invalidateSize();
    }, 100);

    // Observer per quando la sezione mappa diventa visibile
    var mapSection = document.querySelector('.pages-mappa');
    if (mapSection) {
        var observer = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    map.invalidateSize();
                }
            });
        }, { threshold: 0.1 });
        observer.observe(mapSection);
    }

    // Click sul marker centra e zoom
    markers.on('click', function(e) {
        map.setView(e.latlng, 17);
    });
});
