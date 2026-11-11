(function (root) {
  'use strict';

  const inWorker = typeof importScripts === 'function';
  if (inWorker) importScripts('cfop-diagrams.js');
  const geometry = typeof module !== 'undefined' && module.exports ? require('./cfop-diagrams') : root.CFOPDiagrams;
  const workerUrl = typeof document === 'undefined' ? '' : new URL('cross-f2l-solver.js?v=20261111', document.currentScript.src).href;
  const moves = ['U', 'D', 'R', 'L', 'F', 'B'].flatMap(face => ['', '2', "'"].map(suffix => face + suffix));
  const solveFrame = { U: 'D', D: 'U', R: 'L', L: 'R', F: 'F', B: 'B' };
  const slots = [
    { name: 'FR', position: [1, -1, 1], edgeFace: 'F', triggers: ['R', "F'"] },
    { name: 'FL', position: [-1, -1, 1], edgeFace: 'F', triggers: ["L'", 'F'] },
    { name: 'BR', position: [1, -1, -1], edgeFace: 'B', triggers: ["R'", 'B'] },
    { name: 'BL', position: [-1, -1, -1], edgeFace: 'B', triggers: ['L', "B'"] }
  ];

  function normalizeScramble(scramble) {
    if (typeof scramble !== 'string') throw new Error('Invalid scramble');
    const tokens = scramble.trim() ? scramble.trim().split(/\s+/) : [];
    if (tokens.length > 100 || tokens.some(token => !/^[UDRLFB](?:2|')?$/.test(token))) throw new Error('Invalid 3x3 scramble');
    return tokens.join(' ');
  }

  function algCubingUrl(scramble, algorithm) {
    const query = new URLSearchParams({ setup: normalizeScramble(scramble), alg: algorithm, puzzle: '3x3x3', type: 'reconstruction', scheme: 'boy' });
    return 'https://alg.cubing.net/?' + query;
  }

  function createSolver() {
    const key = sticker => sticker.position.join(',') + '/' + sticker.normal.join(',');
    const allStickers = geometry.solvedCube();
    const makeStates = size => allStickers.filter(sticker => sticker.position.reduce((sum, value) => sum + Math.abs(value), 0) === size);
    const edges = makeStates(2);
    const corners = makeStates(3);
    const makeTransitions = states => {
      const indices = new Map(states.map((sticker, index) => [key(sticker), index]));
      return moves.map(move => Uint8Array.from(states, sticker => {
        const clone = { position: [...sticker.position], normal: [...sticker.normal] };
        geometry.applyAlgorithm([clone], move);
        return indices.get(key(clone));
      }));
    };
    const edgeMoves = makeTransitions(edges);
    const cornerMoves = makeTransitions(corners);
    const stateAt = (states, position, color) => states.findIndex(sticker => sticker.color === color && sticker.position.every((value, axis) => value === position[axis]));
    const crossTargets = [[0, -1, 1], [1, -1, 0], [0, -1, -1], [-1, -1, 0]].map(position => stateAt(edges, position, 'D'));
    const edgeTargets = slots.map(slot => stateAt(edges, [slot.position[0], 0, slot.position[2]], slot.edgeFace));
    const cornerTargets = slots.map(slot => stateAt(corners, slot.position, 'D'));
    const encodeCross = values => ((values[0] * 24 + values[1]) * 24 + values[2]) * 24 + values[3];
    const decodeCross = encoded => [Math.floor(encoded / 13824), Math.floor(encoded / 576) % 24, Math.floor(encoded / 24) % 24, encoded % 24];
    const crossDistances = new Int8Array(24 ** 4).fill(-1);
    const queue = new Int32Array(24 ** 4);
    const crossGoal = encodeCross(crossTargets);
    crossDistances[crossGoal] = 0;
    queue[0] = crossGoal;
    let tail = 1;
    for (let head = 0; head < tail; head++) {
      const encoded = queue[head];
      const current = decodeCross(encoded);
      for (const transition of edgeMoves) {
        const next = encodeCross(current.map(value => transition[value]));
        if (crossDistances[next] !== -1) continue;
        crossDistances[next] = crossDistances[encoded] + 1;
        queue[tail++] = next;
      }
    }

    const macros = ['U', 'U2', "U'"].map(algorithm => ({ slot: -1, algorithm }));
    slots.forEach((slot, slotIndex) => slot.triggers.forEach(trigger => {
      for (const upper of ['U', 'U2', "U'"]) macros.push({ slot: slotIndex, algorithm: `${trigger} ${upper} ${geometry.inverse(trigger)}` });
    }));
    for (const macro of macros) {
      macro.moves = macro.algorithm.split(' ').map(move => moves.indexOf(move));
      const transform = transitions => Uint8Array.from({ length: 24 }, (_, initial) => macro.moves.reduce((value, move) => transitions[move][value], initial));
      macro.edges = transform(edgeMoves);
      macro.corners = transform(cornerMoves);
      if (crossTargets.some(value => macro.edges[value] !== value) || slots.some((slot, index) => index !== macro.slot && (macro.edges[edgeTargets[index]] !== edgeTargets[index] || macro.corners[cornerTargets[index]] !== cornerTargets[index]))) throw new Error('Invalid F2L transition');
    }
    const pairTables = new Map();
    function pairTable(slot, locked) {
      const cacheKey = slot + '/' + locked;
      if (pairTables.has(cacheKey)) return pairTables.get(cacheKey);
      const allowed = macros.filter(macro => macro.slot === -1 || !(locked & (1 << macro.slot)));
      const distances = new Int16Array(576).fill(-1);
      const pending = [cornerTargets[slot] * 24 + edgeTargets[slot]];
      distances[pending[0]] = 0;
      for (let head = 0; head < pending.length; head++) {
        const encoded = pending[head];
        for (const macro of allowed) {
          const next = macro.corners[Math.floor(encoded / 24)] * 24 + macro.edges[encoded % 24];
          if (distances[next] !== -1) continue;
          distances[next] = distances[encoded] + 1;
          pending.push(next);
        }
      }
      const table = { allowed, distances };
      pairTables.set(cacheKey, table);
      return table;
    }

    function solve(scramble) {
      scramble = normalizeScramble(scramble);
      const state = { cross: [...crossTargets], edges: [...edgeTargets], corners: [...cornerTargets] };
      function applyMove(move) {
        state.cross = state.cross.map(value => edgeMoves[move][value]);
        state.edges = state.edges.map(value => edgeMoves[move][value]);
        state.corners = state.corners.map(value => cornerMoves[move][value]);
      }
      for (const token of scramble.split(' ').filter(Boolean)) applyMove(moves.indexOf(solveFrame[token[0]] + token.slice(1)));
      const cross = [];
      let crossCode = encodeCross(state.cross);
      if (crossDistances[crossCode] < 0) throw new Error('Invalid cross state');
      while (crossCode !== crossGoal) {
        const move = edgeMoves.findIndex(transition => crossDistances[encodeCross(state.cross.map(value => transition[value]))] === crossDistances[crossCode] - 1);
        if (move < 0) throw new Error('Cross solution unavailable');
        applyMove(move);
        cross.push(moves[move]);
        crossCode = encodeCross(state.cross);
      }
      let locked = 0;
      const stages = [];
      while (stages.length < 4) {
        let best = null;
        for (let slot = 0; slot < 4; slot++) {
          if (locked & (1 << slot)) continue;
          const { allowed, distances } = pairTable(slot, locked);
          let encoded = state.corners[slot] * 24 + state.edges[slot];
          if (distances[encoded] < 0) continue;
          const sequence = [];
          while (distances[encoded] > 0) {
            const macro = allowed.find(candidate => distances[candidate.corners[Math.floor(encoded / 24)] * 24 + candidate.edges[encoded % 24]] === distances[encoded] - 1);
            if (!macro) throw new Error('F2L solution unavailable');
            sequence.push(macro);
            encoded = macro.corners[Math.floor(encoded / 24)] * 24 + macro.edges[encoded % 24];
          }
          const length = sequence.reduce((sum, macro) => sum + macro.moves.length, 0);
          if (!best || length < best.length) best = { slot, sequence, length };
        }
        if (!best) throw new Error('F2L solution unavailable');
        for (const macro of best.sequence) for (const move of macro.moves) applyMove(move);
        locked |= 1 << best.slot;
        if (encodeCross(state.cross) !== crossGoal || slots.some((slot, index) => (locked & (1 << index)) && (state.edges[index] !== edgeTargets[index] || state.corners[index] !== cornerTargets[index]))) throw new Error('F2L verification failed');
        stages.push({ slot: slots[best.slot].name, algorithm: best.sequence.map(macro => macro.algorithm).join(' ') });
      }
      const result = { scramble, orientation: 'z2', cross: cross.join(' '), stages };
      stages.forEach((stage, index) => { result['f2l' + (index + 1)] = stage.algorithm; });
      result.crossAlg = ['z2', '// White cross', result.cross].join('\n');
      result.fullAlg = ['z2', '// White cross', result.cross, ...stages.flatMap((stage, index) => [`// F2L ${index + 1} (${stage.slot})`, stage.algorithm])].join('\n');
      result.crossUrl = algCubingUrl(scramble, result.crossAlg);
      result.url = algCubingUrl(scramble, result.fullAlg);
      return result;
    }
    return { solve };
  }

  class CrossF2LSolver {
    constructor(options = {}) {
      this.Worker = options.Worker || root.Worker;
      this.workerUrl = options.workerUrl || workerUrl;
      this.timeoutMs = options.timeoutMs || 30000;
      this.worker = null;
      this.requests = new Map();
      this.messageId = 0;
    }

    solve(scramble) {
      return new Promise((resolve, reject) => {
        try {
          scramble = normalizeScramble(scramble);
          if (!this.worker) {
            if (!this.Worker) throw new Error('Web Worker unavailable');
            const worker = new this.Worker(this.workerUrl);
            this.worker = worker;
            worker.onmessage = event => {
              if (this.worker !== worker) return;
              const { id, result, error } = event.data || {};
              const request = this.requests.get(id);
              if (!request) return;
              clearTimeout(request.timeout);
              this.requests.delete(id);
              if (error) request.reject(new Error(error));
              else if (!result || result.scramble !== request.scramble || !Array.isArray(result.stages) || result.stages.length !== 4) request.reject(new Error('Invalid solver response'));
              else request.resolve(result);
            };
            worker.onerror = event => {
              event.preventDefault?.();
              if (this.worker === worker) this.dispose(new Error('Solver worker failed'));
            };
            worker.onmessageerror = () => {
              if (this.worker === worker) this.dispose(new Error('Invalid solver message'));
            };
          }
          const id = ++this.messageId;
          const timeout = setTimeout(() => this.dispose(new Error('Solver timed out')), this.timeoutMs);
          this.requests.set(id, { resolve, reject, timeout, scramble });
          this.worker.postMessage({ id, scramble });
        } catch (error) {
          this.dispose(error);
          reject(error);
        }
      });
    }

    dispose(error = new Error('Solver closed')) {
      this.worker?.terminate();
      this.worker = null;
      for (const request of this.requests.values()) {
        clearTimeout(request.timeout);
        request.reject(error);
      }
      this.requests.clear();
    }
  }

  if (inWorker) {
    let solver;
    root.onmessage = event => {
      const { id, scramble } = event.data;
      try {
        solver ||= createSolver();
        root.postMessage({ id, result: solver.solve(scramble) });
      } catch (error) {
        root.postMessage({ id, error: error.message });
      }
    };
  } else if (typeof module !== 'undefined' && module.exports) module.exports = { createSolver, CrossF2LSolver, normalizeScramble, algCubingUrl };
  else root.CrossF2LSolver = CrossF2LSolver;
})(typeof globalThis !== 'undefined' ? globalThis : this);
