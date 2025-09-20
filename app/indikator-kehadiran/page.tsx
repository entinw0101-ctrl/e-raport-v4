"use client"

import { useState, useEffect } from "react"
import { DataTable, type Column } from "@/src/components/DataTable"
import { FormModal, type FormField } from "@/src/components/FormModal"
import { ConfirmDialog } from "@/src/components/ConfirmDialog"
import { toast } from "@/hooks/use-toast"

interface IndikatorKehadiran {
  id: number
  nama_indikator: string
  deskripsi: string | null
  dibuat_pada: string
  diperbarui_pada: string
}

export default function IndikatorKehadiranPage() {
  const [data, setData] = useState<IndikatorKehadiran[]>([])
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
  const [selectedIndikator, setSelectedIndikator] = useState<IndikatorKehadiran | null>(null)
  const [formLoading, setFormLoading] = useState(false)

  // Filter states
  const [searchTerm, setSearchTerm] = useState("")

  const columns: Column<IndikatorKehadiran>[] = [
    {
      key: "nama_indikator",
      label: "Nama Indikator",
      className: "font-medium",
      render: (value) => value || "-",
    },
    {
      key: "deskripsi",
      label: "Deskripsi",
      render: (value) => value || "-",
    },
  ]

  const formFields: FormField[] = [
    {
      name: "nama_indikator",
      label: "Nama Indikator",
      type: "text",
      required: true,
      placeholder: "Contoh: Madrasah Diniyyah, Sholat Subuh, Kegiatan Ekstrakurikuler",
    },
    {
      name: "deskripsi",
      label: "Deskripsi",
      type: "textarea",
      placeholder: "Deskripsi kegiatan (opsional)",
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

      const response = await fetch(`/api/indikator-kehadiran?${params}`)
      const result = await response.json()

      if (result.success) {
        setData(result.data)
        setPagination(result.pagination)
      } else {
        toast({
          title: "Error",
          description: result.error || "Gagal mengambil data indikator kehadiran",
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
    setSelectedIndikator(null)
    setShowFormModal(true)
  }

  const handleEdit = (indikator: IndikatorKehadiran) => {
    setSelectedIndikator(indikator)
    setShowFormModal(true)
  }

  const handleDelete = (indikator: IndikatorKehadiran) => {
    setSelectedIndikator(indikator)
    setShowDeleteDialog(true)
  }

  const handleFormSubmit = async (formData: Record<string, any>) => {
    setFormLoading(true)
    try {
      const url = selectedIndikator ? `/api/indikator-kehadiran/${selectedIndikator.id}` : "/api/indikator-kehadiran"
      const method = selectedIndikator ? "PUT" : "POST"

      const processedData = {
        ...formData,
      }

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(processedData),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Berhasil",
          description: result.message || `Indikator kehadiran berhasil ${selectedIndikator ? "diperbarui" : "ditambahkan"}`,
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
    if (!selectedIndikator) return

    try {
      const response = await fetch(`/api/indikator-kehadiran/${selectedIndikator.id}`, {
        method: "DELETE",
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Berhasil",
          description: "Indikator kehadiran berhasil dihapus",
        })
        fetchData(pagination.page, searchTerm)
      } else {
        toast({
          title: "Error",
          description: result.error || "Gagal menghapus indikator kehadiran",
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
    if (!selectedIndikator) return {}
    return selectedIndikator
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <DataTable
        title="Indikator Kehadiran"
        columns={columns}
        data={data}
        loading={loading}
        pagination={pagination}
        onPageChange={handlePageChange}
        onSearch={handleSearch}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        searchPlaceholder="Cari indikator kehadiran..."
        addButtonText="Tambah Indikator"
        emptyMessage="Belum ada data indikator kehadiran"
      />

      <FormModal
        title={selectedIndikator ? "Edit Indikator Kehadiran" : "Tambah Indikator Kehadiran"}
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
        title="Hapus Indikator Kehadiran"
        description={`Apakah Anda yakin ingin menghapus indikator kehadiran "${selectedIndikator?.nama_indikator}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Hapus"
        variant="destructive"
      />
    </div>
  )
}