const signs = [
  "♈", "♉", "♊", "♋", "♌", "♍",
  "♎", "♏", "♐", "♑", "♒", "♓",
];

export default function ZodiacWheel() {
  const center = 200;
  const symbolRadius = 139;

  return (
    <svg
      className="zodiac-wheel"
      viewBox="0 0 400 400"
      role="img"
      aria-label="Decorative zodiac wheel"
    >
      <defs>
        <radialGradient id="spaceGradient">
          <stop offset="0%" stopColor="#29496f" />
          <stop offset="100%" stopColor="#0b1c36" />
        </radialGradient>

        <linearGradient id="goldGradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff0b2" />
          <stop offset="45%" stopColor="#d99a32" />
          <stop offset="100%" stopColor="#ffda79" />
        </linearGradient>
      </defs>

      <circle cx={center} cy={center} r="184" fill="none" stroke="#d9a44b" strokeWidth="1" strokeDasharray="2 6" />
      <circle cx={center} cy={center} r="170" fill="url(#spaceGradient)" stroke="url(#goldGradient)" strokeWidth="5" />
      <circle cx={center} cy={center} r="151" fill="none" stroke="#e5b554" strokeWidth="2" />
      <circle cx={center} cy={center} r="112" fill="none" stroke="#dca844" strokeWidth="3" />
      <circle cx={center} cy={center} r="89" fill="none" stroke="#dca844" strokeWidth="1.5" />

      {signs.map((sign, index) => {
        const angle = (index * 30 - 90) * (Math.PI / 180);
        const x1 = center + Math.cos(angle) * 112;
        const y1 = center + Math.sin(angle) * 112;
        const x2 = center + Math.cos(angle) * 151;
        const y2 = center + Math.sin(angle) * 151;

        const symbolAngle = (index * 30 - 75) * (Math.PI / 180);
        const sx = center + Math.cos(symbolAngle) * symbolRadius;
        const sy = center + Math.sin(symbolAngle) * symbolRadius;

        return (
          <g key={sign}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#d9a44b" strokeWidth="1.4" />
            <text x={sx} y={sy} fill="#ffd16d" fontSize="27" textAnchor="middle" dominantBaseline="central">
              {sign}
            </text>
          </g>
        );
      })}

      <circle cx={center} cy={center} r="69" fill="url(#spaceGradient)" stroke="#e6b34f" strokeWidth="2" />

      <g transform={`translate(${center} ${center})`}>
        <path
          d="M0 -58 L10 -10 L58 0 L10 10 L0 58 L-10 10 L-58 0 L-10 -10 Z"
          fill="url(#goldGradient)"
          stroke="#fff0b2"
          strokeWidth="1"
        />
        <circle r="14" fill="#fff0b2" />
        <circle r="7" fill="#d99a32" />
      </g>

      {[0, 90, 180, 270].map((angle) => (
        <path
          key={angle}
          d="M0 -10 L4 0 L0 10 L-4 0 Z"
          transform={`translate(${center} ${center}) rotate(${angle}) translate(0 -96)`}
          fill="#fff0b2"
        />
      ))}

      <circle cx={center} cy={center} r="3" fill="#fff" />
    </svg>
  );
}
