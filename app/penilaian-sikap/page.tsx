"use client"

import { useState, useEffect, useCallback } from "react"
import { DataTable, type Column } from "@/src/components/DataTable"
import { FormModal, type FormField } from "@/src/components/FormModal"
import { ConfirmDialog } from "@/src/components/ConfirmDialog"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"

interface PenilaianSikap {
   id: number
   siswa_id: number
   periode_ajaran_id: number
   indikator_id: number
   nilai: number
   siswa: {
     id: number
     nama: string
     nis: string
     master_tahun_ajaran?: {
       id: number
       nama_ajaran: string
     }
     kelas: {
       id: number
       nama_kelas: string
       tingkatan: {
         id: number
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
     indikator: string
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
  const [masterTahunAjaranOptions, setMasterTahunAjaranOptions] = useState<{ value: number; label: string }[]>([])
  const [tingkatanOptions, setTingkatanOptions] = useState<{ value: number; label: string }[]>([])
  const [kelasOptions, setKelasOptions] = useState<{ value: number; label: string }[]>([])
  const [siswaOptions, setSiswaOptions] = useState<{ value: number; label: string }[]>([])
  const [periodeOptions, setPeriodeOptions] = useState<{ value: number; label: string }[]>([])
  const [indikatorOptions, setIndikatorOptions] = useState<{ value: number; label: string }[]>([])

  // Selected values for cascading
  const [selectedMasterTahunAjaran, setSelectedMasterTahunAjaran] = useState<number | null>(null)
  const [selectedTingkatan, setSelectedTingkatan] = useState<number | null>(null)
  const [selectedKelas, setSelectedKelas] = useState<number | null>(null)

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
      key: "indikator_sikap.indikator",
      label: "Indikator Sikap",
    },
    {
      key: "nilai",
      label: "Nilai",
      render: (value) => <span className="font-mono">{value}</span>,
    },
    {
      key: "keterangan",
      label: "Keterangan",
      render: (value) => value || "-",
    },
  ]

  const getFormFields = (): FormField[] => [
    {
      name: "master_tahun_ajaran_id",
      label: "Master Tahun Ajaran",
      type: "select",
      required: true,
      options: masterTahunAjaranOptions,
      onChange: (value) => {
        setSelectedMasterTahunAjaran(value ? Number(value) : null)
        setSelectedTingkatan(null)
        setSelectedKelas(null)
        setSiswaOptions([])
      },
    },
    {
      name: "tingkatan_id",
      label: "Tingkatan",
      type: "select",
      required: true,
      options: tingkatanOptions,
      disabled: !selectedMasterTahunAjaran,
      onChange: (value) => {
        setSelectedTingkatan(value ? Number(value) : null)
        setSelectedKelas(null)
        setSiswaOptions([])
      },
    },
    {
      name: "kelas_id",
      label: "Kelas",
      type: "select",
      required: true,
      options: kelasOptions,
      disabled: !selectedTingkatan,
      onChange: (value) => {
        setSelectedKelas(value ? Number(value) : null)
        setSiswaOptions([])
      },
    },
    {
      name: "siswa_id",
      label: "Siswa",
      type: "select",
      required: true,
      options: siswaOptions,
      disabled: !selectedKelas,
    },
    {
      name: "periode_ajaran_id",
      label: "Periode Ajaran",
      type: "select",
      required: true,
      options: periodeOptions,
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
      type: "number",
      required: true,
      placeholder: "Masukkan nilai angka (contoh: 85)",
      min: 0,
      max: 100,
    },
    {
      name: "keterangan",
      label: "Keterangan",
      type: "textarea",
      placeholder: "Keterangan tambahan (opsional)",
      rows: 3,
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
  }, [pagination.per_page])

  const fetchOptions = async () => {
    try {
      // Fetch master tahun ajaran options
      const masterTahunAjaranResponse = await fetch("/api/master-tahun-ajaran")
      if (masterTahunAjaranResponse.ok) {
        const masterTahunAjaranData = await masterTahunAjaranResponse.json()
        setMasterTahunAjaranOptions(
          masterTahunAjaranData.data.map((tahun: any) => ({
            value: tahun.id,
            label: tahun.nama_ajaran,
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
            label: indikator.indikator,
          })),
        )
      }
    } catch (error) {
      console.error("Error fetching options:", error)
    }
  }

  const fetchTingkatanOptions = async () => {
    try {
      const response = await fetch("/api/tingkatan")
      if (response.ok) {
        const data = await response.json()
        setTingkatanOptions(
          data.data.map((tingkatan: any) => ({
            value: tingkatan.id,
            label: tingkatan.nama_tingkatan,
          })),
        )
      }
    } catch (error) {
      console.error("Error fetching tingkatan options:", error)
    }
  }

  const fetchKelasOptions = async (tingkatanId: number) => {
    try {
      const response = await fetch(`/api/kelas?tingkatan_id=${tingkatanId}`)
      if (response.ok) {
        const data = await response.json()
        setKelasOptions(
          data.data.map((kelas: any) => ({
            value: kelas.id,
            label: kelas.nama_kelas,
          })),
        )
      }
    } catch (error) {
      console.error("Error fetching kelas options:", error)
    }
  }

  const fetchSiswaOptions = async (kelasId: number) => {
    try {
      const response = await fetch(`/api/siswa?kelas_id=${kelasId}`)
      if (response.ok) {
        const data = await response.json()
        setSiswaOptions(
          data.data.map((siswa: any) => ({
            value: siswa.id,
            label: `${siswa.nama} (${siswa.nis})`,
          })),
        )
      }
    } catch (error) {
      console.error("Error fetching siswa options:", error)
    }
  }

  useEffect(() => {
    fetchData()
    fetchOptions()
  }, [])

  useEffect(() => {
    if (selectedMasterTahunAjaran) {
      fetchTingkatanOptions()
    } else {
      setTingkatanOptions([])
      setSelectedTingkatan(null)
    }
  }, [selectedMasterTahunAjaran])

  useEffect(() => {
    if (selectedTingkatan) {
      fetchKelasOptions(selectedTingkatan)
    } else {
      setKelasOptions([])
      setSelectedKelas(null)
    }
  }, [selectedTingkatan])

  useEffect(() => {
    if (selectedKelas) {
      fetchSiswaOptions(selectedKelas)
    } else {
      setSiswaOptions([])
    }
  }, [selectedKelas])

  const handlePageChange = useCallback((page: number) => {
    fetchData(page, searchTerm)
  }, [fetchData, searchTerm])

  const handleSearch = useCallback((search: string) => {
    setSearchTerm(search)
    fetchData(1, search)
  }, [fetchData])

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

      // Only send the required fields for the API
      const apiData = {
        siswa_id: formData.siswa_id,
        periode_ajaran_id: formData.periode_ajaran_id,
        indikator_sikap_id: formData.indikator_sikap_id,
        nilai: Number(formData.nilai),
        keterangan: formData.keterangan || null,
      }

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(apiData),
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

    // For editing, we need to set the selected values for cascading
    if (selectedPenilaian.siswa?.kelas?.tingkatan) {
      setSelectedTingkatan(selectedPenilaian.siswa.kelas.tingkatan.id)
      setSelectedKelas(selectedPenilaian.siswa.kelas.id)
    }

    return {
      ...selectedPenilaian,
      master_tahun_ajaran_id: selectedPenilaian.siswa?.master_tahun_ajaran?.id,
      tingkatan_id: selectedPenilaian.siswa?.kelas?.tingkatan?.id,
      kelas_id: selectedPenilaian.siswa?.kelas?.id,
    }
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
        title="Hapus Penilaian Sikap"
        description={`Apakah Anda yakin ingin menghapus penilaian sikap siswa "${selectedPenilaian?.siswa.nama}" untuk indikator "${selectedPenilaian?.indikator_sikap.indikator}"?`}
        confirmText="Hapus"
        variant="destructive"
      />
    </div>
  )
}
