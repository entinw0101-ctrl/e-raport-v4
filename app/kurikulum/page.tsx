"use client"

import { useState, useEffect, useCallback } from "react"
import { DataTable, type Column } from "@/src/components/DataTable"
import { FormModal, type FormField } from "@/src/components/FormModal"
import { ConfirmDialog } from "@/src/components/ConfirmDialog"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"

interface Kurikulum {
  id: number
  tingkatan: {
    id: number
    nama_tingkatan: string
  }
  mata_pelajaran: {
    id: number
    nama_mapel: string
    jenis: "Ujian" | "Hafalan"
  } | null
  kitab: {
    id: number
    nama_kitab: string
  } | null
  batas_hafalan: string | null
}

interface Tingkatan {
  id: number
  nama_tingkatan: string
}

interface MataPelajaran {
  id: number
  nama_mapel: string
  jenis: "Ujian" | "Hafalan"
}

interface Kitab {
  id: number
  nama_kitab: string
}

export default function KurikulumPage() {
  const [data, setData] = useState<Kurikulum[]>([])
  const [tingkatanOptions, setTingkatanOptions] = useState<Tingkatan[]>([])
  const [mapelOptions, setMapelOptions] = useState<MataPelajaran[]>([])
  const [kitabOptions, setKitabOptions] = useState<Kitab[]>([])
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
  const [selectedKurikulum, setSelectedKurikulum] = useState<Kurikulum | null>(null)
  const [formLoading, setFormLoading] = useState(false)

  // Filter states
  const [searchTerm, setSearchTerm] = useState("")

  const columns: Column<Kurikulum>[] = [
    {
      key: "tingkatan",
      label: "Tingkatan",
      render: (value) => <Badge variant="outline">{value.nama_tingkatan}</Badge>,
    },
    {
      key: "mata_pelajaran",
      label: "Mata Pelajaran",
      render: (value) => value ? value.nama_mapel : "-",
    },
    {
      key: "kitab",
      label: "Kitab",
      render: (value) => value ? value.nama_kitab : "-",
    },
    {
      key: "batas_hafalan",
      label: "Batas Hafalan",
      render: (value) => value || "-",
    },
  ]

  const getFormFields = useCallback((): FormField[] => {
    return [
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
        name: "mapel_id",
        label: "Mata Pelajaran",
        type: "select",
        required: true,
        options: mapelOptions.map((m) => ({
          value: m.id.toString(),
          label: `${m.nama_mapel} (${m.jenis})`,
        })),
      },
      {
        name: "kitab_id",
        label: "Kitab",
        type: "select",
        required: true,
        options: kitabOptions.map((k) => ({
          value: k.id.toString(),
          label: k.nama_kitab,
        })),
      },
      {
        name: "batas_hafalan",
        label: "Batas Hafalan",
        type: "text",
        required: false, // Will validate in submit
        placeholder: "Diisi jika mata pelajaran jenis Hafalan",
        disabled: false, // Will be handled in submit
      },
    ]
  }, [tingkatanOptions, mapelOptions, kitabOptions])

  const fetchData = useCallback(async (page = 1, search = "") => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: pagination.per_page.toString(),
        ...(search && { search }),
      })

      const response = await fetch(`/api/kurikulum?${params}`)
      const result = await response.json()

      if (result.success) {
        setData(result.data)
        setPagination(result.pagination)
      } else {
        toast({
          title: "Error",
          description: result.error || "Gagal mengambil data kurikulum",
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

  const fetchOptions = async () => {
    try {
      // Fetch tingkatan options
      const tingkatanResponse = await fetch("/api/tingkatan")
      const tingkatanResult = await tingkatanResponse.json()
      if (tingkatanResult.success) {
        setTingkatanOptions(tingkatanResult.data)
      }

      // Fetch mapel options
      const mapelResponse = await fetch("/api/mata-pelajaran")
      const mapelResult = await mapelResponse.json()
      if (mapelResult.success) {
        setMapelOptions(mapelResult.data)
      }

      // Fetch kitab options
      const kitabResponse = await fetch("/api/kitab")
      const kitabResult = await kitabResponse.json()
      if (kitabResult.success) {
        setKitabOptions(kitabResult.data)
      }
    } catch (error) {
      console.error("Error fetching options:", error)
    }
  }

  useEffect(() => {
    fetchData()
    fetchOptions()
  }, [])

  const handlePageChange = useCallback((page: number) => {
    fetchData(page, searchTerm)
  }, [fetchData, searchTerm])

  const handleSearch = useCallback((search: string) => {
    setSearchTerm(search)
    fetchData(1, search)
  }, [fetchData])

  const handleAdd = () => {
    setSelectedKurikulum(null)
    setShowFormModal(true)
  }

  const handleEdit = (kurikulum: Kurikulum) => {
    setSelectedKurikulum(kurikulum)
    setShowFormModal(true)
  }

  const handleDelete = (kurikulum: Kurikulum) => {
    setSelectedKurikulum(kurikulum)
    setShowDeleteDialog(true)
  }

  const handleFormSubmit = async (formData: Record<string, any>) => {
    setFormLoading(true)
    try {
      // Validate based on mapel jenis
      if (formData.mapel_id) {
        const selectedMapel = mapelOptions.find(m => m.id.toString() === formData.mapel_id)
        if (selectedMapel?.jenis === "Hafalan") {
          if (!formData.batas_hafalan?.trim()) {
            toast({
              title: "Error",
              description: "Batas hafalan wajib diisi untuk mata pelajaran jenis Hafalan",
              variant: "destructive",
            })
            setFormLoading(false)
            return
          }
        } else if (selectedMapel?.jenis === "Ujian") {
          // Clear batas_hafalan for Ujian
          formData.batas_hafalan = null
        }
      }

      const url = selectedKurikulum ? `/api/kurikulum/${selectedKurikulum.id}` : "/api/kurikulum"
      const method = selectedKurikulum ? "PUT" : "POST"

      // Convert string IDs to numbers
      const processedData = {
        ...formData,
        tingkatan_id: Number.parseInt(formData.tingkatan_id),
        mapel_id: formData.mapel_id ? Number.parseInt(formData.mapel_id) : null,
        kitab_id: formData.kitab_id ? Number.parseInt(formData.kitab_id) : null,
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
          description: result.message || `Kurikulum berhasil ${selectedKurikulum ? "diperbarui" : "ditambahkan"}`,
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
    if (!selectedKurikulum) return

    try {
      const response = await fetch(`/api/kurikulum/${selectedKurikulum.id}`, {
        method: "DELETE",
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Berhasil",
          description: "Kurikulum berhasil dihapus",
        })
        fetchData(pagination.page, searchTerm)
      } else {
        toast({
          title: "Error",
          description: result.error || "Gagal menghapus kurikulum",
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
    if (!selectedKurikulum) return {}

    return {
      ...selectedKurikulum,
      tingkatan_id: selectedKurikulum.tingkatan.id.toString(),
      mapel_id: selectedKurikulum.mata_pelajaran?.id.toString() || "",
      kitab_id: selectedKurikulum.kitab?.id.toString() || "",
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <DataTable
        title="Data Kurikulum"
        columns={columns}
        data={data}
        loading={loading}
        pagination={pagination}
        onPageChange={handlePageChange}
        onSearch={handleSearch}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        searchPlaceholder="Cari kurikulum..."
        addButtonText="Tambah Kurikulum"
        emptyMessage="Belum ada data kurikulum"
      />

      <FormModal
        title={selectedKurikulum ? "Edit Kurikulum" : "Tambah Kurikulum"}
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
        title="Hapus Kurikulum"
        description={`Apakah Anda yakin ingin menghapus kurikulum ini? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Hapus"
        variant="destructive"
      />
    </div>
  )
}
