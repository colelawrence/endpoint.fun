export function a(fn: Function) {
  let res: any
  try {
    res = {
      success: fn.apply(fn, Deno.args.slice(1).map(uriArg => decodeURIComponent(uriArg)).map(arg => JSON.parse(arg)))
    }
  } catch(err) {
    console.error(err)
    res = {
      error: err.toString()
    }
  }
  console.log('>>&>>><<<&<<')
  console.log(encodeURIComponent(JSON.stringify(res)))
}
export type Params<F extends (...args: any) => any> = Parameters<F>
export type Return<F extends (...args: any) => any> = ReturnType<F>
