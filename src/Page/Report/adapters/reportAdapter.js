import api from "@/Common/api";

/**
 * Custom error thrown when accessing legacy unsupported data
 */
export class LegacyAdapterError extends Error {
  constructor(message = "masih migrasi fitur", year = 2023) {
    super(message);
    this.name = "LegacyAdapterError";
    this.code = "LEGACY_V1_REJECTED";
    this.year = year;
    this.version = "v1";
  }
}

/**
 * Base Abstract Report Adapter
 */
export class ReportAdapter {
  getVersion() {
    throw new Error("getVersion() must be implemented");
  }

  isSupportedYear(year) {
    throw new Error("isSupportedYear() must be implemented");
  }

  async fetchTahunList() {
    throw new Error("fetchTahunList() must be implemented");
  }

  async fetchIndikatorTree(year) {
    throw new Error("fetchIndikatorTree() must be implemented");
  }

  async fetchMonitoringIndikator(year, indikatorUuid) {
    throw new Error("fetchMonitoringIndikator() must be implemented");
  }

  async fetchTemuan(year) {
    throw new Error("fetchTemuan() must be implemented");
  }
}

/**
 * ReportAdapterV1: Legacy data adapter (year <= 2023)
 * Calls Golang backend which rejects with "masih migrasi fitur"
 */
export class ReportAdapterV1 extends ReportAdapter {
  constructor(year = 2023) {
    super();
    this.year = year;
  }

  getVersion() {
    return "v1";
  }

  isSupportedYear(year) {
    return false;
  }

  getRejectionInfo() {
    return {
      status: "rejected",
      version: "v1",
      year: this.year,
      title: "Data Tahun Legacy (v1)",
      message: "masih migrasi fitur",
      recommendedYear: "2024",
    };
  }

  async fetchTahunList() {
    try {
      const res = await api.get("/tahunrenstras?mode=all");
      const list = (res || []).map((j) => ({
        id: j.Tahun,
        nama: j.Tahun,
        Tahun: j.Tahun,
        isLegacy: Number(j.Tahun) <= 2023,
      }));
      if (!list.some((y) => String(y.id) === "2023")) {
        list.push({ id: "2023", nama: "2023", Tahun: "2023", isLegacy: true });
      }
      return list.sort((a, b) => Number(b.id) - Number(a.id));
    } catch {
      return [
        { id: "2025", nama: "2025", Tahun: "2025", isLegacy: false },
        { id: "2024", nama: "2024", Tahun: "2024", isLegacy: false },
        { id: "2023", nama: "2023", Tahun: "2023", isLegacy: true },
      ];
    }
  }

  async fetchIndikatorTree(year) {
    // Memanggil backend golang -> golang adapter v1 langsung reject "masih migrasi fitur"
    return await api.get(`/indikatorrenstra/tree/${year}`);
  }

  async fetchMonitoringIndikator(year, indikatorUuid) {
    // Memanggil backend golang -> golang adapter v1 langsung reject "masih migrasi fitur"
    return await api.get(`/monitoringindikator/${year}/${indikatorUuid}?mode=all`);
  }

  async fetchTemuan(year) {
    // Memanggil backend golang -> golang adapter v1 langsung reject "masih migrasi fitur"
    return await api.get(`/kts/temuan?tahun=${year}`);
  }
}

/**
 * ReportAdapterV2: Current Renstra adapter (year >= 2024)
 * Handles modern Renstra and KTS data aggregation
 */
export class ReportAdapterV2 extends ReportAdapter {
  constructor(year = 2024) {
    super();
    this.year = year;
  }

  getVersion() {
    return "v2";
  }

  isSupportedYear(year) {
    const num = Number(year);
    return !isNaN(num) && num >= 2024;
  }

  async fetchTahunList() {
    try {
      const res = await api.get("/tahunrenstras?mode=all");
      const list = (res || []).map((j) => ({
        id: j.Tahun,
        nama: j.Tahun,
        Tahun: j.Tahun,
        isLegacy: Number(j.Tahun) <= 2023,
      }));
      // Pastikan 2023 selalu muncul di list
      if (!list.some((y) => String(y.id) === "2023")) {
        list.push({ id: "2023", nama: "2023", Tahun: "2023", isLegacy: true });
      }
      return list.sort((a, b) => Number(b.id) - Number(a.id));
    } catch {
      return [
        { id: "2025", nama: "2025", Tahun: "2025", isLegacy: false },
        { id: "2024", nama: "2024", Tahun: "2024", isLegacy: false },
        { id: "2023", nama: "2023", Tahun: "2023", isLegacy: true },
      ];
    }
  }

  async fetchIndikatorTree(year) {
    const res = await api.get(`/indikatorrenstra/tree/${year}`);
    return (res || []).map((item) => ({
      id: item.IndikatorUuid,
      nama: `${item.Pointing ? item.Pointing + ". " : ""}${item.Indikator}`,
      ...item,
    }));
  }

  async fetchMonitoringIndikator(year, indikatorUuid) {
    const res = await api.get(`/monitoringindikator/${year}/${indikatorUuid}?mode=all`);
    const data = res || [];

    return data
      .filter((row) => {
        const tipe = String(row.TipeTarget || "numerik").toLowerCase().trim();
        return ["numerik", "range", "kategori"].includes(tipe);
      })
      .map((row) => {
        const tipe = String(row.TipeTarget || "numerik").toLowerCase().trim();
        const isCategory = tipe === "kategori";
        let capaianAuditee = row.Capaian;
        let capaianAuditor = row.CapaianAuditor;

        if (isCategory) {
          const validStatus = ["terlaksana", "tercapai", "ya", "ada", "1", "100", "selesai"];
          const auditeeStr = String(capaianAuditee || "").toLowerCase().trim();
          const auditorStr = String(capaianAuditor || "").toLowerCase().trim();
          capaianAuditee = validStatus.includes(auditeeStr) ? 100 : 0;
          capaianAuditor = validStatus.includes(auditorStr) ? 100 : 0;
        } else {
          capaianAuditee = Number(capaianAuditee) || 0;
          capaianAuditor = Number(capaianAuditor) || 0;
        }

        return {
          ...row,
          TipeTarget: tipe,
          NormalizedCapaian: capaianAuditee,
          NormalizedCapaianAuditor: capaianAuditor,
        };
      });
  }

  async fetchTemuan(year) {
    const res = await api.get(`/kts/temuan?tahun=${year}`);
    return res || [];
  }

  /**
   * Helper to normalize Jenjang naming
   */
  getCleanJenjang(item) {
    const raw = (item.Jenjang || "").trim();
    if (raw) {
      if (raw.toLowerCase() === "profesi") return "Profesi";
      if (raw.toLowerCase() === "spesialis") return "Spesialis";
      return raw.toUpperCase();
    }
    const match = (item.Target || "").match(/\((S1|S2|S3|D3|D4|Profesi|Spesialis)\)/i);
    if (match) return match[1].toUpperCase();
    if (item.Type === "fakultas") return "Fakultas";
    if (item.Type === "unit") return "Unit";
    return "Lainnya";
  }

  /**
   * Aggregate temuan by Jenjang (all prodi under one umbrella jenjang)
   * e.g., S1, S2, D3, Profesi
   */
  aggregateByJenjang(temuanList = []) {
    const jenjangMap = {};

    temuanList.forEach((item) => {
      const jenjang = this.getCleanJenjang(item);

      if (!jenjangMap[jenjang]) {
        jenjangMap[jenjang] = {
          jenjang,
          minor: 0,
          major: 0,
          observe: 0,
          total: 0,
          prodiSet: new Set(),
          items: [],
        };
      }

      const klasifikasi = (item.Klasifikasi || "").toLowerCase().trim();
      if (klasifikasi === "minor") jenjangMap[jenjang].minor++;
      else if (klasifikasi === "major") jenjangMap[jenjang].major++;
      else if (klasifikasi === "observe") jenjangMap[jenjang].observe++;

      jenjangMap[jenjang].total++;
      if (item.Target) jenjangMap[jenjang].prodiSet.add(item.Target);
      jenjangMap[jenjang].items.push(item);
    });

    // Convert to sorted array
    const orderPreference = ["S1", "S2", "S3", "D3", "D4", "Profesi", "Fakultas", "Unit", "Lainnya"];
    return Object.values(jenjangMap)
      .map((g) => ({
        ...g,
        totalProdi: g.prodiSet.size,
      }))
      .sort((a, b) => {
        const idxA = orderPreference.indexOf(a.jenjang);
        const idxB = orderPreference.indexOf(b.jenjang);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.jenjang.localeCompare(b.jenjang);
      });
  }

  /**
   * Aggregate temuan by Jenjang x Prodi (specific temuan breakdown per prodi)
   */
  aggregateByJenjangProdi(temuanList = []) {
    const prodiMap = {};

    temuanList.forEach((item) => {
      const targetName = item.Target || "Tanpa Nama";
      const jenjang = this.getCleanJenjang(item);

      const key = `${jenjang}___${targetName}`;
      if (!prodiMap[key]) {
        prodiMap[key] = {
          key,
          target: targetName,
          targetUuid: item.TargetUUID,
          jenjang,
          fakultas: item.Fakultas || "-",
          type: item.Type || "prodi",
          minor: 0,
          major: 0,
          observe: 0,
          total: 0,
          closedCount: 0,
          statusCounts: {},
          items: [],
        };
      }

      const klasifikasi = (item.Klasifikasi || "").toLowerCase().trim();
      if (klasifikasi === "minor") prodiMap[key].minor++;
      else if (klasifikasi === "major") prodiMap[key].major++;
      else if (klasifikasi === "observe") prodiMap[key].observe++;

      prodiMap[key].total++;

      // Track granular KTS status
      const rawStatus = (item.Status || "").toLowerCase().trim();
      const isClosed = rawStatus === "tutup_kts" || (item.Keterangan || "").toLowerCase().trim() === "close";
      const statusKey = isClosed ? "tutup_kts" : (rawStatus || "draf");

      prodiMap[key].statusCounts[statusKey] = (prodiMap[key].statusCounts[statusKey] || 0) + 1;
      if (isClosed) {
        prodiMap[key].closedCount++;
      }
      prodiMap[key].items.push(item);
    });

    return Object.values(prodiMap).sort((a, b) => {
      // Sort by jenjang first, then by total temuan descending
      if (a.jenjang !== b.jenjang) return a.jenjang.localeCompare(b.jenjang);
      return b.total - a.total;
    });
  }
}

/**
 * Factory function to retrieve the appropriate Report Adapter instance
 * @param {string|number} year
 * @returns {ReportAdapter}
 */
export function getReportAdapter(year) {
  const numYear = Number(year);
  if (!year || isNaN(numYear) || numYear <= 2023) {
    return new ReportAdapterV1(year || 2023);
  }
  return new ReportAdapterV2(numYear);
}
