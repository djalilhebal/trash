// See wilaya-input-draft.html

class Wilaya {
  static initWilayas() {
    Wilaya.wilayas = Wilaya.rawWilayas.split('\n').map((line) => {
      const rWilayaLine = /^([0-9]{2}) ([A-Z]{2}) (.+)/;
      const [, num, code, name] = line.match(rWilayaLine);
      return { num, code, name };
    })
  }

  /**
   * @param {string} str - Wilaya's number or code (abbr)
   * @returns {string} Wilaya's name
   */
  static fromCode(str) {
    for (const wilaya of Wilaya.wilayas) {
      if (wilaya.code === str || wilaya.num === str) {
        return wilaya.name;
      }
    }
    return 'BAD INPUT >:(';
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
    return { wilayaName, source };
  }
  
}

// Adapted from http://www.statoids.com/udz.html
Wilaya.rawWilayas =
`01 AR Adrar
02 CH Chlef
03 LG Laghouat
04 OB Oum El Bouaghi
05 BT Batna
06 BJ Béjaïa
07 BS Biskra
08 BC Béchar
09 BL Blida
10 BU Bouira
11 TM Tamanrasset
12 TB Tébessa
13 TL Tlemcen
14 TR Tiaret
15 TZ Tizi Ouzou
16 AL Alger
17 DJ Djelfa
18 JJ Jijel
19 SF Sétif
20 SD Saïda
21 SK Skikda
22 SB Sidi Bel Abbès
23 AN Annaba
24 GL Guelma
25 CO Constantine
26 MD Médéa
27 MG Mostaganem
28 MS Msila
29 MC Mascara
30 OG Ouargla
31 OR Oran
32 BA El Bayadh
33 IL Illizi
34 BB Bordj Bou Arréridj
35 BM Boumerdès
36 TA El Tarf
37 TN Tindouf
38 TS Tissemsilt
39 OU El Oued
40 KH Khenchela
41 SA Souk Ahras
42 TP Tipaza
43 ML Mila
44 AD Aïn Defla
45 NA Naama
46 AT Aïn Témouchent
47 GR Ghardaïa
48 RE Relizane`

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

function main() {
  Wilaya.initWilayas();

  const $form = document.querySelector('form');
  $form.onsubmit = function addTranslation(){
    // ...
    return false;
  }

  const $input = document.querySelector('#input');
  const $info = document.querySelector('#info');
  $input.oninput = function updateInfo() {
    const text = $input.value;
    const {wilayaName, source} = Wilaya.fromTextMaybe(text);
    $info.innerHTML = `<b>${wilayaName}</b> (${source})`;
  }
  $input.oninput(); // initial "info"

  const $english = document.querySelector('#english');
  $english.innerHTML = `
    "${ data.sentence.english }"<br>
    <i>${ data.sentence.tags.map(tag => '#' + tag).join(' ') }</i>`;

  const $darjas = document.querySelector('#darjas');
  $darjas.innerHTML = data.sentence.darjas.map((darja) => {
    return `
      <div class="darja">
        <span class="text">${darja.text}</span>
        <span class="reactions"><button>😂</button><button>😐</button><button>😑</button></span>
        <br>
        <span class="info">
          <span class="wilaya">${Wilaya.fromCode(darja.wilayaCode)}</span>
          (added by ${darja.username})
        </span>
      </div>`
  }).join('');
  
  const $code = document.querySelector('#code pre');
  $code.innerHTML = Wilaya.rawWilayas;
}

main();
