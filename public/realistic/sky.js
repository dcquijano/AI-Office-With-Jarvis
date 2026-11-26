/**
 * Real-sky engine: local solar position, sunrise/sunset search, timezone-based location
 * estimate, and a lighting palette for any sun elevation. No network requests.
 * Pure ES module (no DOM / three.js) so it runs in the browser and under `node --test`.
 */

const RAD = Math.PI / 180;

/**
 * Approximate solar position (NOAA-style low-precision algorithm, ~0.5° accuracy).
 * @returns {{ elevation: number, azimuth: number }} degrees; azimuth clockwise from north
 */
export function solarPosition(date, latDeg, lonDeg) {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const n = jd - 2451545.0;
  const L = (((280.46 + 0.9856474 * n) % 360) + 360) % 360;
  const g = ((((357.528 + 0.9856003 * n) % 360) + 360) % 360) * RAD;
  const lambda = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * RAD;
  const eps = (23.439 - 0.0000004 * n) * RAD;
  const ra = Math.atan2(Math.cos(eps) * Math.sin(lambda), Math.cos(lambda));
  const dec = Math.asin(Math.sin(eps) * Math.sin(lambda));
  const gmstHours = (((18.697374558 + 24.06570982441908 * n) % 24) + 24) % 24;
  const ha = (gmstHours * 15 + lonDeg) * RAD - ra;
  const lat = latDeg * RAD;

  const sinAlt = Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(ha);
  const elevation = Math.asin(Math.max(-1, Math.min(1, sinAlt))) / RAD;
  const az = Math.atan2(-Math.sin(ha), Math.tan(dec) * Math.cos(lat) - Math.sin(lat) * Math.cos(ha)) / RAD;
  return { elevation, azimuth: (az + 360) % 360 };
}

/**
 * Find the next sunrise and sunset after `date` (5-minute resolution, 36h horizon).
 * @returns {{ sunrise: Date|null, sunset: Date|null }}
 */
export function nextSunEvents(date, latDeg, lonDeg) {
  const horizon = -0.833;
  const stepMs = 5 * 60 * 1000;
  let sunrise = null;
  let sunset = null;
  let prev = solarPosition(date, latDeg, lonDeg).elevation;
  for (let t = date.getTime() + stepMs; t <= date.getTime() + 36 * 3600 * 1000; t += stepMs) {
    const elev = solarPosition(new Date(t), latDeg, lonDeg).elevation;
    if (!sunrise && prev < horizon && elev >= horizon) sunrise = new Date(t);
    if (!sunset && prev >= horizon && elev < horizon) sunset = new Date(t);
    if (sunrise && sunset) break;
    prev = elev;
  }
  return { sunrise, sunset };
}

const TZ_LOCATIONS = {
  'Asia/Manila': [14.6, 121.0, 'Manila'],
  'Asia/Singapore': [1.35, 103.82, 'Singapore'],
  'Asia/Kuala_Lumpur': [3.14, 101.69, 'Kuala Lumpur'],
  'Asia/Shanghai': [31.23, 121.47, 'Shanghai'],
  'Asia/Hong_Kong': [22.32, 114.17, 'Hong Kong'],
  'Asia/Taipei': [25.03, 121.57, 'Taipei'],
  'Asia/Tokyo': [35.68, 139.69, 'Tokyo'],
  'Asia/Seoul': [37.57, 126.98, 'Seoul'],
  'Asia/Jakarta': [-6.2, 106.85, 'Jakarta'],
  'Asia/Bangkok': [13.76, 100.5, 'Bangkok'],
  'Asia/Ho_Chi_Minh': [10.82, 106.63, 'Ho Chi Minh City'],
  'Asia/Kolkata': [22.57, 88.36, 'Kolkata'],
  'Asia/Calcutta': [22.57, 88.36, 'Kolkata'],
  'Asia/Dubai': [25.2, 55.27, 'Dubai'],
  'Asia/Tashkent': [41.31, 69.24, 'Tashkent'],
  'Asia/Karachi': [24.86, 67.0, 'Karachi'],
  'Europe/London': [51.51, -0.13, 'London'],
  'Europe/Paris': [48.86, 2.35, 'Paris'],
  'Europe/Berlin': [52.52, 13.4, 'Berlin'],
  'Europe/Madrid': [40.42, -3.7, 'Madrid'],
  'Europe/Rome': [41.9, 12.5, 'Rome'],
  'Europe/Istanbul': [41.01, 28.98, 'Istanbul'],
  'Europe/Moscow': [55.76, 37.62, 'Moscow'],
  'Africa/Cairo': [30.04, 31.24, 'Cairo'],
  'Africa/Lagos': [6.52, 3.38, 'Lagos'],
  'Africa/Johannesburg': [-26.2, 28.05, 'Johannesburg'],
  'America/New_York': [40.71, -74.01, 'New York'],
  'America/Chicago': [41.88, -87.63, 'Chicago'],
  'America/Denver': [39.74, -104.99, 'Denver'],
  'America/Los_Angeles': [34.05, -118.24, 'Los Angeles'],
  'America/Toronto': [43.65, -79.38, 'Toronto'],
  'America/Mexico_City': [19.43, -99.13, 'Mexico City'],
  'America/Sao_Paulo': [-23.55, -46.63, 'São Paulo'],
  'Australia/Sydney': [-33.87, 151.21, 'Sydney'],
  'Australia/Melbourne': [-37.81, 144.96, 'Melbourne'],
  'Pacific/Auckland': [-36.85, 174.76, 'Auckland']
};

/**
 * Estimate location from the browser time zone (no network, no permission prompt).
 */
export function estimateLocation(timeZone, offsetMinutes = 0) {
  const hit = timeZone ? TZ_LOCATIONS[timeZone] : null;
  if (hit) return { lat: hit[0], lon: hit[1], label: hit[2], approx: true };
  const lon = Math.max(-180, Math.min(180, -offsetMinutes / 4));
  const hours = -offsetMinutes / 60;
  const sign = hours >= 0 ? '+' : '-';
  return { lat: 20, lon, label: `UTC${sign}${Math.abs(hours)}`, approx: true };
}

function smoothstep(e0, e1, x) {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

function hexToRgb(hex) {
  const n = parseInt(String(hex).replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function mixColor(a, b, t) {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  const k = Math.max(0, Math.min(1, t));
  const out = ca.map((v, i) => Math.round(v + (cb[i] - v) * k));
  return `#${out.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Lighting palette for a given sun elevation (degrees).
 */
export function skyState(elevation) {
  const day = smoothstep(-6, 8, elevation);
  const sunset = day * (1 - smoothstep(0, 14, elevation)) + (1 - day) * smoothstep(-8, -2, elevation) * 0.6;

  let bgTop = mixColor('#030714', '#3d8fd6', day);
  bgTop = mixColor(bgTop, '#33407a', sunset * 0.7);
  let bgMid = mixColor('#081028', '#8cc4ef', day);
  bgMid = mixColor(bgMid, '#c77a8f', sunset * 0.65);
  let bgBottom = mixColor('#0b1430', '#d7ecff', day);
  bgBottom = mixColor(bgBottom, '#ffa25e', sunset * 0.8);

  return {
    elevation,
    day,
    sunset,
    isNight: elevation < -4,
    sunIntensity: 2.8 * smoothstep(-2, 10, elevation),
    sunColor: mixColor('#ffbf80', '#fff6ea', smoothstep(2, 30, elevation)),
    moonIntensity: 0.38 * (1 - day),
    hemiSky: mixColor('#1b2547', '#cfe5ff', day),
    hemiGround: mixColor('#0a0e18', '#6b5f50', day),
    hemiIntensity: 0.14 + 0.6 * day,
    envIntensity: 0.2 + 0.55 * day,
    exposure: 0.88 + 0.14 * day,
    bgTop,
    bgMid,
    bgBottom,
    fog: bgBottom,
    lampFactor: 1 - smoothstep(-4, 6, elevation),
    starOpacity: 1 - smoothstep(-12, -2, elevation)
  };
}
