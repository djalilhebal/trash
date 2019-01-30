// Almost finished...
// TODO TypeScript set context = Worker

class Mischmasch {

  _wordsArray: Array<string>;
  _words: Set<string>;

  constructor(arr: Array<string>) {
    this._wordsArray = arr;
    this._words = new Set(arr); // for performance(?)
  }
  
  static rand(min: number, max: number): number {
    return Math.floor(Math.random()*max) + min;
  } 
  
  isValidAnswer(word: string, nucleus: string): boolean {
    return word.includes(nucleus) && this._words.has(word);
  }
  
  getAnswers(nucleus: string, max?: number): Array<string> {
    const result = [];
    for (const word of this._words) {
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
    const len = Mischmasch.rand(2, 5);
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
      word = randomEl(this._wordsArray);
    } while(word.length <= 3);

    const nucleusLength = Mischmasch.rand(2, word.length/2);
    const start = Mischmasch.rand(0, word.length/2 + 1);
    const nucleus = word.slice(start, start + nucleusLength);
    return nucleus;
  }

  static async initWorker(): Promise<boolean> {
    let errorOccured = false;
    try {
      const wordlist = await fetch('wordlist.txt').then(res => res.text());
      const mm = new Mischmasch(wordlist.split('\n'));
      self.onmessage( (job: Job) => {
        const res = mm[job.name](...job.args);
      self.postMessage({
          result: res,
          error: null,
        });
      });
    } catch (e) {
      errorOccured = true;
    }
    return errorOccured;
  }
  
}

interface Job {
  name: string;
  args: Array<string>;
  result?: string | boolean;
  error?: string;
}

class MischmaschUI {
  worker: Worker;
  nucleus: string;
  x: number = 0;
  y: number = 0;

  work(name: Job["name"], args: Job["args"] = []): Promise<string|boolean> {
    return new Promise( (resolve, reject) => {
      this.worker.postMessage({name, args});
      this.worker.onmessage( (event) => {
        const response: Job = event.data;
        if (response.error) reject(response.error);
        else resolve(response.result);
      });
    });
  }

  incScore(wasCorrect: boolean): void {
    // Score: x/y (correctAnswers/total)
    if (wasCorrect) this.x++;
    this.y++;
    document.querySelector('#x').innerHTML = String(this.x);
    document.querySelector('#y').innerHTML = String(this.y);
  }

  async init() {
    const [$loading, $form, $x, $y, $nucleus, $answer, $noAnswer, $giveUp, $message] =
      '#loading form #x #y #nucleus #answer #no-answer #give-up #message'.split(' ')
      .map(sel => document.querySelector(sel));

    const output = (msg: string) => $message.innerHTML = msg;
    const showLoading = (yes: boolean) => $form.hidden = !($loading.hidden = yes);
    const newNucleus = async () => {
        this.nucleus = await this.work('generateNucleus');
        $nucleus.innerHTML = this.nucleus;
    }

    showLoading(true);
    const loaded = await this.work('load');
    showLoading(false);


    $form.onsubmit = async (event) => {
      event.preventDefault();
      
      const answer = $answer.value;
      const isValidAnswer = await this.work('isValidAnswer', [answer, this.nucleus]);
      if (isValidAnswer) {
        output('Bravo!');
        this.incScore(true);
        newNucleus();
      } else {
        output('Eh, "${answer}" is not a vaild word. Try again!');
      }
    }
    
    $giveUp.onclick = async () => {
      const correctAnswer = await this.work('getAnswer', [this.nucleus]);
      if (correctAnswer) {
        output(`A correct answer would be ${correctAnswer}`);
      } else {
        output('In fact, no valid answer exists! xD');
      }
      this.incScore(false);
      newNucleus();
    }
      
    $noAnswer.onclick = async () => {
      const hasAnswer = await this.work('hasAnswer', [this.nucleus]);
      if (hasAnswer)
        output('Actually there is an answer. Try again.');
      else
        output('You are right. You caught me :p');
    }
    
  }
  
}

(function main() {
  const inMain = `${typeof document}/${typeof Document}` === 'object/function';
  if (inMain) {
    const ui = new MischmaschUI();
    ui.init();
  } else {
    Mischmasch.initWorker();
  }
})();
