import RemoteTable from "@/Components/RemoteTable";
import React, { useRef, useState, useEffect } from "react";
import JenisFileFormModal from "./JenisFileFormModal";
import ConfirmDeleteDialog from "@/Components/ConfirmDeleteDialog";
import { useToast } from "@/Providers/ToastProvider";
import { useContent } from "@/Providers/ContentProvider";
import Navbar from "@/Components/Navbar";
import ChangeLevelModal from "@/Components/ChangeLevelModal";
import { BsPlus } from "react-icons/bs";

// const cn = (...classes) => classes.filter(Boolean).join(" ");

const JenisFilePage = () => {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const tableRef = useRef(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("new");
  const [selectedRow, setSelectedRow] = useState(null);
  const { addToast } = useToast();

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
    const res = await fetch(`http://localhost:3000/jenisfile/${selectedRow.UUID}`, {
      method: "DELETE",
    });
    const data = await res.json();
    console.log(data)
    
    if (res.ok){
      addToast("success", "Data berhasil dihapus");
    } else{
      addToast("error", data?.message || "Data tidak ditemukan");
    }

    setConfirmDelete(false);
    tableRef.current?.reload?.({ resetPage: true });
  }

  const {
    level,
    setLevel,
    openChangeLevel,
    setOpenChangeLevel,
  } = useContent();

  return (
    <>
      <Navbar
        userName="John Doe"
        userLevel={level}
        years={[]}
        activeYear={null}
        positionYear={null}
        onPositionChange={()=>{}}
        onChangeLevelClick={() => setOpenChangeLevel(true)}
        renderChangeLevelModal={() => (
          <ChangeLevelModal
            open={openChangeLevel}
            onClose={() => setOpenChangeLevel(false)}
            levels={[]}
            currentLevel={level}
            onSubmit={(val) => {
              setLevel(val);
              setOpenChangeLevel(false);
            }}
          />
        )}
      />
      <div className="p-3 bg-white">
        <h2 className="text-lg font-semibold mb-4">Jenis File Audit</h2>

        <div className="border rounded">
          <RemoteTable
            ref={tableRef}
            endpoint="http://localhost:3000/jenisfiles"
            mode="paging"
            renderAddAction={
              <button 
                className="px-3 py-2 bg-purple-600 text-white rounded-lg" 
                onClick={()=>openNew()}>
                <BsPlus/>
              </button>
            }
            listcolumns={[
              { key: "Nama", label: "Jenis File", searchable: true},
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

        <JenisFileFormModal
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

export default JenisFilePage;
