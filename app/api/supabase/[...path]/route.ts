import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_URL = 'https://tdsexwuyjpcxhumnxxpi.supabase.co'

async function handler(request: NextRequest) {
  const { pathname, search } = new URL(request.url)
  const supabasePath = pathname.replace('/api/supabase', '')
  const targetUrl = `${SUPABASE_URL}${supabasePath}${search}`

  const headers = new Headers(request.headers)
  headers.set('host', 'tdsexwuyjpcxhumnxxpi.supabase.co')

  const body = request.method !== 'GET' && request.method !== 'HEAD'
    ? await request.arrayBuffer()
    : null

  const response = await fetch(targetUrl, {
    method: request.method,
    headers,
    body: body ? Buffer.from(body) : null,
  })

  const responseHeaders = new Headers(response.headers)
  responseHeaders.delete('content-encoding')

  return new NextResponse(response.body, {
    status: response.status,
    headers: responseHeaders,
  })
}

export const GET = handler
export const POST = handler
export const PUT = handler
export const PATCH = handler
export const DELETE = handler
export const OPTIONS = handler
