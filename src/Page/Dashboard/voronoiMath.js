/**
 * voronoiMath.js
 * Algoritma komputasi partisi Voronoi murni JavaScript dengan garansi matematis 100% gapless (tanpa celah).
 * Menghasilkan tessellation yang rapat dan mulus menutupi seluruh disk lingkaran.
 */

/**
 * Membuat poligon lingkaran beraturan berpresisi tinggi (96 titik)
 */
export function makeCirclePoly(cx, cy, r, steps = 96) {
  const pts = [];
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    pts.push({
      x: cx + r * Math.cos(a),
      y: cy + r * Math.sin(a),
    });
  }
  return pts;
}

/**
 * Menghitung luas (area) dan titik pusat (centroid) poligon konveks
 */
export function polyCentroidAndArea(poly) {
  let area = 0;
  let cx = 0;
  let cy = 0;
  const n = poly.length;
  if (n < 3) return { area: 0, cx: poly[0]?.x || 0, cy: poly[0]?.y || 0 };

  for (let i = 0; i < n; i++) {
    const p1 = poly[i];
    const p2 = poly[(i + 1) % n];
    const cross = p1.x * p2.y - p2.x * p1.y;
    area += cross;
    cx += (p1.x + p2.x) * cross;
    cy += (p1.y + p2.y) * cross;
  }
  area = area / 2;
  if (Math.abs(area) < 1e-5) {
    return { area: 0, cx: poly[0]?.x || 0, cy: poly[0]?.y || 0 };
  }
  return {
    area: Math.abs(area),
    cx: cx / (6 * area),
    cy: cy / (6 * area),
  };
}

/**
 * Sutherland-Hodgman convex polygon clipping menggunakan garis bisektor tegak lurus eksak.
 * Bisektor titik tengah eksak menjamin secara matematis bahwa gabungan seluruh sel
 * menutupi 100.0% poligon dasar tanpa ada celah (gaps) atau tumpang tindih (overlaps).
 */
export function clipConvex(poly, p1, p2) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  if (dx * dx + dy * dy < 1e-6) return poly;

  // Garis batas adalah garis bagi tegak lurus tepat di tengah p1 dan p2
  const mx = (p1.x + p2.x) / 2;
  const my = (p1.y + p2.y) / 2;

  const out = [];
  const n = poly.length;
  for (let i = 0; i < n; i++) {
    const cur = poly[i];
    const prev = poly[(i + n - 1) % n];
    const curIn = (cur.x - mx) * dx + (cur.y - my) * dy <= 0;
    const prevIn = (prev.x - mx) * dx + (prev.y - my) * dy <= 0;

    if (curIn) {
      if (!prevIn) {
        const segDx = cur.x - prev.x;
        const segDy = cur.y - prev.y;
        const denom = segDx * dx + segDy * dy;
        const t =
          Math.abs(denom) > 1e-9
            ? ((mx - prev.x) * dx + (my - prev.y) * dy) / denom
            : 0;
        out.push({ x: prev.x + segDx * t, y: prev.y + segDy * t });
      }
      out.push(cur);
    } else if (prevIn) {
      const segDx = cur.x - prev.x;
      const segDy = cur.y - prev.y;
      const denom = segDx * dx + segDy * dy;
      const t =
        Math.abs(denom) > 1e-9
          ? ((mx - prev.x) * dx + (my - prev.y) * dy) / denom
          : 0;
      out.push({ x: prev.x + segDx * t, y: prev.y + segDy * t });
    }
  }
  return out;
}

/**
 * Seeding koordinat awal dengan pengelompokan sektor radial yang proporsional
 */
export function seedGroupPoints(groups, cx, cy, radius) {
  const items = [];
  const totalItems = groups.reduce((acc, g) => acc + g.items.length, 0);
  if (totalItems === 0) return items;

  let curAngle = -Math.PI / 2; // Mulai dari jam 12 (paling atas)

  groups.forEach((g) => {
    const count = g.items.length;
    if (count === 0) return;
    const span = Math.PI * 2 * (count / totalItems);

    g.items.forEach((item, idx) => {
      // Distribusikan sudut dalam sektor grup
      const a = curAngle + (idx + 0.5) * (span / count);

      // Variasi jari-jari bertingkat agar titik tidak bertabrakan pada satu lingkaran
      let rRatio;
      if (count === 1) {
        rRatio = 0.5;
      } else if (count === 2) {
        rRatio = idx === 0 ? 0.38 : 0.68;
      } else {
        // 3 layer konsentris
        const layer = idx % 3;
        rRatio = 0.28 + 0.52 * (layer / 2);
      }
      const r = radius * rRatio;

      // Bobot target:
      // Item dengan pemetaan mendapat bobot target yang lebih besar
      // Item tanpa pemetaan mendapat bobot minimum (1) agar tetap terlihat jelas sebagai sel merah
      const targetWeight =
        item.totalPemetaan <= 0
          ? 1
          : Math.max(1.5, Math.sqrt(item.totalPemetaan) * 1.8);

      items.push({
        ...item,
        groupKey: g.key,
        groupName: g.name,
        groupColor: g.color,
        x: cx + r * Math.cos(a),
        y: cy + r * Math.sin(a),
        targetWeight,
        sectorMinA: curAngle,
        sectorMaxA: curAngle + span,
      });
    });

    curAngle += span;
  });

  return items;
}

/**
 * Menghitung sel-sel Voronoi dengan relaksasi Lloyd terarah (CVT).
 * Mengoptimalkan ukuran sel sesuai bobot pemetaan sekaligus menjamin 100.0% bebas celah kosong.
 */
export function computeVoronoiCells(items, cx, cy, radius, iterations = 6) {
  if (!items || items.length === 0) return [];

  // Poligon dasar lingkaran dengan 96 titik untuk batas luar yang sangat halus
  const basePoly = makeCirclePoly(cx, cy, radius, 96);
  const circleArea = Math.PI * radius * radius;
  const cloned = items.map((it) => ({ ...it }));
  const totalWeight = cloned.reduce((acc, it) => acc + (it.targetWeight || 1), 0);

  // Iterasi Relaksasi Lloyd dengan penyesuaian area terarah
  for (let iter = 0; iter < iterations; iter++) {
    // 1. Hitung poligon dan centroid untuk setiap titik saat ini
    cloned.forEach((item, i) => {
      let poly = [...basePoly];
      cloned.forEach((other, j) => {
        if (i === j) return;
        poly = clipConvex(poly, item, other);
      });
      const { area, cx: cellCx, cy: cellCy } = polyCentroidAndArea(poly);
      item.area = area;
      item.cx = cellCx;
      item.cy = cellCy;
    });

    // 2. Geser titik ke arah centroid sel (Lloyd smoothing)
    //    dan dorong tetangga jika sel masih terlalu kecil dibanding targetnya
    cloned.forEach((item, i) => {
      const targetArea = (circleArea * (item.targetWeight || 1)) / totalWeight;
      const areaRatio = item.area > 0 ? targetArea / item.area : 1;

      // Tarik ke arah centroid sel poligon
      item.x = item.x * 0.35 + item.cx * 0.65;
      item.y = item.y * 0.35 + item.cy * 0.65;

      // Jika area sel saat ini lebih kecil dari targetnya, beri gaya ekspansi lembut
      if (areaRatio > 1.25 && iter < iterations - 1) {
        cloned.forEach((other, j) => {
          if (i === j) return;
          const dx = other.x - item.x;
          const dy = other.y - item.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 1 && dist < 140) {
            const push = Math.min(3.5, (areaRatio - 1) * 2);
            other.x += (dx / dist) * push;
            other.y += (dy / dist) * push;
          }
        });
      }
    });
  }

  // Partisi final: setiap poligon dipotong dengan bisektor eksak sehingga 100% gapless
  return cloned.map((item, i) => {
    let poly = [...basePoly];
    cloned.forEach((other, j) => {
      if (i === j) return;
      poly = clipConvex(poly, item, other);
    });

    const { area, cx: cellCx, cy: cellCy } = polyCentroidAndArea(poly);
    const pathD =
      poly.length >= 3
        ? `M ${poly.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" L ")} Z`
        : "";

    return {
      ...item,
      polygon: poly,
      pathD,
      area,
      centroid: { x: cellCx, y: cellCy },
    };
  });
}
