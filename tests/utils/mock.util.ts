import type { NextMiddyApiRequest, NextMiddyApiResponse } from 'next-middy-core'

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
 * Adds a writable `headersSent` property to a mock Next.js response object.
 *
 * The real Next.js `ServerResponse` has a read-only `headersSent` getter, 
 * but for testing middleware flow we often need to simulate its behaviour. 
 * This helper redefines the property as a writable boolean, allowing 
 * tests to toggle its value to emulate different response states.
 *
 * @template T - The response output type.
 * @param res - The mock response object to modify.
 * @throws If the property cannot be redefined (e.g. frozen object).
 */
function makeHeadersSentWritable<T>(
  res: NextMiddyApiResponse<T>,
  // value: boolean
): asserts res is NextMiddyApiResponse<T> & { headersSent: boolean } {
  Object.defineProperty(res, 'headersSent', {
    value: false,
    writable: true,
    configurable: true,
    enumerable: true,
  })
}

export { createMockContext, makeHeadersSentWritable }
