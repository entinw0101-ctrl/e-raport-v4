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
  tingkatan_asal_id: number
  tingkatan_tujuan_id: number | null
  kelas_mapping: Array<{
    kelas_asal_id: number
    kelas_tujuan_id: number
  }>
}

export default function PromosiKelasPage() {
  const [tingkatanData, setTingkatanData] = useState<TingkatanData[]>([])
  const [tahunAjaranLama, setTahunAjaranLama] = useState("")
  const [tahunAjaranBaru, setTahunAjaranBaru] = useState("")
  const [promosiMapping, setPromosiMapping] = useState<PromosiMapping[]>([])
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    // Set default tahun ajaran
    const currentYear = new Date().getFullYear()
    setTahunAjaranLama(`${currentYear}/${currentYear + 1}`)
    setTahunAjaranBaru(`${currentYear + 1}/${currentYear + 2}`)

    fetchPromosiData(`${currentYear}/${currentYear + 1}`)
  }, [])

  const fetchPromosiData = async (tahunAjaran: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/promosi-kelas?tahun_ajaran=${tahunAjaran}`)
      const result = await response.json()

      if (result.success) {
        setTingkatanData(result.data)
        initializePromosiMapping(result.data)
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

  const initializePromosiMapping = (data: TingkatanData[]) => {
    const mapping: PromosiMapping[] = []

    data.forEach((tingkatan, index) => {
      const nextTingkatan = data[index + 1]

      mapping.push({
        tingkatan_asal_id: tingkatan.id,
        tingkatan_tujuan_id: nextTingkatan ? nextTingkatan.id : null, // null means graduation
        kelas_mapping: tingkatan.kelas.map((kelas, kelasIndex) => ({
          kelas_asal_id: kelas.id,
          kelas_tujuan_id: nextTingkatan?.kelas[kelasIndex]?.id || nextTingkatan?.kelas[0]?.id || 0,
        })),
      })
    })

    setPromosiMapping(mapping)
  }

  const handlePromosiSubmit = async () => {
    if (!tahunAjaranLama || !tahunAjaranBaru) {
      toast({
        title: "Error",
        description: "Tahun ajaran harus diisi",
        variant: "destructive",
      })
      return
    }

    setProcessing(true)
    try {
      const response = await fetch("/api/promosi-kelas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tahun_ajaran_lama: tahunAjaranLama,
          tahun_ajaran_baru: tahunAjaranBaru,
          tingkatan_promosi: promosiMapping,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Berhasil",
          description: "Promosi kelas berhasil dilakukan",
        })

        // Refresh data
        fetchPromosiData(tahunAjaranBaru)
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

  const updateKelasMapping = (tingkatanAsalId: number, kelasAsalId: number, kelasTujuanId: number) => {
    setPromosiMapping((prev) =>
      prev.map((mapping) =>
        mapping.tingkatan_asal_id === tingkatanAsalId
          ? {
              ...mapping,
              kelas_mapping: mapping.kelas_mapping.map((km) =>
                km.kelas_asal_id === kelasAsalId ? { ...km, kelas_tujuan_id: kelasTujuanId } : km,
              ),
            }
          : mapping,
      ),
    )
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
              <Label htmlFor="tahun-lama">Tahun Ajaran Saat Ini</Label>
              <Input
                id="tahun-lama"
                value={tahunAjaranLama}
                onChange={(e) => setTahunAjaranLama(e.target.value)}
                placeholder="2024/2025"
              />
            </div>
            <div>
              <Label htmlFor="tahun-baru">Tahun Ajaran Baru</Label>
              <Input
                id="tahun-baru"
                value={tahunAjaranBaru}
                onChange={(e) => setTahunAjaranBaru(e.target.value)}
                placeholder="2025/2026"
              />
            </div>
          </CardContent>
        </Card>

        {tingkatanData.map((tingkatan, index) => {
          const nextTingkatan = tingkatanData[index + 1]
          const isGraduation = !nextTingkatan
          const mapping = promosiMapping.find((m) => m.tingkatan_asal_id === tingkatan.id)

          return (
            <Card key={tingkatan.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {tingkatan.nama_tingkatan}
                      <Badge variant="outline">
                        <Users className="h-3 w-3 mr-1" />
                        {tingkatan.jumlah_siswa} siswa
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      {isGraduation ? "Siswa akan lulus" : `Promosi ke ${nextTingkatan.nama_tingkatan}`}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {isGraduation ? (
                      <GraduationCap className="h-5 w-5 text-green-600" />
                    ) : (
                      <ArrowRight className="h-5 w-5 text-blue-600" />
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isGraduation ? (
                  <div className="text-center py-4">
                    <GraduationCap className="h-12 w-12 mx-auto text-green-600 mb-2" />
                    <p className="text-lg font-medium">Kelulusan</p>
                    <p className="text-muted-foreground">{tingkatan.jumlah_siswa} siswa akan dinyatakan lulus</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium mb-2">Kelas Asal</h4>
                        <div className="space-y-2">
                          {tingkatan.kelas.map((kelas) => (
                            <div key={kelas.id} className="flex items-center justify-between p-2 border rounded">
                              <span>{kelas.nama_kelas}</span>
                              <Badge variant="outline">{kelas.jumlah_siswa} siswa</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">Kelas Tujuan</h4>
                        <div className="space-y-2">
                          {tingkatan.kelas.map((kelas) => {
                            const kelasMapping = mapping?.kelas_mapping.find((km) => km.kelas_asal_id === kelas.id)
                            return (
                              <Select
                                key={kelas.id}
                                value={kelasMapping?.kelas_tujuan_id.toString() || ""}
                                onValueChange={(value) =>
                                  updateKelasMapping(tingkatan.id, kelas.id, Number.parseInt(value))
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Pilih kelas tujuan" />
                                </SelectTrigger>
                                <SelectContent>
                                  {nextTingkatan?.kelas.map((targetKelas) => (
                                    <SelectItem key={targetKelas.id} value={targetKelas.id.toString()}>
                                      {targetKelas.nama_kelas}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="flex justify-center">
        <Button onClick={handlePromosiSubmit} disabled={processing} size="lg" className="px-8">
          {processing ? "Memproses..." : "Jalankan Promosi Kelas"}
        </Button>
      </div>
    </div>
  )
}
