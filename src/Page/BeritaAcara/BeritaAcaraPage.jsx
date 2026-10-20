import React, { useEffect, useRef, useState } from "react";
import { useToast } from "@/Providers/ToastProvider";
import { useContent } from "@/Providers/ContentProvider";
import Navbar from "@/Components/Navbar";
import ChangeLevelModal from "@/Components/ChangeLevelModal";
import { useAuth } from "@/Providers/AuthProvider";
import { useParams, Link } from "react-router-dom";
import { isEmpty, renderLabelFakultasUnit } from "@/Common/Utils";
import ConfirmDeleteDialog from "@/Components/ConfirmDeleteDialog";
import BeritaAcaraFormModal from "./BeritaAcaraFormModal";
import BeritaAcaraFilterContent from "./BeritaAcaraFilterContent";
import BeritaAcaraList from "./BeritaAcaraList";
import { Plus, Filter, ScrollText } from "lucide-react";
import Tooltip from "@/Components/Tooltip";
import PageHeader from "@/Components/PageHeader";
import { apiClient, API_BASE_URL } from "@/Common/api";

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
          ? `${API_BASE_URL}/beritaacaras?mode=sse&filters=target:eq:${target}`
          : `${API_BASE_URL}/fakultasunits?mode=sse`,
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
      try {
        await apiClient.get(`/beritaacara/publish/${row.UUID}`);
      } catch (err) {
        addToast("error", err?.message || "Data tidak ditemukan");
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/beritaacara/export/${row.UUID}?ctxtahun=2024`,
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
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan jaringan");
    }
  };

  const deleteBeritaAcara = async () => {
    if (!selectedRow?.UUID) return;

    try {
      await apiClient.delete(
        `/beritaacara/${selectedRow.UUID}?ctxtahun=${positionYear}`
      );
      addToast("success", "Data berhasil dihapus");
    } catch (err) {
      addToast("error", err?.message || "Data tidak ditemukan");
    } finally {
      fetchData();
      setConfirmDelete(false);
    }
  };

  const fetchInfoTarget = async () => {
    if (isEmpty(target)) {
      setInfoTarget(null);
      return;
    }

    try {
      const res = await apiClient.get(`/fakultasunit/${target}`);
      setInfoTarget(res?.data ?? res);
    } catch (err) {
      addToast("error", err?.message || "Data tidak ditemukan");
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
      <div className="p-4 sm:p-6 bg-gray-50 min-h-screen space-y-4">
        <PageHeader
          icon={ScrollText}
          title="Berita Acara"
          subtitle={
            infoTarget?.Nama
              ? `Kelola berita acara hasil audit mutu internal untuk ${renderLabelFakultasUnit(infoTarget)}`
              : "Kelola dan cetak berita acara hasil audit mutu internal unit & fakultas"
          }
        />

        {isBeritaAcara && (
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center justify-between gap-4">
            <nav aria-label="Breadcrumb">
              <ol className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                <li>
                  <Link
                    to="/berita_acara"
                    className="hover:text-purple-600 transition-colors"
                  >
                    Berita Acara
                  </Link>
                </li>
                {infoTarget?.Nama && (
                  <>
                    <li>/</li>
                    <li className="text-gray-900 font-semibold truncate max-w-[300px]">
                      {renderLabelFakultasUnit(infoTarget)}
                    </li>
                  </>
                )}
              </ol>
            </nav>

            <Tooltip content="Tambah Berita Acara">
              <button
                type="button"
                className="w-9 h-9 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center justify-center transition shadow-xs shrink-0"
                onClick={() => openNew()}
                aria-label="Tambah Berita Acara"
              >
                <Plus className="w-5 h-5" />
              </button>
            </Tooltip>
          </div>
        )}

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
