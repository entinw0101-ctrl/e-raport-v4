"use client"

import type * as React from "react"
import {
  BookOpen,
  Users,
  GraduationCap,
  FileText,
  Settings,
  BarChart3,
  Home,
  ClipboardList,
  UserCheck,
  Heart,
  Target,
  Building,
  School,
  BookMarked,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import Link from "next/link"
import { usePathname } from "next/navigation"

// Menu data
const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: Home,
    },
  ],
  navSecondary: [
    {
      title: "Master Data",
      items: [
        {
          title: "Tingkatan",
          url: "/tingkatan",
          icon: School,
        },
        {
          title: "Kelas",
          url: "/kelas",
          icon: Building,
        },
        {
          title: "Mata Pelajaran",
          url: "/mata-pelajaran",
          icon: BookOpen,
        },
        {
          title: "Kitab",
          url: "/kitab",
          icon: BookMarked,
        },
        {
          title: "Indikator Sikap",
          url: "/indikator-sikap",
          icon: Target,
        },
      ],
    },
    {
      title: "Data Utama",
      items: [
        {
          title: "Data Siswa",
          url: "/siswa",
          icon: Users,
        },
        {
          title: "Data Guru",
          url: "/guru",
          icon: GraduationCap,
        },
      ],
    },
    {
      title: "Penilaian",
      items: [
        {
          title: "Nilai Ujian",
          url: "/nilai-ujian",
          icon: FileText,
        },
        {
          title: "Nilai Hafalan",
          url: "/nilai-hafalan",
          icon: BookOpen,
        },
        {
          title: "Kehadiran",
          url: "/kehadiran",
          icon: UserCheck,
        },
        {
          title: "Penilaian Sikap",
          url: "/penilaian-sikap",
          icon: Heart,
        },
      ],
    },
    {
      title: "Laporan",
      items: [
        {
          title: "Rapot Siswa",
          url: "/rapot",
          icon: BarChart3,
        },
      ],
    },
    {
      title: "Sistem",
      items: [
        {
          title: "Promosi Kelas",
          url: "/promosi-kelas",
          icon: ClipboardList,
        },
        {
          title: "Pengaturan",
          url: "/pengaturan",
          icon: Settings,
        },
      ],
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <School className="size-4" />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">E-RAPOT</span>
            <span className="truncate text-xs">Nuurush Sholaah</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {data.navMain.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {data.navSecondary.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={pathname === item.url}>
                      <Link href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <div className="p-2 text-xs text-muted-foreground">© 2024 Nuurush Sholaah</div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
