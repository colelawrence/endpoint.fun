export function a(fn: Function) {
  try {
    console.log(JSON.stringify({
      success: fn.apply(fn, Deno.args.slice(1).map(arg => JSON.parse(arg)))
    }))
  } catch(err) {
    console.log(JSON.stringify({
      error: err.toString()
    }))
  }
}
export type Params<F extends (...args: any) => any> = Parameters<F>
export type Return<F extends (...args: any) => any> = ReturnType<F>
