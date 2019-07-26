//@ts-check

/**
 * Front-end stuff
 * 
 * @todo Make it actually work!!
 * @todo Browserify it!
 */

/*
SogralData {
    date: string
    departs: Array<{
        code: string
        name: string
        dests: Array<{
            code: string
            name: string
            voyages: Array<{
                heure: string
                prix: string
                ligne: string
                transporteur: string
                destination: string // The same as dest.name? Delete it?
            }>
        }>
    }>
}

DenormalizedVoyage {
  departName: string
  departCode: string

  destName: string
  destCode: string

  heure: string
  prix: string
  ligne: string
  transporteur: string
}

*/

const R = require('ramda');

const replace = ($target, $element) => $target.replaceWith($element);
const replaceContent = ($elem, content) => $elem.innerHTML = content;
const value = R.partial(R.prop, 'value');

function generateSelect(name, options) {
  return `<select name="${name}" id="${name}">` + 
    options.map(option => `<option value="${option.code}">${option.name}</option>`).join('') +
  '</select>';
}

function updateDeparts($doc, data) {
  const departs = data;
  replace($doc.querySelector('#depart'), generateSelect('depart', departs));
}

function updateDests($doc, data) {
  const newDests = data[ value($doc.querySelector('#depart')) ];
  replace($doc.querySelector('#dest'), generateSelect('dest', newDests));
}

// voyages :: (object, string, string) -> Array object
function voyages(data, departCode, destCode) {
  return data.departs
    .find(depart => depart.code === departCode)
    .find(dest => dest.code === destCode);
}

function generateLine({heure, prix, transporteur, ligne, destination}) {
  return `
    <div class="voyage">
      <span class="heure">${heure}</span>
      -
      <span class="prix">${prix}</span>
      <span class="extra">- T: ${transporteur} - L: ${ligne} - D: ${destination}</span>
    </div>`;
}

// generateOutput :: Array object -> string
function generateOutput(voyages) {
  if (voyages.length === 0) {
    return 'Pas de donées ou pas de voyages.'
  } else {
    return voyages.map(generateLine).join('');
  }
}

function updateOutput($doc, data) {
  const replaceOutput = R.partial(replaceContent, $doc.querySelector('#output'));

  R.pipe(
    R.always(['#depart', '#dest']),
    R.map(R.compose(value, $doc.querySelector)),
    R.apply(R.partial(voyages, data)),
    generateOutput,
    replaceOutput,
  )();
}

function setup($doc, data) {
  const on = ($el, ev, fn) => $el.addEventListener(ev, fn);
  on($doc.querySelector('form [name="de"]'), 'change', () => updateDests($doc, data));
  on($doc.querySelector('form'), 'change', () => updateOutput($doc, data));
  updateDeparts($doc, data);
}

// const sogralData = require('sogral-data.json'));
/* or */
fetch('sogral-data.json')
  .then(res => res.json())
  .then(sogralData => setup(document, sogralData));
