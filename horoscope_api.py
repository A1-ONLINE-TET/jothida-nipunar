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
import hmac
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from urllib.request import Request, urlopen
from urllib.error import URLError

# ═══════════════════════════════════════════════════════════════════
# SECURITY — this backend is NOT public. Only the Cloudflare Worker
# gateway may call it, using a shared secret in the X-Internal-Token
# header (set INTERNAL_TOKEN in the environment on both sides).
#   • No wildcard CORS — the browser must never reach this service.
#   • Every request is rejected unless the internal token matches.
#   • Input is bounds-checked before it touches the ephemeris.
# If INTERNAL_TOKEN is unset the service refuses to start — fail closed.
# ═══════════════════════════════════════════════════════════════════
INTERNAL_TOKEN = os.environ.get("INTERNAL_TOKEN", "")


def _token_ok(handler):
    """Timing-safe check of the shared secret sent by the Worker gateway."""
    if not INTERNAL_TOKEN:
        return False
    sent = handler.headers.get("X-Internal-Token", "")
    return hmac.compare_digest(sent, INTERNAL_TOKEN)

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

def _dms(deg):
    """Format a longitude as D:MM:SS (same format the local JS engine emits)."""
    d = int(deg)
    mf = (deg - d) * 60
    m = int(mf)
    s = int((mf - m) * 60)
    return f"{d}:{m:02d}:{s:02d}"


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
    ayanamsa = swe.get_ayanamsa_ut(jd)  # UT variant — jd here is UT, not ET

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
        pos, ret = swe.calc_ut(jd, pid, swe.FLG_SWIEPH | swe.FLG_SPEED)
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
            # Frontend-parser (parseBackendResponse) compatibility fields:
            "ta": ta, "fullLong": round(sid_long, 2), "dms": _dms(sid_long),
            "speed": round(speed, 5),
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
            "ta": name_ta, "fullLong": round(sid_long, 2), "dms": _dms(sid_long),
            "speed": -1.0,  # nodes are always retrograde
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

    # ── Frontend-parser (parseBackendResponse in src/App.jsx) compatibility ──
    # The parser reads data.lagna / root-level moon_rashi_ta, tithi, etc.
    # (The old "ascendant"/"summary" shapes are kept above for backward compat.)
    lagna_pada = int((asc_sidereal % (360 / 27)) / (360 / 108)) + 1
    result["lagna"] = {
        "rashi": lagna_rashi,
        "degree": lagna_deg,
        "dms": _dms(asc_sidereal),
        "fullLong": round(asc_sidereal, 2),
        "nakshatra_ta": NAKSHATRAS_TA[lagna_nak] if lagna_nak < 27 else "",
        "pada": lagna_pada,
    }
    result["moon_rashi_ta"] = moon["rashi_ta"]
    result["sun_rashi_ta"] = result["planets"][0]["rashi_ta"]
    result["nakshatra_ta"] = moon["nakshatra_ta"]
    result["nakshatra_pada"] = moon["nakshatra_pada"]

    # Panchangam (tithi / paksham / yogam / karanam) from sidereal Sun & Moon
    sun_long = result["planets"][0]["fullLong"]
    moon_long = moon["fullLong"]
    elong = (moon_long - sun_long) % 360
    tithi_idx = int(elong / 12)  # 0..29
    TITHIS_TA = ["பிரதமை","த்விதியை","திருதியை","சதுர்த்தி","பஞ்சமி","ஷஷ்டி","சப்தமி",
                 "அஷ்டமி","நவமி","தசமி","ஏகாதசி","த்வாதசி","திரயோதசி","சதுர்தசி","பௌர்ணமி/அமாவாசை"]
    result["tithi"] = TITHIS_TA[tithi_idx % 15]
    result["paksham"] = "சுக்லபக்ஷம் (வளர்பிறை)" if tithi_idx < 15 else "கிருஷ்ணபக்ஷம் (தேய்பிறை)"
    YOGAMS_TA = ["விஷ்கம்பம்","பிரீதி","ஆயுஷ்மான்","சௌபாக்யம்","சோபனம்","அதிகண்டம்","சுகர்மம்",
                 "திருதி","சூலம்","கண்டம்","விருத்தி","துருவம்","வ்யாகாதம்","ஹர்ஷணம்","வஜ்ரம்",
                 "சித்தி","வ்யதீபாதம்","வரீயான்","பரிகம்","சிவம்","சித்தம்","சாத்தியம்","சுபம்",
                 "சுப்ரம்","பிராம்யம்","ஐந்திரம்","வைத்ருதி"]
    result["yogam"] = YOGAMS_TA[int(((sun_long + moon_long) % 360) / (360 / 27)) % 27]
    # Karanam — classical 60-half-tithi scheme (k=0 Kimstughna; 57-59 fixed; else movable)
    KARANAMS_TA = ["பவம்","பாலவம்","கௌலவம்","தைதுலம்","கரம்","வணிசை","விஷ்டி",
                   "சகுனி","சதுஷ்பாதம்","நாகம்","கிம்ஸ்துக்னம்"]
    k = int(elong / 6)
    karana_idx = 10 if k == 0 else (7 + (k - 57)) if k >= 57 else (k - 1) % 7
    result["karanam"] = KARANAMS_TA[karana_idx]

    return result


class HoroscopeHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        # Unauthenticated health check only — reveals nothing sensitive.
        if parsed.path == "/" or parsed.path == "":
            self._send_json(200, {"service": "internal", "status": "running"})
            return
        if parsed.path == "/api/horoscope":
            if not _token_ok(self):
                self._send_json(401, {"success": False, "error": "unauthorized"})
                return
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

                # ── Bounds validation — reject nonsense before it hits the ephemeris ──
                if not (1900 <= year <= 2100): raise ValueError("year out of range")
                if not (1 <= month <= 12): raise ValueError("month out of range")
                if not (1 <= day <= 31): raise ValueError("day out of range")
                if not (0 <= hour <= 23): raise ValueError("hour out of range")
                if not (0 <= minute <= 59): raise ValueError("minute out of range")
                if not (-90.0 <= lat <= 90.0): raise ValueError("lat out of range")
                if not (-180.0 <= lon <= 180.0): raise ValueError("lon out of range")
                if not (-12.0 <= tz <= 14.0): raise ValueError("tz out of range")

                result = compute_horoscope(year, month, day, hour, minute, lat, lon, tz)
                self._send_json(200, result)
            except ValueError as e:
                self._send_json(400, {"success": False, "error": str(e)})
            except Exception:
                # Never leak internal error details to the caller.
                self._send_json(500, {"success": False, "error": "internal error"})
        else:
            self._send_json(404, {"success": False, "error": "not found"})

    def _send_json(self, code, data):
        # No CORS headers on purpose: this service is called server-to-server
        # by the Cloudflare Worker only. Browsers must never reach it directly.
        response = json.dumps(data, ensure_ascii=False, indent=2)
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(response.encode("utf-8"))

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/predict":
            # Gated: only the Worker (with the internal token) may reach this.
            # NOTE: the Cloudflare Worker now owns Claude calls directly and
            # builds prompts server-side. This endpoint is kept token-gated
            # only for backward compatibility and should be considered
            # deprecated — do NOT expose it to the browser.
            if not _token_ok(self):
                self._send_json(401, {"success": False, "error": "unauthorized"})
                return
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
            except URLError:
                self._send_json(502, {"success": False, "error": "AI service error"})
            except Exception:
                self._send_json(500, {"success": False, "error": "internal error"})
        else:
            self._send_json(404, {"success": False, "error": "Not found"})

    def do_OPTIONS(self):
        # No cross-origin preflight is granted — server-to-server only.
        self.send_response(204)
        self.end_headers()

    def log_message(self, format, *args):
        print(f"[API] {args[0]}")


if __name__ == "__main__":
    # Fail closed: refuse to run without the shared secret, so the service
    # is never accidentally deployed wide open.
    if not INTERNAL_TOKEN:
        print("FATAL: INTERNAL_TOKEN environment variable is not set. "
              "This backend must not run without it. Aborting.", file=sys.stderr)
        sys.exit(1)

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
