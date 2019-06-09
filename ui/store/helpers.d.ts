declare namespace h {
  export type Hfn<F extends (...args: any) => any> = {
    params: Parameters<F>,
    returns: ReturnType<F>,
  }
}
