/* OX 퀴즈 모드 */
(() => {
  const panel = $("#panel-ox");
  const screens = { start: $("#ox-start"), play: $("#ox-play"), result: $("#ox-result") };
  const mark = (answer) => (answer ? "O" : "X");

  let eraFilter;
  const state = { queue: [], index: 0, score: 0, wrong: [], answered: false };

  function startFromFilters() {
    const pool = shuffle(eraFilter.pick());
    const msg = $("#ox-start-msg");
    if (pool.length === 0) {
      msg.textContent = "시대를 하나 이상 골라 주세요.";
      msg.hidden = false;
      return;
    }
    msg.hidden = true;
    const countValue = $("#ox-count").value;
    start(pool.slice(0, countValue === "all" ? pool.length : Number(countValue)));
  }

  function start(items) {
    state.queue = items;
    state.index = 0;
    state.score = 0;
    state.wrong = [];
    showOnly(screens, "play");
    render();
  }

  function render() {
    const q = state.queue[state.index];
    const total = state.queue.length;
    state.answered = false;

    $("#ox-progress").textContent = `${state.index + 1} / ${total}`;
    $("#ox-score").textContent = `맞힌 문제 ${state.score}`;
    $("#ox-progress-fill").style.width = `${(state.index / total) * 100}%`;
    $("#ox-era").textContent = q.era;
    $("#ox-statement").textContent = q.statement;

    $$(".ox-btn", panel).forEach((btn) => {
      btn.disabled = false;
      btn.classList.remove("correct", "wrong");
    });
    $("#ox-feedback").hidden = true;
    $("#ox-next").hidden = true;
  }

  function answer(picked) {
    if (state.answered) return;
    state.answered = true;

    const q = state.queue[state.index];
    const isCorrect = picked === q.answer;

    $$(".ox-btn", panel).forEach((btn) => {
      const value = btn.dataset.value === "true";
      btn.disabled = true;
      if (value === q.answer) btn.classList.add("correct");
      else if (value === picked) btn.classList.add("wrong");
    });

    if (isCorrect) state.score++;
    else state.wrong.push({ question: q, picked });

    const feedback = $("#ox-feedback");
    feedback.classList.toggle("is-wrong", !isCorrect);
    $("#ox-feedback-title").textContent = isCorrect
      ? `정답입니다! (${mark(q.answer)})`
      : `오답이에요. 정답은 ${mark(q.answer)}예요.`;
    $("#ox-explanation").textContent = q.explanation;
    feedback.hidden = false;

    $("#ox-score").textContent = `맞힌 문제 ${state.score}`;
    const nextBtn = $("#ox-next");
    nextBtn.textContent = state.index === state.queue.length - 1 ? "결과 보기" : "다음 문제";
    nextBtn.hidden = false;
    nextBtn.focus();
  }

  function next() {
    state.index++;
    if (state.index < state.queue.length) render();
    else showResult();
  }

  function showResult() {
    const total = state.queue.length;
    const percent = Math.round((state.score / total) * 100);
    $("#ox-result-score").textContent = `${state.score} / ${total} (${percent}점)`;
    $("#ox-retry").hidden = state.wrong.length === 0;

    const review = $("#ox-review");
    review.innerHTML = "";
    for (const { question: q, picked } of state.wrong) {
      review.appendChild(reviewItem({
        title: `[${q.era}] ${q.statement}`,
        mine: `내 답: ${mark(picked)}`,
        answer: `정답: ${mark(q.answer)}`,
        explanation: q.explanation,
      }));
    }
    showOnly(screens, "result");
  }

  $("#ox-start-btn").addEventListener("click", startFromFilters);
  $$(".ox-btn", panel).forEach((btn) => {
    btn.addEventListener("click", () => answer(btn.dataset.value === "true"));
  });
  $("#ox-next").addEventListener("click", next);
  $("#ox-quit").addEventListener("click", () => showOnly(screens, "start"));
  $("#ox-retry").addEventListener("click", () => start(shuffle(state.wrong.map((w) => w.question))));
  $("#ox-home").addEventListener("click", () => showOnly(screens, "start"));

  // 키보드: O / X (한글 자판에서는 ㅐ / ㅌ), 1 / 2
  document.addEventListener("keydown", (e) => {
    if (!isShown(screens.play) || isTyping(e) || state.answered) return;
    const key = e.key.toLowerCase();
    if (["o", "ㅐ", "1"].includes(key)) answer(true);
    else if (["x", "ㅌ", "2"].includes(key)) answer(false);
  });

  loadData("ox")
    .then((items) => {
      $("#ox-total").textContent = `총 ${items.length}문제`;
      eraFilter = createEraFilter($("#ox-era-filters"), items);
      $("#ox-start-btn").disabled = false;
    })
    .catch((err) => showLoadError(panel, err));
})();
