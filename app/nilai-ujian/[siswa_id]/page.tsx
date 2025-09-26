"use client"

import type React from "react"

// Force dynamic rendering to avoid build-time data fetching issues
export const dynamic = 'force-dynamic'

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/src/components/DataTable"
import { PageHeader } from "@/src/components/PageHeader"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Trash2 } from "lucide-react"
import { useRouter, useParams, useSearchParams } from "next/navigation"

interface NilaiUjian {
  id: string
  nilai_angka: number
  predikat: string
  mata_pelajaran: {
    nama_mapel: string
  }
}

interface StudentData {
  siswa: {
    nama: string
    nis: string
    kelas: {
      nama_kelas: string
    }
  }
  nilaiUjian: NilaiUjian[]
  periodeAjaran: {
    nama_ajaran: string
    semester: string
  }
}

export default function StudentNilaiUjianPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const siswaId = params.siswa_id as string
  const periodeAjaranId = searchParams.get('periode_ajaran_id')

  const [data, setData] = useState<StudentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<(number | string)[]>([])

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
      const response = await fetch(`/api/rapot/student-data/${siswaId}?periode_ajaran_id=${periodeAjaranId}`)
      const result = await response.json()

      if (result.success) {
        setData(result.data)
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

  const handleSelectionChange = (selectedIds: (number | string)[]) => {
    setSelectedIds(selectedIds)
  }

  const handleBulkDelete = async (selectedIds: (number | string)[]) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus ${selectedIds.length} data nilai ujian yang dipilih?`)) return

    try {
      const response = await fetch("/api/nilai-ujian/bulk-delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ids: selectedIds,
          periode_ajaran_id: periodeAjaranId
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Berhasil",
          description: `${selectedIds.length} data nilai ujian berhasil dihapus`,
        })
        setSelectedIds([])
        fetchStudentData()
      } else {
        throw new Error(result.error || "Failed to bulk delete")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal menghapus data nilai ujian",
        variant: "destructive",
      })
    }
  }

  const getGradeBadgeVariant = (grade: string) => {
    switch (grade) {
      case "Sempurna":
        return "default"
      case "Sangat Baik":
        return "default"
      case "Baik":
        return "secondary"
      case "Cukup":
        return "outline"
      case "Kurang":
        return "destructive"
      default:
        return "secondary"
    }
  }

  const columns = [
    {
      key: "mata_pelajaran.nama_mapel",
      label: "Mata Pelajaran",
    },
    {
      key: "nilai_angka",
      label: "Nilai Angka",
      render: (value: any) => (
        <span className="font-medium">{value}</span>
      ),
    },
    {
      key: "predikat",
      label: "Predikat",
      render: (value: any) => (
        <Badge variant={getGradeBadgeVariant(value)}>{value}</Badge>
      ),
    },
    {
      key: "periode_ajaran.nama_ajaran",
      label: "Periode",
      render: (value: any, row: any) => (
        <span>{data?.periodeAjaran.nama_ajaran} - Semester {data?.periodeAjaran.semester === 'SATU' ? '1' : '2'}</span>
      ),
    },
  ]

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
          title={`Nilai Ujian - ${data.siswa.nama}`}
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
              <p><strong>Total Nilai Ujian:</strong> {data.nilaiUjian.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Nilai Ujian Data */}
      <DataTable
        title="Data Nilai Ujian"
        data={data.nilaiUjian}
        columns={columns}
        loading={false}
        selectable={true}
        onSelectionChange={handleSelectionChange}
        onBulkDelete={handleBulkDelete}
        emptyMessage="Belum ada data nilai ujian untuk siswa ini"
        actions={false}
        onEdit={undefined}
        onDelete={undefined}
      />
    </div>
  )
}