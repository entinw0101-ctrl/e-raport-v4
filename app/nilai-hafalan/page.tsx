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

interface NilaiHafalan {
  id: string
  siswa_id: string
  mapel_id: string
  kelas_id: string
  periode_id: string
  target_hafalan: string
  predikat: string
  created_at: string
  siswa: { nama: string; nis: string; kelas: { nama_kelas: string } }
  mata_pelajaran: { nama_mapel: string }
  kelas: { nama: string }
  periode_ajaran: { nama_ajaran: string }
}

interface FormData {
  siswa_id: string
  mapel_id: string
  kelas_id: string
  periode_id: string
  target_hafalan: string
}

export default function NilaiHafalanPage() {
  const [data, setData] = useState<NilaiHafalan[]>([])
  const [filteredData, setFilteredData] = useState<NilaiHafalan[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<NilaiHafalan | null>(null)
  const [formData, setFormData] = useState<FormData>({
    siswa_id: "",
    mapel_id: "",
    kelas_id: "",
    periode_id: "",
    target_hafalan: "",
  })

  // Options for dropdowns
  const [siswaOptions, setSiswaOptions] = useState<any[]>([])
  const [mataPelajaranOptions, setMataPelajaranOptions] = useState<any[]>([])
  const [kelasOptions, setKelasOptions] = useState<any[]>([])
  const [periodeOptions, setPeriodeOptions] = useState<any[]>([])
  const [filteredKelasOptions, setFilteredKelasOptions] = useState<any[]>([])

  // Template selection states
  const [selectedPeriodeAjaran, setSelectedPeriodeAjaran] = useState<string>("")
  const [selectedKelasForTemplate, setSelectedKelasForTemplate] = useState<string>("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isImporting, setIsImporting] = useState(false)

  const { toast } = useToast()

  const columns = [
    { key: "siswa.nama", label: "Nama Siswa" },
    { key: "siswa.nis", label: "NIS" },
    { key: "mata_pelajaran.nama_mapel", label: "Mata Pelajaran" },
    { key: "siswa.kelas.nama_kelas", label: "Kelas" },
    {
      key: "predikat",
      label: "Predikat",
      render: (value: any) => (
        <Badge variant={getGradeBadgeVariant(value)}>{value}</Badge>
      ),
    },
    { key: "periode_ajaran.nama_ajaran", label: "Periode" },
  ]

  useEffect(() => {
    fetchData()
    fetchOptions()
  }, [])

  useEffect(() => {
    setFilteredData(data) // No filtering for now
  }, [data])

  // Filter kelas options to all kelas (no filtering by tingkatan)
  useEffect(() => {
    setFilteredKelasOptions(kelasOptions)
  }, [kelasOptions])

  const fetchData = async () => {
    try {
      const response = await fetch("/api/nilai-hafalan")
      const result = await response.json()
      setData(result.data || result) // Handle API response format
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal memuat data nilai hafalan",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchOptions = async () => {
    try {
      const [siswaRes, mataPelajaranRes, kelasRes, periodeRes] = await Promise.all([
        fetch("/api/siswa"),
        fetch("/api/mata-pelajaran"),
        fetch("/api/kelas?include=tingkatan,wali_kelas"),
        fetch("/api/periode-ajaran"),
      ])

      const [siswa, mataPelajaran, kelas, periode] = await Promise.all([
        siswaRes.json(),
        mataPelajaranRes.json(),
        kelasRes.json(),
        periodeRes.json(),
      ])

      setSiswaOptions(siswa.success ? (siswa.data || []) : [])
      setMataPelajaranOptions(mataPelajaran.success ? (mataPelajaran.data || []) : [])
      setKelasOptions(kelas.success ? (kelas.data || []) : [])
      setPeriodeOptions(periode.success ? (periode.data || []) : [])
    } catch (error) {
      console.error("Error fetching options:", error)
      // Set empty arrays on error
      setSiswaOptions([])
      setMataPelajaranOptions([])
      setKelasOptions([])
      setPeriodeOptions([])
    }
  }

  const getGradeBadgeVariant = (predikat: string) => {
    switch (predikat) {
      case "Tercapai":
        return "default"
      case "Tidak Tercapai":
        return "destructive"
      default:
        return "secondary"
    }
  }

  const handleSubmit = async (data: Record<string, any>) => {
    try {
      const url = editingItem ? `/api/nilai-hafalan/${editingItem.id}` : "/api/nilai-hafalan"
      const method = editingItem ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        toast({
          title: "Berhasil",
          description: `Nilai hafalan berhasil ${editingItem ? "diperbarui" : "ditambahkan"}`,
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
        description: "Gagal menyimpan nilai hafalan",
        variant: "destructive",
      })
    }
  }

  const handleEdit = (item: NilaiHafalan) => {
    setEditingItem(item)
    setFormData({
      siswa_id: item.siswa_id,
      mapel_id: item.mapel_id,
      kelas_id: item.kelas_id,
      periode_id: item.periode_id,
      target_hafalan: item.target_hafalan,
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (item: NilaiHafalan) => {
    if (!confirm("Apakah Anda yakin ingin menghapus nilai hafalan ini?")) return

    try {
      const response = await fetch(`/api/nilai-hafalan/${item.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "Berhasil",
          description: "Nilai hafalan berhasil dihapus",
        })
        fetchData()
      } else {
        throw new Error("Failed to delete")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal menghapus nilai hafalan",
        variant: "destructive",
      })
    }
  }

  const resetForm = () => {
    setFormData({
      siswa_id: "",
      mapel_id: "",
      kelas_id: "",
      periode_id: "",
      target_hafalan: "",
    })
    setEditingItem(null)
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

      const response = await fetch("/api/upload/excel/nilai-hafalan", {
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
      const response = await fetch(`/api/export/excel/nilai-hafalan/template/${selectedKelasForTemplate}?periode_ajaran_id=${selectedPeriodeAjaran}`)
      if (!response.ok) {
        throw new Error("Failed to download template")
      }
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `template_nilai_hafalan_${new Date().toISOString().split("T")[0]}.xlsx`
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

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader title="Nilai Hafalan" description="Kelola nilai hafalan siswa" />

      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <div className="flex items-center gap-2">
            <Select value={selectedPeriodeAjaran} onValueChange={setSelectedPeriodeAjaran}>
              <SelectTrigger className="w-48">
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
              <SelectTrigger className="w-48">
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
            Tambah Nilai
          </Button>
        </div>
      </div>

      <DataTable
        title="Data Nilai Hafalan"
        data={filteredData}
        columns={columns}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <FormModal
        title={editingItem ? "Edit Nilai Hafalan" : "Tambah Nilai Hafalan"}
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
            name: "mapel_id",
            label: "Mata Pelajaran",
            type: "select",
            required: true,
            options: mataPelajaranOptions?.map((mapel: any) => ({
              value: mapel.id,
              label: mapel.nama
            })) || []
          },
          {
            name: "kelas_id",
            label: "Kelas",
            type: "select",
            required: true,
            options: kelasOptions?.map((kelas: any) => ({
              value: kelas.id,
              label: kelas.nama
            })) || []
          },
          {
            name: "periode_id",
            label: "Periode",
            type: "select",
            required: true,
            options: periodeOptions?.map((periode: any) => ({
              value: periode.id,
              label: periode.nama
            })) || []
          },
          {
            name: "target_hafalan",
            label: "Target Hafalan",
            type: "text",
            required: true,
            placeholder: "Contoh: Juz 1, Surat Al-Fatihah"
          }
        ]}
        initialData={editingItem ? {
          siswa_id: editingItem.siswa_id,
          mapel_id: editingItem.mapel_id,
          kelas_id: editingItem.kelas_id,
          periode_id: editingItem.periode_id,
          target_hafalan: editingItem.target_hafalan
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
