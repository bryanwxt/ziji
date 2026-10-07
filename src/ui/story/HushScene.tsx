// Professor Hush pushing his Hush-o-Matic (bible §2): one SVG so his hand stays on the handle. Painted like Truffle — soft gradients,
// a darker line of the same hue, never black ink. Parts carry data-part so a timeline can move them (wheels, coat tail, shush arm,
// the belly's swirl, the funnel's mouth). Faces left: he pushes the machine into the scene.
import { useId } from 'preact/hooks';

const LINE = '#4a3b5c';

export function HushScene({ belly = [] as string[] }: { belly?: string[] }) {
  const id = `hs${useId().replace(/[^a-z0-9]/gi, '')}`;
  const u = (n: string) => `url(#${id}-${n})`;
  return (
    <svg class="hush-scene" viewBox="0 0 500 420" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-coat`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9a6ac4" /><stop offset="0.55" stop-color="#7a4aa6" /><stop offset="1" stop-color="#5b3482" /></linearGradient>
        <linearGradient id={`${id}-brass`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6d58a" /><stop offset="0.45" stop-color="#d9a441" /><stop offset="1" stop-color="#a8752a" /></linearGradient>
        <linearGradient id={`${id}-horn`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#f3cf7e" /><stop offset="1" stop-color="#b98232" /></linearGradient>
        <radialGradient id={`${id}-glass`} cx="0.38" cy="0.32" r="0.75"><stop offset="0" stop-color="#ffffff" stop-opacity="0.85" /><stop offset="0.35" stop-color="#d9eef5" stop-opacity="0.55" /><stop offset="1" stop-color="#8fbfd1" stop-opacity="0.55" /></radialGradient>
        <radialGradient id={`${id}-skin`} cx="0.4" cy="0.35" r="0.8"><stop offset="0" stop-color="#fbe6d4" /><stop offset="1" stop-color="#e8bea0" /></radialGradient>
        <radialGradient id={`${id}-hair`} cx="0.4" cy="0.3" r="0.8"><stop offset="0" stop-color="#ffffff" /><stop offset="1" stop-color="#d9dbe6" /></radialGradient>
        <clipPath id={`${id}-bowl`}><circle cx="130" cy="290" r="52" /></clipPath>
      </defs>
      <ellipse cx="250" cy="410" rx="230" ry="9" fill="#3a2f45" opacity="0.18" />

      {/* the Hush-o-Matic */}
      <g data-part="machine">
        <g data-part="funnel">
          <path d="M70 262 C58 232 42 206 18 186 L58 150 C70 182 92 212 112 238 Z" fill={u('horn')} stroke="#8a5f22" stroke-width="2.5" stroke-linejoin="round" />
          <ellipse data-part="mouth" cx="38" cy="168" rx="16" ry="30" transform="rotate(-48 38 168)" fill="#3b2a18" stroke="#8a5f22" stroke-width="3" />
          <ellipse cx="38" cy="168" rx="9" ry="20" transform="rotate(-48 38 168)" fill="#120c06" opacity="0.7" />
        </g>
        <rect x="44" y="282" width="180" height="96" rx="30" fill={u('brass')} stroke="#8a5f22" stroke-width="2.5" />
        <path d="M60 300 H208" stroke="#fff3c9" stroke-width="5" stroke-linecap="round" opacity="0.6" />
        <circle cx="130" cy="290" r="56" fill="#c99539" stroke="#8a5f22" stroke-width="2.5" />
        <circle cx="130" cy="290" r="52" fill={u('glass')} />
        <g clip-path={u('bowl')}>
          <g data-part="belly" style={{ transformOrigin: '130px 290px' }}>
            {belly.map((w, i) => {
              const a = (i / Math.max(belly.length, 1)) * Math.PI * 2;
              return <text key={w} data-belly={w} x={130 + Math.cos(a) * 28} y={298 + Math.sin(a) * 24} text-anchor="middle" font-size="20" font-family="WenKai, 'Kaiti SC', serif" fill="#3d3326" opacity="0">{w}</text>;
            })}
          </g>
        </g>
        <path d="M96 252 C108 244 120 242 128 244" stroke="#ffffff" stroke-width="6" stroke-linecap="round" opacity="0.7" fill="none" />
        <path d="M222 320 L262 262" stroke="#6b4a1e" stroke-width="9" stroke-linecap="round" />
        {[[78, 384], [192, 384]].map(([cx, cy]) => (
          <g key={cx} data-part="wheel" style={{ transformOrigin: `${cx}px ${cy}px` }}>
            <circle cx={cx} cy={cy} r="24" fill="#5c4630" stroke="#3a2b1c" stroke-width="3" />
            <circle cx={cx} cy={cy} r="16" fill="#d9a441" />
            {[0, 60, 120].map((r) => <path key={r} d={`M${cx - 16} ${cy} H${cx + 16}`} stroke="#8a5f22" stroke-width="3" transform={`rotate(${r} ${cx} ${cy})`} />)}
            <circle cx={cx} cy={cy} r="4" fill="#8a5f22" />
          </g>
        ))}
      </g>

      {/* Professor Hush */}
      <g data-part="hush" transform="translate(250 6)">
        <g data-part="body">
          {/* legs and shoes */}
          <path d="M92 330 L84 384 M126 330 L130 384" stroke="#3b2c4e" stroke-width="13" stroke-linecap="round" />
          <path d="M60 392 C64 380 80 378 92 384 L92 394 Z" fill="#2f2438" />
          <path d="M106 392 C112 380 128 378 138 384 L138 394 Z" fill="#2f2438" />
          {/* the coat, too long for him */}
          <g data-part="coat-tail" style={{ transformOrigin: '150px 150px' }}>
            <path d="M150 150 C176 230 196 300 206 352 C186 356 166 352 148 344 Z" fill="#5b3482" stroke={LINE} stroke-width="2.5" stroke-linejoin="round" />
          </g>
          <path d="M80 128 C60 200 52 290 46 350 C90 360 140 360 170 350 C164 280 158 200 146 128 C124 118 100 118 80 128 Z" fill={u('coat')} stroke={LINE} stroke-width="2.5" stroke-linejoin="round" />
          <path d="M112 132 L104 300" stroke={LINE} stroke-width="2" opacity="0.5" />
          <path d="M92 128 L112 176 L104 132 Z M132 126 L114 176 L126 130 Z" fill="#4a2a6c" stroke={LINE} stroke-width="1.5" stroke-linejoin="round" />
          {[236, 262, 288].map((y) => <circle key={y} cx="107" cy={y} r="4" fill="#f2c44f" stroke="#a8752a" stroke-width="1" />)}
          {/* the gold S */}
          <text x="124" y="214" text-anchor="middle" font-size="38" font-weight="900" font-family="Georgia, serif" fill="#f2c44f" stroke="#a8752a" stroke-width="1.2">S</text>
          {/* pushing arm to the handle */}
          <path d="M92 148 C70 176 40 210 14 252" stroke="#6a3f94" stroke-width="20" stroke-linecap="round" fill="none" />
          <circle cx="12" cy="256" r="11" fill="#f1f0f6" stroke={LINE} stroke-width="2" />
        </g>
        {/* the head: a mad inventor — wild spiky white hair, a long nose, a monocle, a curly moustache */}
        <g data-part="head" style={{ transformOrigin: '110px 110px' }}>
          <path d="M100 104 L104 130 L124 130 L124 104 Z" fill={u('skin')} />
          <path d="M150 64 L182 44 L160 76 L190 82 L156 90 L176 112 L146 98 L148 120 L130 96 Z M140 30 L150 4 L152 34 L176 20 L156 46 Z M104 30 L96 6 L118 26 L124 2 L130 30 Z" fill={u('hair')} stroke="#b9bccb" stroke-width="2" stroke-linejoin="round" />
          <path d="M84 56 C84 30 140 26 146 58 C150 90 136 114 114 116 C94 116 84 96 84 56 Z" fill={u('skin')} stroke="#b88c6e" stroke-width="2" />
          <path d="M88 60 C70 70 60 80 62 86 C70 90 80 86 88 80" fill={u('skin')} stroke="#b88c6e" stroke-width="2" stroke-linejoin="round" />
          <path d="M84 44 C96 30 128 26 146 44 C140 34 120 26 104 28 C94 30 88 36 84 44 Z" fill="#e9eaf1" stroke="#b9bccb" stroke-width="1.5" />
          <path d="M88 50 C94 44 104 44 110 48" stroke="#e9eaf1" stroke-width="6" stroke-linecap="round" fill="none" />
          <circle cx="100" cy="60" r="3.6" fill="#3b2c4e" />
          <circle cx="100" cy="60" r="10" fill="#cfe6ee" fill-opacity="0.35" stroke="#d9a441" stroke-width="3" />
          <path d="M108 68 C120 84 126 100 122 118" stroke="#d9a441" stroke-width="1.6" fill="none" />
          {/* the moustache, curled up at both ends */}
          <path d="M96 90 C88 86 80 88 74 82 C76 92 86 98 98 94 C104 98 116 98 122 90 C124 98 134 98 138 90 C130 94 124 88 116 88 C108 86 100 88 96 90 Z" fill="#f4f4f8" stroke="#b9bccb" stroke-width="1.5" stroke-linejoin="round" />
          <path data-part="mouth-shh" d="M98 100 C101 97 105 97 107 100 C105 103 101 103 98 100 Z" fill="#7a3b4a" />
          <circle cx="128" cy="78" r="6" fill="#f2a9a0" opacity="0.4" />
        </g>
        {/* the other arm: up to his lips for SHHHH */}
        <g data-part="shush-arm" style={{ transformOrigin: '128px 146px' }}>
          <path d="M128 146 C120 170 108 150 102 118" stroke="#7a4aa6" stroke-width="18" stroke-linecap="round" fill="none" />
          <circle cx="100" cy="112" r="9" fill="#f1f0f6" stroke={LINE} stroke-width="2" />
          <path d="M98 104 L96 88" stroke="#f1f0f6" stroke-width="6" stroke-linecap="round" />
        </g>
      </g>
    </svg>
  );
}
