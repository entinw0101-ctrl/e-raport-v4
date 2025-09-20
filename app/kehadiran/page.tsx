"use client"

import { useState, useEffect, useCallback } from "react"
import { DataTable, type Column } from "@/src/components/DataTable"
import { FormModal, type FormField } from "@/src/components/FormModal"
import { ConfirmDialog } from "@/src/components/ConfirmDialog"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { id } from "date-fns/locale"

interface Kehadiran {
  id: number
  siswa_id: number
  periode_ajaran_id: number
  semester: number
  tanggal: string
  status: "HADIR" | "SAKIT" | "IZIN" | "ALPA"
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
}

export default function KehadiranPage() {
  const [data, setData] = useState<Kehadiran[]>([])
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
  const [selectedKehadiran, setSelectedKehadiran] = useState<Kehadiran | null>(null)
  const [formLoading, setFormLoading] = useState(false)

  // Filter states
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedKelas, setSelectedKelas] = useState("")
  const [selectedPeriode, setSelectedPeriode] = useState("")
  const [selectedSemester, setSelectedSemester] = useState("")

  // Options for form selects
  const [siswaOptions, setSiswaOptions] = useState<{ value: number; label: string }[]>([])
  const [periodeOptions, setPeriodeOptions] = useState<{ value: number; label: string }[]>([])
  const [kelasOptions, setKelasOptions] = useState<{ value: string; label: string }[]>([])

  const columns: Column<Kehadiran>[] = [
    {
      key: "tanggal",
      label: "Tanggal",
      render: (value) => format(new Date(value), "dd MMM yyyy", { locale: id }),
    },
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
      key: "status",
      label: "Status",
      render: (value) => {
        const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
          HADIR: "default",
          SAKIT: "secondary",
          IZIN: "outline",
          ALPA: "destructive",
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

  const getFormFields = (): FormField[] => [
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
      name: "tanggal",
      label: "Tanggal",
      type: "date",
      required: true,
    },
    {
      name: "status",
      label: "Status Kehadiran",
      type: "select",
      required: true,
      options: [
        { value: "HADIR", label: "Hadir" },
        { value: "SAKIT", label: "Sakit" },
        { value: "IZIN", label: "Izin" },
        { value: "ALPA", label: "Alpa" },
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

  const fetchData = useCallback(async (page = 1, search = "", kelas = "", periode = "", semester = "") => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: pagination.per_page.toString(),
        ...(search && { search }),
        ...(kelas && { kelas_id: kelas }),
        ...(periode && { periode_ajaran_id: periode }),
        ...(semester && { semester }),
      })

      const response = await fetch(`/api/kehadiran?${params}`)
      const result = await response.json()

      if (result.success) {
        setData(result.data)
        setPagination(result.pagination)
      } else {
        toast({
          title: "Error",
          description: result.error || "Gagal mengambil data kehadiran",
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

      // Fetch kelas options
      const kelasResponse = await fetch("/api/kelas")
      if (kelasResponse.ok) {
        const kelasData = await kelasResponse.json()
        setKelasOptions(
          kelasData.data.map((kelas: any) => ({
            value: kelas.id.toString(),
            label: `${kelas.nama_kelas} - ${kelas.tingkatan?.nama_tingkatan || ""}`,
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

  const handlePageChange = useCallback((page: number) => {
    fetchData(page, searchTerm, selectedKelas, selectedPeriode, selectedSemester)
  }, [fetchData, searchTerm, selectedKelas, selectedPeriode, selectedSemester])

  const handleSearch = useCallback((search: string) => {
    setSearchTerm(search)
    fetchData(1, search, selectedKelas, selectedPeriode, selectedSemester)
  }, [fetchData, selectedKelas, selectedPeriode, selectedSemester])

  const handleAdd = () => {
    setSelectedKehadiran(null)
    setShowFormModal(true)
  }

  const handleEdit = (kehadiran: Kehadiran) => {
    setSelectedKehadiran(kehadiran)
    setShowFormModal(true)
  }

  const handleDelete = (kehadiran: Kehadiran) => {
    setSelectedKehadiran(kehadiran)
    setShowDeleteDialog(true)
  }

  const handleFormSubmit = async (formData: Record<string, any>) => {
    setFormLoading(true)
    try {
      const url = selectedKehadiran ? `/api/kehadiran/${selectedKehadiran.id}` : "/api/kehadiran"
      const method = selectedKehadiran ? "PUT" : "POST"

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
          description: result.message || `Data kehadiran berhasil ${selectedKehadiran ? "diperbarui" : "ditambahkan"}`,
        })
        fetchData(pagination.page, searchTerm, selectedKelas, selectedPeriode, selectedSemester)
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
    if (!selectedKehadiran) return

    try {
      const response = await fetch(`/api/kehadiran/${selectedKehadiran.id}`, {
        method: "DELETE",
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Berhasil",
          description: "Data kehadiran berhasil dihapus",
        })
        fetchData(pagination.page, searchTerm, selectedKelas, selectedPeriode, selectedSemester)
      } else {
        toast({
          title: "Error",
          description: result.error || "Gagal menghapus data kehadiran",
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
    if (!selectedKehadiran) return {}

    return {
      ...selectedKehadiran,
      tanggal: new Date(selectedKehadiran.tanggal).toISOString().split("T")[0],
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <DataTable
        title="Data Kehadiran"
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
        addButtonText="Tambah Kehadiran"
        emptyMessage="Belum ada data kehadiran"
      />

      <FormModal
        title={selectedKehadiran ? "Edit Kehadiran" : "Tambah Kehadiran"}
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
        title="Hapus Data Kehadiran"
        description={`Apakah Anda yakin ingin menghapus data kehadiran siswa "${selectedKehadiran?.siswa.nama}" pada tanggal ${selectedKehadiran ? format(new Date(selectedKehadiran.tanggal), "dd MMM yyyy", { locale: id }) : ""}?`}
        confirmText="Hapus"
        variant="destructive"
      />
    </div>
  )
}
