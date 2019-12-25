// import SillySemaphore as Sema from './scripts/semaphore.js';

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
const Sema = class SillySemaphore {

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
        this._permits--;
        entry.resolve();
      }
    }
  }

}

// HACK: All refs to ui should really point directly to Exo6.ui
let ui = null;

class Exo6 {

  static userVars = {};
  static userAlgos = {};
  static voie1 = [];
  static voie2 = [];
  static chan = null;

  static ui = {};
  static creatorInterval = null;
  static drawerInterval = null;

  static start() {
    Exo6.clearErrors();
    Exo6.loadUserInputs();
    Exo6.ui.$fieldset.disabled = true;
    Exo6.initCreator();
    Exo6.initDrawer();
    // ...
  }

  static stop() {
    clearInterval(Exo6.creatorInterval);
    clearInterval(Exo6.drawerInterval);
    Exo6.ui.$fieldset.disabled = false;
    // ...
  }

  static setup() {
    const $ = str => document.querySelector(str);

    Object.assign(Exo6.ui, {
      $form: $('form'),
      $fieldset: $('form fieldset'),

      $changement: $('#changement'),
      $traversee1: $('#traversee1'),
      $traversee2: $('#traversee2'),

      $feu1: $('#feu1'),
      $feu2: $('#feu2'),
      $voie1: $('#voie1'),
      $voie2: $('#voie2'),
      $carrefour: $('#carrefour'),
    })

    Exo6.ui.$form.onsubmit = (ev) => {
      ev.preventDefault();
      Exo6.start();
    }

    ui = Exo6.ui; // HACK
  }
  
  static loadUserInputs() {
    // userAlgos...
    Object.assign(Exo6.userAlgos, 
      {
        changement: ui.$changement.value,
        traversee1: ui.$traversee1.value,
        traversee2: ui.$traversee2.value,
      }
    )

    // userVars...
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

    Object.assign(Exo6.userVars, userSemas, userInts);
  }

  static initCreator() {
    Exo6.chan = new Changement();

    // Maybe create a new instance of Traversee every 2 secs
    Exo6.creatorInterval = setInterval(function maybeCreate() {
      if (Math.random() < 0.5) return;
      const {voie1, voie2} = Exo6;
      if (Math.random() < 0.5) {
        if (voie1.length < Traversee.MAX_PAR_VOIE) {
          voie1.push( new Traversee1() );
        }
      } else {
        if (voie2.length < Traversee.MAX_PAR_VOIE) {
          voie2.push( new Traversee2() );
        }
      }
    }, 2 * 1000);
  }

  static initDrawer() {
    // Redraw every half a sec
    Exo6.drawerInterval = setInterval(Exo6.drawAll, 0.25 * 1000);
  }

  static drawAll() {
    Exo6.drawFeu();
    Exo6.drawVois();
  }

  static drawFeu() {
    if (Exo6.userVars.feu == 1) {
      ui.$feu1.classList.add('green');
      ui.$feu2.classList.remove('green'); // set red
    } else {
      ui.$feu2.classList.add('green');
      ui.$feu1.classList.remove('green'); // set red
    }
  }

  static drawVois() {
    const {voie1, voie2} = Exo6;
    const tousTraversees = [...voie1, ...voie2];

    // Update wait vector and use it to calculate order in line
    for (const traversee of tousTraversees) {
      traversee.$elem.style.order = traversee.getOrderVector().join('');
    }
  }

  static showError(target, message) {
    ui[ '$' + target ].setAttribute('title', message);
  }

  static clearErrors() {
    ui.$form.querySelectorAll('[title]').forEach($x => $x.removeAttribute('title'));
  }

}

class Algorithme {

  /**
   * @param {String} source - "changement", "traversee1", or "traversee2"
   */
  constructor(source) {
    this.source   = source;
    this.userAlgo = Exo6.userAlgos[source];
    this.waitVec  = Algorithme.parseOrderVector(this.userAlgo);
  }

  async run() {
    const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
    const getErrorLineNum = e => Number( e.stack.match(/:(\d+):\d+\)?$/m)[1] );
    const referenceLineNum = getErrorLineNum(new Error());
    const userStartLineNum = referenceLineNum + 6;
    try {
      await new AsyncFunction('that', `
      with (that) {
        with (Exo6.userVars) {
          ${ Algorithme.awaitify(this.userAlgo) }
        }
      }
      `)(this);
    } catch (userError) {
      console.warn(userError)
      const relativeLineNum = getErrorLineNum(userError) - userStartLineNum;
      const relativeMessage = `${relativeLineNum}: ${userError.message}`;
      Exo6.showError(this.source, relativeMessage);
    }
  }

  async p(x) {
    if (typeof x === 'string') {
      await Exo6.userVars[x].acquire(this);
    } else {
      await x.acquire(this);
    }
    //this.waitVec.shift(); // maybe?
  }

  async v(x) {
    if (typeof x === 'string') {
      await Exo6.userVars[x].release(this);
    } else {
      await x.release(this);
    }
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
   * @todo Dedup before returning?
   * @todo Handle whitespace?
   * 
   * @param {string} code
   * @return {Array<string>}
   */
  static parseOrderVector(code) {
    const pCalls = code.match(/p\((\w+)\)/g) || [];
    const acquiredSemaphores = pCalls.map(x => x.slice(2, -1));
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

  static MAX_PAR_VOIE = 5;
  static freeColors = 'blue coral darkkhaki firebrick green gray skyblue teal orange pink purple yellow'.split(' ');
  // ...

  constructor(algoSource) {
    super(algoSource);

    this.color = this.getUniqueColor();
    this.type = Math.random() < 0.25 ? 'truck' : 'car'; // 25% chance of being a truck

    this.$elem = document.createElement('span');
    this.$elem.classList.add('vehicle', this.type, this.source);
    this.$elem.style.backgroundColor = this.color;
    this.$elem.style.order = '9999'; // HACK
  }

  async circuler() {
    // start moving
    await this.sleep(Math.random());

    // cross(?) the intersection then "keep moving" and fade away...
    await this.enterIntersection();
    await this.leaveIntersection();

    this.destroy();
  }

  async enterIntersection() {
    Exo6.ui.$carrefour.append(
      this.$elem.parentNode.removeChild(this.$elem)
    )
    await this.sleep(1);
  }

  async leaveIntersection() {
   this.$elem.classList.add('leaving');
   await this.sleep(1);
  }

  getOrderVector() {
    const indexes = this.waitVec.map(semaName => Exo6.userVars[semaName].getPosition(this) );
    const vec = indexes.map(i => i + 1); // to get rid of '-1' values
    return vec;
  }

  getUniqueColor() {
    return Traversee.freeColors.shift();
  }

  destroy() {
    Traversee.freeColors.push( this.color );
    this.$elem.remove();
    // TODO Move to child classes
    // remove from the road's list
    if (this.source === 'traversee1') {
      Exo6.voie1.splice(Exo6.voie1.findIndex(t => t === this), 1);
    } else {
      Exo6.voie2.splice(Exo6.voie2.findIndex(t => t === this), 1);
    }
  }

}


class Traversee1 extends Traversee {

  constructor() {
    super('traversee1');
    ui.$voie1.append(this.$elem);
    this.run();
  }

}


class Traversee2 extends Traversee {

  constructor() {
    super('traversee2');
    ui.$voie2.append(this.$elem);
    this.run();
  }

}

Exo6.setup();
