import type { NextMiddyApiRequest, NextMiddyApiResponse } from '../../packages/core/src/utils/next-middy.util'

/** 
 * Mock minimal Next.js request/response
 * @param input I
 */
const createMockContext = <I, O>(input: I) => {
  const req: NextMiddyApiRequest<I> = {
    method: 'POST',
    url: '/api/test',
    headers: {},
    query: {},
    cookies: {},
    env: {} as any,
    body: input,
    input,
    internal: {},
  } as any // we allow `as any` here to avoid filling every Next.js property

  const res: NextMiddyApiResponse<O> = {
    statusCode: 200,
    output: undefined,
    headers: {},
    setHeader() {},
    getHeader() { return undefined },
    getHeaders() { return {} },
    hasHeader() { return false },
    removeHeader() {},
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(payload: any) {
      this.output = payload
      return this
    },
  } as any

  return { req, res }
}

/**
 * Makes a read /write version of res.headersSent
 * @param res NextMiddyApiResponse<T>
 */
function markHeadersSentRW<T>(
  res: NextMiddyApiResponse<T>,
  // value: boolean
): asserts res is NextMiddyApiResponse<T> & { headersSent: boolean } {
  Object.defineProperty(res, 'headersSent', { value: false, configurable: true })
}

export { createMockContext, markHeadersSentRW }
