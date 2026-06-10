/* Create an iterator that can be used to range from 0 to n - 1 */
export function* range(n: number) {
  for (let i = 0; i < n; i++) {
    yield i;
  }
}
