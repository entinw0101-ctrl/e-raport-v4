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
  private baseUrl = "/guru"

  async getAll(params: GuruListParams = {}): Promise<GuruListResponse> {
    const searchParams = new URLSearchParams()

    if (params.page) searchParams.append("page", params.page.toString())
    if (params.per_page) searchParams.append("per_page", params.per_page.toString())
    if (params.search) searchParams.append("search", params.search)

    const url = `${this.baseUrl}?${searchParams.toString()}`
    const response = await httpService.get<GuruListResponse>(url)
    return {
      success: response.success,
      data: response.data?.data || [],
      pagination: response.data?.pagination || { page: 1, per_page: 10, total: 0, total_pages: 0 },
      error: response.error,
    }
  }

  async getById(id: number): Promise<GuruResponse> {
    const response = await httpService.get<Guru>(`${this.baseUrl}/${id}`)
    return {
      success: response.success,
      data: response.data,
      message: response.message,
      error: response.error,
    }
  }

  async create(data: GuruCreateData): Promise<GuruResponse> {
    const response = await httpService.post<Guru>(this.baseUrl, data)
    return {
      success: response.success,
      data: response.data,
      message: response.message,
      error: response.error,
    }
  }

  async update(id: number, data: GuruUpdateData): Promise<GuruResponse> {
    const response = await httpService.put<Guru>(`${this.baseUrl}/${id}`, data)
    return {
      success: response.success,
      data: response.data,
      message: response.message,
      error: response.error,
    }
  }

  async delete(id: number): Promise<GuruResponse> {
    const response = await httpService.delete<Guru>(`${this.baseUrl}/${id}`)
    return {
      success: response.success,
      data: response.data,
      message: response.message,
      error: response.error,
    }
  }

  async uploadSignature(id: number, file: File): Promise<GuruResponse> {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("guru_id", id.toString())

    const response = await httpService.upload<Guru>("/upload/signature", formData)
    return {
      success: response.success,
      data: response.data,
      message: response.message,
      error: response.error,
    }
  }

  async deleteSignature(id: number): Promise<GuruResponse> {
    const response = await httpService.delete<Guru>(`/upload/signature?guru_id=${id}`)
    return {
      success: response.success,
      data: response.data,
      message: response.message,
      error: response.error,
    }
  }
}

export const guruService = new GuruService()
