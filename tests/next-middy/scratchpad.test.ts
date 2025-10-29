import { nextMiddy, NextMiddyApiRequest, NextMiddyApiResponse } from 'next-middy/core'
import { createMockContext } from 'tests/utils/mock.util.js'

describe('nextMiddy scratchpad', () => {
  beforeAll(() => {
  
  })
  
  it('makes internal scratchpad available and shared across middleware', async () => {
    type Input = { task: string }
    type Output = { message: string }

    const { req, res } = createMockContext<Input, Output>({ task: 'Run diagnostics' })
    const sequence: string[] = []

    const recordStart = {
      before: (req: NextMiddyApiRequest<Input>) => {
        sequence.push('before:recordStart')
        req.internal.startTime = 100
      },
    }

    const computeDuration = {
      after: (req: NextMiddyApiRequest<Input>, _: NextMiddyApiResponse<Output>) => {
        sequence.push('after:computeDuration')
        req.internal.endTime = 150
        req.internal.duration = req.internal.endTime - req.internal.startTime
      },
    }

    const handler = nextMiddy<Input, Output>((req) => {
      sequence.push('handler')
      req.internal.processedTask = req.input.task
      return { message: `Completed: ${req.internal.processedTask}` }
    })
      .use(recordStart)
      .use(computeDuration)

    await handler(req, res)

    expect(sequence).toEqual(['before:recordStart', 'handler', 'after:computeDuration'])
    expect(req.internal.startTime).toBe(100)
    expect(req.internal.endTime).toBe(150)
    expect(req.internal.duration).toBe(50)
    expect(req.internal.processedTask).toBe('Run diagnostics')
    expect(res.output).toEqual({ message: 'Completed: Run diagnostics' })
  })

  it('allows multiple middlewares to write and read shared internal state', async () => {
    type Input = { name: string }
    type Output = { message: string }

    const { req, res } = createMockContext<Input, Output>({ name: 'Eugene' })
    const order: string[] = []

    const first = {
      before: (req: NextMiddyApiRequest<Input>) => {
        order.push('before:first')
        req.internal.shared = { greetCount: 1 }
      },
    }

    const second = {
      before: (req: NextMiddyApiRequest<Input>) => {
        order.push('before:second')
        const shared = req.internal.shared as { greetCount: number }
        shared.greetCount += 1
      },
    }

    const handler = nextMiddy<Input, Output>((req) => {
      order.push('handler')
      const count = (req.internal.shared as { greetCount: number }).greetCount
      return { message: `Hello ${req.input.name}, called ${count} times` }
    })
      .use(first)
      .use(second)

    await handler(req, res)

    expect(order).toEqual(['before:first', 'before:second', 'handler'])
    expect((req.internal.shared as { greetCount: number }).greetCount).toBe(2)
    expect(res.output).toEqual({ message: 'Hello Eugene, called 2 times' })
  })

  it('retains internal error information when exceptions occur', async () => {
    type Input = {}
    type Output = { ok: boolean }

    const { req, res } = createMockContext<Input, Output>({})
    const order: string[] = []

    const before = {
      before: () => {
        order.push('before')
        throw Object.assign(new Error('Failed precheck'), { code: 'PrecheckFail', status: 400 })
      },
    }

    const onError = {
      onError: (err: Error & { code: string }, req: NextMiddyApiRequest<Input>, res: NextMiddyApiResponse<Output>) => {
        order.push('onError')
        req.internal.errorCode = err.code
      },
    }

    const handler = nextMiddy<Input, Output>(() => {
      order.push('handler')
      return { ok: true }
    })
      .use(before)
      .use(onError)

    await handler(req, res)

    expect(order).toEqual(['before', 'onError'])
    expect(req.internal.error).toBeDefined()
    expect(req.internal.error?.code).toBe('PrecheckFail')
    expect(req.internal.errorCode).toBe('PrecheckFail')
    expect(res.statusCode).toBe(400)
  })

  it('lets after middleware inspect and annotate res.output using internal state', async () => {
    type Input = { query: string }
    type Output = { data: string; timestamp?: number }

    const { req, res } = createMockContext<Input, Output>({ query: 'health' })

    const tagTime = {
      before: (req: NextMiddyApiRequest<Input>) => {
        req.internal.startedAt = 1234
      },
      after: (req: NextMiddyApiRequest<Input>, res: NextMiddyApiResponse<Output>, data: Output) => {
        req.internal.finishedAt = 1250
        const elapsed = req.internal.finishedAt - req.internal.startedAt
        res.output = { ...data, timestamp: elapsed }
      },
    }

    const handler = nextMiddy<Input, Output>((req) => {
      return { data: `Fetched ${req.input.query}` }
    })
      .use(tagTime)

    await handler(req, res)

    expect(req.internal.startedAt).toBe(1234)
    expect(req.internal.finishedAt).toBe(1250)
    expect(res.output).toEqual({ data: 'Fetched health', timestamp: 16 })
  })
})
