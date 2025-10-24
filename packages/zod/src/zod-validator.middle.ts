import { z } from 'zod'
import type { NextMiddyApiRequest, NextMiddyApiResponse, NextMiddyLifecycle } from '../../core/src/utils/next-middy.util'
import { ZodValidationError } from './zod-validation.error'

/**
 * Middleware for validating request input and response output using Zod schemas.
 * Automatically parses and attaches validated data to `req.input` and `res.output`.
 */
export const zodValidatorMiddle = <I extends z.ZodTypeAny, O extends z.ZodTypeAny>(
  inputSchema?: I,
  outputSchema?: O
): NextMiddyLifecycle<z.infer<I>, z.infer<O>> => ({
  // Validates the request input
  before: (req: NextMiddyApiRequest<z.infer<I>>) => {
    if (!inputSchema) { return }
    
    const parsed = inputSchema.safeParse(req.input)
    if (!parsed.success) {
      throw new ZodValidationError('input', parsed.error)
    }

    // Attach validated input to `req`
    req.input = parsed.data
  },

  // Validates the response output
  after: (_, res: NextMiddyApiResponse<z.infer<O>>) => {
    if (!outputSchema) { return }
    
    const parsed = outputSchema.safeParse(res.output)
    if (!parsed.success) { 
      throw new ZodValidationError('output', parsed.error)
    }

    // Attach validated output
    res.output = parsed.data
  }
})
