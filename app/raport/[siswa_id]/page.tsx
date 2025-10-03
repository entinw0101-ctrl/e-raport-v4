"use client"

import type React from "react"

// Force dynamic rendering to avoid build-time data fetching issues
export const dynamic = 'force-dynamic'

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { PageHeader } from "@/src/components/PageHeader"
import { useToast } from "@/hooks/use-toast"
import { FileText, Download, Eye, ArrowLeft, Edit, Save, X, Trash2 } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useParams } from "next/navigation"
import { getPredicate, getSikapPredicate } from "@/lib/raport-utils"
import { getNilaiColor } from "@/lib/utils"
import { useSession } from "next-auth/react"

interface StudentData {
  siswa: {
    id: string
    nama: string
    nis: string
    tempat_lahir: string
    tanggal_lahir: string
    jenis_kelamin: string
    agama: string
    alamat: string
    kelas: {
      nama_kelas: string
      walikelas: {
        nama: string
        nip: string
      }
    }
    kamar: {
      nama_kamar: string
    }
  }
  nilaiUjian: Array<{
    id: string
    nilai_angka: number
    predikat: string
    mata_pelajaran: {
      nama_mapel: string
    }
  }>
  nilaiHafalan: Array<{
    id: string
    predikat: string
    mata_pelajaran: {
      nama_mapel: string
    }
    kurikulum: {
      kitab: {
        nama_kitab: string
      }
      batas_hafalan: string
    }
  }>
  kehadiran: Array<{
    id: string
    sakit: number
    izin: number
    alpha: number
    indikator_kehadiran: {
      nama_indikator: string
    }
  }>
  penilaianSikap: Array<{
    id: string
    nilai: number
    predikat: string
    indikator_sikap: {
      id: string
      jenis_sikap: string
      indikator: string
    }
  }>
  catatanSiswa: {
    id: string
    catatan_akademik: string
    catatan_sikap: string
  } | null
  periodeAjaran: {
    nama_ajaran: string
    semester: string
  }
}

export default function StudentRaportPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const siswaId = params.siswa_id as string
  const periodeAjaranId = searchParams.get('periode_ajaran_id')

  const [data, setData] = useState<StudentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState<string | null>(null)
  const [editingNotes, setEditingNotes] = useState(false)
  const [notesData, setNotesData] = useState({
    catatan_akademik: '',
    catatan_sikap: ''
  })
  const [savingNotes, setSavingNotes] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  // Individual editing states
  const [editingNilaiUjian, setEditingNilaiUjian] = useState<string | null>(null)
  const [editingNilaiHafalan, setEditingNilaiHafalan] = useState<string | null>(null)
  const [editingKehadiran, setEditingKehadiran] = useState<string | null>(null)
  const [editingPenilaianSikap, setEditingPenilaianSikap] = useState<string | null>(null)

  // Edit data states
  const [editNilaiUjianData, setEditNilaiUjianData] = useState({ nilai_angka: '', predikat: '' })
  const [editNilaiHafalanData, setEditNilaiHafalanData] = useState({ predikat: '', target_hafalan: '' })
  const [editKehadiranData, setEditKehadiranData] = useState({ sakit: '', izin: '', alpha: '' })
  const [editPenilaianSikapData, setEditPenilaianSikapData] = useState({ nilai: '' })

  // Saving states
  const [savingNilaiUjian, setSavingNilaiUjian] = useState(false)
  const [savingNilaiHafalan, setSavingNilaiHafalan] = useState(false)
  const [savingKehadiran, setSavingKehadiran] = useState(false)
  const [savingPenilaianSikap, setSavingPenilaianSikap] = useState(false)

  const { toast } = useToast()
  const { data: session } = useSession()

  useEffect(() => {
    if (siswaId && periodeAjaranId) {
      fetchStudentData()
    }
  }, [siswaId, periodeAjaranId])

  const fetchStudentData = async () => {
    try {
      const response = await fetch(`/api/rapot/student-data/${siswaId}?periode_ajaran_id=${periodeAjaranId}`)
      const result = await response.json()

      if (result.success) {
        setData(result.data)
        // Set notes data for editing
        if (result.data.catatanSiswa) {
          setNotesData({
            catatan_akademik: result.data.catatanSiswa.catatan_akademik,
            catatan_sikap: result.data.catatanSiswa.catatan_sikap
          })
        }
      } else {
        throw new Error(result.message || "Gagal memuat data siswa")
      }
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

  const handleGenerate = async (type: 'identitas' | 'nilai' | 'sikap', format: 'docx' | 'pdf' = 'docx') => {
    if (!data || !periodeAjaranId) return

    setGenerating(type)
    try {
      const response = await fetch(`/api/rapot/generate/${type}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          siswaId: siswaId,
          periodeAjaranId: periodeAjaranId,
          format: format
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      // Get filename from response headers
      const contentDisposition = response.headers.get('Content-Disposition')
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : `Raport_${type}_${data.siswa.nama.replace(/\s+/g, '_')}.${format}`

      // Create blob and download
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: "Berhasil",
        description: `Raport ${type} berhasil di-generate`,
      })
    } catch (error) {
      console.error(`Error generating ${type} report:`, error)
      toast({
        title: "Error",
        description: `Gagal generate raport ${type}`,
        variant: "destructive",
      })
    } finally {
      setGenerating(null)
    }
  }

  const formatTanggal = (tanggal: string) => {
    if (!tanggal) return '-'
    const date = new Date(tanggal)
    const bulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
    return `${date.getDate()} ${bulan[date.getMonth()]} ${date.getFullYear()}`
  }

  const handleSaveNotes = async () => {
    if (!periodeAjaranId || !session?.user?.role?.includes('admin')) return

    setSavingNotes(true)
    try {
      const response = await fetch('/api/catatan-siswa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          siswa_id: siswaId,
          periode_ajaran_id: periodeAjaranId,
          catatan_akademik: notesData.catatan_akademik,
          catatan_sikap: notesData.catatan_sikap
        }),
      })

      const result = await response.json()

      if (result.success) {
        // Refresh data
        await fetchStudentData()
        setEditingNotes(false)
        toast({
          title: "Berhasil",
          description: "Catatan siswa berhasil disimpan",
        })
      } else {
        throw new Error(result.error || "Gagal menyimpan catatan")
      }
    } catch (error) {
      console.error("Error saving notes:", error)
      toast({
        title: "Error",
        description: "Gagal menyimpan catatan siswa",
        variant: "destructive",
      })
    } finally {
      setSavingNotes(false)
    }
  }

  const handleCancelEdit = () => {
    if (data?.catatanSiswa) {
      setNotesData({
        catatan_akademik: data.catatanSiswa.catatan_akademik,
        catatan_sikap: data.catatanSiswa.catatan_sikap
      })
    } else {
      setNotesData({
        catatan_akademik: '',
        catatan_sikap: ''
      })
    }
    setEditingNotes(false)
  }

  const handleDeleteData = async (type: 'nilai-ujian' | 'nilai-hafalan' | 'kehadiran' | 'penilaian-sikap' | 'catatan-siswa', ids?: string[]) => {
    if (!periodeAjaranId || session?.user?.role !== 'admin') return

    setDeleting(type)
    try {
      let endpoint = ''
      let body: any = {}

      switch (type) {
        case 'nilai-ujian':
          endpoint = '/api/nilai-ujian/bulk-delete'
          body = ids ? { ids } : { deleteAll: true }
          break
        case 'nilai-hafalan':
          endpoint = '/api/nilai-hafalan/bulk-delete'
          body = ids ? { ids } : { deleteAll: true }
          break
        case 'kehadiran':
          endpoint = '/api/kehadiran/bulk-delete'
          body = ids ? { ids } : { deleteAll: true }
          break
        case 'penilaian-sikap':
          endpoint = '/api/penilaian-sikap/bulk-delete'
          body = ids ? { ids } : { deleteAll: true }
          break
        case 'catatan-siswa':
          if (data?.catatanSiswa?.id) {
            endpoint = `/api/catatan-siswa/${data.catatanSiswa.id}`
            // DELETE request doesn't need body
          } else {
            throw new Error("Tidak ada catatan siswa untuk dihapus")
          }
          break
      }

      const response = await fetch(endpoint, {
        method: type === 'catatan-siswa' ? 'DELETE' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: type === 'catatan-siswa' ? undefined : JSON.stringify(body),
      })

      const result = await response.json()

      if (result.success) {
        // Refresh data
        await fetchStudentData()
        toast({
          title: "Berhasil",
          description: `Data berhasil dihapus`,
        })
      } else {
        throw new Error(result.error || "Gagal menghapus data")
      }
    } catch (error) {
      console.error(`Error deleting ${type}:`, error)
      toast({
        title: "Error",
        description: `Gagal menghapus data ${type}`,
        variant: "destructive",
      })
    } finally {
      setDeleting(null)
    }
  }

  // Individual update handlers
  const handleUpdateNilaiUjian = async (id: string) => {
    if (!periodeAjaranId || !session?.user?.role?.includes('admin')) return

    setSavingNilaiUjian(true)
    try {
      const response = await fetch(`/api/nilai-ujian/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nilai_angka: parseFloat(editNilaiUjianData.nilai_angka),
          predikat: editNilaiUjianData.predikat || undefined,
        }),
      })

      const result = await response.json()

      if (result.success) {
        await fetchStudentData()
        setEditingNilaiUjian(null)
        toast({
          title: "Berhasil",
          description: "Nilai ujian berhasil diperbarui",
        })
      } else {
        throw new Error(result.error || "Gagal memperbarui nilai ujian")
      }
    } catch (error) {
      console.error("Error updating nilai ujian:", error)
      toast({
        title: "Error",
        description: "Gagal memperbarui nilai ujian",
        variant: "destructive",
      })
    } finally {
      setSavingNilaiUjian(false)
    }
  }

  const handleDeleteNilaiUjian = async (id: string) => {
    if (!periodeAjaranId || !session?.user?.role?.includes('admin')) return

    try {
      const response = await fetch(`/api/nilai-ujian/${id}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (result.success) {
        await fetchStudentData()
        toast({
          title: "Berhasil",
          description: "Nilai ujian berhasil dihapus",
        })
      } else {
        throw new Error(result.error || "Gagal menghapus nilai ujian")
      }
    } catch (error) {
      console.error("Error deleting nilai ujian:", error)
      toast({
        title: "Error",
        description: "Gagal menghapus nilai ujian",
        variant: "destructive",
      })
    }
  }

  const handleUpdateNilaiHafalan = async (id: string) => {
    if (!periodeAjaranId || !session?.user?.role?.includes('admin')) return

    setSavingNilaiHafalan(true)
    try {
      const response = await fetch(`/api/nilai-hafalan/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          predikat: editNilaiHafalanData.predikat,
          target_hafalan: editNilaiHafalanData.target_hafalan || undefined,
        }),
      })

      const result = await response.json()

      if (result.success) {
        await fetchStudentData()
        setEditingNilaiHafalan(null)
        toast({
          title: "Berhasil",
          description: "Nilai hafalan berhasil diperbarui",
        })
      } else {
        throw new Error(result.error || "Gagal memperbarui nilai hafalan")
      }
    } catch (error) {
      console.error("Error updating nilai hafalan:", error)
      toast({
        title: "Error",
        description: "Gagal memperbarui nilai hafalan",
        variant: "destructive",
      })
    } finally {
      setSavingNilaiHafalan(false)
    }
  }

  const handleDeleteNilaiHafalan = async (id: string) => {
    if (!periodeAjaranId || !session?.user?.role?.includes('admin')) return

    try {
      const response = await fetch(`/api/nilai-hafalan/${id}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (result.success) {
        await fetchStudentData()
        toast({
          title: "Berhasil",
          description: "Nilai hafalan berhasil dihapus",
        })
      } else {
        throw new Error(result.error || "Gagal menghapus nilai hafalan")
      }
    } catch (error) {
      console.error("Error deleting nilai hafalan:", error)
      toast({
        title: "Error",
        description: "Gagal menghapus nilai hafalan",
        variant: "destructive",
      })
    }
  }

  const handleUpdateKehadiran = async (id: string) => {
    if (!periodeAjaranId || !session?.user?.role?.includes('admin')) return

    setSavingKehadiran(true)
    try {
      const response = await fetch(`/api/kehadiran/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sakit: parseInt(editKehadiranData.sakit),
          izin: parseInt(editKehadiranData.izin),
          alpha: parseInt(editKehadiranData.alpha),
        }),
      })

      const result = await response.json()

      if (result.success) {
        await fetchStudentData()
        setEditingKehadiran(null)
        toast({
          title: "Berhasil",
          description: "Data kehadiran berhasil diperbarui",
        })
      } else {
        throw new Error(result.error || "Gagal memperbarui data kehadiran")
      }
    } catch (error) {
      console.error("Error updating kehadiran:", error)
      toast({
        title: "Error",
        description: "Gagal memperbarui data kehadiran",
        variant: "destructive",
      })
    } finally {
      setSavingKehadiran(false)
    }
  }

  const handleDeleteKehadiran = async (id: string) => {
    if (!periodeAjaranId || !session?.user?.role?.includes('admin')) return

    try {
      const response = await fetch(`/api/kehadiran/${id}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (result.success) {
        await fetchStudentData()
        toast({
          title: "Berhasil",
          description: "Data kehadiran berhasil dihapus",
        })
      } else {
        throw new Error(result.error || "Gagal menghapus data kehadiran")
      }
    } catch (error) {
      console.error("Error deleting kehadiran:", error)
      toast({
        title: "Error",
        description: "Gagal menghapus data kehadiran",
        variant: "destructive",
      })
    }
  }

  const handleUpdatePenilaianSikap = async (id: string) => {
    if (!periodeAjaranId || !session?.user?.role?.includes('admin')) return

    setSavingPenilaianSikap(true)
    try {
      const response = await fetch(`/api/penilaian-sikap/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          siswa_id: siswaId,
          periode_ajaran_id: periodeAjaranId,
          indikator_sikap_id: data?.penilaianSikap.find(p => p.id === id)?.indikator_sikap.id,
          nilai: editPenilaianSikapData.nilai,
        }),
      })

      const result = await response.json()

      if (result.success) {
        await fetchStudentData()
        setEditingPenilaianSikap(null)
        toast({
          title: "Berhasil",
          description: "Penilaian sikap berhasil diperbarui",
        })
      } else {
        throw new Error(result.error || "Gagal memperbarui penilaian sikap")
      }
    } catch (error) {
      console.error("Error updating penilaian sikap:", error)
      toast({
        title: "Error",
        description: "Gagal memperbarui penilaian sikap",
        variant: "destructive",
      })
    } finally {
      setSavingPenilaianSikap(false)
    }
  }

  const handleDeletePenilaianSikap = async (id: string) => {
    if (!periodeAjaranId || !session?.user?.role?.includes('admin')) return

    try {
      const response = await fetch(`/api/penilaian-sikap/${id}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (result.success) {
        await fetchStudentData()
        toast({
          title: "Berhasil",
          description: "Penilaian sikap berhasil dihapus",
        })
      } else {
        throw new Error(result.error || "Gagal menghapus penilaian sikap")
      }
    } catch (error) {
      console.error("Error deleting penilaian sikap:", error)
      toast({
        title: "Error",
        description: "Gagal menghapus penilaian sikap",
        variant: "destructive",
      })
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
          title={`Detail Raport - ${data.siswa.nama}`}
          description={`Periode: ${data.periodeAjaran.nama_ajaran} - Semester ${data.periodeAjaran.semester === 'SATU' ? '1' : '2'}`}
        />
      </div>

      {/* Student Info */}
      <Card>
        <CardHeader>
          <CardTitle>Informasi Siswa</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p><strong>NIS:</strong> {data.siswa.nis}</p>
            <p><strong>Nama:</strong> {data.siswa.nama}</p>
            <p><strong>TTL:</strong> {data.siswa.tempat_lahir}, {formatTanggal(data.siswa.tanggal_lahir)}</p>
            <p><strong>Jenis Kelamin:</strong> {data.siswa.jenis_kelamin}</p>
          </div>
          <div>
            <p><strong>Agama:</strong> {data.siswa.agama}</p>
            <p><strong>Alamat:</strong> {data.siswa.alamat}</p>
            <p><strong>Kelas:</strong> {data.siswa.kelas.nama_kelas}</p>
            <p><strong>Kamar:</strong> {data.siswa.kamar?.nama_kamar || '-'}</p>
          </div>
        </CardContent>
      </Card>

      {/* Generate Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Generate Raport</CardTitle>
          <CardDescription>Pilih jenis raport yang ingin di-generate</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              onClick={() => handleGenerate('identitas')}
              disabled={generating === 'identitas'}
              className="h-16"
            >
              <FileText className="h-5 w-5 mr-2" />
              {generating === 'identitas' ? 'Generating...' : 'Generate Identitas'}
            </Button>
            <Button
              onClick={() => handleGenerate('nilai')}
              disabled={generating === 'nilai'}
              className="h-16"
            >
              <Download className="h-5 w-5 mr-2" />
              {generating === 'nilai' ? 'Generating...' : 'Generate Nilai'}
            </Button>
            <Button
              onClick={() => handleGenerate('sikap')}
              disabled={generating === 'sikap'}
              className="h-16"
            >
              <Eye className="h-5 w-5 mr-2" />
              {generating === 'sikap' ? 'Generating...' : 'Generate Sikap'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Nilai Ujian */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Nilai Ujian ({data.nilaiUjian.length} mata pelajaran)</CardTitle>
              {session?.user?.role?.includes('admin') && data.nilaiUjian.length > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={deleting === 'nilai-ujian'}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      {deleting === 'nilai-ujian' ? 'Menghapus...' : 'Hapus Semua'}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Konfirmasi Hapus</AlertDialogTitle>
                      <AlertDialogDescription>
                        Apakah Anda yakin ingin menghapus semua nilai ujian siswa ini? Tindakan ini tidak dapat dibatalkan.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Batal</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDeleteData('nilai-ujian')}>
                        Hapus
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {data.nilaiUjian.map((nilai) => (
                <div key={nilai.id} className="p-2 border rounded">
                  {editingNilaiUjian === nilai.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm flex-1">{nilai.mata_pelajaran.nama_mapel}</span>
                      <Input
                        type="number"
                        placeholder="Nilai"
                        value={editNilaiUjianData.nilai_angka}
                        onChange={(e) => setEditNilaiUjianData(prev => ({ ...prev, nilai_angka: e.target.value }))}
                        className="w-20"
                        min="0"
                        max="100"
                      />
                      <Input
                        placeholder="Predikat"
                        value={editNilaiUjianData.predikat}
                        onChange={(e) => setEditNilaiUjianData(prev => ({ ...prev, predikat: e.target.value }))}
                        className="w-16"
                      />
                      <Button
                        size="sm"
                        onClick={() => handleUpdateNilaiUjian(nilai.id)}
                        disabled={savingNilaiUjian}
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingNilaiUjian(null)}
                        disabled={savingNilaiUjian}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center">
                      <span className="text-sm">{nilai.mata_pelajaran.nama_mapel}</span>
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${getNilaiColor(nilai.nilai_angka)}`}>{nilai.nilai_angka}</span>
                        <Badge variant="outline">{nilai.predikat}</Badge>
                        {session?.user?.role?.includes('admin') && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingNilaiUjian(nilai.id)
                                setEditNilaiUjianData({
                                  nilai_angka: nilai.nilai_angka.toString(),
                                  predikat: nilai.predikat
                                })
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="ghost">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Konfirmasi Hapus</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Apakah Anda yakin ingin menghapus nilai ujian {nilai.mata_pelajaran.nama_mapel}?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Batal</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteNilaiUjian(nilai.id)}>
                                    Hapus
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {data.nilaiUjian.length === 0 && (
                <p className="text-muted-foreground text-center py-4">Tidak ada data nilai ujian</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Nilai Hafalan */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Nilai Hafalan ({data.nilaiHafalan.length} mata pelajaran)</CardTitle>
              {session?.user?.role?.includes('admin') && data.nilaiHafalan.length > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={deleting === 'nilai-hafalan'}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      {deleting === 'nilai-hafalan' ? 'Menghapus...' : 'Hapus Semua'}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Konfirmasi Hapus</AlertDialogTitle>
                      <AlertDialogDescription>
                        Apakah Anda yakin ingin menghapus semua nilai hafalan siswa ini? Tindakan ini tidak dapat dibatalkan.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Batal</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDeleteData('nilai-hafalan')}>
                        Hapus
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {data.nilaiHafalan.map((nilai) => (
                <div key={nilai.id} className="p-2 border rounded">
                  {editingNilaiHafalan === nilai.id ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">{nilai.mata_pelajaran.nama_mapel}</p>
                      <p className="text-xs text-muted-foreground">
                        Kitab: {nilai.kurikulum?.kitab?.nama_kitab || nilai.kurikulum?.batas_hafalan || 'Tidak ada data kitab'}
                      </p>
                      <div className="flex items-center gap-2">
                        <Select
                          value={editNilaiHafalanData.predikat}
                          onValueChange={(value) => setEditNilaiHafalanData(prev => ({ ...prev, predikat: value }))}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Tercapai">Tercapai</SelectItem>
                            <SelectItem value="Tidak Tercapai">Tidak Tercapai</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          placeholder="Target Hafalan"
                          value={editNilaiHafalanData.target_hafalan}
                          onChange={(e) => setEditNilaiHafalanData(prev => ({ ...prev, target_hafalan: e.target.value }))}
                          className="flex-1"
                        />
                        <Button
                          size="sm"
                          onClick={() => handleUpdateNilaiHafalan(nilai.id)}
                          disabled={savingNilaiHafalan}
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingNilaiHafalan(null)}
                          disabled={savingNilaiHafalan}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium">{nilai.mata_pelajaran.nama_mapel}</p>
                        <p className="text-xs text-muted-foreground">
                          Kitab: {nilai.kurikulum?.kitab?.nama_kitab || nilai.kurikulum?.batas_hafalan || 'Tidak ada data kitab'}
                        </p>
                        {nilai.kurikulum?.batas_hafalan && nilai.kurikulum?.batas_hafalan !== nilai.kurikulum?.kitab?.nama_kitab && (
                          <p className="text-xs text-muted-foreground">
                            Target Hafalan: {nilai.kurikulum.batas_hafalan}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{nilai.predikat}</Badge>
                        {session?.user?.role?.includes('admin') && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingNilaiHafalan(nilai.id)
                                setEditNilaiHafalanData({
                                  predikat: nilai.predikat,
                                  target_hafalan: nilai.kurikulum?.batas_hafalan || ''
                                })
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="ghost">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Konfirmasi Hapus</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Apakah Anda yakin ingin menghapus nilai hafalan {nilai.mata_pelajaran.nama_mapel}?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Batal</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteNilaiHafalan(nilai.id)}>
                                    Hapus
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {data.nilaiHafalan.length === 0 && (
                <p className="text-muted-foreground text-center py-4">Tidak ada data nilai hafalan</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Kehadiran */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Kehadiran ({data.kehadiran.length} indikator)</CardTitle>
              {session?.user?.role?.includes('admin') && data.kehadiran.length > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={deleting === 'kehadiran'}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      {deleting === 'kehadiran' ? 'Menghapus...' : 'Hapus Semua'}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Konfirmasi Hapus</AlertDialogTitle>
                      <AlertDialogDescription>
                        Apakah Anda yakin ingin menghapus semua data kehadiran siswa ini? Tindakan ini tidak dapat dibatalkan.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Batal</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDeleteData('kehadiran')}>
                        Hapus
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {data.kehadiran.map((k) => (
                <div key={k.id} className="p-2 border rounded">
                  {editingKehadiran === k.id ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">{k.indikator_kehadiran.nama_indikator}</p>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <label className="text-xs">Sakit:</label>
                          <Input
                            type="number"
                            value={editKehadiranData.sakit}
                            onChange={(e) => setEditKehadiranData(prev => ({ ...prev, sakit: e.target.value }))}
                            className="w-16"
                            min="0"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <label className="text-xs">Izin:</label>
                          <Input
                            type="number"
                            value={editKehadiranData.izin}
                            onChange={(e) => setEditKehadiranData(prev => ({ ...prev, izin: e.target.value }))}
                            className="w-16"
                            min="0"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <label className="text-xs">Alpha:</label>
                          <Input
                            type="number"
                            value={editKehadiranData.alpha}
                            onChange={(e) => setEditKehadiranData(prev => ({ ...prev, alpha: e.target.value }))}
                            className="w-16"
                            min="0"
                          />
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleUpdateKehadiran(k.id)}
                          disabled={savingKehadiran}
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingKehadiran(null)}
                          disabled={savingKehadiran}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex justify-between items-start">
                        <p className="text-sm font-medium">{k.indikator_kehadiran.nama_indikator}</p>
                        {session?.user?.role?.includes('admin') && (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingKehadiran(k.id)
                                setEditKehadiranData({
                                  sakit: k.sakit.toString(),
                                  izin: k.izin.toString(),
                                  alpha: k.alpha.toString()
                                })
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="ghost">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Konfirmasi Hapus</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Apakah Anda yakin ingin menghapus data kehadiran {k.indikator_kehadiran.nama_indikator}?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Batal</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteKehadiran(k.id)}>
                                    Hapus
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                        <span>Sakit: {k.sakit}</span>
                        <span>Izin: {k.izin}</span>
                        <span>Alpha: {k.alpha}</span>
                        <span>Total: {k.sakit + k.izin + k.alpha}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {data.kehadiran.length === 0 && (
                <p className="text-muted-foreground text-center py-4">Tidak ada data kehadiran</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Penilaian Sikap */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Penilaian Sikap ({data.penilaianSikap.length} indikator)</CardTitle>
              {session?.user?.role?.includes('admin') && data.penilaianSikap.length > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={deleting === 'penilaian-sikap'}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      {deleting === 'penilaian-sikap' ? 'Menghapus...' : 'Hapus Semua'}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Konfirmasi Hapus</AlertDialogTitle>
                      <AlertDialogDescription>
                        Apakah Anda yakin ingin menghapus semua penilaian sikap siswa ini? Tindakan ini tidak dapat dibatalkan.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Batal</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDeleteData('penilaian-sikap')}>
                        Hapus
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {data.penilaianSikap.map((sikap) => (
                <div key={sikap.id} className="p-2 border rounded">
                  {editingPenilaianSikap === sikap.id ? (
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{sikap.indikator_sikap.indikator}</p>
                        <p className="text-xs text-muted-foreground">{sikap.indikator_sikap.jenis_sikap}</p>
                      </div>
                      <Select
                        value={editPenilaianSikapData.nilai}
                        onValueChange={(value) => setEditPenilaianSikapData({ nilai: value })}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Sangat Baik">Sangat Baik</SelectItem>
                          <SelectItem value="Baik">Baik</SelectItem>
                          <SelectItem value="Cukup">Cukup</SelectItem>
                          <SelectItem value="Kurang">Kurang</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        onClick={() => handleUpdatePenilaianSikap(sikap.id)}
                        disabled={savingPenilaianSikap}
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingPenilaianSikap(null)}
                        disabled={savingPenilaianSikap}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium">{sikap.indikator_sikap.indikator}</p>
                        <p className="text-xs text-muted-foreground">{sikap.indikator_sikap.jenis_sikap}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${getNilaiColor(sikap.nilai)}`}>{sikap.nilai}</span>
                        <Badge variant="outline">
                          {sikap.predikat}
                        </Badge>
                        {session?.user?.role?.includes('admin') && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingPenilaianSikap(sikap.id)
                                const nilaiMap: Record<number, string> = {
                                  4: "Sangat Baik",
                                  3: "Baik",
                                  2: "Cukup",
                                  1: "Kurang"
                                }
                                setEditPenilaianSikapData({
                                  nilai: nilaiMap[sikap.nilai] || "Kurang"
                                })
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="ghost">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Konfirmasi Hapus</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Apakah Anda yakin ingin menghapus penilaian sikap {sikap.indikator_sikap.indikator}?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Batal</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeletePenilaianSikap(sikap.id)}>
                                    Hapus
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {data.penilaianSikap.length === 0 && (
                <p className="text-muted-foreground text-center py-4">Tidak ada data penilaian sikap</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Student Notes */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Catatan Siswa</CardTitle>
              <CardDescription>Catatan akademik dan sikap siswa untuk periode ini</CardDescription>
            </div>
            {session?.user?.role?.includes('admin') && (
              <div className="flex gap-2">
                {!editingNotes ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingNotes(true)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Catatan
                    </Button>
                    {data?.catatanSiswa && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm" disabled={deleting === 'catatan-siswa'}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            {deleting === 'catatan-siswa' ? 'Menghapus...' : 'Hapus Catatan'}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Konfirmasi Hapus</AlertDialogTitle>
                            <AlertDialogDescription>
                              Apakah Anda yakin ingin menghapus catatan siswa ini? Tindakan ini tidak dapat dibatalkan.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Batal</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteData('catatan-siswa')}>
                              Hapus
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelEdit}
                      disabled={savingNotes}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Batal
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveNotes}
                      disabled={savingNotes}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {savingNotes ? 'Menyimpan...' : 'Simpan'}
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Catatan Akademik</label>
            {editingNotes ? (
              <Textarea
                value={notesData.catatan_akademik}
                onChange={(e) => setNotesData(prev => ({ ...prev, catatan_akademik: e.target.value }))}
                placeholder="Masukkan catatan akademik siswa..."
                rows={4}
              />
            ) : (
              <div className="p-3 border rounded-md min-h-[100px] bg-muted/50">
                {data?.catatanSiswa?.catatan_akademik || 'Belum ada catatan akademik'}
              </div>
            )}
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Catatan Sikap</label>
            {editingNotes ? (
              <Textarea
                value={notesData.catatan_sikap}
                onChange={(e) => setNotesData(prev => ({ ...prev, catatan_sikap: e.target.value }))}
                placeholder="Masukkan catatan sikap siswa..."
                rows={4}
              />
            ) : (
              <div className="p-3 border rounded-md min-h-[100px] bg-muted/50">
                {data?.catatanSiswa?.catatan_sikap || 'Belum ada catatan sikap'}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}