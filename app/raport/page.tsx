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
import { Eye, BarChart3 } from "lucide-react"
import { useRouter } from "next/navigation"

interface EligibleStudent {
  id: string
  nama: string
  nis: string
  kelas: {
    nama_kelas: string
  }
}

export default function RaportPage() {
  const [data, setData] = useState<EligibleStudent[]>([])
  const [loading, setLoading] = useState(false)
  const [periodeOptions, setPeriodeOptions] = useState<any[]>([])
  const [kelasOptions, setKelasOptions] = useState<any[]>([])
  const [selectedPeriode, setSelectedPeriode] = useState<string>("")
  const [selectedKelas, setSelectedKelas] = useState<string>("")

  // Pagination state
  const [pagination, setPagination] = useState<{
    page: number
    per_page: number
    total: number
    total_pages: number
  }>({
    page: 1,
    per_page: 10,
    total: 0,
    total_pages: 0
  })

  const { toast } = useToast()
  const router = useRouter()

  const columns = [
    { key: "nis", label: "NIS" },
    { key: "nama", label: "Nama Siswa" },
    { key: "kelas.nama_kelas", label: "Kelas" },
  ]

  useEffect(() => {
    fetchOptions()
  }, [])

  useEffect(() => {
    // Reset to page 1 when kelas filter changes
    setPagination(prev => ({ ...prev, page: 1 }))
    fetchStudents(1, pagination.per_page)
  }, [selectedKelas])

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }))
    fetchStudents(page, pagination.per_page)
  }

  const handlePerPageChange = (perPage: number) => {
    setPagination(prev => ({ ...prev, per_page: perPage, page: 1 }))
    fetchStudents(1, perPage)
  }

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

  const fetchStudents = async (page = pagination.page, perPage = pagination.per_page) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append("status", "Aktif") // Only active students
      params.append("page", page.toString())
      params.append("per_page", perPage.toString())

      if (selectedKelas && selectedKelas !== "all") {
        params.append("kelas_id", selectedKelas)
      }

      const response = await fetch(`/api/siswa?${params}`)
      const result = await response.json()

      if (result.success) {
        setData(result.data || [])
        setPagination(result.pagination || {
          page: 1,
          per_page: perPage,
          total: 0,
          total_pages: 0
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

  const handleViewData = (student: EligibleStudent) => {
    if (!selectedPeriode) {
      toast({
        title: "Error",
        description: "Pilih periode ajaran terlebih dahulu",
        variant: "destructive",
      })
      return
    }
    router.push(`/raport/${student.id}?periode_ajaran_id=${selectedPeriode}`)
  }

  const renderActions = (row: EligibleStudent) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => handleViewData(row)}
    >
      <Eye className="h-4 w-4 mr-2" />
      Lihat Data
    </Button>
  )

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Generate Raport"
        description="Daftar semua siswa aktif"
      />

      <div className="flex gap-2">
        <Button
          onClick={() => router.push('/raport/dashboard')}
          variant="outline"
          className="flex items-center gap-2"
        >
          <BarChart3 className="h-4 w-4" />
          Dashboard Monitoring Rapor
        </Button>
      </div>

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
          <label className="text-sm font-medium">Kelas (Opsional)</label>
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

      <DataTable
        title="Daftar Siswa"
        data={data}
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
        pagination={pagination}
        onPageChange={handlePageChange}
        onPerPageChange={handlePerPageChange}
      />
    </div>
  )
}