"use client"

import type React from "react"

// Force dynamic rendering to avoid build-time data fetching issues
export const dynamic = 'force-dynamic'

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DataTable } from "@/src/components/DataTable"
import { PageHeader } from "@/src/components/PageHeader"
import { useToast } from "@/hooks/use-toast"
import { Eye, FileDown, Upload } from "lucide-react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"

interface Siswa {
  id: string
  nama: string
  nis: string
  kelas: {
    nama_kelas: string
  }
}

export default function CatatanSiswaPage() {
  const [data, setData] = useState<Siswa[]>([])
  const [loading, setLoading] = useState(true)
  const [kelasOptions, setKelasOptions] = useState<any[]>([])
  const [periodeOptions, setPeriodeOptions] = useState<any[]>([])

  // Pagination state
  const [pagination, setPagination] = useState({
    page: 1,
    per_page: 10,
    total: 0,
    total_pages: 0,
  })

  // Table filter states
  const [selectedKelas, setSelectedKelas] = useState<string>("")
  const [selectedPeriodeForTable, setSelectedPeriodeForTable] = useState<string>("")

  // Excel template states (synced with table filters)
  const selectedPeriodeAjaran = selectedPeriodeForTable
  const [selectedKelasForTemplate, setSelectedKelasForTemplate] = useState<string>("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isImporting, setIsImporting] = useState(false)

  const { toast } = useToast()
  const router = useRouter()

  const columns = [
    { key: "nis", label: "NIS" },
    { key: "nama", label: "Nama Siswa" },
    { key: "kelas.nama_kelas", label: "Kelas" },
  ]

  useEffect(() => {
    fetchData()
    fetchKelasOptions()
    fetchPeriodeOptions()
  }, [])

  useEffect(() => {
    fetchData()
  }, [selectedKelas, selectedPeriodeForTable])

  const fetchData = async (page = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append("status", "Aktif") // Only active students
      params.append("page", page.toString())
      params.append("per_page", pagination.per_page.toString())
      if (selectedKelas && selectedKelas !== "all") {
        params.append("kelas_id", selectedKelas)
      }

      const response = await fetch(`/api/siswa?${params}`)
      const result = await response.json()

      if (result.success) {
        setData(result.data || [])
        setPagination(result.pagination || {
          page: 1,
          per_page: 10,
          total: 0,
          total_pages: 0,
        })
      } else {
        throw new Error(result.message || "Gagal memuat data siswa")
      }
    } catch (error) {
      console.error("Error fetching students:", error)
      toast({
        title: "Error",
        description: "Gagal memuat data siswa",
        variant: "destructive",
      })
      setData([])
    } finally {
      setLoading(false)
    }
  }

  const fetchKelasOptions = async () => {
    try {
      const response = await fetch("/api/kelas")
      const result = await response.json()
      setKelasOptions(result.success ? (result.data || []) : [])
    } catch (error) {
      console.error("Error fetching kelas options:", error)
      setKelasOptions([])
    }
  }

  const fetchPeriodeOptions = async () => {
    try {
      const response = await fetch("/api/periode-ajaran?per_page=1000")
      const result = await response.json()
      setPeriodeOptions(result.success ? (result.data || []) : [])
    } catch (error) {
      console.error("Error fetching periode options:", error)
      setPeriodeOptions([])
    }
  }

  const handlePageChange = (page: number) => {
    fetchData(page)
  }

  const handlePerPageChange = (perPage: number) => {
    setPagination(prev => ({ ...prev, per_page: perPage }))
    fetchData(1) // Reset to first page
  }

  const handleViewData = (student: Siswa) => {
    if (!selectedPeriodeForTable) {
      toast({
        title: "Pilih Periode Ajaran",
        description: "Silakan pilih periode ajaran terlebih dahulu untuk melihat data siswa",
        variant: "destructive",
      })
      return
    }
    router.push(`/catatan-siswa/${student.id}?periode_ajaran_id=${selectedPeriodeForTable}`)
  }

  const handleDownloadTemplate = async () => {
    if (!selectedPeriodeAjaran || !selectedKelasForTemplate) {
      toast({
        title: "Pilih Lengkap",
        description: "Silakan pilih periode ajaran dan kelas terlebih dahulu",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch(`/api/export/excel/catatan-siswa/template/${selectedKelasForTemplate}?periode_ajaran_id=${selectedPeriodeAjaran}`)
      if (!response.ok) {
        throw new Error("Failed to download template")
      }
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `template_catatan_siswa_${new Date().toISOString().split("T")[0]}.xlsx`
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

  const handleImportExcel = async () => {
    if (!selectedFile) {
      toast({
        title: "Pilih File",
        description: "Silakan pilih file Excel terlebih dahulu",
        variant: "destructive",
      })
      return
    }

    if (!selectedPeriodeAjaran || !selectedKelasForTemplate) {
      toast({
        title: "Pilih Lengkap",
        description: "Silakan pilih periode ajaran dan kelas terlebih dahulu",
        variant: "destructive",
      })
      return
    }

    setIsImporting(true)

    try {
      const formData = new FormData()
      formData.append("file", selectedFile)
      formData.append("periode_ajaran_id", selectedPeriodeAjaran)

      const response = await fetch("/api/upload/excel/catatan-siswa", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Berhasil",
          description: result.message,
        })
        setSelectedFile(null)
        fetchData() // Refresh data
      } else {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        })
        if (result.details) {
          console.error("Import errors:", result.details)
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal mengimpor data",
        variant: "destructive",
      })
    } finally {
      setIsImporting(false)
    }
  }

  // Custom header for table filters
  const tableFilters = (
    <div className="flex gap-4 items-center">
      <div className="space-y-2">
        <label className="text-sm font-medium">Periode Ajaran</label>
        <Select value={selectedPeriodeForTable} onValueChange={setSelectedPeriodeForTable}>
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
            <SelectValue placeholder="Semua Kelas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kelas</SelectItem>
            {kelasOptions?.map((kelas: any) => (
              <SelectItem key={kelas.id} value={kelas.id.toString()}>
                {kelas.nama_kelas}
              </SelectItem>
            )) || []}
          </SelectContent>
        </Select>
      </div>
    </div>
  )

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader title="Catatan Siswa" description="Daftar siswa untuk melihat catatan sikap dan akademik" />

      {/* Excel Import/Export Section - At the top */}
      <div className="flex items-center gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Periode Ajaran (Excel)</label>
          <Select value={selectedPeriodeAjaran} onValueChange={setSelectedPeriodeForTable}>
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
          <label className="text-sm font-medium">Kelas (Excel)</label>
          <Select value={selectedKelasForTemplate} onValueChange={setSelectedKelasForTemplate} disabled={!selectedPeriodeForTable}>
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

        <div className="flex items-end gap-2">
          <Button variant="outline" onClick={handleDownloadTemplate} disabled={!selectedPeriodeForTable || !selectedKelasForTemplate}>
            <FileDown className="w-4 h-4 mr-2" />
            Download Template
          </Button>

          <div className="flex items-center gap-2">
            <Input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              disabled={isImporting}
              className="w-64"
            />
            <Button
              variant="outline"
              onClick={handleImportExcel}
              disabled={!selectedFile || isImporting || !selectedPeriodeForTable || !selectedKelasForTemplate}
            >
              <Upload className="w-4 h-4 mr-2" />
              {isImporting ? "Importing..." : "Import Excel"}
            </Button>
          </div>
        </div>
      </div>

      <DataTable
        title="Daftar Siswa"
        data={data}
        columns={[
          ...columns,
          {
            key: "actions",
            label: "Aksi",
            render: (_, row) => (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleViewData(row)}
                disabled={!selectedPeriodeForTable}
              >
                <Eye className="h-4 w-4 mr-2" />
                Lihat Data
              </Button>
            )
          }
        ]}
        loading={loading}
        pagination={pagination}
        onPageChange={handlePageChange}
        onPerPageChange={handlePerPageChange}
        selectable={false}
        onSelectionChange={undefined}
        onBulkDelete={undefined}
        customHeader={tableFilters}
        emptyMessage={selectedPeriodeForTable ? "Tidak ada data siswa" : "Pilih periode ajaran terlebih dahulu"}
        actions={true}
        onEdit={undefined}
        onDelete={undefined}
      />
    </div>
  )
}