"use client"

import { useState, useEffect, useCallback } from "react"
import { DataTable, type Column } from "@/src/components/DataTable"
import { FormModal, type FormField } from "@/src/components/FormModal"
import { ConfirmDialog } from "@/src/components/ConfirmDialog"
import { siswaService, type Siswa } from "@/src/services/siswaService"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { id } from "date-fns/locale"

export default function SiswaPage() {
  const [data, setData] = useState<Siswa[]>([])
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
  const [selectedSiswa, setSelectedSiswa] = useState<Siswa | null>(null)
  const [formLoading, setFormLoading] = useState(false)

  // Filter states (removed for now to fix infinite loops)
  const [searchTerm, setSearchTerm] = useState("")
  // const [selectedTingkatan, setSelectedTingkatan] = useState("")
  // const [selectedKelas, setSelectedKelas] = useState("")

  // Options for form selects
  const [kelasOptions, setKelasOptions] = useState<{ value: number; label: string }[]>([])
  const [kamarOptions, setKamarOptions] = useState<{ value: number; label: string }[]>([])
  const [tahunAjaranOptions, setTahunAjaranOptions] = useState<{ value: number; label: string }[]>([])
  const [tingkatanOptions, setTingkatanOptions] = useState<{ value: string; label: string }[]>([])

  const columns: Column<Siswa>[] = [
    {
      key: "nis",
      label: "NIS",
      className: "font-mono",
    },
    {
      key: "nama",
      label: "Nama Siswa",
      className: "font-medium",
    },
    {
      key: "jenis_kelamin",
      label: "L/P",
      render: (value) => (
        <Badge variant={value === "LAKI_LAKI" ? "default" : "secondary"}>{value === "LAKI_LAKI" ? "L" : "P"}</Badge>
      ),
    },
    {
      key: "kelas.nama_kelas",
      label: "Kelas",
      render: (value, row) => (
        <div>
          <div className="font-medium">{value || "-"}</div>
          {row.kelas?.tingkatan && (
            <div className="text-sm text-muted-foreground">{row.kelas.tingkatan.nama_tingkatan}</div>
          )}
        </div>
      ),
    },
    {
      key: "kamar.nama_kamar",
      label: "Kamar",
    },
    {
      key: "status",
      label: "Status",
      render: (value) => {
        const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
          Aktif: "default",
          Lulus: "secondary",
          Keluar: "destructive",
          Pindah: "outline",
        }
        return <Badge variant={variants[value] || "outline"}>{value}</Badge>
      },
    },
    {
      key: "tanggal_lahir",
      label: "Tanggal Lahir",
      render: (value) => (value ? format(new Date(value), "dd MMM yyyy", { locale: id }) : "-"),
    },
  ]

  const getFormFields = (): FormField[] => [
    {
      name: "nama",
      label: "Nama Lengkap",
      type: "text",
      required: true,
      placeholder: "Masukkan nama lengkap siswa",
    },
    {
      name: "nis",
      label: "NIS",
      type: "text",
      required: true,
      placeholder: "Nomor Induk Siswa",
    },
    {
      name: "jenis_kelamin",
      label: "Jenis Kelamin",
      type: "select",
      required: true,
      options: [
        { value: "LAKI_LAKI", label: "Laki-laki" },
        { value: "PEREMPUAN", label: "Perempuan" },
      ],
    },
    {
      name: "tempat_lahir",
      label: "Tempat Lahir",
      type: "text",
      placeholder: "Kota tempat lahir",
    },
    {
      name: "tanggal_lahir",
      label: "Tanggal Lahir",
      type: "date",
    },
    {
      name: "agama",
      label: "Agama",
      type: "text",
      placeholder: "Agama siswa",
    },
    {
      name: "kelas_id",
      label: "Kelas",
      type: "select",
      options: kelasOptions,
    },
    {
      name: "kamar_id",
      label: "Kamar",
      type: "select",
      options: kamarOptions,
    },
    {
      name: "alamat",
      label: "Alamat",
      type: "textarea",
      placeholder: "Alamat lengkap siswa",
      rows: 3,
    },
    {
      name: "nama_ayah",
      label: "Nama Ayah",
      type: "text",
      placeholder: "Nama lengkap ayah",
    },
    {
      name: "pekerjaan_ayah",
      label: "Pekerjaan Ayah",
      type: "text",
      placeholder: "Pekerjaan ayah",
    },
    {
      name: "nama_ibu",
      label: "Nama Ibu",
      type: "text",
      placeholder: "Nama lengkap ibu",
    },
    {
      name: "pekerjaan_ibu",
      label: "Pekerjaan Ibu",
      type: "text",
      placeholder: "Pekerjaan ibu",
    },
    {
      name: "status",
      label: "Status",
      type: "select",
      required: true,
      options: [
        { value: "Aktif", label: "Aktif" },
        { value: "Lulus", label: "Lulus" },
        { value: "Keluar", label: "Keluar" },
        { value: "Pindah", label: "Pindah" },
      ],
    },
  ]

  const fetchData = useCallback(async (page = 1, search = "") => {
    setLoading(true)
    try {
      const perPage = pagination?.per_page || 10
      const response = await siswaService.getAll({
        page,
        per_page: perPage,
        search: search || undefined,
      })

      if (response.success && response.data) {
        setData(response.data.data || [])
        setPagination(response.data.pagination || {
          page: 1,
          per_page: 10,
          total: 0,
          total_pages: 0,
        })
      } else {
        setData([])
        setPagination({
          page: 1,
          per_page: 10,
          total: 0,
          total_pages: 0,
        })
        toast({
          title: "Error",
          description: response.error || "Gagal mengambil data siswa",
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
  }, [pagination?.per_page])

  const fetchOptions = async () => {
    try {
      const tingkatanResponse = await fetch("/api/tingkatan")
      if (tingkatanResponse.ok) {
        const tingkatanData = await tingkatanResponse.json()
        setTingkatanOptions(
          tingkatanData.data.map((tingkatan: any) => ({
            value: tingkatan.id.toString(),
            label: tingkatan.nama_tingkatan,
          })),
        )
      }

      // Fetch kelas options
      const kelasResponse = await fetch("/api/kelas")
      if (kelasResponse.ok) {
        const kelasData = await kelasResponse.json()
        setKelasOptions(
          kelasData.data.map((kelas: any) => ({
            value: kelas.id,
            label: `${kelas.nama_kelas} - ${kelas.tingkatan?.nama_tingkatan || ""}`,
          })),
        )
      }

      // Fetch kamar options
      const kamarResponse = await fetch("/api/kamar")
      if (kamarResponse.ok) {
        const kamarData = await kamarResponse.json()
        setKamarOptions(
          kamarData.data.map((kamar: any) => ({
            value: kamar.id,
            label: kamar.nama_kamar,
          })),
        )
      }

      // Fetch tahun ajaran options
      const tahunResponse = await fetch("/api/master-tahun-ajaran")
      if (tahunResponse.ok) {
        const tahunData = await tahunResponse.json()
        setTahunAjaranOptions(
          tahunData.data.map((tahun: any) => ({
            value: tahun.id,
            label: tahun.nama_ajaran,
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
    fetchData(page, searchTerm)
  }, [fetchData, searchTerm])

  const handleSearch = useCallback((search: string) => {
    setSearchTerm(search)
    fetchData(1, search)
  }, [fetchData])

  const handleAdd = () => {
    setSelectedSiswa(null)
    setShowFormModal(true)
  }

  const handleEdit = (siswa: Siswa) => {
    setSelectedSiswa(siswa)
    setShowFormModal(true)
  }

  const handleDelete = (siswa: Siswa) => {
    setSelectedSiswa(siswa)
    setShowDeleteDialog(true)
  }

  const handleFormSubmit = async (formData: Record<string, any>) => {
    setFormLoading(true)
    try {
      // Convert form data to proper types
      const processedData = {
        ...formData,
        kelas_id: formData.kelas_id ? Number(formData.kelas_id) : undefined,
        kamar_id: formData.kamar_id ? Number(formData.kamar_id) : undefined,
        master_tahun_ajaran_id: formData.master_tahun_ajaran_id ? Number(formData.master_tahun_ajaran_id) : undefined,
      }

      let response
      if (selectedSiswa) {
        response = await siswaService.update(selectedSiswa.id, processedData)
      } else {
        response = await siswaService.create(processedData as any)
      }

      if (response.success) {
        toast({
          title: "Berhasil",
          description: response.message || `Siswa berhasil ${selectedSiswa ? "diperbarui" : "ditambahkan"}`,
        })
        fetchData(pagination.page, searchTerm)
        setShowFormModal(false)
      } else {
        toast({
          title: "Error",
          description: response.error || "Terjadi kesalahan",
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
    if (!selectedSiswa) return

    try {
      const response = await siswaService.delete(selectedSiswa.id)
      if (response.success) {
        toast({
          title: "Berhasil",
          description: "Siswa berhasil dihapus",
        })
        fetchData(pagination.page, searchTerm)
      } else {
        toast({
          title: "Error",
          description: response.error || "Gagal menghapus siswa",
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

  // Filter functions removed to prevent infinite loops
  // const handleTingkatanChange = (tingkatan: string) => {
  //   setSelectedTingkatan(tingkatan)
  //   fetchData(1, searchTerm, tingkatan, selectedKelas)
  // }

  // const handleKelasChange = (kelas: string) => {
  //   setSelectedKelas(kelas)
  //   fetchData(1, searchTerm, selectedTingkatan, kelas)
  // }

  // const handleFilterReset = () => {
  //   setSelectedTingkatan("")
  //   setSelectedKelas("")
  //   fetchData(1, searchTerm, "", "")
  // }

  const getInitialFormData = () => {
    if (!selectedSiswa) return { status: "Aktif" }

    return {
      ...selectedSiswa,
      tanggal_lahir: selectedSiswa.tanggal_lahir
        ? new Date(selectedSiswa.tanggal_lahir).toISOString().split("T")[0]
        : "",
      kelas_id: selectedSiswa.kelas_id || "",
      kamar_id: selectedSiswa.kamar_id || "",
      master_tahun_ajaran_id: selectedSiswa.master_tahun_ajaran_id || "",
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <DataTable
        title="Data Siswa"
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
        addButtonText="Tambah Siswa"
        emptyMessage="Belum ada data siswa"
      />

      <FormModal
        title={selectedSiswa ? "Edit Siswa" : "Tambah Siswa"}
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
        title="Hapus Siswa"
        description={`Apakah Anda yakin ingin menghapus siswa "${selectedSiswa?.nama}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Hapus"
        variant="destructive"
      />
    </div>
  )
}
