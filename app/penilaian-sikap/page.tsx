"use client"

import { useState, useEffect } from "react"
import { DataTable, type Column } from "@/src/components/DataTable"
import { FormModal, type FormField } from "@/src/components/FormModal"
import { ConfirmDialog } from "@/src/components/ConfirmDialog"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"

interface PenilaianSikap {
  id: number
  siswa_id: number
  periode_ajaran_id: number
  semester: number
  indikator_sikap_id: number
  nilai: string
  keterangan: string | null
  siswa: {
    id: number
    nama: string
    nis: string
    kelas: {
      nama_kelas: string
      tingkatan: {
        nama_tingkatan: string
      }
    }
  }
  periode_ajaran: {
    semester: number
    master_tahun_ajaran: {
      nama_ajaran: string
    }
  }
  indikator_sikap: {
    id: number
    nama_indikator: string
    deskripsi: string | null
  }
}

export default function PenilaianSikapPage() {
  const [data, setData] = useState<PenilaianSikap[]>([])
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
  const [selectedPenilaian, setSelectedPenilaian] = useState<PenilaianSikap | null>(null)
  const [formLoading, setFormLoading] = useState(false)

  // Filter states
  const [searchTerm, setSearchTerm] = useState("")

  // Options for form selects
  const [siswaOptions, setSiswaOptions] = useState<{ value: number; label: string }[]>([])
  const [periodeOptions, setPeriodeOptions] = useState<{ value: number; label: string }[]>([])
  const [indikatorOptions, setIndikatorOptions] = useState<{ value: number; label: string }[]>([])

  const columns: Column<PenilaianSikap>[] = [
    {
      key: "siswa.nama",
      label: "Nama Siswa",
      className: "font-medium",
    },
    {
      key: "siswa.nis",
      label: "NIS",
      className: "font-mono",
    },
    {
      key: "siswa.kelas.nama_kelas",
      label: "Kelas",
      render: (value, row) => (
        <div>
          <div className="font-medium">{value}</div>
          <div className="text-sm text-muted-foreground">{row.siswa.kelas.tingkatan.nama_tingkatan}</div>
        </div>
      ),
    },
    {
      key: "indikator_sikap.nama_indikator",
      label: "Indikator Sikap",
    },
    {
      key: "nilai",
      label: "Nilai",
      render: (value) => {
        const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
          "Sangat Baik": "default",
          Baik: "secondary",
          Cukup: "outline",
          Kurang: "destructive",
        }
        return <Badge variant={variants[value] || "outline"}>{value}</Badge>
      },
    },
    {
      key: "keterangan",
      label: "Keterangan",
      render: (value) => value || "-",
    },
  ]

  const formFields: FormField[] = [
    {
      name: "siswa_id",
      label: "Siswa",
      type: "select",
      required: true,
      options: siswaOptions,
    },
    {
      name: "periode_ajaran_id",
      label: "Periode Ajaran",
      type: "select",
      required: true,
      options: periodeOptions,
    },
    {
      name: "semester",
      label: "Semester",
      type: "select",
      required: true,
      options: [
        { value: 1, label: "Semester 1" },
        { value: 2, label: "Semester 2" },
      ],
    },
    {
      name: "indikator_sikap_id",
      label: "Indikator Sikap",
      type: "select",
      required: true,
      options: indikatorOptions,
    },
    {
      name: "nilai",
      label: "Nilai",
      type: "select",
      required: true,
      options: [
        { value: "Sangat Baik", label: "Sangat Baik" },
        { value: "Baik", label: "Baik" },
        { value: "Cukup", label: "Cukup" },
        { value: "Kurang", label: "Kurang" },
      ],
    },
    {
      name: "keterangan",
      label: "Keterangan",
      type: "textarea",
      placeholder: "Keterangan tambahan (opsional)",
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

      const response = await fetch(`/api/penilaian-sikap?${params}`)
      const result = await response.json()

      if (result.success) {
        setData(result.data)
        setPagination(result.pagination)
      } else {
        toast({
          title: "Error",
          description: result.error || "Gagal mengambil data penilaian sikap",
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
      // Fetch siswa options
      const siswaResponse = await fetch("/api/siswa")
      if (siswaResponse.ok) {
        const siswaData = await siswaResponse.json()
        setSiswaOptions(
          siswaData.data.map((siswa: any) => ({
            value: siswa.id,
            label: `${siswa.nama} (${siswa.nis})`,
          })),
        )
      }

      // Fetch periode options
      const periodeResponse = await fetch("/api/periode-ajaran")
      if (periodeResponse.ok) {
        const periodeData = await periodeResponse.json()
        setPeriodeOptions(
          periodeData.data.map((periode: any) => ({
            value: periode.id,
            label: `${periode.master_tahun_ajaran.nama_ajaran} - Semester ${periode.semester}`,
          })),
        )
      }

      // Fetch indikator options
      const indikatorResponse = await fetch("/api/indikator-sikap")
      if (indikatorResponse.ok) {
        const indikatorData = await indikatorResponse.json()
        setIndikatorOptions(
          indikatorData.data.map((indikator: any) => ({
            value: indikator.id,
            label: indikator.nama_indikator,
          })),
        )
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
    setSelectedPenilaian(null)
    setShowFormModal(true)
  }

  const handleEdit = (penilaian: PenilaianSikap) => {
    setSelectedPenilaian(penilaian)
    setShowFormModal(true)
  }

  const handleDelete = (penilaian: PenilaianSikap) => {
    setSelectedPenilaian(penilaian)
    setShowDeleteDialog(true)
  }

  const handleFormSubmit = async (formData: Record<string, any>) => {
    setFormLoading(true)
    try {
      const url = selectedPenilaian ? `/api/penilaian-sikap/${selectedPenilaian.id}` : "/api/penilaian-sikap"
      const method = selectedPenilaian ? "PUT" : "POST"

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
          description: result.message || `Penilaian sikap berhasil ${selectedPenilaian ? "diperbarui" : "ditambahkan"}`,
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
    if (!selectedPenilaian) return

    try {
      const response = await fetch(`/api/penilaian-sikap/${selectedPenilaian.id}`, {
        method: "DELETE",
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Berhasil",
          description: "Penilaian sikap berhasil dihapus",
        })
        fetchData(pagination.page, searchTerm)
      } else {
        toast({
          title: "Error",
          description: result.error || "Gagal menghapus penilaian sikap",
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
    if (!selectedPenilaian) return {}
    return selectedPenilaian
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <DataTable
        title="Penilaian Sikap"
        columns={columns}
        data={data}
        loading={loading}
        pagination={pagination}
        onPageChange={handlePageChange}
        onSearch={handleSearch}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        searchPlaceholder="Cari nama atau NIS siswa..."
        addButtonText="Tambah Penilaian"
        emptyMessage="Belum ada data penilaian sikap"
      />

      <FormModal
        title={selectedPenilaian ? "Edit Penilaian Sikap" : "Tambah Penilaian Sikap"}
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
        title="Hapus Penilaian Sikap"
        description={`Apakah Anda yakin ingin menghapus penilaian sikap siswa "${selectedPenilaian?.siswa.nama}" untuk indikator "${selectedPenilaian?.indikator_sikap.nama_indikator}"?`}
        confirmText="Hapus"
        variant="destructive"
      />
    </div>
  )
}
