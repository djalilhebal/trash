var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
class Mischmasch {
    constructor(arr) {
        this.wordsArray = arr;
        this.words = new Set(arr); // for performance(?)
    }
    static rand(min, max) {
        return Math.floor(Math.random() * max) + min;
    }
    isValidAnswer(word, nucleus) {
        return word.includes(nucleus) && this.words.has(word);
    }
    getAnswers(nucleus, max) {
        const result = [];
        for (const word of this.words) {
            if (word.includes(nucleus)) {
                result.push(word);
                if (max && max === result.length)
                    return result;
            }
        }
        return result;
    }
    getAnswer(nucleus) {
        const firstAnswer = this.getAnswers(nucleus, 1)[0];
        return firstAnswer || '';
    }
    hasAnswer(nucleus) {
        return !!this.getAnswer(nucleus);
    }
    generateNucleus() {
        if (Math.random() < 0.25) { // 25% chance(?)
            return this._randomNucleus();
        }
        else {
            return this._actualNucleus();
        }
    }
    _randomNucleus() {
        const len = Mischmasch.rand(2, 4);
        const nucleus = Array(len).fill(null).map(() => {
            const chars = 'abcdefghjkmnpqrstuvwxyz';
            const i = Mischmasch.rand(0, chars.length - 1);
            return chars[i];
        }).join('');
        return nucleus;
    }
    _actualNucleus() {
        const randomEl = (arr) => arr[Mischmasch.rand(0, arr.length - 1)];
        let word;
        do {
            word = randomEl(this.wordsArray);
        } while (word.length <= 3);
        const nucleusLength = Mischmasch.rand(2, word.length / 2);
        const start = Mischmasch.rand(0, word.length / 2 + 1);
        const nucleus = word.slice(start, start + nucleusLength);
        return nucleus;
    }
    static startListening() {
        return __awaiter(this, void 0, void 0, function* () {
            self.addEventListener('message', (event) => __awaiter(this, void 0, void 0, function* () {
                const job = event.data;
                let msg = { result: null, error: null };
                try {
                    if (job.name === 'load') {
                        msg.result = yield Mischmasch.load();
                    }
                    else {
                        //TODO At least assert that `typeof instance[job.name] === function`
                        msg.result = Mischmasch.instance[job.name](...job.args);
                    }
                }
                catch (e) {
                    msg.error = e.message;
                }
                //@ts-ignore
                self.postMessage(msg);
            }));
        });
    }
    static load() {
        return __awaiter(this, void 0, void 0, function* () {
            const wordlist = yield fetch('wordlist.txt').then(res => res.text());
            const words = wordlist.split('\n');
            Mischmasch.instance = new Mischmasch(words);
            return 'loaded';
        });
    }
}
class MischmaschUI {
    constructor() {
        this.worker = new Worker('mischmasch.js');
        this.nucleus = '';
        this.x = -1;
        this.y = -1;
    }
    work(name, ...args) {
        return new Promise((resolve, reject) => {
            this.worker.postMessage({ name, args });
            this.worker.onmessage = (event) => {
                const response = event.data;
                if (response.error)
                    reject(response.error);
                else
                    resolve(response.result);
            };
        });
    }
    nextNucleus(wasCorrect) {
        return __awaiter(this, void 0, void 0, function* () {
            // Score: x/y (correctAnswers/total)
            if (wasCorrect)
                this.x++;
            this.y++;
            document.querySelector('#x').innerHTML = String(this.x);
            document.querySelector('#y').innerHTML = String(this.y);
            this.nucleus = String(yield this.work('generateNucleus'));
            const $nucleus = document.querySelector('#nucleus');
            $nucleus.innerHTML = this.nucleus;
        });
    }
    output(msg) {
        const $message = document.querySelector('#message');
        $message.innerHTML = msg;
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            const [$loading, $form, $answer, $noAnswer, $giveUp] = '#loading form #answer #no-answer #give-up'.split(' ')
                .map(sel => document.querySelector(sel));
            const showLoading = (show) => $loading.hidden = !($form.hidden = show);
            const output = this.output;
            showLoading(true);
            const loaded = yield this.work('load');
            showLoading(false); //TODO handle loading errors
            yield this.nextNucleus(true); // start new game
            $form.onsubmit = (event) => __awaiter(this, void 0, void 0, function* () {
                event.preventDefault();
                const answer = $answer.value.trim();
                $answer.value = '';
                const isValidAnswer = yield this.work('isValidAnswer', answer, this.nucleus);
                if (isValidAnswer) {
                    output('Bravo!');
                    yield this.nextNucleus(true);
                }
                else {
                    output(`Eh, "${answer}" is not a vaild word. Try again!`);
                }
            });
            $giveUp.onclick = () => __awaiter(this, void 0, void 0, function* () {
                const correctAnswer = yield this.work('getAnswer', this.nucleus);
                if (correctAnswer) {
                    output(`A correct answer would be "${correctAnswer}"`);
                }
                else {
                    output('In fact, no valid answer exists! xD');
                }
                yield this.nextNucleus(false);
            });
            $noAnswer.onclick = () => __awaiter(this, void 0, void 0, function* () {
                const hasAnswer = yield this.work('hasAnswer', this.nucleus);
                if (hasAnswer) {
                    output('Actually there is an answer. Try again.');
                }
                else {
                    output('You are right. You caught me :p');
                    yield this.nextNucleus(true);
                }
            });
        });
    }
}
(function main() {
    const inMain = `${typeof document}/${typeof Document}` === 'object/function';
    if (inMain) {
        const ui = new MischmaschUI();
        ui.init();
    }
    else {
        Mischmasch.startListening();
    }
})();
