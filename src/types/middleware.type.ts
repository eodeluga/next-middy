import { NextApiResponse } from 'next/types'
import { INextApiRequest } from '@/types/next.type'
import { BaseError } from '@/utils/errors.util'

export type Middleware<T = object> = {
  before?: (req: INextApiRequest<T>, res: NextApiResponse) => Promise<void>
  after?: (req: INextApiRequest<T>, res: NextApiResponse, data: unknown) => Promise<void>
  onError?: (err: BaseError, req: INextApiRequest<T>, res: NextApiResponse) => Promise<void>
}
