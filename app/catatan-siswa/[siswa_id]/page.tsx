"use client"

import type React from "react"

// Force dynamic rendering to avoid build-time data fetching issues
export const dynamic = 'force-dynamic'

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { PageHeader } from "@/src/components/PageHeader"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Save } from "lucide-react"
import { useRouter, useParams, useSearchParams } from "next/navigation"

interface CatatanSiswaData {
  id?: string
  siswa: {
    nama: string
    nis: string
    kelas: {
      nama_kelas: string
    }
  }
  periode_ajaran: {
    nama_ajaran: string
    semester: string
  }
  catatan_sikap: string | null
  catatan_akademik: string | null
}

export default function StudentCatatanSiswaPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const siswaId = params.siswa_id as string
  const periodeAjaranId = searchParams.get('periode_ajaran_id')

  const [data, setData] = useState<CatatanSiswaData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [catatanSikap, setCatatanSikap] = useState("")
  const [catatanAkademik, setCatatanAkademik] = useState("")

  const { toast } = useToast()

  useEffect(() => {
    if (siswaId && periodeAjaranId) {
      fetchStudentData()
    } else if (!periodeAjaranId) {
      toast({
        title: "Error",
        description: "Periode ajaran tidak ditemukan",
        variant: "destructive",
      })
      router.back()
    }
  }, [siswaId, periodeAjaranId])

  const fetchStudentData = async () => {
    try {
      // First get student info
      const studentResponse = await fetch(`/api/siswa/${siswaId}`)
      const studentResult = await studentResponse.json()

      if (!studentResult.success) {
        throw new Error("Siswa tidak ditemukan")
      }

      const siswa = studentResult.data

      // Then get periode ajaran info
      const periodeResponse = await fetch(`/api/periode-ajaran/${periodeAjaranId}`)
      const periodeResult = await periodeResponse.json()

      if (!periodeResult.success) {
        throw new Error("Periode ajaran tidak ditemukan")
      }

      const periodeAjaran = periodeResult.data

      // Try to get existing catatan siswa
      const catatanResponse = await fetch(`/api/catatan-siswa?siswa_id=${siswaId}&periode_ajaran_id=${periodeAjaranId}`)
      const catatanResult = await catatanResponse.json()

      let existingCatatan = null
      if (catatanResult.success && catatanResult.data.length > 0) {
        existingCatatan = catatanResult.data[0]
      }

      const combinedData: CatatanSiswaData = {
        id: existingCatatan?.id,
        siswa: {
          nama: siswa.nama,
          nis: siswa.nis,
          kelas: {
            nama_kelas: siswa.kelas?.nama_kelas || "",
          },
        },
        periode_ajaran: {
          nama_ajaran: periodeAjaran.nama_ajaran,
          semester: periodeAjaran.semester,
        },
        catatan_sikap: existingCatatan?.catatan_sikap || null,
        catatan_akademik: existingCatatan?.catatan_akademik || null,
      }

      setData(combinedData)
      setCatatanSikap(combinedData.catatan_sikap || "")
      setCatatanAkademik(combinedData.catatan_akademik || "")

    } catch (error) {
      console.error("Error fetching student data:", error)
      toast({
        title: "Error",
        description: "Gagal memuat data siswa",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!siswaId || !periodeAjaranId) return

    setSaving(true)

    try {
      const response = await fetch("/api/catatan-siswa", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          siswa_id: siswaId,
          periode_ajaran_id: periodeAjaranId,
          catatan_sikap: catatanSikap.trim() || null,
          catatan_akademik: catatanAkademik.trim() || null,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Berhasil",
          description: "Catatan siswa berhasil disimpan",
        })
        // Refresh data to get updated timestamp
        fetchStudentData()
      } else {
        throw new Error(result.error || "Gagal menyimpan catatan")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal menyimpan catatan siswa",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2">Memuat data siswa...</span>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <p className="text-muted-foreground">Data siswa tidak ditemukan</p>
          <Button variant="outline" onClick={() => router.back()} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Kembali
        </Button>
        <PageHeader
          title={`Catatan Siswa - ${data.siswa.nama}`}
          description={`NIS: ${data.siswa.nis} | Kelas: ${data.siswa.kelas.nama_kelas}`}
        />
      </div>

      {/* Student Info */}
      <Card>
        <CardHeader>
          <CardTitle>Informasi Siswa</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p><strong>NIS:</strong> {data.siswa.nis}</p>
              <p><strong>Nama:</strong> {data.siswa.nama}</p>
            </div>
            <div>
              <p><strong>Kelas:</strong> {data.siswa.kelas.nama_kelas}</p>
              <p><strong>Periode:</strong> {data.periode_ajaran.nama_ajaran} - Semester {data.periode_ajaran.semester === 'SATU' ? '1' : '2'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Catatan Form */}
      <Card>
        <CardHeader>
          <CardTitle>Catatan Siswa</CardTitle>
          <CardDescription>
            Masukkan catatan sikap dan akademik untuk siswa ini
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Catatan Sikap</label>
            <Textarea
              placeholder="Masukkan catatan sikap siswa..."
              value={catatanSikap}
              onChange={(e) => setCatatanSikap(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Catatan Akademik</label>
            <Textarea
              placeholder="Masukkan catatan akademik siswa..."
              value={catatanAkademik}
              onChange={(e) => setCatatanAkademik(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Menyimpan..." : "Simpan Catatan"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}