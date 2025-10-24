import type { NextMiddyApiRequest, NextMiddyApiResponse } from '../../packages/core/src/utils/next-middy.util'

// Mock minimal but type-complete Next.js request/response
export const createMockContext = <I, O>(input: I) => {
  const req: NextMiddyApiRequest<I> = {
    // --- Required NextApiRequest fields ---
    method: 'POST',
    url: '/api/test',
    headers: {},
    query: {},
    cookies: {},
    env: {} as any,
    // --- NextMiddy additions ---
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
