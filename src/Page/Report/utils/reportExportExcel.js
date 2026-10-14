import ExcelJS from "exceljs";

/**
 * Helper to download Blob as file
 */
function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => window.URL.revokeObjectURL(url), 1000);
}

/**
 * Apply styling to header row
 */
function styleHeaderRow(row, bgColor = "1E3A8A") {
  row.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
  row.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: bgColor },
  };
  row.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  row.height = 26;
}

/**
 * Apply border & alignment to all data cells
 */
function styleDataRows(worksheet, startRow = 2) {
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber >= startRow) {
      let maxLinesInRow = 1;

      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = {
          top: { style: "thin", color: { argb: "FFE5E7EB" } },
          left: { style: "thin", color: { argb: "FFE5E7EB" } },
          bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
          right: { style: "thin", color: { argb: "FFE5E7EB" } },
        };
        if (!cell.alignment) {
          cell.alignment = { vertical: "top", wrapText: true };
        } else {
          cell.alignment = { ...cell.alignment, vertical: "top", wrapText: true };
        }

        if (cell.value) {
          const valStr = String(cell.value);
          const lines = valStr.split("\n").length;
          if (lines > maxLinesInRow) {
            maxLinesInRow = lines;
          }
        }
      });

      if (maxLinesInRow > 1) {
        row.height = Math.min(Math.max(maxLinesInRow * 16 + 8, 24), 260);
      } else {
        row.height = 20;
      }
    }
  });
}

/**
 * Auto-adjust worksheet column widths
 */
function autoFitColumns(worksheet, minWidth = 12, maxWidth = 50) {
  worksheet.columns.forEach((column) => {
    let maxLen = 0;
    column.eachCell({ includeEmpty: true }, (cell) => {
      const val = cell.value ? String(cell.value) : "";
      const lines = val.split("\n");
      lines.forEach((l) => {
        if (l.length > maxLen) {
          maxLen = l.length;
        }
      });
    });
    column.width = Math.min(Math.max(maxLen + 3, minWidth), maxWidth);
  });
}

/**
 * Helper to produce clean, unique Excel worksheet names (<= 31 chars, no invalid chars)
 */
function getCleanSheetName(title, usedNames = new Set()) {
  let name = String(title || "Unit")
    .replace(/[\\/?*:[\]]/g, "_")
    .trim();

  // Shorten common long names so they are clean and recognizable
  const lower = name.toLowerCase();
  if (lower.includes("keguruan dan ilmu pendidikan")) name = "FKIP";
  else if (lower.includes("ekonomi dan bisnis")) name = "FEB";
  else if (lower.includes("sosial dan ilmu budaya")) name = "FISIB";
  else if (lower.includes("pascasarjana")) name = "Pascasarjana";
  else if (lower.includes("vokasi")) name = "Sekolah Vokasi";
  else if (lower.includes("penelitian dan pengabdian")) name = "LPPM";
  else if (lower.includes("penjaminan mutu")) name = "LPM";

  name = name.slice(0, 28);
  if (!name) name = "Unit";

  let uniqueName = name;
  let counter = 2;
  while (usedNames.has(uniqueName.toLowerCase())) {
    uniqueName = `${name.slice(0, 25)}_${counter++}`;
  }
  usedNames.add(uniqueName.toLowerCase());
  return uniqueName;
}

/**
 * Format status KTS ke label human-readable untuk laporan Excel
 */
export function formatStatusKtsLabel(item) {
  if (!item) return "Draf";
  const rawStatus = (item.Status || "").toLowerCase().trim();
  const rawKet = (item.Keterangan || "").toLowerCase().trim();

  if (rawStatus === "tutup_kts" || rawKet === "close") {
    return "Closed (Tutup KTS)";
  }

  const map = {
    belum_dibuat: "Belum Dibuat",
    draf: "Draf",
    menunggu_verif_auditee: "Menunggu Verifikasi Auditee",
    tolak_auditee: "Ditolak Auditee",
    terima_auditee: "Diterima Auditee",
    menunggu_penyelesaian: "Menunggu Penyelesaian",
    tindakan_penyelesaian: "Tindakan Penyelesaian",
  };

  if (map[rawStatus]) {
    return map[rawStatus];
  }

  if (!rawStatus) return "Draf";
  return rawStatus
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Format target indikator (Nilai/Range/Kategori yang harus dilalui)
 */
export function formatTargetIndikator(item) {
  if (!item) return "-";
  const tipe = (item.TipeTarget || "").toLowerCase().trim();

  // 1. Range target
  if (tipe === "range" || item.RangeTarget || (item.TargetMin && item.TargetMax)) {
    if (item.RangeTarget) {
      return `${item.RangeTarget}${item.Satuan ? ` ${item.Satuan}` : ""}`.trim();
    }
    if (item.TargetMin != null || item.TargetMax != null) {
      return `${item.TargetMin ?? 0} - ${item.TargetMax ?? 0}${item.Satuan ? ` ${item.Satuan}` : ""}`.trim();
    }
  }

  // 2. Numerik with target value & operator
  if (item.TargetIndikator != null && String(item.TargetIndikator).trim() !== "") {
    const op = item.Operator ? `${item.Operator} ` : "";
    const sat = item.Satuan ? ` ${item.Satuan}` : "";
    return `${op}${item.TargetIndikator}${sat}`.trim();
  }

  // 3. Kategori / Kualitatif
  if (tipe === "kategori" || tipe === "kualitatif") {
    return "Terlaksana / Sesuai Standar";
  }

  if (item.Source === "dokumen_tambahan") {
    return "Sesuai Standar / Ya";
  }

  return "-";
}

/**
 * Normalizes and cleans text output from HTML conversion
 */
function cleanTextOutput(text) {
  if (!text) return "";
  return text
    .replace(/\u00A0/g, " ") // Non-breaking space
    .replace(/[ \t]+/g, " ") // Collapse redundant inline spaces
    .replace(/\n\s*\n\s*\n+/g, "\n\n") // Max 2 consecutive line breaks
    .replace(/^\s+/, "") // Trim start
    .replace(/\s+$/, ""); // Trim end
}

/**
 * Traverses DOM nodes recursively to convert HTML into formatted Excel text
 * Supporting ordered lists (1., 2., ...), unordered bullet points (• ...), and paragraphs
 */
function parseNode(node, indentLevel = 0) {
  if (!node) return "";

  // 1. Text node
  if (node.nodeType === 3) {
    return node.textContent || "";
  }

  // 2. Element node
  if (node.nodeType === 1) {
    const tag = node.tagName.toLowerCase();

    if (tag === "br") {
      return "\n";
    }

    if (tag === "ol" || tag === "ul") {
      const isOl = tag === "ol";
      const startAttr = parseInt(node.getAttribute ? node.getAttribute("start") : "1", 10);
      let listCounter = !isNaN(startAttr) ? startAttr : 1;
      let result = "";

      const children = Array.from(node.children || []);
      children.forEach((child) => {
        if (child.tagName.toLowerCase() === "li") {
          const indent = "   ".repeat(indentLevel);
          let itemText = parseNode(child, indentLevel + 1).trim();

          // Strip redundant leading numbers or bullets if user typed them manually inside the list item
          if (isOl) {
            itemText = itemText.replace(/^\d+[\.\)]\s*/, "");
            result += `${indent}${listCounter++}. ${itemText}\n`;
          } else {
            itemText = itemText.replace(/^[•\-\*]\s*/, "");
            result += `${indent}• ${itemText}\n`;
          }
        } else {
          result += parseNode(child, indentLevel);
        }
      });
      return result ? `\n${result}` : "";
    }

    if (tag === "li") {
      let text = "";
      for (const child of node.childNodes || []) {
        text += parseNode(child, indentLevel);
      }
      return text;
    }

    if (tag === "p" || tag === "div" || /^h[1-6]$/.test(tag)) {
      let text = "";
      for (const child of node.childNodes || []) {
        text += parseNode(child, indentLevel);
      }
      const t = text.trim();
      return t ? `${t}\n` : "\n";
    }

    if (tag === "tr") {
      const cells = Array.from(node.children || [])
        .filter((c) => c.tagName.toLowerCase() === "td" || c.tagName.toLowerCase() === "th")
        .map((c) => parseNode(c, indentLevel).trim());
      return cells.join(" | ") + "\n";
    }

    // Inline elements: b, strong, i, em, u, span, a, font, etc.
    let text = "";
    for (const child of node.childNodes || []) {
      text += parseNode(child, indentLevel);
    }
    return text;
  }

  return "";
}

/**
 * Fallback regex-based HTML-to-text converter
 */
function fallbackHtmlToText(html) {
  if (!html) return "-";
  let str = html;

  // Replace <br> with newline
  str = str.replace(/<br\s*[\/]?>/gi, "\n");

  // Replace <ol><li> with numbered list
  str = str.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (match, content) => {
    let num = 1;
    const items = content.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, text) => {
      let clean = text.replace(/<[^>]+>/g, "").trim();
      clean = clean.replace(/^\d+[\.\)]\s*/, "");
      return `${num++}. ${clean}\n`;
    });
    return `\n${items}\n`;
  });

  // Replace <ul><li> with bulleted list
  str = str.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (match, content) => {
    const items = content.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, text) => {
      let clean = text.replace(/<[^>]+>/g, "").trim();
      clean = clean.replace(/^[•\-\*]\s*/, "");
      return `• ${clean}\n`;
    });
    return `\n${items}\n`;
  });

  // Replace <p> and <div> with newlines
  str = str.replace(/<\/(p|div|h[1-6])>/gi, "\n");
  str = str.replace(/<(p|div|h[1-6])[^>]*>/gi, "");

  // Strip remaining HTML tags
  str = str.replace(/<[^>]+>/g, "");

  // Decode common HTML entities
  str = str
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&ndash;/gi, "–")
    .replace(/&mdash;/gi, "—");

  return cleanTextOutput(str) || "-";
}

/**
 * Converts HTML content from CKEditor / Rich Text Editors to formatted plain text suitable for Excel
 * Preserves ordered lists (1., 2.), bullet points (•), paragraphs, and line breaks.
 */
export function htmlToExcelText(html) {
  if (!html) return "-";
  if (typeof html !== "string") return String(html);

  const trimmed = html.trim();
  if (!trimmed) return "-";

  // If there are no HTML tags and no HTML entities, return trimmed
  if (!/<[a-z][\s\S]*>/i.test(trimmed) && !/&[a-z0-9#]+;/i.test(trimmed)) {
    return trimmed;
  }

  try {
    let container;
    if (typeof DOMParser !== "undefined") {
      const parser = new DOMParser();
      const doc = parser.parseFromString(trimmed, "text/html");
      container = doc.body;
    } else if (typeof document !== "undefined") {
      container = document.createElement("div");
      container.innerHTML = trimmed;
    }

    if (container) {
      const rawText = parseNode(container, 0);
      const cleaned = cleanTextOutput(rawText);
      return cleaned || "-";
    }
  } catch (err) {
    console.warn("Error converting HTML to text for Excel:", err);
  }

  return fallbackHtmlToText(trimmed);
}

/**
 * Format Uraian Ketidaksesuaian (P-L-O-R)
 */
export function formatPLOR(item) {
  if (!item) return "-";
  const p = htmlToExcelText(item.KetidaksesuaianP);
  const l = htmlToExcelText(item.KetidaksesuaianL);
  const o = htmlToExcelText(item.KetidaksesuaianO);
  const r = htmlToExcelText(item.KetidaksesuaianR);

  const lines = [];
  if (p && p !== "-") lines.push(`[P] ${p}`);
  if (l && l !== "-") lines.push(`[L] ${l}`);
  if (o && o !== "-") lines.push(`[O] ${o}`);
  if (r && r !== "-") lines.push(`[R] ${r}`);

  if (lines.length > 0) {
    return lines.join("\n\n");
  }

  if (item.PLOR && String(item.PLOR).trim()) {
    const cleanPlor = htmlToExcelText(item.PLOR);
    return cleanPlor !== "-" ? cleanPlor : "-";
  }

  return "-";
}

/**
 * EXPORT SEMUA DATA TEMUAN KTS KE EXCEL (.XLSX)
 * Struktur Sheet:
 * 1. Sheet 1: Rincian (Rincian Status KTS per Program Studi & Unit)
 * 2. Sheet 2 s/d (N-1): Data per Unit / Fakultas (Ringkasan Sub-Unit & Rincian Temuan)
 * 3. Sheet Terakhir: Semua Temuan KTS (Master Akumulasi Universitas Lengkap)
 */
export async function exportAllTemuanToExcel({
  tahun = "2024",
  jenjangProdiData = [],
  hierarchicalUnitGroups = [],
  rawTemuan = [],
}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Unpak Siamida";
  workbook.created = new Date();

  const usedSheetNames = new Set();

  // =========================================================
  // SHEET 1: DATA RINCIAN
  // =========================================================
  const s1Name = getCleanSheetName("Rincian", usedSheetNames);
  const wsProdi = workbook.addWorksheet(s1Name);
  wsProdi.views = [{ showGridLines: true }];

  wsProdi.mergeCells("A1:R1");
  wsProdi.getCell("A1").value = `LAPORAN TEMUAN KTS - RINCIAN PER PROGRAM STUDI & UNIT`;
  wsProdi.getCell("A1").font = { bold: true, size: 13, color: { argb: "1E3A8A" } };

  wsProdi.getCell("A2").value = `Tahun Renstra: ${tahun} | Total Data: ${jenjangProdiData.length} Program Studi / Unit | Dicetak: ${new Date().toLocaleString("id-ID")}`;
  wsProdi.getCell("A2").font = { italic: true, size: 10, color: { argb: "4B5563" } };

  const hProdi = wsProdi.getRow(4);
  hProdi.values = [
    "No",
    "Program Studi / Unit",
    "Jenjang",
    "Fakultas",
    "Tipe",
    "Major",
    "Minor",
    "Observe",
    "Total Temuan",
    "Belum Dibuat",
    "Draf",
    "Menunggu Verif Auditee",
    "Tolak Auditee",
    "Terima Auditee",
    "Menunggu Penyelesaian",
    "Tindakan Penyelesaian",
    "Closed",
    "% Selesai",
  ];
  styleHeaderRow(hProdi, "4C1D95"); // Deep purple

  let sumMajor = 0;
  let sumMinor = 0;
  let sumObserve = 0;
  let sumTotal = 0;
  const statusSums = {
    belum_dibuat: 0,
    draf: 0,
    menunggu_verif_auditee: 0,
    tolak_auditee: 0,
    terima_auditee: 0,
    menunggu_penyelesaian: 0,
    tindakan_penyelesaian: 0,
    tutup_kts: 0,
  };

  jenjangProdiData.forEach((p, idx) => {
    sumMajor += p.major || 0;
    sumMinor += p.minor || 0;
    sumObserve += p.observe || 0;
    sumTotal += p.total || 0;

    const sCounts = p.statusCounts || {};
    const cBelum = sCounts["belum_dibuat"] || 0;
    const cDraf = sCounts["draf"] || 0;
    const cMenungguVerif = sCounts["menunggu_verif_auditee"] || 0;
    const cTolak = sCounts["tolak_auditee"] || 0;
    const cTerima = sCounts["terima_auditee"] || 0;
    const cMenungguPeny = sCounts["menunggu_penyelesaian"] || 0;
    const cTindakanPeny = sCounts["tindakan_penyelesaian"] || 0;
    const cClosed = p.closedCount != null ? p.closedCount : (sCounts["tutup_kts"] || 0);

    statusSums.belum_dibuat += cBelum;
    statusSums.draf += cDraf;
    statusSums.menunggu_verif_auditee += cMenungguVerif;
    statusSums.tolak_auditee += cTolak;
    statusSums.terima_auditee += cTerima;
    statusSums.menunggu_penyelesaian += cMenungguPeny;
    statusSums.tindakan_penyelesaian += cTindakanPeny;
    statusSums.tutup_kts += cClosed;

    const rate = p.total > 0 ? Math.round((cClosed / p.total) * 100) + "%" : "0%";

    const isUnit = (p.jenjang || "").toLowerCase() === "unit" || (p.type || "").toLowerCase() === "unit";
    const cleanJenjang = isUnit ? "-" : (p.jenjang || "-");

    const row = wsProdi.addRow([
      idx + 1,
      p.target,
      cleanJenjang,
      p.fakultas || "-",
      p.type,
      p.major,
      p.minor,
      p.observe,
      p.total,
      cBelum,
      cDraf,
      cMenungguVerif,
      cTolak,
      cTerima,
      cMenungguPeny,
      cTindakanPeny,
      cClosed,
      rate,
    ]);

    row.getCell(1).alignment = { horizontal: "center" };
    row.getCell(3).alignment = { horizontal: "center" };
    row.getCell(5).alignment = { horizontal: "center" };
    row.getCell(6).alignment = { horizontal: "center" };
    row.getCell(7).alignment = { horizontal: "center" };
    row.getCell(8).alignment = { horizontal: "center" };
    row.getCell(9).alignment = { horizontal: "center" };
    row.getCell(10).alignment = { horizontal: "center" };
    row.getCell(11).alignment = { horizontal: "center" };
    row.getCell(12).alignment = { horizontal: "center" };
    row.getCell(13).alignment = { horizontal: "center" };
    row.getCell(14).alignment = { horizontal: "center" };
    row.getCell(15).alignment = { horizontal: "center" };
    row.getCell(16).alignment = { horizontal: "center" };
    row.getCell(17).alignment = { horizontal: "center" };
    row.getCell(18).alignment = { horizontal: "center" };
  });

  // Summary Row
  const totalRate = sumTotal > 0 ? Math.round((statusSums.tutup_kts / sumTotal) * 100) + "%" : "0%";
  const rTotal = wsProdi.addRow([
    "TOTAL",
    "Seluruh Program Studi & Unit",
    "",
    "",
    "",
    sumMajor,
    sumMinor,
    sumObserve,
    sumTotal,
    statusSums.belum_dibuat,
    statusSums.draf,
    statusSums.menunggu_verif_auditee,
    statusSums.tolak_auditee,
    statusSums.terima_auditee,
    statusSums.menunggu_penyelesaian,
    statusSums.tindakan_penyelesaian,
    statusSums.tutup_kts,
    totalRate,
  ]);
  rTotal.font = { bold: true };
  rTotal.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "F3F4F6" },
  };
  rTotal.getCell(1).alignment = { horizontal: "center" };
  for (let c = 6; c <= 18; c++) {
    rTotal.getCell(c).alignment = { horizontal: "center" };
  }

  autoFitColumns(wsProdi, 10, 42);
  styleDataRows(wsProdi, 4);

  // =========================================================
  // SHEET 2 S/D SETERUSNYA: PER UNIT / FAKULTAS
  // =========================================================
  hierarchicalUnitGroups.forEach((group) => {
    const sheetName = getCleanSheetName(group.title, usedSheetNames);
    const ws = workbook.addWorksheet(sheetName);
    ws.views = [{ showGridLines: true }];

    // Header title
    ws.mergeCells("A1:E1");
    ws.getCell("A1").value = `LAPORAN TEMUAN KTS - ${group.title.toUpperCase()}`;
    ws.getCell("A1").font = { bold: true, size: 13, color: { argb: "1E3A8A" } };

    ws.getCell("A2").value = `Tipe: ${group.type === "fakultas" ? "Fakultas" : "Unit Kerja"} | Tahun: ${tahun} | Total Temuan: ${group.total} (Major: ${group.major}, Minor: ${group.minor}, Observe: ${group.observe}, Closed: ${group.closed})`;
    ws.getCell("A2").font = { italic: true, size: 10, color: { argb: "4B5563" } };

    // Table 1: Ringkasan Sub-Unit
    ws.getCell("A4").value = "1. RINGKASAN SUB-UNIT / PROGRAM STUDI";
    ws.getCell("A4").font = { bold: true, size: 11, color: { argb: "1F2937" } };

    const hSub = ws.getRow(5);
    hSub.values = [
      "No",
      "Fakultas / Unit",
      "Program Studi / Target",
      "Jenjang",
      "Major",
      "Minor",
      "Observe",
      "Total Temuan",
      "Closed",
    ];
    styleHeaderRow(hSub, "1E3A8A");

    let currentRow = 5;
    (group.subGroups || []).forEach((sub, sIdx) => {
      currentRow++;
      const isGroupUnit = group.type === "unit" || (sub.jenjang || "").toLowerCase() === "unit";
      const isDekanat = (sub.jenjang || "").toLowerCase() === "fakultas" || sub.key === "DEKANAT";

      let fVal = group.title;
      let pVal = "-";
      let jVal = "-";

      if (isGroupUnit) {
        fVal = group.title;
        pVal = "-";
        jVal = "-";
      } else if (isDekanat) {
        fVal = group.title;
        pVal = "-";
        jVal = "-";
      } else {
        fVal = group.title;
        pVal = sub.title;
        jVal = sub.jenjang;
      }

      const r = ws.addRow([
        sIdx + 1,
        fVal,
        pVal,
        jVal,
        sub.major,
        sub.minor,
        sub.observe,
        sub.total,
        sub.closed,
      ]);
      r.getCell(1).alignment = { horizontal: "center" };
      r.getCell(4).alignment = { horizontal: "center" };
      r.getCell(5).alignment = { horizontal: "center" };
      r.getCell(6).alignment = { horizontal: "center" };
      r.getCell(7).alignment = { horizontal: "center" };
      r.getCell(8).alignment = { horizontal: "center" };
      r.getCell(9).alignment = { horizontal: "center" };
    });

    styleDataRows(ws, 5);

    // Table 2: Detail Temuan KTS
    currentRow += 2;
    ws.getCell(`A${currentRow}`).value = `2. RINCIAN LENGKAP TEMUAN KTS - ${group.title.toUpperCase()}`;
    ws.getCell(`A${currentRow}`).font = { bold: true, size: 11, color: { argb: "1F2937" } };

    currentRow++;
    const hDetail = ws.getRow(currentRow);
    hDetail.values = [
      "No",
      "Fakultas / Unit",
      "Program Studi / Target",
      "Jenjang",
      "Standar Renstra",
      "Indikator Temuan",
      "Klasifikasi",
      "Target Indikator",
      "Penilaian Auditee",
      "Nilai Auditor",
      "PLOR (Ketidaksesuaian)",
      "Akar Masalah",
      "Tindakan Koreksi",
      "Tindakan Perbaikan",
      "Tanggal Penyelesaian",
      "Tinjauan Tindakan Perbaikan",
      "Tanggal Closing",
      "Status KTS",
      "Keterangan",
      "Auditor 1",
      "Auditor 2",
      "Auditee",
    ];
    styleHeaderRow(hDetail, "0F766E");

    const detailHeaderRow = currentRow;
    let itemIdx = 1;
    (group.subGroups || []).forEach((sub) => {
      const isGroupUnit = group.type === "unit" || (sub.jenjang || "").toLowerCase() === "unit";
      const isDekanat = (sub.jenjang || "").toLowerCase() === "fakultas" || sub.key === "DEKANAT";

      (sub.items || []).forEach((item) => {
        currentRow++;
        let fVal = group.title;
        let pVal = "-";
        let jVal = "-";

        if (isGroupUnit) {
          fVal = group.title;
          pVal = "-";
          jVal = "-";
        } else if (isDekanat) {
          fVal = group.title;
          pVal = "-";
          jVal = "-";
        } else {
          fVal = group.title;
          pVal = item.Target || sub.title;
          jVal = sub.jenjang || item.Jenjang || "-";
        }

        const r = ws.addRow([
          itemIdx++,
          fVal,
          pVal,
          jVal,
          item.NamaStandar || "-",
          htmlToExcelText(item.Indikator),
          (item.Klasifikasi || "").toUpperCase(),
          formatTargetIndikator(item),
          item.Capaian || "-",
          item.CapaianAuditor || "-",
          formatPLOR(item),
          htmlToExcelText(item.AkarMasalah),
          htmlToExcelText(item.TindakanKoreksi),
          htmlToExcelText(item.TindakanPerbaikan),
          item.TanggalPenyelesaian || "-",
          htmlToExcelText(item.TinjauanTindakanPerbaikan),
          item.TanggalClosing || "-",
          formatStatusKtsLabel(item),
          item.Keterangan || "-",
          item.NamaAuditor1 || item.Auditor1 || "-",
          item.NamaAuditor2 || item.Auditor2 || "-",
          item.NamaAuditee || item.Auditee || "-",
        ]);
        r.getCell(1).alignment = { horizontal: "center" };
        r.getCell(4).alignment = { horizontal: "center" };
        r.getCell(7).alignment = { horizontal: "center" };
        r.getCell(8).alignment = { horizontal: "center" };
        r.getCell(9).alignment = { horizontal: "center" };
        r.getCell(10).alignment = { horizontal: "center" };
        r.getCell(15).alignment = { horizontal: "center" };
        r.getCell(17).alignment = { horizontal: "center" };
        r.getCell(18).alignment = { horizontal: "center" };
        r.getCell(19).alignment = { horizontal: "center" };
      });
    });

    styleDataRows(ws, detailHeaderRow);
    autoFitColumns(ws, 10, 45);
  });

  // =========================================================
  // SHEET TERAKHIR: SEMUA TEMUAN KTS (MASTER UNIVERSITAS)
  // =========================================================
  const sMasterName = getCleanSheetName("Semua Temuan KTS", usedSheetNames);
  const wsMaster = workbook.addWorksheet(sMasterName);
  wsMaster.views = [{ showGridLines: true }];

  wsMaster.mergeCells("A1:G1");
  wsMaster.getCell("A1").value = `MASTER SELURUH DATA TEMUAN KTS - TAHUN ${tahun}`;
  wsMaster.getCell("A1").font = { bold: true, size: 14, color: { argb: "1E3A8A" } };

  wsMaster.getCell("A2").value = `Total ${rawTemuan.length} Temuan KTS (Seluruh Fakultas & Unit Kerja) | Tanggal Unduh: ${new Date().toLocaleString("id-ID")}`;
  wsMaster.getCell("A2").font = { italic: true, size: 9, color: { argb: "6B7280" } };

  const hMaster = wsMaster.getRow(4);
  hMaster.values = [
    "No",
    "Fakultas / Unit",
    "Program Studi / Target",
    "Jenjang",
    "Tipe",
    "Sumber",
    "Nomor Laporan",
    "Tanggal Laporan",
    "Standar Renstra",
    "Indikator Temuan",
    "Referensi",
    "Hasil Temuan",
    "Klasifikasi",
    "Target Indikator",
    "Penilaian Auditee",
    "Nilai Auditor",
    "PLOR (Ketidaksesuaian)",
    "Akar Masalah",
    "Tindakan Koreksi",
    "Tindakan Perbaikan",
    "Tanggal Penyelesaian",
    "Tinjauan Tindakan Perbaikan",
    "Tanggal Closing",
    "Status KTS",
    "Keterangan",
    "Auditor 1",
    "Auditor 2",
    "Auditee",
  ];
  styleHeaderRow(hMaster, "1E3A8A");

  rawTemuan.forEach((item, idx) => {
    const rawJenjang = String(item.Jenjang || "").toLowerCase().trim();
    const rawType = String(item.Type || "").toLowerCase().trim();
    const isUnit = rawJenjang === "unit" || rawType === "unit";
    const isFakultas = rawJenjang === "fakultas" || rawType === "fakultas";

    // 1. Fakultas / Unit
    let colFakultasUnit = "-";
    if (item.Fakultas && item.Fakultas.trim() !== "" && item.Fakultas.trim() !== "-") {
      colFakultasUnit = item.Fakultas;
    } else if (isUnit) {
      colFakultasUnit = item.Target || "Unit Kerja";
    } else if (isFakultas) {
      colFakultasUnit = item.Target || "Fakultas";
    } else {
      colFakultasUnit = item.Target || "-";
    }

    // 2. Program Studi / Target (jika jenjang = fakultas atau jika unit maka nilainya "-")
    let colProdiTarget = "-";
    if (isFakultas || isUnit) {
      colProdiTarget = "-";
    } else {
      colProdiTarget = item.Target || "-";
    }

    // 3. Jenjang (jika bernilai unit maka ubah jadi "-")
    let colJenjang = "-";
    if (isUnit || rawJenjang === "unit") {
      colJenjang = "-";
    } else if (isFakultas || rawJenjang === "fakultas") {
      colJenjang = "-";
    } else {
      colJenjang = item.Jenjang || "-";
    }

    const row = wsMaster.addRow([
      idx + 1,
      colFakultasUnit,
      colProdiTarget,
      colJenjang,
      item.Type || "-",
      item.Source === "renstra" ? "Renstra" : "Dokumen Tambahan",
      item.NomorLaporan || "-",
      item.TanggalLaporan || "-",
      item.NamaStandar || "-",
      htmlToExcelText(item.Indikator),
      htmlToExcelText(item.Referensi),
      htmlToExcelText(item.HasilTemuan),
      (item.Klasifikasi || "").toUpperCase(),
      formatTargetIndikator(item),
      item.Capaian || "-",
      item.CapaianAuditor || "-",
      formatPLOR(item),
      htmlToExcelText(item.AkarMasalah),
      htmlToExcelText(item.TindakanKoreksi),
      htmlToExcelText(item.TindakanPerbaikan),
      item.TanggalPenyelesaian || "-",
      htmlToExcelText(item.TinjauanTindakanPerbaikan),
      item.TanggalClosing || "-",
      formatStatusKtsLabel(item),
      item.Keterangan || "-",
      item.NamaAuditor1 || item.Auditor1 || "-",
      item.NamaAuditor2 || item.Auditor2 || "-",
      item.NamaAuditee || item.Auditee || "-",
    ]);

    row.getCell(1).alignment = { horizontal: "center" };
    row.getCell(4).alignment = { horizontal: "center" };
    row.getCell(5).alignment = { horizontal: "center" };
    row.getCell(6).alignment = { horizontal: "center" };
    row.getCell(7).alignment = { horizontal: "center" };
    row.getCell(8).alignment = { horizontal: "center" };
    row.getCell(13).alignment = { horizontal: "center" };
    row.getCell(14).alignment = { horizontal: "center" };
    row.getCell(15).alignment = { horizontal: "center" };
    row.getCell(16).alignment = { horizontal: "center" };
    row.getCell(21).alignment = { horizontal: "center" };
    row.getCell(23).alignment = { horizontal: "center" };
    row.getCell(24).alignment = { horizontal: "center" };
    row.getCell(25).alignment = { horizontal: "center" };
  });

  autoFitColumns(wsMaster, 10, 50);
  styleDataRows(wsMaster, 4);

  // Generate buffer and trigger download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  downloadBlob(blob, `Laporan_Lengkap_KTS_${tahun}.xlsx`);
}

/**
 * EXPORT SPESIFIK UNTUK JENJANG TERTENTU (e.g. S1 saja)
 */
export async function exportSpecificJenjangToExcel({
  tahun = "2024",
  jenjang = "S1",
  prodiList = [],
  items = [],
}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Unpak Siamida";
  workbook.created = new Date();

  // SHEET 1: Rincian Prodi dalam Jenjang Ini
  const wsProdi = workbook.addWorksheet(`Prodi Jenjang ${jenjang}`);
  wsProdi.views = [{ showGridLines: true }];

  const STATUS_COLUMNS = [
    { key: "belum_dibuat", label: "Belum Dibuat" },
    { key: "draf", label: "Draf" },
    { key: "menunggu_verif_auditee", label: "Menunggu Verif Auditee" },
    { key: "tolak_auditee", label: "Tolak Auditee" },
    { key: "terima_auditee", label: "Terima Auditee" },
    { key: "menunggu_penyelesaian", label: "Menunggu Penyelesaian" },
    { key: "tindakan_penyelesaian", label: "Tindakan Penyelesaian" },
    { key: "tutup_kts", label: "Closed" },
  ];

  const hProdi = wsProdi.getRow(1);
  hProdi.values = [
    "No",
    "Program Studi",
    "Jenjang",
    "Fakultas",
    "Major",
    "Minor",
    "Observe",
    "Total Temuan",
    ...STATUS_COLUMNS.map((s) => s.label),
    "% Selesai",
  ];
  styleHeaderRow(hProdi, "1E3A8A");

  prodiList.forEach((p, idx) => {
    const sCounts = p.statusCounts || {};
    const cClosed = p.closedCount != null ? p.closedCount : (sCounts["tutup_kts"] || 0);
    const rate = p.total > 0 ? Math.round((cClosed / p.total) * 100) + "%" : "0%";
    const statusVals = STATUS_COLUMNS.map((s) => {
      if (s.key === "tutup_kts") return cClosed;
      return sCounts[s.key] || 0;
    });

    const isUnit = (p.jenjang || "").toLowerCase() === "unit" || (p.type || "").toLowerCase() === "unit";
    const cleanJenjang = isUnit ? "-" : (p.jenjang || "-");

    const row = wsProdi.addRow([
      idx + 1,
      p.target,
      cleanJenjang,
      p.fakultas || "-",
      p.major,
      p.minor,
      p.observe,
      p.total,
      ...statusVals,
      rate,
    ]);
    row.getCell(1).alignment = { horizontal: "center" };
    row.getCell(3).alignment = { horizontal: "center" };
    row.getCell(5).alignment = { horizontal: "center" };
    row.getCell(6).alignment = { horizontal: "center" };
    row.getCell(7).alignment = { horizontal: "center" };
    row.getCell(8).alignment = { horizontal: "center" };
    for (let c = 9; c <= 9 + STATUS_COLUMNS.length; c++) {
      row.getCell(c).alignment = { horizontal: "center" };
    }
  });

  autoFitColumns(wsProdi, 10, 38);
  styleDataRows(wsProdi, 1);

  // SHEET 2: Detail Temuan Jenjang Ini
  const wsDetail = workbook.addWorksheet(`Detail Temuan`);
  wsDetail.views = [{ showGridLines: true }];

  const hDetail = wsDetail.getRow(1);
  hDetail.values = [
    "No",
    "Program Studi",
    "Jenjang",
    "Standar Renstra",
    "Indikator / Pertanyaan",
    "Klasifikasi",
    "Target Indikator",
    "Penilaian Auditee",
    "Nilai Auditor",
    "PLOR (Ketidaksesuaian)",
    "Akar Masalah",
    "Tindakan Koreksi",
    "Tindakan Perbaikan",
    "Tanggal Penyelesaian",
    "Tinjauan Tindakan Perbaikan",
    "Tanggal Closing",
    "Status KTS",
    "Keterangan",
    "Auditor 1",
    "Auditor 2",
    "Auditee",
  ];
  styleHeaderRow(hDetail, "047857");

  items.forEach((item, idx) => {
    const rawJenjang = String(item.Jenjang || "").toLowerCase().trim();
    const isUnit = rawJenjang === "unit" || (item.Type || "").toLowerCase().trim() === "unit";
    const cleanJenjang = isUnit ? "-" : (item.Jenjang || jenjang || "-");

    const row = wsDetail.addRow([
      idx + 1,
      item.Target || "-",
      cleanJenjang,
      item.NamaStandar || "-",
      htmlToExcelText(item.Indikator),
      (item.Klasifikasi || "").toUpperCase(),
      formatTargetIndikator(item),
      item.Capaian || "-",
      item.CapaianAuditor || "-",
      formatPLOR(item),
      htmlToExcelText(item.AkarMasalah),
      htmlToExcelText(item.TindakanKoreksi),
      htmlToExcelText(item.TindakanPerbaikan),
      item.TanggalPenyelesaian || "-",
      htmlToExcelText(item.TinjauanTindakanPerbaikan),
      item.TanggalClosing || "-",
      formatStatusKtsLabel(item),
      item.Keterangan || "-",
      item.NamaAuditor1 || item.Auditor1 || "-",
      item.NamaAuditor2 || item.Auditor2 || "-",
      item.NamaAuditee || item.Auditee || "-",
    ]);
    row.getCell(1).alignment = { horizontal: "center" };
    row.getCell(3).alignment = { horizontal: "center" };
    row.getCell(6).alignment = { horizontal: "center" };
    row.getCell(7).alignment = { horizontal: "center" };
    row.getCell(8).alignment = { horizontal: "center" };
    row.getCell(9).alignment = { horizontal: "center" };
    row.getCell(14).alignment = { horizontal: "center" };
    row.getCell(16).alignment = { horizontal: "center" };
    row.getCell(17).alignment = { horizontal: "center" };
    row.getCell(18).alignment = { horizontal: "center" };
  });

  autoFitColumns(wsDetail, 10, 48);
  styleDataRows(wsDetail, 1);

  const cleanName = jenjang.replace(/[^a-zA-Z0-9]/g, "_");
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  downloadBlob(blob, `Laporan_KTS_${tahun}_Jenjang_${cleanName}.xlsx`);
}

/**
 * EXPORT SPESIFIK UNTUK PRODI / UNIT TERTENTU
 */
export async function exportSpecificProdiToExcel({
  tahun = "2024",
  prodi = {},
  items = [],
}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Unpak Siamida";
  workbook.created = new Date();

  const ws = workbook.addWorksheet("Detail Temuan");
  ws.views = [{ showGridLines: true }];

  const isUnit = (prodi.jenjang || "").toLowerCase() === "unit" || (prodi.type || "").toLowerCase() === "unit";
  const cleanJenjang = isUnit ? "-" : (prodi.jenjang || "-");

  // Info header
  ws.mergeCells("A1:C1");
  ws.getCell("A1").value = `LAPORAN TEMUAN KTS - ${prodi.target || "PRODI"}`;
  ws.getCell("A1").font = { bold: true, size: 13, color: { argb: "1E3A8A" } };

  ws.getCell("A2").value = `Jenjang: ${cleanJenjang} | Fakultas: ${prodi.fakultas || "-"} | Tahun: ${tahun}`;
  ws.getCell("A2").font = { italic: true, size: 10, color: { argb: "4B5563" } };

  ws.getCell("A3").value = `Total Temuan: ${prodi.total || items.length} (Major: ${prodi.major || 0}, Minor: ${prodi.minor || 0}, Observe: ${prodi.observe || 0})`;
  ws.getCell("A3").font = { bold: true, size: 10, color: { argb: "1F2937" } };

  const hDetail = ws.getRow(5);
  hDetail.values = [
    "No",
    "Standar Renstra",
    "Indikator Temuan",
    "Klasifikasi",
    "Target Indikator",
    "Penilaian Auditee",
    "Nilai Auditor",
    "PLOR (Ketidaksesuaian)",
    "Akar Masalah",
    "Tindakan Koreksi",
    "Tindakan Perbaikan",
    "Tanggal Penyelesaian",
    "Tinjauan Tindakan Perbaikan",
    "Tanggal Closing",
    "Status KTS",
    "Keterangan",
    "Auditor 1",
    "Auditor 2",
    "Auditee",
  ];
  styleHeaderRow(hDetail, "4C1D95");

  items.forEach((item, idx) => {
    const row = ws.addRow([
      idx + 1,
      item.NamaStandar || "-",
      htmlToExcelText(item.Indikator),
      (item.Klasifikasi || "").toUpperCase(),
      formatTargetIndikator(item),
      item.Capaian || "-",
      item.CapaianAuditor || "-",
      formatPLOR(item),
      htmlToExcelText(item.AkarMasalah),
      htmlToExcelText(item.TindakanKoreksi),
      htmlToExcelText(item.TindakanPerbaikan),
      item.TanggalPenyelesaian || "-",
      htmlToExcelText(item.TinjauanTindakanPerbaikan),
      item.TanggalClosing || "-",
      formatStatusKtsLabel(item),
      item.Keterangan || "-",
      item.NamaAuditor1 || item.Auditor1 || "-",
      item.NamaAuditor2 || item.Auditor2 || "-",
      item.NamaAuditee || item.Auditee || "-",
    ]);
    row.getCell(1).alignment = { horizontal: "center" };
    row.getCell(4).alignment = { horizontal: "center" };
    row.getCell(5).alignment = { horizontal: "center" };
    row.getCell(6).alignment = { horizontal: "center" };
    row.getCell(7).alignment = { horizontal: "center" };
    row.getCell(12).alignment = { horizontal: "center" };
    row.getCell(14).alignment = { horizontal: "center" };
    row.getCell(15).alignment = { horizontal: "center" };
    row.getCell(16).alignment = { horizontal: "center" };
  });

  autoFitColumns(ws, 10, 48);
  styleDataRows(ws, 5);

  const cleanName = (prodi.target || "Prodi").replace(/[^a-zA-Z0-9]/g, "_").slice(0, 30);
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  downloadBlob(blob, `Laporan_KTS_${tahun}_${cleanName}.xlsx`);
}

/**
 * EXPORT SPESIFIK UNTUK KELOMPOK UNIT / FAKULTAS
 */
export async function exportSpecificGroupToExcel({
  tahun = "2024",
  group = {},
}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Unpak Siamida";
  workbook.created = new Date();

  // Sheet 1: Ringkasan Sub-Unit / Prodi
  const wsSummary = workbook.addWorksheet("Ringkasan Sub-Unit");
  wsSummary.views = [{ showGridLines: true }];

  wsSummary.mergeCells("A1:E1");
  wsSummary.getCell("A1").value = `LAPORAN TEMUAN KTS - ${group.title || "UNIT"}`;
  wsSummary.getCell("A1").font = { bold: true, size: 13, color: { argb: "1E3A8A" } };

  wsSummary.getCell("A2").value = `Tipe: ${group.type || "-"} | Total Temuan: ${group.total || 0} (Major: ${group.major || 0}, Minor: ${group.minor || 0}, Observe: ${group.observe || 0}) | Tahun: ${tahun}`;
  wsSummary.getCell("A2").font = { italic: true, size: 10, color: { argb: "4B5563" } };

  const hSub = wsSummary.getRow(4);
  hSub.values = [
    "No",
    "Fakultas / Unit",
    "Program Studi / Target",
    "Jenjang",
    "Major",
    "Minor",
    "Observe",
    "Total Temuan",
    "Closed",
  ];
  styleHeaderRow(hSub, "1E3A8A");

  (group.subGroups || []).forEach((sub, idx) => {
    const isGroupUnit = group.type === "unit" || (sub.jenjang || "").toLowerCase() === "unit";
    const isDekanat = (sub.jenjang || "").toLowerCase() === "fakultas" || sub.key === "DEKANAT";

    let fVal = group.title;
    let pVal = "-";
    let jVal = "-";

    if (isGroupUnit) {
      fVal = group.title;
      pVal = "-";
      jVal = "-";
    } else if (isDekanat) {
      fVal = group.title;
      pVal = "-";
      jVal = "-";
    } else {
      fVal = group.title;
      pVal = sub.title;
      jVal = sub.jenjang;
    }

    const row = wsSummary.addRow([
      idx + 1,
      fVal,
      pVal,
      jVal,
      sub.major,
      sub.minor,
      sub.observe,
      sub.total,
      sub.closed,
    ]);
    row.getCell(1).alignment = { horizontal: "center" };
    row.getCell(4).alignment = { horizontal: "center" };
    row.getCell(5).alignment = { horizontal: "center" };
    row.getCell(6).alignment = { horizontal: "center" };
    row.getCell(7).alignment = { horizontal: "center" };
    row.getCell(8).alignment = { horizontal: "center" };
    row.getCell(9).alignment = { horizontal: "center" };
  });

  autoFitColumns(wsSummary, 10, 40);
  styleDataRows(wsSummary, 4);

  // Sheet 2: Semua Temuan di Grup Ini
  const wsDetail = workbook.addWorksheet("Detail Semua Temuan");
  wsDetail.views = [{ showGridLines: true }];

  const hDetail = wsDetail.getRow(1);
  hDetail.values = [
    "No",
    "Fakultas / Unit",
    "Program Studi / Target",
    "Jenjang",
    "Standar Renstra",
    "Indikator Temuan",
    "Klasifikasi",
    "Target Indikator",
    "Penilaian Auditee",
    "Nilai Auditor",
    "PLOR (Ketidaksesuaian)",
    "Akar Masalah",
    "Tindakan Koreksi",
    "Tindakan Perbaikan",
    "Tanggal Penyelesaian",
    "Tinjauan Tindakan Perbaikan",
    "Tanggal Closing",
    "Status KTS",
    "Keterangan",
    "Auditor 1",
    "Auditor 2",
    "Auditee",
  ];
  styleHeaderRow(hDetail, "0F766E");

  let counter = 1;
  (group.subGroups || []).forEach((sub) => {
    const isGroupUnit = group.type === "unit" || (sub.jenjang || "").toLowerCase() === "unit";
    const isDekanat = (sub.jenjang || "").toLowerCase() === "fakultas" || sub.key === "DEKANAT";

    (sub.items || []).forEach((item) => {
      let fVal = group.title;
      let pVal = "-";
      let jVal = "-";

      if (isGroupUnit) {
        fVal = group.title;
        pVal = "-";
        jVal = "-";
      } else if (isDekanat) {
        fVal = group.title;
        pVal = "-";
        jVal = "-";
      } else {
        fVal = group.title;
        pVal = item.Target || sub.title;
        jVal = sub.jenjang || item.Jenjang || "-";
      }

      const row = wsDetail.addRow([
        counter++,
        fVal,
        pVal,
        jVal,
        item.NamaStandar || "-",
        htmlToExcelText(item.Indikator),
        (item.Klasifikasi || "").toUpperCase(),
        formatTargetIndikator(item),
        item.Capaian || "-",
        item.CapaianAuditor || "-",
        formatPLOR(item),
        htmlToExcelText(item.AkarMasalah),
        htmlToExcelText(item.TindakanKoreksi),
        htmlToExcelText(item.TindakanPerbaikan),
        item.TanggalPenyelesaian || "-",
        htmlToExcelText(item.TinjauanTindakanPerbaikan),
        item.TanggalClosing || "-",
        formatStatusKtsLabel(item),
        item.Keterangan || "-",
        item.NamaAuditor1 || item.Auditor1 || "-",
        item.NamaAuditor2 || item.Auditor2 || "-",
        item.NamaAuditee || item.Auditee || "-",
      ]);
      row.getCell(1).alignment = { horizontal: "center" };
      row.getCell(4).alignment = { horizontal: "center" };
      row.getCell(7).alignment = { horizontal: "center" };
      row.getCell(8).alignment = { horizontal: "center" };
      row.getCell(9).alignment = { horizontal: "center" };
      row.getCell(10).alignment = { horizontal: "center" };
      row.getCell(15).alignment = { horizontal: "center" };
      row.getCell(17).alignment = { horizontal: "center" };
      row.getCell(18).alignment = { horizontal: "center" };
      row.getCell(19).alignment = { horizontal: "center" };
    });
  });

  autoFitColumns(wsDetail, 10, 48);
  styleDataRows(wsDetail, 1);

  const cleanName = (group.title || "Unit").replace(/[^a-zA-Z0-9]/g, "_").slice(0, 30);
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  downloadBlob(blob, `Laporan_KTS_${tahun}_${cleanName}.xlsx`);
}
