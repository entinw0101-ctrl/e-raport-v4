import { httpService, type PaginationParams, type PaginatedResponse } from "./http"

export interface Siswa {
  id: number
  nama: string | null
  nis: string
  tempat_lahir: string | null
  tanggal_lahir: Date | null
  jenis_kelamin: "LAKI_LAKI" | "PEREMPUAN" | null
  agama: string | null
  alamat: string | null
  kelas_id: number | null
  kamar_id: number | null
  kota_asal: string | null
  nama_ayah: string | null
  pekerjaan_ayah: string | null
  alamat_ayah: string | null
  nama_ibu: string | null
  pekerjaan_ibu: string | null
  alamat_ibu: string | null
  nama_wali: string | null
  pekerjaan_wali: string | null
  alamat_wali: string | null
  master_tahun_ajaran_id: number | null
  status: "Aktif" | "Lulus" | "Keluar" | "Pindah"
  dibuat_pada: Date
  diperbarui_pada: Date
  kelas?: {
    id: number
    nama_kelas: string
    tingkatan?: {
      nama_tingkatan: string
    }
  }
  kamar?: {
    nama_kamar: string
  }
  master_tahun_ajaran?: {
    nama_ajaran: string
  }
}

export interface CreateSiswaData {
  nama: string
  nis: string
  tempat_lahir?: string
  tanggal_lahir?: string
  jenis_kelamin?: "LAKI_LAKI" | "PEREMPUAN"
  agama?: string
  alamat?: string
  kelas_id?: number
  kamar_id?: number
  kota_asal?: string
  nama_ayah?: string
  pekerjaan_ayah?: string
  alamat_ayah?: string
  nama_ibu?: string
  pekerjaan_ibu?: string
  alamat_ibu?: string
  nama_wali?: string
  pekerjaan_wali?: string
  alamat_wali?: string
  master_tahun_ajaran_id?: number
  status?: "Aktif" | "Lulus" | "Keluar" | "Pindah"
}

export interface UpdateSiswaData extends Partial<CreateSiswaData> {}

class SiswaService {
  private endpoint = "/siswa"

  async getAll(params?: PaginationParams) {
    return httpService.get<PaginatedResponse<Siswa>>(this.endpoint, params)
  }

  async getById(id: number) {
    return httpService.get<Siswa>(`${this.endpoint}/${id}`)
  }

  async create(data: CreateSiswaData) {
    return httpService.post<Siswa>(this.endpoint, data)
  }

  async update(id: number, data: UpdateSiswaData) {
    return httpService.put<Siswa>(`${this.endpoint}/${id}`, data)
  }

  async delete(id: number) {
    return httpService.delete(`${this.endpoint}/${id}`)
  }

  async getByKelas(kelasId: number, params?: PaginationParams) {
    return httpService.get<PaginatedResponse<Siswa>>(`${this.endpoint}/kelas/${kelasId}`, params)
  }

  async getRiwayatKelas(siswaId: number) {
    return httpService.get(`${this.endpoint}/${siswaId}/riwayat-kelas`)
  }

  async promoteToNextClass(siswaIds: number[], kelasKeId: number, tahunAjaranKeId: number, catatan?: string) {
    return httpService.post(`${this.endpoint}/promosi`, {
      siswa_ids: siswaIds,
      kelas_ke_id: kelasKeId,
      tahun_ajaran_ke_id: tahunAjaranKeId,
      catatan,
    })
  }
}

export const siswaService = new SiswaService()
