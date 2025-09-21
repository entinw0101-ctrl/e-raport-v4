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
import { Plus, FileDown } from "lucide-react"

interface NilaiUjian {
  id: string
  siswa_id: string
  mata_pelajaran_id: string
  kelas_id: string
  periode_id: string
  jenis_ujian: string
  nilai: number
  grade: string
  created_at: string
  siswa: { nama: string; nis: string }
  mata_pelajaran: { nama: string }
  kelas: { nama: string }
  periode: { nama: string }
}

interface FormData {
  siswa_id: string
  mata_pelajaran_id: string
  kelas_id: string
  periode_id: string
  jenis_ujian: string
  nilai: number
}

export default function NilaiUjianPage() {
  const [data, setData] = useState<NilaiUjian[]>([])
  const [filteredData, setFilteredData] = useState<NilaiUjian[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<NilaiUjian | null>(null)
  const [formData, setFormData] = useState<FormData>({
    siswa_id: "",
    mata_pelajaran_id: "",
    kelas_id: "",
    periode_id: "",
    jenis_ujian: "",
    nilai: 0,
  })

  // Filter states (removed for now to fix build)
  // const [filters, setFilters] = useState({
  //   kelas_id: "",
  //   mata_pelajaran_id: "",
  //   periode_id: "",
  //   jenis_ujian: "",
  // })

  // Options for dropdowns
  const [siswaOptions, setSiswaOptions] = useState<any[]>([])
  const [mataPelajaranOptions, setMataPelajaranOptions] = useState<any[]>([])
  const [kelasOptions, setKelasOptions] = useState<any[]>([])
  const [periodeOptions, setPeriodeOptions] = useState<any[]>([])
  const [tahunAjaranOptions, setTahunAjaranOptions] = useState<any[]>([])
  const [filteredKelasOptions, setFilteredKelasOptions] = useState<any[]>([])

  // Template selection states
  const [selectedTahunAjaran, setSelectedTahunAjaran] = useState<string>("")
  const [selectedSemester, setSelectedSemester] = useState<string>("")
  const [selectedKelasForTemplate, setSelectedKelasForTemplate] = useState<string>("")

  const { toast } = useToast()

  const jenisUjianOptions = [
    { value: "UTS", label: "Ujian Tengah Semester" },
    { value: "UAS", label: "Ujian Akhir Semester" },
    { value: "Harian", label: "Ulangan Harian" },
    { value: "Praktik", label: "Ujian Praktik" },
  ]

  const columns = [
    { key: "siswa.nama", label: "Nama Siswa" },
    { key: "siswa.nis", label: "NIS" },
    { key: "mata_pelajaran.nama", label: "Mata Pelajaran" },
    { key: "kelas.nama", label: "Kelas" },
    { key: "jenis_ujian", label: "Jenis Ujian" },
    {
      key: "nilai",
      label: "Nilai",
      render: (item: NilaiUjian) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{item.nilai}</span>
          <Badge variant={getGradeBadgeVariant(item.grade)}>{item.grade}</Badge>
        </div>
      ),
    },
    { key: "periode.nama", label: "Periode" },
  ]

  const filterOptions = [
    {
      key: "kelas_id",
      label: "Kelas",
      options: kelasOptions?.map((k: any) => ({ value: k.id, label: k.nama })) || [],
    },
    {
      key: "mata_pelajaran_id",
      label: "Mata Pelajaran",
      options: mataPelajaranOptions?.map((mp: any) => ({ value: mp.id, label: mp.nama })) || [],
    },
    {
      key: "periode_id",
      label: "Periode",
      options: periodeOptions?.map((p: any) => ({ value: p.id, label: p.nama })) || [],
    },
    {
      key: "jenis_ujian",
      label: "Jenis Ujian",
      options: jenisUjianOptions,
    },
  ]

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
      const response = await fetch("/api/nilai-ujian")
      const result = await response.json()
      setData(result.data || result) // Handle API response format
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal memuat data nilai ujian",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchOptions = async () => {
    try {
      const [siswaRes, mataPelajaranRes, kelasRes, periodeRes, tahunAjaranRes] = await Promise.all([
        fetch("/api/siswa"),
        fetch("/api/mata-pelajaran"),
        fetch("/api/kelas"),
        fetch("/api/periode-ajaran"),
        fetch("/api/master-tahun-ajaran"),
      ])

      const [siswa, mataPelajaran, kelas, periode, tahunAjaran] = await Promise.all([
        siswaRes.json(),
        mataPelajaranRes.json(),
        kelasRes.json(),
        periodeRes.json(),
        tahunAjaranRes.json(),
      ])

      setSiswaOptions(siswa.success ? (siswa.data || []) : [])
      setMataPelajaranOptions(mataPelajaran.success ? (mataPelajaran.data || []) : [])
      setKelasOptions(kelas.success ? (kelas.data || []) : [])
      setPeriodeOptions(periode.success ? (periode.data || []) : [])
      setTahunAjaranOptions(tahunAjaran.success ? (tahunAjaran.data || []) : [])
    } catch (error) {
      console.error("Error fetching options:", error)
      // Set empty arrays on error
      setSiswaOptions([])
      setMataPelajaranOptions([])
      setKelasOptions([])
      setPeriodeOptions([])
      setTahunAjaranOptions([])
    }
  }

  const getGradeBadgeVariant = (grade: string) => {
    switch (grade) {
      case "A":
        return "default"
      case "B":
        return "secondary"
      case "C":
        return "outline"
      case "D":
        return "destructive"
      default:
        return "secondary"
    }
  }

  const handleSubmit = async (data: Record<string, any>) => {
    try {
      const url = editingItem ? `/api/nilai-ujian/${editingItem.id}` : "/api/nilai-ujian"
      const method = editingItem ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        toast({
          title: "Berhasil",
          description: `Nilai ujian berhasil ${editingItem ? "diperbarui" : "ditambahkan"}`,
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
        description: "Gagal menyimpan nilai ujian",
        variant: "destructive",
      })
    }
  }

  const handleEdit = (item: NilaiUjian) => {
    setEditingItem(item)
    setFormData({
      siswa_id: item.siswa_id,
      mata_pelajaran_id: item.mata_pelajaran_id,
      kelas_id: item.kelas_id,
      periode_id: item.periode_id,
      jenis_ujian: item.jenis_ujian,
      nilai: item.nilai,
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (item: NilaiUjian) => {
    if (!confirm("Apakah Anda yakin ingin menghapus nilai ujian ini?")) return

    try {
      const response = await fetch(`/api/nilai-ujian/${item.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "Berhasil",
          description: "Nilai ujian berhasil dihapus",
        })
        fetchData()
      } else {
        throw new Error("Failed to delete")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal menghapus nilai ujian",
        variant: "destructive",
      })
    }
  }

  const resetForm = () => {
    setFormData({
      siswa_id: "",
      mata_pelajaran_id: "",
      kelas_id: "",
      periode_id: "",
      jenis_ujian: "",
      nilai: 0,
    })
    setEditingItem(null)
  }

  const handleExport = async () => {
    try {
      // Export all data without filters for now
      const response = await fetch(`/api/nilai-ujian/export`)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `nilai-ujian-${new Date().toISOString().split("T")[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal mengekspor data",
        variant: "destructive",
      })
    }
  }

  const handleDownloadTemplate = async () => {
    if (!selectedTahunAjaran || !selectedSemester || !selectedKelasForTemplate) {
      toast({
        title: "Pilih Lengkap",
        description: "Silakan pilih tahun ajaran, semester, dan kelas terlebih dahulu",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch(`/api/export/excel/nilai-ujian/template/${selectedKelasForTemplate}?tahun_ajaran_id=${selectedTahunAjaran}&semester=${selectedSemester}`)
      if (!response.ok) {
        throw new Error("Failed to download template")
      }
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `template_nilai_ujian_${new Date().toISOString().split("T")[0]}.xlsx`
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
      <PageHeader title="Nilai Ujian" description="Kelola nilai ujian siswa" />

      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <div className="flex items-center gap-2">
            <Select value={selectedTahunAjaran} onValueChange={setSelectedTahunAjaran}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Pilih Tahun Ajaran" />
              </SelectTrigger>
              <SelectContent>
                {tahunAjaranOptions?.map((ta: any) => (
                  <SelectItem key={ta.id} value={ta.id.toString()}>
                    {ta.nama_ajaran}
                  </SelectItem>
                )) || []}
              </SelectContent>
            </Select>
            <Select value={selectedSemester} onValueChange={setSelectedSemester} disabled={!selectedTahunAjaran}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Semester" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SATU">1</SelectItem>
                <SelectItem value="DUA">2</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedKelasForTemplate} onValueChange={setSelectedKelasForTemplate} disabled={!selectedSemester}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Pilih Kelas" />
              </SelectTrigger>
              <SelectContent>
                {filteredKelasOptions?.map((kelas: any) => (
                  <SelectItem key={kelas.id} value={kelas.id.toString()}>
                    Kelas: {kelas.nama} - Tingkatan: {kelas.tingkatan?.nama_tingkatan || 'N/A'} {kelas.wali_kelas ? `- Wali: ${kelas.wali_kelas.nama}` : ''}
                  </SelectItem>
                )) || []}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleDownloadTemplate} disabled={!selectedTahunAjaran || !selectedSemester || !selectedKelasForTemplate}>
              <FileDown className="w-4 h-4 mr-2" />
              Download Template
            </Button>
          </div>
          <Button variant="outline" onClick={handleExport}>
            <FileDown className="w-4 h-4 mr-2" />
            Export Excel
          </Button>
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Tambah Nilai
          </Button>
        </div>
      </div>

      <DataTable
        title="Data Nilai Ujian"
        data={filteredData}
        columns={columns}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <FormModal
        title={editingItem ? "Edit Nilai Ujian" : "Tambah Nilai Ujian"}
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
            name: "mata_pelajaran_id",
            label: "Mata Pelajaran",
            type: "select",
            required: true,
            options: mataPelajaranOptions?.map((mp: any) => ({
              value: mp.id,
              label: mp.nama
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
            name: "jenis_ujian",
            label: "Jenis Ujian",
            type: "select",
            required: true,
            options: jenisUjianOptions
          },
          {
            name: "nilai",
            label: "Nilai",
            type: "number",
            required: true,
            min: 0,
            max: 100
          }
        ]}
        initialData={editingItem ? {
          siswa_id: editingItem.siswa_id,
          mata_pelajaran_id: editingItem.mata_pelajaran_id,
          kelas_id: editingItem.kelas_id,
          periode_id: editingItem.periode_id,
          jenis_ujian: editingItem.jenis_ujian,
          nilai: editingItem.nilai
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
