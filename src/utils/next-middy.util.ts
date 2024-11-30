import { NextApiRequest, NextApiResponse, NextApiHandler } from 'next'

type Middleware = {
  before?: (req: NextApiRequest, res: NextApiResponse) => Promise<void>
  after?: (req: NextApiRequest, res: NextApiResponse) => Promise<void>
  onError?: (err: Error, req: NextApiRequest, res: NextApiResponse) => Promise<void>
}

export class NextMiddy {
  private handler: NextApiHandler
  private middlewares: Middleware[] = []

  constructor(handler: NextApiHandler) {
    this.handler = handler
  }

  // Add middleware to the chain
  use(middleware: Middleware): this {
    this.middlewares.push(middleware)
    return this // Enable chaining
  }

  // Execute all middleware and the handler
  async executeHandler(req: NextApiRequest, res: NextApiResponse) {
    try {
      // Run `before` middleware in order
      for (const middleware of this.middlewares) {
        if (middleware.before) {
          await middleware.before(req, res)
          if (res.headersSent) return // Stop if response is already sent
        }
      }

      // Run the main handler
      await this.handler(req, res)

      // Run `after` middleware in reverse order
      for (const middleware of [...this.middlewares].reverse()) {
        if (middleware.after && !res.headersSent) {
          await middleware.after(req, res)
        }
      }
    } catch (error) {
      // Ensure error is an instance of Error
      const normalizedError = error instanceof Error ? error : new Error(String(error))

      // Run `onError` middleware in reverse order
      for (const middleware of [...this.middlewares].reverse()) {
        if (middleware.onError) {
          await middleware.onError(normalizedError, req, res)
          return // Stop once the error is handled
        }
      }

      // Default error handler
      if (!res.headersSent) {
        console.error('Unhandled API Error:', normalizedError.stack || normalizedError.message)
        res.status(500).json({ error: 'Internal Server Error' })
      }
    }
  }

  // Export the handler
  execute(): NextApiHandler {
    return this.executeHandler.bind(this)
  }
}

// Factory function to wrap a handler
export const nextMiddy = (handler: NextApiHandler): NextMiddy => {
  return new NextMiddy(handler)
}
