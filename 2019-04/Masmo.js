/**
 * So in my AO** class, we had to use MS Notepad and DOSBox to "program" using MASM.
 * It was totally annoying, not even Notepad++ could make the experience bearable, so I ended
 * up writing my own IDE-ish thingy ('RetardedAO') it was enough for me, but for others? Meh.
 * These were the features I felt missing or incomplete:
 *   - A Web IDE for 16-bit MS-DOS MASM 5.1 programming
 *   - *Live* code-checking
 *   - Code execution in the same window
 *   - Nicer UX: Auto-indent, smoother transitions, and better syntax highlighting...
 *
 * The idea was simple: Programmatically run programs (MASM and LINK) in a hidden virtual machine,
 * parse their output, and display stuff on the editor.
 * Masmo = Ace Editor (or VSCode or Atom or whatever) + V86 + FreeDOS + MASM&LINK
 * I started this as yet another "idea expressed in code" but as I kept editing, it became more
 * like "an incomplete, totally untested code that should work with some edits and fixes".
 * 
 * NOTE: Maybe it goes against MASM's License: It runs on a non-MS OS (FreeDOS or maybe the OS that
 *       the browser runs on). Would using MS-DOS instead of FreeDOS solve the problem? Or what?
 * So here's the DISCLAIMER: It's written for educational purposes and obviously not for profit :p
 * 
 * **AO: Architecture des ordinateurs (lit. Computer architecture)
 * [RetardedAO]: https://github.com/djalilhebal/shit/tree/master/2018-11
 * [Ace]: https://github.com/ajaxorg/ace
 * [V86]: https://github.com/copy/v86
 * [FreeDOS]: https://www.freedos.org
 */

class Masmo {
  constructor() {
    this._changed = false; // Was the code changed but not checked (assembled and maybe linked)?
    this._locked = false; // Is the updateAnnotations function 'locked' (already busy updating)?
    this._ready = false; // Was the VM (and its binaries) loaded?
    this._busy = false; // Something is already running in FreeDOS?
    this.load();
  }

  /** Promise<void> */ async load() {
    this.loadEditor();
    await this.loadVM();
    await this.loadBinaries();
    this._ready = true;
  }

  /** void */ loadEditor() {
    // Suppose Ace's scripts and styles were loaded using <script>s and <link>s
    const editor = ace.edit('editor');
    editor.setTheme('ace/theme/vibrant_ink'); // or "ace/theme/chaos"
    editor.session.setMode('djalilhebal/mode/masm');
    editor.session.doc.on('change', this.updateAnnotations);
    editor.setValue(Masmo.EXAMPLE);
    this.editor = editor;
  }

  /** Promise<void> */ loadVM() {
    return new Promise((resolve, reject) => {
      this._vm = new V86Starter({
        // IDEA Start with a pre-initialized P9FS that already contains the OS and bins
        fda: 'freedos.img',
        filesystem: { basefs: './fs.json', baseurl: './base/' },
        initial_state: { url: './v86state-masm.bin' },
        // Disable these. We will only use the keyboard programmatically
        disable_keyboard: true,
        disable_mouse: true,
        disable_speaker: true,
        autostart: false,
      });
      this._vm.add_listener('emulator-started', () => resolve());
      this._vm.run();
    })
  }

  /** Promise<void> */ async loadBinaries() {
    const responses = await Promise.all([fetch('MASM.EXE'), fetch('LINK.EXE')]);
    await this.putFile('MASM.EXE', responses[0].arrayBuffer());
    await this.putFile('LINK.EXE', responses[1].arrayBuffer());
  }

  /** Promise<void> */ async updateAnnotations(/** object */ _changeEvent) {
    // TODO Improve "resource locking" while not ignoring change events.
    if (this._locked || !this._ready) {
      this._changed = true;
      return;
    }
    this._locked = true;
    this._changed = false;

    const text = this.editor.session.doc.getValue();
    await this.putFile('PROGRAM.ASM', text);
    const masmMessages = await this.assemble('PROGRAM.ASM');
    this.editor.session.setAnnotations(masmMessages);

    // If the code hasn't changed since we assembled, try LINKing
    if (!this._changed) {
      const linkMessages = await this.link('PROGRAM.OBJ');
      this.editor.session.setAnnotations([...masmMessages, ...linkMessages]);
    }

    // Unlock; If the code was changed since we 'locked', manually update annotations!
    this._locked = false;
    this._changed && this.updateAnnotations({});
  }
  
  /** Promise<Array<object>> */ async assemble(/** string */ filename) {
    // TODO Disable MASM optimizations to make it faster?
    const output = await this._exec(`MASM ${filename};`);
    return this.parseMasmOutput(output);
  }

  /** Promise<Array<object>> */ async link(/** string */ filename) {
    const output = await this._exec(`LINK ${filename};`);
    return this.parseLinkOutput(output);
  }

  execute(filename) { /** Just use a second V86 instance with a normal HTML screen container? */ }

  /** Promise<string> */ async _exec(/** string */ cmd) {
    if (this._busy) {
       throw new Error('The previous execution is not done yet');
    }
    this._busy = true;

    const that = this;
    return new Promise( (resolve, reject) => {
      // XXX Maybe use my own string "<<DREAMLESS-END>>" instead of the 'prompt' string?
      // XXX If FreeDOS can output non-printable characters, this would be a better approach:
      //   const ETX = '\x03';
      //   send(`${cmd} & ECHO ^03`); then keep reading until chr == ETX, resolve(output);
      // XXX Same as above but if ECHO doesn't work,
      //   write a DOS program named EETX.EXE (see Masmo.EXAMPLE), then send(`${cmd} & EETX.EXE`)
      let output = '';
      const END_OF_OUTPUT = 'A:\\>';
      const read = function read(/** string */ chr) {
        if (output.endsWith(END_OF_OUTPUT)) {
          that._vm.remove_listener('serial0-output-char', read);
          that._busy = false;
          output = output.slice(0, -END_OF_OUTPUT.length);
          resolve(output);
        } else {
          output += chr;
        }
      }
      that._vm.add_listener('serial0-output-char', read);
      that._vm.serial0_send(cmd);
    });
  }

  /** Array<object> */ parseMasmOutput(/** string */ log) {
    // yo.asm(18): error A2009: Symbol not defined: KH
    // X.ASM(28): warning A4031: Operand types must match
    // (filename.asm)((lineNum)): (type:error|warning) (code): (text)
    const rLine = /^(\w+\.asm)\((\d+)\): (error|warning) (.+?): (.+)$/i;
    return log.split('\r\n').filter(line => rLine.test(line)).map((line) => {
      const [, filename, lineNum, type, code, text] = line.match(rLine);
      return { type, text, row: Number(lineNum) };
    });
  }

  /** Array<object> */ parseLinkOutput(/** string */ log) {
    // TODO What does LINK even complain about?
    return [];
  }

  /** Promise<string> */ async getTextFile(/** string */ file) {
    const asUint8Array = await this.getFile(file);
    return String.fromCharCode(...asUint8Array);
  }

  /** Promise<Uint8Array> */ async getFile(/** string */ file) {
    return new Promise( (resolve, reject) => {
      this._vm.read_file(file, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(String.fromCharCode(...data));
        }
      });
    });
  }

  /** Promise<void> */ async putFile(/** string */ file, /** (string|ArrayBuffer) */ content) {
    return new Promise( (resolve, reject) => {
      let data;
      if (typeof content === 'string') {
        data = Uint8Array.from(content.split('').map(c => c.charCodeAt(0)));
      } else {
        data = new Uint8Array(content);
      }

      this._vm.create_file(file, data, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
 
}

// Using the skeleton "proposed" by my prof
Masmo.EXAMPLE =
`;; EETX.ASM -- Emit ETX ('End of Text' ASCII character)
pile segment para stack 'pile'
  db 256 dup(0)
pile ends

data segment
  ; no variables
data ends

code segment
  main proc far
    assume cs:code
    assume ds:data
    assume ss:pile
    mov ax, data
    mov ds, ax
    
    mov ah, 02h ; Output character
    mov dl, 03  ; ETX
    int 21h
    
    mov ah, 4Ch
    int 21h
  main endp
code ends

end main
`;
