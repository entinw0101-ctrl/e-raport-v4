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
import { Eye } from "lucide-react"
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
    if (selectedPeriode) {
      fetchEligibleStudents()
    }
  }, [selectedPeriode, selectedKelas])

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

  const fetchEligibleStudents = async () => {
    if (!selectedPeriode) return

    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append("periode_ajaran_id", selectedPeriode)
      if (selectedKelas && selectedKelas !== "all") {
        params.append("kelas_id", selectedKelas)
      }

      const response = await fetch(`/api/rapot/eligible-students?${params}`)
      const result = await response.json()

      if (result.success) {
        setData(result.data || [])
      } else {
        throw new Error(result.message || "Gagal memuat data siswa")
      }
    } catch (error) {
      console.error("Error fetching eligible students:", error)
      toast({
        title: "Error",
        description: "Gagal memuat data siswa siap raport",
        variant: "destructive",
      })
      setData([])
    } finally {
      setLoading(false)
    }
  }

  const handleViewData = (student: EligibleStudent) => {
    router.push(`/raport/${student.id}?periode_ajaran_id=${selectedPeriode}`)
  }

  const renderActions = (row: EligibleStudent) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => handleViewData(row)}
      disabled={!selectedPeriode}
    >
      <Eye className="h-4 w-4 mr-2" />
      Lihat Data
    </Button>
  )

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Generate Raport"
        description="Daftar siswa yang siap untuk generate raport"
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
        title="Siswa Siap Generate Raport"
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
        emptyMessage={selectedPeriode ? "Tidak ada siswa yang memenuhi syarat untuk periode ajaran ini" : "Pilih periode ajaran terlebih dahulu"}
        actions={false}
        onEdit={undefined}
        onDelete={undefined}
      />
    </div>
  )
}