/**
 * KISSAN CONNECT - REAL-TIME ROUTING & DISTANCE SERVICE
 * Interfaces with Open Source Routing Machine (OSRM) for authentic road distance & driving ETA
 * Strictly NO fake distances or fake ETAs.
 */

const http = require('http');

/**
 * Calculate driving distance and ETA between two real coordinates
 * @param {number} originLat 
 * @param {number} originLon 
 * @param {number} destLat 
 * @param {number} destLon 
 */
async function calculateRoute(originLat, originLon, destLat, destLon) {
  if (!originLat || !originLon || !destLat || !destLon) {
    return {
      status: 'unavailable',
      message: 'Invalid pickup or destination coordinates',
      source: 'OSRM Routing Engine'
    };
  }

  // OSRM expects {longitude},{latitude};{longitude},{latitude}
  const url = `http://router.project-osrm.org/route/v1/driving/${originLon},${originLat};${destLon},${destLat}?overview=false`;

  return new Promise((resolve) => {
    http.get(url, (res) => {
      let rawData = '';
      res.on('data', (chunk) => { rawData += chunk; });
      res.on('end', () => {
        try {
          if (res.statusCode !== 200) {
            resolve({
              status: 'unavailable',
              message: 'Route estimate unavailable from routing server',
              source: 'OSRM Routing Engine'
            });
            return;
          }

          const parsed = JSON.parse(rawData);
          if (parsed.code !== 'Ok' || !parsed.routes || parsed.routes.length === 0) {
            resolve({
              status: 'unavailable',
              message: 'Route estimate unavailable',
              source: 'OSRM Routing Engine'
            });
            return;
          }

          const route = parsed.routes[0];
          const distanceMeters = route.distance;
          const durationSeconds = route.duration;

          const distanceKm = Math.round((distanceMeters / 1000) * 10) / 10;
          const durationMinutes = Math.round(durationSeconds / 60);

          let etaFormatted = `${durationMinutes} నిమిషాలు (${durationMinutes} mins)`;
          if (durationMinutes >= 60) {
            const hrs = Math.floor(durationMinutes / 60);
            const mins = durationMinutes % 60;
            etaFormatted = `${hrs} గంటల ${mins} నిమిషాలు (${hrs}h ${mins}m)`;
          }

          resolve({
            status: 'success',
            source: 'OSRM Driving Routing Engine',
            distanceKm: distanceKm,
            durationMinutes: durationMinutes,
            etaFormatted: etaFormatted,
            lastCalculated: new Date().toISOString()
          });
        } catch (err) {
          resolve({
            status: 'unavailable',
            message: 'Route estimate unavailable',
            source: 'OSRM Routing Engine'
          });
        }
      });
    }).on('error', () => {
      resolve({
        status: 'unavailable',
        message: 'Route estimate unavailable',
        source: 'OSRM Routing Engine'
      });
    });
  });
}

module.exports = { calculateRoute };
