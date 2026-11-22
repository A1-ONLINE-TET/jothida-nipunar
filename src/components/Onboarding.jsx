// ═══════════════════════════════════════════════════════════════════
// நுழைவு — ஒரு பக்கத்தில் ஒரு கேள்வி (உரிமையாளர் கோரிக்கை 2026-11).
// மொழி → பெயர் → கைபேசி எண் → ஆண்/பெண் → பிறந்த தேதி → பிறந்த நேரம் → பிறந்த இடம் → முகப்பு.
// இங்கே ஜாதகம் கணக்கிடப்படுவதில்லை, காட்டப்படுவதும் இல்லை — விவரங்கள் மட்டும் சேகரிக்கப்படும்; ஜாதகப் பகுதியைத்
// திறக்கும்போதுதான் கணக்கு நடக்கும். கணக்கு எதுவும் இல்லாததால் proprietary logic இதில் இல்லை.
//
// props:
//   steps        — காட்ட வேண்டிய படிகள் (இயல்பு: எல்லாம்). ஏற்கனவே விவரம் உள்ளவருக்கு ["lang"] மட்டும்.
//   initial      — { name, phone, gender, dob:"DD.MM.YYYY", tob:"hh:mm", sec, ampm:"AM|PM", pob, pobLat, pobLon, pobSource, pobTz }
//   searchPlaces — async (text) → [{ shortLabel, displayName, lat, lon, countryCode }]   (almanac.searchPlacesOSM)
//   guessZone    — (countryCode, lat, lon) → IANA நேர மண்டலம் அல்லது ""
//   onDone       — (விவரங்கள்) → செயலி உள்ளே
// ═══════════════════════════════════════════════════════════════════
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Check, MapPin } from "lucide-react";
import { LANGS, useLang, hasLang } from "../i18n/index.js";
import "./onboarding.css";

export const ALL_STEPS = ["lang", "name", "phone", "gender", "dob", "time", "place"];

const pad2 = (n) => String(n).padStart(2, "0");
const daysIn = (y, m) => new Date(y, m, 0).getDate(); // m: 1–12

// "DD.MM.YYYY" → { d, m, y } (எண்கள்; இல்லையெனில் காலி)
function splitDob(dob) {
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(dob || "");
  return m ? { d: Number(m[1]), m: Number(m[2]), y: m[3] } : { d: 0, m: 0, y: "" };
}
function splitTob(tob) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(tob || "");
  return m ? { h: Number(m[1]), min: Number(m[2]) } : { h: 0, min: -1 };
}
// கைபேசி எண்: இந்திய 10 இலக்கம் (6–9 இல் தொடக்கம்), அல்லது +நாட்டுக் குறியீட்டுடன் 8–15 இலக்கம்.
export function normalizePhone(raw) {
  const s = String(raw || "").trim();
  const digits = s.replace(/\D/g, "");
  if (s.startsWith("+")) return digits.length >= 8 && digits.length <= 15 ? "+" + digits : "";
  if (digits.length === 12 && digits.startsWith("91") && /^[6-9]/.test(digits.slice(2))) return "+" + digits;
  if (digits.length === 11 && digits.startsWith("0") && /^[6-9]/.test(digits.slice(1))) return "+91" + digits.slice(1);
  return digits.length === 10 && /^[6-9]/.test(digits) ? "+91" + digits : "";
}
// 12 மணி நேரம் + AM/PM → நாளின் பகுதி (உறுதிப்படுத்தும் வரிக்கு)
export function dayPart(h12, min, ampm) {
  let h = h12 % 12; if (ampm === "PM") h += 12;
  const t = h * 60 + min;
  if (t === 0) return "part.midnight";
  if (t < 4 * 60) return "part.night";
  if (t < 6 * 60) return "part.earlyMorning";
  if (t < 12 * 60) return "part.morning";
  if (t === 12 * 60) return "part.noon";
  if (t < 16 * 60) return "part.afternoon";
  if (t < 18 * 60 + 30) return "part.evening";
  return "part.night";
}

export default function Onboarding({ steps = ALL_STEPS, initial = {}, searchPlaces, guessZone = () => "", onDone = () => {},
  registerStep, onAdvance, onBackStep }) {
  const { lang, t, tList, setLang } = useLang();
  const [i, setI] = useState(0);
  const [err, setErr] = useState("");
  const step = steps[i];

  const [langPicked, setLangPicked] = useState(hasLang() ? lang : "");
  const [name, setName] = useState(initial.name || "");
  const [phone, setPhone] = useState(initial.phone || "");
  const [gender, setGender] = useState(initial.gender || "");
  const d0 = splitDob(initial.dob), t0 = splitTob(initial.tob);
  const [day, setDay] = useState(d0.d);
  const [month, setMonth] = useState(d0.m);
  const [year, setYear] = useState(d0.y);
  const [hour, setHour] = useState(t0.h);
  const [minute, setMinute] = useState(t0.min);
  const [second, setSecond] = useState(initial.sec !== undefined && initial.sec !== "" ? Number(initial.sec) : -1);
  const [ampm, setAmpm] = useState(initial.tob ? (initial.ampm || "") : "");
  const [place, setPlace] = useState(initial.pob || "");
  const [geo, setGeo] = useState(initial.pobLat != null && initial.pobLon != null
    ? { lat: initial.pobLat, lon: initial.pobLon, source: initial.pobSource || "osm", tz: initial.pobTz || "" } : null);
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [netErr, setNetErr] = useState(false);
  const timer = useRef(null);
  const seq = useRef(0);
  const firstField = useRef(null);

  useEffect(() => { setErr(""); const el = firstField.current; if (el && step !== "lang" && step !== "gender") { try { el.focus({ preventScroll: true }); } catch (_) { /* ignore */ } } }, [step]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  // கைபேசியின் "பின்" பொத்தானுக்கு: App-இன் வரலாற்று நிர்வாகி நேரடியாக இந்தப் படிக்கு அமைக்கும் (setI).
  useEffect(() => { if (registerStep) { registerStep(setI); return () => registerStep(null); } return undefined; }, [registerStep]);

  const months = tList("months");
  const yearNum = /^\d{4}$/.test(year) ? Number(year) : 0;
  const maxDay = yearNum && month ? daysIn(yearNum, month) : 31;

  // ── ஒவ்வொரு படியின் சரிபார்ப்பு: பிழை வாசகத்தின் key, அல்லது "" ──
  const check = () => {
    if (step === "lang") return langPicked ? "" : "ob.lang.title";
    if (step === "name") return name.trim().length >= 2 ? "" : "ob.name.err";
    if (step === "phone") return normalizePhone(phone) ? "" : "ob.phone.err";
    if (step === "gender") return gender ? "" : "ob.gender.err";
    if (step === "dob") {
      const now = new Date();
      if (!day || !month || !yearNum || yearNum < 1900 || day > daysIn(yearNum, month)) return "ob.dob.err";
      if (new Date(yearNum, month - 1, day) > new Date(now.getFullYear(), now.getMonth(), now.getDate())) return "ob.dob.errFuture";
      return "";
    }
    if (step === "time") return hour >= 1 && hour <= 12 && minute >= 0 && minute <= 59 && (ampm === "AM" || ampm === "PM") ? "" : "ob.time.err";
    if (step === "place") return geo && place.trim() ? "" : "ob.place.err";
    return "";
  };

  const finish = () => {
    onDone({
      lang: langPicked || lang,
      name: name.trim(), phone: normalizePhone(phone), gender,
      dob: day && month && yearNum ? `${pad2(day)}.${pad2(month)}.${yearNum}` : "",
      tob: hour ? `${pad2(hour)}:${pad2(Math.max(0, minute))}` : "", sec: second >= 0 ? String(second) : "", ampm: ampm || "AM",
      pob: place.trim(), pobLat: geo ? geo.lat : null, pobLon: geo ? geo.lon : null, pobSource: geo ? geo.source : null, pobTz: geo ? geo.tz : "",
    });
  };
  const next = () => {
    const e = check();
    if (e) { setErr(e); return; }
    if (step === "lang") setLang(langPicked);
    if (i >= steps.length - 1) finish(); else { setI(i + 1); onAdvance && onAdvance(i + 1); }
  };
  // "பின்" (திரையிலோ கைபேசியிலோ) — ஒரு படி பின்னோக்கி. onBackStep உலாவி வரலாற்றையும் ஒத்திசைக்கும்.
  const back = () => { if (i > 0) { setI(i - 1); onBackStep && onBackStep(); } };
  const onKey = (e) => { if (e.key === "Enter") { e.preventDefault(); next(); } };

  // ── இடத் தேடல் (தட்டச்சு நின்ற அரை வினாடியில்) ──
  const onPlace = (val) => {
    setPlace(val); setGeo(null); setErr(""); setSearched(false); setNetErr(false);
    if (timer.current) clearTimeout(timer.current);
    if (val.trim().length < 3 || !searchPlaces) { setResults([]); setSearching(false); return; }
    if (typeof navigator !== "undefined" && navigator.onLine === false) { setResults([]); setSearching(false); setSearched(true); setNetErr(true); return; }
    setSearching(true);
    const my = ++seq.current;
    timer.current = setTimeout(async () => {
      let r = [], failed = false;
      try { r = (await searchPlaces(val)) || []; } catch (_) { failed = true; }
      if (my !== seq.current) return;      // பழைய தேடலின் பதில் — விடு
      if (!failed && r.length === 0 && typeof navigator !== "undefined" && navigator.onLine === false) failed = true;
      setResults(r); setSearching(false); setSearched(true); setNetErr(failed);
    }, 500);
  };
  const pick = (r) => {
    seq.current++;
    setPlace(r.shortLabel); setGeo({ lat: r.lat, lon: r.lon, source: "osm", tz: guessZone(r.countryCode, r.lat, r.lon) || "" });
    setResults([]); setSearched(false); setSearching(false); setErr("");
  };

  const last = i === steps.length - 1;
  const timeOk = hour >= 1 && hour <= 12 && minute >= 0 && (ampm === "AM" || ampm === "PM");
  const timeText = timeOk ? `${hour}:${pad2(minute)}${second >= 0 ? ":" + pad2(second) : ""}` : "";
  const dobOk = day && month && yearNum >= 1900 && day <= maxDay;

  return (
    <main className="ob-shell" data-onboarding data-step={step} lang={lang}>
      <header className="ob-top">
        <button type="button" className="ob-back" data-ob-back onClick={back} disabled={i === 0} aria-label={t("common.back")} style={{ visibility: i === 0 ? "hidden" : "visible" }}>
          <ChevronLeft size={22} strokeWidth={2.2} />
        </button>
        <img className="ob-logo" src="/logo/topper-astro.webp" alt="TOPPER ASTRO" width="780" height="254" />
        <span className="ob-back" aria-hidden="true" style={{ visibility: "hidden" }} />
      </header>

      {steps.length > 1 && (
        <div className="ob-progress" aria-label={t("ob.step", { n: i + 1, total: steps.length })}>
          <div className="ob-progress-bar"><span style={{ width: `${((i + 1) / steps.length) * 100}%` }} /></div>
          <small>{t("ob.step", { n: i + 1, total: steps.length })}</small>
        </div>
      )}

      <section className="ob-card">
        {step === "lang" && (<>
          {/* மொழி இன்னும் தெரியாததால் தலைப்பு மூன்று மொழிகளிலும் */}
          <h1 className="ob-title ob-title-tri"><span lang="ta">மொழியைத் தேர்ந்தெடுங்கள்</span><span lang="en">Choose your language</span><span lang="hi">अपनी भाषा चुनें</span></h1>
          <div className="ob-options">
            {LANGS.map((l) => (
              <button key={l.code} type="button" lang={l.code} data-ob-lang={l.code} aria-pressed={langPicked === l.code}
                className={`ob-option${langPicked === l.code ? " on" : ""}`} onClick={() => { setLangPicked(l.code); setLang(l.code); setErr(""); }}>
                <b>{l.label}</b>
                {langPicked === l.code ? <Check size={22} strokeWidth={2.6} /> : <span className="ob-radio" />}
              </button>
            ))}
          </div>
        </>)}

        {step === "name" && (<>
          <h1 className="ob-title">{t("ob.name.title")}</h1>
          <input ref={firstField} className="ob-input" data-ob-name value={name} maxLength={60} autoComplete="name" enterKeyHint="next"
            placeholder={t("ob.name.placeholder")} onChange={(e) => { setName(e.target.value); setErr(""); }} onKeyDown={onKey} />
        </>)}

        {step === "phone" && (<>
          <h1 className="ob-title">{t("ob.phone.title")}</h1>
          <p className="ob-hint">{t("ob.phone.hint")}</p>
          <input ref={firstField} className="ob-input ob-num" data-ob-phone value={phone} maxLength={17} inputMode="tel" type="tel" autoComplete="tel" enterKeyHint="next"
            placeholder={t("ob.phone.placeholder")} onChange={(e) => { setPhone(e.target.value.replace(/[^\d+ ]/g, "")); setErr(""); }} onKeyDown={onKey} />
        </>)}

        {step === "gender" && (<>
          <h1 className="ob-title">{t("ob.gender.title")}</h1>
          <div className="ob-options two">
            {[["ஆண்", "ob.gender.male"], ["பெண்", "ob.gender.female"]].map(([val, key]) => (
              <button key={val} type="button" data-ob-gender={val} aria-pressed={gender === val} className={`ob-option center${gender === val ? " on" : ""}`}
                onClick={() => { setGender(val); setErr(""); }}>
                <b>{t(key)}</b>
              </button>
            ))}
          </div>
        </>)}

        {step === "dob" && (<>
          <h1 className="ob-title">{t("ob.dob.title")}</h1>
          <p className="ob-hint">{t("ob.dob.hint")}</p>
          <div className="ob-row three">
            <label className="ob-field"><small>{t("ob.dob.day")}</small>
              <select ref={firstField} className="ob-input ob-num" data-ob-day value={day || ""} onChange={(e) => { setDay(Number(e.target.value)); setErr(""); }}>
                <option value="" />
                {Array.from({ length: 31 }, (_, k) => k + 1).map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <label className="ob-field grow"><small>{t("ob.dob.month")}</small>
              <select className="ob-input" data-ob-month value={month || ""} onChange={(e) => { setMonth(Number(e.target.value)); setErr(""); }}>
                <option value="" />
                {months.map((m, k) => <option key={k} value={k + 1}>{m}</option>)}
              </select>
            </label>
            <label className="ob-field"><small>{t("ob.dob.year")}</small>
              <input className="ob-input ob-num" data-ob-year value={year} maxLength={4} inputMode="numeric" enterKeyHint="next" placeholder={t("ob.dob.yearPlaceholder")}
                onChange={(e) => { setYear(e.target.value.replace(/\D/g, "").slice(0, 4)); setErr(""); }} onKeyDown={onKey} />
            </label>
          </div>
          {dobOk ? <p className="ob-confirm" data-ob-dob-show>{t("ob.dob.show", { date: lang === "en" ? `${day} ${months[month - 1]} ${yearNum}` : `${day} ${months[month - 1]} ${yearNum}` })}</p> : null}
        </>)}

        {step === "time" && (<>
          <h1 className="ob-title">{t("ob.time.title")}</h1>
          <p className="ob-hint">{t("ob.time.hint")}</p>
          <div className="ob-row three">
            <label className="ob-field"><small>{t("ob.time.hour")}</small>
              <select ref={firstField} className="ob-input ob-num" data-ob-hour value={hour || ""} onChange={(e) => { setHour(Number(e.target.value)); setErr(""); }}>
                <option value="" />
                {Array.from({ length: 12 }, (_, k) => k + 1).map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <label className="ob-field"><small>{t("ob.time.minute")}</small>
              <select className="ob-input ob-num" data-ob-minute value={minute >= 0 ? minute : ""} onChange={(e) => { setMinute(e.target.value === "" ? -1 : Number(e.target.value)); setErr(""); }}>
                <option value="" />
                {Array.from({ length: 60 }, (_, k) => k).map((n) => <option key={n} value={n}>{pad2(n)}</option>)}
              </select>
            </label>
            <label className="ob-field"><small>{t("ob.time.second")} ({t("common.optional")})</small>
              <select className="ob-input ob-num" data-ob-second value={second >= 0 ? second : ""} onChange={(e) => setSecond(e.target.value === "" ? -1 : Number(e.target.value))}>
                <option value="" />
                {Array.from({ length: 60 }, (_, k) => k).map((n) => <option key={n} value={n}>{pad2(n)}</option>)}
              </select>
            </label>
          </div>
          <div className="ob-options two">
            {[["AM", "ob.time.am", "ob.time.amSub"], ["PM", "ob.time.pm", "ob.time.pmSub"]].map(([val, key, sub]) => (
              <button key={val} type="button" data-ob-ampm={val} aria-pressed={ampm === val} className={`ob-option center col${ampm === val ? " on" : ""}`}
                onClick={() => { setAmpm(val); setErr(""); }}>
                <b>{t(key)}</b><small>{t(sub)}</small>
              </button>
            ))}
          </div>
          {timeOk ? <p className="ob-confirm" data-ob-time-show>{t("ob.time.show", { part: t(dayPart(hour, minute, ampm)), time: timeText })}</p> : null}
        </>)}

        {step === "place" && (<>
          <h1 className="ob-title">{t("ob.place.title")}</h1>
          <p className="ob-hint">{t("ob.place.hint")}</p>
          <input ref={firstField} className="ob-input" data-ob-place value={place} maxLength={80} autoComplete="off" enterKeyHint="search"
            placeholder={t("ob.place.placeholder")} onChange={(e) => onPlace(e.target.value)} />
          {searching ? <p className="ob-hint" data-ob-searching>{t("common.searching")}</p> : null}
          {results.length > 0 && (
            <div className="ob-results" data-ob-results>
              {results.map((r, k) => (
                <button key={k} type="button" className="ob-result" data-ob-result onClick={() => pick(r)}>
                  <MapPin size={18} strokeWidth={2} />
                  <span><b>{r.shortLabel}</b><small>{r.displayName}</small></span>
                </button>
              ))}
            </div>
          )}
          {netErr && !searching ? <p className="ob-hint warn" data-ob-offline>{t("ob.place.offline")}</p> : searched && !searching && results.length === 0 && !geo ? <p className="ob-hint warn" data-ob-noplace>{t("ob.place.none")}</p> : null}
          {geo ? <p className="ob-confirm" data-ob-place-show>{t("ob.place.picked", { place: place.trim() })}</p> : null}
        </>)}

        {err ? <p className="ob-error" role="alert" data-ob-error>{t(err)}</p> : null}
      </section>

      <footer className="ob-foot">
        <button type="button" className="ob-next" data-ob-next onClick={next}>
          {last && step !== "lang" ? t("common.enter") : t("common.next")}
          <ChevronRight size={20} strokeWidth={2.4} />
        </button>
      </footer>
    </main>
  );
}
