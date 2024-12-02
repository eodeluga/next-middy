import { INextRequest } from '@/types/next.type'
import { z } from 'zod'

// Middleware function for Zod validation
export const zodValidatorMiddle = <
  I extends z.ZodTypeAny,
  O extends z.ZodTypeAny,
  T = z.infer<I>
>(
  inputSchema: I,
  outputSchema?: O
) => ({
  // Validates the request input
  before: async (req: INextRequest<T>) => {
    const targetValidation = {
      ...req.query,
      ...(req.body || {}),
    }

    const result = inputSchema.safeParse(targetValidation)
    if (!result.success) {
      throw result.error.issues
    }

    // Attach validated input to `req`
    req.input = result.data as T
  },

  // Validates the response output
  after: async (data: unknown) => {
    if (outputSchema) {
      const result = outputSchema.safeParse(data)
      if (!result.success) {
        throw {
          code: 'ZodValidationError',
          message: 'Invalid output',
          detail: result.error.errors,
          path: ['zodValidator', 'after'],
        }
      }
    }
  },
})
