const myAttempt = {

semas: {
  names: 'sFeu, sVide',
  vals: '1, 1'
},

ints: {
  names: 'feu',
  vals: '1'
},

changement:
`while (true) {
  sleep(15)
  p(sFeu)
  if (feu == 1) {
    feu = 2
  } else {
    feu = 1
  }
  v(sFeu)
}`,

traversee1:
`while (true) {
  sleep(0) //needed
  p(sFeu)
  if (feu == 1) {
    p(sVide)
    circuler()
    v(sVide)
    v(sFeu)
    break;
  }
  v(sFeu)
}`,

traversee2:
`while (true) {
  sleep(0) //needed
  p(sFeu)
  if (feu == 2) {
    p(sVide)
    circuler()
    v(sVide)
    v(sFeu)
    break;
  }
  v(sFeu)
}`,

}

const correctAnswer = {

semas: {
  names: 'sFeu1, sFeu2, sVide1, sVide2',
  vals: '1, 0, 1, 1'
},

ints: {
  names: 'feu',
  vals: '1'
},

changement:
`while (true) {
  sleep(10)
  if (feu == 1) {
    p(sFeu1)
    feu = 2
    v(sFeu2)
  } else {
    p(sFeu2)
    feu = 1
    v(sFeu1)
  }
}`,

traversee1:
`p(sVide1)
p(sFeu1)
circuler()
v(sFeu1)
v(sVide1)`,

traversee2: `p(sVide2)
p(sFeu2)
circuler()
v(sFeu2)
v(sVide2)`,

}

const presets = {myAttempt, correctAnswer};

// in setupUI()
ui.$loadMyAttempt.onclick = () => loadPreset(presets.myAttempt);
ui.$loadCorrectAnswer.onclick = () => loadPreset(presets.correctAnswer);

function loadPreset(obj) {
  const {ui} = Sim;
  ui.$traversee1.value = obj.traversee1;
  ui.$traversee2.value = obj.traversee2;
  ui.$changement.value = obj.changement;
  //...
}

// ------------------------

function resetUI() {
  if (Sim.ui === null) {
    setupUI();
  }
  // ...
}

function freezeSimUI() {
  // To replace all elements so no one can alter the current state
  Sim.ui.$sim.outerHTML = Sim.ui.$sim.outerHTML;

  // To signal that they no longer reference actual DOM elements and free them maybe(?)
  Sim.ui = null;
  /*
  // Or maybe like this?
  for (const key of ui) {
    ui[key] = null;
  }
  */
}

/*

stop()
  - cancel Changement (AFAIK you can not cancel Promises...)
  - free/drain semaphores (for each semaphore in userVars, reject all waiters)

---

- Rename orderVec or orderArr? That way orderArr and waitVec won't be confused

---

* Animation:
  - https://css-tricks.com/almanac/properties/a/animation/
  - https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Animations/Using_CSS_animations

- Instead of 'order', use "margin-right = pos * Traversee.WIDTH + Traversee.SPACING".. This is simpler to animate
- Interesting: https://stackoverflow.com/questions/8123525/using-jquery-to-re-order-and-animate-list-items

- Learn how to obtain the error line number from anonymous functions created via AsyncFunction

---

Notes to others:

- Performance does not really matter.
- Semaphore: I needed something that supports supports `getPosition(this)`

The viz/animation is not guarenteed to work if you use conditionals or loops because of the simple ordering algorithm used (order vec according to calls to p).
I could have used "shared-semaphore" to implement semaphores across Web Workers which would then run in parallel but that would be too much and shared-sema won't work on all browsers. A Promise-based pseudo-parallelism is good enough...

I could add sleep(0) to p and v but... nah(?) I don't want user to rely on me,
and wanted them to be well aware of this limitation because they might consider using active wait loops and stuff
(although this is very improbable since our exercise is about semaphores and active wait synchro algorithms were
only skimmed through for their historical significance)

*/
