/** The pen-sketch logo block that draws itself, for the homepage hero. Decoration only: the page reads the same without it. */
export default function SketchLogo({ className = "" }: { className?: string }) {
  // pathLength="1" on every stroke, so the draw-on animation (stroke-dashoffset 1 to 0) works at any size
  return (
    <svg className={`sketch ${className}`} viewBox="0 0 260 230" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <defs>
        <filter id="sketch-wobble" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="2" seed="7" />
          <feDisplacementMap in="SourceGraphic" scale="3.2" />
        </filter>
      </defs>
      <g filter="url(#sketch-wobble)">
        <rect className="s s1" pathLength={1} x="30" y="70" width="120" height="120" rx="26" />
        <path className="s s2" pathLength={1} d="M66 70V60A26 26 0 0 1 92 34H160A26 26 0 0 1 186 60V128A26 26 0 0 1 160 154H150" opacity=".8" />
        <path className="s s3" pathLength={1} d="M37.6 77.6L73.6 41.6M142.4 77.6L178.4 41.6M142.4 182.4L178.4 146.4" opacity=".8" />
        <path className="s s4" pathLength={1} d="M150 98l22-22M150 110l26-26M150 122l30-30M150 134l32-32M150 146l32-32M150 158l26-26M150 170l20-20" strokeWidth="1" opacity=".5" />
        <path className="s s5" pathLength={1} d="M78.8 106.6v46.8c0 3 3.2 4.7 5.6 3.2l34.6-22.4c2.2-1.5 2.2-4.9 0-6.4L84.4 103.4c-2.4-1.5-5.6.2-5.6 3.2z" />
        <path className="s s6" pathLength={1} d="M86 99.6c2.6-1.2 5.2-.6 7.3.7l31.7 20.4M86 99.6v46.8M78.8 106.6L86 99.6M78.8 153.4l7.2-7M125 127.6l7.2-7" opacity=".5" strokeWidth="1.1" />
        <path className="s s7" pathLength={1} d="M30 206H150M30 200V212M150 200V212" opacity=".5" strokeWidth="1.1" />
      </g>
    </svg>
  );
}
