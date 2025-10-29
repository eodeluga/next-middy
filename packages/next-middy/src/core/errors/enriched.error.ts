type EnrichedErrorType = {
  code: string
  message: string
  name: string
  status: number
  details?: unknown
  method?: string
  path?: string[]
  timestamp?: string
  url?: string
}

/**
 * Type guard helper for safely narrowing unknown values to EnrichedError.
 */
const isEnrichedError = (value: unknown): value is EnrichedError => {
  return (
    value instanceof EnrichedError || (
      typeof value === 'object'
      && value !== null
      && 'timestamp' in value
      && 'code' in value
      && 'status' in value
    )
  )
}
  
/**
 * Enriched error with request-specific metadata attached.
 * Extends BaseError for runtime identification.
 */
class EnrichedError extends Error {
  code: string
  message: string
  name: string
  status: number
  details?: unknown
  method?: string
  path?: string[]
  timestamp?: string
  url?: string

  constructor(init: EnrichedErrorType) {
    super(init.message)
    this.code = init.code
    this.message = init.message
    this.name = init.name ?? 'EnrichedError'
    this.status = init.status
    this.details = init.details
    this.method = init.method
    this.path = init.path
    this.timestamp = new Date().toISOString()
    this.url = init.url
    Error.captureStackTrace?.(this, EnrichedError)
  }
}

export { isEnrichedError, EnrichedError }
