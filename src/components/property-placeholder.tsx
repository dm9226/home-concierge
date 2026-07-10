export function PropertyPlaceholder() {
  return (
    <div className="h-full w-full relative overflow-hidden" style={{ background: "linear-gradient(135deg, #1A2320 0%, #1C3252 40%, #1A2320 100%)" }}>
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{ backgroundImage: "radial-gradient(circle, #0E7C67 1px, transparent 1px)", backgroundSize: "28px 28px" }}
      />
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{ backgroundImage: "repeating-linear-gradient(45deg, #0E7C67 0, #0E7C67 1px, transparent 0, transparent 50%)", backgroundSize: "20px 20px" }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <svg width="180" height="140" viewBox="0 0 180 140" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-[0.12]">
          <rect x="25" y="68" width="130" height="72" fill="#0E7C67" />
          <polygon points="10,68 90,8 170,68" fill="#0E7C67" />
          <rect x="72" y="102" width="36" height="38" rx="2" fill="#1A2320" />
          <circle cx="100" cy="122" r="3" fill="#0E7C67" />
          <rect x="36" y="82" width="28" height="24" rx="2" fill="#1A2320" />
          <line x1="50" y1="82" x2="50" y2="106" stroke="#0E7C67" strokeWidth="1.5" />
          <line x1="36" y1="94" x2="64" y2="94" stroke="#0E7C67" strokeWidth="1.5" />
          <rect x="116" y="82" width="28" height="24" rx="2" fill="#1A2320" />
          <line x1="130" y1="82" x2="130" y2="106" stroke="#0E7C67" strokeWidth="1.5" />
          <line x1="116" y1="94" x2="144" y2="94" stroke="#0E7C67" strokeWidth="1.5" />
          <rect x="118" y="18" width="16" height="32" fill="#0E7C67" />
          <line x1="0" y1="140" x2="180" y2="140" stroke="#0E7C67" strokeWidth="1" opacity="0.3" />
          <ellipse cx="42" cy="140" rx="20" ry="10" fill="#0E7C67" opacity="0.5" />
          <ellipse cx="138" cy="140" rx="20" ry="10" fill="#0E7C67" opacity="0.5" />
        </svg>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#0E7C67]/60 to-transparent" />
    </div>
  )
}
