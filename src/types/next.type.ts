import { NextApiRequest, NextApiResponse } from 'next/types'

// Extending NextApiRequest to include `input`
interface INextApiRequest<T> extends NextApiRequest {
  input: T
}

// Middleware handler type
interface INextHandler<T> {
  (req: INextApiRequest<T>, res: NextApiResponse): Promise<void>
}

export type { INextApiRequest, INextHandler }
