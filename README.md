<p align="center">
  <img src="./assets/next-middy.png" alt="next-middy banner" width="1000" />
</p>

# next-middy

**Type-safe, composable middleware for Next.js API routes.**  
Inspired by [`middy`](https://middy.js.org/) for AWS Lambda, `next-middy` has been designed to natively support the [Next.js](https://nextjs.org/) ecosystem, with modern TypeScript, strict generics, and a clean lifecycle pattern.

---

## Why next-middy?

Next.js API routes are powerful, but they lack a clean way to share logic between handlers. Validation, logging, and error handling often end up copy-pasted across files.

`next-middy` solves that by introducing a **structured middleware pipeline**:

- Reusable “before”, “after”, and “onError” hooks  
- Fully typed `req.input` and `res.output` contracts  
- Compatible with Zod or any validation library  
- Graceful, centralised error handling  

---

## Quick Start

- **next-middy-core** – the core lifecycle engine, error handling, and type system **(required)**
- **next-middy-zod** – optional add-on for Zod schema validation  
- **next-middy** – umbrella package that re-exports both for convenience  

---

## How It Works

`next-middy` wraps your API handler and executes middleware in sequence:

1. **before** – runs before your handler, can mutate `req.input`  
2. **handler** – your actual API logic  
3. **after** – runs after handler success, can modify `res.output`  
4. **onError** – runs when an error occurs anywhere in the chain  

Everything is fully typed — ensuring middleware input/output shapes are inferred automatically.

**Example**

```ts
// pages/api/example.ts
import { nextMiddy, errorMiddle } from 'next-middy-core'
import { zodValidatorMiddle } from 'next-middy-zod'
import { z } from 'zod'

const inputSchema = z.object({
  name: z.string().min(1),
})

const outputSchema = z.object({
  message: z.string(),
})

const handler = nextMiddy(async (req, res) => {
  const { name } = req.input
  const message = `Hello, ${name}!`
  return { message }
})
  .use(zodValidatorMiddle(inputSchema, outputSchema))
  .use(errorMiddle)

export default handler
```

### Result
- Invalid requests return:
  ```json
  { "error": "ValidationError", "issues": [...] }
  ```
- Successful requests return:
  ```json
  { "message": "Hello, Eugene!" }
  ```

---

## Creating Your Own Middleware

Each middleware implements one or more lifecycle hooks:  
`before`, `after`, and `onError`.

```ts
import type { NextMiddyLifecycle } from 'next-middy-core'

export const timingMiddle: NextMiddyLifecycle<unknown, unknown> = {
  before: (req) => {
    req.internal.startTime = Date.now()
  },

  after: (_, res) => {
    const duration = Date.now() - (res.req.internal.startTime ?? 0)
    console.log(`Request completed in ${duration}ms`)
  },

  onError: (error) => {
    console.error('Request failed:', error)
  },
}
```

Then simply chain it with your handler:

```ts
nextMiddy(handler)
  .use(timingMiddle)
  .use(errorMiddle)
```

---

## Controlling Error Response Behaviour

| Environment                 | Response shape                            | Description                                 |
| --------------------------- | ----------------------------------------- | ------------------------------------------- |
| `NODE_ENV=development`      | Full `EnrichedError` object               | Includes message, stack trace, and metadata |
| `NODE_ENV=production`       | `{ name, code }`                          | Sanitised; omits internal details           |
| `MIDDY_VERBOSE_ERRORS=true` | Full `EnrichedError` (in any environment) | Override for temporary diagnostics          |


## ⚖️ License

MIT © [Eugene Odeluga](https://github.com/eodeluga)
