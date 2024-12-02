import { NextApiHandler, NextApiResponse } from 'next/types'
import { Middleware } from '@/types/middleware.type'
import { INextHandler, INextRequest } from '@/types/next.type'
import { ErrorObj } from '@/types/error-obj.type'

class NextMiddy<T> {
  private handler: INextHandler<T>
  private middlewares: Middleware<T>[] = []

  constructor(handler: INextHandler<T>) {
    this.handler = handler
  }

  // Add middleware to the chain
  use(middleware: Middleware<T>): this {
    this.middlewares.push(middleware)
    return this
  }

  // Execute all middleware and the handler
  private async executeHandler(req: INextRequest<T>, res: NextApiResponse) {
    try {
      // Run `before` middleware in order
      for (const middleware of this.middlewares) {
        if (middleware.before) {
          await middleware.before(req, res)
          if (res.headersSent) return
        }
      }

      // Run the main handler
      const handlerResponse = await this.handler(req, res)
      if (res.headersSent) return

      // Run `after` middleware in reverse order
      for (const middleware of [...this.middlewares].reverse()) {
        if (middleware.after) {
          await middleware.after(req, res, handlerResponse)
        }
      }
    } catch (error) {
      const normalizedError = Array.isArray(error) && error[0] && 'message' in error[0]
        ? {
            code: (error[0] as ErrorObj).code || 'UnknownError',
            message: (error[0] as ErrorObj).message,
            stack: (error[0] as ErrorObj).stack || '',
            expected: (error[0] as ErrorObj).expected || '',
            received: (error[0] as ErrorObj).received || '',
          }
        : 'message' in (error as ErrorObj)
        ? {
            code: (error as ErrorObj).code || 'UnknownError',
            message: (error as ErrorObj).message,
            stack: (error as ErrorObj).stack || '',
            expected: (error as ErrorObj).expected || '',
            received: (error as ErrorObj).received || '',
          }
        : {
            code: 'UnknownError',
            message: 'An unknown error occurred.',
          }

      // Run `onError` middleware in reverse order
      for (const middleware of [...this.middlewares].reverse()) {
        if (middleware.onError) {
          await middleware.onError(normalizedError, req, res)
          return
        }
      }

      // Default error handler
      if (!res.headersSent) {
        console.error('Unhandled API Error:', normalizedError.message)
        res.status(500).json({ error: 'Internal Server Error' })
      }
    }
  }

  // Export the handler
  execute(): NextApiHandler {
    return (req, res) => this.executeHandler(req as INextRequest<T>, res)
  }
}

// Factory function to wrap a handler
export const nextMiddy = <T = object>(
  handler: INextHandler<T>
): NextMiddy<T> => {
  return new NextMiddy(handler)
}
