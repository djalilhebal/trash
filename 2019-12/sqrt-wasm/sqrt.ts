/**
 * @file TypeScript version of my sqrt function
 * @author Djalil Dreamski (@djalilhebal)
 * @date Dec. 2019
 */

/**
 * Find the square root of a given number
 * 
 * @param val - squared number
 * @returns approximate square root
 */
export default function sqrt(val: number): number {
  if (val < 0) return -1; // Like, an error ._.

  const ACCURACY = 0.00000001;
  let step = val < 1 ? 0.1 : 10;
  let x = 0;

  /**
   * Helper function to approximate x by one step
   * 
   * @param oldX - current approximated x
   * @returns hopefully a better approximated x
   */
  function guessNewX(oldX: number): number {
    if (oldX * oldX > val) {
      return oldX - step;
    } else {
      return oldX + step;
    }
  }

  while (x * x != val && step > ACCURACY) {
    // Going to go forth and back in our guess? 'step' is too large, reduce it!
    if (guessNewX(guessNewX(x)) == x) step /= 10;
    // Okay, guess our 'x' now
    x = guessNewX(x);
  }

  return x;
}
