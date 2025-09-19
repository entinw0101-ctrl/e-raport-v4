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

interface NilaiHafalan {
  id: string
  siswa_id: string
  kitab_id: string
  kelas_id: string
  periode_id: string
  jenis_hafalan: string
  jumlah_halaman: number
  nilai: number
  grade: string
  created_at: string
  siswa: { nama: string; nis: string }
  kitab: { nama: string }
  kelas: { nama: string }
  periode: { nama: string }
}

interface FormData {
  siswa_id: string
  kitab_id: string
  kelas_id: string
  periode_id: string
  jenis_hafalan: string
  jumlah_halaman: number
  nilai: number
}

export default function NilaiHafalanPage() {
  const [data, setData] = useState<NilaiHafalan[]>([])
  const [filteredData, setFilteredData] = useState<NilaiHafalan[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<NilaiHafalan | null>(null)
  const [formData, setFormData] = useState<FormData>({
    siswa_id: "",
    kitab_id: "",
    kelas_id: "",
    periode_id: "",
    jenis_hafalan: "",
    jumlah_halaman: 0,
    nilai: 0,
  })

  // Filter states
  const [filters, setFilters] = useState({
    kelas_id: "",
    kitab_id: "",
    periode_id: "",
    jenis_hafalan: "",
  })

  // Options for dropdowns
  const [siswaOptions, setSiswaOptions] = useState([])
  const [kitabOptions, setKitabOptions] = useState([])
  const [kelasOptions, setKelasOptions] = useState([])
  const [periodeOptions, setPeriodeOptions] = useState([])

  const { toast } = useToast()

  const jenisHafalanOptions = [
    { value: "Hafalan Baru", label: "Hafalan Baru" },
    { value: "Muraja'ah", label: "Muraja'ah" },
    { value: "Tasmi'", label: "Tasmi'" },
    { value: "Imtihan", label: "Imtihan" },
  ]

  const columns = [
    { key: "siswa.nama", label: "Nama Siswa" },
    { key: "siswa.nis", label: "NIS" },
    { key: "kitab.nama", label: "Kitab" },
    { key: "kelas.nama", label: "Kelas" },
    { key: "jenis_hafalan", label: "Jenis Hafalan" },
    { key: "jumlah_halaman", label: "Jumlah Halaman" },
    {
      key: "nilai",
      label: "Nilai",
      render: (item: NilaiHafalan) => (
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
      key: "kitab_id",
      label: "Kitab",
      options: kitabOptions.map((k: any) => ({ value: k.id, label: k.nama })),
    },
    {
      key: "periode_id",
      label: "Periode",
      options: periodeOptions.map((p: any) => ({ value: p.id, label: p.nama })),
    },
    {
      key: "jenis_hafalan",
      label: "Jenis Hafalan",
      options: jenisHafalanOptions,
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
      const response = await fetch("/api/nilai-hafalan")
      const result = await response.json()
      setData(result)
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
      const [siswaRes, kitabRes, kelasRes, periodeRes] = await Promise.all([
        fetch("/api/siswa"),
        fetch("/api/kitab"),
        fetch("/api/kelas"),
        fetch("/api/periode-ajaran"),
      ])

      const [siswa, kitab, kelas, periode] = await Promise.all([
        siswaRes.json(),
        kitabRes.json(),
        kelasRes.json(),
        periodeRes.json(),
      ])

      setSiswaOptions(siswa)
      setKitabOptions(kitab)
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
      const url = editingItem ? `/api/nilai-hafalan/${editingItem.id}` : "/api/nilai-hafalan"
      const method = editingItem ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
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
      kitab_id: item.kitab_id,
      kelas_id: item.kelas_id,
      periode_id: item.periode_id,
      jenis_hafalan: item.jenis_hafalan,
      jumlah_halaman: item.jumlah_halaman,
      nilai: item.nilai,
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
      kitab_id: "",
      kelas_id: "",
      periode_id: "",
      jenis_hafalan: "",
      jumlah_halaman: 0,
      nilai: 0,
    })
    setEditingItem(null)
  }

  const handleExport = async () => {
    try {
      const queryParams = new URLSearchParams(filters).toString()
      const response = await fetch(`/api/nilai-hafalan/export?${queryParams}`)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `nilai-hafalan-${new Date().toISOString().split("T")[0]}.xlsx`
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
      <PageHeader title="Nilai Hafalan" description="Kelola nilai hafalan siswa" />

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
          <CardTitle>Data Nilai Hafalan</CardTitle>
          <CardDescription>Total: {filteredData.length} nilai hafalan</CardDescription>
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
        title={editingItem ? "Edit Nilai Hafalan" : "Tambah Nilai Hafalan"}
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
            <Label htmlFor="kitab_id">Kitab</Label>
            <Select value={formData.kitab_id} onValueChange={(value) => setFormData({ ...formData, kitab_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih kitab" />
              </SelectTrigger>
              <SelectContent>
                {kitabOptions.map((kitab: any) => (
                  <SelectItem key={kitab.id} value={kitab.id}>
                    {kitab.nama}
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
            <Label htmlFor="jenis_hafalan">Jenis Hafalan</Label>
            <Select
              value={formData.jenis_hafalan}
              onValueChange={(value) => setFormData({ ...formData, jenis_hafalan: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih jenis hafalan" />
              </SelectTrigger>
              <SelectContent>
                {jenisHafalanOptions.map((jenis) => (
                  <SelectItem key={jenis.value} value={jenis.value}>
                    {jenis.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="jumlah_halaman">Jumlah Halaman</Label>
            <Input
              id="jumlah_halaman"
              type="number"
              min="0"
              value={formData.jumlah_halaman}
              onChange={(e) => setFormData({ ...formData, jumlah_halaman: Number.parseInt(e.target.value) || 0 })}
              placeholder="Masukkan jumlah halaman"
            />
          </div>

          <div className="col-span-2">
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
