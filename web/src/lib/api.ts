import type { ApiResponse } from '@/types/git'

export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })
  const payload = await response.json() as ApiResponse<T>

  if (!response.ok || !payload.ok || payload.data === undefined) {
    throw new Error(payload.error ?? 'Request failed')
  }

  return payload.data
}
