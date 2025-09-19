"use client"

import { useState, useEffect } from "react"
import { DataTable, type Column } from "@/src/components/DataTable"
import { FormModal, type FormField } from "@/src/components/FormModal"
import { ConfirmDialog } from "@/src/components/ConfirmDialog"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"

interface Kelas {
  id: number
  nama_kelas: string
  tingkatan_id: number
  wali_kelas_id: number | null
  tahun_ajaran: string
  status: "aktif" | "nonaktif"
  tingkatan: {
    id: number
    nama_tingkatan: string
  }
  wali_kelas: {
    id: number
    nama: string
  } | null
  _count: {
    siswa: number
  }
}

interface Tingkatan {
  id: number
  nama_tingkatan: string
}

interface Guru {
  id: number
  nama: string
}

export default function KelasPage() {
  const [data, setData] = useState<Kelas[]>([])
  const [tingkatanOptions, setTingkatanOptions] = useState<Tingkatan[]>([])
  const [guruOptions, setGuruOptions] = useState<Guru[]>([])
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
  const [selectedKelas, setSelectedKelas] = useState<Kelas | null>(null)
  const [formLoading, setFormLoading] = useState(false)

  // Filter states
  const [searchTerm, setSearchTerm] = useState("")

  const columns: Column<Kelas>[] = [
    {
      key: "nama_kelas",
      label: "Nama Kelas",
      className: "font-medium",
    },
    {
      key: "tingkatan",
      label: "Tingkatan",
      render: (value) => <Badge variant="outline">{value.nama_tingkatan}</Badge>,
    },
    {
      key: "wali_kelas",
      label: "Wali Kelas",
      render: (value) => (value ? value.nama : "-"),
    },
    {
      key: "_count",
      label: "Jumlah Siswa",
      render: (value) => `${value.siswa} siswa`,
    },
    {
      key: "tahun_ajaran",
      label: "Tahun Ajaran",
      className: "font-mono",
    },
    {
      key: "status",
      label: "Status",
      render: (value) => (
        <Badge variant={value === "aktif" ? "default" : "secondary"}>{value === "aktif" ? "Aktif" : "Non-aktif"}</Badge>
      ),
    },
  ]

  const formFields: FormField[] = [
    {
      name: "nama_kelas",
      label: "Nama Kelas",
      type: "text",
      required: true,
      placeholder: "Contoh: 1A, 2B, 3C",
    },
    {
      name: "tingkatan_id",
      label: "Tingkatan",
      type: "select",
      required: true,
      options: tingkatanOptions.map((t) => ({
        value: t.id.toString(),
        label: t.nama_tingkatan,
      })),
    },
    {
      name: "wali_kelas_id",
      label: "Wali Kelas",
      type: "select",
      options: [
        { value: "", label: "Pilih Wali Kelas (Opsional)" },
        ...guruOptions.map((g) => ({
          value: g.id.toString(),
          label: g.nama,
        })),
      ],
    },
    {
      name: "tahun_ajaran",
      label: "Tahun Ajaran",
      type: "text",
      required: true,
      placeholder: "Contoh: 2024/2025",
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

  const fetchData = async (page = 1, search = "") => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: pagination.per_page.toString(),
        ...(search && { search }),
      })

      const response = await fetch(`/api/kelas?${params}`)
      const result = await response.json()

      if (result.success) {
        setData(result.data)
        setPagination(result.pagination)
      } else {
        toast({
          title: "Error",
          description: result.error || "Gagal mengambil data kelas",
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

  const fetchOptions = async () => {
    try {
      // Fetch tingkatan options
      const tingkatanResponse = await fetch("/api/tingkatan")
      const tingkatanResult = await tingkatanResponse.json()
      if (tingkatanResult.success) {
        setTingkatanOptions(tingkatanResult.data)
      }

      // Fetch guru options (only active teachers)
      const guruResponse = await fetch("/api/guru?status=aktif&per_page=100")
      const guruResult = await guruResponse.json()
      if (guruResult.success) {
        setGuruOptions(guruResult.data)
      }
    } catch (error) {
      console.error("Error fetching options:", error)
    }
  }

  useEffect(() => {
    fetchData()
    fetchOptions()
  }, [])

  const handlePageChange = (page: number) => {
    fetchData(page, searchTerm)
  }

  const handleSearch = (search: string) => {
    setSearchTerm(search)
    fetchData(1, search)
  }

  const handleAdd = () => {
    setSelectedKelas(null)
    setShowFormModal(true)
  }

  const handleEdit = (kelas: Kelas) => {
    setSelectedKelas(kelas)
    setShowFormModal(true)
  }

  const handleDelete = (kelas: Kelas) => {
    setSelectedKelas(kelas)
    setShowDeleteDialog(true)
  }

  const handleFormSubmit = async (formData: Record<string, any>) => {
    setFormLoading(true)
    try {
      const url = selectedKelas ? `/api/kelas/${selectedKelas.id}` : "/api/kelas"
      const method = selectedKelas ? "PUT" : "POST"

      // Convert string IDs to numbers
      const processedData = {
        ...formData,
        tingkatan_id: Number.parseInt(formData.tingkatan_id),
        wali_kelas_id: formData.wali_kelas_id ? Number.parseInt(formData.wali_kelas_id) : null,
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
          description: result.message || `Kelas berhasil ${selectedKelas ? "diperbarui" : "ditambahkan"}`,
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
    if (!selectedKelas) return

    try {
      const response = await fetch(`/api/kelas/${selectedKelas.id}`, {
        method: "DELETE",
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Berhasil",
          description: "Kelas berhasil dihapus",
        })
        fetchData(pagination.page, searchTerm)
      } else {
        toast({
          title: "Error",
          description: result.error || "Gagal menghapus kelas",
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
    if (!selectedKelas) return { status: "aktif" }

    return {
      ...selectedKelas,
      tingkatan_id: selectedKelas.tingkatan_id.toString(),
      wali_kelas_id: selectedKelas.wali_kelas_id?.toString() || "",
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <DataTable
        title="Data Kelas"
        columns={columns}
        data={data}
        loading={loading}
        pagination={pagination}
        onPageChange={handlePageChange}
        onSearch={handleSearch}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        searchPlaceholder="Cari nama kelas..."
        addButtonText="Tambah Kelas"
        emptyMessage="Belum ada data kelas"
      />

      <FormModal
        title={selectedKelas ? "Edit Kelas" : "Tambah Kelas"}
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
        title="Hapus Kelas"
        description={`Apakah Anda yakin ingin menghapus kelas "${selectedKelas?.nama_kelas}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Hapus"
        variant="destructive"
      />
    </div>
  )
}
