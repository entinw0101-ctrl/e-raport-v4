import { prisma } from './prisma'

export interface AuditLogData {
  admin_id?: number
  action: 'CREATE' | 'UPDATE' | 'DELETE'
  table_name: string
  record_id?: string
  old_values?: any
  new_values?: any
  description?: string
  ip_address?: string
  user_agent?: string
}

export async function createAuditLog(data: AuditLogData) {
  try {
    await prisma.auditLog.create({
      data: {
        admin_id: data.admin_id,
        action: data.action,
        table_name: data.table_name,
        record_id: data.record_id,
        old_values: data.old_values ? JSON.stringify(data.old_values) : null,
        new_values: data.new_values ? JSON.stringify(data.new_values) : null,
        description: data.description,
        ip_address: data.ip_address,
        user_agent: data.user_agent,
      },
    })
  } catch (error) {
    console.error('Failed to create audit log:', error)
    // Don't throw error to avoid breaking the main operation
  }
}

export function getClientInfo(request: Request): { ip_address?: string; user_agent?: string } {
  const ip_address = request.headers.get('x-forwarded-for') ||
                     request.headers.get('x-real-ip') ||
                     'unknown'

  const user_agent = request.headers.get('user-agent') || 'unknown'

  return { ip_address, user_agent }
}