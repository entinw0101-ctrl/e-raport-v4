"use client"

import { useState, useEffect, useCallback } from "react"
import { DataTable, type Column } from "@/src/components/DataTable"
import { FormModal, type FormField } from "@/src/components/FormModal"
import { ConfirmDialog } from "@/src/components/ConfirmDialog"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"

interface LogPromosi {
  id: number
  catatan: string | null
  dibuat_pada: string
  dieksekusi_oleh: number | null
  tahun_ajaran_dari: {
    id: number
    nama_ajaran: string
    semester: "SATU" | "DUA"
  } | null
  tahun_ajaran_ke: {
    id: number
    nama_ajaran: string
    semester: "SATU" | "DUA"
  } | null
  kelas_dari: {
    id: number
    nama_kelas: string | null
    tingkatan: {
      nama_tingkatan: string
    } | null
  } | null
  kelas_ke: {
    id: number
    nama_kelas: string | null
    tingkatan: {
      nama_tingkatan: string
    } | null
  } | null
}

interface PeriodeAjaran {
  id: number
  nama_ajaran: string
  semester: "SATU" | "DUA"
}

interface Kelas {
  id: number
  nama_kelas: string | null
  tingkatan: {
    nama_tingkatan: string
  } | null
}

export default function LogPromosiPage() {
  const [data, setData] = useState<LogPromosi[]>([])
  const [periodeAjaranOptions, setPeriodeAjaranOptions] = useState<PeriodeAjaran[]>([])
  const [kelasOptions, setKelasOptions] = useState<Kelas[]>([])
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
  const [selectedLogPromosi, setSelectedLogPromosi] = useState<LogPromosi | null>(null)
  const [formLoading, setFormLoading] = useState(false)

  // Filter states
  const [searchTerm, setSearchTerm] = useState("")

  const columns: Column<LogPromosi>[] = [
    {
      key: "tahun_ajaran_dari",
      label: "Dari Periode",
      render: (value) => value ? `${value.nama_ajaran} (${value.semester === "SATU" ? "1" : "2"})` : "-",
    },
    {
      key: "tahun_ajaran_ke",
      label: "Ke Periode",
      render: (value) => value ? `${value.nama_ajaran} (${value.semester === "SATU" ? "1" : "2"})` : "-",
    },
    {
      key: "kelas_dari",
      label: "Dari Kelas",
      render: (value) => value ? `${value.nama_kelas} - ${value.tingkatan?.nama_tingkatan}` : "-",
    },
    {
      key: "kelas_ke",
      label: "Ke Kelas",
      render: (value) => value ? `${value.nama_kelas} - ${value.tingkatan?.nama_tingkatan}` : "-",
    },
    {
      key: "catatan",
      label: "Catatan",
      render: (value) => value || "-",
    },
    {
      key: "dibuat_pada",
      label: "Dibuat Pada",
      render: (value) => new Date(value).toLocaleDateString("id-ID"),
    },
  ]

  const getFormFields = (): FormField[] => [
    {
      name: "tahun_ajaran_dari_id",
      label: "Periode Ajaran Dari",
      type: "select",
      options: [
        { value: "", label: "Pilih Periode Ajaran Dari (Opsional)" },
        ...periodeAjaranOptions.map((periode) => ({
          value: periode.id.toString(),
          label: `${periode.nama_ajaran} (${periode.semester === "SATU" ? "Semester 1" : "Semester 2"})`,
        })),
      ],
    },
    {
      name: "tahun_ajaran_ke_id",
      label: "Periode Ajaran Ke",
      type: "select",
      options: [
        { value: "", label: "Pilih Periode Ajaran Ke (Opsional)" },
        ...periodeAjaranOptions.map((periode) => ({
          value: periode.id.toString(),
          label: `${periode.nama_ajaran} (${periode.semester === "SATU" ? "Semester 1" : "Semester 2"})`,
        })),
      ],
    },
    {
      name: "kelas_dari_id",
      label: "Kelas Dari",
      type: "select",
      options: [
        { value: "", label: "Pilih Kelas Dari (Opsional)" },
        ...kelasOptions.map((kelas) => ({
          value: kelas.id.toString(),
          label: `${kelas.nama_kelas} - ${kelas.tingkatan?.nama_tingkatan}`,
        })),
      ],
    },
    {
      name: "kelas_ke_id",
      label: "Kelas Ke",
      type: "select",
      options: [
        { value: "", label: "Pilih Kelas Ke (Opsional)" },
        ...kelasOptions.map((kelas) => ({
          value: kelas.id.toString(),
          label: `${kelas.nama_kelas} - ${kelas.tingkatan?.nama_tingkatan}`,
        })),
      ],
    },
    {
      name: "dieksekusi_oleh",
      label: "Diekseskusi Oleh (ID User)",
      type: "number",
      placeholder: "ID user yang mengeksekusi promosi",
    },
    {
      name: "catatan",
      label: "Catatan",
      type: "textarea",
      placeholder: "Catatan tambahan tentang promosi",
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

      const response = await fetch(`/api/log-promosi?${params}`)
      const result = await response.json()

      if (result.success) {
        setData(result.data)
        setPagination(result.pagination)
      } else {
        toast({
          title: "Error",
          description: result.error || "Gagal mengambil data log promosi",
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
      // Fetch periode ajaran options
      const periodeResponse = await fetch("/api/periode-ajaran?per_page=1000")
      const periodeResult = await periodeResponse.json()
      if (periodeResult.success) {
        setPeriodeAjaranOptions(periodeResult.data)
      }

      // Fetch kelas options
      const kelasResponse = await fetch("/api/kelas?per_page=1000")
      const kelasResult = await kelasResponse.json()
      if (kelasResult.success) {
        setKelasOptions(kelasResult.data)
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
    setSelectedLogPromosi(null)
    setShowFormModal(true)
  }

  const handleEdit = (logPromosi: LogPromosi) => {
    setSelectedLogPromosi(logPromosi)
    setShowFormModal(true)
  }

  const handleDelete = (logPromosi: LogPromosi) => {
    setSelectedLogPromosi(logPromosi)
    setShowDeleteDialog(true)
  }

  const handleFormSubmit = async (formData: Record<string, any>) => {
    setFormLoading(true)
    try {
      const url = selectedLogPromosi ? `/api/log-promosi/${selectedLogPromosi.id}` : "/api/log-promosi"
      const method = selectedLogPromosi ? "PUT" : "POST"

      const processedData = {
        ...formData,
        tahun_ajaran_dari_id: formData.tahun_ajaran_dari_id ? Number.parseInt(formData.tahun_ajaran_dari_id) : null,
        tahun_ajaran_ke_id: formData.tahun_ajaran_ke_id ? Number.parseInt(formData.tahun_ajaran_ke_id) : null,
        kelas_dari_id: formData.kelas_dari_id ? Number.parseInt(formData.kelas_dari_id) : null,
        kelas_ke_id: formData.kelas_ke_id ? Number.parseInt(formData.kelas_ke_id) : null,
        dieksekusi_oleh: formData.dieksekusi_oleh ? Number.parseInt(formData.dieksekusi_oleh) : null,
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
          description: result.message || `Log promosi berhasil ${selectedLogPromosi ? "diperbarui" : "ditambahkan"}`,
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
    if (!selectedLogPromosi) return

    try {
      const response = await fetch(`/api/log-promosi/${selectedLogPromosi.id}`, {
        method: "DELETE",
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Berhasil",
          description: "Log promosi berhasil dihapus",
        })
        fetchData(pagination.page, searchTerm)
      } else {
        toast({
          title: "Error",
          description: result.error || "Gagal menghapus log promosi",
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
    if (!selectedLogPromosi) return {}
    return {
      tahun_ajaran_dari_id: selectedLogPromosi.tahun_ajaran_dari?.id.toString() || "",
      tahun_ajaran_ke_id: selectedLogPromosi.tahun_ajaran_ke?.id.toString() || "",
      kelas_dari_id: selectedLogPromosi.kelas_dari?.id.toString() || "",
      kelas_ke_id: selectedLogPromosi.kelas_ke?.id.toString() || "",
      dieksekusi_oleh: selectedLogPromosi.dieksekusi_oleh?.toString() || "",
      catatan: selectedLogPromosi.catatan || "",
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <DataTable
        title="Log Promosi"
        columns={columns}
        data={data}
        loading={loading}
        pagination={pagination}
        onPageChange={handlePageChange}
        onSearch={handleSearch}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        searchPlaceholder="Cari catatan atau periode..."
        addButtonText="Tambah Log Promosi"
        emptyMessage="Belum ada data log promosi"
      />

      <FormModal
        title={selectedLogPromosi ? "Edit Log Promosi" : "Tambah Log Promosi"}
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
        title="Hapus Log Promosi"
        description={`Apakah Anda yakin ingin menghapus log promosi ini? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Hapus"
        variant="destructive"
      />
    </div>
  )
}