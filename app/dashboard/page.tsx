"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, GraduationCap, BookOpen, FileText, TrendingUp } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface DashboardStats {
  totalSiswa: number
  totalGuru: number
  totalKelas: number
  totalNilai: number
}

interface RecentActivity {
  id: string
  nilai: number
  created_at: string
  siswa: { nama: string }
  mata_pelajaran: { nama: string }
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalSiswa: 0,
    totalGuru: 0,
    totalKelas: 0,
    totalNilai: 0,
  })
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([])
  const [gradeDistribution, setGradeDistribution] = useState<any>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const response = await fetch("/api/dashboard/stats")
      const data = await response.json()

      setStats(data.stats)
      setRecentActivities(data.recentActivities)
      setGradeDistribution(data.gradeDistribution)
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }

  const gradeChartData = Object.entries(gradeDistribution).map(([grade, count]) => ({
    grade,
    count,
  }))

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard E-RAPOT</h1>
          <p className="text-gray-600 mt-1">NUURUSH SHOLAAH</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <FileText className="w-4 h-4 mr-2" />
          Generate Laporan
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Siswa</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSiswa}</div>
            <p className="text-xs text-muted-foreground">Siswa aktif</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Guru</CardTitle>
            <GraduationCap className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalGuru}</div>
            <p className="text-xs text-muted-foreground">Guru aktif</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Kelas</CardTitle>
            <BookOpen className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalKelas}</div>
            <p className="text-xs text-muted-foreground">Kelas aktif</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Nilai</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalNilai}</div>
            <p className="text-xs text-muted-foreground">Nilai terinput</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Grade Distribution Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Distribusi Nilai</CardTitle>
            <CardDescription>Sebaran grade nilai ujian</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={gradeChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="grade" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Activities */}
        <Card>
          <CardHeader>
            <CardTitle>Aktivitas Terbaru</CardTitle>
            <CardDescription>Nilai yang baru diinput</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{activity.siswa.nama}</p>
                    <p className="text-sm text-gray-600">{activity.mata_pelajaran.nama}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary">{activity.nilai}</Badge>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(activity.created_at).toLocaleDateString("id-ID")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
