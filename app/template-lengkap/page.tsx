"use client"

import type React from "react"

// Force dynamic rendering to avoid build-time data fetching issues
export const dynamic = 'force-dynamic'

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/src/components/PageHeader"
import { useToast } from "@/hooks/use-toast"
import { FileDown, Upload, CheckCircle, AlertCircle, Info, ChevronDown, ChevronUp } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface ValidationResult {
  sheet: string
  status: 'success' | 'warning' | 'error'
  message: string
  details?: string[]
  data?: any[]
}

interface ImportResult {
  nilaiUjian: { inserted: number, updated: number, errors: number }
  nilaiHafalan: { inserted: number, updated: number, errors: number }
  kehadiran: { inserted: number, updated: number, errors: number }
  penilaianSikap: { inserted: number, updated: number, errors: number }
  catatanSiswa: { inserted: number, updated: number, errors: number }
}

export default function TemplateLengkapPage() {
  const [kelasOptions, setKelasOptions] = useState<any[]>([])
  const [periodeOptions, setPeriodeOptions] = useState<any[]>([])

  // Form states
  const [selectedKelas, setSelectedKelas] = useState<string>("")
  const [selectedPeriode, setSelectedPeriode] = useState<string>("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  // Process states
  const [isDownloading, setIsDownloading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([])
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [showValidation, setShowValidation] = useState(false)
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set())

  const { toast } = useToast()

  useEffect(() => {
    fetchKelasOptions()
    fetchPeriodeOptions()
  }, [])

  const fetchKelasOptions = async () => {
    try {
      const response = await fetch("/api/kelas?per_page=1000")
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

  const handleDownloadTemplate = async () => {
    if (!selectedKelas || !selectedPeriode) {
      toast({
        title: "Pilih Lengkap",
        description: "Silakan pilih kelas dan periode ajaran terlebih dahulu",
        variant: "destructive",
      })
      return
    }

    setIsDownloading(true)

    try {
      const response = await fetch(`/api/export/excel/combined-template/${selectedKelas}?periode_ajaran_id=${selectedPeriode}`)
      if (!response.ok) {
        throw new Error("Failed to download template")
      }
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `template_lengkap_${new Date().toISOString().split("T")[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: "Berhasil",
        description: "Template lengkap berhasil diunduh",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal mengunduh template lengkap",
        variant: "destructive",
      })
    } finally {
      setIsDownloading(false)
    }
  }

  const handleUploadTemplate = async () => {
    if (!selectedFile || !selectedKelas || !selectedPeriode) {
      toast({
        title: "Pilih Lengkap",
        description: "Silakan pilih file, kelas, dan periode ajaran terlebih dahulu",
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)
    setValidationResults([])
    setImportResult(null)
    setShowValidation(false)

    try {
      const formData = new FormData()
      formData.append("file", selectedFile)
      formData.append("kelas_id", selectedKelas)
      formData.append("periode_ajaran_id", selectedPeriode)

      const response = await fetch("/api/upload/excel/combined-template", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (result.validation) {
        setValidationResults(result.validation)
        setShowValidation(true)

        if (result.imported && result.importResult) {
          setImportResult(result.importResult)
          toast({
            title: "Berhasil",
            description: "Data berhasil diimport ke database",
          })
        } else if (result.canProceed) {
          toast({
            title: "Validasi Berhasil",
            description: "Data dapat diimport. Klik 'Import ke Database' untuk melanjutkan.",
          })
        } else {
          toast({
            title: "Validasi Gagal",
            description: "Perbaiki error dalam file Excel terlebih dahulu",
            variant: "destructive",
          })
        }
      } else {
        throw new Error(result.error || "Upload gagal")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal mengupload template",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleImportToDatabase = async () => {
    if (!selectedFile || !selectedKelas || !selectedPeriode) return

    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append("file", selectedFile)
      formData.append("kelas_id", selectedKelas)
      formData.append("periode_ajaran_id", selectedPeriode)
      formData.append("import", "true")

      const response = await fetch("/api/upload/excel/combined-template", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (result.imported && result.importResult) {
        setImportResult(result.importResult)
        toast({
          title: "Berhasil",
          description: "Data berhasil diimport ke database",
        })
      } else {
        throw new Error(result.error || "Import gagal")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal mengimport data ke database",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'warning': return <AlertCircle className="h-4 w-4 text-yellow-500" />
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />
      default: return <Info className="h-4 w-4 text-blue-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-700 bg-green-50 border-green-200'
      case 'warning': return 'text-yellow-700 bg-yellow-50 border-yellow-200'
      case 'error': return 'text-red-700 bg-red-50 border-red-200'
      default: return 'text-blue-700 bg-blue-50 border-blue-200'
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Template Lengkap"
        description="Download dan upload template Excel gabungan untuk semua data siswa"
      />

      {/* Selection Section */}
      <Card>
        <CardHeader>
          <CardTitle>Pilih Kelas & Periode</CardTitle>
          <CardDescription>
            Pilih kelas dan periode ajaran untuk template yang akan di-download atau di-upload
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Kelas</label>
              <Select value={selectedKelas} onValueChange={setSelectedKelas}>
                <SelectTrigger>
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

            <div className="space-y-2">
              <label className="text-sm font-medium">Periode Ajaran</label>
              <Select value={selectedPeriode} onValueChange={setSelectedPeriode}>
                <SelectTrigger>
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
          </div>
        </CardContent>
      </Card>

      {/* Download Section */}
      <Card>
        <CardHeader>
          <CardTitle>Download Template</CardTitle>
          <CardDescription>
            Download template Excel gabungan dengan 5 sheet untuk semua data siswa
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleDownloadTemplate}
            disabled={!selectedKelas || !selectedPeriode || isDownloading}
            className="w-full md:w-auto"
          >
            <FileDown className="w-4 h-4 mr-2" />
            {isDownloading ? "Downloading..." : "Download Template Lengkap"}
          </Button>
        </CardContent>
      </Card>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Template</CardTitle>
          <CardDescription>
            Upload file Excel yang telah diisi untuk validasi dan import data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">File Excel</label>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="w-full p-2 border rounded-md"
              disabled={isUploading}
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleUploadTemplate}
              disabled={!selectedFile || !selectedKelas || !selectedPeriode || isUploading}
              variant="outline"
            >
              <Upload className="w-4 h-4 mr-2" />
              {isUploading ? "Processing..." : "Validasi Data"}
            </Button>

            {validationResults.length > 0 && !importResult && (
              <Button
                onClick={handleImportToDatabase}
                disabled={isUploading || !validationResults.some(r => r.status !== 'error')}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Import ke Database
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Validation Results */}
      {showValidation && validationResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Hasil Validasi</CardTitle>
            <CardDescription>
              Detail validasi untuk setiap sheet dalam file Excel
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {validationResults.map((result, index) => {
              const isExpanded = expandedItems.has(index)
              return (
                <div key={index} className="border rounded-lg">
                  <button
                    onClick={() => {
                      const newExpanded = new Set(expandedItems)
                      if (isExpanded) {
                        newExpanded.delete(index)
                      } else {
                        newExpanded.add(index)
                      }
                      setExpandedItems(newExpanded)
                    }}
                    className={`w-full p-4 text-left ${getStatusColor(result.status)} hover:opacity-80 flex items-center justify-between`}
                  >
                    <div className="flex items-center gap-2">
                      {getStatusIcon(result.status)}
                      <div>
                        <strong>{result.sheet}</strong>: {result.message}
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>

                  {isExpanded && (
                    <div className="p-4 border-t bg-gray-50">
                      {result.details && result.details.length > 0 && (
                        <div className="mb-4">
                          <p className="text-sm font-medium mb-2">Detail Error:</p>
                          <div className="space-y-1">
                            {result.details.map((detail, idx) => (
                              <p key={idx} className="text-sm text-red-600">• {detail}</p>
                            ))}
                          </div>
                        </div>
                      )}
                      {result.data && result.data.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2">Data yang dibaca ({result.data.length} records):</p>
                          <div className="max-h-40 overflow-y-auto bg-white p-2 rounded text-xs border">
                            <pre>{JSON.stringify(result.data.slice(0, 3), null, 2)}</pre>
                            {result.data.length > 3 && (
                              <p className="text-muted-foreground mt-1">... dan {result.data.length - 3} records lainnya</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Import Results */}
      {importResult && (
        <Card>
          <CardHeader>
            <CardTitle>Hasil Import</CardTitle>
            <CardDescription>
              Ringkasan data yang berhasil diimport ke database
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(importResult).map(([table, stats]: [string, any]) => (
                <div key={table} className="p-4 border rounded-lg">
                  <h4 className="font-medium capitalize mb-2">
                    {table.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  </h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-green-600">Inserted:</span>
                      <span>{stats.inserted}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-600">Updated:</span>
                      <span>{stats.updated}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-red-600">Errors:</span>
                      <span>{stats.errors}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}