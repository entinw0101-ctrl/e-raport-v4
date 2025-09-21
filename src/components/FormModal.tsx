"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { id } from "date-fns/locale"

export interface FormField {
   name: string
   label: string
   type: "text" | "email" | "number" | "textarea" | "select" | "date" | "file"
   required?: boolean
   placeholder?: string
   options?: { value: string | number; label: string }[]
   accept?: string // untuk file input
   multiple?: boolean // untuk file input
   rows?: number // untuk textarea
   min?: number // untuk number input
   max?: number // untuk number input
   disabled?: boolean
   className?: string
   onChange?: (value: any) => void
 }

export interface FormModalProps {
  title: string
  fields: FormField[] | ((formData: Record<string, any>) => FormField[])
  initialData?: Record<string, any>
  open: boolean
  onClose: () => void
  onSubmit: (data: Record<string, any>) => Promise<void>
  loading?: boolean
  submitText?: string
  cancelText?: string
}

export function FormModal({
  title,
  fields,
  initialData = {},
  open,
  onClose,
  onSubmit,
  loading = false,
  submitText = "Simpan",
  cancelText = "Batal",
}: FormModalProps) {
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open) {
      setFormData(initialData)
      setErrors({})
    }
  }, [open, initialData])

  const handleInputChange = (name: string, value: any) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }))
    }

    // Call onChange callback if provided
    const field = currentFields.find(f => f.name === name)
    if (field?.onChange) {
      field.onChange(value)
    }
  }

  const currentFields = typeof fields === "function" ? fields(formData) : fields

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    currentFields.forEach((field) => {
      if (field.required && !formData[field.name]) {
        newErrors[field.name] = `${field.label} wajib diisi`
      }

      if (field.type === "email" && formData[field.name]) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(formData[field.name])) {
          newErrors[field.name] = "Format email tidak valid"
        }
      }

      if (field.type === "number" && formData[field.name]) {
        const num = Number(formData[field.name])
        if (isNaN(num)) {
          newErrors[field.name] = "Harus berupa angka"
        } else {
          if (field.min !== undefined && num < field.min) {
            newErrors[field.name] = `Minimal ${field.min}`
          }
          if (field.max !== undefined && num > field.max) {
            newErrors[field.name] = `Maksimal ${field.max}`
          }
        }
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    try {
      await onSubmit(formData)
      onClose()
    } catch (error) {
      console.error("Form submission error:", error)
    }
  }

  const renderField = (field: FormField) => {
    const value = formData[field.name] || ""
    const error = errors[field.name]

    switch (field.type) {
      case "textarea":
        return (
          <Textarea
            id={field.name}
            value={value}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            disabled={field.disabled || loading}
            rows={field.rows || 3}
            className={field.className}
          />
        )

      case "select":
        return (
          <Select
            value={value.toString()}
            onValueChange={(val) => handleInputChange(field.name, val)}
            disabled={field.disabled || loading}
          >
            <SelectTrigger className={field.className}>
              <SelectValue placeholder={field.placeholder || `Pilih ${field.label}`} />
            </SelectTrigger>
            <SelectContent className="max-h-60 overflow-y-auto">
              {field.options?.map((option) => (
                <SelectItem key={option.value} value={option.value.toString()}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case "date":
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={`w-full justify-start text-left font-normal ${field.className} ${!value && "text-muted-foreground"}`}
                disabled={field.disabled || loading}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {value ? format(new Date(value), "dd MMMM yyyy", { locale: id }) : field.placeholder || "Pilih tanggal"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={value ? new Date(value) : undefined}
                onSelect={(date) => handleInputChange(field.name, date?.toISOString())}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        )

      case "file":
        return (
          <Input
            id={field.name}
            type="file"
            onChange={(e) => handleInputChange(field.name, e.target.files)}
            accept={field.accept}
            multiple={field.multiple}
            disabled={field.disabled || loading}
            className={field.className}
          />
        )

      default:
        return (
          <Input
            id={field.name}
            type={field.type}
            value={value}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            disabled={field.disabled || loading}
            min={field.min}
            max={field.max}
            className={field.className}
          />
        )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentFields.map((field) => (
              <div key={field.name} className={field.type === "textarea" ? "md:col-span-2" : ""}>
                <Label htmlFor={field.name}>
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </Label>
                {renderField(field)}
                {errors[field.name] && <p className="text-sm text-red-500 mt-1">{errors[field.name]}</p>}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              {cancelText}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Menyimpan..." : submitText}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
