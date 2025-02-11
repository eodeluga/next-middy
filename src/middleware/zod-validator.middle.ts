import { Middleware } from '@/types/middleware.type'
import { INextApiRequest } from '@/types/next.type'
import { NextApiResponse } from 'next'
import { z } from 'zod'

// Middleware function for Zod validation
export const zodValidatorMiddle = <I extends z.ZodTypeAny, O extends z.ZodTypeAny>(
  inputSchema: I, 
  outputSchema?: O
): Middleware<z.infer<I>> => ({
  // Validates the request input
  before: async (
    req: INextApiRequest<z.infer<I>>,
    res: NextApiResponse
  ) => {
    const targetValidation = {
      ...req.query,
      ...(req.body || {}),
    }

    const result = inputSchema.safeParse(targetValidation)
    if (!result.success) {
      res.status(401).json({
        error: 'No input found',
      })
      
      throw {
        code: 'ZodValidationError',
        message: 'Invalid input',
        detail: result.error.issues,
        path: ['zodValidator', 'before'],
      }
    }

    // Attach validated input to `req`
    req.input = result.data
  },

  // Validates the response output
  after: async (
    data: unknown,
    res: NextApiResponse
  ) => {
    if (outputSchema) {
      const result = outputSchema.safeParse(data)
      if (!result.success) {
        res.status(401).json({
          error: 'No output found',
        })
        throw {
          code: 'ZodValidationError',
          message: 'Invalid output',
          detail: result.error.issues,
          path: ['zodValidator', 'after'],
        }
      }
    }
  },
})
