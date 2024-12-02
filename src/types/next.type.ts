import { NextApiRequest, NextApiResponse } from 'next/types'

// Middleware handler type
interface INextHandler<T> {
  (req: INextRequest<T>, res: NextApiResponse): Promise<void>
}

// Extending NextApiRequest to include `input`
interface INextRequest<T> extends NextApiRequest {
  input: T
}

export type { INextHandler, INextRequest }
