// @ts-nocheck
"use client";

export default function Scanlines({ opacity = 0.15 }: { opacity?: number }) {
  return (
    <>
      <div
        className="pointer-events-none absolute inset-0 z-10 mix-blend-overlay"
        style={{
          opacity,
          background: `repeating-linear-gradient(0deg, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 2px, rgba(0,255,255,0.03) 3px, rgba(0,0,0,0) 4px)`,
        }}
      />
      <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-transparent via-transparent to-black/20" />
      {/* vignette */}
      <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(ellipse_at_center,transparent_60%,rgba(0,0,0,0.6)_100%)]" />
      {/* flicker */}
      <style>{`
        @keyframes arcade-flicker {
          0% { opacity: ${opacity}; }
          50% { opacity: ${opacity * 0.8}; }
          100% { opacity: ${opacity}; }
        }
      `}</style>
    </>
  );
}
