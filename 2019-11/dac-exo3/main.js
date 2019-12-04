//@ts-check
// "main thread" ("UI Thread" à la Android)

const sharedT = new SharedArrayBuffer(4);
const sharedV = new SharedArrayBuffer(4);
const unit8T = new Uint8Array(sharedT);
const unit8V = new Uint8Array(sharedV);
unit8T.fill('-'.charCodeAt(0));
unit8V[3] = '-'.charCodeAt(0); // V[L]

/*
   Basic page markup:

   ------------------------------------
   - 
   -                [0] $T0 
   -  (P1) i=$i      
   -  (P2) j=$j     [1] $T1
   -  (P3) k=$k      
   -                [2] $T2
   ------------------------------------
   - Last character consumed by P3: $l
   ------------------------------------

*/

const [$i, $j, $k, $l, $T0, $T1, $T2] =
  'i j k l T0 T1 T2'.split(' ')
  .map(id => document.querySelector(`#${id}`));

/**
 * Update view
 * @todo Add caching? Maybe currentVT = [...V, ...T]; shouldUpdate = currentVT.some((x, i) => lastVT[i] !== x);
 * @todo Refactor
 */
function update() {
  const V = unit8V.slice();
  const T = unit8T.slice();
  const [i, j, k, l] = V;
  
  $i.innerHTML = i;
  $j.innerHTML = j;
  $k.innerHTML = k;

  $l.innerHTML = String.fromCharCode(l);

  $T0.innerHTML = String.fromCharCode(T[0]);
  $T1.innerHTML = String.fromCharCode(T[1]);
  $T2.innerHTML = String.fromCharCode(T[2]);
}

function main() {
  const params = new URL(window.location.toString()).searchParams;
  const scenario = params.has('scenario') ? params.get('scenario').split(',') : ['p1', 'p2', 'p3'];

  const vide = new Semaphore(3);
  const plein1 = new Semaphore(0);
  const plein2 = new Semaphore(0);

  const workers = scenario.map((id) => {
    const w = new Worker('./worker.js');
    w.postMessage({
      id,
      sharedT,
      sharedV,
      sharedVide: vide.getShared(),
      sharedPlein1: plein1.getShared(),
      sharedPlein2: plein2.getShared(),
    });
    return w;
  });
}

main();

const updateInterval = setInterval(update, 100);
//window.requestAnimationFrame(update); // didn't work
// try Observables?
