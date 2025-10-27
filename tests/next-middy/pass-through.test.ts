import { describe, it, expect } from 'vitest'
import { nextMiddy, NextMiddyApiRequest, NextMiddyApiResponse } from '../../packages/next-middy-core/src'
import { createMockContext } from '../utils/mock.util'

describe('nextMiddy pass-through', () => {
  it('passes req.input and res.output unchanged when no middleware used', async () => {
    type Input = { user: string }
    type Output = { message: string }
    
    const { req, res } = createMockContext<Input, Output>({ user: 'Eugene' })

    const handler = nextMiddy<Input, Output>((req) => {
      return { message: `Hi ${req.input.user}` }
    })

    await handler(req, res)

    expect(res.output).toEqual({ message: 'Hi Eugene' })
  })

  it('propagates input mutations through chained middleware', async () => {
    type Input = { counter: number }
    type Output = { counter: number }
    
    const { req, res } = createMockContext<Input, Output>({ counter: 1 })
    const sequence: string[] = []

    const incByOne = {
      before: (req: NextMiddyApiRequest<Input>) => {
        sequence.push('before:incByOne')
        req.input.counter += 1
      },
    }

    const incByTwo = {
      before: (req: NextMiddyApiRequest<Input>) => {
        sequence.push('before:incByTwo')
        req.input.counter += 2
      },
    }

    const handler = nextMiddy<Input, Output>((req) => {
      sequence.push('handler')
      return { counter: req.input.counter }
    })
      .use(incByOne)
      .use(incByTwo)

    await handler(req, res)

    expect(sequence).toEqual(['before:incByOne', 'before:incByTwo', 'handler'])
    expect(res.output).toEqual({ counter: 4 })
  })

  it('preserves res.output when after middleware makes no changes', async () => {
    type Input = { id: number }
    type Output = { result: string }

    const { req, res } = createMockContext<Input, Output>({ id: 42 })

    const noopAfter = {
      after: () => {
        // no mutation
      },
    }

    const handler = nextMiddy<Input, Output>((req) => {
      return { result: `Processed ${req.input.id}` }
    })
      .use(noopAfter)

    await handler(req, res)

    expect(res.output).toEqual({ result: 'Processed 42' })
  })

  it('allows before middleware to inject new properties into req.input', async () => {
    type Input = { name?: string; title?: string }
    type Output = { greeting: string }
    
    const { req, res } = createMockContext<Input, Output>({ name: 'Eugene' })

    const addTitle = {
      before: (req: NextMiddyApiRequest<Input>) => {
        req.input.title = 'Mr'
      },
    }

    const handler = nextMiddy<Input, Output>((req) => {
      const { name, title } = req.input
      return { greeting: `Hello ${title} ${name}` }
    })
      .use(addTitle)

    await handler(req, res)

    expect(res.output).toEqual({ greeting: 'Hello Mr Eugene' })
  })

  it('allows after middleware to enrich response data', async () => {
    type Input = { items: string[] }
    type Output = { count: number; items: string[] }

    const { req, res } = createMockContext<Input, Output>({ items: ['A', 'B'] })

    const addCount = {
      after: (_: NextMiddyApiRequest<Input>, res: NextMiddyApiResponse<Output>, data: Output) => {
        res.output = { ...data, count: data.items.length }
      },
    }

    const handler = nextMiddy<Input, Output>((req) => {
      return { items: req.input.items, count: 0 }
    })
      .use(addCount)

    await handler(req, res)

    expect(res.output).toEqual({ items: ['A', 'B'], count: 2 })
  })
})
