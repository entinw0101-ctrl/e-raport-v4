"use client"

import { useState, useEffect, useCallback } from "react"
import { DataTable, type Column } from "@/src/components/DataTable"
import { FormModal, type FormField } from "@/src/components/FormModal"
import { ConfirmDialog } from "@/src/components/ConfirmDialog"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"

interface KelasPeriode {
  id: number
  dibuat_pada: string
  diperbarui_pada: string
  kelas: {
    id: number
    nama_kelas: string | null
    tingkatan: {
      nama_tingkatan: string
    } | null
  } | null
  periode_ajaran: {
    id: number
    nama_ajaran: string
    semester: "SATU" | "DUA"
  } | null
}

interface Kelas {
  id: number
  nama_kelas: string | null
  tingkatan: {
    nama_tingkatan: string
  } | null
}

interface PeriodeAjaran {
  id: number
  nama_ajaran: string
  semester: "SATU" | "DUA"
}

export default function KelasPeriodePage() {
  const [data, setData] = useState<KelasPeriode[]>([])
  const [kelasOptions, setKelasOptions] = useState<Kelas[]>([])
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
  const [selectedKelasPeriode, setSelectedKelasPeriode] = useState<KelasPeriode | null>(null)
  const [formLoading, setFormLoading] = useState(false)

  // Filter states
  const [searchTerm, setSearchTerm] = useState("")

  const columns: Column<KelasPeriode>[] = [
    {
      key: "kelas",
      label: "Kelas",
      render: (value) => value ? `${value.nama_kelas} - ${value.tingkatan?.nama_tingkatan}` : "-",
    },
    {
      key: "periode_ajaran",
      label: "Periode Ajaran",
      render: (value) => value ? `${value.nama_ajaran} (${value.semester === "SATU" ? "1" : "2"})` : "-",
    },
    {
      key: "dibuat_pada",
      label: "Dibuat Pada",
      render: (value) => new Date(value).toLocaleDateString("id-ID"),
    },
  ]

  const getFormFields = (): FormField[] => [
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
      name: "periode_ajaran_id",
      label: "Periode Ajaran",
      type: "select",
      required: true,
      options: periodeAjaranOptions.map((periode) => ({
        value: periode.id.toString(),
        label: `${periode.nama_ajaran} (${periode.semester === "SATU" ? "Semester 1" : "Semester 2"})`,
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

      const response = await fetch(`/api/kelas-periode?${params}`)
      const result = await response.json()

      if (result.success) {
        setData(result.data)
        setPagination(result.pagination)
      } else {
        toast({
          title: "Error",
          description: result.error || "Gagal mengambil data kelas periode",
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
      // Fetch kelas options
      const kelasResponse = await fetch("/api/kelas?per_page=1000")
      const kelasResult = await kelasResponse.json()
      if (kelasResult.success) {
        setKelasOptions(kelasResult.data)
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
    setSelectedKelasPeriode(null)
    setShowFormModal(true)
  }

  const handleEdit = (kelasPeriode: KelasPeriode) => {
    setSelectedKelasPeriode(kelasPeriode)
    setShowFormModal(true)
  }

  const handleDelete = (kelasPeriode: KelasPeriode) => {
    setSelectedKelasPeriode(kelasPeriode)
    setShowDeleteDialog(true)
  }

  const handleFormSubmit = async (formData: Record<string, any>) => {
    setFormLoading(true)
    try {
      const url = selectedKelasPeriode ? `/api/kelas-periode/${selectedKelasPeriode.id}` : "/api/kelas-periode"
      const method = selectedKelasPeriode ? "PUT" : "POST"

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
          description: result.message || `Kelas periode berhasil ${selectedKelasPeriode ? "diperbarui" : "ditambahkan"}`,
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
    if (!selectedKelasPeriode) return

    try {
      const response = await fetch(`/api/kelas-periode/${selectedKelasPeriode.id}`, {
        method: "DELETE",
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Berhasil",
          description: "Kelas periode berhasil dihapus",
        })
        fetchData(pagination.page, searchTerm)
      } else {
        toast({
          title: "Error",
          description: result.error || "Gagal menghapus kelas periode",
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
    if (!selectedKelasPeriode) return {}
    return {
      kelas_id: selectedKelasPeriode.kelas?.id.toString() || "",
      periode_ajaran_id: selectedKelasPeriode.periode_ajaran?.id.toString() || "",
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <DataTable
        title="Kelas Periode"
        columns={columns}
        data={data}
        loading={loading}
        pagination={pagination}
        onPageChange={handlePageChange}
        onSearch={handleSearch}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        searchPlaceholder="Cari nama kelas atau periode..."
        addButtonText="Tambah Kelas Periode"
        emptyMessage="Belum ada data kelas periode"
      />

      <FormModal
        title={selectedKelasPeriode ? "Edit Kelas Periode" : "Tambah Kelas Periode"}
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
        title="Hapus Kelas Periode"
        description={`Apakah Anda yakin ingin menghapus kelas periode ini? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Hapus"
        variant="destructive"
      />
    </div>
  )
}