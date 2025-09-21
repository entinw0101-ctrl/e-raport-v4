"use client"

import type React from "react"

// Force dynamic rendering to avoid build-time data fetching issues
export const dynamic = 'force-dynamic'

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/src/components/DataTable"
import { FormModal } from "@/src/components/FormModal"
import { PageHeader } from "@/src/components/PageHeader"
import { useToast } from "@/hooks/use-toast"
import { Plus, FileDown, Upload } from "lucide-react"

interface Kehadiran {
  id: string
  siswa_id: string
  indikator_kehadiran_id: string
  periode_ajaran_id: string
  sakit: number
  izin: number
  alpha: number
  created_at: string
  siswa: { nama: string; nis: string; kelas: { nama_kelas: string } }
  indikator_kehadiran: { nama_indikator: string }
  periode_ajaran: { nama_ajaran: string }
}

interface FormData {
  siswa_id: string
  indikator_kehadiran_id: string
  periode_ajaran_id: string
  sakit: number
  izin: number
  alpha: number
}

export default function KehadiranPage() {
  const [data, setData] = useState<Kehadiran[]>([])
  const [filteredData, setFilteredData] = useState<Kehadiran[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Kehadiran | null>(null)
  const [formData, setFormData] = useState<FormData>({
    siswa_id: "",
    indikator_kehadiran_id: "",
    periode_ajaran_id: "",
    sakit: 0,
    izin: 0,
    alpha: 0,
  })

  // Options for dropdowns
  const [siswaOptions, setSiswaOptions] = useState<any[]>([])
  const [indikatorKehadiranOptions, setIndikatorKehadiranOptions] = useState<any[]>([])
  const [kelasOptions, setKelasOptions] = useState<any[]>([])
  const [periodeOptions, setPeriodeOptions] = useState<any[]>([])
  const [filteredKelasOptions, setFilteredKelasOptions] = useState<any[]>([])

  // Template selection states
  const [selectedPeriodeAjaran, setSelectedPeriodeAjaran] = useState<string>("")
  const [selectedKelasForTemplate, setSelectedKelasForTemplate] = useState<string>("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isImporting, setIsImporting] = useState(false)

  const { toast } = useToast()

  useEffect(() => {
    fetchData()
    fetchOptions()
  }, [])

  useEffect(() => {
    setFilteredData(data) // No filtering for now
  }, [data])

  // Set filtered kelas options to all kelas (no filtering by tingkatan)
  useEffect(() => {
    setFilteredKelasOptions(kelasOptions)
  }, [kelasOptions])

  const fetchData = async () => {
    try {
      const response = await fetch("/api/kehadiran")
      const result = await response.json()
      setData(result.data || result)
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal memuat data kehadiran",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchOptions = async () => {
    try {
      const [siswaRes, indikatorRes, kelasRes, periodeRes] = await Promise.all([
        fetch("/api/siswa"),
        fetch("/api/indikator-kehadiran"),
        fetch("/api/kelas"),
        fetch("/api/periode-ajaran"),
      ])

      const [siswa, indikator, kelas, periode] = await Promise.all([
        siswaRes.json(),
        indikatorRes.json(),
        kelasRes.json(),
        periodeRes.json(),
      ])

      setSiswaOptions(siswa.success ? (siswa.data || []) : [])
      setIndikatorKehadiranOptions(indikator.success ? (indikator.data || []) : [])
      setKelasOptions(kelas.success ? (kelas.data || []) : [])
      setPeriodeOptions(periode.success ? (periode.data || []) : [])
    } catch (error) {
      console.error("Error fetching options:", error)
      setSiswaOptions([])
      setIndikatorKehadiranOptions([])
      setKelasOptions([])
      setPeriodeOptions([])
    }
  }

  const columns = [
    { key: "siswa.nama", label: "Nama Siswa" },
    { key: "siswa.nis", label: "NIS" },
    { key: "indikator_kehadiran.nama_indikator", label: "Indikator Kehadiran" },
    { key: "siswa.kelas.nama_kelas", label: "Kelas" },
    {
      key: "sakit",
      label: "Sakit",
      render: (value: any) => (
        <span>{value}</span>
      ),
    },
    {
      key: "izin",
      label: "Izin",
      render: (value: any) => (
        <span>{value}</span>
      ),
    },
    {
      key: "alpha",
      label: "Alpha",
      render: (value: any) => (
        <span>{value}</span>
      ),
    },
    { key: "periode_ajaran.nama_ajaran", label: "Periode" },
  ]

  const handleSubmit = async (data: Record<string, any>) => {
    try {
      const url = editingItem ? `/api/kehadiran/${editingItem.id}` : "/api/kehadiran"
      const method = editingItem ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        toast({
          title: "Berhasil",
          description: `Data kehadiran berhasil ${editingItem ? "diperbarui" : "ditambahkan"}`,
        })
        setIsModalOpen(false)
        resetForm()
        fetchData()
      } else {
        throw new Error("Failed to save")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal menyimpan data kehadiran",
        variant: "destructive",
      })
    }
  }

  const handleEdit = (item: Kehadiran) => {
    setEditingItem(item)
    setFormData({
      siswa_id: item.siswa_id,
      indikator_kehadiran_id: item.indikator_kehadiran_id,
      periode_ajaran_id: item.periode_ajaran_id,
      sakit: item.sakit,
      izin: item.izin,
      alpha: item.alpha,
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (item: Kehadiran) => {
    if (!confirm("Apakah Anda yakin ingin menghapus data kehadiran ini?")) return

    try {
      const response = await fetch(`/api/kehadiran/${item.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "Berhasil",
          description: "Data kehadiran berhasil dihapus",
        })
        fetchData()
      } else {
        throw new Error("Failed to delete")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal menghapus data kehadiran",
        variant: "destructive",
      })
    }
  }

  const resetForm = () => {
    setFormData({
      siswa_id: "",
      indikator_kehadiran_id: "",
      periode_ajaran_id: "",
      sakit: 0,
      izin: 0,
      alpha: 0,
    })
    setEditingItem(null)
  }

  const handleDownloadTemplate = async () => {
    if (!selectedPeriodeAjaran || !selectedKelasForTemplate) {
      toast({
        title: "Pilih Lengkap",
        description: "Silakan pilih periode ajaran dan kelas terlebih dahulu",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch(`/api/export/excel/kehadiran/template/${selectedKelasForTemplate}?periode_ajaran_id=${selectedPeriodeAjaran}`)
      if (!response.ok) {
        throw new Error("Failed to download template")
      }
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `template_kehadiran_${new Date().toISOString().split("T")[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: "Berhasil",
        description: "Template berhasil diunduh",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal mengunduh template",
        variant: "destructive",
      })
    }
  }

  const handleImportExcel = async () => {
    if (!selectedFile) {
      toast({
        title: "Pilih File",
        description: "Silakan pilih file Excel terlebih dahulu",
        variant: "destructive",
      })
      return
    }

    if (!selectedPeriodeAjaran || !selectedKelasForTemplate) {
      toast({
        title: "Pilih Lengkap",
        description: "Silakan pilih periode ajaran dan kelas terlebih dahulu",
        variant: "destructive",
      })
      return
    }

    setIsImporting(true)

    try {
      const formData = new FormData()
      formData.append("file", selectedFile)
      formData.append("kelas_id", selectedKelasForTemplate)
      formData.append("periode_ajaran_id", selectedPeriodeAjaran)

      const response = await fetch("/api/upload/excel/kehadiran", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Berhasil",
          description: result.message,
        })
        setSelectedFile(null)
        fetchData() // Refresh data
      } else {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        })
        if (result.details) {
          console.error("Import errors:", result.details)
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal mengimpor data",
        variant: "destructive",
      })
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader title="Kehadiran" description="Kelola data kehadiran siswa" />

      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <div className="flex items-center gap-2">
            <Select value={selectedPeriodeAjaran} onValueChange={setSelectedPeriodeAjaran}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Pilih Periode Ajaran" />
              </SelectTrigger>
              <SelectContent>
                {periodeOptions?.map((periode: any) => (
                  <SelectItem key={periode.id} value={periode.id.toString()}>
                    {periode.nama_ajaran} - Semester {periode.semester === "SATU" ? "1" : "2"}
                  </SelectItem>
                )) || []}
              </SelectContent>
            </Select>
            <Select value={selectedKelasForTemplate} onValueChange={setSelectedKelasForTemplate} disabled={!selectedPeriodeAjaran}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Pilih Kelas" />
              </SelectTrigger>
              <SelectContent>
                {filteredKelasOptions?.map((kelas: any) => (
                  <SelectItem key={kelas.id} value={kelas.id.toString()}>
                    Kelas: {kelas.nama_kelas || 'N/A'} - Tingkatan: {kelas.tingkatan?.nama_tingkatan || 'N/A'} {kelas.wali_kelas ? `- Wali: ${kelas.wali_kelas.nama}` : ''}
                  </SelectItem>
                )) || []}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleDownloadTemplate} disabled={!selectedPeriodeAjaran || !selectedKelasForTemplate}>
              <FileDown className="w-4 h-4 mr-2" />
              Download Template
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="max-w-xs"
            />
            <Button
              variant="outline"
              onClick={handleImportExcel}
              disabled={!selectedFile || isImporting}
            >
              <Upload className="w-4 h-4 mr-2" />
              {isImporting ? "Importing..." : "Import Excel"}
            </Button>
          </div>
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Tambah Kehadiran
          </Button>
        </div>
      </div>

      <DataTable
        title="Data Kehadiran"
        data={filteredData}
        columns={columns}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <FormModal
        title={editingItem ? "Edit Kehadiran" : "Tambah Kehadiran"}
        fields={[
          {
            name: "siswa_id",
            label: "Siswa",
            type: "select",
            required: true,
            options: siswaOptions?.map((siswa: any) => ({
              value: siswa.id,
              label: `${siswa.nama} - ${siswa.nis}`
            })) || []
          },
          {
            name: "indikator_kehadiran_id",
            label: "Indikator Kehadiran",
            type: "select",
            required: true,
            options: indikatorKehadiranOptions?.map((indikator: any) => ({
              value: indikator.id,
              label: indikator.nama_indikator
            })) || []
          },
          {
            name: "periode_ajaran_id",
            label: "Periode Ajaran",
            type: "select",
            required: true,
            options: periodeOptions?.map((periode: any) => ({
              value: periode.id,
              label: periode.nama_ajaran
            })) || []
          },
          {
            name: "sakit",
            label: "Sakit",
            type: "number",
            required: true,
            min: 0
          },
          {
            name: "izin",
            label: "Izin",
            type: "number",
            required: true,
            min: 0
          },
          {
            name: "alpha",
            label: "Alpha",
            type: "number",
            required: true,
            min: 0
          }
        ]}
        initialData={editingItem ? {
          siswa_id: editingItem.siswa_id,
          indikator_kehadiran_id: editingItem.indikator_kehadiran_id,
          periode_ajaran_id: editingItem.periode_ajaran_id,
          sakit: editingItem.sakit,
          izin: editingItem.izin,
          alpha: editingItem.alpha
        } : {}}
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          resetForm()
        }}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
