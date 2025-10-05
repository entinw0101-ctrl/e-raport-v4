"use client"

import { useState, useEffect } from "react"
import { FormModal, type FormField } from "@/src/components/FormModal"
import { ConfirmDialog } from "@/src/components/ConfirmDialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Upload, Trash2, FileImage, Save } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface PenanggungJawabRapot {
  id: number
  jabatan: string
  nama_pejabat: string
  nip: string | null
  tanda_tangan: string | null
  jenis_kelamin_target: "LAKI_LAKI" | "PEREMPUAN" | "Semua"
  status: "aktif" | "nonaktif"
  dibuat_pada: string
  diperbarui_pada: string
}

export default function PenanggungJawabRapotPage() {
  const [lakiData, setLakiData] = useState<PenanggungJawabRapot | null>(null)
  const [perempuanData, setPerempuanData] = useState<PenanggungJawabRapot | null>(null)
  const [loading, setLoading] = useState(false)

  // Form states
  const [lakiForm, setLakiForm] = useState({
    jabatan: "",
    nama_pejabat: "",
    nip: "",
    status: "aktif" as "aktif" | "nonaktif",
  })
  const [perempuanForm, setPerempuanForm] = useState({
    jabatan: "",
    nama_pejabat: "",
    nip: "",
    status: "aktif" as "aktif" | "nonaktif",
  })

  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedToDelete, setSelectedToDelete] = useState<PenanggungJawabRapot | null>(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/penanggung-jawab-rapot")
      const result = await response.json()

      if (result.success) {
        const laki = result.data.find((item: PenanggungJawabRapot) => item.jenis_kelamin_target === "LAKI_LAKI")
        const perempuan = result.data.find((item: PenanggungJawabRapot) => item.jenis_kelamin_target === "PEREMPUAN")

        setLakiData(laki || null)
        setPerempuanData(perempuan || null)

        if (laki) {
          setLakiForm({
            jabatan: laki.jabatan,
            nama_pejabat: laki.nama_pejabat,
            nip: laki.nip || "",
            status: laki.status,
          })
        }

        if (perempuan) {
          setPerempuanForm({
            jabatan: perempuan.jabatan,
            nama_pejabat: perempuan.nama_pejabat,
            nip: perempuan.nip || "",
            status: perempuan.status,
          })
        }
      } else {
        toast({
          title: "Error",
          description: result.error || "Gagal mengambil data penanggung jawab rapot",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat mengambil data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleSave = async (gender: "laki" | "perempuan") => {
    const form = gender === "laki" ? lakiForm : perempuanForm
    const data = gender === "laki" ? lakiData : perempuanData
    const jenis_kelamin_target = gender === "laki" ? "LAKI_LAKI" : "PEREMPUAN"

    if (!form.jabatan || !form.nama_pejabat) {
      toast({
        title: "Error",
        description: "Jabatan dan nama pejabat wajib diisi",
        variant: "destructive",
      })
      return
    }

    try {
      const url = data ? `/api/penanggung-jawab-rapot/${data.id}` : "/api/penanggung-jawab-rapot"
      const method = data ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          jenis_kelamin_target,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Berhasil",
          description: `Penanggung jawab rapot ${gender === "laki" ? "Laki-laki" : "Perempuan"} berhasil ${data ? "diperbarui" : "ditambahkan"}`,
        })
        fetchData()
      } else {
        toast({
          title: "Error",
          description: result.error || "Terjadi kesalahan",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat menyimpan data",
        variant: "destructive",
      })
    }
  }

  const handleUploadSignature = (data: PenanggungJawabRapot) => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "image/*"
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      try {
        const formData = new FormData()
        formData.append("signature", file)

        const response = await fetch(`/api/penanggung-jawab-rapot/${data.id}/signature`, {
          method: "POST",
          body: formData,
        })

        const result = await response.json()

        if (result.success) {
          toast({
            title: "Berhasil",
            description: "Tanda tangan berhasil diupload",
          })
          fetchData()
        } else {
          toast({
            title: "Error",
            description: result.error || "Gagal upload tanda tangan",
            variant: "destructive",
          })
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Terjadi kesalahan saat upload",
          variant: "destructive",
        })
      }
    }
    input.click()
  }


  const handleDelete = (data: PenanggungJawabRapot) => {
    setSelectedToDelete(data)
    setShowDeleteDialog(true)
  }

  const handleDeleteConfirm = async () => {
    if (!selectedToDelete) return

    try {
      const response = await fetch(`/api/penanggung-jawab-rapot/${selectedToDelete.id}`, {
        method: "DELETE",
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Berhasil",
          description: "Penanggung jawab rapot berhasil dihapus",
        })
        fetchData()
        setShowDeleteDialog(false)
      } else {
        toast({
          title: "Error",
          description: result.error || "Gagal menghapus penanggung jawab rapot",
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


  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Penanggung Jawab Rapot</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Laki-laki Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Penanggung Jawab Laki-laki
              {lakiData && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(lakiData)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="laki-jabatan">Jabatan</Label>
              <Input
                id="laki-jabatan"
                value={lakiForm.jabatan}
                onChange={(e) => setLakiForm({ ...lakiForm, jabatan: e.target.value })}
                placeholder="Contoh: Kepala Sekolah"
              />
            </div>
            <div>
              <Label htmlFor="laki-nama">Nama Pejabat</Label>
              <Input
                id="laki-nama"
                value={lakiForm.nama_pejabat}
                onChange={(e) => setLakiForm({ ...lakiForm, nama_pejabat: e.target.value })}
                placeholder="Nama lengkap pejabat"
              />
            </div>
            <div>
              <Label htmlFor="laki-nip">NIP</Label>
              <Input
                id="laki-nip"
                value={lakiForm.nip}
                onChange={(e) => setLakiForm({ ...lakiForm, nip: e.target.value })}
                placeholder="Nomor Induk Pegawai (opsional)"
              />
            </div>
            <div>
              <Label htmlFor="laki-status">Status</Label>
              <Select
                value={lakiForm.status}
                onValueChange={(value: "aktif" | "nonaktif") => setLakiForm({ ...lakiForm, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aktif">Aktif</SelectItem>
                  <SelectItem value="nonaktif">Non-aktif</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tanda Tangan</Label>
              <div className="flex items-center gap-2 mt-2">
                {lakiData ? (
                  lakiData.tanda_tangan ? (
                    <>
                      <img src={lakiData.tanda_tangan} alt="Tanda Tangan" className="max-w-32 max-h-16 border rounded" />
                      <Button size="sm" variant="outline" onClick={() => handleUploadSignature(lakiData)}>
                        <Upload className="h-3 w-3 mr-1" />
                        Ganti
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => handleUploadSignature(lakiData)}>
                      <Upload className="h-3 w-3 mr-1" />
                      Upload
                    </Button>
                  )
                ) : (
                  <Badge variant="secondary">Simpan data terlebih dahulu</Badge>
                )}
              </div>
            </div>
            <Button onClick={() => handleSave("laki")} className="w-full">
              <Save className="h-4 w-4 mr-2" />
              Simpan
            </Button>
          </CardContent>
        </Card>

        {/* Perempuan Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Penanggung Jawab Perempuan
              {perempuanData && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(perempuanData)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="perempuan-jabatan">Jabatan</Label>
              <Input
                id="perempuan-jabatan"
                value={perempuanForm.jabatan}
                onChange={(e) => setPerempuanForm({ ...perempuanForm, jabatan: e.target.value })}
                placeholder="Contoh: Wakil Kepala Sekolah"
              />
            </div>
            <div>
              <Label htmlFor="perempuan-nama">Nama Pejabat</Label>
              <Input
                id="perempuan-nama"
                value={perempuanForm.nama_pejabat}
                onChange={(e) => setPerempuanForm({ ...perempuanForm, nama_pejabat: e.target.value })}
                placeholder="Nama lengkap pejabat"
              />
            </div>
            <div>
              <Label htmlFor="perempuan-nip">NIP</Label>
              <Input
                id="perempuan-nip"
                value={perempuanForm.nip}
                onChange={(e) => setPerempuanForm({ ...perempuanForm, nip: e.target.value })}
                placeholder="Nomor Induk Pegawai (opsional)"
              />
            </div>
            <div>
              <Label htmlFor="perempuan-status">Status</Label>
              <Select
                value={perempuanForm.status}
                onValueChange={(value: "aktif" | "nonaktif") => setPerempuanForm({ ...perempuanForm, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aktif">Aktif</SelectItem>
                  <SelectItem value="nonaktif">Non-aktif</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tanda Tangan</Label>
              <div className="flex items-center gap-2 mt-2">
                {perempuanData ? (
                  perempuanData.tanda_tangan ? (
                    <>
                      <img src={perempuanData.tanda_tangan} alt="Tanda Tangan" className="max-w-32 max-h-16 border rounded" />
                      <Button size="sm" variant="outline" onClick={() => handleUploadSignature(perempuanData)}>
                        <Upload className="h-3 w-3 mr-1" />
                        Ganti
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => handleUploadSignature(perempuanData)}>
                      <Upload className="h-3 w-3 mr-1" />
                      Upload
                    </Button>
                  )
                ) : (
                  <Badge variant="secondary">Simpan data terlebih dahulu</Badge>
                )}
              </div>
            </div>
            <Button onClick={() => handleSave("perempuan")} className="w-full">
              <Save className="h-4 w-4 mr-2" />
              Simpan
            </Button>
          </CardContent>
        </Card>
      </div>


      {/* Delete Dialog */}
      <ConfirmDialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteConfirm}
        title="Hapus Penanggung Jawab Rapot"
        description={`Apakah Anda yakin ingin menghapus penanggung jawab rapot "${selectedToDelete?.nama_pejabat}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Hapus"
        variant="destructive"
      />
    </div>
  )
}