"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/src/components/DataTable"
import { FormModal } from "@/src/components/FormModal"
import { FilterBar } from "@/src/components/FilterBar"
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

  // Filter states
  const [filters, setFilters] = useState({
    kelas_id: "",
    mata_pelajaran_id: "",
    periode_id: "",
    jenis_ujian: "",
  })

  // Options for dropdowns
  const [siswaOptions, setSiswaOptions] = useState([])
  const [mataPelajaranOptions, setMataPelajaranOptions] = useState([])
  const [kelasOptions, setKelasOptions] = useState([])
  const [periodeOptions, setPeriodeOptions] = useState([])

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
      options: kelasOptions.map((k: any) => ({ value: k.id, label: k.nama })),
    },
    {
      key: "mata_pelajaran_id",
      label: "Mata Pelajaran",
      options: mataPelajaranOptions.map((mp: any) => ({ value: mp.id, label: mp.nama })),
    },
    {
      key: "periode_id",
      label: "Periode",
      options: periodeOptions.map((p: any) => ({ value: p.id, label: p.nama })),
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
    applyFilters()
  }, [data, filters])

  const fetchData = async () => {
    try {
      const response = await fetch("/api/nilai-ujian")
      const result = await response.json()
      setData(result)
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
      const [siswaRes, mataPelajaranRes, kelasRes, periodeRes] = await Promise.all([
        fetch("/api/siswa"),
        fetch("/api/mata-pelajaran"),
        fetch("/api/kelas"),
        fetch("/api/periode-ajaran"),
      ])

      const [siswa, mataPelajaran, kelas, periode] = await Promise.all([
        siswaRes.json(),
        mataPelajaranRes.json(),
        kelasRes.json(),
        periodeRes.json(),
      ])

      setSiswaOptions(siswa)
      setMataPelajaranOptions(mataPelajaran)
      setKelasOptions(kelas)
      setPeriodeOptions(periode)
    } catch (error) {
      console.error("Error fetching options:", error)
    }
  }

  const applyFilters = () => {
    let filtered = [...data]

    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        filtered = filtered.filter((item: any) => item[key] === value)
      }
    })

    setFilteredData(filtered)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const url = editingItem ? `/api/nilai-ujian/${editingItem.id}` : "/api/nilai-ujian"
      const method = editingItem ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
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
      const queryParams = new URLSearchParams(filters).toString()
      const response = await fetch(`/api/nilai-ujian/export?${queryParams}`)
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

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader title="Nilai Ujian" description="Kelola nilai ujian siswa" />

      <div className="flex justify-between items-center">
        <FilterBar filters={filters} onFiltersChange={setFilters} options={filterOptions} />
        <div className="flex gap-2">
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

      <Card>
        <CardHeader>
          <CardTitle>Data Nilai Ujian</CardTitle>
          <CardDescription>Total: {filteredData.length} nilai ujian</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            data={filteredData}
            columns={columns}
            loading={loading}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </CardContent>
      </Card>

      <FormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          resetForm()
        }}
        title={editingItem ? "Edit Nilai Ujian" : "Tambah Nilai Ujian"}
        onSubmit={handleSubmit}
      >
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="siswa_id">Siswa</Label>
            <Select value={formData.siswa_id} onValueChange={(value) => setFormData({ ...formData, siswa_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih siswa" />
              </SelectTrigger>
              <SelectContent>
                {siswaOptions.map((siswa: any) => (
                  <SelectItem key={siswa.id} value={siswa.id}>
                    {siswa.nama} - {siswa.nis}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="mata_pelajaran_id">Mata Pelajaran</Label>
            <Select
              value={formData.mata_pelajaran_id}
              onValueChange={(value) => setFormData({ ...formData, mata_pelajaran_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih mata pelajaran" />
              </SelectTrigger>
              <SelectContent>
                {mataPelajaranOptions.map((mp: any) => (
                  <SelectItem key={mp.id} value={mp.id}>
                    {mp.nama}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="kelas_id">Kelas</Label>
            <Select value={formData.kelas_id} onValueChange={(value) => setFormData({ ...formData, kelas_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih kelas" />
              </SelectTrigger>
              <SelectContent>
                {kelasOptions.map((kelas: any) => (
                  <SelectItem key={kelas.id} value={kelas.id}>
                    {kelas.nama}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="periode_id">Periode</Label>
            <Select
              value={formData.periode_id}
              onValueChange={(value) => setFormData({ ...formData, periode_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih periode" />
              </SelectTrigger>
              <SelectContent>
                {periodeOptions.map((periode: any) => (
                  <SelectItem key={periode.id} value={periode.id}>
                    {periode.nama}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="jenis_ujian">Jenis Ujian</Label>
            <Select
              value={formData.jenis_ujian}
              onValueChange={(value) => setFormData({ ...formData, jenis_ujian: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih jenis ujian" />
              </SelectTrigger>
              <SelectContent>
                {jenisUjianOptions.map((jenis) => (
                  <SelectItem key={jenis.value} value={jenis.value}>
                    {jenis.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="nilai">Nilai</Label>
            <Input
              id="nilai"
              type="number"
              min="0"
              max="100"
              value={formData.nilai}
              onChange={(e) => setFormData({ ...formData, nilai: Number.parseInt(e.target.value) || 0 })}
              placeholder="Masukkan nilai"
            />
          </div>
        </div>
      </FormModal>
    </div>
  )
}
