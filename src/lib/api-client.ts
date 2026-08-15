// src/lib/api-client.ts
//
// The client half of the API contract. Every route answers a failure as
// `{ error: string }` (see @/lib/api/respond), so error handling belongs in
// one place rather than being re-derived at each call site — several of which
// previously ignored `res.ok` entirely and reported success on a 400.

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function toApiError(res: Response): Promise<ApiError> {
  // A route can still fail before it produces a JSON body (a proxy 502, say),
  // so never assume the envelope is there.
  let message = 'Something went wrong'
  try {
    const body = await res.json()
    if (body && typeof body.error === 'string') message = body.error
  } catch {
    // keep the default
  }
  return new ApiError(res.status, message)
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init)
  if (!res.ok) throw await toApiError(res)
  return res.json() as Promise<T>
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>(path)
}

// The JSON content type is required, not cosmetic: readJsonBody answers 415
// without it. It was hand-written at all 13 call sites.
export function apiSend<T>(
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown
): Promise<T> {
  return request<T>(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

// Multipart, for /api/upload only. The x-upload-request header forces a CORS
// preflight the app never answers — omitting it is a silent 403, which is
// exactly why it belongs here rather than at each caller.
export function apiUpload<T>(path: string, form: FormData): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    headers: { 'x-upload-request': '1' },
    body: form,
  })
}
