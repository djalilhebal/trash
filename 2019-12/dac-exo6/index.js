// import { mapValues, zipObject } from './lodash.js';
// import SillySemaphore as Sema from './SillySemaphore.js'

/**
 * @file DAC Exo6
 */

 /**
 * A Promise-based and queue-based Semaphore
 * @todo maybe fork or learn from https://github.com/zeit/async-sema
 */
class SillySemaphore {

  constructor(permits) {
    this._permits = permits;
    this._queue = [];
  }

  getPosition(requester) {
    return this._queue.findIndex(entry => entry.requester === requester);
  }

  async acquire(requester) {
    return new Promise( (resolve, reject) => {
      this._queue.push({
        requester,
        resolve,
        reject
      });
      this._maybeNotify();
    });
  }

  async release(_requester) {
    this._permits++;
    this._maybeNotify();
  }

  _maybeNotify() {
    if (this._permits > 0) {
      const entry = this._queue.shift();
      if (entry) {
        entry.resolve();
      }
    }
  }

}
const Sema = SillySemaphore;
const { mapValues, zipObject } = _; // Lodash

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
 * @todo Dedup before returning?
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

  $feu1: $('#feu1'),
  $feu2: $('#feu2'),
  $voi1: $('#voi1'),
  $voi2: $('#voi2'),
  $intersection: $('#intersection'),
}

ui.$form.onsubmit = (ev) => {
  ev.preventDefault();
  // - Collect user defined stuff (userAlgos, userVecs, userVars)
  // - Do a test sim to assert that 'userAlgos' don't throw when 'eval()'ed;
  //  else abort and alert user.
  // - Run actual sim
}

const userAlgosRaw = {
  changement: ui.$changement.value,
  traversee1: ui.$traversee1.value,
  traversee2: ui.$traversee2.value,
}

const userAlgos = mapValues(userAlgosRaw, awaitify);

const userVecs = mapValues(userAlgos, getOrderVector);

const userVars = {};
{
  const formData = new FormData(ui.$form);
  const SEP = /,\s*/; // separator

  const userSemas = zipObject(
    formData.get('sema-names').split(SEP),
    formData.get('sema-vals').split(SEP).map(val => new Sema(Number(val)))
  );

  const userInts = zipObject(
    formData.get('int-names').split(SEP),
    formData.get('int-vals').split(SEP).map(val => Number(val))
  );

  Object.assign(userVars, userSemas, userInts);
}

// TODO: Rename to Sim maybe
class Exo6 {

  static userVars = {}; // nrmlm
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

  static drawVois() {
    const {voi1, voi2} = Exo6;
    const tousTraversees = [...voi1, ...voi2];

    // Update wait vector and use it to calculate order in line
    for (const traversee of tousTraversees) {
      traversee.updateWaitVector();
      traversee.$elem.style.order = traversee.getWaitVector().join('');
    }
  }

  static drawFeu() {
    if (userVars.feu == 1) {
      ui.$feu1.classList.add('green');
      ui.$feu2.classList.remove('green'); // set red
    } else {
      ui.$feu2.classList.add('green');
      ui.$feu1.classList.remove('green'); // set red
    }
  }

  static showError(target, message) {
    ui[ '$' + target ].setAttribute('title', message);
  }

  static clearErrors() {
    // - remove attr title from all inputs...
  }

}

class Traversee {

  static freeColors = 'blue darkkhaki green red orange purple yellow'.split(' ');
  // ...

  constructor(algoSource) {
    this.algoSource = algoSource;
    this.color = this.getUniqueColor();
    this.waitVec = [];

    this.$elem = document.createElement('span');
    this.$elem.classList.add('vehicle');
    this.$elem.style.backgroundColor = this.color;
  }

  async run() {
    const getErrorLineNum = err => Number( err.stack.match(/:(\d+):\d+$/)[1] );
    const thisLineNum = getErrorLineNum(new Error());
    const evalLineNum = thisLineNum + 5;
    try {
      new Function(`
      with (this) {
        eval(userAlgos[algoSource]);
      }
      `)();
    } catch (e) {
      const relativeLineNum = getErrorLineNum(e) - evalLineNum;
      const relativeMessage = `${relativeLineNum}: ${e.message}`;
      Exo6.showError(this.algoSource, relativeMessage);
    }
  }

  updateWaitVector() {
    this.waitVec = this.getWaitVector();
  }

  getWaitVector() {
    const vec = this.waitVec.map(semaName => userVars[semaName].getPosition(this) );
    return vec;
  }

  getUniqueColor() {
    return Traversee.freeColors.shift();
  }

  destroy() {
    Traversee.freeColors.push( this.color );
    // - remove from the road's list
  }

}

class Traversee1 extends Traversee {

  constructor() {
    super('traversee1');
    this.waitVec = userVecs.traversee1;
    ui.$voi1.append(this.$elem);
  }

  async circuler() {
    await moveToIntersection();
    await moveOutIntersection();

    // don't await the rest
    keepMovingForward()
      .then(this.fadeOut)
      .then(this.destroy);
  }

  async p(x) {
    if (typeof x === 'string') {
      await userVars[x].acquire(this);
    } else {
      await x.acquire(this);
    }
    this.waitVec.shift(); // maybe?
  }

  async v(x) {
    if (typeof x === 'string') {
      await userVars[x].release(this);
    } else {
      await x.release(this);
    }
  }

}
