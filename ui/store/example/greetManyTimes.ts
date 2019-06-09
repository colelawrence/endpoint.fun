export function greetManyTimes(name: string, times = 1): string {
  let res = ''
  while (times>0) {
     times--
     res += `Hello ${name}!\n`
  }
  return res
}
