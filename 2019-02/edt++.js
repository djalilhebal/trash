//TODO
// function getJour(sessionIndex) {} // getJour(0) === 'Dim.'

// getNewJour(0) === 'Dim.'
// getNewJour(1) === ''
// function getNewJour(sessionIndex) {} 

const EDTpp = {
  $input: document.querySelector('#input'),
  $table: document.querySelector('#table'),
  
  async /** Promise<object> */ setup() {
    /// @todo 'try catch'ing errs (Network and matching errors can occur)
    const html = await fetch('edt.htm').then(res => res.text());
    const [, originalTableHtml] = html.match(/(<table[\s\S]+<\/table>)/);
    const {sessions, jours} = this.parseTable(originalTableHtml);
    this.sessions = sessions;
    this.jours = jours;
    const generatedTable = this.generateTable();
    this.$table.innerHTML = generatedTable; // draw

    // As Evan Burchard said in his book "Refactoring JavaScript",
    // always return stuff so you can test/debug them properly.
    return {sessions, jours, generatedTable};
  },

  /** object */ update() {
    const unsetWanted = /** HTMLElement */ $x => $x.classList.remove('wanted');
    const setWanted = /** HTMLElement */ $x => $x.classList.add('wanted');

    const input = this.$input.value;
    const query = this.normalizeQuery(input);
    const $allCells = this.$table.querySelectorAll('.cell');
    let $wantedCells;
    try {
      $wantedCells = this.$table.querySelectorAll(query); // This may throw.
      if (!$wantedCells.length) throw new Error('Probably invalid query');
    } catch(e) {
      $wantedCells = $allCells;
    }
    $allCells.forEach(unsetWanted);
    $wantedCells.forEach(setWanted);
    
    return {input, query, $wantedCells}
  },
  
  /** string */ generateTable() {
    const generateCell = (session, i) => {
      const omitNumber = str => str.replace(/\d/g, ''); // 'S3' > 'S'
      const getTime = i => '8:30-10 10-11:30 11:30-13 13-14:30 14:30-16'.split(' ')[i%5];
      const {who, what, where} = session;
      return `
      <div
        title="${getTime(i)}"
        class="cell wanted ${who?'':'empty'}
          ${who} ${what} ${where} ${omitNumber(who)} ${omitNumber(where)}"
        >
        <div class="what">${what}</div>
        <div class="who">${who}</div>
        <div class="where">@${where}</div>
      </div>`
    }
    
    const isRowOver = i => (i+1)%5 === 0;
    const isDayOver = (i) => {
      const rowsPerDay = [11, 10, 10, 10, 9]; //TODO shouldn't be hard-coded
      const finalRows = [11, 21, 31, 41, 50]; //TODO should use 'rowsPerDay'
      const currentRow = (i+1) / 5;
      return finalRows.some(row => row === currentRow);
    }
    
    const divs = this.sessions.map((session, i) => {
      let div = generateCell(session, i);
      if (isRowOver(i)) div += '<br />';
      if (isDayOver(i)) div += '<hr />';
      return div;
    });

    return divs.join('');
  },
  
  /** object */ parseTable(/** string */ originalTableHtml) {
    const getCode = $x => $x.innerText.replace(/(\D)0/, '$1').trim(); // 'G06\n\n' > 'G6'
    const CASES = 15; // Each row contains 15 'data' cases
    
    // Convert the originalTableHtml string to an actual HTMLElement
    const $container = document.createElement('div');
    $container.innerHTML = originalTableHtml;
    const $originalTable = $container.querySelector('table');

    const $trs = $originalTable.querySelectorAll('tr');
    const jours = [];
    const sessions = Array(...$trs).
      filter($tr => $tr.children.length >= CASES).
      flatMap(($tr, rowIndex) => {
        const $tdsAll = $tr.querySelectorAll('td');
        Array(...$tdsAll).slice(0, -CASES).forEach($x => $x.title='extra')
        const $tds = Array(...$tdsAll).slice(-CASES); // Remove 'Jours' col cells
        
        if ($tds.length !== $tdsAll.length) {
          const text = $tdsAll[0].innerText.trim();
          const firstRowIndex = rowIndex - 2;
          if (text) jours.push({text, firstRowIndex});
        }

        const result = [];
        for (let i = 0; i < CASES; i += 3) {
          const [where, who, what] = [$tds[i], $tds[i+1], $tds[i+2]].map(getCode);
          result.push({
            what,
            where: where.replace('T', 'L'),
            who: who.replace('S', 'SEC'),
          });
        }
        return result;
      });
      
    return {jours, sessions};
  },

  /** string */ normalizeQuery(/** string */ str) {
    const synonyms = {
      'MODULE': 'M',
      'GROUPE': 'G',
      'SECTION': 'SEC',
      'SALLE': 'S',
      'LAB': 'L',
      'AMPHI': 'A',
    };
    
    return str.toUpperCase().
      replace(/[^.A-Z\d\s]/g, ''). // 'G06, G3' > 'G06 G3'
      replace(/\.+/g, '.').replace(/\.\W/g, ''). // '..A5.' > '.A5.' > '.A5'
      replace(/\s+/g, ' ').trim(). // remove extra whitespace
      replace(/(\D)0/g, '$1'). // so that 'G06' == 'G6'
      replace(/([A-Z]+)/g, part => synonyms[part]? synonyms[part]: part).
      split(' ').map(x => x.startsWith('.')? x: '.'+x).join(', ');
  },
  
}
