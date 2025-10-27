import { EnrichedError } from '../errors/enriched.error'
import { NextMiddyLifecycle } from '../utils/next-middy.util'

/**
 * Generic error logging middleware.
 * Captures and serialises all thrown errors.
 * Stores a raw copy in req.internal.error, and sends an HTTP response.
 */
export const errorMiddle: NextMiddyLifecycle<unknown, unknown> = {
  onError: async (error, req, res) => {
    if (res.headersSent) { return }

    const enrichedError = new EnrichedError({
      name: error.name ?? 'Error',
      code: 'code' in error ? error.code : 'InternalError',
      message: error.message ?? 'Unexpected error',
      status: 'status' in error ? error.status : 500,
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
      res.status(enrichedError.status).json({
        code: enrichedError.code,
        name: enrichedError.name,
      })
    }
  },
}
