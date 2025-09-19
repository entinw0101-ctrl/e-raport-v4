"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SelectFilter } from "@/src/components/SelectFilter"
import { FileText, Download, Printer } from "lucide-react"

interface RapotData {
  siswa: any
  nilaiUjian: any[]
  nilaiHafalan: any[]
  kehadiran: {
    hadir: number
    sakit: number
    izin: number
    alpa: number
  }
  penilaianSikap: any[]
  semester: number
  periodeAjaran: string
}

export default function RapotPage() {
  const [selectedSiswa, setSelectedSiswa] = useState("")
  const [selectedPeriode, setSelectedPeriode] = useState("")
  const [selectedSemester, setSelectedSemester] = useState("1")
  const [rapotData, setRapotData] = useState<RapotData | null>(null)
  const [loading, setLoading] = useState(false)

  const generateRapot = async () => {
    if (!selectedSiswa || !selectedPeriode) {
      alert("Pilih siswa dan periode ajaran terlebih dahulu")
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/rapot/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          siswaId: selectedSiswa,
          periodeAjaranId: selectedPeriode,
          semester: Number.parseInt(selectedSemester),
        }),
      })

      const data = await response.json()
      if (response.ok) {
        setRapotData(data.rapot)
      } else {
        alert(data.error || "Gagal generate rapot")
      }
    } catch (error) {
      console.error("Error generating rapot:", error)
      alert("Terjadi kesalahan saat generate rapot")
    } finally {
      setLoading(false)
    }
  }

  const printRapot = () => {
    window.print()
  }

  const downloadRapot = () => {
    // Implementation for PDF download would go here
    alert("Fitur download PDF akan segera tersedia")
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Laporan Rapot</h1>
          <p className="text-gray-600 mt-1">Generate dan cetak rapot siswa</p>
        </div>
      </div>

      {/* Filter Section */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Rapot</CardTitle>
          <CardDescription>Pilih siswa dan periode untuk generate rapot</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <SelectFilter
              label="Siswa"
              value={selectedSiswa}
              onChange={setSelectedSiswa}
              endpoint="/api/siswa"
              placeholder="Pilih Siswa"
            />

            <SelectFilter
              label="Periode Ajaran"
              value={selectedPeriode}
              onChange={setSelectedPeriode}
              endpoint="/api/periode-ajaran"
              placeholder="Pilih Periode"
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="1">Semester 1</option>
                <option value="2">Semester 2</option>
              </select>
            </div>

            <div className="flex items-end">
              <Button onClick={generateRapot} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700">
                <FileText className="w-4 h-4 mr-2" />
                {loading ? "Generating..." : "Generate Rapot"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rapot Display */}
      {rapotData && (
        <div className="print:shadow-none">
          <div className="flex justify-end gap-2 mb-4 print:hidden">
            <Button onClick={printRapot} variant="outline">
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
            <Button onClick={downloadRapot} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
          </div>

          <Card className="print:shadow-none print:border-none">
            <CardContent className="p-8">
              {/* Header */}
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold">RAPOT SISWA</h1>
                <h2 className="text-xl font-semibold">NUURUSH SHOLAAH</h2>
                <p className="text-gray-600">Semester {rapotData.semester}</p>
              </div>

              {/* Student Info */}
              <div className="grid grid-cols-2 gap-8 mb-8">
                <div>
                  <h3 className="font-semibold mb-4">Data Siswa</h3>
                  <div className="space-y-2">
                    <div className="flex">
                      <span className="w-32">Nama</span>
                      <span>: {rapotData.siswa.nama}</span>
                    </div>
                    <div className="flex">
                      <span className="w-32">NIS</span>
                      <span>: {rapotData.siswa.nis}</span>
                    </div>
                    <div className="flex">
                      <span className="w-32">Kelas</span>
                      <span>: {rapotData.siswa.kelas?.nama}</span>
                    </div>
                    <div className="flex">
                      <span className="w-32">Tingkatan</span>
                      <span>: {rapotData.siswa.kelas?.tingkatan?.nama}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-4">Kehadiran</h3>
                  <div className="space-y-2">
                    <div className="flex">
                      <span className="w-32">Hadir</span>
                      <span>: {rapotData.kehadiran.hadir} hari</span>
                    </div>
                    <div className="flex">
                      <span className="w-32">Sakit</span>
                      <span>: {rapotData.kehadiran.sakit} hari</span>
                    </div>
                    <div className="flex">
                      <span className="w-32">Izin</span>
                      <span>: {rapotData.kehadiran.izin} hari</span>
                    </div>
                    <div className="flex">
                      <span className="w-32">Alpa</span>
                      <span>: {rapotData.kehadiran.alpa} hari</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Nilai Ujian */}
              <div className="mb-8">
                <h3 className="font-semibold mb-4">Nilai Ujian</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-300 px-4 py-2 text-left">Mata Pelajaran</th>
                        <th className="border border-gray-300 px-4 py-2 text-center">UH1</th>
                        <th className="border border-gray-300 px-4 py-2 text-center">UH2</th>
                        <th className="border border-gray-300 px-4 py-2 text-center">UTS</th>
                        <th className="border border-gray-300 px-4 py-2 text-center">UAS</th>
                        <th className="border border-gray-300 px-4 py-2 text-center">Grade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rapotData.nilaiUjian.map((nilai) => (
                        <tr key={nilai.id}>
                          <td className="border border-gray-300 px-4 py-2">{nilai.mata_pelajaran.nama}</td>
                          <td className="border border-gray-300 px-4 py-2 text-center">{nilai.uh1 || "-"}</td>
                          <td className="border border-gray-300 px-4 py-2 text-center">{nilai.uh2 || "-"}</td>
                          <td className="border border-gray-300 px-4 py-2 text-center">{nilai.uts || "-"}</td>
                          <td className="border border-gray-300 px-4 py-2 text-center">{nilai.uas || "-"}</td>
                          <td className="border border-gray-300 px-4 py-2 text-center">
                            <Badge variant="secondary">{nilai.grade}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Nilai Hafalan */}
              <div className="mb-8">
                <h3 className="font-semibold mb-4">Nilai Hafalan</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-300 px-4 py-2 text-left">Mata Pelajaran</th>
                        <th className="border border-gray-300 px-4 py-2 text-center">Nilai</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">Keterangan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rapotData.nilaiHafalan.map((nilai) => (
                        <tr key={nilai.id}>
                          <td className="border border-gray-300 px-4 py-2">{nilai.mata_pelajaran.nama}</td>
                          <td className="border border-gray-300 px-4 py-2 text-center">{nilai.nilai}</td>
                          <td className="border border-gray-300 px-4 py-2">{nilai.keterangan || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-12 grid grid-cols-3 gap-8 text-center">
                <div>
                  <p className="mb-16">Wali Kelas</p>
                  <p className="border-t border-gray-400 pt-2">(...........................)</p>
                </div>
                <div>
                  <p className="mb-16">Kepala Sekolah</p>
                  <p className="border-t border-gray-400 pt-2">(...........................)</p>
                </div>
                <div>
                  <p className="mb-16">Orang Tua/Wali</p>
                  <p className="border-t border-gray-400 pt-2">(...........................)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
