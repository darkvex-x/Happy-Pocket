export default function DigiMoiLogo({
  size = 120,
  showText = true,
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 128 128"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="wallet" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#6D28D9" />
            <stop offset="100%" stopColor="#EC4899" />
          </linearGradient>
        </defs>

        {/* Wedding Ring */}
        <circle
          cx="64"
          cy="16"
          r="8"
          stroke="#FBBF24"
          strokeWidth="3"
          fill="none"
        />

        {/* Diamond */}
        <polygon
          points="64,4 68,10 64,14 60,10"
          fill="#FBBF24"
        />

        {/* Wallet */}
        <rect
          x="20"
          y="32"
          width="88"
          height="60"
          rx="16"
          fill="url(#wallet)"
        />

        {/* Wallet Flap */}
        <rect
          x="20"
          y="32"
          width="88"
          height="20"
          rx="16"
          fill="#8B5CF6"
        />

        {/* QR */}
        <rect
          x="74"
          y="52"
          width="22"
          height="22"
          rx="3"
          fill="white"
        />

        <rect x="78" y="56" width="4" height="4" fill="#111827" />
        <rect x="88" y="56" width="4" height="4" fill="#111827" />
        <rect x="78" y="66" width="4" height="4" fill="#111827" />
        <rect x="88" y="66" width="4" height="4" fill="#111827" />

        {/* Rupee */}
        <text
          x="40"
          y="70"
          fontSize="26"
          fontWeight="700"
          fill="white"
        >
          ₹
        </text>
      </svg>

      {showText && (
        <h2
          style={{
            marginTop: 12,
            fontSize: 28,
            fontWeight: 900,
            letterSpacing: 2,
            fontFamily: "Fraunces, serif",
            color: "#1F2937",
          }}
        >
          DIGI MOI
        </h2>
      )}
    </div>
  );
}
