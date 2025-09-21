import { z } from 'zod'
import type { ZodIssue } from 'zod/v3'
import type { NextMiddyApiRequest, NextMiddyLifecycle } from '@/utils/next-middy.util'
import { BaseError } from '@/types/base-error.type'

export class ZodValidationError extends BaseError {
  declare details: {
    scope?: string
    issues: ZodIssue[]
  }
  
  constructor(validationType: 'input' | 'output', error: z.ZodError, scope?: string) {
    super(400, `ZodValidationError: ${validationType}`, error.message, {
      ...(scope && { scope }),
      issues: error.issues.map((issue) => ({
        path: issue.path,
        message: issue.message,
      })),
    })
  }
}

// Middleware function for Zod validation
export const zodValidatorMiddle = <I extends z.ZodTypeAny, O extends z.ZodTypeAny>(
  inputSchema?: I, 
  outputSchema?: O
): NextMiddyLifecycle<z.infer<I>> => ({
  // Validates the request input
  before: (req: NextMiddyApiRequest<z.infer<I>>) => {
    if (inputSchema) {
      const result = inputSchema.safeParse(req.input)
      if (!result.success) {
        throw new ZodValidationError('input', result.error)
      }

      // Attach validated input to `req`
      req.input = result.data
    }
  },

  // Validates the response output
  after: (data: unknown) => {
    if (outputSchema) {
      const result = outputSchema.safeParse(data)
      if (!result.success) { 
        throw new ZodValidationError('output', result.error)
      }
    }
  },
})
