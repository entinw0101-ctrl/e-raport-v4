"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { toast } from "@/hooks/use-toast"
import { SaveIcon } from "lucide-react"

interface StudentData {
  siswa_id: number
  nama: string
  nis: string
  kelas: string
  [key: string]: any // For dynamic indicator columns
}

interface Indicator {
  id: number
  nama_indikator: string
}

export default function KehadiranPage() {
  const [data, setData] = useState<StudentData[]>([])
  const [indicators, setIndicators] = useState<Indicator[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Hierarchical filter states
  const [selectedMasterTahunAjaran, setSelectedMasterTahunAjaran] = useState("")
  const [selectedSemester, setSelectedSemester] = useState("")
  const [selectedTingkatan, setSelectedTingkatan] = useState("")
  const [selectedKelas, setSelectedKelas] = useState("")

  // Options for selects
  const [masterTahunAjaranOptions, setMasterTahunAjaranOptions] = useState<{ value: number; label: string }[]>([])
  const [tingkatanOptions, setTingkatanOptions] = useState<{ value: number; label: string }[]>([])
  const [kelasOptions, setKelasOptions] = useState<{ value: number; label: string }[]>([])

  // Fetch options on mount
  useEffect(() => {
    fetchInitialOptions()
  }, [])

  // Fetch tingkatan when master tahun ajaran and semester are selected
  useEffect(() => {
    if (selectedMasterTahunAjaran && selectedSemester) {
      fetchTingkatanOptions()
      setSelectedTingkatan("")
      setSelectedKelas("")
    }
  }, [selectedMasterTahunAjaran, selectedSemester])

  // Fetch kelas when tingkatan changes
  useEffect(() => {
    if (selectedTingkatan) {
      fetchKelasOptions()
      setSelectedKelas("")
    }
  }, [selectedTingkatan])

  // Fetch student data when all filters are selected
  useEffect(() => {
    if (selectedMasterTahunAjaran && selectedSemester && selectedTingkatan && selectedKelas) {
      fetchStudentData()
    } else {
      setData([])
    }
  }, [selectedMasterTahunAjaran, selectedSemester, selectedTingkatan, selectedKelas])

  const fetchInitialOptions = async () => {
    try {
      // Fetch master tahun ajaran options
      const masterTahunAjaranResponse = await fetch("/api/master-tahun-ajaran")
      if (masterTahunAjaranResponse.ok) {
        const masterTahunAjaranData = await masterTahunAjaranResponse.json()
        setMasterTahunAjaranOptions(
          masterTahunAjaranData.data.map((master: any) => ({
            value: master.id,
            label: master.nama_ajaran,
          }))
        )
      }
    } catch (error) {
      console.error("Error fetching initial options:", error)
    }
  }

  const fetchTingkatanOptions = async () => {
    try {
      const response = await fetch("/api/tingkatan")
      if (response.ok) {
        const data = await response.json()
        setTingkatanOptions(
          data.data.map((tingkatan: any) => ({
            value: tingkatan.id,
            label: tingkatan.nama_tingkatan,
          }))
        )
      }
    } catch (error) {
      console.error("Error fetching tingkatan options:", error)
    }
  }

  const fetchKelasOptions = async () => {
    try {
      const response = await fetch(`/api/kelas?tingkatan_id=${selectedTingkatan}`)
      if (response.ok) {
        const data = await response.json()
        setKelasOptions(
          data.data.map((kelas: any) => ({
            value: kelas.id,
            label: kelas.nama_kelas,
          }))
        )
      }
    } catch (error) {
      console.error("Error fetching kelas options:", error)
    }
  }

  const fetchStudentData = async () => {
    setLoading(true)
    try {
      // First, find the Periode Ajaran ID based on Master Tahun Ajaran and Semester
      const periodeResponse = await fetch(
        `/api/periode-ajaran?master_tahun_ajaran_id=${selectedMasterTahunAjaran}&semester=${selectedSemester}`
      )

      if (!periodeResponse.ok) {
        toast({
          title: "Error",
          description: "Gagal menemukan periode ajaran",
          variant: "destructive",
        })
        return
      }

      const periodeData = await periodeResponse.json()
      if (periodeData.data.length === 0) {
        toast({
          title: "Error",
          description: "Periode ajaran tidak ditemukan",
          variant: "destructive",
        })
        return
      }

      const periodeAjaranId = periodeData.data[0].id

      // Fetch student attendance data
      const response = await fetch(
        `/api/kehadiran?periode_ajaran_id=${periodeAjaranId}&kelas_id=${selectedKelas}`
      )

      if (response.ok) {
        const result = await response.json()
        setData(result.data)
        setIndicators(result.indicators)
      } else {
        toast({
          title: "Error",
          description: "Gagal mengambil data kehadiran",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching student data:", error)
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat mengambil data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleValueChange = (siswaId: number, indicatorId: number, field: 'sakit' | 'izin' | 'alpha', value: string) => {
    const numValue = value === "" ? 0 : Math.max(0, parseInt(value) || 0)

    setData(prev =>
      prev.map(student =>
        student.siswa_id === siswaId
          ? { ...student, [`indikator_${indicatorId}_${field}`]: numValue }
          : student
      )
    )
  }

  const handleSave = async () => {
    if (!selectedMasterTahunAjaran || !selectedSemester || !selectedTingkatan || !selectedKelas) {
      toast({
        title: "Error",
        description: "Pilih master tahun ajaran, semester, tingkatan, dan kelas terlebih dahulu",
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    try {
      // Find the Periode Ajaran ID
      const periodeResponse = await fetch(
        `/api/periode-ajaran?master_tahun_ajaran_id=${selectedMasterTahunAjaran}&semester=${selectedSemester}`
      )

      if (!periodeResponse.ok) {
        toast({
          title: "Error",
          description: "Gagal menemukan periode ajaran",
          variant: "destructive",
        })
        return
      }

      const periodeData = await periodeResponse.json()
      if (periodeData.data.length === 0) {
        toast({
          title: "Error",
          description: "Periode ajaran tidak ditemukan",
          variant: "destructive",
        })
        return
      }

      const periodeAjaranId = periodeData.data[0].id

      const attendanceData = data.map(student => ({
        siswa_id: student.siswa_id,
        ...indicators.reduce((acc, indicator) => ({
          ...acc,
          [`indikator_${indicator.id}_sakit`]: student[`indikator_${indicator.id}_sakit`] || 0,
          [`indikator_${indicator.id}_izin`]: student[`indikator_${indicator.id}_izin`] || 0,
          [`indikator_${indicator.id}_alpha`]: student[`indikator_${indicator.id}_alpha`] || 0,
          [`indikator_${indicator.id}_id`]: student[`indikator_${indicator.id}_id`] || null,
        }), {}),
      }))

      const response = await fetch("/api/kehadiran/batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          attendance: attendanceData,
          periode_ajaran_id: periodeAjaranId
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Berhasil",
          description: "Data kehadiran berhasil disimpan",
        })
        // Refresh data
        fetchStudentData()
      } else {
        toast({
          title: "Error",
          description: result.error || "Gagal menyimpan data kehadiran",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error saving attendance:", error)
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat menyimpan data",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Rekapitulasi Kehadiran Siswa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Hierarchical Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Master Tahun Ajaran</label>
              <Select value={selectedMasterTahunAjaran} onValueChange={setSelectedMasterTahunAjaran}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih tahun ajaran..." />
                </SelectTrigger>
                <SelectContent>
                  {masterTahunAjaranOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value.toString()}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Semester</label>
              <Select
                value={selectedSemester}
                onValueChange={setSelectedSemester}
                disabled={!selectedMasterTahunAjaran}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih semester..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SATU">Semester 1</SelectItem>
                  <SelectItem value="DUA">Semester 2</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tingkatan</label>
              <Select
                value={selectedTingkatan}
                onValueChange={setSelectedTingkatan}
                disabled={!selectedMasterTahunAjaran || !selectedSemester}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih tingkatan..." />
                </SelectTrigger>
                <SelectContent>
                  {tingkatanOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value.toString()}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Kelas</label>
              <Select
                value={selectedKelas}
                onValueChange={setSelectedKelas}
                disabled={!selectedTingkatan}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kelas..." />
                </SelectTrigger>
                <SelectContent>
                  {kelasOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value.toString()}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Save Button */}
          {data.length > 0 && (
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving}>
                <SaveIcon className="w-4 h-4 mr-2" />
                {saving ? "Menyimpan..." : "Simpan Semua"}
              </Button>
            </div>
          )}

          {/* Student Attendance Table */}
          {loading ? (
            <div className="text-center py-8">Memuat data...</div>
          ) : data.length > 0 ? (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[100px]">NIS</TableHead>
                    <TableHead className="min-w-[200px]">Nama Siswa</TableHead>
                    <TableHead className="min-w-[150px]">Kelas</TableHead>
                    {indicators.map((indicator) => (
                      <TableHead key={indicator.id} className="text-center min-w-[300px]" colSpan={3}>
                        {indicator.nama_indikator}
                      </TableHead>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableHead></TableHead>
                    <TableHead></TableHead>
                    <TableHead></TableHead>
                    {indicators.map((indicator) => (
                      <React.Fragment key={`header-${indicator.id}`}>
                        <TableHead className="text-center min-w-[100px]">Sakit</TableHead>
                        <TableHead className="text-center min-w-[100px]">Izin</TableHead>
                        <TableHead className="text-center min-w-[100px]">Alpha</TableHead>
                      </React.Fragment>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((student) => (
                    <TableRow key={student.siswa_id}>
                      <TableCell className="font-mono">{student.nis}</TableCell>
                      <TableCell className="font-medium">{student.nama}</TableCell>
                      <TableCell>{student.kelas}</TableCell>
                      {indicators.map((indicator) => (
                        <React.Fragment key={`inputs-${student.siswa_id}-${indicator.id}`}>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              value={student[`indikator_${indicator.id}_sakit`] || 0}
                              onChange={(e) => handleValueChange(student.siswa_id, indicator.id, 'sakit', e.target.value)}
                              className="w-full text-center"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              value={student[`indikator_${indicator.id}_izin`] || 0}
                              onChange={(e) => handleValueChange(student.siswa_id, indicator.id, 'izin', e.target.value)}
                              className="w-full text-center"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              value={student[`indikator_${indicator.id}_alpha`] || 0}
                              onChange={(e) => handleValueChange(student.siswa_id, indicator.id, 'alpha', e.target.value)}
                              className="w-full text-center"
                            />
                          </TableCell>
                        </React.Fragment>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : selectedMasterTahunAjaran && selectedSemester && selectedTingkatan && selectedKelas ? (
            <div className="text-center py-8 text-muted-foreground">
              Tidak ada data siswa untuk ditampilkan
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Pilih master tahun ajaran, semester, tingkatan, dan kelas untuk menampilkan data kehadiran
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
