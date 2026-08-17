// src/lib/files.test.ts
import { describe, expect, it } from 'vitest'
import { displayPdfName, fileDownloadUrl, fileNameFromUrl, filePreviewUrl } from './files'

const RAW = 'https://res.cloudinary.com/demo/raw/upload/v1700000000/job-tracker/resumes/ada-cv-3f9c1b2e'

describe('fileNameFromUrl', () => {
  it('takes the last path segment', () => {
    expect(fileNameFromUrl(RAW)).toBe('ada-cv-3f9c1b2e')
  })

  it('decodes an escaped name', () => {
    expect(
      fileNameFromUrl('https://res.cloudinary.com/demo/raw/upload/Ada%20Lovelace%20CV'),
    ).toBe('Ada Lovelace CV')
  })

  it('falls back rather than throwing on a value that is not a URL', () => {
    // The stored value is validated as a Cloudinary URL on write, but a card
    // rendering a filename is not the place to discover that it wasn't.
    expect(fileNameFromUrl('', 'resume')).toBe('resume')
    expect(fileNameFromUrl('not a url', 'resume')).toBe('resume')
  })
})

describe('displayPdfName', () => {
  it('drops the upload suffix and adds the extension', () => {
    expect(displayPdfName(RAW)).toBe('ada-cv.pdf')
  })

  it('leaves a legacy Cloudinary id alone apart from the extension', () => {
    // Uploads from before the route named them have a random public id and no
    // suffix to strip. Nothing to recover — just don't mangle it.
    expect(
      displayPdfName('https://res.cloudinary.com/demo/raw/upload/kmgkwtebjqsomdujtos2'),
    ).toBe('kmgkwtebjqsomdujtos2.pdf')
  })

  it('does not strip a hex-looking fragment that is not the suffix', () => {
    expect(
      displayPdfName('https://res.cloudinary.com/demo/raw/upload/report-deadbeef-v2'),
    ).toBe('report-deadbeef-v2.pdf')
  })

  it('falls back when there is nothing to name', () => {
    expect(displayPdfName('', 'resume')).toBe('resume.pdf')
  })
})

describe('filePreviewUrl / fileDownloadUrl', () => {
  it('routes through the app rather than at Cloudinary', () => {
    // Cloudinary serves a raw asset as octet-stream/attachment, so a direct
    // link can only ever download. /api/files re-labels it — and is
    // ownership-scoped, which the public URL is not.
    expect(filePreviewUrl(RAW)).toBe(`/api/files?url=${encodeURIComponent(RAW)}`)
  })

  it('encodes the url so a query string in it cannot inject a parameter', () => {
    const hostile = 'https://res.cloudinary.com/demo/raw/upload/x?download=1&url=other'
    expect(filePreviewUrl(hostile)).toBe(`/api/files?url=${encodeURIComponent(hostile)}`)
    expect(filePreviewUrl(hostile)).not.toContain('&download=1&')
  })

  it('adds the download flag as a separate parameter', () => {
    expect(fileDownloadUrl(RAW)).toBe(`${filePreviewUrl(RAW)}&download=1`)
  })
})
