import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RecentActivity as RecentActivityType } from "@/lib/mock-data"
import {
  GraduationCap,
  FileText,
  UserPlus,
  Users,
  CheckCircle,
  Clock,
  User
} from "lucide-react"

interface RecentActivityProps {
  activities: RecentActivityType[]
}

const getActivityIcon = (type: RecentActivityType['type']) => {
  switch (type) {
    case 'nilai':
      return GraduationCap
    case 'rapor':
      return FileText
    case 'santri':
      return UserPlus
    case 'kehadiran':
      return Users
    case 'akhlak':
      return CheckCircle
    default:
      return Clock
  }
}

const getActivityColor = (type: RecentActivityType['type']) => {
  switch (type) {
    case 'nilai':
      return 'text-blue-600 bg-blue-50'
    case 'rapor':
      return 'text-green-600 bg-green-50'
    case 'santri':
      return 'text-purple-600 bg-purple-50'
    case 'kehadiran':
      return 'text-orange-600 bg-orange-50'
    case 'akhlak':
      return 'text-pink-600 bg-pink-50'
    default:
      return 'text-gray-600 bg-gray-50'
  }
}

// Helper function to get user display name
const getUserDisplay = (user?: string) => {
  return user || 'System'
}

export function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          Aktivitas Terbaru
        </CardTitle>
        <CardDescription>
          Update terakhir dari sistem rapor
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => {
            const Icon = getActivityIcon(activity.type)
            const colorClass = getActivityColor(activity.type)

            return (
              <div
                key={activity.id}
                className="flex items-start gap-3 p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors duration-200"
              >
                {/* Avatar/Icon */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                  <Icon className="w-5 h-5" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground leading-tight">
                        {activity.message}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          variant="secondary"
                          className={`text-xs px-2 py-0.5 ${colorClass}`}
                        >
                          <Icon className="w-3 h-3 mr-1" />
                          {activity.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {activity.timestamp}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* View All Link */}
        <div className="mt-4 pt-4 border-t border-border">
          <button className="text-sm text-primary hover:text-primary/80 font-medium transition-colors duration-200">
            Lihat semua aktivitas →
          </button>
        </div>
      </CardContent>
    </Card>
  )
}