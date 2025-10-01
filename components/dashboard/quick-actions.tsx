import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { QuickAction as QuickActionType } from "@/lib/mock-data"
import {
  Plus,
  FileText,
  UserPlus,
  Users,
  BookOpen,
  CheckCircle,
  GraduationCap,
  BarChart3,
  Settings
} from "lucide-react"
import Link from "next/link"

interface QuickActionsProps {
  actions: QuickActionType[]
}

// Map untuk mencocokkan nama ikon dari data dengan komponen ikon Lucide
const iconMap = {
  Plus,
  FileText,
  UserPlus,
  Users,
  BookOpen,
  CheckCircle,
  GraduationCap,
  BarChart3,
  Settings
}

export function QuickActions({ actions }: QuickActionsProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-xl font-bold">Quick Actions</CardTitle>
        <CardDescription>Akses cepat ke tugas-tugas utama administrasi.</CardDescription>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 auto-rows-fr">
            {actions.map((action) => {
              const Icon = iconMap[action.icon as keyof typeof iconMap]

              return (
                <Tooltip key={action.id} delayDuration={100}>
                  <TooltipTrigger asChild>
                    <Link href={action.href} passHref>
                      {/* PERUBAHAN UTAMA DI SINI */}
                      <Button
                        variant="outline"
                        // Mengubah h-24 (tinggi tetap) menjadi min-h-24 (tinggi minimum)
                        // Ini memungkinkan tombol untuk bertambah tinggi jika judulnya panjang,
                        // sambil menjaga semua tombol di baris yang sama tetap setinggi tombol yang paling tinggi.
                        className="min-h-24 w-full p-3 flex flex-col items-center justify-center gap-2 text-center border-2 hover:border-primary hover:bg-primary/5 transition-all duration-200 group overflow-hidden max-w-full"
                      >
                        <Icon className="w-7 h-7 text-primary transition-transform group-hover:scale-110 flex-shrink-0" />
                        <div className="w-full px-1 min-w-0">
                          <span className="font-semibold text-xs text-foreground leading-tight break-words hyphens-auto word-break overflow-wrap-anywhere inline-block w-full text-center">
                            {action.title}
                          </span>
                        </div>
                      </Button>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{action.description}</p>
                  </TooltipContent>
                </Tooltip>
              )
            })}
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  )
}
