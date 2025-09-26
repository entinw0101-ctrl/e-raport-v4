"use client"

import { useState, useEffect } from "react"
import { DataTable, type Column } from "@/src/components/DataTable"
import { FormModal, type FormField } from "@/src/components/FormModal"
import { ConfirmDialog } from "@/src/components/ConfirmDialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Upload, FileText, Trash2, Eye } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { id } from "date-fns/locale"

interface TemplateDokumen {
  id: number
  nama_template: string
  jenis_template: "IDENTITAS" | "NILAI" | "SIKAP" | "SURAT_KELUAR"
  file_path: string
  file_name: string
  file_size: number | null
  is_active: boolean
  dibuat_pada: string
  diperbarui_pada: string
}

export default function TemplateDokumenPage() {
  const [data, setData] = useState<TemplateDokumen[]>([])
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
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateDokumen | null>(null)
  const [formLoading, setFormLoading] = useState(false)

  // Filter states
  const [searchTerm, setSearchTerm] = useState("")

  const columns: Column<TemplateDokumen>[] = [
    {
      key: "nama_template",
      label: "Nama Template",
      className: "font-medium",
    },
    {
      key: "jenis_template",
      label: "Jenis Template",
      render: (value) => {
        const labels = {
          IDENTITAS: "Identitas Siswa",
          NILAI: "Nilai Ujian",
          SIKAP: "Sikap & Kehadiran",
          SURAT_KELUAR: "Surat Keluar"
        }
        return (
          <Badge variant="outline">
            {labels[value as keyof typeof labels] || value}
          </Badge>
        )
      },
    },
    {
      key: "file_name",
      label: "Nama File",
      render: (value) => (
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{value}</span>
        </div>
      ),
    },
    {
      key: "file_size",
      label: "Ukuran File",
      render: (value) => {
        if (!value) return "-"
        const sizeInMB = (value / (1024 * 1024)).toFixed(2)
        return `${sizeInMB} MB`
      },
    },
    {
      key: "is_active",
      label: "Status",
      render: (value) => (
        <Badge variant={value ? "default" : "secondary"}>
          {value ? "Aktif" : "Non-aktif"}
        </Badge>
      ),
    },
    {
      key: "dibuat_pada",
      label: "Dibuat Pada",
      render: (value) => format(new Date(value), "dd MMM yyyy HH:mm", { locale: id }),
    },
  ]

  const formFields: FormField[] = [
    {
      name: "nama_template",
      label: "Nama Template",
      type: "text",
      required: true,
      placeholder: "Masukkan nama template",
    },
    {
      name: "jenis_template",
      label: "Jenis Template",
      type: "select",
      required: true,
      options: [
        { value: "IDENTITAS", label: "Identitas Siswa" },
        { value: "NILAI", label: "Nilai Ujian" },
        { value: "SIKAP", label: "Sikap & Kehadiran" },
        { value: "SURAT_KELUAR", label: "Surat Keluar" },
      ],
    },
    {
      name: "template_file",
      label: "File Template",
      type: "file",
      accept: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      placeholder: "Pilih file template DOCX",
      required: !selectedTemplate,
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

      const response = await fetch(`/api/template-dokumen?${params}`)
      const result = await response.json()

      if (result.success) {
        setData(result.data)
        setPagination(result.pagination)
      } else {
        toast({
          title: "Error",
          description: result.error || "Gagal mengambil data template",
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
    setSelectedTemplate(null)
    setShowFormModal(true)
  }

  const handleEdit = (template: TemplateDokumen) => {
    setSelectedTemplate(template)
    setShowFormModal(true)
  }

  const handleDelete = (template: TemplateDokumen) => {
    setSelectedTemplate(template)
    setShowDeleteDialog(true)
  }

  const handleFormSubmit = async (formData: Record<string, any>) => {
    setFormLoading(true)
    try {
      const templateFile = formData.template_file?.[0] // Get the first file from FileList
      delete formData.template_file // Remove from form data as it's handled separately

      const result = selectedTemplate
        ? await updateTemplate(selectedTemplate.id, formData)
        : await createTemplate(formData, templateFile)

      if (result.success) {
        toast({
          title: "Berhasil",
          description: result.message || `Template berhasil ${selectedTemplate ? "diperbarui" : "ditambahkan"}`,
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

  const createTemplate = async (formData: Record<string, any>, file: File) => {
    const formDataToSend = new FormData()
    formDataToSend.append("nama_template", formData.nama_template)
    formDataToSend.append("jenis_template", formData.jenis_template)
    formDataToSend.append("file", file)

    const response = await fetch("/api/template-dokumen", {
      method: "POST",
      body: formDataToSend,
    })

    return response.json()
  }

  const updateTemplate = async (id: number, formData: Record<string, any>) => {
    const response = await fetch(`/api/template-dokumen/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    })

    return response.json()
  }

  const handleDeleteConfirm = async () => {
    if (!selectedTemplate) return

    try {
      const response = await fetch(`/api/template-dokumen/${selectedTemplate.id}`, {
        method: "DELETE",
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Berhasil",
          description: "Template berhasil dihapus",
        })
        fetchData(pagination.page, searchTerm)
      } else {
        toast({
          title: "Error",
          description: result.error || "Gagal menghapus template",
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
    if (!selectedTemplate) return {}

    return {
      nama_template: selectedTemplate.nama_template,
      jenis_template: selectedTemplate.jenis_template,
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <DataTable
        title="Template Dokumen"
        columns={columns}
        data={data}
        loading={loading}
        pagination={pagination}
        onPageChange={handlePageChange}
        onSearch={handleSearch}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        searchPlaceholder="Cari nama template..."
        addButtonText="Upload Template Baru"
        emptyMessage="Belum ada template dokumen"
      />

      <FormModal
        title={selectedTemplate ? "Edit Template" : "Upload Template Baru"}
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
        title="Hapus Template"
        description={`Apakah Anda yakin ingin menghapus template "${selectedTemplate?.nama_template}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Hapus"
        variant="destructive"
      />
    </div>
  )
}