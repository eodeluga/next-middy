import { Middleware } from '@/types/middleware.type'
import { INextApiRequest } from '@/types/next.type'
import { ZodValidationError } from '@/utils/errors.util'
import { z } from 'zod'

// Middleware function for Zod validation
export const ZodValidatorMiddle = <I extends z.ZodTypeAny, O extends z.ZodTypeAny>(
  inputSchema?: I, 
  outputSchema?: O
): Middleware<z.infer<I>> => ({
  // Validates the request input
  before: async (req: INextApiRequest<z.infer<I>>) => {
    if (inputSchema) {
      // Parse the request body
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body

      const targetValidation = {
        ...req.query,
        ...(body || {}),
      }

      const result = inputSchema.safeParse(targetValidation)
      if (!result.success) {
        throw new ZodValidationError('input', result.error.issues)
      }

      // Attach validated input to `req`
      req.input = result.data
    }
  },

  // Validates the response output
  after: async (data: unknown) => {
    if (outputSchema) {
      const result = outputSchema.safeParse(data)
      if (!result.success) { 
        throw new ZodValidationError('output', result.error.issues)
      }
    }
  },
})
