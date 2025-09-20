"use client"

import { useState, useEffect, useCallback } from "react"
import { DataTable, type Column } from "@/src/components/DataTable"
import { FormModal, type FormField } from "@/src/components/FormModal"
import { ConfirmDialog } from "@/src/components/ConfirmDialog"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"

interface RingkasanRapot {
  id: number
  total_sakit: number | null
  total_izin: number | null
  total_alpha: number | null
  catatan_akademik: string | null
  rata_rata_spiritual: number | null
  rata_rata_sosial: number | null
  predikat_akhir_sikap: string | null
  catatan_sikap: string | null
  dibuat_pada: string
  diperbarui_pada: string
  siswa: {
    id: number
    nama: string | null
    nis: string
    kelas: {
      nama_kelas: string | null
      tingkatan: {
        nama_tingkatan: string
      } | null
    } | null
  } | null
  periode_ajaran: {
    id: number
    nama_ajaran: string
    semester: "SATU" | "DUA"
  } | null
}

interface Siswa {
  id: number
  nama: string | null
  nis: string
}

interface PeriodeAjaran {
  id: number
  nama_ajaran: string
  semester: "SATU" | "DUA"
}

export default function RingkasanRapotPage() {
  const [data, setData] = useState<RingkasanRapot[]>([])
  const [siswaOptions, setSiswaOptions] = useState<Siswa[]>([])
  const [periodeAjaranOptions, setPeriodeAjaranOptions] = useState<PeriodeAjaran[]>([])
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
  const [selectedRingkasanRapot, setSelectedRingkasanRapot] = useState<RingkasanRapot | null>(null)
  const [formLoading, setFormLoading] = useState(false)

  // Filter states
  const [searchTerm, setSearchTerm] = useState("")

  const columns: Column<RingkasanRapot>[] = [
    {
      key: "siswa",
      label: "Siswa",
      render: (value) => value ? `${value.nama} (${value.nis})` : "-",
    },
    {
      key: "periode_ajaran",
      label: "Periode Ajaran",
      render: (value) => value ? `${value.nama_ajaran} (${value.semester === "SATU" ? "1" : "2"})` : "-",
    },
    {
      key: "siswa",
      label: "Kelas",
      render: (value) => value?.kelas ? `${value.kelas.nama_kelas} - ${value.kelas.tingkatan?.nama_tingkatan}` : "-",
    },
    {
      key: "total_sakit",
      label: "Sakit",
      render: (value) => value ? `${value} hari` : "0 hari",
    },
    {
      key: "total_izin",
      label: "Izin",
      render: (value) => value ? `${value} hari` : "0 hari",
    },
    {
      key: "total_alpha",
      label: "Alpha",
      render: (value) => value ? `${value} hari` : "0 hari",
    },
    {
      key: "rata_rata_spiritual",
      label: "Spiritual",
      render: (value) => value ? `${value}` : "-",
    },
    {
      key: "rata_rata_sosial",
      label: "Sosial",
      render: (value) => value ? `${value}` : "-",
    },
    {
      key: "diperbarui_pada",
      label: "Terakhir Update",
      render: (value) => new Date(value).toLocaleDateString("id-ID"),
    },
  ]

  const getFormFields = (): FormField[] => [
    {
      name: "siswa_id",
      label: "Siswa",
      type: "select",
      required: true,
      options: siswaOptions.map((siswa) => ({
        value: siswa.id.toString(),
        label: `${siswa.nama} (${siswa.nis})`,
      })),
    },
    {
      name: "periode_ajaran_id",
      label: "Periode Ajaran",
      type: "select",
      required: true,
      options: periodeAjaranOptions.map((periode) => ({
        value: periode.id.toString(),
        label: `${periode.nama_ajaran} (${periode.semester === "SATU" ? "Semester 1" : "Semester 2"})`,
      })),
    },
    {
      name: "total_sakit",
      label: "Total Sakit",
      type: "number",
      placeholder: "Jumlah hari sakit",
      min: 0,
    },
    {
      name: "total_izin",
      label: "Total Izin",
      type: "number",
      placeholder: "Jumlah hari izin",
      min: 0,
    },
    {
      name: "total_alpha",
      label: "Total Alpha",
      type: "number",
      placeholder: "Jumlah hari alpha",
      min: 0,
    },
    {
      name: "catatan_akademik",
      label: "Catatan Akademik",
      type: "textarea",
      placeholder: "Catatan tentang performa akademik siswa",
    },
    {
      name: "rata_rata_spiritual",
      label: "Rata-rata Spiritual",
      type: "number",
      placeholder: "Nilai rata-rata spiritual (0-100)",
    },
    {
      name: "rata_rata_sosial",
      label: "Rata-rata Sosial",
      type: "number",
      placeholder: "Nilai rata-rata sosial (0-100)",
    },
    {
      name: "predikat_akhir_sikap",
      label: "Predikat Akhir Sikap",
      type: "text",
      placeholder: "Contoh: Baik, Sangat Baik",
    },
    {
      name: "catatan_sikap",
      label: "Catatan Sikap",
      type: "textarea",
      placeholder: "Catatan tentang sikap siswa",
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

      const response = await fetch(`/api/ringkasan-rapot?${params}`)
      const result = await response.json()

      if (result.success) {
        setData(result.data)
        setPagination(result.pagination)
      } else {
        toast({
          title: "Error",
          description: result.error || "Gagal mengambil data ringkasan rapot",
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

      // Fetch periode ajaran options
      const periodeResponse = await fetch("/api/periode-ajaran?per_page=1000")
      const periodeResult = await periodeResponse.json()
      if (periodeResult.success) {
        setPeriodeAjaranOptions(periodeResult.data)
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
    setSelectedRingkasanRapot(null)
    setShowFormModal(true)
  }

  const handleEdit = (ringkasanRapot: RingkasanRapot) => {
    setSelectedRingkasanRapot(ringkasanRapot)
    setShowFormModal(true)
  }

  const handleDelete = (ringkasanRapot: RingkasanRapot) => {
    setSelectedRingkasanRapot(ringkasanRapot)
    setShowDeleteDialog(true)
  }

  const handleFormSubmit = async (formData: Record<string, any>) => {
    setFormLoading(true)
    try {
      const url = selectedRingkasanRapot ? `/api/ringkasan-rapot/${selectedRingkasanRapot.id}` : "/api/ringkasan-rapot"
      const method = selectedRingkasanRapot ? "PUT" : "POST"

      const processedData = {
        ...formData,
        siswa_id: Number.parseInt(formData.siswa_id),
        periode_ajaran_id: Number.parseInt(formData.periode_ajaran_id),
        total_sakit: formData.total_sakit ? Number.parseInt(formData.total_sakit) : null,
        total_izin: formData.total_izin ? Number.parseInt(formData.total_izin) : null,
        total_alpha: formData.total_alpha ? Number.parseInt(formData.total_alpha) : null,
        rata_rata_spiritual: formData.rata_rata_spiritual ? Number.parseFloat(formData.rata_rata_spiritual) : null,
        rata_rata_sosial: formData.rata_rata_sosial ? Number.parseFloat(formData.rata_rata_sosial) : null,
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
          description: result.message || `Ringkasan rapot berhasil ${selectedRingkasanRapot ? "diperbarui" : "ditambahkan"}`,
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
    if (!selectedRingkasanRapot) return

    try {
      const response = await fetch(`/api/ringkasan-rapot/${selectedRingkasanRapot.id}`, {
        method: "DELETE",
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Berhasil",
          description: "Ringkasan rapot berhasil dihapus",
        })
        fetchData(pagination.page, searchTerm)
      } else {
        toast({
          title: "Error",
          description: result.error || "Gagal menghapus ringkasan rapot",
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
    if (!selectedRingkasanRapot) return {}
    return {
      siswa_id: selectedRingkasanRapot.siswa?.id.toString() || "",
      periode_ajaran_id: selectedRingkasanRapot.periode_ajaran?.id.toString() || "",
      total_sakit: selectedRingkasanRapot.total_sakit?.toString() || "",
      total_izin: selectedRingkasanRapot.total_izin?.toString() || "",
      total_alpha: selectedRingkasanRapot.total_alpha?.toString() || "",
      catatan_akademik: selectedRingkasanRapot.catatan_akademik || "",
      rata_rata_spiritual: selectedRingkasanRapot.rata_rata_spiritual?.toString() || "",
      rata_rata_sosial: selectedRingkasanRapot.rata_rata_sosial?.toString() || "",
      predikat_akhir_sikap: selectedRingkasanRapot.predikat_akhir_sikap || "",
      catatan_sikap: selectedRingkasanRapot.catatan_sikap || "",
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <DataTable
        title="Ringkasan Rapot"
        columns={columns}
        data={data}
        loading={loading}
        pagination={pagination}
        onPageChange={handlePageChange}
        onSearch={handleSearch}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        searchPlaceholder="Cari nama siswa atau catatan..."
        addButtonText="Tambah Ringkasan Rapot"
        emptyMessage="Belum ada data ringkasan rapot"
      />

      <FormModal
        title={selectedRingkasanRapot ? "Edit Ringkasan Rapot" : "Tambah Ringkasan Rapot"}
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
        title="Hapus Ringkasan Rapot"
        description={`Apakah Anda yakin ingin menghapus ringkasan rapot siswa "${selectedRingkasanRapot?.siswa?.nama}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Hapus"
        variant="destructive"
      />
    </div>
  )
}