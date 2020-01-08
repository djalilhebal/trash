class Mischmasch {

  private wordsArray: Array<string>; // used in _actualNucleus()
  private words: Set<string>;
  private static instance: Mischmasch;

  constructor(arr: Array<string>) {
    this.wordsArray = arr;
    this.words = new Set(arr); // for performance(?)
  }
  
  static rand(min: number, max: number): number {
    return Math.floor(Math.random()*max) + min;
  } 
  
  isValidAnswer(word: string, nucleus: string): boolean {
    return word.includes(nucleus) && this.words.has(word);
  }
  
  getAnswers(nucleus: string, max?: number): Array<string> {
    const result = [];
    for (const word of this.words) {
      if (word.includes(nucleus)) {
        result.push(word);
        if (max && max === result.length) return result;
      }
    }
    return result;
  }

  getAnswer(nucleus: string): string {
    const firstAnswer = this.getAnswers(nucleus, 1)[0];
    return firstAnswer || '';
  }
  
  hasAnswer(nucleus: string): boolean {
    return !!this.getAnswer(nucleus);
  }

  generateNucleus(): string {
    if (Math.random() < 0.25) { // 25% chance(?)
      return this._randomNucleus();
    } else {
      return this._actualNucleus();
    }
  }

  _randomNucleus(): string {
    const len = Mischmasch.rand(2, 4);
    const nucleus = Array(len).fill(null).map( () => {
      const chars = 'abcdefghjkmnpqrstuvwxyz'
      const i = Mischmasch.rand(0, chars.length - 1);
      return chars[i];
    }).join('');
    return nucleus;
  }
  
  _actualNucleus(): string {
    const randomEl = (arr: any[]) => arr[Mischmasch.rand(0, arr.length - 1)];
    let word: string;
    do {
      word = randomEl(this.wordsArray);
    } while(word.length <= 3);

    const nucleusLength = Mischmasch.rand(2, word.length/2);
    const start = Mischmasch.rand(0, word.length/2 + 1);
    const nucleus = word.slice(start, start + nucleusLength);
    return nucleus;
  }

  static async startListening(): Promise<void> {
    self.addEventListener('message', async (event: MessageEvent) => {
      const job: Job = event.data;
      let msg = { result: null, error: null };
      try {
        if (job.name === 'load') {
          msg.result = await Mischmasch.load();
        } else {
          //TODO At least assert that `typeof instance[job.name] === function`
          msg.result = Mischmasch.instance[job.name](...job.args);
        }
      } catch (e) {
        msg.error = e.message;
      }
      //@ts-ignore
      self.postMessage(msg);
    });
  }

  static async load(): Promise<string> {
    const wordlist = await fetch('wordlist.txt').then(res => res.text());
    const words = wordlist.split('\n');
    Mischmasch.instance = new Mischmasch(words);
    return 'loaded';
  }
  
}

interface Job {
  name: string;
  args: Array<string>;
  result?: string | boolean;
  error?: string;
}

class MischmaschUI {
  worker: Worker = new Worker('mischmasch.js');
  nucleus: string = '';
  x: number = -1;
  y: number = -1;

  work(name: string, ...args: Array<string>): Promise<string|boolean> {
    return new Promise( (resolve, reject) => {
      this.worker.postMessage({name, args});
      this.worker.onmessage = (event) => {
        const response: Job = event.data;
        if (response.error) reject(response.error);
        else resolve(response.result);
      }
    });
  }

  async nextNucleus(wasCorrect: boolean): Promise<void> {
    // Score: x/y (correctAnswers/total)
    if (wasCorrect) this.x++;
    this.y++;
    document.querySelector('#x').innerHTML = String(this.x);
    document.querySelector('#y').innerHTML = String(this.y);

    this.nucleus = String(await this.work('generateNucleus'));
    const $nucleus = document.querySelector('#nucleus');
    $nucleus.innerHTML = this.nucleus;
  }

  output(msg: string) {
    const $message = document.querySelector('#message');
    $message.innerHTML = msg;
  }

  async init() {
    const [$loading, $form, $answer, $noAnswer, $giveUp] =
      '#loading form #answer #no-answer #give-up'.split(' ')
      .map(sel => document.querySelector(sel));

    const showLoading = (show: boolean) => $loading.hidden = !($form.hidden = show);
    const output = this.output;

    showLoading(true);
    const loaded = await this.work('load');
    showLoading(false); //TODO handle loading errors
    await this.nextNucleus(true); // start new game

    $form.onsubmit = async (event) => {
      event.preventDefault();

      const answer = $answer.value.trim();
      $answer.value = '';
      const isValidAnswer = await this.work('isValidAnswer', answer, this.nucleus);
      if (isValidAnswer) {
        output('Bravo!');
        await this.nextNucleus(true);
      } else {
        output(`Eh, "${answer}" is not a vaild word. Try again!`);
      }
    }
    
    $giveUp.onclick = async () => {
      const correctAnswer = await this.work('getAnswer', this.nucleus);
      if (correctAnswer) {
        output(`A correct answer would be "${correctAnswer}"`);
      } else {
        output('In fact, no valid answer exists! xD');
      }
      await this.nextNucleus(false);
    }
      
    $noAnswer.onclick = async () => {
      const hasAnswer = await this.work('hasAnswer', this.nucleus);
      if (hasAnswer) {
        output('Actually there is an answer. Try again.');
      } else {
        output('You are right. You caught me :p');
        await this.nextNucleus(true);
      }
    }
    
  }
  
}

(function main() {
  const inMain = `${typeof document}/${typeof Document}` === 'object/function';
  if (inMain) {
    const ui = new MischmaschUI();
    ui.init();
  } else {
    Mischmasch.startListening();
  }
})();
