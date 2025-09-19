import { httpService } from "./http"

export interface Guru {
  id: number
  nama: string | null
  nip: string | null
  jenis_kelamin: "LAKI_LAKI" | "PEREMPUAN" | null
  tempat_lahir: string | null
  tanggal_lahir: Date | null
  telepon: string | null
  alamat: string | null
  status: "aktif" | "nonaktif" | null
  tanda_tangan: string | null
  kelas_wali: Array<{
    id: number
    nama_kelas: string
    tingkatan?: {
      nama_tingkatan: string
    }
  }>
}

export interface GuruCreateData {
  nama: string
  nip?: string
  jenis_kelamin: "LAKI_LAKI" | "PEREMPUAN"
  tempat_lahir?: string
  tanggal_lahir?: string
  telepon?: string
  alamat?: string
  status: "aktif" | "nonaktif"
}

export interface GuruUpdateData extends Partial<GuruCreateData> {}

export interface GuruListParams {
  page?: number
  per_page?: number
  search?: string
}

export interface GuruListResponse {
  success: boolean
  data: Guru[]
  pagination: {
    page: number
    per_page: number
    total: number
    total_pages: number
  }
  error?: string
}

export interface GuruResponse {
  success: boolean
  data?: Guru
  message?: string
  error?: string
}

class GuruService {
  private baseUrl = "/api/guru"

  async getAll(params: GuruListParams = {}): Promise<GuruListResponse> {
    const searchParams = new URLSearchParams()

    if (params.page) searchParams.append("page", params.page.toString())
    if (params.per_page) searchParams.append("per_page", params.per_page.toString())
    if (params.search) searchParams.append("search", params.search)

    const url = `${this.baseUrl}?${searchParams.toString()}`
    return httpService.get<GuruListResponse>(url)
  }

  async getById(id: number): Promise<GuruResponse> {
    return httpService.get<GuruResponse>(`${this.baseUrl}/${id}`)
  }

  async create(data: GuruCreateData): Promise<GuruResponse> {
    return httpService.post<GuruResponse>(this.baseUrl, data)
  }

  async update(id: number, data: GuruUpdateData): Promise<GuruResponse> {
    return httpService.put<GuruResponse>(`${this.baseUrl}/${id}`, data)
  }

  async delete(id: number): Promise<GuruResponse> {
    return httpService.delete<GuruResponse>(`${this.baseUrl}/${id}`)
  }

  async uploadSignature(id: number, file: File): Promise<GuruResponse> {
    const formData = new FormData()
    formData.append("signature", file)
    formData.append("guru_id", id.toString())

    return httpService.post<GuruResponse>("/api/upload/signature", formData)
  }
}

export const guruService = new GuruService()
