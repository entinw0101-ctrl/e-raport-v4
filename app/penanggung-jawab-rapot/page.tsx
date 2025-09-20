"use client"

import { useState, useEffect, useCallback } from "react"
import { DataTable, type Column } from "@/src/components/DataTable"
import { FormModal, type FormField } from "@/src/components/FormModal"
import { ConfirmDialog } from "@/src/components/ConfirmDialog"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"

interface PenanggungJawabRapot {
  id: number
  jabatan: string
  nama_pejabat: string
  nip: string | null
  tanda_tangan: string | null
  jenis_kelamin_target: "LAKI_LAKI" | "PEREMPUAN" | "Semua"
  status: "aktif" | "nonaktif"
  dibuat_pada: string
  diperbarui_pada: string
}

export default function PenanggungJawabRapotPage() {
  const [data, setData] = useState<PenanggungJawabRapot[]>([])
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
  const [selectedPenanggungJawabRapot, setSelectedPenanggungJawabRapot] = useState<PenanggungJawabRapot | null>(null)
  const [formLoading, setFormLoading] = useState(false)

  // Filter states
  const [searchTerm, setSearchTerm] = useState("")

  const columns: Column<PenanggungJawabRapot>[] = [
    {
      key: "jabatan",
      label: "Jabatan",
      className: "font-medium",
    },
    {
      key: "nama_pejabat",
      label: "Nama Pejabat",
      className: "font-medium",
    },
    {
      key: "nip",
      label: "NIP",
      render: (value) => value || "-",
    },
    {
      key: "jenis_kelamin_target",
      label: "Target Gender",
      render: (value) => {
        const labels = {
          LAKI_LAKI: "Laki-laki",
          PEREMPUAN: "Perempuan",
          Semua: "Semua",
        }
        return (
          <Badge variant="outline">
            {labels[value as keyof typeof labels]}
          </Badge>
        )
      },
    },
    {
      key: "status",
      label: "Status",
      render: (value) => (
        <Badge variant={value === "aktif" ? "default" : "secondary"}>
          {value === "aktif" ? "Aktif" : "Non-aktif"}
        </Badge>
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
      name: "jabatan",
      label: "Jabatan",
      type: "text",
      required: true,
      placeholder: "Contoh: Kepala Sekolah, Wali Kelas",
    },
    {
      name: "nama_pejabat",
      label: "Nama Pejabat",
      type: "text",
      required: true,
      placeholder: "Nama lengkap pejabat",
    },
    {
      name: "nip",
      label: "NIP",
      type: "text",
      placeholder: "Nomor Induk Pegawai (opsional)",
    },
    {
      name: "tanda_tangan",
      label: "Path Tanda Tangan",
      type: "text",
      placeholder: "Path ke file tanda tangan (opsional)",
    },
    {
      name: "jenis_kelamin_target",
      label: "Target Jenis Kelamin",
      type: "select",
      required: true,
      options: [
        { value: "LAKI_LAKI", label: "Laki-laki" },
        { value: "PEREMPUAN", label: "Perempuan" },
        { value: "Semua", label: "Semua" },
      ],
    },
    {
      name: "status",
      label: "Status",
      type: "select",
      required: true,
      options: [
        { value: "aktif", label: "Aktif" },
        { value: "nonaktif", label: "Non-aktif" },
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

      const response = await fetch(`/api/penanggung-jawab-rapot?${params}`)
      const result = await response.json()

      if (result.success) {
        setData(result.data)
        setPagination(result.pagination)
      } else {
        toast({
          title: "Error",
          description: result.error || "Gagal mengambil data penanggung jawab rapot",
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

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handlePageChange = useCallback((page: number) => {
    fetchData(page, searchTerm)
  }, [fetchData, searchTerm])

  const handleSearch = useCallback((search: string) => {
    setSearchTerm(search)
    fetchData(1, search)
  }, [fetchData])

  const handleAdd = () => {
    setSelectedPenanggungJawabRapot(null)
    setShowFormModal(true)
  }

  const handleEdit = (penanggungJawabRapot: PenanggungJawabRapot) => {
    setSelectedPenanggungJawabRapot(penanggungJawabRapot)
    setShowFormModal(true)
  }

  const handleDelete = (penanggungJawabRapot: PenanggungJawabRapot) => {
    setSelectedPenanggungJawabRapot(penanggungJawabRapot)
    setShowDeleteDialog(true)
  }

  const handleFormSubmit = async (formData: Record<string, any>) => {
    setFormLoading(true)
    try {
      const url = selectedPenanggungJawabRapot ? `/api/penanggung-jawab-rapot/${selectedPenanggungJawabRapot.id}` : "/api/penanggung-jawab-rapot"
      const method = selectedPenanggungJawabRapot ? "PUT" : "POST"

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
          description: result.message || `Penanggung jawab rapot berhasil ${selectedPenanggungJawabRapot ? "diperbarui" : "ditambahkan"}`,
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
    if (!selectedPenanggungJawabRapot) return

    try {
      const response = await fetch(`/api/penanggung-jawab-rapot/${selectedPenanggungJawabRapot.id}`, {
        method: "DELETE",
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Berhasil",
          description: "Penanggung jawab rapot berhasil dihapus",
        })
        fetchData(pagination.page, searchTerm)
      } else {
        toast({
          title: "Error",
          description: result.error || "Gagal menghapus penanggung jawab rapot",
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
    if (!selectedPenanggungJawabRapot) return { status: "aktif", jenis_kelamin_target: "Semua" }
    return {
      jabatan: selectedPenanggungJawabRapot.jabatan,
      nama_pejabat: selectedPenanggungJawabRapot.nama_pejabat,
      nip: selectedPenanggungJawabRapot.nip || "",
      tanda_tangan: selectedPenanggungJawabRapot.tanda_tangan || "",
      jenis_kelamin_target: selectedPenanggungJawabRapot.jenis_kelamin_target,
      status: selectedPenanggungJawabRapot.status,
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <DataTable
        title="Penanggung Jawab Rapot"
        columns={columns}
        data={data}
        loading={loading}
        pagination={pagination}
        onPageChange={handlePageChange}
        onSearch={handleSearch}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        searchPlaceholder="Cari jabatan, nama pejabat, atau NIP..."
        addButtonText="Tambah Penanggung Jawab"
        emptyMessage="Belum ada data penanggung jawab rapot"
      />

      <FormModal
        title={selectedPenanggungJawabRapot ? "Edit Penanggung Jawab Rapot" : "Tambah Penanggung Jawab Rapot"}
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
        title="Hapus Penanggung Jawab Rapot"
        description={`Apakah Anda yakin ingin menghapus penanggung jawab rapot "${selectedPenanggungJawabRapot?.nama_pejabat}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Hapus"
        variant="destructive"
      />
    </div>
  )
}