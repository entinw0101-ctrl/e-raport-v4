"use client"

import { useState, useEffect } from "react"
import { DataTable, type Column } from "@/src/components/DataTable"
import { FormModal, type FormField } from "@/src/components/FormModal"
import { ConfirmDialog } from "@/src/components/ConfirmDialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Upload } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { guruService, type Guru } from "@/src/services/guruService"

export default function GuruPage() {
  const [data, setData] = useState<Guru[]>([])
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
  const [selectedGuru, setSelectedGuru] = useState<Guru | null>(null)
  const [formLoading, setFormLoading] = useState(false)

  // Filter states
  const [searchTerm, setSearchTerm] = useState("")

  const columns: Column<Guru>[] = [
    {
      key: "nip",
      label: "NIP",
      className: "font-mono",
      render: (value) => value || "-",
    },
    {
      key: "nama",
      label: "Nama Guru",
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
      key: "telepon",
      label: "Telepon",
      className: "font-mono",
      render: (value) => value || "-",
    },
    {
      key: "kelas_wali",
      label: "Wali Kelas",
      render: (value) => {
        if (!value || value.length === 0) return "-"
        return (
          <div className="space-y-1">
            {value.map((kelas: any) => (
              <div key={kelas.id}>
                <div className="font-medium">{kelas.nama_kelas}</div>
                {kelas.tingkatan && (
                  <div className="text-sm text-muted-foreground">{kelas.tingkatan.nama_tingkatan}</div>
                )}
              </div>
            ))}
          </div>
        )
      },
    },
    {
      key: "status",
      label: "Status",
      render: (value) => (
        <Badge variant={value === "aktif" ? "default" : "secondary"}>{value === "aktif" ? "Aktif" : "Non-aktif"}</Badge>
      ),
    },
    {
      key: "tanda_tangan",
      label: "Tanda Tangan",
      render: (value, row) => (
        <div className="flex items-center gap-2">
          {value ? <Badge variant="default">Ada</Badge> : <Badge variant="secondary">Belum</Badge>}
          <Button size="sm" variant="outline" onClick={() => handleUploadSignature(row)}>
            <Upload className="h-3 w-3" />
          </Button>
        </div>
      ),
    },
    {
      key: "tanggal_lahir",
      label: "Tanggal Lahir",
      render: (value) => (value ? format(new Date(value), "dd MMM yyyy", { locale: id }) : "-"),
    },
  ]

  const formFields: FormField[] = [
    {
      name: "nama",
      label: "Nama Lengkap",
      type: "text",
      required: true,
      placeholder: "Masukkan nama lengkap guru",
    },
    {
      name: "nip",
      label: "NIP",
      type: "text",
      placeholder: "Nomor Induk Pegawai (opsional)",
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
      name: "telepon",
      label: "Nomor Telepon",
      type: "text",
      placeholder: "Nomor telepon/HP",
    },
    {
      name: "alamat",
      label: "Alamat",
      type: "textarea",
      placeholder: "Alamat lengkap guru",
      rows: 3,
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

  const fetchData = async (page = 1, search = "") => {
    setLoading(true)
    try {
      const result = await guruService.getAll({
        page,
        per_page: pagination.per_page,
        search: search || undefined,
      })

      if (result.success) {
        setData(result.data)
        setPagination(result.pagination)
      } else {
        toast({
          title: "Error",
          description: result.error || "Gagal mengambil data guru",
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

  useEffect(() => {
    fetchData()
  }, [])

  const handlePageChange = (page: number) => {
    fetchData(page, searchTerm)
  }

  const handleSearch = (search: string) => {
    setSearchTerm(search)
    fetchData(1, search)
  }

  const handleAdd = () => {
    setSelectedGuru(null)
    setShowFormModal(true)
  }

  const handleEdit = (guru: Guru) => {
    setSelectedGuru(guru)
    setShowFormModal(true)
  }

  const handleDelete = (guru: Guru) => {
    setSelectedGuru(guru)
    setShowDeleteDialog(true)
  }

  const handleUploadSignature = (guru: Guru) => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "image/*"
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      try {
        const result = await guruService.uploadSignature(guru.id, file)
        if (result.success) {
          toast({
            title: "Berhasil",
            description: "Tanda tangan berhasil diupload",
          })
          fetchData(1, searchTerm)
        } else {
          toast({
            title: "Error",
            description: result.error || "Gagal upload tanda tangan",
            variant: "destructive",
          })
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Terjadi kesalahan saat upload",
          variant: "destructive",
        })
      }
    }
    input.click()
  }

  const handleFormSubmit = async (formData: Record<string, any>) => {
    setFormLoading(true)
    try {
      const result = selectedGuru
        ? await guruService.update(selectedGuru.id, formData)
        : await guruService.create(formData as any)

      if (result.success) {
        toast({
          title: "Berhasil",
          description: result.message || `Guru berhasil ${selectedGuru ? "diperbarui" : "ditambahkan"}`,
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
    if (!selectedGuru) return

    try {
      const result = await guruService.delete(selectedGuru.id)

      if (result.success) {
        toast({
          title: "Berhasil",
          description: "Guru berhasil dihapus",
        })
        fetchData(pagination.page, searchTerm)
      } else {
        toast({
          title: "Error",
          description: result.error || "Gagal menghapus guru",
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
    if (!selectedGuru) return { status: "aktif" }

    return {
      ...selectedGuru,
      tanggal_lahir: selectedGuru.tanggal_lahir ? new Date(selectedGuru.tanggal_lahir).toISOString().split("T")[0] : "",
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <DataTable
        title="Data Guru"
        columns={columns}
        data={data}
        loading={loading}
        pagination={pagination}
        onPageChange={handlePageChange}
        onSearch={handleSearch}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        searchPlaceholder="Cari nama atau NIP guru..."
        addButtonText="Tambah Guru"
        emptyMessage="Belum ada data guru"
      />

      <FormModal
        title={selectedGuru ? "Edit Guru" : "Tambah Guru"}
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
        title="Hapus Guru"
        description={`Apakah Anda yakin ingin menghapus guru "${selectedGuru?.nama}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Hapus"
        variant="destructive"
      />
    </div>
  )
}
