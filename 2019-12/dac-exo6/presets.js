const myAttempt = {

semaNames: 'sFeu, sVide',
semaVals: '1, 1',

intNames: 'feu',
intVals: '1',

changement:
`while (true) {
  sleep(15)//interval
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

semaNames: 'sFeu1, sFeu2, sVide1, sVide2',
semaVals: '1, 0, 1, 1',

intNames: 'feu',
intVals: '1',

changement:
`while (1) {
  sleep(15)//durée~
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
