// @ts-nocheck
"use client";

// Authentic PS2 CRT + low-res + dithering overlay
export default function PS2Overlay({ enabled = true }: { enabled?: boolean }) {
  if (!enabled) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[200] overflow-hidden">
      {/* Low-res pixelation - render scale down then up via CSS is done in Canvas dpr, this is extra */}
      {/* Scanlines - strong PS2 480i interlaced */}
      <div className="absolute inset-0 opacity-[0.18] mix-blend-multiply" style={{
        backgroundImage: `repeating-linear-gradient(0deg, transparent 0px, transparent 2px, black 3px, transparent 3px)`,
      }} />

      {/* Dithering - 4x4 Bayer pattern like PS2 16-bit color */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 8 8' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='dither'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1' numOctaves='1' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23dither)' opacity='0.5'/%3E%3C/svg%3E")`,
          backgroundSize: '4px 4px',
        }}
      />

      {/* Chromatic aberration - RGB split at edges */}
      <div className="absolute inset-0 opacity-[0.04] mix-blend-screen" style={{
        background: `linear-gradient(90deg, rgba(255,0,0,0.3) 0%, transparent 2%, transparent 98%, rgba(0,255,255,0.3) 100%)`,
        filter: 'blur(0.5px)',
      }} />

      {/* Vignette - heavy PS2 CRT */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_50%,rgba(0,0,0,0.85)_100%)]" />

      {/* Letterbox 4:3 black bars - PS2 was 4:3 */}
      <div className="absolute top-0 left-0 right-0 h-[2.5%] bg-black/90" />
      <div className="absolute bottom-0 left-0 right-0 h-[2.5%] bg-black/90" />

      {/* Interlacing flicker - subtle */}
      <div className="absolute inset-0 opacity-[0.02] animate-[ps2-flicker_0.1s_steps(2)_infinite]" style={{
        backgroundImage: `repeating-linear-gradient(0deg, white 0px, white 1px, transparent 2px)`,
      }} />

      {/* PS2 HUD elements - 480i badge */}
      <div className="absolute top-2 right-2 hidden sm:flex items-center gap-1 px-2 py-1 rounded-[3px] bg-black/80 border border-[#333] text-[8px] font-mono text-[#888] tracking-widest">
        <span className="w-1.5 h-1.5 bg-[#00ff00] rounded-full animate-pulse" />
        480i • 60Hz • PS2
      </div>

      <style>{`
        @keyframes ps2-flicker {
          0% { transform: translateY(0px); }
          100% { transform: translateY(1px); }
        }
        /* PS2 affine texture wobble simulation - subtle vertex swim */
        @keyframes ps2-wobble {
          0% { transform: translateX(0px); }
          25% { transform: translateX(0.3px); }
          50% { transform: translateX(-0.3px); }
          75% { transform: translateX(0.2px); }
          100% { transform: translateX(0px); }
        }
      `}</style>
    </div>
  );
}
