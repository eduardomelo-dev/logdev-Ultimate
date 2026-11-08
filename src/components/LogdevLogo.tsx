import React from 'react';

interface LogoProps {
  size?: number;
  className?: string;
  title?: string;
}

const LogdevLogo: React.FC<LogoProps> = ({ size = 36, className = '', title }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={title ?? 'logdev logo'}
    >
      <defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0b0f19" />
          <stop offset="50%" stopColor="#0f172a" />
          <stop offset="100%" stopColor="#020617" />
        </linearGradient>
        <linearGradient id="neonCyan" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00f2fe" />
          <stop offset="100%" stopColor="#4facfe" />
        </linearGradient>
        <linearGradient id="neonGreen" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
        <linearGradient id="accentOrange" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#ef4444" />
        </linearGradient>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <filter id="softShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="8" stdDeviation="16" floodColor="#00f2fe" floodOpacity="0.25" />
        </filter>
      </defs>

      <rect
        x="24"
        y="24"
        width="464"
        height="464"
        rx="104"
        fill="url(#bgGrad)"
        stroke="#1e293b"
        strokeWidth="4"
        filter="url(#softShadow)"
      />

      {/* Subtle circuit grid background lines */}
      <g opacity="0.15" stroke="#38bdf8" strokeWidth="2">
        <line x1="90" y1="90" x2="422" y2="90" />
        <line x1="90" y1="174" x2="422" y2="174" />
        <line x1="90" y1="256" x2="422" y2="256" />
        <line x1="90" y1="338" x2="422" y2="338" />
        <line x1="90" y1="422" x2="422" y2="422" />
        <line x1="90" y1="90" x2="90" y2="422" />
        <line x1="174" y1="90" x2="174" y2="422" />
        <line x1="256" y1="90" x2="256" y2="422" />
        <line x1="338" y1="90" x2="338" y2="422" />
        <line x1="422" y1="90" x2="422" y2="422" />
      </g>

      {/* Outer neon circuit ring / traces */}
      <path
        d="M 120 180 L 120 332 L 200 412 L 312 412 L 392 332 L 392 180 L 312 100 L 200 100 Z"
        fill="none"
        stroke="#1e293b"
        strokeWidth="12"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Glowing PCB traces */}
      <path
        d="M 80 210 L 150 210 L 190 250"
        fill="none"
        stroke="url(#neonCyan)"
        strokeWidth="7"
        strokeLinecap="round"
        filter="url(#glow)"
      />
      <circle cx="80" cy="210" r="7" fill="#00f2fe" filter="url(#glow)" />

      <path
        d="M 80 302 L 150 302 L 190 262"
        fill="none"
        stroke="url(#neonGreen)"
        strokeWidth="7"
        strokeLinecap="round"
        filter="url(#glow)"
      />
      <circle cx="80" cy="302" r="7" fill="#10b981" filter="url(#glow)" />

      {/* Central Digital Gate Symbol: Stylized High-Tech AND / XOR Core */}
      <path
        d="M 170 160 L 250 160 C 316 160 350 200 350 256 C 350 312 316 352 250 352 L 170 352 Z"
        fill="#0f172a"
        stroke="url(#neonCyan)"
        strokeWidth="14"
        strokeLinejoin="round"
        filter="url(#glow)"
      />

      {/* Inner Logic Gate Accent (XOR Arc) */}
      <path
        d="M 152 166 Q 186 256 152 346"
        fill="none"
        stroke="url(#neonGreen)"
        strokeWidth="10"
        strokeLinecap="round"
        filter="url(#glow)"
      />

      {/* Output Line & Pin */}
      <path
        d="M 350 256 L 432 256"
        fill="none"
        stroke="url(#neonCyan)"
        strokeWidth="8"
        strokeLinecap="round"
        filter="url(#glow)"
      />
      <circle cx="432" cy="256" r="9" fill="#00f2fe" filter="url(#glow)" />

      {/* Glowing Core Pulse Center (\"LD\" monogram / quantum node) */}
      <circle cx="246" cy="256" r="32" fill="url(#bgGrad)" stroke="url(#neonGreen)" strokeWidth="6" />
      <circle cx="246" cy="256" r="14" fill="#00f2fe" filter="url(#glow)" />

      {/* Digital Nodes / Vias */}
      <circle cx="200" cy="100" r="8" fill="#4facfe" />
      <circle cx="312" cy="100" r="8" fill="#10b981" />
      <circle cx="200" cy="412" r="8" fill="#10b981" />
      <circle cx="312" cy="412" r="8" fill="#4facfe" />

      {/* Small \"ULTIMATE\" Banner / Jewel at bottom */}
      <rect x="186" y="440" width="140" height="24" rx="12" fill="#030712" stroke="#334155" strokeWidth="2" />
      <text
        x="256"
        y="456"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="11"
        fontWeight="900"
        fill="#38bdf8"
        textAnchor="middle"
        letterSpacing="3"
      >LOGDEV</text>
    </svg>
  );
};

export { LogdevLogo };