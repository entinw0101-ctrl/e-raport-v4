"use client"

import { useState, useEffect, useCallback } from "react"
import { DataTable, type Column } from "@/src/components/DataTable"
import { FormModal, type FormField } from "@/src/components/FormModal"
import { ConfirmDialog } from "@/src/components/ConfirmDialog"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"

interface PeriodeAjaran {
  id: number
  nama_ajaran: string
  semester: "SATU" | "DUA"
  master_tahun_ajaran_id: number | null
  dibuat_pada: string
  diperbarui_pada: string
  master_tahun_ajaran: {
    id: number
    nama_ajaran: string
    status: string
  } | null
  _count: {
    nilai_ujian: number
    nilai_hafalan: number
    kehadiran: number
    penilaian_sikap: number
    ringkasan_rapot: number
    kelas_periode: number
  }
}

interface MasterTahunAjaran {
  id: number
  nama_ajaran: string
}

export default function PeriodeAjaranPage() {
  const [data, setData] = useState<PeriodeAjaran[]>([])
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
  const [selectedPeriodeAjaran, setSelectedPeriodeAjaran] = useState<PeriodeAjaran | null>(null)
  const [formLoading, setFormLoading] = useState(false)

  // Filter states
  const [searchTerm, setSearchTerm] = useState("")

  const columns: Column<PeriodeAjaran>[] = [
    {
      key: "nama_ajaran",
      label: "Nama Ajaran",
      className: "font-medium",
    },
    {
      key: "semester",
      label: "Semester",
      render: (value) => (
        <Badge variant="outline">
          Semester {value === "SATU" ? "1" : "2"}
        </Badge>
      ),
    },
    {
      key: "master_tahun_ajaran",
      label: "Master Tahun Ajaran",
      render: (value) => value ? value.nama_ajaran : "-",
    },
    {
      key: "_count",
      label: "Data Terkait",
      render: (value) => (
        <div className="text-sm">
          <div>{value.nilai_ujian} nilai ujian</div>
          <div>{value.nilai_hafalan} nilai hafalan</div>
          <div>{value.kehadiran} kehadiran</div>
          <div>{value.penilaian_sikap} penilaian sikap</div>
        </div>
      ),
    },
    {
      key: "dibuat_pada",
      label: "Dibuat Pada",
      render: (value) => new Date(value).toLocaleDateString("id-ID"),
    },
  ]

  const getFormFields = (): FormField[] => [
    {
      name: "nama_ajaran",
      label: "Nama Ajaran",
      type: "text",
      required: true,
      placeholder: "Contoh: 2024/2025 Ganjil, 2024/2025 Genap",
    },
    {
      name: "semester",
      label: "Semester",
      type: "select",
      required: true,
      options: [
        { value: "SATU", label: "Semester 1" },
        { value: "DUA", label: "Semester 2" },
      ],
    },
    {
      name: "master_tahun_ajaran_id",
      label: "Master Tahun Ajaran",
      type: "select",
      placeholder: "Pilih Master Tahun Ajaran (Opsional)",
      options: masterTahunAjaranOptions.map((mta) => ({
        value: mta.id.toString(),
        label: mta.nama_ajaran,
      })),
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

      const response = await fetch(`/api/periode-ajaran?${params}`)
      const result = await response.json()

      if (result.success) {
        setData(result.data)
        setPagination(result.pagination)
      } else {
        toast({
          title: "Error",
          description: result.error || "Gagal mengambil data periode ajaran",
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
      const response = await fetch("/api/master-tahun-ajaran?per_page=100")
      const result = await response.json()
      if (result.success) {
        setMasterTahunAjaranOptions(result.data)
      }
    } catch (error) {
      console.error("Error fetching master tahun ajaran options:", error)
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
    setSelectedPeriodeAjaran(null)
    setShowFormModal(true)
  }

  const handleEdit = (periodeAjaran: PeriodeAjaran) => {
    setSelectedPeriodeAjaran(periodeAjaran)
    setShowFormModal(true)
  }

  const handleDelete = (periodeAjaran: PeriodeAjaran) => {
    setSelectedPeriodeAjaran(periodeAjaran)
    setShowDeleteDialog(true)
  }

  const handleFormSubmit = async (formData: Record<string, any>) => {
    setFormLoading(true)
    try {
      const url = selectedPeriodeAjaran ? `/api/periode-ajaran/${selectedPeriodeAjaran.id}` : "/api/periode-ajaran"
      const method = selectedPeriodeAjaran ? "PUT" : "POST"

      const processedData = {
        ...formData,
        master_tahun_ajaran_id: formData.master_tahun_ajaran_id ? Number.parseInt(formData.master_tahun_ajaran_id) : null,
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
          description: result.message || `Periode ajaran berhasil ${selectedPeriodeAjaran ? "diperbarui" : "ditambahkan"}`,
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
    if (!selectedPeriodeAjaran) return

    try {
      const response = await fetch(`/api/periode-ajaran/${selectedPeriodeAjaran.id}`, {
        method: "DELETE",
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Berhasil",
          description: "Periode ajaran berhasil dihapus",
        })
        fetchData(pagination.page, searchTerm)
      } else {
        toast({
          title: "Error",
          description: result.error || "Gagal menghapus periode ajaran",
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
    if (!selectedPeriodeAjaran) return {}
    return {
      nama_ajaran: selectedPeriodeAjaran.nama_ajaran,
      semester: selectedPeriodeAjaran.semester,
      master_tahun_ajaran_id: selectedPeriodeAjaran.master_tahun_ajaran_id?.toString() || "",
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <DataTable
        title="Periode Ajaran"
        columns={columns}
        data={data}
        loading={loading}
        pagination={pagination}
        onPageChange={handlePageChange}
        onSearch={handleSearch}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        searchPlaceholder="Cari nama ajaran..."
        addButtonText="Tambah Periode Ajaran"
        emptyMessage="Belum ada data periode ajaran"
      />

      <FormModal
        title={selectedPeriodeAjaran ? "Edit Periode Ajaran" : "Tambah Periode Ajaran"}
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
        title="Hapus Periode Ajaran"
        description={`Apakah Anda yakin ingin menghapus periode ajaran "${selectedPeriodeAjaran?.nama_ajaran}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Hapus"
        variant="destructive"
      />
    </div>
  )
}