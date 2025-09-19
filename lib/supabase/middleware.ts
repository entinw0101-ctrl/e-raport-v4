import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // Dengan Fluid compute, jangan simpan client ini dalam variabel
  // environment global. Selalu buat yang baru pada setiap request.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    },
  )

  // Jangan jalankan kode antara createServerClient dan
  // supabase.auth.getUser(). Kesalahan sederhana bisa membuat debug
  // masalah pengguna yang logout secara acak menjadi sangat sulit.

  // PENTING: Jika Anda menghapus getUser() dan menggunakan server-side rendering
  // dengan Supabase client, pengguna mungkin logout secara acak.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Redirect ke login jika tidak ada user dan bukan di halaman auth
  if (
    request.nextUrl.pathname !== "/" &&
    !user &&
    !request.nextUrl.pathname.startsWith("/login") &&
    !request.nextUrl.pathname.startsWith("/auth")
  ) {
    const url = request.nextUrl.clone()
    url.pathname = "/auth/login"
    return NextResponse.redirect(url)
  }

  // PENTING: Anda *harus* mengembalikan objek supabaseResponse apa adanya.
  // Jika Anda membuat objek response baru dengan NextResponse.next() pastikan untuk:
  // 1. Pass request di dalamnya, seperti ini:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy cookies, seperti ini:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Ubah objek myNewResponse sesuai kebutuhan, tapi hindari mengubah
  //    cookies!
  // 4. Terakhir:
  //    return myNewResponse
  // Jika ini tidak dilakukan, browser dan server bisa tidak sinkron
  // dan mengakhiri sesi pengguna secara prematur!

  return supabaseResponse
}
