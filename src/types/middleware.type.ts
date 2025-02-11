import { NextApiResponse } from 'next/types'
import { INextApiRequest } from '@/types/next.type'
import { ErrorObj } from '@/types/error-obj.type'

export type Middleware<T = object> = {
  before?: (req: INextApiRequest<T>, res: NextApiResponse) => Promise<void>
  after?: (req: INextApiRequest<T>, res: NextApiResponse, data: unknown) => Promise<void>
  onError?: (err: ErrorObj, req: INextApiRequest<T>, res: NextApiResponse) => Promise<void>
}
