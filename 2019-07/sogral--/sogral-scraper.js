//@ts-check
/**
 * @file Sogral Scraper
 *
 * - Tried to refactor this thing after reading @getify/Functional-Light-JS
 * - Maybe use these packages: functional-promises, axios-retry, sqlite3
 * 
 * @todo Use an async promises lib to do Promise.map/series!
 * @todo denormalizeData :: Data -> Array DenormalizedVoyage? Easier to work with?
 * @todo Export denormalized data to an sqlite database for my friends to practice BD?
*/
/*
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

const fs = require('fs').promises;
const R = require('ramda');
const axios = require('axios').default;
const {JSDOM} = require('jsdom');
const sleep = require('sleep-promise');

// domify :: String -> Document
const domify = html => (new JSDOM(html)).window.document;

// TODO: just import it from index.js?
// sel :: String -> HTMLElement -> HTMLElement
const sel = R.curry( (query, $parent) => $parent.querySelector(query) );

// getPage :: String -> Promise String
const getPage = (function pageGetter() {
  const instance = axios.create({
    baseURL: 'https://www.sogral.dz/app_sogral/app/',
    headers: {
      'User-Agent': 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:68.0) Gecko/20100101 Firefox/68.0'
    }
  });
  return (subpath) => instance.get(subpath).then(res => res.data);
})();


// toDepartObj :: HTMLOptionElement -> Object
const toDepartObj = $option => ( {code: $option.value, name: $option.textContent} );

// hasCodeZero :: Object -> Boolean
const hasCodeZero = R.compose( R.equals('0'), R.prop('code') );

// TODO: Re-test this function!
// extractDeparts :: Document -> Array Object
const extractDeparts = R.pipe(
  sel('#depart'),
  R.prop('children'),
  Array.from,
  R.map(toDepartObj),
  R.reject(hasCodeZero)
  );

// fetchDeparts :: () -> Array Object
const fetchDeparts = R.pipeP(
  R.always(Promise.resolve('fr.php')),
  getPage,
  domify,
  extractDeparts
  );

// TODO: use domify(..)!
// parseDests :: String -> Array Object
function parseDests(html) {
  return html
  .split('\n')
  .map((line) => {
    const rOption = /\<option value="(\d+)"\s+>(.+)\<\/option\>/;
    const matched = line.match(rOption);
    if (matched) {
      let [, code, name] = matched;
      return {code, name};
    } else {
      return undefined;
    }
  })
  .filter(Boolean);
}

// fetchDests :: Array Object -> Array Object
async function fetchDests(departs) {
  departs = R.clone(departs);
  for (const depart of departs) {
    const html = await getPage(`cdepar.php?cdepar=${depart.code}`);
    depart.dests = parseDests(html);
  }
  return departs;
}

// TODO: use domify!
// TODO: maybe remove the 'destination' field
// parseVoyages :: String -> Array Object
function parseVoyages(html) {
  const voyages_trs = html.match(/<tr>[\s\S]+?<\/tr>/g);
  const voyages =
  voyages_trs.map((voyage_tr, _i) => {
    const transporteurMatch = voyage_tr.match(/<span.*>(.+)\<\/span>/);
    const transporteur = transporteurMatch ? transporteurMatch[1] : undefined;
    const voyage_tds = voyage_tr.match(/<td >(.+?)<\/td>/g) || [];
    const [ligne, destination, prix, heure] = voyage_tds.map(td => td.slice(5, -5).trim());
    return { heure, prix, ligne, transporteur, destination };
  })
  .filter(v => !!v.heure);
  return voyages;
}

// fetchVoyages :: Array Object -> Array Object
async function fetchVoyages(departs) {
  departs = R.clone(departs);
  for (const depart of departs) {
    for (const dest of depart.dests) {
      if (typeof dest.voyages === 'undefined') {
        try {
          dest.voyages =
            await R.pipeP(getPage, parseVoyages)(`fr.php?depart=${depart.code}&destinations=${dest.code}`);
        } catch(e) {
          // TODO: Handle network errors! Use the 'axios-retry' package maybe.
          // Currently voyages will be undefined so that a subsequent call to
          // this function will try to fix it.
        } finally {
          // To prevent error code 508 (Resource Limit Is Reached)
          await sleep(Math.random() * 60*1000);
        }
      }
    }
  }
  return departs;
}

// Convert everything to the format "SOMETHING / SOMETHING ELSE"
// formatPlace :: String -> String
const formatPlace = R.compose(R.toUpper, R.trim, R.replace(/\s*\/\s*/, ' / '));

// formatPrice :: String -> Number
const formatPrice = R.unary( R.partialRight(Number.parseInt, [10]) );

/*
SogralData {
    date: string
    departs: Array<{
        code: number
        name: string
        dests: Array<{
            code: number
            name: string
            voyages: Array<{
                heure: string
                prix: string
                ligne: string
                transporteur: string
            }>
        }>
    }>
}
*/
// tidyData :: Object -> Object
function tidyData(data) {
  const trans = {
    date: R.identity,
    departs: R.map(R.evolve({
      code: Number,
      name: formatPlace,
      dests: R.map(R.evolve({
        code: Number,
        name: formatPlace,
        voyages: R.map(R.pipe(
          R.dissoc('destination'),
          R.evolve({
            heure: R.identity,
            prix: formatPrice,
            ligne: R.trim,
            transporteur: R.trim,
          })
        ))
      }))
    }))
  }
  return R.evolve(trans, data);
}

// MAYBE: Rename fetchData to fetchDeparts, and fetchDeparts to fetchBareDeparts
const fetchData = R.pipeP(fetchDeparts, fetchDests, fetchVoyages);

const jsonify = R.curryN(3, JSON.stringify)(R.__, null, 2);

const write = R.curryN(3, fs.writeFile)(R.__, R.__, 'utf8');

const getDate = () => (new Date).toJSON();

// TODO: Use R.assoc(..) maybe
const wrapData = (destsArr) => ( {date: getDate(), dests: destsArr} );

const scrap = R.pipeP(
  fetchData,
  wrapData,
  tidyData,
  jsonify,
  write('sogral-data.json')
  );

//@ts-ignore
if (require.main === module) {
  scrap();
} else {
  // for testing
  module.exports = {
    formatPlace,
    formatPrice,
  }
}
