/**
 * @file DAC Exo6: La Circulation
 */

/**
 * @param {Array} arrA
 * @param {Array} arrB
 * @returns {Object}
 */
function zipObject(arrA, arrB) {
  const zip = (arrX, arrY) => arrX.map((x, i) => [x, arrY[i]]);
  return Object.fromEntries(zip(arrA, arrB));
}

/**
 * A basic Promise-based and queue-based Semaphore
 */
const Semaphore = class SillySemaphore {

  constructor(permits) {
    this._permits = permits;
    this._queue = [];
  }

  getPosition(acquirer) {
    const idx = this._queue.findIndex(entry => entry.acquirer === acquirer);
    return idx + 1; // to get rid of '-1'
  }

  async acquire(acquirer) {
    return new Promise( (resolve, reject) => {
      this._queue.push({
        acquirer,
        resolve,
        reject
      });
      this._maybeNotify();
    });
  }

  async release(_acquirer) {
    this._permits++;
    this._maybeNotify();
  }

  /**
   * Reject all pending promises and nullify the 'queue'
   *   so that future calls fail...
   */
  die() {
    let entry;
    while (entry = this._queue.pop()) {
      entry.reject();
    }
    this._queue = null;
  }

  _maybeNotify() {
    if (this._permits > 0) {
      const entry = this._queue.shift();
      if (entry) {
        this._permits--;
        entry.resolve();
      }
    }
  }

}


class Sim {

  static userVars = {};
  static userAlgos = {};

  static chan  = null;
  static voie1 = [];
  static voie2 = [];

  static ui = {};
  static creatorInterval = null;

  static start() {
    // if (Sim.ui.$sim === undefined) Sim.resetUI();

    Sim.clearErrors();
    Sim.loadUserInputs();
    Sim.ui.$fieldset.disabled = true;
    Sim.initCreator();
    Sim.redraw();
  }

  static stop() {
    function freezeSimUI() {
      // To replace all elements so no one can alter the current state
      Sim.ui.$sim.outerHTML = Sim.ui.$sim.outerHTML;
      // To signal that they no longer reference actual DOM elements and free them maybe(?)
      Sim.ui = {};
    }

    function freeVariables() {
      // Kill all user defined semaphores
      Object.entries(Sim.userVars)
        .map(entry => entry[1])
        .filter(val => val instanceof Semaphore)
        .forEach(sema => sema.die());

      Sim.userVars = {};
    }

    function freeThreads() {
      // - kill "threads" (maybe simply call .destory() of each existing Traversee)
      // ...

      // - cancel Changement 'chan' (AFAIK you can not cancel Promises...)
      // ...
    }

    Sim.ui.$fieldset.disabled = false;
    clearInterval(Sim.creatorInterval);
    freezeSimUI();
    //freeThreads();
    //freeVariables();
  }

  static setup() {
    const $ = str => document.querySelector(str);

    Object.assign(Sim.ui, {
      $form: $('form'),
      $fieldset: $('form fieldset'),
      $semaNames: $('#sema-names'),
      $semaVals: $('#sema-vals'),
      $intNames: $('#int-names'),
      $intVals: $('#int-vals'),
      $changement: $('#changement'),
      $traversee1: $('#traversee1'),
      $traversee2: $('#traversee2'),

      $sim: $('#sim'),
      $feu1: $('#feu1'),
      $feu2: $('#feu2'),
      $voie1: $('#voie1'),
      $voie2: $('#voie2'),
      $carrefour: $('#carrefour'),
    })

    Sim.ui.$form.onsubmit = (ev) => {
      ev.preventDefault();
      Sim.start();
    }

    $('#btn-load-attempt').onclick = (ev) => {
      ev.preventDefault();
      Sim.loadPreset(presets.myAttempt);
    }

    $('#btn-load-correct').onclick = (ev) => {
      ev.preventDefault();
      Sim.loadPreset(presets.correctAnswer);
    }

  }
  
  static loadUserInputs() {
    const {ui} = Sim;

    // userAlgos...
    Object.assign(Sim.userAlgos,
      {
        changement: ui.$changement.value,
        traversee1: ui.$traversee1.value,
        traversee2: ui.$traversee2.value,
      }
    )

    // userVars...
    const SEP = /,\s*/; // separator

    const userSemas = zipObject(
      ui.$semaNames.value.split(SEP),
      ui.$semaVals.value.split(SEP).map(val => new Semaphore(Number(val)))
    );

    const userInts = zipObject(
      ui.$intNames.value.split(SEP),
      ui.$intVals.value.split(SEP).map(val => Number(val))
    );

    Object.assign(Sim.userVars, userSemas, userInts);
  }

  static initCreator() {
    Sim.chan = new Changement();
    // maybe create a new instance of Traversee every 2 secs
    Sim.creatorInterval = setInterval(Sim.maybeCreateTraversee, 2 * 1000);
  }

  /**
   * Maybe create a new instance of Traversee
   * @returns {boolean} True if a new instance was created; false otherwise.
   */
  static maybeCreateTraversee() {
    // maybe not
    if (Math.random() < 0.5) {
      return false;
    }

    if (Math.random() < 0.5) {
      if (Sim.voie1.length < Traversee1.MAX) {
        const t1 = new Traversee1();
        return true;
      }
    } else {
      if (Sim.voie2.length < Traversee2.MAX) {
        const t2 = new Traversee2();
        return true;
      }
    }

    // no room for a new 'traversee' in the randomly chosen 'voie'
    return false;
  }

  static redraw() {
    // Just update 'data-*' and 'order' values, and let CSS take care of the rest.

    // Feu
    const {ui, chan, userVars} = Sim;
    ui.$sim.dataset.feu = userVars.feu;
    ui.$sim.dataset.chanQueued = chan.orderVec.some(sema => userVars[sema].getPosition(chan) > 0);

    // Voies
    const {voie1, voie2, redrawTraversee} = Sim;
    voie1.sort(Traversee.compareTraversees);
    voie2.sort(Traversee.compareTraversees);
    voie1.forEach(redrawTraversee);
    voie2.forEach(redrawTraversee);

    // XXX: Maybe it's better to use Proxy(userVars) and redraw after its attributes are accessed..
    // Redraw before each repaint
    requestAnimationFrame(Sim.redraw);
  }

  /**
   * Update Traversee
   * 
   * @param {Traversee} t 
   * @param {number} i - index 
   */
  static redrawTraversee(t, i) {
    t.$elem.style.order = String(i);
    t.$elem.title =
      `${t.name}\n\n` +
      `orderVec: {${t.orderVec.join(', ')}}\n` +
      `waitVec: {${t.getWaitVec().join(', ')}}`;
  }

  static showError(algoSource, message) {
    Sim.ui[ '$' + algoSource ].setAttribute('title', message);
    Sim.stop();
  }

  static clearErrors() {
    Sim.ui.$form.querySelectorAll('[title]').forEach($x => $x.removeAttribute('title'));
  }

  /**
   * Populate UI inputs with preset data
   * 
   * @param {object} preset
   */
  static loadPreset(preset) {
    const keys = 'semaNames semaVals intNames intVals changement traversee1 traversee2'.split(' ');
    for (const key of keys) {
      Sim.ui['$' + key].value = preset[key];
    }
  }
}

class Algorithme {

  /**
   * @param {String} algoSource - "changement", "traversee1", or "traversee2"
   */
  constructor(algoSource) {
    this.algoSource = algoSource;
    this.userAlgo   = Sim.userAlgos[algoSource];
    this.orderVec   = Algorithme.parseOrderVector(this.userAlgo);
  }

  async run() {
    const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
    try {
      await new AsyncFunction('that', `
        with (Sim.userVars) {
          ${ Algorithme.awaitifyThat(this.userAlgo) }
        }
      `)(this);
    } catch (userError) {
      console.error('userError', userError); // for actual debugging
      Sim.showError(this.algoSource, userError.message);
    }
  }

  async p(x) {
    await this.sleep(0);
    await x.acquire(this);
  }

  async v(x) {
    await this.sleep(0);
    await x.release(this);
  }

  async sleep(secs) {
    return new Promise((resolve, _reject) => {
      setTimeout(resolve, secs * 1000);
    });
  }

  /**
   * Prefix "p", "v", "sleep", and "circuler" with the `await` keyword
   *   and attach them to the `that` object
   * 
   * @param {string} code
   * @returns {string}
   */
  static awaitifyThat(code) {
    return code.replace(/\b(p|v|sleep|circuler)\(/g, 'await that.$1(');
  }

  /**
   * A vehicle's place in line is determined by a vector of priorities
   * which are based on calls to p(...)
   * 
   * @todo Should dedup before returning?
   * 
   * @param {string} code
   * @return {Array<string>}
   */
  static parseOrderVector(code) {
    const pCalls = code.match(/\bp\(\s*(\w+)\s*\)/g) || [];
    const acquiredSemaphores = pCalls.map(x => x.slice(2, -1).trim());
    return acquiredSemaphores;
  }

}


class Changement extends Algorithme {

  constructor() {
    super('changement');
    this.run();
    // ...
  }

}


class Traversee extends Algorithme {

  static count = 0;
  static freeColors = 'blue coral darkkhaki firebrick yellowgreen gray skyblue teal orange pink purple yellow'.split(' ');

  constructor(algoSource) {
    super(algoSource);

    this.id = this.getUniqueId();
    this.color = this.getUniqueColor();
    this.type = Math.random() < 0.25 ? 'truck' : 'car'; // 25% chance of being a truck
    this.name = `${this.color} ${this.type} #${this.id}`;
    this.$elem = null;
  }

  initElem() {
    this.$elem = document.createElement('span');
    this.$elem.classList.add('vehicle', this.type);
    this.$elem.dataset.direction = this.algoSource === 'traversee1' ? 'down' : 'left';
    this.$elem.style.backgroundColor = this.color;
    this.$elem.title = this.name; // (will be updated)
    this.$elem.style.order = '9999'; // HACK needless? (will be updated)
  }

  async circuler() {
    // start moving
    await this.sleep(Math.random());
    // cross the intersection then "keep moving" and fade away...
    await this.enterIntersection();
    await this.leaveIntersection();
  }

  async enterIntersection() {
    Sim.ui.$carrefour.append(
      this.$elem.parentNode.removeChild(this.$elem)
    )
    this.assertNoCollision();
    await this.sleep(1);
  }

  async leaveIntersection() {
    this.$elem.dataset.state = 'leaving';
    await this.sleep(1);
    this.assertNoCollision();
    this.destroy();
  }

  assertNoCollision() {
    const $c = Sim.ui.$carrefour;
    const happened = $c.children.length > 1; // more than one vehicle crossing the intersection
    if (happened) {
      $c.dataset.state = 'collision'; // enum {'normal', 'collision'}
      throw new Error('Collision!');
    }
  }
  
  /**
   * @returns {Array<number>}
   */
  getWaitVec() {
    const vec = this.orderVec.map(semaName => Sim.userVars[semaName].getPosition(this));
    return vec;
  }

  getUniqueId() {
    return (++Traversee.count).toString(36).toUpperCase();
  }
  
  getUniqueColor() {
    return Traversee.freeColors.shift();
  }

  destroy() {
    Traversee.freeColors.push( this.color );
    this.$elem.remove();
  }

  /**
   * 
   * @param {Traversee} a 
   * @param {Traversee} b 
   * @returns {number}
   */
  static compareTraversees(a, b) {
    return Traversee.compareVecs( a.getWaitVec(), b.getWaitVec() );
  }

  /**
   * Sort wait vecs in an ascending order
   * 
   * @param {Array<number>} vecA
   * @param {Array<number>} vecB
   * @returns {number}
   */
  static compareVecs(vecA, vecB) {
    for (let i = 0; i < vecA.length; i++) {
      if (vecA[i] - vecB[i] !== 0) {
        return vecA[i] - vecB[i];
      }
    }
    return 0;
  }
  
}


class Traversee1 extends Traversee {

  static MAX = 4;

  constructor() {
    super('traversee1');
    this.init();
  }

  init() {
    this.initElem();
    Sim.ui.$voie1.append(this.$elem);
    Sim.voie1.push(this);
    this.run();
  }

  destroy() {
    super.destroy();
    Sim.voie1.splice(Sim.voie1.findIndex(t => t === this), 1);
  }

}


class Traversee2 extends Traversee {

  static MAX = 7;

  constructor() {
    super('traversee2');
    this.init();
  }

  init() {
    this.initElem();
    Sim.ui.$voie2.append(this.$elem);
    Sim.voie2.push(this);
    this.run();
  }
  
  destroy() {
    super.destroy();
    Sim.voie2.splice(Sim.voie2.findIndex(t => t === this), 1);
  }

}

Sim.setup();
