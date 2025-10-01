import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LucideIcon } from "lucide-react"

interface StatCardProps {
  icon: LucideIcon
  title: string
  value: string | number
  trend?: string
  trendType?: 'positive' | 'negative' | 'neutral'
  description?: string
}

export function StatCard({
  icon: Icon,
  title,
  value,
  trend,
  trendType = 'neutral',
  description
}: StatCardProps) {
  const getTrendColor = () => {
    switch (trendType) {
      case 'positive':
        return 'text-green-600 bg-green-50'
      case 'negative':
        return 'text-red-600 bg-red-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const getTrendIcon = () => {
    switch (trendType) {
      case 'positive':
        return '↗️'
      case 'negative':
        return '↘️'
      default:
        return '→'
    }
  }

  return (
    <Card className="transition-all duration-200 hover:shadow-lg hover:scale-[1.02] border-l-4 border-l-primary/20">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground mb-1">
          {typeof value === 'number' ? value.toLocaleString('id-ID') : value}
        </div>

        {description && (
          <p className="text-xs text-muted-foreground mb-2">
            {description}
          </p>
        )}

        {trend && (
          <Badge
            variant="secondary"
            className={`text-xs font-medium ${getTrendColor()}`}
          >
            {getTrendIcon()} {trend}
          </Badge>
        )}
      </CardContent>
    </Card>
  )
}