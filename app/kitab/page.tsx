"use client"

import { useState, useEffect } from "react"
import { DataTable, type Column } from "@/src/components/DataTable"
import { FormModal, type FormField } from "@/src/components/FormModal"
import { ConfirmDialog } from "@/src/components/ConfirmDialog"
import { toast } from "@/hooks/use-toast"

interface Kitab {
  id: number
  nama_kitab: string
  pengarang: string | null
  penerbit: string | null
  tahun_terbit: number | null
  deskripsi: string | null
}

export default function KitabPage() {
  const [data, setData] = useState<Kitab[]>([])
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
  const [selectedKitab, setSelectedKitab] = useState<Kitab | null>(null)
  const [formLoading, setFormLoading] = useState(false)

  // Filter states
  const [searchTerm, setSearchTerm] = useState("")

  const columns: Column<Kitab>[] = [
    {
      key: "nama_kitab",
      label: "Nama Kitab",
      className: "font-medium",
    },
    {
      key: "pengarang",
      label: "Pengarang",
      render: (value) => value || "-",
    },
    {
      key: "penerbit",
      label: "Penerbit",
      render: (value) => value || "-",
    },
    {
      key: "tahun_terbit",
      label: "Tahun Terbit",
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
      name: "nama_kitab",
      label: "Nama Kitab",
      type: "text",
      required: true,
      placeholder: "Contoh: Safinah An-Najah, Aqidatul Awam",
    },
    {
      name: "pengarang",
      label: "Pengarang",
      type: "text",
      placeholder: "Nama pengarang kitab",
    },
    {
      name: "penerbit",
      label: "Penerbit",
      type: "text",
      placeholder: "Nama penerbit",
    },
    {
      name: "tahun_terbit",
      label: "Tahun Terbit",
      type: "number",
      placeholder: "Tahun penerbitan",
    },
    {
      name: "deskripsi",
      label: "Deskripsi",
      type: "textarea",
      placeholder: "Deskripsi kitab (opsional)",
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

      const response = await fetch(`/api/kitab?${params}`)
      const result = await response.json()

      if (result.success) {
        setData(result.data)
        setPagination(result.pagination)
      } else {
        toast({
          title: "Error",
          description: result.error || "Gagal mengambil data kitab",
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
    setSelectedKitab(null)
    setShowFormModal(true)
  }

  const handleEdit = (kitab: Kitab) => {
    setSelectedKitab(kitab)
    setShowFormModal(true)
  }

  const handleDelete = (kitab: Kitab) => {
    setSelectedKitab(kitab)
    setShowDeleteDialog(true)
  }

  const handleFormSubmit = async (formData: Record<string, any>) => {
    setFormLoading(true)
    try {
      const url = selectedKitab ? `/api/kitab/${selectedKitab.id}` : "/api/kitab"
      const method = selectedKitab ? "PUT" : "POST"

      // Convert tahun_terbit to number if provided
      const processedData = {
        ...formData,
        tahun_terbit: formData.tahun_terbit ? Number.parseInt(formData.tahun_terbit) : null,
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
          description: result.message || `Kitab berhasil ${selectedKitab ? "diperbarui" : "ditambahkan"}`,
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
    if (!selectedKitab) return

    try {
      const response = await fetch(`/api/kitab/${selectedKitab.id}`, {
        method: "DELETE",
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Berhasil",
          description: "Kitab berhasil dihapus",
        })
        fetchData(pagination.page, searchTerm)
      } else {
        toast({
          title: "Error",
          description: result.error || "Gagal menghapus kitab",
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
    if (!selectedKitab) return {}
    return selectedKitab
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <DataTable
        title="Data Kitab"
        columns={columns}
        data={data}
        loading={loading}
        pagination={pagination}
        onPageChange={handlePageChange}
        onSearch={handleSearch}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        searchPlaceholder="Cari nama kitab atau pengarang..."
        addButtonText="Tambah Kitab"
        emptyMessage="Belum ada data kitab"
      />

      <FormModal
        title={selectedKitab ? "Edit Kitab" : "Tambah Kitab"}
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
        title="Hapus Kitab"
        description={`Apakah Anda yakin ingin menghapus kitab "${selectedKitab?.nama_kitab}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Hapus"
        variant="destructive"
      />
    </div>
  )
}
