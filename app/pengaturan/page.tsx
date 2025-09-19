"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileUpload, TemplateDownload } from "@/src/components/FileUpload"
import { DataTable, type Column } from "@/src/components/DataTable"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import { Settings, Upload, Download, Image } from "lucide-react"

interface Guru {
  id: number
  nama: string
  nip: string | null
  tanda_tangan: string | null
}

export default function PengaturanPage() {
  const [guruData, setGuruData] = useState<Guru[]>([])
  const [loading, setLoading] = useState(false)
  const [showSignatureModal, setShowSignatureModal] = useState(false)
  const [selectedGuru, setSelectedGuru] = useState<Guru | null>(null)

  const guruColumns: Column<Guru>[] = [
    {
      key: "nip",
      label: "NIP",
      className: "font-mono",
      render: (value) => value || "-",
    },
    {
      key: "nama",
      label: "Nama Guru",
      className: "font-medium",
    },
    {
      key: "tanda_tangan",
      label: "Tanda Tangan",
      render: (value) => (
        <Badge variant={value ? "default" : "secondary"}>{value ? "Sudah Upload" : "Belum Upload"}</Badge>
      ),
    },
  ]

  const fetchGuruData = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/guru?per_page=100")
      if (response.ok) {
        const result = await response.json()
        setGuruData(result.data)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal mengambil data guru",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGuruData()
  }, [])

  const handleSignatureUpload = (guru: Guru) => {
    setSelectedGuru(guru)
    setShowSignatureModal(true)
  }

  const handleSignatureUploadSuccess = () => {
    fetchGuruData()
    setShowSignatureModal(false)
  }

  const excelTemplates = [
    {
      name: "template_siswa.csv",
      description: "Template untuk import data siswa",
      downloadUrl: "/api/export/excel/siswa",
    },
    {
      name: "template_nilai_ujian.csv",
      description: "Template untuk import nilai ujian",
      downloadUrl: "/api/export/excel/nilai-ujian",
    },
    {
      name: "template_nilai_hafalan.csv",
      description: "Template untuk import nilai hafalan",
      downloadUrl: "/api/export/excel/nilai-hafalan",
    },
  ]

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="h-8 w-8" />
            Pengaturan Sistem
          </h1>
          <p className="text-muted-foreground">Kelola pengaturan dan konfigurasi sistem E-RAPOT</p>
        </div>

        {/* Content */}
        <Tabs defaultValue="signatures" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="signatures" className="flex items-center gap-2">
              <Image className="h-4 w-4" />
              Tanda Tangan
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Template Excel
            </TabsTrigger>
            <TabsTrigger value="imports" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Import Data
            </TabsTrigger>
          </TabsList>

          {/* Tanda Tangan Tab */}
          <TabsContent value="signatures">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Manajemen Tanda Tangan Guru</CardTitle>
                  <CardDescription>Upload dan kelola tanda tangan digital guru untuk keperluan rapot</CardDescription>
                </CardHeader>
              </Card>

              <DataTable
                title="Daftar Guru dan Status Tanda Tangan"
                columns={guruColumns}
                data={guruData}
                loading={loading}
                onEdit={handleSignatureUpload}
                searchPlaceholder="Cari nama atau NIP guru..."
                emptyMessage="Belum ada data guru"
                actions={true}
              />
            </div>
          </TabsContent>

          {/* Template Excel Tab */}
          <TabsContent value="templates">
            <div className="space-y-6">
              <TemplateDownload
                title="Download Template Excel"
                description="Download template Excel untuk import data ke sistem"
                templates={excelTemplates}
              />

              <Card>
                <CardHeader>
                  <CardTitle>Panduan Penggunaan Template</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">Template Siswa:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                      <li>• NIS harus unik dan tidak boleh kosong</li>
                      <li>• Jenis kelamin: LAKI_LAKI atau PEREMPUAN</li>
                      <li>• Format tanggal: YYYY-MM-DD (contoh: 2010-01-15)</li>
                      <li>• Status: Aktif, Lulus, Keluar, atau Pindah</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Template Nilai Ujian:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                      <li>• Nilai harus berupa angka antara 0-100</li>
                      <li>• Predikat: A (90-100), B (80-89), C (70-79), D (60-69), E (0-59)</li>
                      <li>• NIS siswa harus sudah terdaftar di sistem</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Template Nilai Hafalan:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                      <li>• Status: TERCAPAI atau TIDAK_TERCAPAI</li>
                      <li>• Target hafalan boleh kosong</li>
                      <li>• NIS siswa harus sudah terdaftar di sistem</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Import Data Tab */}
          <TabsContent value="imports">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <FileUpload
                title="Import Data Siswa"
                description="Upload file Excel untuk import data siswa secara massal"
                acceptedTypes={[
                  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                  "application/vnd.ms-excel",
                  "text/csv",
                ]}
                maxSize={10}
                uploadUrl="/api/upload/excel"
                additionalData={{ type: "siswa" }}
                onUploadSuccess={(data) => {
                  toast({
                    title: "Berhasil",
                    description: "Data siswa berhasil diimport",
                  })
                }}
              />

              <FileUpload
                title="Import Nilai Ujian"
                description="Upload file Excel untuk import nilai ujian secara massal"
                acceptedTypes={[
                  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                  "application/vnd.ms-excel",
                  "text/csv",
                ]}
                maxSize={10}
                uploadUrl="/api/upload/excel"
                additionalData={{ type: "nilai-ujian" }}
                onUploadSuccess={(data) => {
                  toast({
                    title: "Berhasil",
                    description: "Nilai ujian berhasil diimport",
                  })
                }}
              />

              <FileUpload
                title="Import Nilai Hafalan"
                description="Upload file Excel untuk import nilai hafalan secara massal"
                acceptedTypes={[
                  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                  "application/vnd.ms-excel",
                  "text/csv",
                ]}
                maxSize={10}
                uploadUrl="/api/upload/excel"
                additionalData={{ type: "nilai-hafalan" }}
                onUploadSuccess={(data) => {
                  toast({
                    title: "Berhasil",
                    description: "Nilai hafalan berhasil diimport",
                  })
                }}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Signature Upload Modal */}
      {selectedGuru && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-background rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Upload Tanda Tangan</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Upload tanda tangan untuk: <strong>{selectedGuru.nama}</strong>
            </p>
            <FileUpload
              title="Tanda Tangan Digital"
              description="Upload gambar tanda tangan dalam format JPG, JPEG, atau PNG"
              acceptedTypes={["image/jpeg", "image/jpg", "image/png"]}
              maxSize={2}
              uploadUrl="/api/upload/signature"
              additionalData={{ guru_id: selectedGuru.id }}
              onUploadSuccess={handleSignatureUploadSuccess}
              className="border-0 shadow-none"
            />
            <div className="flex justify-end mt-4">
              <Button variant="outline" onClick={() => setShowSignatureModal(false)}>
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
