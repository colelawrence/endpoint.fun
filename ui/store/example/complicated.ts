/**
 * Description of apples {@link greet}
 * Description line 2 of apples {@link greet}
 *
 * @param name docs for name
 * @param right docs for right
 * @returns docs for return
 */
export function apples(name: string, right: { andy: number }, d: CrazyType, ignored = 171717): string {
  let reverseName = name + ' reverse'
  return `Hello, ${name}! ${right.andy} ${ignored}`
}

export function greet(name: string, opt?: true): string {
  let reverseName = name + ' reverse'
  console.log(Date.now())
  return `Hello, ${reverseName}!`
}

export function abc(opt = { howdy: 'gone', d: 1 }): string {
  return `Hello, ${opt.howdy}!`
}

export type CrazyType = {
  richard: 'likes apples'
}

function hola() {}
