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
  kode_mapel: string | null
  jenis: "Ujian" | "Hafalan"
  deskripsi: string | null
}

export default function MataPelajaranPage() {
  const [data, setData] = useState<MataPelajaran[]>([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({
    page: 1,
    per_page: 10,
    total: 0,
    total_pages: 0,
  })

  // Modal states
  const [showFormModal, setShowFormModal] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedMataPelajaran, setSelectedMataPelajaran] = useState<MataPelajaran | null>(null)
  const [formLoading, setFormLoading] = useState(false)

  // Filter states
  const [searchTerm, setSearchTerm] = useState("")

  const columns: Column<MataPelajaran>[] = [
    {
      key: "kode_mapel",
      label: "Kode",
      className: "font-mono",
      render: (value) => value || "-",
    },
    {
      key: "nama_mapel",
      label: "Nama Mata Pelajaran",
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
      placeholder: "Contoh: Bahasa Arab, Fiqih, Akhlaq",
    },
    {
      name: "kode_mapel",
      label: "Kode Mata Pelajaran",
      type: "text",
      placeholder: "Contoh: BA, FQ, AK (opsional)",
    },
    {
      name: "jenis",
      label: "Jenis Penilaian",
      type: "select",
      required: true,
      options: [
        { value: "Ujian", label: "Ujian" },
        { value: "Hafalan", label: "Hafalan" },
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

  const fetchData = async (page = 1, search = "") => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: pagination.per_page.toString(),
        ...(search && { search }),
      })

      const response = await fetch(`/api/mata-pelajaran?${params}`)
      const result = await response.json()

      if (result.success) {
        setData(result.data)
        setPagination(result.pagination)
      } else {
        toast({
          title: "Error",
          description: result.error || "Gagal mengambil data mata pelajaran",
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

  const handlePageChange = (page: number) => {
    fetchData(page, searchTerm)
  }

  const handleSearch = (search: string) => {
    setSearchTerm(search)
    fetchData(1, search)
  }

  const handleAdd = () => {
    setSelectedMataPelajaran(null)
    setShowFormModal(true)
  }

  const handleEdit = (mataPelajaran: MataPelajaran) => {
    setSelectedMataPelajaran(mataPelajaran)
    setShowFormModal(true)
  }

  const handleDelete = (mataPelajaran: MataPelajaran) => {
    setSelectedMataPelajaran(mataPelajaran)
    setShowDeleteDialog(true)
  }

  const handleFormSubmit = async (formData: Record<string, any>) => {
    setFormLoading(true)
    try {
      const url = selectedMataPelajaran ? `/api/mata-pelajaran/${selectedMataPelajaran.id}` : "/api/mata-pelajaran"
      const method = selectedMataPelajaran ? "PUT" : "POST"

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
          description:
            result.message || `Mata pelajaran berhasil ${selectedMataPelajaran ? "diperbarui" : "ditambahkan"}`,
        })
        fetchData(pagination.page, searchTerm)
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
    if (!selectedMataPelajaran) return

    try {
      const response = await fetch(`/api/mata-pelajaran/${selectedMataPelajaran.id}`, {
        method: "DELETE",
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Berhasil",
          description: "Mata pelajaran berhasil dihapus",
        })
        fetchData(pagination.page, searchTerm)
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

  const getInitialFormData = () => {
    if (!selectedMataPelajaran) return {}
    return selectedMataPelajaran
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <DataTable
        title="Data Mata Pelajaran"
        columns={columns}
        data={data}
        loading={loading}
        pagination={pagination}
        onPageChange={handlePageChange}
        onSearch={handleSearch}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        searchPlaceholder="Cari nama atau kode mata pelajaran..."
        addButtonText="Tambah Mata Pelajaran"
        emptyMessage="Belum ada data mata pelajaran"
      />

      <FormModal
        title={selectedMataPelajaran ? "Edit Mata Pelajaran" : "Tambah Mata Pelajaran"}
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
        title="Hapus Mata Pelajaran"
        description={`Apakah Anda yakin ingin menghapus mata pelajaran "${selectedMataPelajaran?.nama_mapel}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Hapus"
        variant="destructive"
      />
    </div>
  )
}
