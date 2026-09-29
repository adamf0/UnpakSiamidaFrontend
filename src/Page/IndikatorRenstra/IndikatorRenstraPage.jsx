import RemoteTable from "@/Components/RemoteTable";
import React, { useRef, useState } from "react";
import IndikatorRenstraFormModal from "./IndikatorRenstraFormModal";
import ConfirmDeleteDialog from "@/Components/ConfirmDeleteDialog";
import Navbar from "@/Components/Navbar";
import ChangeLevelModal from "@/Components/ChangeLevelModal";
import { useContent } from "@/Providers/ContentProvider";
import { Plus } from "lucide-react";
import Tooltip from "@/Components/Tooltip";
import { useAuth } from "@/Providers/AuthProvider";
import { isEmpty } from "@/Common/Utils";

const IndikatorRenstraPage = () => {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const tableRef = useRef(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("new");
  const [selectedRow, setSelectedRow] = useState(null);
  const {getValidToken} = useAuth()

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

  const deleteData = async () => {
    if(isEmpty(getValidToken())) return;

    const res = await fetch(
      `http://localhost:3000/standarrenstra/${selectedRow.Uuid}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${getValidToken()}`
        }
      }
    );
    const data = await res.json();
    console.log(data);

    if (res.ok) {
      addToast("success", "Data berhasil dihapus");
    } else {
      addToast("error", data?.message || "Data tidak ditemukan");
    }

    setConfirmDelete(false);
    tableRef.current?.reload?.({ resetPage: true });
  };

  const { level, listLevel, setLevel, openChangeLevel, setOpenChangeLevel } = useContent();

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
      <div className="p-3 bg-white">
        <h2 className="text-lg font-semibold mb-4">Indikator Renstra</h2>

        <div className="border rounded mt-3">
            <RemoteTable
              ref={tableRef}
              endpoint="http://localhost:3000/indikatorrenstras"
              mode="sse"
              token={getValidToken()}
              onError={(err) => {
                console.error("TABLE ERROR:", err);
              }}
              renderAddAction={
                <Tooltip content="Tambah Indikator Renstra">
                  <button
                    type="button"
                    className="w-9 h-9 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center justify-center transition shadow-xs shrink-0"
                    onClick={() => openNew()}
                    aria-label="Tambah Indikator Renstra"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </Tooltip>
              }
              listcolumns={[
                { key: "Tahun", label: "Tahun", searchable: true },
                { key: "Standar", label: "Standar Standar", searchable: true },
                {
                  key: "Indikator",
                  label: "Indikator Standar",
                  searchable: true,
                },
              ]}
              renderAction={({ row, close }) => (
                <>
                  <button
                    className="block w-full px-3 py-2 text-sm hover:bg-gray-100"
                    onClick={() => {
                      console.log("edit", row);
                      openEdit(row);
                      close();
                    }}
                  >
                    Edit
                  </button>

                  <button
                    className="block w-full px-3 py-2 text-sm text-red-600 hover:bg-gray-100"
                    onClick={() => {
                      console.log("hapus", row);
                      setSelectedRow(row);
                      setConfirmDelete(true);
                      close();
                    }}
                  >
                    Hapus
                  </button>
                </>
              )}
            />
        </div>

        <IndikatorRenstraFormModal
          open={modalOpen}
          mode={modalMode}
          data={selectedRow}
          onClose={() => setModalOpen(false)}
          onSuccess={() => tableRef.current?.reload?.({ resetPage: true })}
        />

        <ConfirmDeleteDialog
          open={confirmDelete}
          onClose={() => setConfirmDelete(false)}
          onConfirm={async () => deleteData()}
        />
      </div>
    </>
  );
};

export default IndikatorRenstraPage;
