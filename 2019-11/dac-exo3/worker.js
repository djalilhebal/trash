//@ts-check
self.importScripts('semaphore.js');

// For practical reasons (see Notes in index.html), we use V[I] instead of i, etc.
let T, V;
const I = 0, J = 1, K = 2, L = 3;
let vide, plein1, plein2;

self.addEventListener('message', (ev) => {
  const {
     id,
     sharedT, sharedV,
     sharedVide, sharedPlein1, sharedPlein2 // Semaphores
  } = ev.data;

  T = new Uint8Array(sharedT);
  V = new Uint8Array(sharedV);

  vide = new Semaphore(3, sharedVide);
  plein1 = new Semaphore(0, sharedPlein1);
  plein2 = new Semaphore(0, sharedPlein2);
  
  switch (id) {
    case 'p1':
      p1();
      break;

    case 'p2':
      p2();
      break;

    case 'p3':
      p3();
      break;

    default:
      throw new Error(`Unknown P id: ${id}`);
  }

});

async function p1() {
  console.log('P1: started');

  let c = 'a'.charCodeAt(0);

  while (true) {
    await vide.acquire();
    await att();

    // produce a character into T[i]
    T[ V[I] ] = c;
    c = c < 'z'.charCodeAt(0) ? c + 1 : 'a'.charCodeAt(0);

    V[I] = (V[I] + 1) % 3;
    plein1.release();
  }
}

async function p2() {
  console.log('P2: started');

  let C;

  while (true) {
    await plein1.acquire();
    await att();

    C = String.fromCharCode(T[ V[J] ]).toUpperCase().charCodeAt(0);
    T[ V[J] ] = C;

    V[J] = (V[J] + 1) % 3;
    plein2.release();
  }
}

async function p3() {
  console.log('P3: started');

  while (true) {
    await plein2.acquire();
    await att();
    
    // consume
    V[L] = T[ V[K] ];
    T[ V[K] ] = '-'.charCodeAt(0);

    V[K] = (V[K] + 1) % 3;
    vide.release();
  }
}

function att() {
  const n = Math.floor( (Math.random() * 5) + 1 );
  return new Promise((resolve, _reject) => {
    setTimeout(() => {
      resolve(n);
    }, n * 1000);
  })
}
