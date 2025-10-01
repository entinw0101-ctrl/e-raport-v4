"use client"

import { useState, useEffect, Suspense } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Users,
  GraduationCap,
  BookOpen,
  TrendingUp,
  FileText,
  Plus,
  BarChart3,
  RefreshCw,
  AlertCircle
} from "lucide-react"

// Import dashboard components
import { StatCard } from "@/components/dashboard/stat-card"
import { NilaiChart } from "@/components/dashboard/nilai-chart"
import { QuickActions } from "@/components/dashboard/quick-actions"
import { RecentActivity } from "@/components/dashboard/recent-activity"

// Import mock data for fallbacks
import {
  mockDashboardStats,
  mockNilaiCompletionData,
  mockQuickActions,
  mockRecentActivities,
  formatIndonesianDate,
  getGreeting
} from "@/lib/mock-data"

// Loading skeleton components
function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-[100px]" />
        <Skeleton className="h-4 w-4" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-[60px] mb-1" />
        <Skeleton className="h-3 w-[80px]" />
      </CardContent>
    </Card>
  )
}

function ChartSkeleton() {
  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader>
        <Skeleton className="h-6 w-[200px]" />
        <Skeleton className="h-4 w-[250px]" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[400px] w-full" />
      </CardContent>
    </Card>
  )
}

function QuickActionsSkeleton() {
  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-3 w-40" />
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-md" />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function RecentActivitySkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-[140px]" />
        <Skeleton className="h-4 w-[180px]" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 p-3">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Types for API responses
interface DashboardStats {
  totalSiswa: number
  totalGuru: number
  totalKelas: number
  totalNilai: number
}

interface RecentActivityItem {
  id: string
  nilai_angka: number
  dibuat_pada: string
  siswa: { nama: string }
  mata_pelajaran: { nama_mapel: string }
}

interface DashboardData {
  stats: DashboardStats
  lastMonthStats?: DashboardStats
  recentActivities: RecentActivityItem[]
  gradeDistribution: Record<string, number>
  quickActions?: any[]
  nilaiCompletionData?: any[]
}

// Client component for dynamic dashboard
export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/dashboard/stats')
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data')
      }

      const apiData = await response.json()
      setData(apiData)
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Error fetching dashboard data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data')

      // Fallback to mock data if API fails
      setData({
        stats: {
          totalSiswa: mockDashboardStats.totalSantriAktif,
          totalGuru: mockDashboardStats.totalUstadzAktif,
          totalKelas: mockDashboardStats.kelasTerdaftar,
          totalNilai: mockDashboardStats.nilaiTerinputHariIni
        },
        lastMonthStats: {
          totalSiswa: Math.round(mockDashboardStats.totalSantriAktif * 0.88), // 12% less than current
          totalGuru: Math.round(mockDashboardStats.totalUstadzAktif * 0.98), // 2% less than current
          totalKelas: mockDashboardStats.kelasTerdaftar, // Same as current
          totalNilai: Math.round(mockDashboardStats.nilaiTerinputHariIni * 0.95) // 5% less than current
        },
        recentActivities: mockRecentActivities.map(activity => ({
          id: activity.id,
          nilai_angka: 85, // mock value
          dibuat_pada: new Date().toISOString(),
          siswa: { nama: 'Mock Student' },
          mata_pelajaran: { nama_mapel: 'Mock Subject' }
        })),
        gradeDistribution: {},
        quickActions: mockQuickActions,
        nilaiCompletionData: mockNilaiCompletionData
      })
    } finally {
      setLoading(false)
    }
  }

  // Initial load and periodic refresh
  useEffect(() => {
    fetchDashboardData()

    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchDashboardData, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [])

  // Manual refresh
  const handleRefresh = () => {
    fetchDashboardData()
  }

  // Transform API data for components
  const transformRecentActivities = (activities: RecentActivityItem[]) => {
    return activities.map(activity => ({
      id: activity.id.toString(),
      type: 'nilai' as const,
      message: `Ustadz updated nilai ${activity.mata_pelajaran.nama_mapel} untuk ${activity.siswa.nama}`,
      timestamp: new Date(activity.dibuat_pada).toLocaleString('id-ID'),
      user: 'System'
    }))
  }

  const transformGradeDistribution = (gradeDist: Record<string, number>) => {
    const total = Object.values(gradeDist).reduce((a, b) => a + b, 0)
    if (total === 0) return mockNilaiCompletionData

    return Object.entries(gradeDist).map(([name, count]) => ({
      name: `Grade ${name}`,
      terisi: Math.round((count / total) * 100)
    }))
  }

  // Calculate trend percentage
  const calculateTrend = (current: number, previous: number): { percentage: number, type: 'positive' | 'negative' | 'neutral' } => {
    if (previous === 0) {
      return { percentage: current > 0 ? 100 : 0, type: current > 0 ? 'positive' : 'neutral' }
    }

    const percentage = ((current - previous) / previous) * 100
    const type = percentage > 0 ? 'positive' : percentage < 0 ? 'negative' : 'neutral'

    return { percentage: Math.abs(percentage), type }
  }

  // Format trend text
  const formatTrendText = (trend: { percentage: number, type: 'positive' | 'negative' | 'neutral' }): string => {
    const { percentage, type } = trend
    const formattedPercentage = percentage.toFixed(1)

    if (type === 'positive') {
      return `+${formattedPercentage}% dari bulan lalu`
    } else if (type === 'negative') {
      return `-${formattedPercentage}% dari bulan lalu`
    } else {
      return 'Stabil dari bulan lalu'
    }
  }

  // Loading state
  if (loading && !data) {
    return (
      <div className="container mx-auto p-6 space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <QuickActionsSkeleton />
          <div className="lg:col-span-2">
            <ChartSkeleton />
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error && !data) {
    return (
      <div className="container mx-auto p-6">
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {error}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="ml-4 border-red-300 text-red-700 hover:bg-red-100"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Coba Lagi
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Ensure data exists
  if (!data) return null

  const transformedActivities = transformRecentActivities(data.recentActivities)
  const transformedChartData = transformGradeDistribution(data.gradeDistribution)

  // Calculate trends for each metric
  const siswaTrend = calculateTrend(data.stats.totalSiswa, data.lastMonthStats?.totalSiswa || 0)
  const guruTrend = calculateTrend(data.stats.totalGuru, data.lastMonthStats?.totalGuru || 0)
  const kelasTrend = calculateTrend(data.stats.totalKelas, data.lastMonthStats?.totalKelas || 0)
  const nilaiTrend = calculateTrend(data.stats.totalNilai, data.lastMonthStats?.totalNilai || 0)

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {getGreeting()}, Admin!
          </h1>
          <p className="text-muted-foreground mt-1">
            {formatIndonesianDate(new Date())}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Selamat datang di dashboard E-Raport Nuurush Sholaah
          </p>
          {lastUpdated && (
            <p className="text-xs text-muted-foreground mt-1">
              Terakhir update: {lastUpdated.toLocaleTimeString('id-ID')}
            </p>
          )}
        </div>

        <div className="flex gap-3">
          <Button
            onClick={handleRefresh}
            disabled={loading}
            className="inline-flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Memuat...' : 'Refresh'}
          </Button>
          <Button className="inline-flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Generate Laporan
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Suspense fallback={<StatCardSkeleton />}>
        <StatCard
          icon={Users}
          title="Total Santri"
          value={data.stats.totalSiswa}
          trend={formatTrendText(siswaTrend)}
          trendType={siswaTrend.type}
          description="Total santri terdaftar"
        />
      </Suspense>

      <Suspense fallback={<StatCardSkeleton />}>
        <StatCard
          icon={GraduationCap}
          title="Total Ustadz"
          value={data.stats.totalGuru}
          trend={formatTrendText(guruTrend)}
          trendType={guruTrend.type}
          description="Total ustadz terdaftar"
        />
      </Suspense>

      <Suspense fallback={<StatCardSkeleton />}>
        <StatCard
          icon={BookOpen}
          title="Total Kelas"
          value={data.stats.totalKelas}
          trend={formatTrendText(kelasTrend)}
          trendType={kelasTrend.type}
          description="Total kelas aktif"
        />
      </Suspense>

      <Suspense fallback={<StatCardSkeleton />}>
        <StatCard
          icon={TrendingUp}
          title="Total Nilai"
          value={data.stats.totalNilai}
          trend={formatTrendText(nilaiTrend)}
          trendType={nilaiTrend.type}
          description="Total nilai yang diinput"
        />
      </Suspense>
    </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-1">
          <Suspense fallback={<QuickActionsSkeleton />}>
            <QuickActions actions={mockQuickActions} />
          </Suspense>
        </div>

        {/* Charts Section */}
        <div className="lg:col-span-2 space-y-6">
          <Suspense fallback={<ChartSkeleton />}>
            <NilaiChart data={transformedChartData} />
          </Suspense>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
        <Suspense fallback={<RecentActivitySkeleton />}>
          <RecentActivity activities={transformedActivities} />
        </Suspense>
      </div>

      {/* Footer */}
      <div className="text-center py-8 border-t border-border">
        <p className="text-sm text-muted-foreground">
          E-Raport Nuurush Sholaah - Sistem Manajemen Rapor Modern
        </p>
      </div>
    </div>
  )
}
