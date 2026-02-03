import { renderLabelFakultasUnit } from "@/Common/Utils";
import React, { useMemo } from "react";
import { Link } from "react-router-dom";

export default function BeritaAcaraFilterContent({
  datas = [],
  isGroup = false,
}) {
  const groupedData = useMemo(() => {
    if (!isGroup) return null;

    return datas.reduce((acc, item) => {
      const fakultas = item.Fakultas || "UNIT";
      const jenjang = item.Jenjang || "UNIT";

      if (!acc[fakultas]) acc[fakultas] = {};
      if (!acc[fakultas][jenjang]) acc[fakultas][jenjang] = [];

      acc[fakultas][jenjang].push(item);
      return acc;
    }, {});
  }, [datas, isGroup]);

  if (isGroup && groupedData) {
    return (
      <div className="space-y-6">
        {Object.entries(groupedData).map(([fakultas, jenjangs]) => (
          <div
            key={fakultas}
            className="border rounded-xl p-4 bg-[#F3F4F6] shadow-sm"
          >
            {/* Header Fakultas */}
            <div className="mb-4 border-b pb-2">
              <h2 className="font-bold text-lg">{fakultas}</h2>
            </div>

            {/* Jenjang / Kategori */}
            <div className="space-y-6">
              {Object.entries(jenjangs).map(([jenjang, items]) => (
                <div key={jenjang}>
                  {fakultas !== jenjang.toUpperCase() && (
                    <h3 className="font-semibold text-sm text-gray-600 mb-2">
                      Kategori: {jenjang.toUpperCase()}
                    </h3>
                  )}

                  <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
                    {items.map((target) => (
                      <Link
                        key={target.UUID}
                        to={`/berita_acara/${target.UUID}`}
                        className="bg-white border rounded-lg px-3 py-4 hover:border-green-500 hover:shadow transition"
                      >
                        <p className="font-medium text-sm">{target.Nama}</p>
                        <p className="text-xs text-gray-500">
                          Klik untuk melihat berita acara
                        </p>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
      {datas.map((target, idx) => (
        <Link
          key={target.UUID ?? idx}
          to={`/berita_acara/${target.UUID}`}
          className="border rounded-lg px-3 py-8 hover:border-green-500 hover:shadow-md transition cursor-pointer"
        >
          <h3 className="font-semibold text-sm mb-1">
            {renderLabelFakultasUnit(target)}
          </h3>
          <p className="text-xs text-gray-500">
            Klik untuk melihat berita acara
          </p>
        </Link>
      ))}
    </div>
  );
}