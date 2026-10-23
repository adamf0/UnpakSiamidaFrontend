import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Key,
  Sparkles,
  Building2,
  GraduationCap,
  Shield,
  Layers,
  Crown,
  BookOpen,
  BadgeCheck,
  Lock,
  Unlock,
  X,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";
import AdminUniqueKey3D from "./AdminUniqueKey3D";
import RealisticVaultUnlock3D from "./RealisticVaultUnlock3D";

/**
 * Rak Gantungan Kunci Master Admin (Vault Key Rack / Pegboard)
 * Tampilan interaktif, elastis, dan tak kaku bagi Admin untuk memilih kunci fisik
 * unik dari Fakultas, Prodi, atau Unit sebelum membuka lemari arsip dokumen program kerja.
 */
export default function AdminKeyRack({
  units = [], // Daftar fakultas/prodi/unit
  tahun = "2025",
  onSelectUnitKey, // Callback ketika kunci dipilih -> memicu pembukaan lemari
}) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all"); // "all" | "fakultas" | "s1" | "s2" | "s3" | "d4" | "d3" | "profesi" | "unit"
  const [unlockingUnit, setUnlockingUnit] = useState(null); // Unit yang sedang diproses pembukaan kuncinya
  const [jiggleTrigger, setJiggleTrigger] = useState(0); // Trigger efek goyang bandul gantungan kunci
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Kategori filter dengan ikon dan hitungan dinamis:
  // semua, fakultas, prodi s1, prodi s2, prodi s3, prodi d4, prodi d3, profesi, unit
  const categories = useMemo(() => {
    const getType = (u) => (u?.Type || u?.type || "").toLowerCase().trim();
    const getJenjang = (u) => (u?.Jenjang || u?.jenjang || "").toLowerCase().trim();

    return [
      {
        id: "all",
        label: "Semua Kunci",
        icon: Key,
        count: units.length,
      },
      {
        id: "fakultas",
        label: "Fakultas",
        icon: Building2,
        count: units.filter((u) => getType(u) === "fakultas").length,
      },
      {
        id: "s1",
        label: "Prodi S1",
        icon: GraduationCap,
        count: units.filter(
          (u) => getType(u) === "prodi" && getJenjang(u) === "s1"
        ).length,
      },
      {
        id: "s2",
        label: "Prodi S2",
        icon: Sparkles,
        count: units.filter(
          (u) => getType(u) === "prodi" && getJenjang(u) === "s2"
        ).length,
      },
      {
        id: "s3",
        label: "Prodi S3",
        icon: Crown,
        count: units.filter(
          (u) => getType(u) === "prodi" && getJenjang(u) === "s3"
        ).length,
      },
      {
        id: "d4",
        label: "Prodi D4",
        icon: BookOpen,
        count: units.filter(
          (u) => getType(u) === "prodi" && getJenjang(u) === "d4"
        ).length,
      },
      {
        id: "d3",
        label: "Prodi D3",
        icon: Layers,
        count: units.filter(
          (u) => getType(u) === "prodi" && getJenjang(u) === "d3"
        ).length,
      },
      {
        id: "profesi",
        label: "Profesi",
        icon: BadgeCheck,
        count: units.filter(
          (u) =>
            (getType(u) === "prodi" &&
              (getJenjang(u) === "profesi" || getJenjang(u).includes("prof"))) ||
            getType(u) === "profesi"
        ).length,
      },
      {
        id: "unit",
        label: "Unit Kerja",
        icon: Shield,
        count: units.filter((u) => getType(u) === "unit").length,
      },
    ];
  }, [units]);

  // Filter daftar unit berdasarkan pencarian dan kategori
  const filteredUnits = useMemo(() => {
    let result = [...units];
    const getType = (u) => (u?.Type || u?.type || "").toLowerCase().trim();
    const getJenjang = (u) => (u?.Jenjang || u?.jenjang || "").toLowerCase().trim();

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (u) =>
          (u.Nama || u.nama || "").toLowerCase().includes(q) ||
          (u.Fakultas || u.fakultas || "").toLowerCase().includes(q) ||
          (u.Jenjang || u.jenjang || "").toLowerCase().includes(q)
      );
    }

    if (typeFilter === "fakultas") {
      result = result.filter((u) => getType(u) === "fakultas");
    } else if (typeFilter === "s1") {
      result = result.filter(
        (u) => getType(u) === "prodi" && getJenjang(u) === "s1"
      );
    } else if (typeFilter === "s2") {
      result = result.filter(
        (u) => getType(u) === "prodi" && getJenjang(u) === "s2"
      );
    } else if (typeFilter === "s3") {
      result = result.filter(
        (u) => getType(u) === "prodi" && getJenjang(u) === "s3"
      );
    } else if (typeFilter === "d4") {
      result = result.filter(
        (u) => getType(u) === "prodi" && getJenjang(u) === "d4"
      );
    } else if (typeFilter === "d3") {
      result = result.filter(
        (u) => getType(u) === "prodi" && getJenjang(u) === "d3"
      );
    } else if (typeFilter === "profesi") {
      result = result.filter(
        (u) =>
          (getType(u) === "prodi" &&
            (getJenjang(u) === "profesi" || getJenjang(u).includes("prof"))) ||
          getType(u) === "profesi"
      );
    } else if (typeFilter === "unit") {
      result = result.filter((u) => getType(u) === "unit");
    }

    return result;
  }, [units, search, typeFilter]);

  // Handler interaktif pembukaan kunci
  const handleKeyClick = (unit) => {
    setUnlockingUnit(unit);
  };

  const handleResetFilters = () => {
    setSearch("");
    setTypeFilter("all");
  };

  const activeCategoryObj = categories.find((c) => c.id === typeFilter);

  return (
    <div className="relative rounded-3xl overflow-hidden border border-stone-200/90 shadow-sm bg-gradient-to-b from-[#2B1810]/5 via-white to-stone-100/40">
      {/* 1. BILAH PENCARIAN & FILTER KATEGORI KUNCI INTERAKTIF */}
      <div className="p-4 sm:p-5 border-b border-stone-200/90 bg-stone-50/95 backdrop-blur-xs flex flex-col gap-3.5 select-none">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3.5">
          {/* SEARCH INPUT DENGAN MICRO-INTERACTIONS & GLOW RING */}
          <div className="relative flex-1 w-full group">
            <motion.div
              animate={{
                scale: isSearchFocused ? 1.15 : 1,
                color: isSearchFocused ? "#D97706" : "#A8A29E",
              }}
              transition={{ duration: 0.2 }}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            >
              <Search className="w-4 h-4" />
            </motion.div>

            <input
              type="text"
              placeholder="Cari kunci (contoh: Hukum, Farmasi, BPSI, S1)..."
              value={search}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 text-xs bg-white border border-stone-300 focus:border-amber-500 focus:ring-3 focus:ring-amber-500/20 rounded-2xl outline-none text-stone-900 placeholder-stone-400 shadow-2xs transition-all duration-200"
            />

            <AnimatePresence>
              {search && (
                <motion.button
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-200/80 transition cursor-pointer"
                  title="Hapus kata kunci pencarian"
                >
                  <X className="w-3.5 h-3.5" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
          
        </div>

        {/* FILTER KATEGORI BUTTONS DENGAN SLIDING PILL GLIDER (SPRING PHYSICS) */}
        <div className="flex items-center gap-1.5 p-1 bg-stone-200/60 rounded-2xl border border-stone-300/50 shadow-inner w-fit max-w-full overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden flex-nowrap sm:flex-wrap">
          {categories.map((cat) => {
            const isActive = typeFilter === cat.id;
            const Icon = cat.icon;
            return (
              <motion.button
                key={cat.id}
                onClick={() => setTypeFilter(cat.id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
                className={`relative px-3.5 py-2 rounded-xl text-xs font-bold transition-colors duration-200 flex items-center gap-2 cursor-pointer z-10 shrink-0 ${
                  isActive ? "text-white" : "text-stone-600 hover:text-stone-900"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeCategoryPill"
                    className="absolute inset-0 bg-gradient-to-r from-amber-600 via-amber-700 to-amber-600 rounded-xl shadow-md border border-amber-500/50 -z-10"
                    transition={{ type: "spring", stiffness: 420, damping: 30 }}
                  />
                )}
                <Icon
                  className={`w-3.5 h-3.5 transition-colors ${
                    isActive ? "text-amber-200" : "text-stone-400"
                  }`}
                />
                <span>{cat.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono tracking-tight font-black transition-colors ${
                    isActive
                      ? "bg-black/25 text-amber-100 border border-amber-400/40"
                      : "bg-white/80 text-stone-500 border border-stone-200"
                  }`}
                >
                  {cat.count}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* 2. PEGBOARD / DINDING GANTUNGAN KUNCI 3D DENGAN FLUID SPRING GRID */}
      <div
        className="p-6 sm:p-8 min-h-[460px] relative bg-stone-50/95 backdrop-blur-xs"
        // style={{
        //   backgroundColor: "#FAF7F2",
        //   backgroundImage: `
        //     radial-gradient(#D6C7B2 1.5px, transparent 1.5px),
        //     linear-gradient(to bottom, rgba(0,0,0,0.02), rgba(0,0,0,0.05))
        //   `,
        //   backgroundSize: "28px 28px, 100% 100%",
        // }}
      >
        <AnimatePresence mode="wait">
          {filteredUnits.length === 0 ? (
            <motion.div
              key="empty-state"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.25 }}
              className="py-24 text-center text-stone-500 max-w-md mx-auto space-y-3"
            >
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-700">
                <Lock className="w-8 h-8" />
              </div>
              <h4 className="font-bold text-stone-800 text-base">Tidak Ada Kunci yang Cocok</h4>
              <p className="text-xs text-stone-500 leading-relaxed">
                Tidak ditemukan kunci dengan kriteria pencarian "{search}". Silakan periksa kembali
                ejaan atau setel ulang filter.
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md cursor-pointer transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Tampilkan Semua Kunci</span>
              </motion.button>
            </motion.div>
          ) : (
            <motion.div
              layout
              key="key-grid"
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-y-10 gap-x-6 justify-items-center py-4"
            >
              <AnimatePresence mode="popLayout">
                {filteredUnits.map((u, i) => (
                  <motion.div
                    layout
                    key={u.UUID || u.ID || `${u.Type || u.type}-${u.Nama || u.nama}-${i}`}
                    initial={{ opacity: 0, scale: 0.82, y: 16 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{
                      opacity: 0,
                      scale: 0.78,
                      y: -16,
                      transition: { duration: 0.2 },
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 360,
                      damping: 26,
                      mass: 0.8,
                    }}
                  >
                    <AdminUniqueKey3D
                      unit={u}
                      index={i}
                      jiggleKey={jiggleTrigger}
                      onSelectKey={handleKeyClick}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 4. ANIMASI INTERAKTIF MEMASUKKAN KUNCI & MEMBUKA BRANKAS REALISTIS (3D VAULT UNLOCK) */}
      {unlockingUnit && (
        <RealisticVaultUnlock3D
          unit={unlockingUnit}
          onComplete={(u) => {
            onSelectUnitKey(u);
            setUnlockingUnit(null);
          }}
          onCancel={() => setUnlockingUnit(null)}
        />
      )}
    </div>
  );
}
