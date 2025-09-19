import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BookOpen, Users, GraduationCap, FileText, Settings, BarChart3 } from "lucide-react"
import Link from "next/link"

export default function HomePage() {
  const menuItems = [
    {
      title: "Data Siswa",
      description: "Kelola data siswa dan informasi pribadi",
      icon: Users,
      href: "/siswa",
      color: "bg-blue-500",
    },
    {
      title: "Data Guru",
      description: "Kelola data guru dan wali kelas",
      icon: GraduationCap,
      href: "/guru",
      color: "bg-green-500",
    },
    {
      title: "Kurikulum",
      description: "Kelola mata pelajaran dan kurikulum",
      icon: BookOpen,
      href: "/kurikulum",
      color: "bg-purple-500",
    },
    {
      title: "Penilaian",
      description: "Input nilai ujian dan hafalan siswa",
      icon: FileText,
      href: "/penilaian",
      color: "bg-orange-500",
    },
    {
      title: "Laporan Rapot",
      description: "Generate dan download rapot siswa",
      icon: BarChart3,
      href: "/rapot",
      color: "bg-red-500",
    },
    {
      title: "Pengaturan",
      description: "Konfigurasi sistem dan master data",
      icon: Settings,
      href: "/pengaturan",
      color: "bg-gray-500",
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">E-RAPOT NUURUSH SHOLAAH</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Sistem Rapot Digital untuk Pesantren Nuurush Sholaah
          </p>
        </div>

        {/* Menu Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {menuItems.map((item) => {
            const Icon = item.icon
            return (
              <Link key={item.href} href={item.href}>
                <Card className="h-full hover:shadow-lg transition-shadow duration-200 cursor-pointer group">
                  <CardHeader className="pb-4">
                    <div
                      className={`w-12 h-12 ${item.color} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200`}
                    >
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <CardTitle className="text-xl font-semibold text-gray-900">{item.title}</CardTitle>
                    <CardDescription className="text-gray-600">{item.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      variant="outline"
                      className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-200 bg-transparent"
                    >
                      Buka Menu
                    </Button>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>

        {/* Footer */}
        <div className="text-center mt-16 text-gray-500">
          <p>&copy; 2024 Pesantren Nuurush Sholaah. Semua hak dilindungi.</p>
        </div>
      </div>
    </div>
  )
}
