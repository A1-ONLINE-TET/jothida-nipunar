// ═══════════════════════════════════════════════════════════════════
// ஜோதிட/பஞ்சாங்கக் கலைச்சொல் அகராதி — மூடிய தொகுப்புகள் (closed sets).
// மதிப்புகள் engine/almanac-இல் தமிழில் வருகின்றன; திரையில் தேர்ந்த மொழியில் காட்ட
// இங்கே தமிழ்ச் சொல் → { en, hi } வரைபடம். தமிழில் (ta) மூலச் சொல்லே.
//
// ⚠ ஒரே தமிழ்ச் சொல் இரு பொருள்: "செவ்வாய்" = செவ்வாய்க் கிரகம் + செவ்வாய்க்கிழமை.
//   எனவே தட்டையான ஒற்றை வரைபடம் அல்ல — வகை வாரியான வரைபடங்கள் (PLANET, WEEKDAY …);
//   அழைக்கும் இடத்தில் சரியான வகையைப் பயன்படுத்து (tNak, tRashi, tPlanet, tWeekday …).
// ═══════════════════════════════════════════════════════════════════

export const NAK = {
  "அசுவினி": { en: "Ashwini", hi: "अश्विनी" },
  "பரணி": { en: "Bharani", hi: "भरणी" },
  "கார்த்திகை": { en: "Krittika", hi: "कृत्तिका" },
  "ரோகிணி": { en: "Rohini", hi: "रोहिणी" },
  "மிருகசீரிடம்": { en: "Mrigashira", hi: "मृगशिरा" },
  "திருவாதிரை": { en: "Ardra", hi: "आर्द्रा" },
  "புனர்பூசம்": { en: "Punarvasu", hi: "पुनर्वसु" },
  "பூசம்": { en: "Pushya", hi: "पुष्य" },
  "ஆயில்யம்": { en: "Ashlesha", hi: "आश्लेषा" },
  "மகம்": { en: "Magha", hi: "मघा" },
  "பூரம்": { en: "Purva Phalguni", hi: "पूर्वाफाल्गुनी" },
  "உத்திரம்": { en: "Uttara Phalguni", hi: "उत्तराफाल्गुनी" },
  "அஸ்தம்": { en: "Hasta", hi: "हस्त" },
  "சித்திரை": { en: "Chitra", hi: "चित्रा" },
  "சுவாதி": { en: "Swati", hi: "स्वाति" },
  "விசாகம்": { en: "Vishakha", hi: "विशाखा" },
  "அனுஷம்": { en: "Anuradha", hi: "अनुराधा" },
  "கேட்டை": { en: "Jyeshtha", hi: "ज्येष्ठा" },
  "மூலம்": { en: "Mula", hi: "मूल" },
  "பூராடம்": { en: "Purva Ashadha", hi: "पूर्वाषाढा" },
  "உத்திராடம்": { en: "Uttara Ashadha", hi: "उत्तराषाढा" },
  "திருவோணம்": { en: "Shravana", hi: "श्रवण" },
  "அவிட்டம்": { en: "Dhanishta", hi: "धनिष्ठा" },
  "சதயம்": { en: "Shatabhisha", hi: "शतभिषा" },
  "பூரட்டாதி": { en: "Purva Bhadrapada", hi: "पूर्वाभाद्रपदा" },
  "உத்திரட்டாதி": { en: "Uttara Bhadrapada", hi: "उत्तराभाद्रपदा" },
  "ரேவதி": { en: "Revati", hi: "रेवती" },
};

export const RASHI = {
  "மேஷம்": { en: "Aries", hi: "मेष" },
  "ரிஷபம்": { en: "Taurus", hi: "वृषभ" },
  "மிதுனம்": { en: "Gemini", hi: "मिथुन" },
  "கடகம்": { en: "Cancer", hi: "कर्क" },
  "சிம்மம்": { en: "Leo", hi: "सिंह" },
  "கன்னி": { en: "Virgo", hi: "कन्या" },
  "துலாம்": { en: "Libra", hi: "तुला" },
  "விருச்சிகம்": { en: "Scorpio", hi: "वृश्चिक" },
  "தனுசு": { en: "Sagittarius", hi: "धनु" },
  "மகரம்": { en: "Capricorn", hi: "मकर" },
  "கும்பம்": { en: "Aquarius", hi: "कुम्भ" },
  "மீனம்": { en: "Pisces", hi: "मीन" },
};

export const PLANET = {
  "சூரியன்": { en: "Sun", hi: "सूर्य" },
  "சந்திரன்": { en: "Moon", hi: "चंद्र" },
  "செவ்வாய்": { en: "Mars", hi: "मंगल" },
  "புதன்": { en: "Mercury", hi: "बुध" },
  "குரு": { en: "Jupiter", hi: "गुरु" },
  "சுக்கிரன்": { en: "Venus", hi: "शुक्र" },
  "சனி": { en: "Saturn", hi: "शनि" },
  "ராகு": { en: "Rahu", hi: "राहु" },
  "கேது": { en: "Ketu", hi: "केतु" },
};

export const TITHI = {
  "பிரதமை": { en: "Prathama", hi: "प्रतिपदा" },
  "த்விதியை": { en: "Dwitiya", hi: "द्वितीया" },
  "திருதியை": { en: "Tritiya", hi: "तृतीया" },
  "சதுர்த்தி": { en: "Chaturthi", hi: "चतुर्थी" },
  "பஞ்சமி": { en: "Panchami", hi: "पंचमी" },
  "ஷஷ்டி": { en: "Shashti", hi: "षष्ठी" },
  "சப்தமி": { en: "Saptami", hi: "सप्तमी" },
  "அஷ்டமி": { en: "Ashtami", hi: "अष्टमी" },
  "நவமி": { en: "Navami", hi: "नवमी" },
  "தசமி": { en: "Dashami", hi: "दशमी" },
  "ஏகாதசி": { en: "Ekadashi", hi: "एकादशी" },
  "த்வாதசி": { en: "Dwadashi", hi: "द्वादशी" },
  "திரயோதசி": { en: "Trayodashi", hi: "त्रयोदशी" },
  "சதுர்தசி": { en: "Chaturdashi", hi: "चतुर्दशी" },
  "பௌர்ணமி": { en: "Full Moon", hi: "पूर्णिमा" },
  "அமாவாசை": { en: "New Moon", hi: "अमावस्या" },
};

export const YOGAM = {
  "விஷ்கம்பம்": { en: "Vishkambha", hi: "विष्कम्भ" },
  "பிரீதி": { en: "Priti", hi: "प्रीति" },
  "ஆயுஷ்மான்": { en: "Ayushman", hi: "आयुष्मान्" },
  "சௌபாக்யம்": { en: "Saubhagya", hi: "सौभाग्य" },
  "சோபனம்": { en: "Shobhana", hi: "शोभन" },
  "அதிகண்டம்": { en: "Atiganda", hi: "अतिगण्ड" },
  "சுகர்மம்": { en: "Sukarma", hi: "सुकर्मा" },
  "திருதி": { en: "Dhriti", hi: "धृति" },
  "சூலம்": { en: "Shula", hi: "शूल" },
  "கண்டம்": { en: "Ganda", hi: "गण्ड" },
  "விருத்தி": { en: "Vriddhi", hi: "वृद्धि" },
  "துருவம்": { en: "Dhruva", hi: "ध्रुव" },
  "வ்யாகாதம்": { en: "Vyaghata", hi: "व्याघात" },
  "ஹர்ஷணம்": { en: "Harshana", hi: "हर्षण" },
  "வஜ்ரம்": { en: "Vajra", hi: "वज्र" },
  "சித்தி": { en: "Siddhi", hi: "सिद्धि" },
  "வ்யதீபாதம்": { en: "Vyatipata", hi: "व्यतीपात" },
  "வரீயான்": { en: "Variyan", hi: "वरीयान्" },
  "பரிகம்": { en: "Parigha", hi: "परिघ" },
  "சிவம்": { en: "Shiva", hi: "शिव" },
  "சித்தம்": { en: "Siddha", hi: "सिद्ध" },
  "சாத்தியம்": { en: "Sadhya", hi: "साध्य" },
  "சுபம்": { en: "Shubha", hi: "शुभ" },
  "சுப்ரம்": { en: "Shukla", hi: "शुक्ल" },
  "பிராம்யம்": { en: "Brahma", hi: "ब्रह्म" },
  "ஐந்திரம்": { en: "Indra", hi: "ऐन्द्र" },
  "வைத்ருதி": { en: "Vaidhriti", hi: "वैधृति" },
};

export const KARANAM = {
  "பவம்": { en: "Bava", hi: "बव" },
  "பாலவம்": { en: "Balava", hi: "बालव" },
  "கௌலவம்": { en: "Kaulava", hi: "कौलव" },
  "தைதுலம்": { en: "Taitila", hi: "तैतिल" },
  "கரம்": { en: "Gara", hi: "गर" },
  "வணிசை": { en: "Vanija", hi: "वणिज" },
  "விஷ்டி": { en: "Vishti", hi: "विष्टि" },
  "சகுனி": { en: "Shakuni", hi: "शकुनि" },
  "சதுஷ்பாதம்": { en: "Chatushpada", hi: "चतुष्पाद" },
  "நாகம்": { en: "Naga", hi: "नाग" },
  "கிம்ஸ்துக்னம்": { en: "Kimstughna", hi: "किंस्तुघ्न" },
};

// கௌரி பஞ்சாங்கப் பாகம் (நல்ல நேரம்/தவிர்க்க) — GOWRI_NAMES (tools-data.js) உடன் ஒத்தது
export const GOWRI = {
  "உத்தி": { en: "Uthi", hi: "उथि" },
  "அமிர்தம்": { en: "Amirtha", hi: "अमृत" },
  "ரோகம்": { en: "Rogam", hi: "रोग" },
  "லாபம்": { en: "Labham", hi: "लाभ" },
  "தனம்": { en: "Dhanam", hi: "धन" },
  "சுகம்": { en: "Sugam", hi: "सुख" },
  "சோரம்": { en: "Soram", hi: "चोर" },
  "விஷம்": { en: "Visham", hi: "विष" },
};

// வாரநாள் (today.weekday = சுருக்கப் பெயர்)
export const WEEKDAY = {
  "ஞாயிறு": { en: "Sunday", hi: "रविवार" },
  "திங்கள்": { en: "Monday", hi: "सोमवार" },
  "செவ்வாய்": { en: "Tuesday", hi: "मंगलवार" },
  "புதன்": { en: "Wednesday", hi: "बुधवार" },
  "வியாழன்": { en: "Thursday", hi: "गुरुवार" },
  "வெள்ளி": { en: "Friday", hi: "शुक्रवार" },
  "சனி": { en: "Saturday", hi: "शनिवार" },
};

// திசை (சூலம் / வார சூலம் / அதிர்ஷ்ட திசை — மூலை உட்பட)
export const DIR = {
  "கிழக்கு": { en: "East", hi: "पूर्व" },
  "மேற்கு": { en: "West", hi: "पश्चिम" },
  "வடக்கு": { en: "North", hi: "उत्तर" },
  "தெற்கு": { en: "South", hi: "दक्षिण" },
  "தென்கிழக்கு": { en: "South-East", hi: "आग्नेय" },
  "வடமேற்கு": { en: "North-West", hi: "वायव्य" },
  "வடகிழக்கு": { en: "North-East", hi: "ईशान" },
  "தென்மேற்கு": { en: "South-West", hi: "नैऋत्य" },
};

// ரத்தினம் (ராசி ரத்தினம் + உப ரத்தினம்) — RASHI_LUCKY உடன் ஒத்தது
export const GEM = {
  "பவளம்": { en: "Coral", hi: "मूंगा" },
  "வைரம்": { en: "Diamond", hi: "हीरा" },
  "மரகதம்": { en: "Emerald", hi: "पन्ना" },
  "முத்து": { en: "Pearl", hi: "मोती" },
  "மாணிக்யம்": { en: "Ruby", hi: "माणिक" },
  "புஷ்பராகம்": { en: "Yellow Sapphire", hi: "पुखराज" },
  "நீலம்": { en: "Blue Sapphire", hi: "नीलम" },
  "கார்னீலியன்": { en: "Carnelian", hi: "कार्नेलियन" },
  "ஜிர்கான்": { en: "Zircon", hi: "जिरकॉन" },
  "பச்சை ஓனிக்ஸ்": { en: "Green Onyx", hi: "हरा ओनिक्स" },
  "முண்ஸ்டோன்": { en: "Moonstone", hi: "मूनस्टोन" },
  "கார்னெட்": { en: "Garnet", hi: "गार्नेट" },
  "சிட்ரின்": { en: "Citrine", hi: "सिट्रीन" },
  "அமிதிஸ்ட்": { en: "Amethyst", hi: "एमेथिस्ट" },
};

// நிறம் (அதிர்ஷ்ட நிறம்)
export const COLOR = {
  "சிவப்பு": { en: "Red", hi: "लाल" },
  "வெள்ளை": { en: "White", hi: "सफेद" },
  "பச்சை": { en: "Green", hi: "हरा" },
  "மஞ்சள்": { en: "Yellow", hi: "पीला" },
  "மஞ்சள் சிவப்பு": { en: "Orange-red", hi: "नारंगी-लाल" },
  "கருப்பு நீலம்": { en: "Dark blue", hi: "गहरा नीला" },
};

// தமிழ் மாதம் (சூரிய மாதம்) — panchang-lite.js TAMIL_MONTHS உடன் ஒத்தது
export const TMONTH = {
  "சித்திரை": { en: "Chithirai", hi: "चित्तिरै" },
  "வைகாசி": { en: "Vaikasi", hi: "वैकासि" },
  "ஆனி": { en: "Aani", hi: "आनि" },
  "ஆடி": { en: "Aadi", hi: "आडि" },
  "ஆவணி": { en: "Aavani", hi: "आवणि" },
  "புரட்டாசி": { en: "Purattasi", hi: "पुरट्टासि" },
  "ஐப்பசி": { en: "Aippasi", hi: "ऐप्पसि" },
  "கார்த்திகை": { en: "Karthikai", hi: "कार्त्तिकै" },
  "மார்கழி": { en: "Margazhi", hi: "मार्गऴि" },
  "தை": { en: "Thai", hi: "तै" },
  "மாசி": { en: "Masi", hi: "मासि" },
  "பங்குனி": { en: "Panguni", hi: "पंगुनि" },
};

// தமிழ்ப் பண்டிகைகள் — worker/src/festivals.js name-களுடன் ஒத்தது (API உருவாக்குவது; display-இல் மொழிபெயர்)
export const FEST = {
  "அட்சய திருதியை": { en: "Akshaya Tritiya", hi: "अक्षय तृतीया" },
  "ஆடி அமாவாசை": { en: "Aadi Amavasai", hi: "आडि अमावस्या" },
  "ஆடிப்பூரம்": { en: "Aadi Pooram", hi: "आडि पूरम" },
  "ஆடிப்பெருக்கு": { en: "Aadi Perukku", hi: "आडि पेरुक्कु" },
  "ஆருத்ரா தரிசனம்": { en: "Arudra Darshan", hi: "आर्द्रा दर्शन" },
  "கந்த சஷ்டி (சூரசம்ஹாரம்)": { en: "Kanda Sashti (Surasamharam)", hi: "कंद षष्ठी (सूरसंहारम)" },
  "கார்த்திகை தீபம்": { en: "Karthigai Deepam", hi: "कार्त्तिकै दीपम" },
  "கோகுலாஷ்டமி": { en: "Gokulashtami", hi: "गोकुलाष्टमी" },
  "சரஸ்வதி பூஜை · ஆயுத பூஜை": { en: "Saraswati Pooja · Ayudha Pooja", hi: "सरस्वती पूजा · आयुध पूजा" },
  "சித்ரா பௌர்ணமி": { en: "Chithra Pournami", hi: "चित्रा पूर्णिमा" },
  "தமிழ்ப் புத்தாண்டு": { en: "Tamil New Year", hi: "तमिल नववर्ष" },
  "தீபாவளி": { en: "Deepavali", hi: "दीपावली" },
  "தை அமாவாசை": { en: "Thai Amavasai", hi: "तै अमावस्या" },
  "தைப்பூசம்": { en: "Thaipusam", hi: "तैपूसम" },
  "தைப்பொங்கல்": { en: "Thai Pongal", hi: "तै पोंगल" },
  "நவராத்திரி தொடக்கம்": { en: "Navaratri begins", hi: "नवरात्रि आरंभ" },
  "பங்குனி உத்திரம்": { en: "Panguni Uthiram", hi: "पंगुनि उत्तिरम" },
  "போகி": { en: "Bhogi", hi: "भोगी" },
  "மகா சிவராத்திரி": { en: "Maha Shivaratri", hi: "महा शिवरात्रि" },
  "மகாளய அமாவாசை": { en: "Mahalaya Amavasai", hi: "महालय अमावस्या" },
  "மாசி மகம்": { en: "Masi Magam", hi: "मासि मगम" },
  "மாட்டுப் பொங்கல்": { en: "Mattu Pongal", hi: "माट्टु पोंगल" },
  "ரத சப்தமி": { en: "Ratha Saptami", hi: "रथ सप्तमी" },
  "விஜயதசமி": { en: "Vijayadashami", hi: "विजयदशमी" },
  "விநாயகர் சதுர்த்தி": { en: "Vinayaka Chaturthi", hi: "विनायक चतुर्थी" },
  "வைகாசி விசாகம்": { en: "Vaikasi Visakam", hi: "वैकासि विसाकम" },
  "வைகுண்ட ஏகாதசி": { en: "Vaikunta Ekadashi", hi: "वैकुंठ एकादशी" },
};

// விரத வகைகள் — worker/src/vratham.js + நாட்காட்டி fallback
export const VRAT = {
  "அமாவாசை": { en: "Amavasya", hi: "अमावस्या" },
  "ஏகாதசி": { en: "Ekadashi", hi: "एकादशी" },
  "சங்கடஹர சதுர்த்தி": { en: "Sankatahara Chaturthi", hi: "संकटहर चतुर्थी" },
  "சதுர்த்தி": { en: "Chaturthi", hi: "चतुर्थी" },
  "சஷ்டி": { en: "Shashti", hi: "षष्ठी" },
  "பிரதோஷம்": { en: "Pradosham", hi: "प्रदोष" },
  "பௌர்ணமி": { en: "Pournami", hi: "पूर्णिमा" },
  "மாத சிவராத்திரி": { en: "Masa Shivaratri", hi: "मास शिवरात्रि" },
  "கிருத்திகை": { en: "Krithigai", hi: "कृत्तिकै" },
};

// பக்ஷம் (வளர்பிறை / தேய்பிறை)
export const PHASE = {
  "வளர்பிறை": { en: "Waxing", hi: "शुक्ल पक्ष" },
  "தேய்பிறை": { en: "Waning", hi: "कृष्ण पक्ष" },
};

// ── வகை வாரியான பெறுநர்கள் — அழைக்கும் இடத்தில் சரியான வகையைப் பயன்படுத்து ──
const pick = (map, term, lang) => {
  if (lang === "ta" || !term) return term;
  const e = map[term];
  return e && e[lang] ? e[lang] : term;
};
export const tNak = (term, lang) => pick(NAK, term, lang);
export const tRashi = (term, lang) => pick(RASHI, term, lang);
export const tPlanet = (term, lang) => pick(PLANET, term, lang);
export const tTithi = (term, lang) => pick(TITHI, term, lang);
export const tYogam = (term, lang) => pick(YOGAM, term, lang);
export const tKaranam = (term, lang) => pick(KARANAM, term, lang);
export const tGowri = (term, lang) => pick(GOWRI, term, lang);
export const tWeekday = (term, lang) => pick(WEEKDAY, term, lang);
export const tDir = (term, lang) => pick(DIR, term, lang);
export const tPhase = (term, lang) => pick(PHASE, term, lang);
export const tMonth = (term, lang) => pick(TMONTH, term, lang);
export const tGem = (term, lang) => pick(GEM, term, lang);
export const tColor = (term, lang) => pick(COLOR, term, lang);
// பண்டிகை/விரதப் பெயர் — இரண்டிலும் தேடு (API எதை அனுப்பினாலும்)
export const tFestival = (term, lang) => {
  if (lang === "ta" || !term) return term;
  const e = FEST[term] || VRAT[term] || TITHI[term];
  return e && e[lang] ? e[lang] : term;
};

// சோதனைக்கு — எல்லா வகைகளும்
export const ALL_TERM_MAPS = { NAK, RASHI, PLANET, TITHI, YOGAM, KARANAM, GOWRI, WEEKDAY, DIR, PHASE, TMONTH, GEM, COLOR, FEST, VRAT };
