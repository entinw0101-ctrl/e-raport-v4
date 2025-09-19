import { createServerClient as createSupabaseServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

/**
 * Khusus untuk Fluid compute: Jangan simpan client ini dalam
 * variabel global. Selalu buat client baru dalam setiap fungsi.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createSupabaseServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Method "setAll" dipanggil dari Server Component.
          // Ini bisa diabaikan jika middleware me-refresh
          // sesi pengguna.
        }
      },
    },
  })
}

export function createServerClient(cookieStore: any) {
  return createSupabaseServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Method "setAll" dipanggil dari Server Component.
          // Ini bisa diabaikan jika middleware me-refresh
          // sesi pengguna.
        }
      },
    },
  })
}
