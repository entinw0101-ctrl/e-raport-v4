import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BookOpen, Users, GraduationCap, FileText, BarChart3, UserCheck } from "lucide-react"
import Link from "next/link"

export default function HomePage() {
  const quickActions = [
    {
      title: "Input Nilai Ujian",
      description: "Tambah nilai ujian siswa terbaru",
      icon: FileText,
      href: "/nilai-ujian",
      color: "bg-blue-500",
    },
    {
      title: "Input Kehadiran",
      description: "Catat kehadiran siswa hari ini",
      icon: UserCheck,
      href: "/kehadiran",
      color: "bg-green-500",
    },
    {
      title: "Data Siswa",
      description: "Kelola informasi siswa",
      icon: Users,
      href: "/siswa",
      color: "bg-orange-500",
    },
  ]

  const stats = [
    {
      title: "Total Siswa",
      value: "245",
      change: "+12 dari bulan lalu",
      icon: Users,
    },
    {
      title: "Total Guru",
      value: "28",
      change: "+2 dari bulan lalu",
      icon: GraduationCap,
    },
    {
      title: "Mata Pelajaran",
      value: "15",
      change: "Stabil",
      icon: BookOpen,
    },
    {
      title: "Rapot Dibuat",
      value: "189",
      change: "+45 minggu ini",
      icon: BarChart3,
    },
  ]

  return (
    <div className="flex-1 space-y-4">
      {/* Welcome Section */}
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Selamat datang di Sistem E-RAPOT Nuurush Sholaah</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.change}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Quick Actions */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Aksi Cepat</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <Link key={action.href} href={action.href}>
                <Card className="h-full hover:shadow-lg transition-shadow duration-200 cursor-pointer group">
                  <CardHeader className="pb-4">
                    <div
                      className={`w-12 h-12 ${action.color} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200`}
                    >
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <CardTitle className="text-lg font-semibold">{action.title}</CardTitle>
                    <CardDescription>{action.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      variant="outline"
                      className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-200 bg-transparent"
                    >
                      Buka
                    </Button>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Aktivitas Terbaru</h3>
        <Card>
          <CardHeader>
            <CardTitle>Ringkasan Sistem</CardTitle>
            <CardDescription>Aktivitas terbaru dalam sistem E-RAPOT</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Sistem berjalan normal</p>
                <p className="text-xs text-muted-foreground">Semua fitur tersedia</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Database terhubung</p>
                <p className="text-xs text-muted-foreground">Koneksi stabil</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Backup otomatis aktif</p>
                <p className="text-xs text-muted-foreground">Terakhir: 2 jam yang lalu</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
