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

const BeritaAcaraPage = () => {
  const { target } = useParams();
  const isBeritaAcara = !isEmpty(target);
  const { addToast } = useToast();
  const { getValidToken } = useAuth();
  const [selectedRow, setSelectedRow] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [infoTarget, setInfoTarget] = useState(null);
  const { level, listLevel, setLevel, openChangeLevel, setOpenChangeLevel } =
    useContent();

  const [loading, setLoading] = useState(false);
  const [datas, setDatas] = useState([]);
  const actionRef = useRef(null);
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

  const deleteBeritaAcara = async () => {
    if (isEmpty(getValidToken())) return;

    // const res = await fetch(
    //   `http://localhost:3000/beritaacara/${selectedRow.UUID}`,
    //   {
    //     method: "DELETE",
    //     headers: {
    //       Authorization: `Bearer ${getValidToken()}`,
    //     },
    //   },
    // );
    // const data = await res.json();

    // if (res.ok) {
    //   addToast("success", "Data berhasil dihapus");
    // } else {
    //   addToast("error", data?.message || "Data tidak ditemukan");
    // }

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
        onDelete={() => {
          setSelectedRow(null);
          setConfirmDelete(true);
        }}
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
        onClose={() => setModalOpen(false)}
        onSuccess={() => {}}
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
