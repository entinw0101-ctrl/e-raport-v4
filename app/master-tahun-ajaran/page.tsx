"use client"

import { useState, useEffect, useCallback } from "react"
import { DataTable, type Column } from "@/src/components/DataTable"
import { FormModal, type FormField } from "@/src/components/FormModal"
import { ConfirmDialog } from "@/src/components/ConfirmDialog"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"

interface MasterTahunAjaran {
  id: number
  nama_ajaran: string
  urutan: number | null
  status: "aktif" | "nonaktif"
  dibuat_pada: string
  diperbarui_pada: string
  _count: {
    siswa: number
    periode_ajaran: number
    riwayat_kelas_siswa: number
  }
}

export default function MasterTahunAjaranPage() {
  const [data, setData] = useState<MasterTahunAjaran[]>([])
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
  const [selectedMasterTahunAjaran, setSelectedMasterTahunAjaran] = useState<MasterTahunAjaran | null>(null)
  const [formLoading, setFormLoading] = useState(false)

  // Filter states
  const [searchTerm, setSearchTerm] = useState("")

  const columns: Column<MasterTahunAjaran>[] = [
    {
      key: "nama_ajaran",
      label: "Nama Ajaran",
      className: "font-medium",
    },
    {
      key: "urutan",
      label: "Urutan",
      render: (value) => value || "-",
    },
    {
      key: "status",
      label: "Status",
      render: (value) => (
        <Badge variant={value === "aktif" ? "default" : "secondary"}>
          {value === "aktif" ? "Aktif" : "Non-aktif"}
        </Badge>
      ),
    },
    {
      key: "_count",
      label: "Data Terkait",
      render: (value) => (
        <div className="text-sm">
          <div>{value.siswa} siswa</div>
          <div>{value.periode_ajaran} periode</div>
          <div>{value.riwayat_kelas_siswa} riwayat</div>
        </div>
      ),
    },
    {
      key: "dibuat_pada",
      label: "Dibuat Pada",
      render: (value) => new Date(value).toLocaleDateString("id-ID"),
    },
  ]

  const getFormFields = (): FormField[] => [
    {
      name: "nama_ajaran",
      label: "Nama Ajaran",
      type: "text",
      required: true,
      placeholder: "Contoh: 2024/2025, 2025/2026",
    },
    {
      name: "urutan",
      label: "Urutan",
      type: "number",
      required: true,
      placeholder: "Contoh: 1, 2, 3 (untuk mengurutkan tahun ajaran)",
    },
    {
      name: "status",
      label: "Status",
      type: "select",
      required: true,
      options: [
        { value: "aktif", label: "Aktif" },
        { value: "nonaktif", label: "Non-aktif" },
      ],
    },
  ]

  const fetchData = useCallback(async (page = 1, search = "") => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: pagination.per_page.toString(),
        ...(search && { search }),
      })

      const response = await fetch(`/api/master-tahun-ajaran?${params}`)
      const result = await response.json()

      if (result.success) {
        setData(result.data)
        setPagination(result.pagination)
      } else {
        toast({
          title: "Error",
          description: result.error || "Gagal mengambil data master tahun ajaran",
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
  }, [pagination.per_page])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handlePageChange = useCallback((page: number) => {
    fetchData(page, searchTerm)
  }, [fetchData, searchTerm])

  const handleSearch = useCallback((search: string) => {
    setSearchTerm(search)
    fetchData(1, search)
  }, [fetchData])

  const handlePerPageChange = useCallback(async (perPage: number) => {
    setPagination(prev => ({ ...prev, per_page: perPage }))
    // Fetch data with new per_page
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: "1",
        per_page: perPage.toString(),
        ...(searchTerm && { search: searchTerm }),
      })

      const response = await fetch(`/api/master-tahun-ajaran?${params}`)
      const result = await response.json()

      if (result.success) {
        setData(result.data)
        setPagination(result.pagination)
      } else {
        toast({
          title: "Error",
          description: result.error || "Gagal mengambil data master tahun ajaran",
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
  }, [searchTerm])

  const handleAdd = () => {
    setSelectedMasterTahunAjaran(null)
    setShowFormModal(true)
  }

  const handleEdit = (masterTahunAjaran: MasterTahunAjaran) => {
    setSelectedMasterTahunAjaran(masterTahunAjaran)
    setShowFormModal(true)
  }

  const handleDelete = (masterTahunAjaran: MasterTahunAjaran) => {
    setSelectedMasterTahunAjaran(masterTahunAjaran)
    setShowDeleteDialog(true)
  }

  const handleFormSubmit = async (formData: Record<string, any>) => {
    setFormLoading(true)
    try {
      const url = selectedMasterTahunAjaran ? `/api/master-tahun-ajaran/${selectedMasterTahunAjaran.id}` : "/api/master-tahun-ajaran"
      const method = selectedMasterTahunAjaran ? "PUT" : "POST"

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
          description: result.message || `Master tahun ajaran berhasil ${selectedMasterTahunAjaran ? "diperbarui" : "ditambahkan"}`,
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
    if (!selectedMasterTahunAjaran) return

    try {
      const response = await fetch(`/api/master-tahun-ajaran/${selectedMasterTahunAjaran.id}`, {
        method: "DELETE",
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Berhasil",
          description: "Master tahun ajaran berhasil dihapus",
        })
        fetchData(pagination.page, searchTerm)
      } else {
        toast({
          title: "Error",
          description: result.error || "Gagal menghapus master tahun ajaran",
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
    if (!selectedMasterTahunAjaran) return { status: "nonaktif" }
    return {
      nama_ajaran: selectedMasterTahunAjaran.nama_ajaran,
      urutan: selectedMasterTahunAjaran.urutan,
      status: selectedMasterTahunAjaran.status,
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <DataTable
        title="Master Tahun Ajaran"
        columns={columns}
        data={data}
        loading={loading}
        pagination={pagination}
        onPageChange={handlePageChange}
        onPerPageChange={handlePerPageChange}
        onSearch={handleSearch}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        searchPlaceholder="Cari nama ajaran..."
        addButtonText="Tambah Tahun Ajaran"
        emptyMessage="Belum ada data master tahun ajaran"
      />

      <FormModal
        title={selectedMasterTahunAjaran ? "Edit Master Tahun Ajaran" : "Tambah Master Tahun Ajaran"}
        fields={getFormFields()}
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
        title="Hapus Master Tahun Ajaran"
        description={`Apakah Anda yakin ingin menghapus master tahun ajaran "${selectedMasterTahunAjaran?.nama_ajaran}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Hapus"
        variant="destructive"
      />
    </div>
  )
}