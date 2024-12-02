import { NextApiResponse } from 'next/types'
import { INextRequest } from '@/types/next.type'
import { ErrorObj } from '@/types/error-obj.type'

export type Middleware<T = object> = {
  before?: (req: INextRequest<T>, res: NextApiResponse) => Promise<void>
  after?: (req: INextRequest<T>, res: NextApiResponse, data: unknown) => Promise<void>
  onError?: (err: ErrorObj, req: INextRequest<T>, res: NextApiResponse) => Promise<void>
}
