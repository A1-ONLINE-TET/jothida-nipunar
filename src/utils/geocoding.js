// ═══════════════════════════════════════════════════════════════════
// GEOCODING — city lat/lon database + Nominatim (OpenStreetMap) lookup
// ═══════════════════════════════════════════════════════════════════
export const CITIES = {
  "chennai":[13.0827,80.2707],"madurai":[9.9252,78.1198],"coimbatore":[11.0168,76.9558],
  "trichy":[10.7905,78.7047],"tiruchirappalli":[10.7905,78.7047],"salem":[11.6643,78.1460],
  "tirunelveli":[8.7139,77.7567],"erode":[11.3410,77.7172],"vellore":[12.9165,79.1325],
  "thoothukudi":[8.7642,78.1348],"tuticorin":[8.7642,78.1348],"thanjavur":[10.7870,79.1378],
  "dindigul":[10.3624,77.9695],"karur":[10.9601,78.0766],"nagercoil":[8.1833,77.4119],
  "kanchipuram":[12.8342,79.7036],"kumbakonam":[10.9617,79.3881],"rajapalayam":[9.4530,77.5568],
  "sivakasi":[9.4533,77.7981],"pollachi":[10.6609,77.0084],"tiruppur":[11.1085,77.3411],
  "nagapattinam":[10.7672,79.8449],"cuddalore":[11.7480,79.7714],"villupuram":[11.9401,79.4861],
  "perunali":[9.72,78.85],"perambalur":[11.2340,78.8808],"ariyalur":[11.1400,79.0750],
  "pudukkottai":[10.3833,78.8001],"sivagangai":[10.0000,78.4800],"virudhunagar":[9.5850,77.9570],
  "theni":[10.0104,77.4768],"namakkal":[11.2190,78.1674],"tiruvannamalai":[12.2253,79.0747],
  "krishnagiri":[12.5186,78.2137],"dharmapuri":[12.1211,78.1582],"nilgiris":[11.4916,76.7337],
  "ooty":[11.4102,76.6950],"kodaikanal":[10.2381,77.4892],
  "mumbai":[19.0760,72.8777],"delhi":[28.7041,77.1025],"bangalore":[12.9716,77.5946],
  "hyderabad":[17.3850,78.4867],"kolkata":[22.5726,88.3639],"pune":[18.5204,73.8567],
  "ahmedabad":[23.0225,72.5714],"jaipur":[26.9124,75.7873],"lucknow":[26.8467,80.9462],
  "kochi":[9.9312,76.2673],"thiruvananthapuram":[8.5241,76.9366],"pondicherry":[11.9416,79.8083],
  "srirangam":[10.8560,78.6921],"palani":[10.4505,77.5205],"rameswaram":[9.2876,79.3129],
  "kanyakumari":[8.0883,77.5385],"chidambaram":[11.3992,79.6946],
};

// Fuzzy match: strips whitespace, lowercases, tries exact then substring match.
// Falls back to Chennai (13.08,80.27) when city isn't found — most central TN reference.
export function geocodeCity(cityName) {
  if (!cityName) return { lat:13.0827, lon:80.2707, matched:false, name:"Chennai (default)" };
  const clean = cityName.toLowerCase().trim().split(',')[0].trim();
  if (CITIES[clean]) return { lat:CITIES[clean][0], lon:CITIES[clean][1], matched:true, name:cityName };
  const found = Object.keys(CITIES).find(key => clean.includes(key) || key.includes(clean));
  if (found) return { lat:CITIES[found][0], lon:CITIES[found][1], matched:true, name:cityName };
  return { lat:13.0827, lon:80.2707, matched:false, name:cityName };
}

// Async geocoding via Nominatim (OpenStreetMap) — used when local DB has no match
export async function geocodeCityAsync(cityName) {
  const local = geocodeCity(cityName);
  if (local.matched) return local;
  try {
    const q = encodeURIComponent(cityName.trim());
    const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=in`, {
      headers: { "Accept-Language": "en" }
    });
    const data = await r.json();
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon), matched: true, name: data[0].display_name.split(',')[0] };
    }
  } catch (e) { /* network error — fall through to default */ }
  return local;
}

// ═══════════════════════════════════════════════════════════════════
// PRECISE PLACE SEARCH — OpenStreetMap Nominatim (free, no API key)
// Lets the user search-as-they-type for ANY place worldwide and pick
// an exact match, instead of relying on the ~51-city hardcoded database.
// Usage policy: max ~1 request/sec, so callers must debounce (handled
// in the UI via placeSearchTimer). Falls back silently on any network
// or rate-limit failure — the hardcoded CITIES database remains the
// safety net so the app keeps working offline.
// ═══════════════════════════════════════════════════════════════════
export async function searchPlacesOSM(query) {
  if (!query || query.trim().length < 3) return [];
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=6&addressdetails=1`;
    const res = await fetch(url, { headers: { "Accept-Language": "ta,en" } });
    if (!res.ok) return [];
    const data = await res.json();
    return data.map(d => ({
      displayName: d.display_name,
      lat: parseFloat(d.lat),
      lon: parseFloat(d.lon),
      // Short label: prefer city/town/village + state/country for a cleaner dropdown line
      shortLabel: [
        d.address?.city || d.address?.town || d.address?.village || d.address?.county || d.name,
        d.address?.state || d.address?.country
      ].filter(Boolean).join(", ") || d.display_name
    }));
  } catch (e) {
    return []; // network unavailable — UI falls back to the offline CITIES database
  }
}

// Resolves the lat/lon to use for a person's birth place, in priority order:
// 1. Precise coordinates from the OSM search dropdown OR manual "advanced" entry
//    (both stored in formData.pobLat/pobLon — this function doesn't need to distinguish them)
// 2. Fallback: fuzzy match against the offline ~51-city CITIES database (geocodeCity)
export function resolveBirthGeo(fd) {
  if (fd.pobLat != null && fd.pobLon != null) {
    return { lat: fd.pobLat, lon: fd.pobLon, matched: true, precise: true, name: fd.pob };
  }
  return { ...geocodeCity(fd.pob), precise: false };
}
