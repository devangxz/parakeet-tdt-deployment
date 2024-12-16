import axios from 'axios'
import { NextResponse } from 'next/server'

import { getAllowedMimeTypes } from '@/utils/validateFileType'

interface ValidationResponse {
  isValid: boolean
  error?: string
  contentType?: string
  contentLength?: string
}

function validateContentType(contentType: string): ValidationResponse {
  if (!contentType) {
    return {
      isValid: false,
      error: 'Content type not provided by the server',
    }
  }

  const baseContentType = contentType.split(';')[0].toLowerCase().trim()
  const isAllowedMimeType = getAllowedMimeTypes().includes(baseContentType)

  if (!isAllowedMimeType) {
    return {
      isValid: false,
      error: `Content type ${baseContentType} is not supported`,
    }
  }

  return {
    isValid: true,
    contentType: baseContentType,
  }
}

async function getFileSize(url: string): Promise<string | null> {
  try {
    const response = await axios.get(url, {
      responseType: 'stream',
      timeout: 120000,
      maxRedirects: 5,
      validateStatus: (status) => status === 200,
    })

    let size = 0
    let dataReceived = false

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        response.data.destroy()
        resolve(dataReceived ? size.toString() : null)
      }, 180000)

      response.data.on('data', (chunk: Buffer) => {
        dataReceived = true
        size += chunk.length
      })

      response.data.on('end', () => {
        clearTimeout(timeout)
        resolve(size > 0 ? size.toString() : null)
      })

      response.data.on('error', () => {
        clearTimeout(timeout)
        response.data.destroy()
        resolve(null)
      })
    })
  } catch {
    return null
  }
}

async function validateURL(url: string): Promise<ValidationResponse> {
  try {
    const headResponse = await axios.head(url, {
      timeout: 60000,
      maxRedirects: 5,
      validateStatus: (status) => status === 200,
    })

    const contentTypeValidation = validateContentType(
      headResponse.headers['content-type']
    )
    if (!contentTypeValidation.isValid) {
      return contentTypeValidation
    }

    let contentLength = headResponse.headers['content-length']

    if (!contentLength) {
      contentLength = await getFileSize(url)
    }

    if (!contentLength) {
      return {
        isValid: false,
        error: 'Unable to determine file size. Please try a different URL.',
      }
    }

    return {
      isValid: true,
      contentType: contentTypeValidation.contentType,
      contentLength,
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        return {
          isValid: false,
          error: 'Connection timeout while validating URL',
        }
      }
      if (error.response?.status === 404) {
        return {
          isValid: false,
          error: 'File not found',
        }
      }
      if (error.response?.status === 403) {
        return {
          isValid: false,
          error: 'Access to file is forbidden',
        }
      }
    }

    return {
      isValid: false,
      error: 'Failed to validate URL',
    }
  }
}

export async function POST(req: Request) {
  try {
    const { url, method = 'GET', range } = await req.json()

    if (method === 'HEAD') {
      const validationResult = await validateURL(url)
      if (!validationResult.isValid) {
        return NextResponse.json(
          { error: validationResult.error },
          { status: 400 }
        )
      }

      return NextResponse.json({
        contentType: validationResult.contentType,
        contentLength: validationResult.contentLength,
      })
    }

    const headers: Record<string, string> = {}
    if (range) {
      headers['Range'] = range
    }

    const response = await fetch(url, { headers })

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.statusText}`)
    }

    const responseHeaders: Record<string, string> = {
      'Content-Type':
        response.headers.get('content-type') || 'application/octet-stream',
    }

    const contentLength = response.headers.get('content-length')
    if (contentLength) {
      responseHeaders['Content-Length'] = contentLength
    }

    const contentRange = response.headers.get('content-range')
    if (contentRange) {
      responseHeaders['Content-Range'] = contentRange
    }

    return new NextResponse(response.body, { headers: responseHeaders })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Download failed',
      },
      { status: 500 }
    )
  }
}
