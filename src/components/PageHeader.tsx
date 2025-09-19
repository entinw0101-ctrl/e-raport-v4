"use client"

import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { usePathname } from "next/navigation"

interface PageHeaderProps {
  title?: string
  description?: string
}

export function PageHeader({ title, description }: PageHeaderProps) {
  const pathname = usePathname()

  // Generate breadcrumb from pathname
  const pathSegments = pathname.split("/").filter(Boolean)
  const breadcrumbItems = pathSegments.map((segment, index) => {
    const href = "/" + pathSegments.slice(0, index + 1).join("/")
    const label = segment.charAt(0).toUpperCase() + segment.slice(1).replace("-", " ")
    return { href, label, isLast: index === pathSegments.length - 1 }
  })

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
      <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">E-RAPOT</BreadcrumbLink>
            </BreadcrumbItem>
            {breadcrumbItems.map((item, index) => (
              <div key={item.href} className="flex items-center">
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  {item.isLast ? (
                    <BreadcrumbPage>{title || item.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink href={item.href}>{item.label}</BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </div>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      {description && (
        <div className="ml-auto px-4">
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      )}
    </header>
  )
}
