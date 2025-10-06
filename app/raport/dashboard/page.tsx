"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DataTable } from "@/src/components/DataTable"
import { PageHeader } from "@/src/components/PageHeader"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Download, Eye, CheckCircle, AlertTriangle, XCircle, FileText } from "lucide-react"
import { useRouter } from "next/navigation"

interface StudentReportStatus {
  id: number
  nama: string
  nis: string
  report_status: 'ready' | 'partial' | 'not_ready' | 'error'
  can_generate: boolean
  peringkat: string | number | null
  total_siswa: number
  warnings?: string[]
}

interface ReportSummary {
  ready: number
  partial: number
  not_ready: number
  error: number
}

export default function RaportDashboardPage() {
  const [students, setStudents] = useState<StudentReportStatus[]>([])
  const [summary, setSummary] = useState<ReportSummary>({ ready: 0, partial: 0, not_ready: 0, error: 0 })
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState<Set<number>>(new Set())
  const [periodeOptions, setPeriodeOptions] = useState<any[]>([])
  const [kelasOptions, setKelasOptions] = useState<any[]>([])
  const [selectedPeriode, setSelectedPeriode] = useState<string>("")
  const [selectedKelas, setSelectedKelas] = useState<string>("")

  const { toast } = useToast()
  const router = useRouter()

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ready':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Siap</Badge>
      case 'partial':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><AlertTriangle className="w-3 h-3 mr-1" />Sebagian</Badge>
      case 'not_ready':
        return <Badge variant="destructive" className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Belum Siap</Badge>
      case 'error':
        return <Badge variant="outline" className="bg-gray-100 text-gray-800"><XCircle className="w-3 h-3 mr-1" />Error</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const columns = [
    { key: "nis", label: "NIS" },
    { key: "nama", label: "Nama Siswa" },
    {
      key: "report_status",
      label: "Status Rapor",
      render: (value: string) => getStatusBadge(value)
    },
    {
      key: "peringkat",
      label: "Peringkat",
      render: (value: string | number | null) => value || "-"
    },
    { key: "total_siswa", label: "Total Siswa" },
  ]

  useEffect(() => {
    fetchOptions()
  }, [])

  useEffect(() => {
    if (selectedKelas && selectedPeriode) {
      fetchStudentStatuses()
    }
  }, [selectedKelas, selectedPeriode])

  const fetchOptions = async () => {
    try {
      const [periodeRes, kelasRes] = await Promise.all([
        fetch("/api/periode-ajaran?per_page=1000"),
        fetch("/api/kelas?per_page=1000"),
      ])

      const [periode, kelas] = await Promise.all([
        periodeRes.json(),
        kelasRes.json(),
      ])

      setPeriodeOptions(periode.success ? (periode.data || []) : [])
      setKelasOptions(kelas.success ? (kelas.data || []) : [])
    } catch (error) {
      console.error("Error fetching options:", error)
      toast({
        title: "Error",
        description: "Gagal memuat data filter",
        variant: "destructive",
      })
    }
  }

  const fetchStudentStatuses = async () => {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/rapot/eligible-students?kelas_id=${selectedKelas}&periode_ajaran_id=${selectedPeriode}`
      )
      const result = await response.json()

      if (result.success) {
        setStudents(result.students || [])
        setSummary(result.summary || { ready: 0, partial: 0, not_ready: 0, error: 0 })
      } else {
        throw new Error(result.error || "Gagal memuat status rapor siswa")
      }
    } catch (error) {
      console.error("Error fetching student statuses:", error)
      toast({
        title: "Error",
        description: "Gagal memuat status rapor siswa",
        variant: "destructive",
      })
      setStudents([])
      setSummary({ ready: 0, partial: 0, not_ready: 0, error: 0 })
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadSingle = async (student: StudentReportStatus) => {
    if (!student.can_generate) {
      toast({
        title: "Tidak Dapat Download",
        description: `Rapor ${student.nama} belum dapat di-generate`,
        variant: "destructive",
      })
      return
    }

    setDownloading(prev => new Set(prev).add(student.id))

    try {
      const response = await fetch('/api/rapot/generate/nilai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          siswaId: student.id.toString(),
          periodeAjaranId: selectedPeriode,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Gagal download rapor')
      }

      // Trigger download
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Rapor_Nilai_${student.nama.replace(/\s+/g, '_')}.docx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: "Berhasil",
        description: `Rapor ${student.nama} berhasil didownload`,
      })
    } catch (error) {
      console.error('Download error:', error)
      toast({
        title: "Error",
        description: `Gagal download rapor ${student.nama}`,
        variant: "destructive",
      })
    } finally {
      setDownloading(prev => {
        const newSet = new Set(prev)
        newSet.delete(student.id)
        return newSet
      })
    }
  }

  const handleDownloadBulk = async (filterStatus?: string, type: 'nilai' | 'identitas' | 'sikap' = 'nilai') => {
    const targetStudents = filterStatus
      ? students.filter(s => s.report_status === filterStatus && s.can_generate)
      : students.filter(s => s.can_generate)

    if (targetStudents.length === 0) {
      toast({
        title: "Tidak Ada Siswa",
        description: "Tidak ada siswa yang dapat didownload rapornya",
        variant: "destructive",
      })
      return
    }

    setDownloading(new Set(targetStudents.map(s => s.id)))

    let successCount = 0
    let errorCount = 0

    const endpoint = type === 'nilai' ? '/api/rapot/generate/nilai' :
                    type === 'identitas' ? '/api/rapot/generate/identitas' :
                    '/api/rapot/generate/sikap'

    const filePrefix = type === 'nilai' ? 'Rapor_Nilai' :
                      type === 'identitas' ? 'Identitas' :
                      'Sikap'

    for (const student of targetStudents) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            siswaId: student.id.toString(),
            periodeAjaranId: selectedPeriode,
          }),
        })

        if (!response.ok) {
          throw new Error('Download failed')
        }

        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${filePrefix}_${student.nama.replace(/\s+/g, '_')}.docx`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)

        successCount++
      } catch (error) {
        console.error(`Download error for ${student.nama}:`, error)
        errorCount++
      }
    }

    setDownloading(new Set())

    toast({
      title: "Download Selesai",
      description: `${successCount} ${type} berhasil didownload${errorCount > 0 ? `, ${errorCount} gagal` : ''}`,
    })
  }

  const renderActions = (row: StudentReportStatus) => (
    <div className="flex gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push(`/raport/${row.id}?periode_ajaran_id=${selectedPeriode}`)}
      >
        <Eye className="h-4 w-4 mr-2" />
        Lihat
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleDownloadSingle(row)}
        disabled={!row.can_generate || downloading.has(row.id)}
      >
        <Download className="h-4 w-4 mr-2" />
        {downloading.has(row.id) ? 'Downloading...' : 'Download'}
      </Button>
    </div>
  )

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Dashboard Monitoring Rapor"
        description="Pantau status kelengkapan data rapor siswa dan download massal"
      />

      <div className="flex gap-4 items-end">
        <div className="space-y-2">
          <label className="text-sm font-medium">Periode Ajaran</label>
          <Select value={selectedPeriode} onValueChange={setSelectedPeriode}>
            <SelectTrigger className="w-64">
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
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Kelas</label>
          <Select value={selectedKelas} onValueChange={setSelectedKelas}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Pilih Kelas" />
            </SelectTrigger>
            <SelectContent>
              {kelasOptions?.map((kelas: any) => (
                <SelectItem key={kelas.id} value={kelas.id.toString()}>
                  {kelas.nama_kelas}
                </SelectItem>
              )) || []}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedKelas && selectedPeriode && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Siap Download</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{summary.ready}</div>
                <p className="text-xs text-muted-foreground">Data lengkap</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sebagian</CardTitle>
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{summary.partial}</div>
                <p className="text-xs text-muted-foreground">Data belum lengkap</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Belum Siap</CardTitle>
                <XCircle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{summary.not_ready}</div>
                <p className="text-xs text-muted-foreground">Belum ada nilai ujian</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Siswa</CardTitle>
                <FileText className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{students.length}</div>
                <p className="text-xs text-muted-foreground">Siswa aktif</p>
              </CardContent>
            </Card>
          </div>

          {/* Bulk Download Actions */}
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={() => handleDownloadBulk('ready')}
              disabled={summary.ready === 0 || downloading.size > 0}
              className="bg-green-600 hover:bg-green-700"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Nilai Siap ({summary.ready})
            </Button>
            <Button
              onClick={() => handleDownloadBulk()}
              disabled={students.filter(s => s.can_generate).length === 0 || downloading.size > 0}
              variant="outline"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Nilai Semua ({students.filter(s => s.can_generate).length})
            </Button>
            <Button
              onClick={() => handleDownloadBulk(undefined, 'identitas')}
              disabled={students.length === 0 || downloading.size > 0}
              variant="secondary"
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Download className="h-4 w-4 mr-2" />
              Generate Identitas ({students.length})
            </Button>
            <Button
              onClick={() => handleDownloadBulk(undefined, 'sikap')}
              disabled={students.length === 0 || downloading.size > 0}
              variant="secondary"
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Download className="h-4 w-4 mr-2" />
              Generate Sikap ({students.length})
            </Button>
            <Button
              onClick={fetchStudentStatuses}
              variant="outline"
              disabled={loading}
            >
              Refresh Status
            </Button>
          </div>

          {/* Student List with Tabs */}
          <Tabs defaultValue="all" className="w-full">
            <TabsList>
              <TabsTrigger value="all">Semua ({students.length})</TabsTrigger>
              <TabsTrigger value="ready">Siap ({summary.ready})</TabsTrigger>
              <TabsTrigger value="partial">Sebagian ({summary.partial})</TabsTrigger>
              <TabsTrigger value="not_ready">Belum Siap ({summary.not_ready})</TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              <DataTable
                title="Status Rapor Semua Siswa"
                data={students}
                columns={[
                  ...columns,
                  {
                    key: "actions",
                    label: "Aksi",
                    render: (_, row) => renderActions(row)
                  }
                ]}
                loading={loading}
                emptyMessage="Tidak ada data siswa"
                actions={false}
                onEdit={undefined}
                onDelete={undefined}
              />
            </TabsContent>

            <TabsContent value="ready">
              <DataTable
                title="Siswa Siap Download"
                data={students.filter(s => s.report_status === 'ready')}
                columns={[
                  ...columns,
                  {
                    key: "actions",
                    label: "Aksi",
                    render: (_, row) => renderActions(row)
                  }
                ]}
                loading={loading}
                emptyMessage="Tidak ada siswa yang siap"
                actions={false}
                onEdit={undefined}
                onDelete={undefined}
              />
            </TabsContent>

            <TabsContent value="partial">
              <DataTable
                title="Siswa Data Sebagian"
                data={students.filter(s => s.report_status === 'partial')}
                columns={[
                  ...columns,
                  {
                    key: "actions",
                    label: "Aksi",
                    render: (_, row) => renderActions(row)
                  }
                ]}
                loading={loading}
                emptyMessage="Tidak ada siswa dengan data sebagian"
                actions={false}
                onEdit={undefined}
                onDelete={undefined}
              />
            </TabsContent>

            <TabsContent value="not_ready">
              <DataTable
                title="Siswa Belum Siap"
                data={students.filter(s => s.report_status === 'not_ready')}
                columns={[
                  ...columns,
                  {
                    key: "actions",
                    label: "Aksi",
                    render: (_, row) => renderActions(row)
                  }
                ]}
                loading={loading}
                emptyMessage="Tidak ada siswa yang belum siap"
                actions={false}
                onEdit={undefined}
                onDelete={undefined}
              />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}