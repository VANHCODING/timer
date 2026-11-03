(function (root) {
  'use strict';

  const TYPES = Object.freeze({ '222': '222so', '333': '333', '444': '444wca' });
  const workerUrl = typeof document === 'undefined' ? '' : new URL('vendor/cstimer-0.1.5/cstimer_module.js', document.currentScript.src).href;

  class WcaScrambler {
    constructor(options = {}) {
      this.Worker = options.Worker || root.Worker;
      this.crypto = options.crypto || root.crypto;
      this.workerUrl = options.workerUrl || workerUrl;
      this.timeoutMs = options.timeoutMs || 60000;
      this.worker = null;
      this.requests = new Map();
      this.prefetched = new Map();
      this.messageId = 0;
    }

    connect() {
      if (this.worker) return this.worker;
      if (!this.Worker || !this.crypto?.getRandomValues) throw new Error('Worker or secure randomness is unavailable');
      const bytes = this.crypto.getRandomValues(new Uint8Array(32));
      const seed = Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
      const worker = new this.Worker(this.workerUrl);
      this.worker = worker;
      worker.onmessage = event => {
        if (this.worker !== worker) return;
        if (!Array.isArray(event.data)) return this.dispose(new Error('Invalid worker message'));
        const [messageId, type, value] = event.data;
        const request = this.requests.get(messageId);
        if (!request || type !== 'scramble') return;
        clearTimeout(request.timeout);
        this.requests.delete(messageId);
        if (typeof value !== 'string' || !value.trim()) request.reject(new Error('Invalid csTimer response'));
        else request.resolve(value.trim().replace(/\s+/g, ' '));
      };
      worker.onerror = event => {
        event.preventDefault?.();
        if (this.worker === worker) this.dispose(new Error('csTimer worker failed'));
      };
      worker.onmessageerror = () => {
        if (this.worker === worker) this.dispose(new Error('Invalid worker message'));
      };
      try {
        worker.postMessage([0, 'seed', [seed]]);
      } catch (error) {
        this.dispose(error);
        throw error;
      }
      return worker;
    }

    request(puzzle) {
      return new Promise((resolve, reject) => {
        const worker = this.connect();
        const messageId = ++this.messageId;
        const timeout = setTimeout(() => this.dispose(new Error('csTimer request timed out')), this.timeoutMs);
        this.requests.set(messageId, { resolve, reject, timeout });
        try {
          worker.postMessage([messageId, 'scramble', [TYPES[puzzle], 0]]);
        } catch (error) {
          this.dispose(error);
        }
      });
    }

    async generate(puzzle = '333') {
      if (!Object.hasOwn(TYPES, puzzle)) throw new Error('Unsupported puzzle: ' + puzzle);
      const ready = this.prefetched.get(puzzle);
      this.prefetched.delete(puzzle);
      let scramble = ready ? await ready : null;
      if (!scramble) scramble = await this.request(puzzle);
      if (!this.prefetched.has(puzzle)) {
        this.prefetched.set(puzzle, this.request(puzzle).catch(() => null));
      }
      return { type: puzzle, scramble };
    }

    dispose(error = new Error('Scrambler closed')) {
      this.worker?.terminate();
      this.worker = null;
      this.prefetched.clear();
      for (const request of this.requests.values()) {
        clearTimeout(request.timeout);
        request.reject(error);
      }
      this.requests.clear();
    }
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { WcaScrambler, TYPES };
  else root.WcaScrambler = WcaScrambler;
})(typeof globalThis !== 'undefined' ? globalThis : this);
