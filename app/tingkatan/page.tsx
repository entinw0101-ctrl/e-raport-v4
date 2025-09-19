"use client"

import { useState, useEffect } from "react"
import { DataTable, type Column } from "@/src/components/DataTable"
import { FormModal, type FormField } from "@/src/components/FormModal"
import { ConfirmDialog } from "@/src/components/ConfirmDialog"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"

interface Tingkatan {
  id: number
  nama_tingkatan: string
  urutan: number
  deskripsi: string | null
}

export default function TingkatanPage() {
  const [data, setData] = useState<Tingkatan[]>([])
  const [loading, setLoading] = useState(false)

  // Modal states
  const [showFormModal, setShowFormModal] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedTingkatan, setSelectedTingkatan] = useState<Tingkatan | null>(null)
  const [formLoading, setFormLoading] = useState(false)

  const columns: Column<Tingkatan>[] = [
    {
      key: "urutan",
      label: "Urutan",
      render: (value) => <Badge variant="outline">{value}</Badge>,
    },
    {
      key: "nama_tingkatan",
      label: "Nama Tingkatan",
      className: "font-medium",
    },
    {
      key: "deskripsi",
      label: "Deskripsi",
      render: (value) => value || "-",
    },
  ]

  const formFields: FormField[] = [
    {
      name: "nama_tingkatan",
      label: "Nama Tingkatan",
      type: "text",
      required: true,
      placeholder: "Contoh: Kelas 1, Kelas 2, Kelas 3",
    },
    {
      name: "urutan",
      label: "Urutan",
      type: "number",
      required: true,
      placeholder: "Urutan tingkatan (1, 2, 3, ...)",
    },
    {
      name: "deskripsi",
      label: "Deskripsi",
      type: "textarea",
      placeholder: "Deskripsi tingkatan (opsional)",
      rows: 3,
    },
  ]

  const fetchData = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/tingkatan")
      const result = await response.json()

      if (result.success) {
        setData(result.data)
      } else {
        toast({
          title: "Error",
          description: result.error || "Gagal mengambil data tingkatan",
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
    setSelectedTingkatan(null)
    setShowFormModal(true)
  }

  const handleEdit = (tingkatan: Tingkatan) => {
    setSelectedTingkatan(tingkatan)
    setShowFormModal(true)
  }

  const handleDelete = (tingkatan: Tingkatan) => {
    setSelectedTingkatan(tingkatan)
    setShowDeleteDialog(true)
  }

  const handleFormSubmit = async (formData: Record<string, any>) => {
    setFormLoading(true)
    try {
      const url = selectedTingkatan ? `/api/tingkatan/${selectedTingkatan.id}` : "/api/tingkatan"
      const method = selectedTingkatan ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Berhasil",
          description: result.message || `Tingkatan berhasil ${selectedTingkatan ? "diperbarui" : "ditambahkan"}`,
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
    if (!selectedTingkatan) return

    try {
      const response = await fetch(`/api/tingkatan/${selectedTingkatan.id}`, {
        method: "DELETE",
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Berhasil",
          description: "Tingkatan berhasil dihapus",
        })
        fetchData()
      } else {
        toast({
          title: "Error",
          description: result.error || "Gagal menghapus tingkatan",
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

  const getInitialFormData = () => {
    if (!selectedTingkatan) return {}
    return selectedTingkatan
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <DataTable
        title="Data Tingkatan"
        columns={columns}
        data={data}
        loading={loading}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        addButtonText="Tambah Tingkatan"
        emptyMessage="Belum ada data tingkatan"
      />

      <FormModal
        title={selectedTingkatan ? "Edit Tingkatan" : "Tambah Tingkatan"}
        fields={formFields}
        initialData={getInitialFormData()}
        open={showFormModal}
        onClose={() => setShowFormModal(false)}
        onSubmit={handleFormSubmit}
        loading={formLoading}
      />

      <ConfirmDialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteConfirm}
        title="Hapus Tingkatan"
        description={`Apakah Anda yakin ingin menghapus tingkatan "${selectedTingkatan?.nama_tingkatan}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Hapus"
        variant="destructive"
      />
    </div>
  )
}
