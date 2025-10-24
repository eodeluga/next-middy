import type { NextApiRequest, NextApiResponse } from 'next'

/**
 * Represents a structured middleware or handler error.
 */
interface NextMiddyError extends Error {
  status: number
  code: string
  details?: unknown
  path?: string[]
}

/**
 * Extended request object exposing parsed input and middleware state.
 */
interface NextMiddyApiRequest<I> extends NextApiRequest {
  input: I
  internal: {
    error?: NextMiddyError
    [key: string]: unknown
  }
}

/**
 * Extended response object exposing structured output.
 */
interface NextMiddyApiResponse<O> extends NextApiResponse {
  output?: O
}

/**
 * Middleware lifecycle definition used by nextMiddy.
 * Each lifecycle function can intercept, modify, or react to handler flow.
 */
interface NextMiddyLifecycle<I, O> {
  /**
   * Runs before the main handler executes.
   * Can read or modify `req.input` and perform setup or validation logic.
   */
  before?: (req: NextMiddyApiRequest<I>, res: NextApiResponse) => Promise<void> | void

  /**
   * Runs after the main handler completes successfully.
   * Receives the handler output for additional transformation or side effects.
   */
  after?: (req: NextMiddyApiRequest<I>, res: NextMiddyApiResponse<O>, data: O) => Promise<void> | void

  /**
   * Runs if an exception occurs during `before`, `handler`, or `after`.
   * Used for logging, cleanup, or consistent error response handling.
   */
  onError?: (err: NextMiddyError, req: NextMiddyApiRequest<I>, res: NextApiResponse) => Promise<void> | void
}

/**
 * Core handler signature used within nextMiddy pipelines.
 */
type NextMiddyHandlerFn<I, O> = (req: NextMiddyApiRequest<I>, res: NextMiddyApiResponse<O>) => Promise<O | void> | O | void

/**
 * A callable Next.js API handler extended with `.use()` for middleware chaining.
 */
interface NextMiddyHandler<I, O> {
  (req: NextMiddyApiRequest<I>, res: NextMiddyApiResponse<O>): Promise<void>
  use: (middleware: NextMiddyLifecycle<I, O>) => NextMiddyHandler<I, O>
}

/**
 * Factory that wraps a Next.js API handler with before/after/error middleware support.
 */
const nextMiddy = <I extends object = object, O extends object = object>(
  handler: NextMiddyHandlerFn<I, O>
): NextMiddyHandler<I, O> => {
  const middlewares: NextMiddyLifecycle<I, O>[] = []

  const apiHandler = (async (req: NextMiddyApiRequest<I>, res: NextMiddyApiResponse<O>): Promise<void> => {
    await executeHandler(req, res, handler, middlewares)
  }) as NextMiddyHandler<I, O>

  apiHandler.use = (middleware: NextMiddyLifecycle<I, O>): NextMiddyHandler<I, O> => {
    middlewares.push(middleware)
    return apiHandler
  }

  return apiHandler
}

const executeHandler = async <I, O>(
  req: NextMiddyApiRequest<I>,
  res: NextMiddyApiResponse<O>,
  handler: NextMiddyHandlerFn<I, O>,
  middlewares: NextMiddyLifecycle<I, O>[]
): Promise<void> => {
  if (!req.internal) { req.internal = {} }
  if (!req.input) { req.input = {} as I }

  // Populate req.input with query/body values if no middleware has done so.
  if (Object.keys(req.input ?? {}).length === 0) {
    // Strips internal Next.js params (e.g. `_rsc`) to avoid leaking them into input.
    const filteredQuery = Object.fromEntries(
      Object.entries(req.query).filter(([key]) => !key.startsWith('_'))
    )
    req.input = { ...filteredQuery, ...(req.body || {}) } as I
  }

  try {
    for (const middleware of middlewares) {
      if (middleware.before) {
        const prev = req.input
        await middleware.before(req, res)
        req.input = { ...prev, ...req.input }
        if (res.headersSent) { return }
      }
    }

    const handlerResult = await handler(req, res)
    if (res.headersSent) { return }

    if (handlerResult !== undefined) {
      res.output = handlerResult as O
    }

    for (const middleware of [...middlewares].reverse()) {
      if (middleware.after && res.output !== undefined) {
        await middleware.after(req, res, res.output)
      }
    }

    if (!res.headersSent) {
      res.status(200).json(res.output ? { ...res.output } : {})
    }

  } catch (err) {
    const isMiddyError = (e: unknown): e is NextMiddyError => typeof e === 'object'
      && e !== null
      && 'status' in e
      && 'code' in e

    const normalisedError: NextMiddyError = isMiddyError(err)
      ? err
      : {
        name: 'MiddlewareError',
        code: 'InternalError',
        message: err instanceof Error ? err.message : String(err),
        status: 500,
      }
    
    // Use `internal` as a middleware scratch pad
    req.internal.error = normalisedError

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
  type NextMiddyApiResponse,
  type NextMiddyLifecycle,
  type NextMiddyHandler,
  type NextMiddyHandlerFn,
  type NextMiddyError,
}
