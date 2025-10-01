"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from "recharts"
import { NilaiCompletionData, getCompletionColor } from "@/lib/mock-data"

interface NilaiChartProps {
  data: NilaiCompletionData[]
}

export function NilaiChart({ data }: NilaiChartProps) {
  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          Status Pengisian Nilai per Kelas
        </CardTitle>
        <CardDescription>
          Persentase kelengkapan input nilai ujian dan hafalan
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="horizontal"
              margin={{
                top: 20,
                right: 30,
                left: 80,
                bottom: 20,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis
                type="number"
                domain={[0, 100]}
                tick={{ fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={70}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload
                    return (
                      <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
                        <p className="font-medium text-foreground">{label}</p>
                        <p className="text-sm text-muted-foreground">
                          Terisi: <span className="font-semibold text-primary">{data.terisi}%</span>
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: getCompletionColor(data.terisi) }}
                          />
                          <span className="text-xs">
                            {data.terisi >= 90 ? 'Sangat Baik' :
                             data.terisi >= 70 ? 'Baik' :
                             data.terisi >= 50 ? 'Perlu Perhatian' : 'Perlu Segera Ditangani'}
                          </span>
                        </div>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Bar
                dataKey="terisi"
                radius={[0, 4, 4, 0]}
                fill="#3B82F6"
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={getCompletionColor(entry.terisi)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-muted-foreground">≥90% (Sangat Baik)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="text-muted-foreground">70-89% (Baik)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <span className="text-muted-foreground">50-69% (Perlu Perhatian)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-muted-foreground">{`<50% (Perlu Segera Ditangani)`}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}