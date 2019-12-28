/**
 * @file DAC Exo6
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
 * A Promise-based and queue-based Semaphore
 * @todo maybe fork or learn from https://github.com/zeit/async-sema
 */
const Semaphore = class SillySemaphore {

  constructor(permits) {
    this._permits = permits;
    this._queue = [];
  }

  getPosition(requester) {
    const idx = this._queue.findIndex(entry => entry.requester === requester);
    return idx + 1; // to get rid of '-1'
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
  static drawerInterval = null;

  static start() {
    Sim.clearErrors();
    Sim.loadUserInputs();
    Sim.ui.$fieldset.disabled = true;
    Sim.initCreator();
    Sim.initDrawer();
    // ...
  }

  static stop() {
    clearInterval(Sim.creatorInterval);
    clearInterval(Sim.drawerInterval);
    Sim.ui.$fieldset.disabled = false;
    // ...
  }

  static setup() {
    const $ = str => document.querySelector(str);

    Object.assign(Sim.ui, {
      $form: $('form'),
      $fieldset: $('form fieldset'),
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
    const fd = new FormData(ui.$form);
    const SEP = /,\s*/; // separator

    const userSemas = zipObject(
      fd.get('sema-names').split(SEP),
      fd.get('sema-vals').split(SEP).map(val => new Semaphore(Number(val)))
    );

    const userInts = zipObject(
      fd.get('int-names').split(SEP),
      fd.get('int-vals').split(SEP).map(val => Number(val))
    );

    Object.assign(Sim.userVars, userSemas, userInts);
  }

  static initCreator() {
    Sim.chan = new Changement();
    Sim.creatorInterval = setInterval(Sim.maybeCreateTraversee, 2 * 1000);
  }

  static initDrawer() {
    // HACK: Redraw every 1/4 sec
    Sim.drawerInterval = setInterval(Sim.redraw, 0.25 * 1000);
  }

  /**
   * Maybe create a new instance of Traversee every 2 secs
   * @todo Make voieX.push(..) part of Traversee's own logic
   */
  static maybeCreateTraversee() {
    if (Math.random() < 0.5) return;
    const {voie1, voie2} = Sim;
    if (Math.random() < 0.5) {
      if (voie1.length < Traversee.MAX_PAR_VOIE) {
        voie1.push( new Traversee1() );
      }
    } else {
      if (voie2.length < Traversee.MAX_PAR_VOIE) {
        voie2.push( new Traversee2() );
      }
    }
  }

  static redraw() {
    // Just update dataset and order values, and let CSS take care of the rest.

    // Feu
    Sim.ui.$sim.dataset.feu = Sim.userVars.feu;

    // Voies
    const {voie1, voie2} = Sim;
    const tousTraversees = [...voie1, ...voie2];
    tousTraversees.sort(Traversee.makeSorter());
    tousTraversees.forEach((t, i) => {
      t.$elem.title =
`${t.color} ${t.type} #${t.id}

orderVec: {${t.orderVec.join(', ')}}
waitVec: {${t.getWaitVec().join(', ')}}`
      t.$elem.style.order = i;
    });
  }

  static showError(algoSource, message) {
    Sim.ui[ '$' + algoSource ].setAttribute('title', message);
    Sim.stop();
    // Sim.freezeUI(); // maybe?
  }

  static clearErrors() {
    Sim.ui.$form.querySelectorAll('[title]').forEach($x => $x.removeAttribute('title'));
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
      with (that) {
        with (Sim.userVars) {
          ${ Algorithme.awaitify(this.userAlgo) }
        }
      }
      `)(this);
    } catch (userError) {
      console.error('userError', userError);
      Sim.showError(this.algoSource, userError.message);
    }
  }

  async p(x) {
    await x.acquire(this);
    //this.orderVec.shift(); // maybe?
  }

  async v(x) {
    await x.release(this);
  }

  async sleep(secs) {
    return new Promise((resolve, _reject) => {
      setTimeout(resolve, secs * 1000);
    });
  }

  /**
   * Prefix "p", "v", "sleep", and "circuler" with the `await` keyword
   * @param {string} code
   * @returns {string}
   */
  static awaitify(code) {
    return code.replace(/\b(p|v|sleep|circuler)\(/g, 'await $1(');
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

  static MAX_PAR_VOIE = 4;
  static count = 0;
  static freeColors = 'blue coral darkkhaki firebrick green gray skyblue teal orange pink purple yellow'.split(' ');

  constructor(algoSource) {
    super(algoSource);

    this.id = this.getUniqueId();
    this.color = this.getUniqueColor();
    this.type = Math.random() < 0.25 ? 'truck' : 'car'; // 25% chance of being a truck

    // TODO Move to dedicated method?
    // TODO Stop relying on .traversee1 and .traversee2 (.<algoSource>)
    this.$elem = document.createElement('span');
    this.$elem.classList.add('vehicle', this.type, this.algoSource);
    this.$elem.title = `${this.color} ${this.type} #${this.id}`;
    this.$elem.style.backgroundColor = this.color;
    this.$elem.style.order = '9999'; // HACK needless?
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
    
    // TODO Move to child classes
    // remove from the road's list
    if (this.algoSource === 'traversee1') {
      Sim.voie1.splice(Sim.voie1.findIndex(t => t === this), 1);
    } else {
      Sim.voie2.splice(Sim.voie2.findIndex(t => t === this), 1);
    }
  }

  /**
   * Create a compare function for Traversee, with memoization support
   * @returns {(a: Traversee, b: Traversee) => number}
   */
  static makeSorter() {
    const memoizedVecs = new WeakMap();
    
    function getVecOf(t) {
      if (!memoizedVecs.has(t)) {
        memoizedVecs.set(t, t.getWaitVec());
      }
      return memoizedVecs.get(t);
    }
  
    /**
     * Sort wait vecs in an ascending order
     * 
     * @param {Array<number>} vecA 
     * @param {Array<number>} vecB 
     * @returns {number}
     */
    function compareVecs(vecA, vecB) {
      for (let i = 0; i < vecA.length; i++) {
        if (vecA[i] - vecB[i] !== 0) {
          return vecA[i] - vecB[i];
        }
      }
      return 0;
    }
  
    function compareTraversees(a, b) {
      return compareVecs(
        getVecOf(a),
        getVecOf(b)
      )
    }
  
    return compareTraversees;
  }
  
}


class Traversee1 extends Traversee {

  constructor() {
    super('traversee1');
    Sim.ui.$voie1.append(this.$elem);
    this.run();
  }

}


class Traversee2 extends Traversee {

  constructor() {
    super('traversee2');
    Sim.ui.$voie2.append(this.$elem);
    this.run();
  }

}

Sim.setup();
