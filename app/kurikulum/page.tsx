"use client"

import { useState, useEffect } from "react"
import { DataTable, type Column } from "@/src/components/DataTable"
import { FormModal, type FormField } from "@/src/components/FormModal"
import { ConfirmDialog } from "@/src/components/ConfirmDialog"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"

interface MataPelajaran {
  id: number
  nama_mapel: string
  jenis: "Ujian" | "Hafalan"
  deskripsi: string | null
}

export default function KurikulumPage() {
  const [data, setData] = useState<MataPelajaran[]>([])
  const [loading, setLoading] = useState(false)

  // Modal states
  const [showFormModal, setShowFormModal] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedMapel, setSelectedMapel] = useState<MataPelajaran | null>(null)
  const [formLoading, setFormLoading] = useState(false)

  const columns: Column<MataPelajaran>[] = [
    {
      key: "nama_mapel",
      label: "Mata Pelajaran",
      className: "font-medium",
    },
    {
      key: "jenis",
      label: "Jenis",
      render: (value) => <Badge variant={value === "Ujian" ? "default" : "secondary"}>{value}</Badge>,
    },
    {
      key: "deskripsi",
      label: "Deskripsi",
      render: (value) => value || "-",
    },
  ]

  const formFields: FormField[] = [
    {
      name: "nama_mapel",
      label: "Nama Mata Pelajaran",
      type: "text",
      required: true,
      placeholder: "Contoh: Matematika, Tahfidz Al-Quran",
    },
    {
      name: "jenis",
      label: "Jenis Penilaian",
      type: "select",
      required: true,
      options: [
        { value: "Ujian", label: "Ujian (Nilai Angka)" },
        { value: "Hafalan", label: "Hafalan (Tercapai/Tidak)" },
      ],
    },
    {
      name: "deskripsi",
      label: "Deskripsi",
      type: "textarea",
      placeholder: "Deskripsi mata pelajaran (opsional)",
      rows: 3,
    },
  ]

  const fetchData = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/mata-pelajaran")
      if (response.ok) {
        const result = await response.json()
        setData(result.data)
      } else {
        toast({
          title: "Error",
          description: "Gagal mengambil data mata pelajaran",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat mengambil data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleAdd = () => {
    setSelectedMapel(null)
    setShowFormModal(true)
  }

  const handleEdit = (mapel: MataPelajaran) => {
    setSelectedMapel(mapel)
    setShowFormModal(true)
  }

  const handleDelete = (mapel: MataPelajaran) => {
    setSelectedMapel(mapel)
    setShowDeleteDialog(true)
  }

  const handleFormSubmit = async (formData: Record<string, any>) => {
    setFormLoading(true)
    try {
      const url = selectedMapel ? `/api/mata-pelajaran/${selectedMapel.id}` : "/api/mata-pelajaran"
      const method = selectedMapel ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Berhasil",
          description: result.message || `Mata pelajaran berhasil ${selectedMapel ? "diperbarui" : "ditambahkan"}`,
        })
        fetchData()
        setShowFormModal(false)
      } else {
        toast({
          title: "Error",
          description: result.error || "Terjadi kesalahan",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat menyimpan data",
        variant: "destructive",
      })
    } finally {
      setFormLoading(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!selectedMapel) return

    try {
      const response = await fetch(`/api/mata-pelajaran/${selectedMapel.id}`, {
        method: "DELETE",
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Berhasil",
          description: "Mata pelajaran berhasil dihapus",
        })
        fetchData()
      } else {
        toast({
          title: "Error",
          description: result.error || "Gagal menghapus mata pelajaran",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat menghapus data",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <DataTable
        title="Kurikulum & Mata Pelajaran"
        columns={columns}
        data={data}
        loading={loading}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        searchPlaceholder="Cari mata pelajaran..."
        addButtonText="Tambah Mata Pelajaran"
        emptyMessage="Belum ada mata pelajaran"
      />

      <FormModal
        title={selectedMapel ? "Edit Mata Pelajaran" : "Tambah Mata Pelajaran"}
        fields={formFields}
        initialData={selectedMapel || {}}
        open={showFormModal}
        onClose={() => setShowFormModal(false)}
        onSubmit={handleFormSubmit}
        loading={formLoading}
      />

      <ConfirmDialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteConfirm}
        title="Hapus Mata Pelajaran"
        description={`Apakah Anda yakin ingin menghapus mata pelajaran "${selectedMapel?.nama_mapel}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Hapus"
        variant="destructive"
      />
    </div>
  )
}
