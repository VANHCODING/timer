(function (root) {
  'use strict';

  const colors = { U: '#facc15', D: '#ffffff', F: '#22c55e', B: '#2563eb', R: '#ef4444', L: '#fb923c' };
  const normals = { U: [0, 1, 0], D: [0, -1, 0], F: [0, 0, 1], B: [0, 0, -1], R: [1, 0, 0], L: [-1, 0, 0] };
  const moves = {
    R: [0, -1, [1]], L: [0, 1, [-1]], U: [1, -1, [1]], D: [1, 1, [-1]],
    F: [2, -1, [1]], B: [2, 1, [-1]], M: [0, 1, [0]], E: [1, 1, [0]], S: [2, -1, [0]],
    x: [0, -1, [-1, 0, 1]], y: [1, -1, [-1, 0, 1]], z: [2, -1, [-1, 0, 1]],
    r: [0, -1, [0, 1]], l: [0, 1, [-1, 0]], u: [1, -1, [0, 1]],
    d: [1, 1, [-1, 0]], f: [2, -1, [0, 1]], b: [2, 1, [-1, 0]]
  };
  const cache = new Map();
  const standardCache = new Map();
  const diagramCache = new Map();
  const netCache = new Map();
  const cardCache = new Map();

  const escapeHtml = value => String(value).replace(/[&<>"']/g, symbol => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[symbol]);

  function position(face, row, column) {
    switch (face) {
      case 'U': return [column - 1, 1, row - 1];
      case 'D': return [column - 1, -1, 1 - row];
      case 'F': return [column - 1, 1 - row, 1];
      case 'B': return [1 - column, 1 - row, -1];
      case 'R': return [1, 1 - row, 1 - column];
      case 'L': return [-1, 1 - row, column - 1];
    }
  }

  function solvedCube() {
    return Object.keys(normals).flatMap(face => Array.from({ length: 9 }, (_, index) => ({
      color: face,
      position: position(face, Math.floor(index / 3), index % 3),
      normal: [...normals[face]]
    })));
  }

  function tokenize(algorithm) {
    const source = algorithm.replace(/[()]/g, '').replace(/\s+/g, '');
    const tokens = source.match(/[URFDLBMESxyzurfdlb]w?(?:2'?|')?/g) || [];
    if (tokens.join('') !== source) throw new Error('Unsupported cube notation');
    return tokens;
  }

  function inverse(algorithm) {
    return tokenize(algorithm).reverse().map(token => token.includes('2') ? token.replace("'", '') : token.endsWith("'") ? token.slice(0, -1) : token + "'").join(' ');
  }

  function rotate(vector, axis, direction) {
    const [horizontal, vertical, depth] = vector;
    if (axis === 0) return [horizontal, -direction * depth, direction * vertical];
    if (axis === 1) return [direction * depth, vertical, -direction * horizontal];
    return [-direction * vertical, direction * horizontal, depth];
  }

  function applyAlgorithm(cube, algorithm) {
    for (const token of tokenize(algorithm)) {
      const base = token.includes('w') ? token[0].toLowerCase() : token[0];
      const [axis, clockwise, layers] = moves[base];
      const turns = token.includes('2') ? 2 : 1;
      const direction = clockwise * (token.endsWith("'") && turns === 1 ? -1 : 1);
      for (let turn = 0; turn < turns; turn++) {
        for (const sticker of cube) {
          if (!layers.includes(sticker.position[axis])) continue;
          sticker.position = rotate(sticker.position, axis, direction);
          sticker.normal = rotate(sticker.normal, axis, direction);
        }
      }
    }
    return cube;
  }

  function caseState(algorithm) {
    if (!cache.has(algorithm)) cache.set(algorithm, applyAlgorithm(solvedCube(), inverse(algorithm)));
    return cache.get(algorithm);
  }

  function faceColors(cube, face) {
    return Array.from({ length: 9 }, (_, index) => {
      const target = position(face, Math.floor(index / 3), index % 3);
      return cube.find(sticker => sticker.position.every((value, axis) => value === target[axis]) && sticker.normal.every((value, axis) => value === normals[face][axis])).color;
    });
  }

  function reorientToStandard(cube) {
    const orientations = [
      '', 'y', 'y2', "y'",
      'x', 'x y', 'x y2', "x y'",
      'x2', 'x2 y', 'x2 y2', "x2 y'",
      "x'", "x' y", "x' y2", "x' y'",
      'z', 'z y', 'z y2', "z y'",
      "z'", "z' y", "z' y2", "z' y'"
    ];
    for (const rot of orientations) {
      const cloned = cube.map(s => ({
        color: s.color,
        position: [...s.position],
        normal: [...s.normal]
      }));
      if (rot) applyAlgorithm(cloned, rot);
      const dC = cloned.find(s => s.color === 'D' && s.position.filter(x => x === 0).length === 2);
      const fC = cloned.find(s => s.color === 'F' && s.position.filter(x => x === 0).length === 2);
      if (dC && fC && dC.position[1] === -1 && fC.position[2] === 1) {
        return cloned;
      }
    }
    return cube;
  }

  function standardCaseState(algorithm) {
    if (!standardCache.has(algorithm)) {
      standardCache.set(algorithm, reorientToStandard(caseState(algorithm)));
    }
    return standardCache.get(algorithm);
  }

  function squareFace(cube, face, left, top, cell) {
    return faceColors(cube, face).map((color, index) => `<rect x="${left + index % 3 * cell}" y="${top + Math.floor(index / 3) * cell}" width="${cell - 1}" height="${cell - 1}" rx="1.8" fill="${colors[color]}" stroke="#0f172a" stroke-width="0.8"/>`).join('');
  }

  function svg(content, title, viewBox, className) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" role="img" aria-label="${escapeHtml(title)}" class="${className}"><title>${escapeHtml(title)}</title>${content}</svg>`;
  }

  function pllDiagram(algorithm, name) {
    if (diagramCache.has('pll_' + algorithm)) return diagramCache.get('pll_' + algorithm);
    const cube = standardCaseState(algorithm);
    let content = squareFace(cube, 'U', 26, 26, 24);
    const strips = [
      ['B', [2, 1, 0], 26, 13, 24, 10], ['F', [0, 1, 2], 26, 101, 24, 10],
      ['L', [0, 1, 2], 13, 26, 10, 24], ['R', [2, 1, 0], 101, 26, 10, 24]
    ];
    for (const [face, order, left, top, width, height] of strips) {
      const palette = faceColors(cube, face);
      content += order.map((index, offset) => `<rect x="${left + (width === 24 ? offset * 24 : 0)}" y="${top + (height === 24 ? offset * 24 : 0)}" width="${width - 1}" height="${height - 1}" rx="2" fill="${colors[palette[index]]}" stroke="#0f172a"/>`).join('');
    }
    content += '<text x="62" y="123" text-anchor="middle" fill="currentColor" font-size="9">F · Mặt trước</text>';
    const result = svg(content, `${name}: nhìn từ trên, màu cạnh bên khớp với công thức`, '0 0 124 128', 'cfop-diagram');
    diagramCache.set('pll_' + algorithm, result);
    return result;
  }

  function ollDiagram(algorithm, name) {
    const cacheKey = 'oll_' + algorithm + '_' + name;
    if (diagramCache.has(cacheKey)) return diagramCache.get(cacheKey);
    const cube = standardCaseState(algorithm);
    const fill = color => color === 'U' ? '#facc15' : 'var(--cfop-oll-off, #475569)';
    let content = faceColors(cube, 'U').map((color, index) =>
      `<rect x="${26 + index % 3 * 24}" y="${26 + Math.floor(index / 3) * 24}" width="22" height="22" rx="2" fill="${fill(color)}"/>`
    ).join('');
    const strips = [
      ['B', [2, 1, 0], 26, 13, 24, 10], ['F', [0, 1, 2], 26, 101, 24, 10],
      ['L', [0, 1, 2], 13, 26, 10, 24], ['R', [2, 1, 0], 101, 26, 10, 24]
    ];
    for (const [face, order, left, top, width, height] of strips) {
      const palette = faceColors(cube, face);
      content += order.map((index, offset) => `<rect x="${left + (width === 24 ? offset * 24 : 0)}" y="${top + (height === 24 ? offset * 24 : 0)}" width="${width - 2}" height="${height - 2}" rx="2" fill="${fill(palette[index])}"/>`).join('');
    }
    content += '<text x="62" y="123" text-anchor="middle" fill="currentColor" font-size="9">F · Mặt trước</text>';
    const result = svg(content, `${name}: vị trí ô vàng trước khi giải, nhìn từ trên, mặt trước ở dưới`, '0 0 124 128', 'cfop-diagram');
    diagramCache.set(cacheKey, result);
    return result;
  }

  function f2lDiagram(algorithm, name) {
    if (diagramCache.has('f2l_' + algorithm)) return diagramCache.get('f2l_' + algorithm);
    const cube = standardCaseState(algorithm);
    const faces = [
      ['U', [76, 10], [20, 10], [-20, 10]],
      ['F', [16, 40], [20, 10], [0, 22]],
      ['R', [76, 70], [20, -10], [0, 22]]
    ];
    let content = '';
    for (const [face, origin, across, down] of faces) {
      content += faceColors(cube, face).map((color, index) => {
        const column = index % 3;
        const row = Math.floor(index / 3);
        const corners = [[0.03, 0.03], [0.97, 0.03], [0.97, 0.97], [0.03, 0.97]].map(([offsetX, offsetY]) => `${origin[0] + (column + offsetX) * across[0] + (row + offsetY) * down[0]},${origin[1] + (column + offsetX) * across[1] + (row + offsetY) * down[1]}`).join(' ');
        return `<polygon points="${corners}" fill="${colors[color]}" stroke="#0f172a" stroke-width="1" stroke-linejoin="round"/>`;
      }).join('');
    }
    content += '<text x="40" y="139" text-anchor="middle" fill="currentColor" font-size="10">F · Trước</text><text x="112" y="139" text-anchor="middle" fill="currentColor" font-size="10">R · Phải</text>';
    const result = svg(content, `${name}: trạng thái trước khi giải, nhìn từ mặt trước và phải (slot FR)`, '0 0 152 145', 'cfop-diagram');
    diagramCache.set('f2l_' + algorithm, result);
    return result;
  }

  function cubeNet(algorithm, name) {
    if (netCache.has(algorithm)) return netCache.get(algorithm);
    const cube = standardCaseState(algorithm);
    const layout = { U: [1, 0], L: [0, 1], F: [1, 1], R: [2, 1], B: [3, 1], D: [1, 2] };
    let content = '';
    for (const [face, [column, row]] of Object.entries(layout)) {
      content += squareFace(cube, face, 8 + column * 66, 16 + row * 76, 20);
      content += `<text x="${38 + column * 66}" y="${11 + row * 76}" text-anchor="middle" fill="currentColor" font-size="10">${face}</text>`;
    }
    const result = svg(content, `${name}: hình trải đủ sáu mặt trước khi giải`, '0 0 278 232', 'cfop-net');
    netCache.set(algorithm, result);
    return result;
  }

  function readableAlgorithm(algorithm) {
    const chunks = algorithm.match(/\([^)]*\)|[^()]+/g) || [];
    return chunks.map(chunk => {
      if (chunk.startsWith('(')) return `<span class="cfop-trigger">${escapeHtml(chunk.trim())}</span>`;
      return chunk.trim().split(/\s+/).filter(Boolean).map(move => `<span class="cfop-move${/^[xyz]/.test(move) ? ' cfop-rotation' : ''}">${escapeHtml(move)}</span>`).join(' ');
    }).join(' ');
  }

  function isPllState(cube) {
    const std = reorientToStandard(cube);
    return ['U', 'D'].every(face => faceColors(std, face).every(color => color === faceColors(std, face)[4])) &&
      ['F', 'R', 'B', 'L'].every(face => faceColors(std, face).slice(3).every(color => color === faceColors(std, face)[4]));
  }

  function isOllState(cube) {
    const standard = reorientToStandard(cube);
    return faceColors(standard, 'D').every(color => color === 'D') &&
      ['F', 'R', 'B', 'L'].every(face => faceColors(standard, face).slice(3).every(color => color === face));
  }

  function renderCard(item, category, learned, duplicates = []) {
    const cacheKey = category + "_" + item.id + "_" + item.alg + "_" + item.name + "_" + learned + "_" + duplicates.join(",");
    if (cardCache.has(cacheKey)) return cardCache.get(cacheKey);

    const diagram = category === 'oll' ? ollDiagram(item.alg, item.name) : category === 'pll' ? pllDiagram(item.alg, item.name) : f2lDiagram(item.alg, item.name);
    const invalid = category === 'oll' ? !isOllState(caseState(item.alg)) : category === 'pll' && !isPllState(caseState(item.alg));
    const warning = invalid ? 'Cần kiểm tra công thức: trạng thái tạo ra chưa giữ nguyên hai tầng dưới hoặc không đúng loại case.' : '';
    const result = `<article class="cfop-card${learned ? ' is-learned' : ''}" aria-label="${escapeHtml(item.name)}">
      <header class="cfop-card-heading"><h3>${escapeHtml(item.name)}</h3>
        <button class="btn-toggle-learn cfop-learn" data-cat="${category}" data-id="${escapeHtml(item.id)}" aria-pressed="${learned}"><i data-lucide="${learned ? 'check-circle-2' : 'circle'}"></i><span>${learned ? 'Đã thuộc' : 'Chưa học'}</span></button>
      </header>
      ${item.group ? `<p class="cfop-group">${escapeHtml(item.group)}</p>` : ''}
      ${item.desc ? `<p class="cfop-description">${escapeHtml(item.desc)}</p>` : ''}
      ${warning ? `<p class="cfop-warning">${warning}</p>` : ''}
      ${duplicates.length ? `<p class="cfop-warning">Cùng chuỗi động tác với ${duplicates.map(escapeHtml).join(', ')}. Cần đối chiếu lại tên case.</p>` : ''}
      <div class="cfop-card-body"><figure>${diagram}<figcaption>${category === 'oll' ? 'Ô vàng cần định hướng · F ở dưới, R ở phải' : category === 'pll' ? 'Nhìn từ trên · F ở dưới, R ở phải' : 'U ở trên · F ở trước · R ở phải (Slot FR)'}</figcaption></figure>
        <div class="cfop-formula"><div class="cfop-formula-label"><span>Công thức giải</span><button class="btn-copy-card-alg" data-alg="${escapeHtml(item.alg)}" title="Sao chép công thức" aria-label="Sao chép công thức ${escapeHtml(item.name)}"><i data-lucide="copy"></i></button></div>
          <div class="cfop-moves">${readableAlgorithm(item.alg)}</div>
        </div>
      </div>
    </article>`;

    cardCache.set(cacheKey, result);
    return result;
  }

  const api = { solvedCube, tokenize, inverse, applyAlgorithm, caseState, standardCaseState, faceColors, reorientToStandard, pllDiagram, ollDiagram, f2lDiagram, cubeNet, readableAlgorithm, isPllState, isOllState, renderCard };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CFOPDiagrams = api;
})(typeof window !== 'undefined' ? window : globalThis);
