// See wilaya-input-demo.html (prototyping a part of Daffy Darja)

function main() {
  const $form = document.querySelector('form');
  const $input = document.querySelector('#input');
  const $info = document.querySelector('#info');

  $form.onsubmit = function(){ return false; }
  $input.oninput = function updateInfo() {
    const text = $input.value;
    const {wilayaName, source} = Wilaya.fromTextMaybe(text);
    $info.innerHTML = `<b>${wilayaName}</b> (${source})`;
  }
  $input.oninput(); // initial "info"

  const $english = document.querySelector('#english');
  const $darjas = document.querySelector('#darjas');
  $english.innerHTML = `
    "${ data.sentence.english }"<br>
    <i>${ data.sentence.tags.map(tag=> '#' + tag).join(' ') }</i>`;
  $darjas.innerHTML = data.sentence.darjas.map((darja) => {
    return `
      <div class="darja">
        "${darja.text}"
        <span class="reactions"><button>😂</button><button>😐</button><button>😑</button></span>
        <br><i>${ Wilaya.fromCode(darja.wilayaCode) } (added by ${darja.username})</i>
      </div>`
  }).join('');
  
  const $footer = document.querySelector('footer');
  $footer.innerHTML = rawWilayas;

}

// FAKE DATA
const data = {

  currentUser: {
    birthYear: 1999, // age = 20
    wilayaNum: '25',
    name: 'Walae'
  },

  // This should be an array of sentences (actually a "Meteor Collection")
  sentence: {
    english: 'Is it just me imagining things or is she in love with you?',
    tags: ['love', 'drama'],
    darjas: `
    @Mohamed SK ana brrk wla ay tay7a fyk lm5lo9a
    @Rin TA Rani neskhayel wla rahi tay7a fik!
    @Mariem AL Ani ntkhayel wla tefla ay tay7a fik?
    @Hiba OR Ghir ana raha bayntli wla raha t3shk fik?
    @Wissem TZ Ghir ana li ni chama belli rahy tayha fik
    @Mouh GL ghir ana rani netkhayel wela rahi tayha fik!
    `.trim().split('\n').map((line) => {
      const rDarjaLine = /(@\w+) ([A-Z]{2}) (.+)/;
      const [, username, wilayaCode, text] = line.match(rDarjaLine);
      return { username, wilayaCode, text };
    })
  }

}

class Wilaya {
  static fromCode(str) {
    for (const wilaya of Wilaya.wilayas) {
      if (wilaya.code === str || wilaya.num === str) {
        return wilaya.name;
      }
    }
    return 'BAD INPUT >:('
  }

  /**
   * @param {string} str - Inputted text
   * @returns {object} Wilaya's name and the source of this info
   */
  static fromTextMaybe(str) {
    const rCode = /^([0-9]{2}|[A-Z]{2}):/;
    const [, code] = str.match(rCode) || [];
    const wilayaName = Wilaya.fromCode( code ? code : data.currentUser.wilayaNum);
    const source = code ? `Code: ${code}` : 'Your wilaya';
    return { wilayaName, source }
  }
  
}

// Adapted from http://www.statoids.com/udz.html
const rawWilayas =
`05 BT Batna
09 BL Blida
12 TB Tébessa
15 TZ Tizi Ouzou
16 AL Alger
18 JJ Jijel
19 SF Sétif
21 SK Skikda
23 AN Annaba
24 GL Guelma
25 CO Constantine
31 OR Oran
36 TA El Tarf
41 SA Souk Ahras
01 AR Adrar
44 AD Aïn Defla
46 AT Aïn Témouchent
08 BC Béchar
06 BJ Béjaïa
07 BS Biskra
34 BB Bordj Bou Arréridj
10 BU Bouira
35 BM Boumerdès
02 CH Chlef
17 DJ Djelfa
32 EB El Bayadh
39 EO El Oued
47 GR Ghardaïa
33 IL Illizi
40 KH Khenchela
03 LG Laghouat
29 MC Mascara
26 MD Médéa
43 ML Mila
27 MG Mostaganem
28 MS Msila
45 NA Naama
30 OG Ouargla
04 OB Oum el Bouaghi
48 RE Relizane
20 SD Saïda
22 SB Sidi Bel Abbès
11 TM Tamanrasset
14 TR Tiaret
37 TN Tindouf
42 TP Tipaza
38 TS Tissemsilt
13 TL Tlemcen`

Wilaya.wilayas = rawWilayas.split('\n').map((line) => {
  const rWilayaLine = /^([0-9]{2}) ([A-Z]{2}) (.+)/;
  const [, num, code, name] = line.match(rWilayaLine);
  return { num, code, name };
});

main();
