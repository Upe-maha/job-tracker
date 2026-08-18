// tests/unit/server/http/validate.test.ts
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { parseBody, parseQuery, toObjectId } from '@/server/http/validate'

const schema = z.object({ name: z.string().min(1, { error: 'Name is required' }) })

function jsonRequest(body: string, headers: Record<string, string> = {}) {
  return new Request('http://localhost/api/test', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body,
  })
}

describe('parseBody', () => {
  it('returns typed data for a valid body', async () => {
    const result = await parseBody(jsonRequest('{"name":"Ada"}'), schema)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data).toEqual({ name: 'Ada' })
  })

  it('rejects a non-JSON content type with 415', async () => {
    const req = new Request('http://localhost/api/test', {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: 'name=Ada',
    })
    const result = await parseBody(req, schema)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.response.status).toBe(415)
  })

  it('rejects malformed JSON with 400, not 500', async () => {
    const result = await parseBody(jsonRequest('{not json'), schema)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.response.status).toBe(400)
  })

  it('rejects a non-object body', async () => {
    const result = await parseBody(jsonRequest('[1,2,3]'), schema)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.response.status).toBe(400)
  })

  it('surfaces the schema message on a validation failure', async () => {
    const result = await parseBody(jsonRequest('{"name":""}'), schema)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.response.status).toBe(400)
      await expect(result.response.json()).resolves.toEqual({ error: 'Name is required' })
    }
  })

  // The cap used to be skipped whenever content-length was absent or garbage.
  it('enforces the size cap on bytes read, with no content-length header', async () => {
    const big = JSON.stringify({ name: 'a'.repeat(200 * 1024) })
    const req = jsonRequest(big)
    req.headers.delete('content-length')
    const result = await parseBody(req, schema)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.response.status).toBe(413)
  })

  it('ignores a garbage content-length and still caps on bytes read', async () => {
    const big = JSON.stringify({ name: 'a'.repeat(200 * 1024) })
    const result = await parseBody(jsonRequest(big, { 'content-length': 'abc' }), schema)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.response.status).toBe(413)
  })

  // Zod strips unknown keys — this is what replaced pickAllowed's allowlists.
  it('strips unknown keys so ownership fields cannot be mass-assigned', async () => {
    const result = await parseBody(
      jsonRequest('{"name":"Ada","user":"someone-else","_id":"forged"}'),
      schema,
    )
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data).toEqual({ name: 'Ada' })
  })

  it('strips Mongo operator keys before the schema sees them', async () => {
    const result = await parseBody(jsonRequest('{"name":"Ada","$gt":""}'), schema)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data).toEqual({ name: 'Ada' })
  })
})

describe('parseQuery', () => {
  const querySchema = z.object({
    type: z.string().optional(),
    limit: z.coerce.number().min(1).max(50).default(20),
  })

  it('applies defaults when a param is absent', () => {
    const result = parseQuery(new URLSearchParams(''), querySchema)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.limit).toBe(20)
  })

  it('coerces a present param', () => {
    const result = parseQuery(new URLSearchParams('limit=5'), querySchema)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.limit).toBe(5)
  })

  it('rejects an out-of-range value with 400', () => {
    const result = parseQuery(new URLSearchParams('limit=999'), querySchema)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.response.status).toBe(400)
  })

  // An empty param is a present empty string, not an absent one — it must not
  // silently coerce to 0.
  it('rejects an empty numeric param rather than defaulting it', () => {
    const result = parseQuery(new URLSearchParams('limit='), querySchema)
    expect(result.ok).toBe(false)
  })
})

describe('toObjectId', () => {
  it('accepts a valid ObjectId string and rejects anything else', () => {
    expect(toObjectId('507f1f77bcf86cd799439011')).toBe('507f1f77bcf86cd799439011')
    expect(toObjectId('nope')).toBeNull()
    expect(toObjectId(null)).toBeNull()
    expect(toObjectId(123)).toBeNull()
  })
})
