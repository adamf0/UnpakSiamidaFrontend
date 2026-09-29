import React, { useEffect, useRef, useState } from "react";
import { useToast } from "@/Providers/ToastProvider";
import { useContent } from "@/Providers/ContentProvider";
import Navbar from "@/Components/Navbar";
import ChangeLevelModal from "@/Components/ChangeLevelModal";
import { useAuth } from "@/Providers/AuthProvider";
import { useParams } from "react-router-dom";
import { isEmpty, renderLabelFakultasUnit } from "@/Common/Utils";
import ConfirmDeleteDialog from "@/Components/ConfirmDeleteDialog";
import BeritaAcaraFormModal from "./BeritaAcaraFormModal";
import BeritaAcaraFilterContent from "./BeritaAcaraFilterContent";
import BeritaAcaraList from "./BeritaAcaraList";
import { BsFilter, BsPlus } from "react-icons/bs";

//[pr] belum tambah pengecekan penugasan audit di tahun & unit yg dicari pada list group
const BeritaAcaraPage = () => {
  const { target } = useParams();
  const isBeritaAcara = !isEmpty(target);
  const { addToast } = useToast();
  const { getValidToken } = useAuth();
  const [selectedRow, setSelectedRow] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [infoTarget, setInfoTarget] = useState(null);
  const { positionYear, level, listLevel, setLevel, openChangeLevel, setOpenChangeLevel } =
    useContent();

  const [loading, setLoading] = useState(false);
  const [datas, setDatas] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("new");

  const fetchData = async () => {
    if (isEmpty(getValidToken())) return;

    setLoading(true);
    try {
      const res = await fetch(
        isBeritaAcara
          ? `http://localhost:3000/beritaacaras?mode=sse&filters=target:eq:${target}`
          : `http://localhost:3000/fakultasunits?mode=sse`,
        {
          headers: {
            Accept: "text/event-stream",
            Authorization: `Bearer ${getValidToken()}`,
          },
        },
      );

      if (!res.body) {
        throw new Error("SSE not supported");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");

      let buffer = "";
      const result = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let index;
        while ((index = buffer.indexOf("\n\n")) !== -1) {
          const event = buffer.slice(0, index).trim();
          buffer = buffer.slice(index + 2);

          if (!event.startsWith("data:")) continue;

          const payload = event.replace(/^data:\s*/, "");

          if (!payload || payload === "start" || payload === "done") continue;

          try {
            const parsed = JSON.parse(payload);

            result.push(parsed);
          } catch (err) {
            console.error("JSON parse error:", payload);
          }
        }
      }

      // console.log(result)
      setDatas(result);
    } finally {
      setLoading(false);
    }
  };

  const openNew = () => {
    setModalMode("new");
    setSelectedRow(null);
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setModalMode("edit");
    setSelectedRow(row);
    setModalOpen(true);
  };

  const openDelete = (row) => {
    setSelectedRow(row);
    setConfirmDelete(true);
  };

  const downloadHandler = async (row) => {
    try {
      if (isEmpty(getValidToken())) return;

      const responsePublish = await fetch(
        `http://localhost:3000/beritaacara/publish/${row.UUID}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${getValidToken()}`,
          },
        },
      );
      const dataPublish = await responsePublish.json();

      if (!responsePublish.ok) {
        addToast("error", dataPublish?.message || "Data tidak ditemukan");
      } else{
        const response = await fetch(
          `http://localhost:3000/beritaacara/export/${row.UUID}?ctxtahun=2024`,
          {
            headers: {
              Accept: "application/pdf",
              Authorization: `Bearer ${getValidToken()}`,
            },
          }
        );

        const dataDownload = response.headers.get("Content-Type") || "";

        // Jika JSON → tampilkan error
        if (dataDownload.includes("application/json")) {
          const json = await response.json();
          alert(json.message || "Terjadi error pada aplikasi");
          return;
        }

        // Jika bukan PDF atau status bukan 200
        if (!response.ok || !dataDownload.includes("application/pdf")) {
          alert("Ada masalah pada server");
          return;
        }

        // Handle streaming download
        const contentLength = response.headers.get("Content-Length");
        const total = contentLength ? parseInt(contentLength, 10) : 0;

        const reader = response.body.getReader();
        const chunks = [];
        let received = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          chunks.push(value);
          received += value.length;

          if (total) {
            console.log(
              `Progress: ${Math.round((received / total) * 100)}%`
            );
          }
        }

        const blob = new Blob(chunks, { type: "application/pdf" });
        const url = window.URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = "berita_acara.pdf";
        document.body.appendChild(a);
        a.click();
        a.remove();

        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan jaringan");
    }
  };

  const deleteBeritaAcara = async () => {
    if (isEmpty(getValidToken())) return;

    const res = await fetch(
      `http://localhost:3000/beritaacara/${selectedRow.UUID}?ctxtahun=${positionYear}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${getValidToken()}`,
        },
      },
    );
    const data = await res.json();

    if (res.ok) {
      addToast("success", "Data berhasil dihapus");
    } else {
      addToast("error", data?.message || "Data tidak ditemukan");
    }
    
    fetchData();
    setConfirmDelete(false);
  };

  const fetchInfoTarget = async () => {
    if (isEmpty(target)) {
      setInfoTarget(null);
      return;
    }
    if (isEmpty(getValidToken())) return;

    const res = await fetch(`http://localhost:3000/fakultasunit/${target}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${getValidToken()}`,
      },
    });
    const data = await res.json();

    if (res.ok) {
      setInfoTarget(data);
    } else {
      addToast("error", data?.message || "Data tidak ditemukan");
    }
  };

  useEffect(() => {
    fetchData();
    fetchInfoTarget();
  }, [target]);

  function renderContent() {
    if (loading) {
      return <div className="text-gray-500">Loading...</div>;
    }
    if (!isBeritaAcara) {
      return <BeritaAcaraFilterContent datas={datas} isGroup={true} />;
    }

    return (
      <BeritaAcaraList
        datas={datas}
        onEdit={openEdit}
        onDelete={openDelete}
        onDownload={downloadHandler}
      />
    );
  }

  return (
    <>
      <Navbar
        renderChangeLevelModal={() => (
          <ChangeLevelModal
            open={openChangeLevel}
            onClose={() => setOpenChangeLevel(false)}
            levels={listLevel}
            currentLevel={level}
            onSubmit={(val) => {
              setLevel(val);
              setOpenChangeLevel(false);
            }}
          />
        )}
      />
      <div className="p-3 bg-white space-y-3">
        <div className="flex justify-between wrap gap-2">
          <nav className="mb-4" aria-label="Breadcrumb">
            <ol className="flex items-center gap-2 text-lg text-gray-500">
              <li>
                <span className="font-semibold text-black">Berita Acara</span>
              </li>

              {infoTarget?.Nama && (
                <>
                  <li>/</li>
                  <li className="truncate max-w-[200px]">
                    {renderLabelFakultasUnit(infoTarget)}
                  </li>
                </>
              )}
            </ol>
          </nav>

          <div className="flex gap-2">
            {isBeritaAcara && (
              <button
                className="px-3 py-2 bg-purple-600 text-white rounded-lg"
                onClick={() => openNew()}
              >
                <BsPlus />
              </button>
            )}
            {!isBeritaAcara && (
              <button
                className="px-3 py-2 bg-purple-600 text-white rounded-lg"
                onClick={() => {}}
              >
                <BsFilter />
              </button>
            )}
          </div>
        </div>

        {/* Grid card fakultas (auto minmax) */}
        {isBeritaAcara ? (
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
            {renderContent()}
          </div>
        ) : (
          <div className="space-y-10">{renderContent()}</div>
        )}
      </div>

      <BeritaAcaraFormModal
        open={modalOpen}
        mode={modalMode}
        data={selectedRow}
        fakultasunit={target}
        namafakultasunit={renderLabelFakultasUnit(infoTarget)}
        onClose={() => setModalOpen(false)}
        onSuccess={() => fetchData()}
      />

      <ConfirmDeleteDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={async () => deleteBeritaAcara()}
      />
    </>
  );
};

export default BeritaAcaraPage;
