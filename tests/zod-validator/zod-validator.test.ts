import { z } from 'zod'
import { zodValidatorMiddle } from 'next-middy/zod'
import { nextMiddy } from 'next-middy/core'
import { createMockContext } from 'tests/utils/mock.util.js'

describe('zodValidatorMiddle', () => {
  const inputSchema = z.object({
    name: z.string(),
    age: z.number().min(0),
  })

  const outputSchema = z.object({
    message: z.string(),
  })

  it('validates input and attaches parsed data', async () => {
    type Input = z.infer<typeof inputSchema>
    type Output = z.infer<typeof outputSchema>

    const { req, res } = createMockContext<Input, Output>({ name: 'Eugene', age: 46 })

    const handler = nextMiddy<Input, Output>((req) => {
      const { name, age } = req.input
      return { message: `${name} is ${age}` }

    })
      .use(zodValidatorMiddle(inputSchema, outputSchema))

    await handler(req, res)

    expect(req.input).toEqual({ name: 'Eugene', age: 46 })
    expect(res.output).toEqual({ message: 'Eugene is 46' })
    expect(res.statusCode).toBe(200)
    
  })

  it('throws a validation error for invalid input', async () => {
    type Input = z.infer<typeof inputSchema>
    type Output = z.infer<typeof outputSchema>

    const { req, res } = createMockContext<Input, Output>({ name: 'Eugene', age: -10 })

    const handler = nextMiddy<Input, Output>(() => {
      return { message: 'should not reach' }
    })
      .use(zodValidatorMiddle(inputSchema, outputSchema))

    await handler(req, res)

    expect(res.statusCode).toBe(400)
    expect(req.internal.error).toBeDefined()
    expect(req.internal.error?.message).toMatch(/input/)
  })

  it('throws a validation error for invalid output', async () => {
    type Input = z.infer<typeof inputSchema>
    type Output = z.infer<typeof outputSchema>

    const { req, res } = createMockContext<Input, Output>({ name: 'Eugene', age: 46 })

    const handler = nextMiddy<Input, Output>(() => {
      // Explicit cast as invalid shape object
      return { message: null } as unknown as { message: string }
    })
      .use(zodValidatorMiddle(inputSchema, outputSchema))

    await handler(req, res)
    
    expect(res.statusCode).toBe(400)
    expect(req.internal.error).toBeDefined()
    expect(req.internal.error?.message).toMatch(/output/)
  })
})
