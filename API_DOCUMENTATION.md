# API Documentation - E-RAPOT NUURUSH SHOLAAH

Dokumentasi lengkap API endpoints untuk sistem E-RAPOT.

## 🔐 Authentication

Semua API endpoints memerlukan authentication kecuali yang disebutkan khusus.

### Headers Required
\`\`\`http
Authorization: Bearer <supabase_jwt_token>
Content-Type: application/json
\`\`\`

## 📚 Master Data APIs

### Siswa (Students)

#### GET /api/siswa
Mendapatkan daftar siswa dengan pagination dan filter.

**Query Parameters:**
- `page` (number): Halaman (default: 1)
- `limit` (number): Jumlah per halaman (default: 10)
- `search` (string): Pencarian berdasarkan nama/NIS
- `kelas_id` (string): Filter berdasarkan kelas
- `tingkatan_id` (string): Filter berdasarkan tingkatan

**Response:**
\`\`\`json
{
  "data": [
    {
      "id": "uuid",
      "nama": "Ahmad Fauzi",
      "nis": "2024001",
      "tempat_lahir": "Jakarta",
      "tanggal_lahir": "2010-01-15",
      "jenis_kelamin": "LAKI_LAKI",
      "alamat": "Jl. Merdeka No. 123",
      "nama_ayah": "Budi Santoso",
      "nama_ibu": "Siti Aminah",
      "kelas": {
        "id": "uuid",
        "nama": "1A",
        "tingkatan": {
          "nama": "Kelas 1"
        }
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
\`\`\`

#### POST /api/siswa
Menambah siswa baru.

**Request Body:**
\`\`\`json
{
  "nama": "Ahmad Fauzi",
  "nis": "2024001",
  "tempat_lahir": "Jakarta",
  "tanggal_lahir": "2010-01-15",
  "jenis_kelamin": "LAKI_LAKI",
  "alamat": "Jl. Merdeka No. 123",
  "nama_ayah": "Budi Santoso",
  "nama_ibu": "Siti Aminah",
  "kelas_id": "uuid"
}
\`\`\`

#### PUT /api/siswa/[id]
Update data siswa.

#### DELETE /api/siswa/[id]
Hapus data siswa.

### Guru (Teachers)

#### GET /api/guru
Mendapatkan daftar guru.

**Response:**
\`\`\`json
{
  "data": [
    {
      "id": "uuid",
      "nama": "Dr. Ahmad Yusuf",
      "nip": "196501011990031001",
      "tempat_lahir": "Bandung",
      "tanggal_lahir": "1965-01-01",
      "jenis_kelamin": "LAKI_LAKI",
      "alamat": "Jl. Pendidikan No. 45",
      "no_hp": "081234567890",
      "email": "ahmad.yusuf@nuurushsholaah.com",
      "jabatan": "Kepala Sekolah",
      "mata_pelajaran": "Matematika",
      "foto_ttd": "signatures/ahmad-yusuf.png"
    }
  ]
}
\`\`\`

#### POST /api/guru
Menambah guru baru.

### Kelas (Classes)

#### GET /api/kelas
Mendapatkan daftar kelas.

#### POST /api/kelas
Menambah kelas baru.

## 📊 Penilaian APIs

### Nilai Ujian (Exam Scores)

#### GET /api/nilai-ujian
Mendapatkan nilai ujian dengan filter.

**Query Parameters:**
- `siswa_id` (string): Filter berdasarkan siswa
- `mata_pelajaran_id` (string): Filter berdasarkan mata pelajaran
- `periode_ajaran_id` (string): Filter berdasarkan periode ajaran
- `semester` (number): Filter berdasarkan semester (1 atau 2)

**Response:**
\`\`\`json
{
  "data": [
    {
      "id": "uuid",
      "siswa_id": "uuid",
      "mata_pelajaran_id": "uuid",
      "periode_ajaran_id": "uuid",
      "semester": 1,
      "uh1": 85,
      "uh2": 88,
      "uts": 82,
      "uas": 90,
      "nilai": 86.25,
      "grade": "A",
      "siswa": {
        "nama": "Ahmad Fauzi",
        "nis": "2024001"
      },
      "mata_pelajaran": {
        "nama": "Matematika",
        "kode": "MTK"
      }
    }
  ]
}
\`\`\`

#### POST /api/nilai-ujian
Input nilai ujian baru.

**Request Body:**
\`\`\`json
{
  "siswa_id": "uuid",
  "mata_pelajaran_id": "uuid",
  "periode_ajaran_id": "uuid",
  "semester": 1,
  "uh1": 85,
  "uh2": 88,
  "uts": 82,
  "uas": 90
}
\`\`\`

### Nilai Hafalan (Memorization Scores)

#### GET /api/nilai-hafalan
Mendapatkan nilai hafalan.

#### POST /api/nilai-hafalan
Input nilai hafalan baru.

**Request Body:**
\`\`\`json
{
  "siswa_id": "uuid",
  "mata_pelajaran_id": "uuid",
  "periode_ajaran_id": "uuid",
  "semester": 1,
  "nilai": 85,
  "keterangan": "Hafal 5 surat pendek"
}
\`\`\`

## 📈 Dashboard APIs

### GET /api/dashboard/stats
Mendapatkan statistik dashboard.

**Response:**
\`\`\`json
{
  "stats": {
    "totalSiswa": 150,
    "totalGuru": 25,
    "totalKelas": 12,
    "totalNilai": 1250
  },
  "recentActivities": [
    {
      "id": "uuid",
      "nilai": 85,
      "created_at": "2024-01-15T10:30:00Z",
      "siswa": {
        "nama": "Ahmad Fauzi"
      },
      "mata_pelajaran": {
        "nama": "Matematika"
      }
    }
  ],
  "gradeDistribution": {
    "A": 45,
    "B": 38,
    "C": 25,
    "D": 12,
    "E": 5
  }
}
\`\`\`

## 📄 Rapot APIs

### POST /api/rapot/generate
Generate rapot siswa.

**Request Body:**
\`\`\`json
{
  "siswaId": "uuid",
  "periodeAjaranId": "uuid",
  "semester": 1
}
\`\`\`

**Response:**
\`\`\`json
{
  "rapot": {
    "siswa": {
      "nama": "Ahmad Fauzi",
      "nis": "2024001",
      "kelas": {
        "nama": "1A",
        "tingkatan": {
          "nama": "Kelas 1"
        }
      }
    },
    "nilaiUjian": [...],
    "nilaiHafalan": [...],
    "kehadiran": {
      "hadir": 180,
      "sakit": 5,
      "izin": 3,
      "alpa": 2
    },
    "penilaianSikap": [...],
    "semester": 1,
    "periodeAjaran": "uuid"
  }
}
\`\`\`

## 📁 File Upload APIs

### POST /api/upload/signature
Upload tanda tangan guru.

**Request:** Multipart form data
- `file`: Image file (PNG, JPG, JPEG)
- `guru_id`: UUID guru

**Response:**
\`\`\`json
{
  "message": "File uploaded successfully",
  "filename": "signatures/guru-uuid.png"
}
\`\`\`

### POST /api/upload/excel
Upload file Excel untuk import data.

**Request:** Multipart form data
- `file`: Excel file (.xlsx, .xls)
- `type`: "siswa" | "nilai-ujian" | "nilai-hafalan"

## 📤 Export APIs

### GET /api/export/excel/siswa
Export data siswa ke Excel.

**Query Parameters:**
- `kelas_id` (optional): Filter berdasarkan kelas

**Response:** File Excel download

### GET /api/export/excel/nilai-ujian
Export nilai ujian ke Excel.

**Query Parameters:**
- `periode_ajaran_id`: Periode ajaran
- `semester`: Semester (1 atau 2)
- `mata_pelajaran_id` (optional): Filter mata pelajaran

## ❌ Error Responses

Semua API menggunakan format error response yang konsisten:

\`\`\`json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "validation error message"
  }
}
\`\`\`

### HTTP Status Codes
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `422`: Validation Error
- `500`: Internal Server Error

## 🔄 Rate Limiting

API memiliki rate limiting:
- 100 requests per minute per IP
- 1000 requests per hour per authenticated user

## 📝 Notes

- Semua tanggal menggunakan format ISO 8601
- Pagination menggunakan offset-based
- File upload maksimal 5MB
- Supported image formats: PNG, JPG, JPEG
- Supported Excel formats: .xlsx, .xls

---

**API Version: 1.0.0**
