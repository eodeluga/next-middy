import { EnrichedError, NextMiddyLifecycle } from 'next-middy/core'
import { ZodValidationError } from 'next-middy/zod'

/**
 * Zod specific error logging middleware.
 * Handles schema validation errors thrown by Zod.
 * Extends generic error behaviour by attaching validation details and paths.
 */
 /* eslint-disable @typescript-eslint/no-explicit-any */
export const zodErrorMiddle: NextMiddyLifecycle<any, any> = {
  onError: (error, req, res) => {
    if (res.headersSent) { return }
    if (!(error instanceof ZodValidationError) && error.name !== 'ZodValidationError') { return }

    const enrichedError = new EnrichedError({
      name: error.name ?? 'ZodValidationError',
      code: error.code ?? 'ValidationError',
      message: error.message ?? 'Schema validation failed',
      status: error.status ?? 400,
      details: error.details,
      path: error.path,
      method: req.method,
      url: req.url,
    })

    req.internal.error = enrichedError

    console.error(JSON.stringify(enrichedError, null, 2))

    const isDev = process.env.NODE_ENV === 'development'
    const verbose = process.env.MIDDY_VERBOSE_ERRORS === 'true'

    if (isDev || verbose) {
      res.status(enrichedError.status).json(enrichedError)
    } else {
      res.status(enrichedError.status).json({ code: enrichedError.code })
    }
  },
}
