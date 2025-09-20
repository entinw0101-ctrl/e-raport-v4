"use client"

import { useState, useEffect, useCallback } from "react"
import { DataTable, type Column } from "@/src/components/DataTable"
import { FormModal, type FormField } from "@/src/components/FormModal"
import { ConfirmDialog } from "@/src/components/ConfirmDialog"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"

interface SuratKeluar {
  id: number
  nomor_surat: string
  tanggal_surat: string | null
  perihal: string | null
  isi_surat: string | null
  dibuat_pada: string
  diperbarui_pada: string
  siswa: {
    id: number
    nama: string | null
    nis: string
  } | null
}

interface Siswa {
  id: number
  nama: string | null
  nis: string
}

export default function SuratKeluarPage() {
  const [data, setData] = useState<SuratKeluar[]>([])
  const [siswaOptions, setSiswaOptions] = useState<Siswa[]>([])
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
  const [selectedSuratKeluar, setSelectedSuratKeluar] = useState<SuratKeluar | null>(null)
  const [formLoading, setFormLoading] = useState(false)

  // Filter states
  const [searchTerm, setSearchTerm] = useState("")

  const columns: Column<SuratKeluar>[] = [
    {
      key: "nomor_surat",
      label: "Nomor Surat",
      className: "font-medium",
    },
    {
      key: "siswa",
      label: "Siswa",
      render: (value) => value ? `${value.nama} (${value.nis})` : "-",
    },
    {
      key: "perihal",
      label: "Perihal",
      render: (value) => value || "-",
    },
    {
      key: "tanggal_surat",
      label: "Tanggal Surat",
      render: (value) => value ? new Date(value).toLocaleDateString("id-ID") : "-",
    },
    {
      key: "dibuat_pada",
      label: "Dibuat Pada",
      render: (value) => new Date(value).toLocaleDateString("id-ID"),
    },
  ]

  const getFormFields = (): FormField[] => [
    {
      name: "nomor_surat",
      label: "Nomor Surat",
      type: "text",
      required: true,
      placeholder: "Contoh: 001/SK/SMK-NS/2024",
    },
    {
      name: "siswa_id",
      label: "Siswa",
      type: "select",
      options: [
        { value: "", label: "Pilih Siswa (Opsional)" },
        ...siswaOptions.map((siswa) => ({
          value: siswa.id.toString(),
          label: `${siswa.nama} (${siswa.nis})`,
        })),
      ],
    },
    {
      name: "tanggal_surat",
      label: "Tanggal Surat",
      type: "date",
      placeholder: "Pilih tanggal surat",
    },
    {
      name: "perihal",
      label: "Perihal",
      type: "text",
      placeholder: "Perihal surat",
    },
    {
      name: "isi_surat",
      label: "Isi Surat",
      type: "textarea",
      placeholder: "Isi lengkap surat",
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

      const response = await fetch(`/api/surat-keluar?${params}`)
      const result = await response.json()

      if (result.success) {
        setData(result.data)
        setPagination(result.pagination)
      } else {
        toast({
          title: "Error",
          description: result.error || "Gagal mengambil data surat keluar",
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
      // Fetch siswa options
      const siswaResponse = await fetch("/api/siswa?per_page=1000")
      const siswaResult = await siswaResponse.json()
      if (siswaResult.success) {
        setSiswaOptions(siswaResult.data)
      }
    } catch (error) {
      console.error("Error fetching options:", error)
    }
  }

  useEffect(() => {
    fetchData()
    fetchOptions()
  }, [fetchData])

  const handlePageChange = useCallback((page: number) => {
    fetchData(page, searchTerm)
  }, [fetchData, searchTerm])

  const handleSearch = useCallback((search: string) => {
    setSearchTerm(search)
    fetchData(1, search)
  }, [fetchData])

  const handleAdd = () => {
    setSelectedSuratKeluar(null)
    setShowFormModal(true)
  }

  const handleEdit = (suratKeluar: SuratKeluar) => {
    setSelectedSuratKeluar(suratKeluar)
    setShowFormModal(true)
  }

  const handleDelete = (suratKeluar: SuratKeluar) => {
    setSelectedSuratKeluar(suratKeluar)
    setShowDeleteDialog(true)
  }

  const handleFormSubmit = async (formData: Record<string, any>) => {
    setFormLoading(true)
    try {
      const url = selectedSuratKeluar ? `/api/surat-keluar/${selectedSuratKeluar.id}` : "/api/surat-keluar"
      const method = selectedSuratKeluar ? "PUT" : "POST"

      const processedData = {
        ...formData,
        siswa_id: formData.siswa_id ? Number.parseInt(formData.siswa_id) : null,
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
          description: result.message || `Surat keluar berhasil ${selectedSuratKeluar ? "diperbarui" : "ditambahkan"}`,
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
    if (!selectedSuratKeluar) return

    try {
      const response = await fetch(`/api/surat-keluar/${selectedSuratKeluar.id}`, {
        method: "DELETE",
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Berhasil",
          description: "Surat keluar berhasil dihapus",
        })
        fetchData(pagination.page, searchTerm)
      } else {
        toast({
          title: "Error",
          description: result.error || "Gagal menghapus surat keluar",
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
    if (!selectedSuratKeluar) return {}
    return {
      nomor_surat: selectedSuratKeluar.nomor_surat,
      siswa_id: selectedSuratKeluar.siswa?.id.toString() || "",
      tanggal_surat: selectedSuratKeluar.tanggal_surat ? selectedSuratKeluar.tanggal_surat.split('T')[0] : "",
      perihal: selectedSuratKeluar.perihal || "",
      isi_surat: selectedSuratKeluar.isi_surat || "",
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <DataTable
        title="Surat Keluar"
        columns={columns}
        data={data}
        loading={loading}
        pagination={pagination}
        onPageChange={handlePageChange}
        onSearch={handleSearch}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        searchPlaceholder="Cari nomor surat, perihal, atau nama siswa..."
        addButtonText="Tambah Surat Keluar"
        emptyMessage="Belum ada data surat keluar"
      />

      <FormModal
        title={selectedSuratKeluar ? "Edit Surat Keluar" : "Tambah Surat Keluar"}
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
        title="Hapus Surat Keluar"
        description={`Apakah Anda yakin ingin menghapus surat keluar "${selectedSuratKeluar?.nomor_surat}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Hapus"
        variant="destructive"
      />
    </div>
  )
}