import type { NextApiRequest, NextApiResponse } from 'next'

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const defineIdentityPreservingProperty = <Host extends object, Key extends keyof Host>(
  host: Host,
  key: Key,
  initialValue: Host[Key]
): void => {
  let backingValue = initialValue

  Object.defineProperty(host, key, {
    configurable: true,
    enumerable: true,
    get: () => backingValue,
    set: (nextValue: Host[Key]) => {
      if (isPlainObject(backingValue) && isPlainObject(nextValue)) {
        Object.assign(
          backingValue as Record<string, unknown>,
          nextValue as Record<string, unknown>
        )
        return
      }

      backingValue = nextValue
    },
  })
}

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
 * Extended Next.js request object used internally by next-middy.
 */
interface NextMiddyApiRequest<I> extends NextApiRequest {
  input: I
  /**
   * This property is a scratch pad for middleware, and is intentionally untyped to avoid casts
   */
  /* eslint-disable @typescript-eslint/no-explicit-any */
  internal: Record<string, any>
  /* eslint-enable @typescript-eslint/no-explicit-any */
  method?: string
  url?: string
}

/**
 * Extended Next.js response object used internally by next-middy.
 * Adds convenience fields and explicitly redefines known runtime props.
 */
interface NextMiddyApiResponse<O> extends NextApiResponse<O> {
  output?: O
  headersSent: boolean
  status: (code: number) => this
  /**
   * This mirrors `NextApiResponse['json']` which also accepts `any` in Next.js types:
  */
  /* eslint-disable @typescript-eslint/no-explicit-any */
  json: (body: any) => this
  /* eslint-enable @typescript-eslint/no-explicit-any */
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
  before?: (req: NextMiddyApiRequest<I>, res: NextMiddyApiResponse<O>) => Promise<void> | void

  /**
   * Runs after the main handler completes successfully.
   * Receives the handler output for additional transformation or side effects.
   */
  after?: (req: NextMiddyApiRequest<I>, res: NextMiddyApiResponse<O>, output: O) => Promise<void> | void

  /**
   * Runs if an exception occurs during `before`, `handler`, or `after`.
   * Used for logging, cleanup, or consistent error response handling.
   */
  onError?: (
    err: NextMiddyError,
    /* eslint-disable @typescript-eslint/no-explicit-any */
    /**
    * `req.input` is untyped to avoid casts.
    */
    req: NextMiddyApiRequest<any>,
    /**
    * `res.output` is untyped to avoid casts.
    */
    res: NextMiddyApiResponse<any>
    /* eslint-enable @typescript-eslint/no-explicit-any */
  ) => Promise<void> | void
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
const nextMiddy = <I extends object = object, O extends object | unknown = unknown>(
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

const executeHandler = async <I extends object, O>(
  req: NextMiddyApiRequest<I>,
  res: NextMiddyApiResponse<O>,
  handler: NextMiddyHandlerFn<I, O>,
  middlewares: NextMiddyLifecycle<I, O>[]
): Promise<void> => {
  if (!req.internal) { req.internal = {} }

  const initialInput = (isPlainObject(req.input) ? req.input : {}) as I
  defineIdentityPreservingProperty(req, 'input', initialInput)
  defineIdentityPreservingProperty(res, 'output', res.output as O | undefined)

  // Populate req.input with query/body values if no middleware has done so.
  if (Object.keys(initialInput).length === 0) {
    // Strips internal Next.js params (e.g. `_rsc`) to avoid leaking them into input.
    const filteredQuery = Object.fromEntries(
      Object.entries(req.query).filter(([key]) => !key.startsWith('_'))
    )
    Object.assign(initialInput, filteredQuery, req.body || {})
  }

  try {
    for (const middleware of middlewares) {
      if (middleware.before) {
        await middleware.before(req, res)
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
      const isDev = process.env.NODE_ENV === 'development'
      const verbose = process.env.MIDDY_VERBOSE_ERRORS === 'true'

      if (isDev || verbose) {
        // Add the normally stripped non‑enumerable error properties to the response
        res.status(normalisedError.status).json({
          ...normalisedError,
          message: normalisedError.message,
          ...(normalisedError instanceof Error
            ? { stack: normalisedError.stack }
            : {}),
        })
      } else {
        res.status(normalisedError.status).json({ code: normalisedError.code })
      }
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
