import { z } from 'zod'
import { NextApiRequest, NextApiResponse } from 'next'
import { logError } from '@utils/error.util'

declare module 'next' {
  interface NextApiRequest {
    validatedInput?: unknown // Replace `any` with your expected validated input type if known
  }
}

export const zodValidator = <I extends z.ZodTypeAny, O extends z.ZodTypeAny>(
  inputSchema: I,
  outputSchema?: O
) => ({
  // Validates the request input
  before: async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      // Combine query, body, and headers into a single object for validation
      const targetValidation = {
        ...req.query,
        ...(req.body || {}),
      }

      // Validate the input using Zod
      const result = inputSchema.safeParse(targetValidation)
      if (!result.success) {
        res.status(400).json({
          message: 'Invalid input',
          errors: result.error.errors,
        })
        return // Stop further processing
      }

      // Attach validated input to `req`
      req.validatedInput = result.data
    } catch (e) {
      logError({
        code: 'ZodValidationError',
        message: 'Invalid input',
        path: ['zodValidator', 'before'],
        detail: (e as z.ZodError).errors?.[0]?.message || 'Unknown error',
      })

      res.status(400).json({
        message: 'Invalid input',
        error: (e as z.ZodError)?.message || 'An error occurred',
      })
    }
  },

  // Validates the response output
  after: async (req: NextApiRequest, res: NextApiResponse, data: unknown) => {
    if (outputSchema) {
      try {
        // Validate the response using Zod
        const result = outputSchema.safeParse(data)
        if (!result.success) {
          logError({
            code: 'ZodValidationError',
            message: 'Invalid output',
            path: ['zodValidator', 'after'],
            detail: result.error.errors?.[0]?.message || 'Unknown error',
          })
          throw new Error('Invalid output')
        }
      } catch (e) {
        logError({
          code: 'ZodValidationError',
          message: 'Invalid output',
          path: ['zodValidator', 'after'],
          detail: (e as z.ZodError).errors?.[0]?.message || 'Unknown error',
        })

        res.status(500).json({
          message: 'Invalid output',
          error: (e as z.ZodError)?.message || 'An error occurred',
        })
      }
    }
  },
})
