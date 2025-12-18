document.addEventListener("DOMContentLoaded", function() {
  // Inizializza mappa con stile personalizzato
  var map = L.map(document.querySelector(".map-container"), { 
    zoomControl: false,
    scrollWheelZoom: false
  }).setView([37.15, 14.90], 11); // Centro sulla zona degli Iblei

  // Usa un tile layer con stile morbido
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
  }).addTo(map);

  L.control.zoom({ position: 'bottomleft' }).addTo(map);

  // Array per tenere traccia di percorsi e marker attivi
  var activeRoutes = {};

  // Color helper: get CSS var (fallback to theme green)
  function getColorVar(varName) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(varName);
    return (v || '#4A6741').trim();
  }
  const MAIN_ROUTE_COLOR = getColorVar('--color-primary');

  // Icona personalizzata stile Mineo (goccia con numero)
  function createDropletIcon(number, color = MAIN_ROUTE_COLOR) {
    return L.divIcon({
      className: 'custom-marker',
      html: `<div class="marker-pin" style="background-color: ${color};">
               <span class="marker-number">${number}</span>
             </div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 30],
      popupAnchor: [0, -25]
    });
  }

  // Funzione per creare link Google Maps con tappe successive
  function createGoogleMapsRouteLink(points, startIndex) {
    const origin = `${points[startIndex].coords[0]},${points[startIndex].coords[1]}`;
    const destination = `${points[points.length - 1].coords[0]},${points[points.length - 1].coords[1]}`;
    
    const waypoints = [];
    for (let i = startIndex + 1; i < points.length - 1; i++) {
      waypoints.push(`${points[i].coords[0]},${points[i].coords[1]}`);
    }
    
    let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;
    
    if (waypoints.length > 0) {
      url += `&waypoints=${waypoints.join('|')}`;
    }
    
    url += '&travelmode=driving';
    
    return url;
  }

  // Funzione per ottenere il percorso stradale tramite OSRM
  async function getRoutingPath(coordinates) {
    try {
      const coords = coordinates.map(c => `${c[1]},${c[0]}`).join(';');
      const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        return data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
      } else {
        return coordinates;
      }
    } catch (error) {
      console.error('Errore nel routing:', error);
      return coordinates;
    }
  }

  // Funzione per disegnare un percorso sulla mappa
  async function drawRoute(itinerario) {
    const routeKey = itinerario.slug;
    
    if (activeRoutes[routeKey]) {
      // Rimuovi percorso esistente
      clearInterval(activeRoutes[routeKey].animation);
      activeRoutes[routeKey].markers.forEach(m => map.removeLayer(m));
      if (activeRoutes[routeKey].polyline) map.removeLayer(activeRoutes[routeKey].polyline);
      if (activeRoutes[routeKey].polylineBorder) map.removeLayer(activeRoutes[routeKey].polylineBorder);
      delete activeRoutes[routeKey];
      return;
    }

    var markers = [];
    var coords = [];
    const points = itinerario.coordinate_tappe;

    if (!points || points.length === 0) {
      console.warn('Nessuna coordinata disponibile per questo itinerario');
      return;
    }

    // Crea marker per ogni punto del percorso
    points.forEach((point, index) => {
      coords.push(point.coords);
      
      var marker = L.marker(point.coords, {
        icon: createDropletIcon(point.order)
      });

      // Crea il link Google Maps con tutte le tappe successive
      var googleMapsLink = createGoogleMapsRouteLink(points, index);

      // Popup con informazioni dettagliate (senza header)
      var popupContent = `
        <div class="route-popup">
          <div class="route-popup-body">
            <h6 class="mb-2"><span class="badge" style="background-color: ${MAIN_ROUTE_COLOR}">${point.order}</span> ${point.nome}</h6>
            <p class="small text-muted mb-2">${point.descrizione}</p>
            <a href="${googleMapsLink}" 
               target="_blank" 
               class="btn btn-sm btn-outline-primary w-100">
              📍 Ottieni percorso completo
            </a>
            ${index < points.length - 1 ? 
              `<small class="text-muted d-block mt-2">Include ${points.length - index - 1} tappe successive</small>` 
              : '<small class="text-muted d-block mt-2">Ultima tappa del percorso</small>'}
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, {
        maxWidth: 300,
        className: 'custom-popup'
      });
      
      marker.addTo(map);
      markers.push(marker);
    });

    // Ottieni il percorso stradale reale tramite OSRM
    const routingCoords = await getRoutingPath(coords);

    // Disegna la linea del percorso seguendo le strade
    var polylineBorder = L.polyline(routingCoords, {
      color: '#000',
      weight: 7,
      opacity: 0.3,
      smoothFactor: 1,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(map);

    var polyline = L.polyline(routingCoords, {
      color: MAIN_ROUTE_COLOR,
      weight: 5,
      opacity: 0.8,
      smoothFactor: 1,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(map);
    
    polyline.bringToFront();

    // Animazione opzionale
    var offset = 0;
    var animateLine = setInterval(function() {
      offset += 1;
      if (offset > 20) offset = 0;
    }, 100);

    // Salva il percorso attivo
    activeRoutes[routeKey] = {
      markers: markers,
      polyline: polyline,
      polylineBorder: polylineBorder,
      animation: animateLine
    };

    // Adatta la vista della mappa al percorso
    map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
  }

  // Gestione click sui pulsanti dei percorsi
  document.querySelectorAll('.route-btn').forEach(btn => {
    btn.addEventListener('click', async function() {
      // Skip se è il pulsante reset
      if (this.classList.contains('reset-view-btn')) {
        return;
      }
      
      let itinerarioData;
      
      try {
        itinerarioData = JSON.parse(this.dataset.itinerario);
        console.log('Dati itinerario:', itinerarioData);
      } catch (e) {
        console.error('Errore nel parsing dei dati itinerario:', e);
        console.error('Dati grezzi:', this.dataset.itinerario);
        alert('Errore nel caricamento dei dati del percorso');
        return;
      }
      
      // Se il percorso è già attivo, lo rimuoviamo
      if (this.classList.contains('active')) {
        this.classList.remove('active');
        await drawRoute(itinerarioData);
        return;
      }
      
      // Rimuovi tutti gli altri percorsi attivi
      document.querySelectorAll('.route-btn.active').forEach(async activeBtn => {
        if (activeBtn !== this) {
          activeBtn.classList.remove('active');
          try {
            const activeData = JSON.parse(activeBtn.dataset.itinerario);
            if (activeRoutes[activeData.slug]) {
              clearInterval(activeRoutes[activeData.slug].animation);
              activeRoutes[activeData.slug].markers.forEach(m => map.removeLayer(m));
              if (activeRoutes[activeData.slug].polyline) map.removeLayer(activeRoutes[activeData.slug].polyline);
              if (activeRoutes[activeData.slug].polylineBorder) map.removeLayer(activeRoutes[activeData.slug].polylineBorder);
              delete activeRoutes[activeData.slug];
            }
          } catch (e) {}
        }
      });
      
      // Attiva il nuovo percorso
      this.classList.add('active');
      this.style.opacity = '0.6';
      this.style.cursor = 'wait';
      
      await drawRoute(itinerarioData);
      
      this.style.opacity = '1';
      this.style.cursor = 'pointer';
    });
  });

  // Pulsante reset vista
  document.querySelector('.reset-view-btn')?.addEventListener('click', function() {
    map.setView([37.15, 14.90], 11);
  });
});
