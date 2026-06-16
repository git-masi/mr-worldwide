/**
 * Create an iterator that can be used to range from 0 to n - 1
 */
export function* range(n: number) {
  for (let i = 0; i < n; i++) {
    yield i;
  }
}

/**
 * Create an iterator that can be used to range from 0 to n - 1.
 *
 * When all values have been produced the sequence will wrap back to 0 and repeat.
 *
 * =======
 *
 * WARNING
 *
 * Do NOT use in a `for...of` loop else you will loop forever.
 *
 * See the test case for proper handling.
 */
export function* rangeForever(n: number): Generator<number, number, void> {
  for (let i = 0; ; i++) {
    yield (i = i % n);
  }
}
