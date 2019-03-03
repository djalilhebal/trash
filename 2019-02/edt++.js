const EDTpp = {
  $input: document.querySelector('#input'),
  $table: document.querySelector('#table'),
  
  async /** Promise<object> */ setup() {
    // 'try catch'ing errs (Network and matching errors can occur)
    try {
      const html = await fetch('edt.htm').then(res => res.text());
      const [, originalTableHtml] = html.match(/(<table[\s\S]+<\/table>)/);
      const {sessions, rawJours} = this.parseTable(originalTableHtml);
      this.sessions = sessions;
      this.jours = this.normalizeJours(rawJours);
      const generatedTable = this.generateTable();
      this.$table.innerHTML = generatedTable; // draw
      
      // As Evan Burchard said in his book "Refactoring JavaScript",
      // always return stuff so you can test/debug them properly.
      return {sessions, rawJours, generatedTable};
    } catch(e) {
      console.error(e);
      this.$table.innerText = 'An error occurred while loading the EDT >.<';
      return {}; // To preserve the method's return type(?)
    }
  },

  /** object */ update() {
    const setWanted = /** HTMLElement */ $x => $x.classList.add('wanted');
    const unsetWanted = /** HTMLElement */ $x => $x.classList.remove('wanted');

    const input = this.$input.value;
    const query = this.normalizeQuery(input);
    const $allCells = this.$table.querySelectorAll('.cell');
    let $wantedCells;
    try {
      $wantedCells = this.$table.querySelectorAll(query); // This may throw.
      if (!$wantedCells.length) throw new Error('Probably invalid query');
    } catch (e) {
      $wantedCells = $allCells;
    }
    
    $allCells.forEach($c => unsetWanted($c) || unsetWanted($c.parentElement));
    $wantedCells.forEach($c => setWanted($c) || setWanted($c.parentElement));
    
    // Again, just for testing
    return {input, query, $wantedCells}
  },
  
  /** object */ parseTable(/** string */ originalTableHtml) {
    // Convert the originalTableHtml string to an actual HTMLElement
    const $container = document.createElement('div');
    $container.innerHTML = originalTableHtml;
    const $originalTable = $container.querySelector('table');

    // 'G06\n\n' > 'G6'
    const getCode = $x => $x.innerText.replace(/(\D)0/, '$1').trim();

    const CASES = 15; // Each row has 15 'sessions' cases + maybe a 'Jour' case
    const $trs = $originalTable.querySelectorAll('tr');
    const rawJours = [];
    const sessions = Array.
      from($trs).
      filter($tr => $tr.children.length >= CASES).
      flatMap(($tr, rowIndex) => {
        const $tdsAll = $tr.querySelectorAll('td');
        // If 'Jours' col has a case, omit it by taking only the latest `CASES`
        const $tds = Array.from($tdsAll).slice(-CASES);

        // Have we really omitted the 'Jours' case? Save its index and content.
        if ($tds.length !== $tdsAll.length) {
          const text = $tdsAll[0].innerText.trim();
          rawJours.push({text, rowIndex});
        }

        const rowSessions = [];
        for (let i = 0; i < CASES; i += 3) {
          const [where, who, what] = [$tds[i], $tds[i+1], $tds[i+2]].map(getCode);
          rowSessions.push({
            what,
            where: where.replace('T', 'L'),
            who: who.replace('S', 'SEC'),
          });
        }
        return rowSessions;
      });
      
    return {sessions, rawJours};
  },

  /** string */ generateTable() {
    const omitNumber = (str) => str.replace(/\d/g, ''); // 'S3' > 'S'
    const isRowStart = (i) => i % 5 === 0;
    const isRowOver  = (i) => (i+1) % 5 === 0;
    const isDayStart = (i) => {
      const currentRow = i / 5;
      const jour = this.getJour(i);
      return jour.firstRow === currentRow;
    }
    
    const generateCell = (/** object */ session, /** number */ i) => {
      const {who, what, where} = session;
      return `
      <div
        title="${this.getTime(i)}"
        class="cell wanted ${who?'':'empty'}
          ${who} ${what} ${where} ${omitNumber(who)} ${omitNumber(where)}"
        >
        <div class="what">${what}</div>
        <span class="who">${who}</span> <span class="where">@${where}</span>
      </div>`
    }
    
    const cells = this.sessions.map((session, i) => {
      let cell = generateCell(session, i);
      if (isRowStart(i)) cell = '<div class="row wanted">' + cell;
      if (isRowOver(i)) cell += '</div>';
      if (isDayStart(i)) cell = `<h2>${this.getJour(i).text}~</h2>` + cell;
      return cell;
    });

    return cells.join('');
  },
  
  /** string */ normalizeQuery(/** string */ str) {
    const synonyms = {
      'SECTION': 'SEC',
      'GROUPE': 'G',
      
      'AMPHI': 'A',
      'SALLE': 'S',
      'LAB': 'L',

      'COURS': 'A',
      'TD': 'S',
      'TP': 'L',
    };
    
    return str.toUpperCase().
      replace(/[^.A-Z\d\s]/g, ' '). // 'G06, G3' > 'G06  G3'
      replace(/\.+/g, '.').replace(/\.\W/g, ''). // '..A5.' > '.A5.' > '.A5'
      replace(/\s+/g, ' ').trim(). // remove extra whitespace
      replace(/(\D)0/g, '$1'). // so that 'G06' == 'G6'
      replace(/([A-Z]+)/g, part => synonyms[part] ? synonyms[part] : part).
      split(' ').map(x => x.startsWith('.') ? x : '.' + x).
      join(', ');
  },
  
  /** Array<object> */ normalizeJours(/** Array<object> */ rawJours) {
    const texts = rawJours.filter(x => !!x.text).map(x => x.text);
    const firstRows = rawJours.filter(x => !x.text).map(x => x.rowIndex);
    const lastRows = firstRows.map((_firstRow, i) => firstRows[i+1]);
    // For simplicity, let's say we can't know the last row of the last day
    lastRows[lastRows.length - 1] = Infinity;

    const jours = texts.map((text, i) => {
      return {
        text,
        firstRow: firstRows[i],
        lastRow: lastRows[i],
      }
    });
    return jours;
  },
  
  /** number */ getTime(/** number */ sessionIndex) {
    const times = '8:30-10 10-11:30 11:30-13 13-14:30 14:30-16'.split(' ');
    return times[sessionIndex % 5];
  },

  /** object */ getJour(/** number */ sessionIndex) {
    const isBetween = (x, min, max) => min <= x && x < max; // x in [min; max[
    
    const rowIndex = Math.floor(sessionIndex / 5);
    for (const jour of this.jours) {
      if (isBetween(rowIndex, jour.firstRow, jour.lastRow))
        return jour;
    }
    return {};
  },

}
