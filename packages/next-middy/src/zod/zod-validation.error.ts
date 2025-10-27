import { ZodError } from 'zod'

export class ZodValidationError extends Error {
  status = 400
  code = 'ValidationError'
  details: ZodError['issues']
  path?: string[]

  constructor(source: 'input' | 'output', error: ZodError) {
    super(`Zod ${source} validation failed`)
    this.name = 'ZodValidationError'
    this.details = error.issues
  }
}
