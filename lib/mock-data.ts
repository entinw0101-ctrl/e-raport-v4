// Mock data untuk dashboard E-Raport Nuurush Sholaah
// Data ini mensimulasikan data real dari database

export interface DashboardStats {
  totalSantriAktif: number
  totalUstadzAktif: number
  kelasTerdaftar: number
  raporBelumDigenerate: number
  nilaiTerinputHariIni: number
  statusPengisianData: number
}

export interface NilaiCompletionData {
  name: string
  terisi: number
}

export interface KehadiranData {
  name: string
  value: number
  color: string
}

export interface RecentActivity {
  id: string
  type: 'nilai' | 'rapor' | 'santri' | 'kehadiran' | 'akhlak'
  message: string
  timestamp: string
  user?: string
}

export interface QuickAction {
  id: string
  title: string
  description: string
  icon: string
  href: string
  color: string
}

// Mock data untuk statistik dashboard
export const mockDashboardStats: DashboardStats = {
  totalSantriAktif: 245,
  totalUstadzAktif: 18,
  kelasTerdaftar: 12,
  raporBelumDigenerate: 23,
  nilaiTerinputHariIni: 156,
  statusPengisianData: 78
}

// Mock data untuk chart completion nilai per kelas
export const mockNilaiCompletionData: NilaiCompletionData[] = [
  { name: 'Kelas 1A', terisi: 95 },
  { name: 'Kelas 1B', terisi: 88 },
  { name: 'Kelas 2A', terisi: 92 },
  { name: 'Kelas 2B', terisi: 85 },
  { name: 'Kelas 3A', terisi: 78 },
  { name: 'Kelas 3B', terisi: 82 },
  { name: 'Kelas 7A', terisi: 65 },
  { name: 'Kelas 7B', terisi: 72 },
  { name: 'Kelas 8A', terisi: 58 },
  { name: 'Kelas 8B', terisi: 61 },
  { name: 'Kelas 9A', terisi: 45 },
  { name: 'Kelas 9B', terisi: 52 }
]

// Mock data untuk distribusi kehadiran
export const mockKehadiranData: KehadiranData[] = [
  { name: 'Hadir', value: 68, color: '#10B981' },
  { name: 'Sakit', value: 12, color: '#F59E0B' },
  { name: 'Izin', value: 15, color: '#3B82F6' },
  { name: 'Alpha', value: 5, color: '#EF4444' }
]

// Mock data untuk recent activities
export const mockRecentActivities: RecentActivity[] = [
  {
    id: '1',
    type: 'nilai',
    message: 'Ustadz Ahmad update nilai Matematika kelas 7A (15 santri)',
    timestamp: '5 menit yang lalu',
    user: 'Ustadz Ahmad'
  },
  {
    id: '2',
    type: 'rapor',
    message: 'Rapor digenerate untuk Muhammad Ali (SMA 1)',
    timestamp: '12 menit yang lalu',
    user: 'System'
  },
  {
    id: '3',
    type: 'santri',
    message: 'Santri baru terdaftar: Fatimah Zahra (Kelas 1A)',
    timestamp: '25 menit yang lalu',
    user: 'Admin'
  },
  {
    id: '4',
    type: 'kehadiran',
    message: 'Kehadiran ditandai untuk kelas 8B (45 santri)',
    timestamp: '1 jam yang lalu',
    user: 'Ustadzah Siti'
  },
  {
    id: '5',
    type: 'akhlak',
    message: 'Penilaian akhlak selesai untuk kelas 9C',
    timestamp: '2 jam yang lalu',
    user: 'Ustadzah Nur'
  },
  {
    id: '6',
    type: 'nilai',
    message: 'Nilai Bahasa Arab diinput untuk kelas 2A (28 santri)',
    timestamp: '3 jam yang lalu',
    user: 'Ustadzah Maryam'
  }
]

// Mock data untuk quick actions
export const mockQuickActions: QuickAction[] = [
  {
    id: 'input-nilai',
    title: 'Input Nilai',
    description: 'Masukkan nilai ujian & hafalan',
    icon: 'Plus',
    href: '/nilai-ujian',
    color: 'bg-blue-500 hover:bg-blue-600'
  },
  {
    id: 'generate-rapor',
    title: 'Generate Rapor Massal',
    description: 'Buat rapor kelas sekaligus',
    icon: 'FileText',
    href: '/raport',
    color: 'bg-green-500 hover:bg-green-600'
  },
  {
    id: 'tambah-santri',
    title: 'Tambah Santri',
    description: 'Registrasi santri baru',
    icon: 'UserPlus',
    href: '/siswa',
    color: 'bg-purple-500 hover:bg-purple-600'
  },
  {
    id: 'lihat-guru',
    title: 'Lihat Data Ustadz',
    description: 'Kelola data ustadz',
    icon: 'Users',
    href: '/guru',
    color: 'bg-orange-500 hover:bg-orange-600'
  },
  {
    id: 'kelola-kelas',
    title: 'Kelola Kelas',
    description: 'Mengelola informasi kelas dan jadwal',
    icon: 'BookOpen',
    href: '/kelas',
    color: 'bg-teal-500 hover:bg-teal-600'
  },
  {
    id: 'input-absensi',
    title: 'Input Absensi',
    description: 'Masukkan data kehadiran santri harian',
    icon: 'CheckCircle',
    href: '/kehadiran',
    color: 'bg-indigo-500 hover:bg-indigo-600'
  },
  {
    id: 'kelola-mapel',
    title: 'Kelola Mata Pelajaran',
    description: 'Mengelola mata pelajaran dan kurikulum',
    icon: 'GraduationCap',
    href: '/mata-pelajaran',
    color: 'bg-pink-500 hover:bg-pink-600'
  },
  {
    id: 'lihat-statistik',
    title: 'Lihat Statistik',
    description: 'Melihat statistik performa santri dan kelas',
    icon: 'BarChart3',
    href: '/dashboard',
    color: 'bg-cyan-500 hover:bg-cyan-600'
  },
  {
    id: 'pengaturan',
    title: 'Pengaturan Sistem',
    description: 'Konfigurasi pengaturan aplikasi E-Raport',
    icon: 'Settings',
    href: '/pengaturan',
    color: 'bg-gray-500 hover:bg-gray-600'
  }
]

// Helper function untuk mendapatkan warna berdasarkan persentase completion
export const getCompletionColor = (percentage: number): string => {
  if (percentage >= 90) return '#10B981' // green
  if (percentage >= 70) return '#F59E0B' // yellow
  if (percentage >= 50) return '#F97316' // orange
  return '#EF4444' // red
}

// Helper function untuk format tanggal Indonesia
export const formatIndonesianDate = (date: Date): string => {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ]

  return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`
}

// Helper function untuk mendapatkan greeting berdasarkan waktu
export const getGreeting = (): string => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Selamat Pagi'
  if (hour < 15) return 'Selamat Siang'
  if (hour < 18) return 'Selamat Sore'
  return 'Selamat Malam'
}