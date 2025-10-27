import { EnrichedError } from 'next-middy-core/errors'
import { NextMiddyLifecycle } from 'next-middy-core'
import { ZodValidationError } from './zod-validation.error.js'

/**
 * Zod specific error logging middleware.
 * Handles schema validation errors thrown by Zod.
 * Extends generic error behaviour by attaching validation details and paths.
 */
export const zodErrorMiddle: NextMiddyLifecycle<unknown, unknown> = {
  onError: async (error, req, res) => {
    if (res.headersSent) { return }
    if (!(error instanceof ZodValidationError)) { return }

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

    res.status(enrichedError.status).json({
      error: enrichedError.code,
      issues: error.details,
    })
  },
}
