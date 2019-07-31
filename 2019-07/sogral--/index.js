//@ts-check
"use strict"
const R = require('ramda');
const sogralData = require('./sogral-data.json');

// replaceContent :: HTMLElement -> String -> ()
const replaceContent = R.curry( ($elem, content) => $elem.innerHTML = content );

// sel :: String -> HTMLElement -> HTMLElement
const sel = R.curry( (query, $parent) => $parent.querySelector(query) );

// on :: HTMLElement -> String -> Function -> ()
const on = R.curry ( ($el, ev, fn) => $el.addEventListener(ev, fn) );

// numVal :: HTMLInputElement -> Number
const numVal = R.compose( Number, R.prop('value') );

// generateOptions :: Array Object -> String
const generateOptions = R.pipe( R.map(x => `<option value="${x.code}">${x.name}</option>`), R.join('') );

function updateDeparts($doc, data) {
  replaceContent(
    sel('#depart', $doc),
    generateOptions( data.departs )
  )
}

function updateDests($doc, data) {
  const depart = numVal( sel('#depart', $doc) );
  replaceContent(
    sel('#dest', $doc),
    generateOptions( data.departs.find(d => d.code == depart).dests )
  )
}

// voyages :: Object -> Number -> Number -> Array Object
const voyages = R.curry( (data, departCode, destCode) => {
  try {
    return data
      .departs
      .find(depart => depart.code === departCode)
      .dests
      .find(dest => dest.code === destCode)
      .voyages;
  } catch(e) {
    return [];
  }
});

// generateLine :: Object -> String
const generateLine = ({heure, prix, ligne, transporteur}) => `
  <div class="voyage">
    <span class="heure">${heure}</span>
    <span class="prix">${prix} DA</span>
    <span class="extra"><b>L:</b> ${ligne}</span>
    <span class="extra"><b>T:</b> ${transporteur}</span>
  </div>`;

// generateOutput :: Array Object -> String
function generateOutput(voyages) {
  if (voyages.length === 0) {
    return 'Pas de donées ou pas de voyages.'
  } else {
    return voyages.map(generateLine).join('');
  }
}

function updateOutput($doc, data) {
  const replaceOutput = replaceContent( sel('#output', $doc) );
  const [depart, dest] = R.map( R.compose(numVal, sel(R.__, $doc)), ['#depart', '#dest'] );

  R.pipe(
    () => voyages(data, depart, dest),
    R.tap(console.info),
    generateOutput,
    replaceOutput,
  )();
}

(function setup($doc, data) {
  
  on(
    sel('#depart', $doc),
    'change',
    (_event) => updateDests($doc, data)
  );

  on(
    sel('form', $doc),
    'change',
    (_event) => updateOutput($doc, data)
  );

  updateDeparts($doc, data);

})(document, sogralData);
