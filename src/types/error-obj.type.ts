interface ErrorObj {
  code: string
  message: string
  stack?: string
  path?: string[],
  expected?: string,
  received?: string,
}

export type { ErrorObj }
