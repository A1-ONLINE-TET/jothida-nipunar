import { Compass, Sun, Grid2X2, Sparkles, UserRound } from "lucide-react";

import "./home.css";
import { useLang } from "../i18n/index.js";

// எல்லா முதன்மைப் பக்கங்களுக்கும் ஒரே வழிசெலுத்தல் பட்டை.
// key-கள் App.jsx-ன் handleNav()-உடன் நேரடியாக இணைகின்றன.
export const NAV_ITEMS = [
  { key: "home",     tkey: "nav.home",     icon: Compass },
  { key: "daily",    tkey: "nav.daily",    icon: Sun },
  { key: "chart",    tkey: "nav.chart",    icon: Grid2X2 },
  { key: "advisory", tkey: "nav.advisory", icon: Sparkles },
  { key: "account",  tkey: "nav.account",  icon: UserRound },
];

export default function BottomNav({ active = "", onNav = () => {}, fixed = true }) {
  const { t } = useLang();
  return (
    <nav className={`bottom-nav${fixed ? " bottom-nav-fixed" : ""}`} aria-label={t("nav.aria")}>
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const on = active === item.key;
        return (
          <button
            key={item.key}
            className={`nav-item ${on ? "active" : ""}`}
            onClick={() => onNav(item.key)}
            aria-current={on ? "page" : undefined}
          >
            <span className="nav-icon">
              <Icon size={22} strokeWidth={on ? 2.3 : 1.7} />
            </span>
            <span>{t(item.tkey)}</span>
          </button>
        );
      })}
    </nav>
  );
}
