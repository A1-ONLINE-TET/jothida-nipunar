import { Compass, Sun, Grid2X2, Sparkles, UserRound } from "lucide-react";

import "./home.css";

// எல்லா முதன்மைப் பக்கங்களுக்கும் ஒரே வழிசெலுத்தல் பட்டை.
// key-கள் App.jsx-ன் handleNav()-உடன் நேரடியாக இணைகின்றன.
export const NAV_ITEMS = [
  { key: "home",     label: "முகப்பு",   icon: Compass },
  { key: "daily",    label: "தினப்பலன்", icon: Sun },
  { key: "chart",    label: "ஜாதகம்",   icon: Grid2X2 },
  { key: "advisory", label: "ஆலோசனை",  icon: Sparkles },
  { key: "account",  label: "கணக்கு",   icon: UserRound },
];

export default function BottomNav({ active = "", onNav = () => {}, fixed = true }) {
  return (
    <nav className={`bottom-nav${fixed ? " bottom-nav-fixed" : ""}`} aria-label="முதன்மை வழிசெலுத்தல்">
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
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
