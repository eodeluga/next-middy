interface ErrorObj {
  code: string
  message: string
  detail?: string
  path?: string[]
}


export const logError = (e: ErrorObj | ErrorObj[]) => {
  if (Array.isArray(e)) {
    e.forEach((error) => {
      console.error({
        code: error.code,
        message: error.message,
        detail: error.detail ?? '',
        path: Array.isArray(error.path) ? error.path.join('.') : error.path,
      })
    })
  } else {
    console.error({
      code: e.code,
      message: e.message,
      detail: e.detail ?? '',
      path: Array.isArray(e.path) ? e.path.join('.') : e.path,
    })
  }
}

