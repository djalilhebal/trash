// TODOs:
// function getDay(sessionIndex) {} // getDay(0) === 'Sun.'
// function getTime(sessionIndex) {} // getDay(0) === '8:30-10:00'
// function groupByDays(sessions) {} // returns Array<Array<object>>

const EDTpp = {
  $input: document.querySelector('#input'),
  $table: document.querySelector('#table'),
  sessions: [],
  
  async /** Promise<void> */ setup() {
    const html = await fetch('edt.htm').then(res => res.text());
    const [, tableHtml] = html.match(/(<table[\s\S]+<\/table>)/);
    const $container = document.createElement('div');
    $container.innerHTML = tableHtml;
    const $originalTable = $container.querySelector('table');
    this.sessions = this.parseSessions($originalTable);
    this.draw();
  },

  /** void */ update() {
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
  },
  
  /** void */ draw() {
    const divs = this.sessions.map((session, i) => {
      const {who, what, where} = session;
      const [_who, _where] = [who, where].map(x => x.replace(/\d/g, ''));
      const div = `
      <div class="cell wanted ${who?'':'empty'} ${who} ${what} ${where} ${_who} ${_where}">
        <div class="what">${what}</div>
        <div class="who">${who}</div>
        <div class="where">@${where}</div>
      </div>`;
      return (i+1)%5 === 0? div+'<br/>' : div;
    });

    this.$table.innerHTML = divs.join('');
  },
  
  /** Array<object> */ parseSessions(/** HTMLElement */ $originalTable) {
    const getCode = $x => $x.innerText.replace(/(\D)0/, '$1').trim(); // 'G06\n\n' > 'G6'
    
    const CASES = 15; // Each row contains 15 'data' cases
    const $trs = $originalTable.querySelectorAll('tr');
    const sessions = Array(...$trs).
      filter($tr => $tr.children.length >= CASES).
      flatMap(($tr) => {
        const $tdsAll = $tr.querySelectorAll('td');
        const $tds = Array(...$tdsAll).slice(-CASES); // Remove useless cases
        const sessions = [];
        for (let i = 0; i < CASES; i += 3) {
          const [where, who, what] = [$tds[i], $tds[i+1], $tds[i+2]].map(getCode);
          sessions.push({
            what,
            where: where.replace('T', 'L'),
            who: who.replace('S', 'SEC'),
          });
        }
        return sessions;
      });
      
    return sessions;
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
      replace(/\b(\w+)\b/g, part => synonyms[part]? synonyms[part]: part).
      split(' ').map(x => x.startsWith('.')? x: '.'+x).join(', ');
  },

}
