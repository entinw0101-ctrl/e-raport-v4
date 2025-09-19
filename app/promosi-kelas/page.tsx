"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/src/components/DataTable"
import { PageHeader } from "@/src/components/PageHeader"
import { useToast } from "@/hooks/use-toast"
import { ArrowUp, Users, CheckCircle, AlertCircle } from "lucide-react"

interface PromosiData {
  siswa_id: string
  nama: string
  nis: string
  kelas_asal: string
  kelas_tujuan: string
  status: "naik" | "lulus" | "tinggal"
  rata_rata: number
}

interface KelasMapping {
  kelas_asal_id: string
  kelas_tujuan_id: string
  kelas_asal_nama: string
  kelas_tujuan_nama: string
}

export default function PromosiKelasPage() {
  const [data, setData] = useState<PromosiData[]>([])
  const [kelasOptions, setKelasOptions] = useState([])
  const [periodeOptions, setPeriodeOptions] = useState([])
  const [selectedPeriode, setSelectedPeriode] = useState("")
  const [selectedKelasAsal, setSelectedKelasAsal] = useState("")
  const [kelasMapping, setKelasMapping] = useState<KelasMapping[]>([])
  const [loading, setLoading] = useState(false)
  const [previewMode, setPreviewMode] = useState(true)

  const { toast } = useToast()

  const columns = [
    { key: "nama", label: "Nama Siswa" },
    { key: "nis", label: "NIS" },
    { key: "kelas_asal", label: "Kelas Asal" },
    { key: "kelas_tujuan", label: "Kelas Tujuan" },
    { key: "rata_rata", label: "Rata-rata" },
    {
      key: "status",
      label: "Status",
      render: (item: PromosiData) => (
        <Badge variant={item.status === "naik" ? "default" : item.status === "lulus" ? "secondary" : "destructive"}>
          {item.status === "naik" ? "Naik Kelas" : item.status === "lulus" ? "Lulus" : "Tinggal Kelas"}
        </Badge>
      ),
    },
  ]

  useEffect(() => {
    fetchOptions()
  }, [])

  const fetchOptions = async () => {
    try {
      const [kelasRes, periodeRes] = await Promise.all([fetch("/api/kelas"), fetch("/api/periode-ajaran")])

      const [kelas, periode] = await Promise.all([kelasRes.json(), periodeRes.json()])

      setKelasOptions(kelas)
      setPeriodeOptions(periode)
    } catch (error) {
      console.error("Error fetching options:", error)
    }
  }

  const generatePreview = async () => {
    if (!selectedPeriode || !selectedKelasAsal) {
      toast({
        title: "Error",
        description: "Pilih periode dan kelas terlebih dahulu",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/promosi-kelas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periode_id: selectedPeriode,
          kelas_asal_id: selectedKelasAsal,
          preview: true,
        }),
      })

      const result = await response.json()
      setData(result.siswa)
      setKelasMapping(result.kelasMapping)
      setPreviewMode(true)
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal generate preview promosi",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const executePromosi = async () => {
    if (!data.length) {
      toast({
        title: "Error",
        description: "Tidak ada data untuk diproses",
        variant: "destructive",
      })
      return
    }

    if (!confirm("Apakah Anda yakin ingin melaksanakan promosi kelas? Proses ini tidak dapat dibatalkan.")) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/promosi-kelas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periode_id: selectedPeriode,
          kelas_asal_id: selectedKelasAsal,
          preview: false,
        }),
      })

      if (response.ok) {
        toast({
          title: "Berhasil",
          description: "Promosi kelas berhasil dilaksanakan",
        })
        setPreviewMode(false)
        // Reset form
        setData([])
        setSelectedPeriode("")
        setSelectedKelasAsal("")
      } else {
        throw new Error("Failed to execute promotion")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal melaksanakan promosi kelas",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusCounts = () => {
    const counts = data.reduce(
      (acc, item) => {
        acc[item.status] = (acc[item.status] || 0) + 1
        return acc
      },
      { naik: 0, lulus: 0, tinggal: 0 },
    )
    return counts
  }

  const statusCounts = getStatusCounts()

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader title="Promosi Kelas" description="Kelola kenaikan kelas dan kelulusan siswa" />

      {/* Filter Section */}
      <Card>
        <CardHeader>
          <CardTitle>Pengaturan Promosi</CardTitle>
          <CardDescription>Pilih periode dan kelas untuk memulai proses promosi</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Periode Ajaran</label>
              <Select value={selectedPeriode} onValueChange={setSelectedPeriode}>
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
              <label className="text-sm font-medium mb-2 block">Kelas Asal</label>
              <Select value={selectedKelasAsal} onValueChange={setSelectedKelasAsal}>
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

            <div className="flex items-end">
              <Button onClick={generatePreview} disabled={loading} className="w-full">
                <ArrowUp className="w-4 h-4 mr-2" />
                {loading ? "Memproses..." : "Generate Preview"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      {data.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Siswa</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Naik Kelas</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{statusCounts.naik}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Lulus</CardTitle>
              <CheckCircle className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{statusCounts.lulus}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tinggal Kelas</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{statusCounts.tinggal}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Results Table */}
      {data.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>{previewMode ? "Preview Promosi Kelas" : "Hasil Promosi Kelas"}</CardTitle>
                <CardDescription>
                  {previewMode ? "Tinjau hasil promosi sebelum melaksanakan" : "Promosi kelas telah dilaksanakan"}
                </CardDescription>
              </div>
              {previewMode && (
                <Button onClick={executePromosi} disabled={loading}>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Laksanakan Promosi
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <DataTable data={data} columns={columns} loading={loading} showActions={false} />
          </CardContent>
        </Card>
      )}

      {/* Class Mapping Info */}
      {kelasMapping.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pemetaan Kelas</CardTitle>
            <CardDescription>Mapping kelas asal ke kelas tujuan</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {kelasMapping.map((mapping, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium">{mapping.kelas_asal_nama}</span>
                  <ArrowUp className="w-4 h-4 text-gray-400" />
                  <span className="font-medium text-blue-600">{mapping.kelas_tujuan_nama}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
