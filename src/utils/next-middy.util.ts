import type { NextApiHandler, NextApiRequest, NextApiResponse } from 'next/types'

interface NextMiddyLifecycle<I = object, O = unknown> {
  before?: (req: NextMiddyApiRequest<I>, res: NextApiResponse) => Promise<void> | void 
  after?: (req: NextMiddyApiRequest<I>, res: NextApiResponse, data: O) => Promise<void> | void
  onError?: (err: NextMiddyError, req: NextMiddyApiRequest<I>, res: NextApiResponse) => Promise<void> | void
}

// Extending NextApiRequest to include `input`
interface NextMiddyApiRequest<T> extends NextApiRequest {
  input: T
  internal: {
    error?: NextMiddyError
    [key: string]: unknown
  }
}

interface NextMiddyHttp<T> {
  (req: NextMiddyApiRequest<T>, res: NextApiResponse): Promise<void> | void
}

interface NextMiddyError extends Error {
  status: number
  code: string
  details?: unknown
  path?: string[]
}

type NextMiddyHandler<T> = NextApiHandler & {
  use: (middleware: NextMiddyLifecycle<T>) => NextMiddyHandler<T>
}

const nextMiddy = <T = object>(handler: NextMiddyHttp<T>): NextMiddyHandler<T> => {
  const middlewares: NextMiddyLifecycle<T>[] = []
  
  // Let instances be callable like a NextApiHandler
  const apiHandler: NextMiddyHandler<T> = ((req: NextMiddyApiRequest<T>, res) =>
    executeHandler(req, res, handler, middlewares)) as NextMiddyHandler<T>
    
  // attach .use() to the function
  apiHandler.use = (middleware: NextMiddyLifecycle<T>) => {
    middlewares.push(middleware)
    return apiHandler
  }
  
  return apiHandler
}

// Execute all middleware and the handler
const executeHandler = async <T>(
  req: NextMiddyApiRequest<T>,
  res: NextApiResponse,
  handler: NextMiddyHttp<T>,
  middlewares: NextMiddyLifecycle<T>[]
) => {
  // Initialise properties
  if (!req.internal) { req.internal = {} }
  if (!req.input) { req.input = {} as T }
  
  // Populate req.input with query/body values if no middleware has done so.
  if (Object.keys(req.input ?? {}).length === 0) {
    // Strips internal Next.js params (e.g. `_rsc`) to avoid leaking them into input.
    const filteredQuery = Object.fromEntries(
      Object.entries(req.query).filter(([key]) => !key.startsWith('_'))
    )
    req.input = { ...filteredQuery, ...(req.body || {}) } as T
  }
  
  try {
    // `before` middleware run in order
    for (const middleware of middlewares) {
      if (middleware.before) {
        // Merge the input object with the previous input
        const previousInput = req.input
        await middleware.before(req, res)
        req.input = { ...previousInput, ...req.input }
        if (res.headersSent) { return }
      }
    }
    
    // handler
    const handlerResponse = await handler(req, res)
    if (res.headersSent) { return }

    // `after` middleware run in reverse order
    for (const middleware of [...middlewares].reverse()) {
      if (middleware.after) {
        await middleware.after(req, res, handlerResponse)
      }
    }

  } catch (error) {
    const isMiddlewareError = (e: unknown): e is NextMiddyError => typeof e === 'object'
      && e !== null 
      && ('status' in e && typeof e.status === 'number')
      && ('code' in e && typeof e.code === 'string')
    
    const normalisedError = isMiddlewareError(error)
      ? error
      : {
        name: 'MiddlewareError',
        code: 'InternalError',
        message: 'An internal error has occurred',
        details: error instanceof Error ? error.message : String(error),
        status: 500,
      } satisfies NextMiddyError
    
    // Use `internal` as a middleware scratch pad
    req.internal.error = normalisedError
    
    // Run `onError` middleware in reverse order
    for (const middleware of [...middlewares].reverse()) {
      if (middleware.onError) {
        try {
          await middleware.onError(normalisedError, req, res)
        } catch (middlewareError) {
          console.error('Middleware onError failed:', middlewareError)
        }
      }
    }
    
    // Fallback only if no middleware responded
    if (!res.headersSent) {
      res.status(normalisedError.status).json({
        error: normalisedError.code,
        message: normalisedError.message,
      })
    }
  }
}

export {
  nextMiddy,
  type NextMiddyApiRequest,
  type NextMiddyLifecycle,
}
