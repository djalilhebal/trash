/**
 * @file AssemblyScript version of my sqrt function
 * @author Djalil Dreamski (@dreamski21)
 * @date Dec. 2019
 */

/**
 * Find the square root of a given number
 * 
 * @param val - squared number
 * @returns approximate square root
 */
export default function sqrt(val: f64): f64 {
  if (val < 0) return -1; // Like, an error ._.

  const ACCURACY: f64 = 0.00000001;
  let step: f64 = val < 1 ? 0.1 : 10;
  let x: f64 = 0;

  while (x * x != val && step > ACCURACY) {
    // Going to go forth and back in our guess? 'step' is too large, reduce it!
    if (guessNewX(guessNewX(x, val, step), val, step) == x) step /= 10;
    // Okay, guess our 'x' now
    x = guessNewX(x, val, step);
  }

  return x;
}

/**
 * Helper function to approximate x by one step
 * 
 * It is needed since Wasm doesn't yet support closures
 * @see https://docs.assemblyscript.org/basics/limitations
 * 
 * @param oldX - current approximated x
 * @param val  - the squared input
 * @param step - how much to add or remove from x
 * @returns hopefully a better approximated x
 */ 
function guessNewX(oldX: f64, val: f64, step: f64): f64 {
  if (oldX * oldX > val) {
    return oldX - step;
  } else {
    return oldX + step;
  }
}
