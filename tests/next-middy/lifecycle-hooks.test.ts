import { describe, it, expect, vi } from 'vitest'
import { nextMiddy, NextMiddyApiRequest, NextMiddyApiResponse } from '../../packages/next-middy-core/src'
import { createMockContext, makeHeadersSentWritable } from '../utils/mock.util'

describe('nextMiddy lifecycle', () => {
  it('runs middleware in before → handler → after order', async () => {
    type Input = { name: string }
    type Output = { message: string }
    
    const order: string[] = []
    const { req, res } = createMockContext<Input, Output>({ name: 'Eugene' })
    
    const before = vi.fn(() => order.push('before')) as (
      req: NextMiddyApiRequest<Input>,
      res: NextMiddyApiResponse<Output>
    ) => void
    
    const after = vi.fn(() => order.push('after')) as (
      req: NextMiddyApiRequest<Input>,
      res: NextMiddyApiResponse<Output>
    ) => void

    const handler = nextMiddy<Input, Output>((req, _) => {
      order.push('handler')
      return { message: `Hello ${req.input.name}` }
    })
      .use({ before })
      .use({ after })

    await handler(req, res)
    
    expect(order).toEqual(['before', 'handler', 'after'])
    expect(res.output).toEqual({ message: 'Hello Eugene' })
  })

  it('stops execution if res.headersSent in before', async () => {
    type Input = { skip: boolean }
    type Output = { done: boolean }
    
    const { req, res } = createMockContext<Input, Output>({ skip: true })

    makeHeadersSentWritable(res)
    res.headersSent = false
    
    const handler = nextMiddy((_, res) => {
      throw new Error('should not reach handler')
    }).use({
      before: () => {
        makeHeadersSentWritable(res)
        res.headersSent = true
      },
      after: () => {
        throw new Error('should not reach after')
      },
    })

    await handler(req, res)

    expect(res.headersSent).toBe(true)
  })

  it('stores errors in req.internal and triggers onError middleware', async () => {
    type Input = {}
    type Output = { message: string }
    
    const { req, res } = createMockContext<Input, Output>({})

    const onError = vi.fn((err, req) => {
      req.internal.captured = err.code
    })

    const handler = nextMiddy<Input, Output>(() => {
      throw Object.assign(new Error('Boom!'), { code: 'Exploded', status: 500 })
    }).use({ onError })

    await handler(req, res)

    expect(onError).toHaveBeenCalledTimes(1)
    expect(req.internal.error).toBeDefined()
    expect(req.internal.error?.code).toBe('Exploded')
    expect(req.internal.captured).toBe('Exploded')
    expect(res.statusCode).toBe(500)
  })

  it('continues executing after middlewares in reverse order', async () => {
    type Input = { value: number }
    type Output = { result: number }
    
    const sequence: string[] = []
    const { req, res } = createMockContext<Input, Output>({ value: 10 })

    const addFive = {
      after: (_: any, res: NextMiddyApiResponse<Output>, data: Output) => {
        sequence.push('after:addFive')
        res.output = { result: data.result + 5 }
      },
    }

    const double = {
      after: (_: any, res: NextMiddyApiResponse<Output>, data: Output) => {
        sequence.push('after:double')
        res.output = { result: data.result * 2 }
      },
    }

    const handler = nextMiddy<Input, Output>(async (req, res) => {
      sequence.push('handler')
      return { result: req.input.value }
    })
      .use(addFive)
      .use(double)

    await handler(req, res)

    expect(sequence).toEqual(['handler', 'after:double', 'after:addFive'])
    expect(res.output).toEqual({ result: (10 * 2) + 5 })
  })

  it('handles thrown errors from before middleware via onError', async () => {
    type Input = {}
    type Output = { ok: boolean }
    
    const { req, res } = createMockContext<Input, Output>({})

    const failingBefore = {
      before: () => {
        throw Object.assign(new Error('Before fail'), { code: 'BeforeError', status: 500 })
      },
    }

    const onError = vi.fn()

    const handler = nextMiddy<Input, Output>(() => {
      throw new Error('Should not reach handler')
    })
      .use(failingBefore)
      .use({ onError })

    await handler(req, res)

    expect(onError).toHaveBeenCalledOnce()
    expect(req.internal.error?.code).toBe('BeforeError')
    expect(res.statusCode).toBe(500)
  })
})
