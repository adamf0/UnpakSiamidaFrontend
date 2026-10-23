import React, { useRef, useEffect, useState } from "react";

/**
 * Helper untuk menghitung kurva Bezier halus (Catmull-Rom to Cubic Bezier)
 * melalui serangkaian titik 2D.
 */
function buildSmoothSpline(pts) {
  if (!pts || pts.length < 2) return "";
  let d = `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = i > 0 ? pts[i - 1] : pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = i < pts.length - 2 ? pts[i + 2] : p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}

/**
 * Komponen Simulasi Fisika Kain / Silikon Gantungan Kunci (Fabric Simulation with Super Smooth Gravitation)
 * Mengimplementasikan:
 * 1. Multi-segment Verlet Integration dengan inersia kain, redaman udara (damping), dan gravitasi super halus.
 * 2. Ketahanan lekuk (bending stiffness) khas tali pita/silikon lanyard mewah.
 * 3. Hembusan angin mikro & ayunan inersia responsif terhadap hover, drag, dan jiggle.
 * 4. Jahitan pinggir (stitched seam), kancing rivet emas berkilau (gold snap stud),
 *    dan tipografi timbul 3D yang melengkung mengikuti spline kain (<textPath>).
 */
export default function FabricKeyStrap3D({
  label = "PRODI - S1 ILMU HUKUM",
  tagColor = {
    bg: "#1E3A8A",
    border: "#3B82F6",
    foil: "#FEF08A",
    text: "#FFFFFF",
    name: "Sapphire",
  },
  unitId = 1,
  isHovered = false,
  jiggleTrigger = 0,
  anchor = { x: 10, y: 18 },
  onSelectKey,
}) {
  const strapWidth = 32; // Lebar pita (px)
  const halfWidth = strapWidth / 2;
  const pathId = `strap-spine-${unitId}`;

  // 5 Titik sambungan kain (particles): P0 (collar ring), P1 (rivet), P2 (upper), P3 (mid), P4 (tip)
  const segmentLengths = [22, 46, 50, 52]; // Jarak antar titik
  const totalLength = 170;

  // State penyimpanan geometri yang di-render ke SVG
  const [geo, setGeo] = useState(() => {
    // Posisi awal lurus jatuh ke bawah mengikuti gravitasi
    const pts = [
      { x: anchor.x, y: anchor.y },
      { x: anchor.x, y: anchor.y + 22 },
      { x: anchor.x, y: anchor.y + 68 },
      { x: anchor.x, y: anchor.y + 118 },
      { x: anchor.x, y: anchor.y + 170 },
    ];
    return {
      points: pts,
      spinePath: buildSmoothSpline(pts),
      bodyPolygon: "",
      leftStitch: "",
      rightStitch: "",
      rivet: { x: anchor.x, y: anchor.y + 22, rot: 0 },
    };
  });

  // State fisika kontinu di useRef untuk performa 60fps tanpa re-render berlebih
  const simRef = useRef({
    pos: [
      { x: anchor.x, y: anchor.y },
      { x: anchor.x, y: anchor.y + 22 },
      { x: anchor.x, y: anchor.y + 68 },
      { x: anchor.x, y: anchor.y + 118 },
      { x: anchor.x, y: anchor.y + 170 },
    ],
    prev: [
      { x: anchor.x, y: anchor.y },
      { x: anchor.x, y: anchor.y + 22 },
      { x: anchor.x, y: anchor.y + 68 },
      { x: anchor.x, y: anchor.y + 118 },
      { x: anchor.x, y: anchor.y + 170 },
    ],
    lastTime: performance.now(),
    animFrame: null,
    wakeUntil: performance.now() + 2500, // Durasi bangun awal
  });

  // Bangunkan simulasi saat hover atau jiggle terpicu
  useEffect(() => {
    const now = performance.now();
    simRef.current.wakeUntil = now + 3000;
  }, [isHovered, jiggleTrigger]);

  // Efek dorongan awal saat jiggle berbunyi (efek gelombang lonceng)
  useEffect(() => {
    if (jiggleTrigger > 0) {
      const dir = (unitId % 2 === 0 ? 1 : -1);
      const sim = simRef.current;
      sim.prev[1].x -= 4 * dir;
      sim.prev[2].x -= 8 * dir;
      sim.prev[3].x -= 12 * dir;
      sim.prev[4].x -= 16 * dir;
      sim.wakeUntil = performance.now() + 4000;
    }
  }, [jiggleTrigger, unitId]);

  // Physics Simulation Loop (Verlet Integration + Cloth Gravitation)
  useEffect(() => {
    let active = true;

    const tick = () => {
      if (!active) return;
      const now = performance.now();
      const sim = simRef.current;
      const t = now / 1000;

      // Cek apakah masih perlu aktif (jika hover atau dalam periode bangun)
      const isAwake = isHovered || now < sim.wakeUntil;

      if (isAwake) {
        const { pos, prev } = sim;
        const friction = 0.935; // Redaman gesekan udara (halus dan elegan)
        const gravity = 0.38; // Tarikan gravitasi ke bawah

        // 1. Hitung gaya pada setiap titik
        for (let i = 1; i < 5; i++) {
          let ax = 0;
          let ay = gravity;

          // A. Gaya pemulih ketegakan kain (Bending Stiffness / Elastic Memory)
          // Kain ingin tetap lurus sejajar gravitasi
          const restX = anchor.x;
          ax -= (pos[i].x - restX) * (0.012 * i);

          // B. Kelenturan antar segmen (mencegah patahan tajam, membuat kurva S mengalir)
          if (i >= 2) {
            const dirX = pos[i - 1].x - pos[i - 2].x;
            const targetX = pos[i - 1].x + dirX;
            ax += (targetX - pos[i].x) * 0.05;
          }

          // C. Hembusan angin mikro alami saat hover (Breathing Sway)
          if (isHovered) {
            const breeze = Math.sin(t * 3.2 - i * 0.7) * (0.45 * i);
            ax += breeze;
          }

          // 2. Integrasi Posisi Verlet
          const vx = (pos[i].x - prev[i].x) * friction;
          const vy = (pos[i].y - prev[i].y) * friction;

          prev[i].x = pos[i].x;
          prev[i].y = pos[i].y;

          pos[i].x += vx + ax;
          pos[i].y += vy + ay;
        }

        // 3. Batasan Panjang Segmen Kain (Cloth Inextensibility Constraints)
        // Dijalankan 5x iterasi relaksasi
        pos[0].x = anchor.x;
        pos[0].y = anchor.y;

        for (let iter = 0; iter < 5; iter++) {
          for (let i = 1; i < 5; i++) {
            const pA = pos[i - 1];
            const pB = pos[i];
            let dx = pB.x - pA.x;
            let dy = pB.y - pA.y;
            const dist = Math.hypot(dx, dy) || 1;
            const targetDist = segmentLengths[i - 1];
            const diff = (dist - targetDist) / dist;

            if (i === 1) {
              pB.x -= dx * diff;
              pB.y -= dy * diff;
            } else {
              pB.x -= dx * diff * 0.7;
              pB.y -= dy * diff * 0.7;
              pA.x += dx * diff * 0.3;
              pA.y += dy * diff * 0.3;
            }
          }
        }

        // 4. Hitung Kontur Poligon Kain & Jahitan Sisi (Normal Offset Curve)
        const leftEdge = [];
        const rightEdge = [];
        const leftStitch = [];
        const rightStitch = [];

        for (let i = 0; i < 5; i++) {
          let tx, ty;
          if (i === 0) {
            tx = pos[1].x - pos[0].x;
            ty = pos[1].y - pos[0].y;
          } else if (i === 4) {
            tx = pos[4].x - pos[3].x;
            ty = pos[4].y - pos[3].y;
          } else {
            tx = (pos[i + 1].x - pos[i - 1].x) / 2;
            ty = (pos[i + 1].y - pos[i - 1].y) / 2;
          }
          const tlen = Math.hypot(tx, ty) || 1;
          const nx = -ty / tlen;
          const ny = tx / tlen;

          leftEdge.push({ x: pos[i].x + nx * halfWidth, y: pos[i].y + ny * halfWidth });
          rightEdge.push({ x: pos[i].x - nx * halfWidth, y: pos[i].y - ny * halfWidth });

          leftStitch.push({
            x: pos[i].x + nx * (halfWidth - 3),
            y: pos[i].y + ny * (halfWidth - 3),
          });
          rightStitch.push({
            x: pos[i].x - nx * (halfWidth - 3),
            y: pos[i].y - ny * (halfWidth - 3),
          });
        }

        // Bentuk SVG poligon utuh dari tepi kiri -> ujung bawah melengkung -> tepi kanan -> lipatan atas
        const leftD = buildSmoothSpline(leftEdge);
        const rightDReversed = buildSmoothSpline([...rightEdge].reverse());
        const bodyPoly = `${leftD} L ${rightEdge[4].x.toFixed(1)},${rightEdge[4].y.toFixed(1)} ${rightDReversed.replace(/^M/, "L")} Z`;

        // Sudut rotasi rivet kuningan pada P1
        const rivetRot =
          (Math.atan2(pos[2].y - pos[0].y, pos[2].x - pos[0].x) * 180) / Math.PI - 90;

        setGeo({
          points: [...pos],
          spinePath: buildSmoothSpline(pos),
          bodyPolygon: bodyPoly,
          leftStitch: buildSmoothSpline(leftStitch),
          rightStitch: buildSmoothSpline(rightStitch),
          rivet: { x: pos[1].x, y: pos[1].y, rot: rivetRot },
        });
      }

      sim.animFrame = requestAnimationFrame(tick);
    };

    simRef.current.animFrame = requestAnimationFrame(tick);
    return () => {
      active = false;
      if (simRef.current.animFrame) cancelAnimationFrame(simRef.current.animFrame);
    };
  }, [anchor.x, anchor.y, halfWidth, isHovered]);

  // Skala ukuran font tipografi agar muat presisi di sepanjang tali
  const cleanLabel = label.toUpperCase();
  const fontSize = cleanLabel.length > 28 ? 8 : cleanLabel.length > 20 ? 9 : 10;

  return (
    <g className="cursor-pointer group select-none">
      <defs>
        {/* Jalur Spine untuk pergerakan dinamis teks (<textPath>) */}
        <path id={pathId} d={geo.spinePath} fill="none" stroke="none" />

        {/* Gradasi 3D Bahan Kain / Silikon Gantungan Kunci */}
        <linearGradient
          id={`fabric-grad-${unitId}`}
          x1="0%"
          y1="0%"
          x2="100%"
          y2="0%"
          gradientTransform="rotate(15)"
        >
          <stop offset="0%" stopColor={tagColor.bg} stopOpacity="0.95" />
          <stop offset="35%" stopColor={tagColor.border || tagColor.bg} stopOpacity="1" />
          <stop offset="70%" stopColor={tagColor.bg} stopOpacity="1" />
          <stop offset="100%" stopColor="#0B132B" stopOpacity="0.4" />
        </linearGradient>

        {/* Gradasi Kilau Kancing Rivet Emas Murni (Gold Snap Stud) */}
        <radialGradient
          id={`rivet-grad-${unitId}`}
          cx="35%"
          cy="35%"
          r="65%"
          fx="30%"
          fy="30%"
        >
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="45%" stopColor="#EAB308" />
          <stop offset="85%" stopColor="#A16207" />
          <stop offset="100%" stopColor="#713F12" />
        </radialGradient>

        {/* Filter Bayangan Jatuh Realistis untuk Tali Kain */}
        <filter id={`fabric-shadow-${unitId}`} x="-30%" y="-10%" width="160%" height="130%">
          <feDropShadow dx="2" dy="8" stdDeviation="5" floodOpacity="0.32" />
          <feDropShadow dx="1" dy="2" stdDeviation="2" floodOpacity="0.2" />
        </filter>
      </defs>

      {/* 1. BADAN TALI GANTUNGAN KAIN (FABRIC WRISTLET STRAP BODY) */}
      <path
        d={geo.bodyPolygon}
        fill={`url(#fabric-grad-${unitId})`}
        stroke={tagColor.border}
        strokeWidth="1.2"
        filter={`url(#fabric-shadow-${unitId})`}
        className="transition-all duration-150"
      />

      {/* 2. TEKSTUR JAHITAN PINGGIR (AUTHENTIC TAILORED SEAM STITCHES) */}
      {geo.leftStitch && (
        <path
          d={geo.leftStitch}
          fill="none"
          stroke="rgba(255,255,255,0.45)"
          strokeWidth="1.1"
          strokeDasharray="3 3"
          strokeLinecap="round"
        />
      )}
      {geo.rightStitch && (
        <path
          d={geo.rightStitch}
          fill="none"
          stroke="rgba(0,0,0,0.3)"
          strokeWidth="1.1"
          strokeDasharray="3 3"
          strokeLinecap="round"
        />
      )}

      {/* 3. TEKS TIPOGRAFI TIMBUL YANG MELENGKUNG MENGIKUTI DINAMIKA KAIN (<textPath>) */}
      <text
        fill={tagColor.foil || "#FEF08A"}
        fontSize={fontSize}
        fontWeight="900"
        letterSpacing="0.09em"
        style={{
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.85))",
        }}
      >
        <textPath
          href={`#${pathId}`}
          startOffset="56%"
          textAnchor="middle"
          dominantBaseline="central"
        >
          {cleanLabel}
        </textPath>
      </text>

      {/* 4. AKSEN SAKURA / MOTIF BUNGA IKONIK (PERSIS FOTO REFERENSI PITA USER) */}
      <text
        fill={tagColor.foil || "#FEF08A"}
        fontSize="8"
        fontWeight="bold"
        opacity="0.9"
        style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.6))" }}
      >
        <textPath href={`#${pathId}`} startOffset="24%" textAnchor="middle">
          🌸
        </textPath>
      </text>
      <text
        fill={tagColor.foil || "#FEF08A"}
        fontSize="8"
        fontWeight="bold"
        opacity="0.85"
        style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.6))" }}
      >
        <textPath href={`#${pathId}`} startOffset="88%" textAnchor="middle">
          🌸
        </textPath>
      </text>

      {/* 5. LIPATAN KRAI ATAS PENGHUBUNG KE CINCIN (LOOP COLLAR CLASP) */}
      <g transform={`translate(${anchor.x}, ${anchor.y})`}>
        {/* Plat klem penahan loop pita ke cincin */}
        <rect
          x={-halfWidth + 4}
          y="-6"
          width={strapWidth - 8}
          height="10"
          rx="3"
          fill={`url(#rivet-grad-${unitId})`}
          stroke="#B45309"
          strokeWidth="0.8"
          style={{ filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.3))" }}
        />
      </g>

      {/* 6. KANCING RIVET EMAS MURNI BERKILAU (SHINY GOLD SNAP STUD) */}
      <g
        transform={`translate(${geo.rivet.x}, ${geo.rivet.y}) rotate(${geo.rivet.rot})`}
        style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.45))" }}
      >
        {/* Cincin luar kancing */}
        <circle cx="0" cy="0" r="6" fill={`url(#rivet-grad-${unitId})`} stroke="#A16207" strokeWidth="0.9" />
        {/* Cincin bevel tengah */}
        <circle cx="0" cy="0" r="4" fill="none" stroke="#FEF08A" strokeWidth="0.6" opacity="0.8" />
        {/* Pantulan kilap titik cahaya putih */}
        <circle cx="-1.8" cy="-1.8" r="1.8" fill="#FFFFFF" opacity="0.9" />
      </g>
    </g>
  );
}
