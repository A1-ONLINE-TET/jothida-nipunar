"""
═══════════════════════════════════════════════════════════════════
ஜோதிட நிபுணர் — Backend Horoscope API
Swiss Ephemeris (NASA JPL DE431) — 100% Accurate
═══════════════════════════════════════════════════════════════════
Usage:
  python horoscope_api.py                    → starts on port 8080
  python horoscope_api.py --port 3001        → custom port

Test:
  curl "http://localhost:8080/api/horoscope?year=1981&month=1&day=29&hour=10&minute=51&lat=8.7642&lon=78.1348&tz=5.5"

Deploy: Firebase Cloud Function / Google Cloud Run / AWS Lambda
═══════════════════════════════════════════════════════════════════
"""

import swisseph as swe
import json
import sys
import os
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from urllib.request import Request, urlopen
from urllib.error import URLError

# ── Constants ──
RASHIS_TA = ["மேஷம்","ரிஷபம்","மிதுனம்","கடகம்","சிம்மம்","கன்னி",
             "துலாம்","விருச்சிகம்","தனுசு","மகரம்","கும்பம்","மீனம்"]
RASHIS_EN = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo",
             "Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"]
NAKSHATRAS_TA = [
    "அசுவினி","பரணி","கார்த்திகை","ரோகிணி","மிருகசீரிடம்",
    "திருவாதிரை","புனர்பூசம்","பூசம்","ஆயில்யம்","மகம்",
    "பூரம்","உத்திரம்","அஸ்தம்","சித்திரை","சுவாதி",
    "விசாகம்","அனுஷம்","கேட்டை","மூலம்","பூராடம்",
    "உத்திராடம்","திருவோணம்","அவிட்டம்","சதயம்",
    "பூரட்டாதி","உத்திரட்டாதி","ரேவதி"
]
NAKSHATRAS_EN = [
    "Ashwini","Bharani","Krittika","Rohini","Mrigashira",
    "Ardra","Punarvasu","Pushya","Ashlesha","Magha",
    "Purva Phalguni","Uttara Phalguni","Hasta","Chitra","Swati",
    "Vishakha","Anuradha","Jyeshtha","Mula","Purva Ashadha",
    "Uttara Ashadha","Shravana","Dhanishta","Shatabhisha",
    "Purva Bhadrapada","Uttara Bhadrapada","Revati"
]
PLANETS = [
    ("Sun",    "சூரியன்",   "☉", swe.SUN),
    ("Moon",   "சந்திரன்",  "☽", swe.MOON),
    ("Mars",   "செவ்வாய்",  "♂", swe.MARS),
    ("Mercury","புதன்",     "☿", swe.MERCURY),
    ("Jupiter","குரு",      "♃", swe.JUPITER),
    ("Venus",  "சுக்கிரன்", "♀", swe.VENUS),
    ("Saturn", "சனி",       "♄", swe.SATURN),
]

def compute_horoscope(year, month, day, hour, minute, lat, lon, tz_offset=5.5):
    """Compute full Vedic horoscope using Swiss Ephemeris."""
    swe.set_ephe_path(None)
    swe.set_sid_mode(swe.SIDM_LAHIRI)

    # Convert local time to UTC
    hour_decimal = hour + minute / 60.0
    hour_utc = hour_decimal - tz_offset

    # Handle day rollover
    adj_day = day
    if hour_utc < 0:
        hour_utc += 24
        adj_day -= 1
    elif hour_utc >= 24:
        hour_utc -= 24
        adj_day += 1

    jd = swe.julday(year, month, adj_day, hour_utc)
    ayanamsa = swe.get_ayanamsa(jd)

    # ── Ascendant (Lagna) ──
    houses = swe.houses(jd, lat, lon, b'P')
    asc_tropical = houses[1][0]
    asc_sidereal = (asc_tropical - ayanamsa) % 360
    lagna_rashi = int(asc_sidereal / 30)
    lagna_deg = round(asc_sidereal % 30, 2)
    lagna_nak = int(asc_sidereal / (360 / 27))

    result = {
        "success": True,
        "engine": "Swiss Ephemeris (NASA JPL DE431)",
        "ayanamsa": round(ayanamsa, 4),
        "ayanamsa_type": "Lahiri (Chitrapaksha)",
        "input": {
            "date": f"{year}-{month:02d}-{day:02d}",
            "time": f"{hour:02d}:{minute:02d}",
            "timezone": tz_offset,
            "latitude": lat,
            "longitude": lon
        },
        "ascendant": {
            "longitude": round(asc_sidereal, 2),
            "rashi": lagna_rashi,
            "rashi_ta": RASHIS_TA[lagna_rashi],
            "rashi_en": RASHIS_EN[lagna_rashi],
            "degree": lagna_deg,
            "nakshatra": lagna_nak,
            "nakshatra_ta": NAKSHATRAS_TA[lagna_nak] if lagna_nak < 27 else "",
            "nakshatra_en": NAKSHATRAS_EN[lagna_nak] if lagna_nak < 27 else ""
        },
        "planets": []
    }

    # ── Planets ──
    for en, ta, symbol, pid in PLANETS:
        pos, ret = swe.calc_ut(jd, pid)
        speed = pos[3] if len(pos) > 3 else 0
        is_retro = speed < 0
        sid_long = (pos[0] - ayanamsa) % 360
        rashi = int(sid_long / 30)
        degree = round(sid_long % 30, 2)
        nak = int(sid_long / (360 / 27))
        pada = int((sid_long % (360 / 27)) / (360 / 108)) + 1
        house = ((rashi - lagna_rashi + 12) % 12) + 1

        result["planets"].append({
            "name_en": en, "name_ta": ta, "symbol": symbol,
            "longitude": round(sid_long, 2),
            "rashi": rashi,
            "rashi_ta": RASHIS_TA[rashi],
            "rashi_en": RASHIS_EN[rashi],
            "degree": degree,
            "nakshatra": nak,
            "nakshatra_ta": NAKSHATRAS_TA[nak] if nak < 27 else "",
            "nakshatra_en": NAKSHATRAS_EN[nak] if nak < 27 else "",
            "nakshatra_pada": pada,
            "house": house,
            "is_retrograde": is_retro
        })

    # ── Rahu & Ketu ──
    rahu_pos = swe.calc_ut(jd, swe.MEAN_NODE)[0]
    rahu_sid = (rahu_pos[0] - ayanamsa) % 360
    ketu_sid = (rahu_sid + 180) % 360

    for name_en, name_ta, symbol, sid_long in [
        ("Rahu", "ராகு", "☊", rahu_sid),
        ("Ketu", "கேது", "☋", ketu_sid)
    ]:
        rashi = int(sid_long / 30)
        degree = round(sid_long % 30, 2)
        nak = int(sid_long / (360 / 27))
        pada = int((sid_long % (360 / 27)) / (360 / 108)) + 1
        house = ((rashi - lagna_rashi + 12) % 12) + 1
        result["planets"].append({
            "name_en": name_en, "name_ta": name_ta, "symbol": symbol,
            "longitude": round(sid_long, 2),
            "rashi": rashi,
            "rashi_ta": RASHIS_TA[rashi],
            "rashi_en": RASHIS_EN[rashi],
            "degree": degree,
            "nakshatra": nak,
            "nakshatra_ta": NAKSHATRAS_TA[nak] if nak < 27 else "",
            "nakshatra_en": NAKSHATRAS_EN[nak] if nak < 27 else "",
            "nakshatra_pada": pada,
            "house": house,
            "is_retrograde": True  # Rahu/Ketu always retrograde
        })

    # ── Moon-based summary ──
    moon = result["planets"][1]  # Moon is index 1
    result["summary"] = {
        "lagna": result["ascendant"]["rashi_ta"],
        "lagna_en": result["ascendant"]["rashi_en"],
        "moon_rashi": moon["rashi_ta"],
        "moon_rashi_en": moon["rashi_en"],
        "nakshatra": moon["nakshatra_ta"],
        "nakshatra_en": moon["nakshatra_en"],
        "nakshatra_pada": moon["nakshatra_pada"],
        "sun_rashi": result["planets"][0]["rashi_ta"],
        "sun_rashi_en": result["planets"][0]["rashi_en"]
    }

    return result


class HoroscopeHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/horoscope":
            params = parse_qs(parsed.query)
            try:
                year = int(params.get("year", [2000])[0])
                month = int(params.get("month", [1])[0])
                day = int(params.get("day", [1])[0])
                hour = int(params.get("hour", [6])[0])
                minute = int(params.get("minute", [0])[0])
                lat = float(params.get("lat", [13.0827])[0])   # Default: Chennai
                lon = float(params.get("lon", [80.2707])[0])
                tz = float(params.get("tz", [5.5])[0])         # Default: IST

                result = compute_horoscope(year, month, day, hour, minute, lat, lon, tz)
                self._send_json(200, result)
            except Exception as e:
                self._send_json(500, {"success": False, "error": str(e)})
        else:
            self._send_json(200, {
                "service": "Jothida Nipunar — Horoscope API",
                "engine": "Swiss Ephemeris (pyswisseph)",
                "endpoints": ["/api/horoscope?year=1981&month=1&day=29&hour=10&minute=51&lat=8.76&lon=78.13&tz=5.5"],
                "status": "running"
            })

    def _send_json(self, code, data):
        response = json.dumps(data, ensure_ascii=False, indent=2)
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(response.encode("utf-8"))

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/predict":
            api_key = os.environ.get("ANTHROPIC_API_KEY", "")
            if not api_key:
                self._send_json(500, {"success": False, "error": "ANTHROPIC_API_KEY not configured"})
                return
            try:
                length = int(self.headers.get("Content-Length", 0))
                body = json.loads(self.rfile.read(length)) if length else {}
                prompt = body.get("prompt", "")
                max_tokens = min(body.get("max_tokens", 600), 1500)
                if not prompt:
                    self._send_json(400, {"success": False, "error": "prompt required"})
                    return

                req = Request(
                    "https://api.anthropic.com/v1/messages",
                    data=json.dumps({
                        "model": "claude-sonnet-4-20250514",
                        "max_tokens": max_tokens,
                        "messages": [{"role": "user", "content": prompt}]
                    }).encode("utf-8"),
                    headers={
                        "Content-Type": "application/json",
                        "x-api-key": api_key,
                        "anthropic-version": "2023-06-01"
                    }
                )
                with urlopen(req, timeout=30) as resp:
                    data = json.loads(resp.read())
                text = "".join(b.get("text", "") for b in data.get("content", []))
                self._send_json(200, {"success": True, "text": text})
            except URLError as e:
                self._send_json(502, {"success": False, "error": f"AI service error: {e.reason}"})
            except Exception as e:
                self._send_json(500, {"success": False, "error": str(e)})
        else:
            self._send_json(404, {"success": False, "error": "Not found"})

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def log_message(self, format, *args):
        print(f"[API] {args[0]}")


if __name__ == "__main__":
    port = 8080
    if "--port" in sys.argv:
        port = int(sys.argv[sys.argv.index("--port") + 1])

    print(f"""
╔══════════════════════════════════════════════════╗
║   ஜோதிட நிபுணர் — Horoscope API                 ║
║   Swiss Ephemeris (NASA JPL DE431)               ║
║   Port: {port}                                     ║
║   http://localhost:{port}/api/horoscope             ║
╚══════════════════════════════════════════════════╝
""")
    server = HTTPServer(("0.0.0.0", port), HoroscopeHandler)
    server.serve_forever()
