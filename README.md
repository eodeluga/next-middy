<p align="center">
  <img src="./assets/next-middy.png" alt="next-middy banner" width="1000" />
</p>

# next-middy

**Type-safe, composable middleware for Next.js API routes.**  
Inspired by [`middy`](https://middy.js.org/) for AWS Lambda, next-middy has been designed to natively support the [Next.js](https://nextjs.org/) ecosystem, with modern TypeScript, strict generics, and a clean lifecycle pattern.

---

## Why next-middy?

Next.js API routes are powerful, but they lack a clean way to share logic between handlers. Validation, logging, and error handling often end up copy-pasted across files.

next-middy solves that by introducing a **structured middleware pipeline**:

- Reusable “before”, “after”, and “onError” hooks  
- Fully typed `req.input` and `res.output` contracts  
- Compatible with Zod or any validation library  
- Graceful, centralised error handling  

---

## Quick Start

`npm install next-middy`

- **next-middy/core** – the core lifecycle engine, error handling, and type system **(required)**
- **next-middy/zod** – optional add-on for Zod schema validation middleware
- **next-middy** – umbrella package that re-exports both for convenience  

---

## How It Works

`next-middy` wraps your API handler and executes middleware in sequence:

1. **before** – runs before your handler, can mutate `req.input`  
2. **handler** – your actual API logic  
3. **after** – runs after handler success, can modify `res.output`  
4. **onError** – runs when an error occurs anywhere in the chain  

Everything is fully typed — ensuring middleware input/output shapes are inferred automatically.

### Example

```ts
// pages/api/example/[name].ts
import { z } from 'zod'
import { nextMiddy } from 'next-middy/core'
import { zodErrorMiddle, zodValidatorMiddle } from 'next-middy/zod'

const inputSchema = z.object({
  name: z
    .string()
    .refine((val) => /^[A-Za-z]+$/.test(val), {
      message: 'Name must contain only alphabetical characters',
    }),
})

// Optional output validation schema
const outputSchema = z.object({
  message: z
    .string()
    .refine((val) => val.startsWith('Hi '), {
      message: 'Message must start with "Hi "',
    }),
})

type InputType = z.infer<typeof inputSchema>
type OutputType = z.infer<typeof outputSchema>

export default nextMiddy<InputType, OutputType>((req) => {
  // Randomly simulate an invalid response
  const { name } = req.input
  const shouldFail = Math.random() < 0.5
  const message = shouldFail ? `${name}` : `Hi ${name}`

  return { message }
})
  .use(zodValidatorMiddle(inputSchema, outputSchema))
  .use(zodErrorMiddle)
```

### Result
- **Validation errors**:

  *A name containing a number*
  ```json
  {"code":"ValidationError","name":"ZodValidationError","status":400,"details":[{"code":"custom","path":["name"],"message":"Name must contain only alphabetical characters"}],"method":"GET","timestamp":"2025-10-31T01:03:01.572Z","url":"/api/example/Trevor1"}
  ```
  
  *A message that doesn't contain 'Hi'*
  ```json
  {"code":"ValidationError","name":"ZodValidationError","status":400,"details":[{"code":"custom","path":["message"],"message":"Message must start with \"Hi \""}],"method":"GET","timestamp":"2025-10-31T00:58:52.923Z","url":"/api/example/Trevor"}
  ```
- **Successful response**:
  ```json
  { "message": "Hi, Eugene!" }
  ```

---

## Creating Your Own Middleware

Each middleware implements one or more lifecycle hooks:  
`before`, `after`, and `onError`.

```ts
import type { NextMiddyLifecycle, NextMiddyApiRequest } from 'next-middy/core'

export const timingMiddle: NextMiddyLifecycle<any, any> = {
  before: (req: NextMiddyApiRequest<any>) => {
    if (!req.internal) {
      req.internal = {} as any
    }

    req.internal.startTime = Date.now()
  },

  after: (req: NextMiddyApiRequest<any>) => {
    const duration = Date.now() - (req.internal?.startTime ?? 0)
    console.log(`Request completed in ${duration}ms`)
  },

  onError: (error) => {
    console.error('Request failed: ', error)
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

## How to Build

To build the package from source:

1. Clean workspace (optional)

    `yarn clean`

2. Install dependencies

    `yarn bootstrap`

3. Build next-middy

    `yarn build`

**Rebuilding from scratch**

`yarn rebuild`

That command runs the full clean + install + build sequence, ensuring a pristine dist/ output.

If you’re making changes to next-middy, you can test these against another project by linking build files:

```
cd packages/next-middy
npm link
```

**then in your target project**

`npm link next-middy`

---

## Controlling Error Response Behaviour

| Environment                 | Response shape                            | Description                                 |
| --------------------------- | ----------------------------------------- | ------------------------------------------- |
| `NODE_ENV=development`      | Full `EnrichedError` object               | Includes message, stack trace, and metadata |
| `NODE_ENV=production`       | `{ code }`                                | Sanitised to just handler error codes       |
| `MIDDY_VERBOSE_ERRORS=true` | Full `EnrichedError` (in any environment) | Override for temporary diagnostics          |


## ⚖️ License

MIT © [Eugene Odeluga](https://github.com/eodeluga)
