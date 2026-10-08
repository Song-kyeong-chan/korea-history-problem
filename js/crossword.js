/* 십자말풀이 모드
 * 단답형 문제의 정답(한글 2~7글자)을 단어로, 문제를 열쇠로 써서 매번 새 퍼즐을 만든다.
 * 한글 입력기는 칸마다 한 글자씩 입력하기 어려워서, 단어를 고른 뒤 입력창에 단어 전체를 입력한다.
 */
(() => {
  const MAX_SIZE = 13; // 퍼즐 가로·세로 최대 칸 수
  const ATTEMPTS = 60;
  const DIR_LABEL = { across: "가로", down: "세로" };

  const panel = $("#panel-cross");
  const screens = { start: $("#cross-start"), play: $("#cross-play") };
  const cellKey = (r, c) => `${r},${c}`;
  const toWord = (answer) => answer.replace(/[\s·]/g, "");

  let eraFilter;
  let lastPool = [];
  let puzzle = null; // { width, height, words: [...], cells: Map }
  let entries = new Map(); // cellKey -> 입력한 글자
  let selected = -1; // 선택한 단어 index

  /* ---------- 퍼즐 생성 ---------- */

  function toCandidates(items) {
    const seen = new Set();
    const list = [];
    for (const item of shuffle(items)) {
      const word = toWord(item.answer);
      if (!/^[가-힣]{2,7}$/.test(word) || seen.has(word)) continue;
      if (toWord(item.question).includes(word)) continue; // 열쇠에 정답이 드러나는 문제 제외
      seen.add(word);
      list.push({ letters: [...word], answer: item.answer, clue: item.question, explanation: item.explanation });
    }
    return list;
  }

  function tryBuild(candidates, target) {
    const cells = new Map(); // cellKey -> { ch, across, down }
    const placed = [];
    const bounds = { minR: 0, maxR: 0, minC: 0, maxC: 0 };

    const step = (dir) => (dir === "down" ? [1, 0] : [0, 1]);

    function fits(letters, row, col, dir) {
      const [dr, dc] = step(dir);
      const len = letters.length;
      // 단어 앞뒤 칸은 비어 있어야 한다
      if (cells.has(cellKey(row - dr, col - dc)) || cells.has(cellKey(row + dr * len, col + dc * len))) return -1;
      const endR = row + dr * (len - 1);
      const endC = col + dc * (len - 1);
      if (Math.max(bounds.maxR, endR) - Math.min(bounds.minR, row) >= MAX_SIZE) return -1;
      if (Math.max(bounds.maxC, endC) - Math.min(bounds.minC, col) >= MAX_SIZE) return -1;

      let crossings = 0;
      for (let k = 0; k < len; k++) {
        const r = row + dr * k;
        const c = col + dc * k;
        const cell = cells.get(cellKey(r, c));
        if (cell) {
          if (cell.ch !== letters[k] || cell[dir]) return -1;
          crossings++;
        } else if (cells.has(cellKey(r + dc, c + dr)) || cells.has(cellKey(r - dc, c - dr))) {
          return -1; // 옆 단어와 나란히 붙으면 엉뚱한 단어가 생긴다
        }
      }
      return crossings;
    }

    function place(item, row, col, dir) {
      const [dr, dc] = step(dir);
      item.letters.forEach((ch, k) => {
        const key = cellKey(row + dr * k, col + dc * k);
        const cell = cells.get(key) ?? { ch, across: false, down: false };
        cell[dir] = true;
        cells.set(key, cell);
      });
      bounds.minR = Math.min(bounds.minR, row);
      bounds.minC = Math.min(bounds.minC, col);
      bounds.maxR = Math.max(bounds.maxR, row + dr * (item.letters.length - 1));
      bounds.maxC = Math.max(bounds.maxC, col + dc * (item.letters.length - 1));
      placed.push({ ...item, row, col, dir });
    }

    place(candidates[0], 0, 0, "across");
    for (const item of candidates.slice(1)) {
      if (placed.length >= target) break;
      const options = [];
      for (const p of placed) {
        const dir = p.dir === "across" ? "down" : "across";
        p.letters.forEach((ch, i) => {
          item.letters.forEach((ch2, j) => {
            if (ch !== ch2) return;
            const row = p.dir === "across" ? p.row - j : p.row + i;
            const col = p.dir === "across" ? p.col + i : p.col - j;
            const crossings = fits(item.letters, row, col, dir);
            if (crossings > 0) options.push({ row, col, dir, crossings });
          });
        });
      }
      if (options.length) {
        const most = Math.max(...options.map((o) => o.crossings));
        const pick = shuffle(options.filter((o) => o.crossings === most))[0];
        place(item, pick.row, pick.col, pick.dir);
      }
    }
    return { placed, bounds };
  }

  function buildPuzzle(items, target) {
    let best = null;
    for (let i = 0; i < ATTEMPTS; i++) {
      const candidates = toCandidates(items);
      if (candidates.length < 2) return null;
      const result = tryBuild(candidates, target);
      const area = (result.bounds.maxR - result.bounds.minR + 1) * (result.bounds.maxC - result.bounds.minC + 1);
      const score = result.placed.length * 1000 - area;
      if (!best || score > best.score) best = { ...result, score };
      if (result.placed.length >= target) break;
    }
    if (best.placed.length < 3) return null;

    // 좌표를 0부터 시작하도록 옮기고 칸 번호를 매긴다
    const { minR, minC, maxR, maxC } = best.bounds;
    const words = best.placed.map((w) => ({ ...w, row: w.row - minR, col: w.col - minC }));
    const cells = new Map();
    words.forEach((w, index) => {
      w.letters.forEach((ch, k) => {
        const r = w.dir === "down" ? w.row + k : w.row;
        const c = w.dir === "across" ? w.col + k : w.col;
        const key = cellKey(r, c);
        const cell = cells.get(key) ?? { row: r, col: c, ch, words: {} };
        cell.words[w.dir] = index;
        cells.set(key, cell);
      });
    });

    const starts = [...new Set(words.map((w) => cellKey(w.row, w.col)))]
      .map((key) => cells.get(key))
      .sort((a, b) => a.row - b.row || a.col - b.col);
    starts.forEach((cell, i) => (cell.num = i + 1));
    words.forEach((w) => (w.num = cells.get(cellKey(w.row, w.col)).num));

    return { width: maxC - minC + 1, height: maxR - minR + 1, words, cells };
  }

  const wordCells = (w) =>
    w.letters.map((_, k) => cellKey(w.dir === "down" ? w.row + k : w.row, w.dir === "across" ? w.col + k : w.col));

  /* ---------- 화면 ---------- */

  function startFromFilters() {
    const pool = eraFilter.pick();
    const msg = $("#cross-start-msg");
    if (pool.length === 0) {
      msg.textContent = "시대를 하나 이상 골라 주세요.";
      msg.hidden = false;
      return;
    }
    lastPool = pool;
    if (!newPuzzle()) {
      msg.textContent = "선택한 시대의 단어로는 퍼즐을 만들기 어려워요. 시대를 더 골라 주세요.";
      msg.hidden = false;
      return;
    }
    msg.hidden = true;
    showOnly(screens, "play");
  }

  function newPuzzle() {
    const built = buildPuzzle(lastPool, Number($("#cross-size").value));
    if (!built) return false;
    puzzle = built;
    entries = new Map();
    selected = -1;
    renderGrid();
    renderClues();
    // 1번 열쇠부터 시작한다 (같은 번호면 가로 먼저)
    const first = puzzle.words.reduce((best, w, i, all) =>
      w.num < all[best].num || (w.num === all[best].num && w.dir === "across") ? i : best, 0);
    select(first);
    setStatus("");
    return true;
  }

  function renderGrid() {
    const grid = $("#cw-grid");
    grid.style.setProperty("--cols", puzzle.width);
    grid.innerHTML = "";
    for (let r = 0; r < puzzle.height; r++) {
      for (let c = 0; c < puzzle.width; c++) {
        const cell = puzzle.cells.get(cellKey(r, c));
        const el = document.createElement("div");
        if (!cell) {
          el.className = "cw-cell cw-empty";
        } else {
          el.className = "cw-cell";
          el.dataset.key = cellKey(r, c);
          el.innerHTML = `${cell.num ? `<span class="cw-num">${cell.num}</span>` : ""}<span class="cw-ch"></span>`;
          el.addEventListener("click", () => onCellClick(cell));
        }
        grid.appendChild(el);
      }
    }
  }

  function renderClues() {
    for (const dir of ["across", "down"]) {
      const list = $(`#cw-clues-${dir}`);
      list.innerHTML = "";
      puzzle.words
        .map((w, index) => ({ w, index }))
        .filter(({ w }) => w.dir === dir)
        .sort((a, b) => a.w.num - b.w.num)
        .forEach(({ w, index }) => {
          const li = document.createElement("li");
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "cw-clue";
          btn.dataset.index = index;
          btn.innerHTML = `<b></b> <span></span> <small></small>`;
          btn.querySelector("b").textContent = w.num;
          btn.querySelector("span").textContent = w.clue;
          btn.querySelector("small").textContent = `(${w.letters.length}글자)`;
          btn.addEventListener("click", () => {
            select(index);
            $("#cw-input").focus();
          });
          li.appendChild(btn);
          list.appendChild(li);
        });
      $(`#cw-${dir}-wrap`).hidden = list.children.length === 0;
    }
  }

  function onCellClick(cell) {
    const { across, down } = cell.words;
    // 가로·세로가 겹치는 칸을 다시 누르면 다른 방향 단어로 바꾼다
    if (across !== undefined && down !== undefined) select(selected === across ? down : across);
    else select(across ?? down);
    $("#cw-input").focus();
  }

  function select(index) {
    selected = index;
    const w = puzzle.words[index];
    const active = new Set(wordCells(w));
    $$(".cw-cell[data-key]", panel).forEach((el) => el.classList.toggle("active", active.has(el.dataset.key)));
    $$(".cw-clue", panel).forEach((el) => el.classList.toggle("active", Number(el.dataset.index) === index));
    $("#cw-current").textContent = `${w.num}번 ${DIR_LABEL[w.dir]} (${w.letters.length}글자) · ${w.clue}`;
    $("#cw-input").value = "";
    $("#cw-input").placeholder = `${w.letters.length}글자 입력`;
  }

  function refreshCells() {
    for (const key of puzzle.cells.keys()) {
      const el = $(`.cw-cell[data-key="${key}"]`, panel);
      $(".cw-ch", el).textContent = entries.get(key) ?? "";
      el.classList.remove("ok", "bad");
    }
  }

  function setStatus(text, tone = "") {
    const el = $("#cw-status");
    el.textContent = text;
    el.className = `cw-status ${tone}`;
  }

  const isSolved = (w) => wordCells(w).every((key, k) => entries.get(key) === w.letters[k]);

  function checkComplete() {
    if (puzzle.words.every(isSolved)) {
      setStatus("🎉 모든 단어를 맞혔어요!", "good");
      showAnswersList();
      return true;
    }
    return false;
  }

  function enterWord(e) {
    e.preventDefault();
    if (selected < 0) return;
    const w = puzzle.words[selected];
    const letters = [...normalizeAnswer($("#cw-input").value)];
    if (letters.length !== w.letters.length) {
      setStatus(`${w.letters.length}글자로 입력해 주세요.`, "bad");
      return;
    }
    wordCells(w).forEach((key, k) => entries.set(key, letters[k]));
    refreshCells();
    setStatus("");
    if (checkComplete()) return;

    // 아직 다 채우지 않은 다음 단어로 이동
    const order = puzzle.words.map((_, i) => (selected + 1 + i) % puzzle.words.length);
    const nextIndex = order.find((i) => wordCells(puzzle.words[i]).some((key) => !entries.has(key)));
    select(nextIndex ?? selected);
  }

  function checkAnswers() {
    for (const [key, cell] of puzzle.cells) {
      const el = $(`.cw-cell[data-key="${key}"]`, panel);
      if (!entries.has(key)) continue;
      el.classList.toggle("ok", entries.get(key) === cell.ch);
      el.classList.toggle("bad", entries.get(key) !== cell.ch);
    }
    const solved = puzzle.words.filter(isSolved).length;
    if (!checkComplete()) setStatus(`${puzzle.words.length}개 단어 중 ${solved}개를 맞혔어요.`, "");
  }

  function revealLetter() {
    if (selected < 0) return;
    const w = puzzle.words[selected];
    const keys = wordCells(w);
    const wrong = keys.map((key, k) => ({ key, k })).filter(({ key, k }) => entries.get(key) !== w.letters[k]);
    if (wrong.length === 0) {
      setStatus("이 단어는 이미 맞혔어요.", "good");
      return;
    }
    const { key, k } = wrong[Math.floor(Math.random() * wrong.length)];
    entries.set(key, w.letters[k]);
    refreshCells();
    $(`.cw-cell[data-key="${key}"]`, panel).classList.add("revealed");
    checkComplete();
  }

  function revealAll() {
    for (const [key, cell] of puzzle.cells) entries.set(key, cell.ch);
    refreshCells();
    setStatus("정답을 모두 공개했어요.", "");
    showAnswersList();
  }

  function showAnswersList() {
    const list = $("#cw-answers");
    list.innerHTML = "";
    [...puzzle.words]
      .sort((a, b) => a.num - b.num || (a.dir === "across" ? -1 : 1))
      .forEach((w) => {
        list.appendChild(reviewItem({
          title: `${w.num}번 ${DIR_LABEL[w.dir]} · ${w.clue}`,
          mine: "",
          answer: `정답: ${w.answer}`,
          explanation: w.explanation,
        }));
      });
    $("#cw-answers-wrap").hidden = false;
  }

  $("#cross-start-btn").addEventListener("click", startFromFilters);
  $("#cw-form").addEventListener("submit", enterWord);
  $("#cw-check").addEventListener("click", checkAnswers);
  $("#cw-reveal-letter").addEventListener("click", revealLetter);
  $("#cw-reveal-all").addEventListener("click", revealAll);
  $("#cw-new").addEventListener("click", () => {
    $("#cw-answers-wrap").hidden = true;
    newPuzzle();
  });
  $("#cw-home").addEventListener("click", () => {
    $("#cw-answers-wrap").hidden = true;
    showOnly(screens, "start");
  });

  loadData("short")
    .then((items) => {
      const usable = items.filter((item) => /^[가-힣]{2,7}$/.test(toWord(item.answer)));
      $("#cross-total").textContent = `단어 ${usable.length}개`;
      eraFilter = createEraFilter($("#cross-era-filters"), usable);
      $("#cross-start-btn").disabled = false;
    })
    .catch((err) => showLoadError(panel, err));
})();
