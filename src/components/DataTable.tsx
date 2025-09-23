"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronLeft, ChevronRight, Search, Plus, Edit, Trash2 } from "lucide-react"
import { useDebounce } from "@/src/hooks/useDebounce"

export interface Column<T> {
  key: keyof T | string
  label: string
  render?: (value: any, row: T) => React.ReactNode
  sortable?: boolean
  className?: string
}

export interface DataTableProps<T> {
  title: string
  columns: Column<T>[]
  data: T[]
  loading?: boolean
  pagination?: {
    page: number
    per_page: number
    total: number
    total_pages: number
  }
  onPageChange?: (page: number) => void
  onSearch?: (search: string) => void
  onAdd?: () => void
  onEdit?: (row: T) => void
  onDelete?: (row: T) => void
  searchPlaceholder?: string
  addButtonText?: string
  emptyMessage?: string
  actions?: boolean
  maxHeight?: string
}

export function DataTable<T extends { id: number | string }>({
  title,
  columns,
  data,
  loading = false,
  pagination,
  onPageChange,
  onSearch,
  onAdd,
  onEdit,
  onDelete,
  searchPlaceholder = "Cari data...",
  addButtonText = "Tambah Data",
  emptyMessage = "Tidak ada data yang ditemukan",
  actions = true,
  maxHeight,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState("")
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  // ✅ FIXED: Remove useEffect that causes infinite loop
  // The parent component should handle search logic directly

  const handleSearch = (value: string) => {
    setSearchTerm(value)
    // ✅ FIXED: Call onSearch immediately when user types
    if (onSearch) {
      onSearch(value)
    }
  }

  const getValue = (row: T, key: string): any => {
    return key.split(".").reduce((obj, k) => obj?.[k], row as any)
  }

  const renderPagination = () => {
    if (!pagination) return null

    const { page, total_pages, total } = pagination
    const startItem = (page - 1) * pagination.per_page + 1
    const endItem = Math.min(page * pagination.per_page, total)

    return (
      <div className="flex items-center justify-between px-2">
        <div className="text-sm text-muted-foreground">
          Menampilkan {startItem}-{endItem} dari {total} data
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => onPageChange?.(page - 1)} disabled={page <= 1}>
            <ChevronLeft className="h-4 w-4" />
            Sebelumnya
          </Button>
          <div className="flex items-center space-x-1">
            {Array.from({ length: Math.min(5, total_pages) }, (_, i) => {
              const pageNum = i + 1
              return (
                <Button
                  key={pageNum}
                  variant={page === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => onPageChange?.(pageNum)}
                  className="w-8 h-8 p-0"
                >
                  {pageNum}
                </Button>
              )
            })}
          </div>
          <Button variant="outline" size="sm" onClick={() => onPageChange?.(page + 1)} disabled={page >= total_pages}>
            Selanjutnya
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{title}</CardTitle>
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-8 w-64"
              />
            </div>
            {onAdd && (
              <Button onClick={onAdd}>
                <Plus className="h-4 w-4 mr-2" />
                {addButtonText}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className={`rounded-md border ${maxHeight ? `${maxHeight} overflow-y-auto` : ''}`}>
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column, index) => (
                  <TableHead key={index} className={column.className}>
                    {column.label}
                  </TableHead>
                ))}
                {actions && (onEdit || onDelete) && <TableHead className="w-24">Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={columns.length + (actions ? 1 : 0)} className="text-center py-8">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                      <span className="ml-2">Memuat data...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length + (actions ? 1 : 0)}
                    className="text-center py-8 text-muted-foreground"
                  >
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              ) : (
                data.map((row, rowIndex) => (
                  <TableRow key={row.id || rowIndex}>
                    {columns.map((column, colIndex) => (
                      <TableCell key={colIndex} className={column.className}>
                        {column.render
                          ? column.render(getValue(row, column.key as string), row)
                          : getValue(row, column.key as string) || "-"}
                      </TableCell>
                    ))}
                    {actions && (onEdit || onDelete) && (
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          {onEdit && (
                            <Button variant="ghost" size="sm" onClick={() => onEdit(row)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {onDelete && (
                            <Button variant="ghost" size="sm" onClick={() => onDelete(row)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {pagination && <div className="mt-4">{renderPagination()}</div>}
      </CardContent>
    </Card>
  )
}
