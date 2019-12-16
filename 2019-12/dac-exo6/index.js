/**
 * @file DAC Exo6
 */

 /**
 * It must be a Promise-based Semaphore that uses a queue
 *
 * - Must I pass `obj` to acquire() and release()?
 */
class Sema {
  constructor(permits) {
    this.permits = permits;
    this.queue = [];
  }

  getPosition(targetObj) {
    return this.queue.findIndex(obj => obj === targetObj);
  }

}

/**
 * 
 * @example
 * assert({
 *  given: 'two arrays'
 *  should: 'pair each element with its peer',
 *  expected: [ ['a', 1], ['b', 2] ],
 *  actual: zip(['a', 'b'], [1, 2]),
 * })
 * 
 * @param {Array} arrA 
 * @param {Array} arrB 
 * @returns {Array}
 */
const zip = (arrA, arrB) => arrA.map((x, i) => [ x, arrB[i] ]);

/**
 * Prefix "p", "v", and "circuler" with the `await` keyword
 * 
 * @example
 * assert({
 *   given: 'a piece of code',
 * 
 *   should: 'prefix "p", "v", and "circuler" with "await"',
 *
 *   expected: `
 *   if (feu == 2) {
 *     await p(sVide)
 *     await p(sFeu)
 *     await circuler()
 *     await v(sVide)
 *   }
 *   await v(sFeu)`,
 *
 *   actual: awaitify(`if (feu == 2) {
 *     p(sVide)
 *     circuler()
 *     v(sVide)
 *   }
 *   v(sFeu)`),
 * })
 * 
 * @param {string} code
 * @returns {string}
 */
function awaitify(code) {
  return code.replace(/\b(p|v|circuler)\(/g, 'await $1(');
}

/**
 * A car's place in line is determined by a vector of priorities
 * 
 * @todo Dedup before returning
 * @todo Handle whitespace?
 * 
 * @param {string} code
 * @return {Array<string>}
 */
function getOrderVector(code) {
  const pCalls = code.match(/p\((\w+)\)/g) || [];
  const acquiredSemaphores = pCalls.map(x => x.slice(2, -1))
  return acquiredSemaphores
}

const $ = str => document.querySelector(str);

// caching 'select queries' kinda
const ui = {
  $form: $('form'),

  $changement: $('#changement'),
  $traversee1: $('#traversee1'),
  $traversee2: $('#traversee2'),
}

ui.$form.onsubmit = (ev) => {
  ev.preventDefault();
  // - Collect user defined stuff (userAlgos, userVecs, userVars)
  // - Do a test sim to assert that 'userAlgos' don't throw when 'eval()'ed;
  //  else abort and alert user.
  // - Run actual sim
}

const userAlgos = {
  changement: awaitify(ui.$changement.value),
  traversee1: awaitify(ui.$traversee1.value),
  traversee2: awaitify(ui.$traversee2.value),
}

// TODO: just map over the userAlgos object
const userVecs = {
  changement: getOrderVector(userAlgos.changement),
  traversee1: getOrderVector(userAlgos.traversee1),
  traversee2: getOrderVector(userAlgos.traversee2),
}

const userVars = {};
{
  const formData = new FormData(ui.$form);
  const SEP = /,\s*/; // separator

  const userSemas = Object.fromEntries(zip(
    formData.get('sema-names').split(SEP),
    formData.get('sema-vals').split(SEP).map(val => new Sema(Number(val)))
  ));

  const userInts = Object.fromEntries(zip(
    formData.get('int-names').split(SEP),
    formData.get('int-vals').split(SEP).map(val => Number(val))
  ));

  Object.assign(userVars, userSemas, userInts);
}

class Exo6 {

  // static userVars = {}; // nrmlm
  static voi1 = [];
  static voi2 = [];
  // ...

  main() {
    // Repeat:
    // If there's some free place in any road, maybe/randomly create a few car instance
  }

  draw() {
    drawVois();
    drawFeu();
  }

  drawVois() {
    const {voi1, voi2} = Exo6;
    const tousTraversees = [...voi1, ...voi2];
    for (const traversee of tousTraversees) {
      traversee.updateWaitVector();
    }

    voi1.sort(byVector);
    voi2.sort(byVector);
  }

  drawFeu() {
    if (feu == 1) {
      feu1.color = 'green';
      feu2.color = 'red';
    } else {
      feu2.color = 'green';
      feu1.color = 'red';
    }
  }

}

class Traversee {

  static freeColors = 'blue darkkhaki gray green red orange purple yellow'.split();
  // ...

  constructor() {
    this.color = getUniqueColor();
    this.waitVec = [];
  }

  updateWaitVector() {
    this.waitVec = this.getWaitVector();
  }

  getWaitVector() {
    const vec = orderVec.map(semaName => userVars[semaName].getPosition(this) );
    return vec;
  }

  getUniqueColor() {
    return Traversee.freeColors.unshift();
  }

  destroy() {
    Traversee.freeColors.push( this.color );
    this.color = ''; // is this statement meaningless? Not even for semantic purposes?
    // - remove from the road's list
  }

}

class Traversee1 extends Traversee {
  constructor() {
    super();
  }

  // TODO: Refactor to call 'super.run()'
  async run() {
    with (this) {
      eval(userAlgos.traversee1);
    }
    // Actually, it needs to be something more like this:
    /*
    const getErrorLineNum = err => Number( err.stack.match(/:(\d+):\d+$/)[1] );
    const thisLineNum = getErrorLineNumber(new Error());
    const evalLineNum = thisLineNum + 3;
    try {
      with (this) {
        eval(userAlgos.traversee1);
      }
    } catch (e) {
      const relativeLineNum = getErrorLineNum(e) - evalLineNum;
      const relativeMessage = `${relativeLineNum}: ${e.message}`;
      ui.$traversee1.setAttribute('title', relativeMessage);
    }
    */
  }

  async circuler() {
    await moveToIntersection();
    await moveOutIntersection();

    keepMovingForward() // don't await the rest
      .then(fadeOut)
      .then(destory);
  }

  async p(x) {
    if (typeof x === 'string') {
      await userVars[x].acquire();
    } else {
      await x.acquire();
    }
    this.orderVec.unshift(); // maybe?
  }

  async v(x) {
    if (typeof x === 'string') {
      await userVars[x].release();
    } else {
      await x.release();
    }
  }

}
