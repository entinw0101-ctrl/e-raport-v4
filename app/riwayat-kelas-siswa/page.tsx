"use client"

import { useState, useEffect, useCallback } from "react"
import { DataTable, type Column } from "@/src/components/DataTable"
import { FormModal, type FormField } from "@/src/components/FormModal"
import { ConfirmDialog } from "@/src/components/ConfirmDialog"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"

interface RiwayatKelasSiswa {
  id: number
  dibuat_pada: string
  siswa: {
    id: number
    nama: string | null
    nis: string
  } | null
  kelas: {
    id: number
    nama_kelas: string | null
    tingkatan: {
      nama_tingkatan: string
    } | null
  } | null
  master_tahun_ajaran: {
    id: number
    nama_ajaran: string
  } | null
}

interface Siswa {
  id: number
  nama: string | null
  nis: string
}

interface Kelas {
  id: number
  nama_kelas: string | null
  tingkatan: {
    nama_tingkatan: string
  } | null
}

interface MasterTahunAjaran {
  id: number
  nama_ajaran: string
}

export default function RiwayatKelasSiswaPage() {
  const [data, setData] = useState<RiwayatKelasSiswa[]>([])
  const [siswaOptions, setSiswaOptions] = useState<Siswa[]>([])
  const [kelasOptions, setKelasOptions] = useState<Kelas[]>([])
  const [masterTahunAjaranOptions, setMasterTahunAjaranOptions] = useState<MasterTahunAjaran[]>([])
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
  const [selectedRiwayatKelasSiswa, setSelectedRiwayatKelasSiswa] = useState<RiwayatKelasSiswa | null>(null)
  const [formLoading, setFormLoading] = useState(false)

  // Filter states
  const [searchTerm, setSearchTerm] = useState("")

  const columns: Column<RiwayatKelasSiswa>[] = [
    {
      key: "siswa",
      label: "Siswa",
      render: (value) => value ? `${value.nama} (${value.nis})` : "-",
    },
    {
      key: "kelas",
      label: "Kelas",
      render: (value) => value ? `${value.nama_kelas} - ${value.tingkatan?.nama_tingkatan}` : "-",
    },
    {
      key: "master_tahun_ajaran",
      label: "Tahun Ajaran",
      render: (value) => value ? value.nama_ajaran : "-",
    },
    {
      key: "dibuat_pada",
      label: "Dibuat Pada",
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
      name: "kelas_id",
      label: "Kelas",
      type: "select",
      required: true,
      options: kelasOptions.map((kelas) => ({
        value: kelas.id.toString(),
        label: `${kelas.nama_kelas} - ${kelas.tingkatan?.nama_tingkatan}`,
      })),
    },
    {
      name: "master_tahun_ajaran_id",
      label: "Tahun Ajaran",
      type: "select",
      options: [
        { value: "", label: "Pilih Tahun Ajaran (Opsional)" },
        ...masterTahunAjaranOptions.map((mta) => ({
          value: mta.id.toString(),
          label: mta.nama_ajaran,
        })),
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

      const response = await fetch(`/api/riwayat-kelas-siswa?${params}`)
      const result = await response.json()

      if (result.success) {
        setData(result.data)
        setPagination(result.pagination)
      } else {
        toast({
          title: "Error",
          description: result.error || "Gagal mengambil data riwayat kelas siswa",
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

      // Fetch kelas options
      const kelasResponse = await fetch("/api/kelas?per_page=1000")
      const kelasResult = await kelasResponse.json()
      if (kelasResult.success) {
        setKelasOptions(kelasResult.data)
      }

      // Fetch master tahun ajaran options
      const mtaResponse = await fetch("/api/master-tahun-ajaran?per_page=1000")
      const mtaResult = await mtaResponse.json()
      if (mtaResult.success) {
        setMasterTahunAjaranOptions(mtaResult.data)
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
    setSelectedRiwayatKelasSiswa(null)
    setShowFormModal(true)
  }

  const handleEdit = (riwayatKelasSiswa: RiwayatKelasSiswa) => {
    setSelectedRiwayatKelasSiswa(riwayatKelasSiswa)
    setShowFormModal(true)
  }

  const handleDelete = (riwayatKelasSiswa: RiwayatKelasSiswa) => {
    setSelectedRiwayatKelasSiswa(riwayatKelasSiswa)
    setShowDeleteDialog(true)
  }

  const handleFormSubmit = async (formData: Record<string, any>) => {
    setFormLoading(true)
    try {
      const url = selectedRiwayatKelasSiswa ? `/api/riwayat-kelas-siswa/${selectedRiwayatKelasSiswa.id}` : "/api/riwayat-kelas-siswa"
      const method = selectedRiwayatKelasSiswa ? "PUT" : "POST"

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
          description: result.message || `Riwayat kelas siswa berhasil ${selectedRiwayatKelasSiswa ? "diperbarui" : "ditambahkan"}`,
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
    if (!selectedRiwayatKelasSiswa) return

    try {
      const response = await fetch(`/api/riwayat-kelas-siswa/${selectedRiwayatKelasSiswa.id}`, {
        method: "DELETE",
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Berhasil",
          description: "Riwayat kelas siswa berhasil dihapus",
        })
        fetchData(pagination.page, searchTerm)
      } else {
        toast({
          title: "Error",
          description: result.error || "Gagal menghapus riwayat kelas siswa",
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
    if (!selectedRiwayatKelasSiswa) return {}
    return {
      siswa_id: selectedRiwayatKelasSiswa.siswa?.id.toString() || "",
      kelas_id: selectedRiwayatKelasSiswa.kelas?.id.toString() || "",
      master_tahun_ajaran_id: selectedRiwayatKelasSiswa.master_tahun_ajaran?.id.toString() || "",
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <DataTable
        title="Riwayat Kelas Siswa"
        columns={columns}
        data={data}
        loading={loading}
        pagination={pagination}
        onPageChange={handlePageChange}
        onSearch={handleSearch}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        searchPlaceholder="Cari nama siswa atau kelas..."
        addButtonText="Tambah Riwayat"
        emptyMessage="Belum ada data riwayat kelas siswa"
      />

      <FormModal
        title={selectedRiwayatKelasSiswa ? "Edit Riwayat Kelas Siswa" : "Tambah Riwayat Kelas Siswa"}
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
        title="Hapus Riwayat Kelas Siswa"
        description={`Apakah Anda yakin ingin menghapus riwayat kelas siswa ini? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Hapus"
        variant="destructive"
      />
    </div>
  )
}