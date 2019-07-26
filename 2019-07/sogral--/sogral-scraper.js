//@ts-check
/**
 * @file Scrap Sogral
 * 
 * Maybe use modules: jsdom, sqlite3, axios, functional-promises
 * 
 * @todo Convert `prix` and `code` to numbers to save space!
 * @todo Use an async promises lib to do Promise.map/series!
 * @todo denormalizeData :: Data -> Array DenormalizedVoyage
 * @todo Export data as a denormalized sqlite database?
 */

const fs = require('fs').promises;
const R = require('ramda');
const axios = require('axios');
const {JSDOM} = require('jsdom');
const sleep = require('sleep-promise');

// domify :: string -> Document
const domify = html => (new JSDOM(html)).window.document;

// getter :: () -> (string -> Promise string)
const getter = () => {
  //@ts-ignore
  const instance = axios.create({
    baseURL: 'https://www.sogral.dz/app_sogral/app/',
    headers: {
      'User-Agent': 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:68.0) Gecko/20100101 Firefox/68.0'
    }
  });
  return (subpath) => instance.get(subpath).then(res => res.data);
}
const getPage = getter();

// extractDeparts :: Document -> Array object
function extractDeparts($doc) {
  const extractInfo = $option => ({code: $option.value, name: $option.textContent.trim()});
  const $depart = $doc.querySelector('#depart');
  const results = Array.from($depart.children).map(extractInfo).filter(d => d.code !== '0');
  return results;
}

// fetchDeparts :: () -> Array object
const fetchDeparts = R.pipeP(R.always(Promise.resolve('fr.php')), getPage, domify, extractDeparts);

// parseDests :: string -> Array object
function parseDests(html) {
  // TODO: use domify!
  return html
  .split('\n')
  .map((line) => {
    const rOption = /\<option value="(\d+)"\s+>(.+)\<\/option\>/;
    const matched = line.match(rOption);
    if (matched) {
      let [, code, name] = matched;
      return {code, name: name.trim()};
    } else {
      return undefined;
    }
  })
  .filter(Boolean);
}

// fetchDests :: Array object -> Array object
async function fetchDests(departs) {
  departs = R.clone(departs);
  for (const depart of departs) {
    const html = await getPage(`cdepar.php?cdepar=${depart.code}`);
    depart.dests = parseDests(html);
  }
  return departs;
}

// parseVoyages :: string -> Array object
function parseVoyages(html) {
  // TODO: use domify!
  const voyages_trs = html.match(/<tr>[\s\S]+?<\/tr>/g);
  const voyages =
  voyages_trs.map((voyage_tr, _i) => {
    let transporteur, transporteurMatch = voyage_tr.match(/<span.*>(.+)\<\/span>/);
    if (transporteurMatch)
      transporteur = transporteurMatch[1].trim();
    const voyage_tds = voyage_tr.match(/<td >(.+?)<\/td>/g) || [];
    const [ligne, destination, prix, heure] = voyage_tds.map(td => td.slice(5, -5).trim());
    return { ligne, destination, transporteur, prix, heure };
  })
  .filter(v => !!v.destination);
  return voyages;
}

// fetchVoyages :: Array object -> Array object
async function fetchVoyages(departs) {
  departs = R.clone(departs);
  for (const depart of departs) {
    for (const dest of depart.dests) {
      try {
        dest.voyages =
          await R.pipeP(getPage, parseVoyages)
          (`fr.php?depart=${depart.code}&destinations=${dest.code}`);
        await sleep(Math.random() * 60*1000); // To prevent error code 508
        console.log(depart.name, '->', dest); // TODO: remove!
      } catch(e) {
        console.log(`\nERR: ${depart.code}->${dest.code}\n`);
      }
    }
  }
  return departs;
}

async function scrap() {
  const fetchData = R.pipeP(fetchDeparts, fetchDests, fetchVoyages);
  const jsonify = obj => JSON.stringify(obj, null, 2);
  // TODO make it point-free! Neither R.unary(..) nor partial/partialRight worked...
  const write = data => fs.writeFile('data-sogral.json', data, 'utf8');

  R.pipeP(
    fetchData,
    jsonify,
    write
  )();
}

scrap();
