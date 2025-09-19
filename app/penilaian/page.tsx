"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CascadingSelect } from "@/src/components/SelectFilter"
import { DataTable, type Column } from "@/src/components/DataTable"
import { FormModal, type FormField } from "@/src/components/FormModal"
import { ConfirmDialog } from "@/src/components/ConfirmDialog"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"
import { BookOpen, Calculator } from "lucide-react"

interface NilaiUjian {
  id: number
  siswa_id: number
  mapel_id: number
  periode_ajaran_id: number
  nilai_angka: number
  predikat: string | null
  siswa: {
    nama: string
    nis: string
    kelas?: {
      nama_kelas: string
      tingkatan?: {
        nama_tingkatan: string
      }
    }
  }
  mata_pelajaran: {
    nama_mapel: string
  }
  periode_ajaran: {
    nama_ajaran: string
  }
}

interface NilaiHafalan {
  id: number
  siswa_id: number
  mapel_id: number
  periode_ajaran_id: number
  target_hafalan: string | null
  predikat: "TERCAPAI" | "TIDAK_TERCAPAI"
  siswa: {
    nama: string
    nis: string
    kelas?: {
      nama_kelas: string
      tingkatan?: {
        nama_tingkatan: string
      }
    }
  }
  mata_pelajaran: {
    nama_mapel: string
  }
  periode_ajaran: {
    nama_ajaran: string
  }
}

export default function PenilaianPage() {
  // Filter states
  const [selectedTahunAjaran, setSelectedTahunAjaran] = useState<number>()
  const [selectedSemester, setSelectedSemester] = useState<number>()
  const [selectedTingkatan, setSelectedTingkatan] = useState<number>()
  const [selectedKelas, setSelectedKelas] = useState<number>()

  // Data states
  const [nilaiUjianData, setNilaiUjianData] = useState<NilaiUjian[]>([])
  const [nilaiHafalanData, setNilaiHafalanData] = useState<NilaiHafalan[]>([])
  const [loading, setLoading] = useState(false)

  // Modal states
  const [showUjianModal, setShowUjianModal] = useState(false)
  const [showHafalanModal, setShowHafalanModal] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedNilai, setSelectedNilai] = useState<any>(null)
  const [formLoading, setFormLoading] = useState(false)
  const [deleteType, setDeleteType] = useState<"ujian" | "hafalan">("ujian")

  // Options for forms
  const [siswaOptions, setSiswaOptions] = useState<{ value: number; label: string }[]>([])
  const [mapelUjianOptions, setMapelUjianOptions] = useState<{ value: number; label: string }[]>([])
  const [mapelHafalanOptions, setMapelHafalanOptions] = useState<{ value: number; label: string }[]>([])

  const ujianColumns: Column<NilaiUjian>[] = [
    {
      key: "siswa.nis",
      label: "NIS",
      className: "font-mono",
    },
    {
      key: "siswa.nama",
      label: "Nama Siswa",
      className: "font-medium",
    },
    {
      key: "mata_pelajaran.nama_mapel",
      label: "Mata Pelajaran",
    },
    {
      key: "nilai_angka",
      label: "Nilai",
      render: (value) => (
        <div className="text-center">
          <div className="font-bold text-lg">{value}</div>
        </div>
      ),
    },
    {
      key: "predikat",
      label: "Predikat",
      render: (value) => {
        const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
          A: "default",
          B: "secondary",
          C: "outline",
          D: "destructive",
          E: "destructive",
        }
        return <Badge variant={variants[value] || "outline"}>{value}</Badge>
      },
    },
  ]

  const hafalanColumns: Column<NilaiHafalan>[] = [
    {
      key: "siswa.nis",
      label: "NIS",
      className: "font-mono",
    },
    {
      key: "siswa.nama",
      label: "Nama Siswa",
      className: "font-medium",
    },
    {
      key: "mata_pelajaran.nama_mapel",
      label: "Mata Pelajaran",
    },
    {
      key: "target_hafalan",
      label: "Target Hafalan",
      render: (value) => value || "-",
    },
    {
      key: "predikat",
      label: "Status",
      render: (value) => (
        <Badge variant={value === "TERCAPAI" ? "default" : "destructive"}>
          {value === "TERCAPAI" ? "Tercapai" : "Tidak Tercapai"}
        </Badge>
      ),
    },
  ]

  const ujianFormFields: FormField[] = [
    {
      name: "siswa_id",
      label: "Siswa",
      type: "select",
      required: true,
      options: siswaOptions,
    },
    {
      name: "mapel_id",
      label: "Mata Pelajaran",
      type: "select",
      required: true,
      options: mapelUjianOptions,
    },
    {
      name: "nilai_angka",
      label: "Nilai (0-100)",
      type: "number",
      required: true,
      min: 0,
      max: 100,
      placeholder: "Masukkan nilai ujian",
    },
    {
      name: "predikat",
      label: "Predikat",
      type: "select",
      options: [
        { value: "A", label: "A (90-100)" },
        { value: "B", label: "B (80-89)" },
        { value: "C", label: "C (70-79)" },
        { value: "D", label: "D (60-69)" },
        { value: "E", label: "E (0-59)" },
      ],
    },
  ]

  const hafalanFormFields: FormField[] = [
    {
      name: "siswa_id",
      label: "Siswa",
      type: "select",
      required: true,
      options: siswaOptions,
    },
    {
      name: "mapel_id",
      label: "Mata Pelajaran",
      type: "select",
      required: true,
      options: mapelHafalanOptions,
    },
    {
      name: "target_hafalan",
      label: "Target Hafalan",
      type: "textarea",
      placeholder: "Contoh: Juz 30 (An-Nas sampai Al-Fatiha)",
      rows: 2,
    },
    {
      name: "predikat",
      label: "Status Hafalan",
      type: "select",
      required: true,
      options: [
        { value: "TERCAPAI", label: "Tercapai" },
        { value: "TIDAK_TERCAPAI", label: "Tidak Tercapai" },
      ],
    },
  ]

  const fetchNilaiData = async () => {
    if (!selectedSemester) return

    setLoading(true)
    try {
      // Fetch nilai ujian
      const ujianParams = new URLSearchParams({
        periode_ajaran_id: selectedSemester.toString(),
        ...(selectedKelas && { kelas_id: selectedKelas.toString() }),
        per_page: "100",
      })

      const ujianResponse = await fetch(`/api/nilai-ujian?${ujianParams}`)
      if (ujianResponse.ok) {
        const ujianResult = await ujianResponse.json()
        setNilaiUjianData(ujianResult.data)
      }

      // Fetch nilai hafalan
      const hafalanParams = new URLSearchParams({
        periode_ajaran_id: selectedSemester.toString(),
        ...(selectedKelas && { kelas_id: selectedKelas.toString() }),
        per_page: "100",
      })

      const hafalanResponse = await fetch(`/api/nilai-hafalan?${hafalanParams}`)
      if (hafalanResponse.ok) {
        const hafalanResult = await hafalanResponse.json()
        setNilaiHafalanData(hafalanResult.data)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat mengambil data nilai",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchOptions = async () => {
    try {
      // Fetch siswa options
      if (selectedKelas) {
        const siswaResponse = await fetch(`/api/siswa?kelas_id=${selectedKelas}&per_page=100`)
        if (siswaResponse.ok) {
          const siswaResult = await siswaResponse.json()
          setSiswaOptions(
            siswaResult.data.map((siswa: any) => ({
              value: siswa.id,
              label: `${siswa.nis} - ${siswa.nama}`,
            })),
          )
        }
      }

      // Fetch mata pelajaran options
      const mapelUjianResponse = await fetch("/api/mata-pelajaran?jenis=Ujian")
      if (mapelUjianResponse.ok) {
        const mapelUjianResult = await mapelUjianResponse.json()
        setMapelUjianOptions(
          mapelUjianResult.data.map((mapel: any) => ({
            value: mapel.id,
            label: mapel.nama_mapel,
          })),
        )
      }

      const mapelHafalanResponse = await fetch("/api/mata-pelajaran?jenis=Hafalan")
      if (mapelHafalanResponse.ok) {
        const mapelHafalanResult = await mapelHafalanResponse.json()
        setMapelHafalanOptions(
          mapelHafalanResult.data.map((mapel: any) => ({
            value: mapel.id,
            label: mapel.nama_mapel,
          })),
        )
      }
    } catch (error) {
      console.error("Error fetching options:", error)
    }
  }

  useEffect(() => {
    fetchNilaiData()
  }, [selectedSemester, selectedKelas])

  useEffect(() => {
    fetchOptions()
  }, [selectedKelas])

  const handleUjianSubmit = async (formData: Record<string, any>) => {
    if (!selectedSemester) return

    setFormLoading(true)
    try {
      const data = {
        ...formData,
        periode_ajaran_id: selectedSemester,
      }

      const url = selectedNilai ? `/api/nilai-ujian/${selectedNilai.id}` : "/api/nilai-ujian"
      const method = selectedNilai ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Berhasil",
          description: result.message,
        })
        fetchNilaiData()
        setShowUjianModal(false)
      } else {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat menyimpan data",
        variant: "destructive",
      })
    } finally {
      setFormLoading(false)
    }
  }

  const handleHafalanSubmit = async (formData: Record<string, any>) => {
    if (!selectedSemester) return

    setFormLoading(true)
    try {
      const data = {
        ...formData,
        periode_ajaran_id: selectedSemester,
      }

      const url = selectedNilai ? `/api/nilai-hafalan/${selectedNilai.id}` : "/api/nilai-hafalan"
      const method = selectedNilai ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Berhasil",
          description: result.message,
        })
        fetchNilaiData()
        setShowHafalanModal(false)
      } else {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat menyimpan data",
        variant: "destructive",
      })
    } finally {
      setFormLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedNilai) return

    try {
      const url =
        deleteType === "ujian" ? `/api/nilai-ujian/${selectedNilai.id}` : `/api/nilai-hafalan/${selectedNilai.id}`

      const response = await fetch(url, { method: "DELETE" })
      const result = await response.json()

      if (result.success) {
        toast({
          title: "Berhasil",
          description: result.message,
        })
        fetchNilaiData()
      } else {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat menghapus data",
        variant: "destructive",
      })
    }
  }

  const canAddNilai = selectedSemester && selectedKelas && siswaOptions.length > 0

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Sistem Penilaian</h1>
          <p className="text-muted-foreground">Kelola nilai ujian dan hafalan siswa</p>
        </div>

        {/* Filter Section */}
        <Card>
          <CardHeader>
            <CardTitle>Filter Penilaian</CardTitle>
            <CardDescription>
              Pilih tahun ajaran, semester, tingkatan, dan kelas untuk melihat data nilai
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CascadingSelect
              onTahunAjaranChange={setSelectedTahunAjaran}
              onSemesterChange={setSelectedSemester}
              onTingkatanChange={setSelectedTingkatan}
              onKelasChange={setSelectedKelas}
              selectedTahunAjaran={selectedTahunAjaran}
              selectedSemester={selectedSemester}
              selectedTingkatan={selectedTingkatan}
              selectedKelas={selectedKelas}
            />
          </CardContent>
        </Card>

        {/* Content */}
        {selectedSemester ? (
          <Tabs defaultValue="ujian" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="ujian" className="flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                Nilai Ujian
              </TabsTrigger>
              <TabsTrigger value="hafalan" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Nilai Hafalan
              </TabsTrigger>
            </TabsList>

            <TabsContent value="ujian">
              <DataTable
                title="Nilai Ujian"
                columns={ujianColumns}
                data={nilaiUjianData}
                loading={loading}
                onAdd={
                  canAddNilai
                    ? () => {
                        setSelectedNilai(null)
                        setShowUjianModal(true)
                      }
                    : undefined
                }
                onEdit={(nilai) => {
                  setSelectedNilai(nilai)
                  setShowUjianModal(true)
                }}
                onDelete={(nilai) => {
                  setSelectedNilai(nilai)
                  setDeleteType("ujian")
                  setShowDeleteDialog(true)
                }}
                addButtonText="Tambah Nilai Ujian"
                emptyMessage="Belum ada data nilai ujian"
                actions={true}
              />
            </TabsContent>

            <TabsContent value="hafalan">
              <DataTable
                title="Nilai Hafalan"
                columns={hafalanColumns}
                data={nilaiHafalanData}
                loading={loading}
                onAdd={
                  canAddNilai
                    ? () => {
                        setSelectedNilai(null)
                        setShowHafalanModal(true)
                      }
                    : undefined
                }
                onEdit={(nilai) => {
                  setSelectedNilai(nilai)
                  setShowHafalanModal(true)
                }}
                onDelete={(nilai) => {
                  setSelectedNilai(nilai)
                  setDeleteType("hafalan")
                  setShowDeleteDialog(true)
                }}
                addButtonText="Tambah Nilai Hafalan"
                emptyMessage="Belum ada data nilai hafalan"
                actions={true}
              />
            </TabsContent>
          </Tabs>
        ) : (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="text-muted-foreground mb-2">
                  Silakan pilih tahun ajaran dan semester terlebih dahulu
                </div>
                <p className="text-sm text-muted-foreground">untuk melihat dan mengelola data nilai siswa</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modals */}
      <FormModal
        title={selectedNilai ? "Edit Nilai Ujian" : "Tambah Nilai Ujian"}
        fields={ujianFormFields}
        initialData={selectedNilai || {}}
        open={showUjianModal}
        onClose={() => setShowUjianModal(false)}
        onSubmit={handleUjianSubmit}
        loading={formLoading}
      />

      <FormModal
        title={selectedNilai ? "Edit Nilai Hafalan" : "Tambah Nilai Hafalan"}
        fields={hafalanFormFields}
        initialData={selectedNilai || {}}
        open={showHafalanModal}
        onClose={() => setShowHafalanModal(false)}
        onSubmit={handleHafalanSubmit}
        loading={formLoading}
      />

      <ConfirmDialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        title={`Hapus Nilai ${deleteType === "ujian" ? "Ujian" : "Hafalan"}`}
        description={`Apakah Anda yakin ingin menghapus nilai ${deleteType === "ujian" ? "ujian" : "hafalan"} untuk siswa "${selectedNilai?.siswa?.nama}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Hapus"
        variant="destructive"
      />
    </div>
  )
}
