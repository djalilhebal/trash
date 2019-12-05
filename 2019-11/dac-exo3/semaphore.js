//@ts-check
// I have tried to mimic the interface of Java's Semaphore class...
class Semaphore {
  /**
   * @param {number} permits - initial available access permits
   * @param {SharedArrayBuffer} [sharedArray] - Shared memory to work on.
   */
  constructor(permits, sharedArray) {
    this._sab = sharedArray || new SharedArrayBuffer(4);
    this._val = new Int32Array(this._sab);
    if (!sharedArray) this._val[0] = permits;
  }

  getShared() {
    return this._sab;
  }

  getAvailablePermits() {
    return Atomics.load(this._val, 0);
  }

  acquire() {
    while (true) {
      const permits = Atomics.load(this._val, 0);
      if (permits > 0) {
        if (Atomics.compareExchange(this._val, 0, permits, permits - 1) === permits) {
          return; // got it!
        }
        // else, dang it, the value of 'permits' has changed since we read it, retry!
      } else {
        Atomics.wait(this._val, 0, 0);
      }
    }
  }

  release() {
    Atomics.add(this._val, 0, 1);
    Atomics.notify(this._val, 0, 1);
  }

}
