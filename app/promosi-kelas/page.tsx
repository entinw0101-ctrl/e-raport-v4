 "use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Users, GraduationCap } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface TingkatanData {
  id: number
  nama_tingkatan: string
  urutan: number
  jumlah_siswa: number
  kelas: Array<{
    id: number
    nama_kelas: string
    jumlah_siswa: number
  }>
}

interface PromosiMapping {
  kelas_asal_id: number
  kelas_tujuan_id: number | null
  tingkatan_asal_nama: string
  tingkatan_tujuan_nama: string
}

interface MasterTahunAjaran {
  id: number
  nama_ajaran: string
}

export default function PromosiKelasPage() {
  const [tingkatanData, setTingkatanData] = useState<TingkatanData[]>([])
  const [masterTahunAjaran, setMasterTahunAjaran] = useState<MasterTahunAjaran[]>([])
  const [tahunAjaranLama, setTahunAjaranLama] = useState("")
  const [tahunAjaranBaru, setTahunAjaranBaru] = useState("")
  const [selectedTingkatan, setSelectedTingkatan] = useState<number | null>(null)
  const [selectedKelas, setSelectedKelas] = useState<number[]>([])
  const [promosiPreview, setPromosiPreview] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    // Fetch master tahun ajaran data
    const fetchMasterTahunAjaran = async () => {
      try {
        const response = await fetch('/api/master-tahun-ajaran')
        const result = await response.json()
        if (result.success) {
          setMasterTahunAjaran(result.data)
          // Set default values if available
          if (result.data.length >= 2) {
            setTahunAjaranLama(result.data[0].nama_ajaran)
            setTahunAjaranBaru(result.data[1].nama_ajaran)
          }
        }
      } catch (error) {
        console.error('Error fetching master tahun ajaran:', error)
      }
    }

    fetchMasterTahunAjaran()
    fetchPromosiData()
  }, [])

  const fetchPromosiData = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/promosi-kelas')
      const result = await response.json()

      if (result.success) {
        setTingkatanData(result.data)
      } else {
        toast({
          title: "Error",
          description: result.error || "Gagal mengambil data promosi",
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

  const handleTingkatanSelect = (tingkatanId: number) => {
    setSelectedTingkatan(tingkatanId)
    setSelectedKelas([])
    setPromosiPreview(null)
  }

  const handleKelasToggle = (kelasId: number) => {
    setSelectedKelas(prev =>
      prev.includes(kelasId)
        ? prev.filter(id => id !== kelasId)
        : [...prev, kelasId]
    )
  }

  const handleGetPreview = async () => {
    if (!selectedTingkatan || selectedKelas.length === 0) {
      toast({
        title: "Error",
        description: "Pilih tingkatan dan minimal satu kelas",
        variant: "destructive",
      })
      return
    }

    try {
      const masterTaLama = await fetch(`/api/master-tahun-ajaran?nama_ajaran=${tahunAjaranLama}`)
      const masterTaLamaData = await masterTaLama.json()

      if (masterTaLamaData.success && masterTaLamaData.data.length > 0) {
        const masterTaLamaId = masterTaLamaData.data[0].id

        const response = await fetch("/api/promosi-kelas", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            master_tahun_ajaran_lama_id: masterTaLamaId,
            kelas_asal_ids: selectedKelas, // Array of class IDs
            preview: true,
          }),
        })

        const result = await response.json()
        if (result.success) {
          setPromosiPreview(result)
        }
      }
    } catch (error) {
      console.error("Error getting promotion preview:", error)
    }
  }

  const handlePromosiSubmit = async () => {
    if (!selectedTingkatan || selectedKelas.length === 0 || !tahunAjaranLama || !tahunAjaranBaru) {
      toast({
        title: "Error",
        description: "Tingkatan, kelas, dan tahun ajaran harus dipilih",
        variant: "destructive",
      })
      return
    }

    setProcessing(true)
    try {
      // Get master tahun ajaran IDs
      const [masterTaLamaResponse, masterTaBaruResponse] = await Promise.all([
        fetch(`/api/master-tahun-ajaran?nama_ajaran=${tahunAjaranLama}`),
        fetch(`/api/master-tahun-ajaran?nama_ajaran=${tahunAjaranBaru}`)
      ])

      const [masterTaLamaData, masterTaBaruData] = await Promise.all([
        masterTaLamaResponse.json(),
        masterTaBaruResponse.json()
      ])

      if (!masterTaLamaData.success || masterTaLamaData.data.length === 0) {
        throw new Error("Tahun ajaran lama tidak ditemukan")
      }

      if (!masterTaBaruData.success || masterTaBaruData.data.length === 0) {
        throw new Error("Tahun ajaran baru tidak ditemukan")
      }

      const masterTaLamaId = masterTaLamaData.data[0].id
      const masterTaBaruId = masterTaBaruData.data[0].id

      const response = await fetch("/api/promosi-kelas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          master_tahun_ajaran_lama_id: masterTaLamaId,
          master_tahun_ajaran_baru_id: masterTaBaruId,
          kelas_asal_ids: selectedKelas, // Array of selected class IDs
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Berhasil",
          description: result.message || "Promosi kelas berhasil dilakukan",
        })

        // Reset selection and refresh data
        setSelectedTingkatan(null)
        setSelectedKelas([])
        setPromosiPreview(null)
        fetchPromosiData()
      } else {
        toast({
          title: "Error",
          description: result.error || "Gagal melakukan promosi kelas",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat memproses promosi",
        variant: "destructive",
      })
    } finally {
      setProcessing(false)
    }
  }


  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Promosi Kelas</h1>
        <p className="text-muted-foreground">Kelola promosi siswa ke kelas dan tingkatan berikutnya</p>
      </div>

      <div className="grid gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Pengaturan Tahun Ajaran</CardTitle>
            <CardDescription>Tentukan tahun ajaran untuk proses promosi kelas</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tahun-lama">Tahun Ajaran Lama</Label>
              <Select value={tahunAjaranLama} onValueChange={setTahunAjaranLama}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih tahun ajaran lama" />
                </SelectTrigger>
                <SelectContent>
                  {masterTahunAjaran.map((ta) => (
                    <SelectItem key={ta.id} value={ta.nama_ajaran}>
                      {ta.nama_ajaran}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="tahun-baru">Tahun Ajaran Baru</Label>
              <Select value={tahunAjaranBaru} onValueChange={setTahunAjaranBaru}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih tahun ajaran baru" />
                </SelectTrigger>
                <SelectContent>
                  {masterTahunAjaran.map((ta) => (
                    <SelectItem key={ta.id} value={ta.nama_ajaran}>
                      {ta.nama_ajaran}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tingkatan Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Langkah 1: Pilih Tingkatan</CardTitle>
            <CardDescription>Pilih tingkatan yang akan dipromosikan</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tingkatanData.map((tingkatan) => (
                <div
                  key={tingkatan.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedTingkatan === tingkatan.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => handleTingkatanSelect(tingkatan.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{tingkatan.nama_tingkatan}</p>
                      <p className="text-sm text-muted-foreground">
                        {tingkatan.kelas?.length || 0} kelas • {tingkatan.jumlah_siswa} siswa
                      </p>
                    </div>
                    <Badge variant="outline">
                      <Users className="h-3 w-3 mr-1" />
                      {tingkatan.jumlah_siswa}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Class Selection - only show if tingkatan is selected */}
        {selectedTingkatan && (
          <Card>
            <CardHeader>
              <CardTitle>Langkah 2: Pilih Kelas</CardTitle>
              <CardDescription>
                Pilih kelas-kelas dalam {tingkatanData.find(t => t.id === selectedTingkatan)?.nama_tingkatan} yang akan dipromosikan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tingkatanData
                  .find(t => t.id === selectedTingkatan)
                  ?.kelas?.map((kelas) => (
                    <div
                      key={kelas.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedKelas.includes(kelas.id)
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                      onClick={() => handleKelasToggle(kelas.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{kelas.nama_kelas}</p>
                          <p className="text-sm text-muted-foreground">
                            {kelas.jumlah_siswa} siswa
                          </p>
                        </div>
                        <Badge variant={selectedKelas.includes(kelas.id) ? "default" : "outline"}>
                          {selectedKelas.includes(kelas.id) ? "Dipilih" : "Pilih"}
                        </Badge>
                      </div>
                    </div>
                  ))}
              </div>
              {selectedKelas.length > 0 && (
                <div className="mt-4 flex justify-center">
                  <Button onClick={handleGetPreview} variant="outline">
                    Lihat Preview Promosi
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Promotion Preview */}
        {promosiPreview && (
          <Card>
            <CardHeader>
              <CardTitle>Preview Promosi Kelas</CardTitle>
              <CardDescription>
                Semua siswa aktif dari kelas terpilih akan naik ke {promosiPreview.kelasMapping[0]?.tingkatan_tujuan_nama}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{promosiPreview.siswa.length}</div>
                    <div className="text-sm text-muted-foreground">Siswa Aktif</div>
                  </div>
                  <ArrowRight className="h-6 w-6 text-muted-foreground" />
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{promosiPreview.siswa.filter((s: any) => s.status === 'naik').length}</div>
                    <div className="text-sm text-muted-foreground">Akan Naik Kelas</div>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-2">Daftar Siswa:</h4>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {promosiPreview.siswa.map((siswa: any) => (
                      <div key={siswa.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                        <div>
                          <p className="font-medium">{siswa.nama}</p>
                          <p className="text-sm text-muted-foreground">NIS: {siswa.nis}</p>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline">{siswa.status}</Badge>
                          <p className="text-sm text-muted-foreground mt-1">
                            Rata-rata: {siswa.rata_rata}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="flex justify-center">
        <Button onClick={handlePromosiSubmit} disabled={processing} size="lg" className="px-8">
          {processing ? "Memproses..." : "Jalankan Promosi Kelas"}
        </Button>
      </div>
    </div>
  )
}
