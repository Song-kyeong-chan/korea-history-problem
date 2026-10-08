/* 키워드 단답형 모드 */

const CHOSEONG = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";

/** '정약용' → 'ㅈㅇㅇ' (한글 음절이 아닌 글자는 그대로 둔다) */
function toChoseong(word) {
  return [...word]
    .map((ch) => {
      const code = ch.charCodeAt(0) - 0xac00;
      return code >= 0 && code < 11172 ? CHOSEONG[Math.floor(code / 588)] : ch;
    })
    .join("");
}

/** 띄어쓰기, 가운뎃점, 괄호 등 표기 차이를 무시하고 비교하기 위한 정규화 */
const normalizeAnswer = (text) =>
  text.normalize("NFC").replace(/[\s·.,'"‘’“”『』「」()[\]<>-]/g, "").toLowerCase();

(() => {
  const panel = $("#panel-short");
  const screens = { start: $("#short-start"), play: $("#short-play"), result: $("#short-result") };

  let eraFilter;
  const state = { queue: [], index: 0, score: 0, wrong: [], answered: false, hintLevel: 0, hintsUsed: 0 };

  const isCorrect = (q, input) =>
    [q.answer, ...q.accept].some((ans) => normalizeAnswer(ans) === normalizeAnswer(input));

  function startFromFilters() {
    const pool = shuffle(eraFilter.pick());
    const msg = $("#short-start-msg");
    if (pool.length === 0) {
      msg.textContent = "시대를 하나 이상 골라 주세요.";
      msg.hidden = false;
      return;
    }
    msg.hidden = true;
    const countValue = $("#short-count").value;
    start(pool.slice(0, countValue === "all" ? pool.length : Number(countValue)));
  }

  function start(items) {
    state.queue = items;
    state.index = 0;
    state.score = 0;
    state.wrong = [];
    state.hintsUsed = 0;
    showOnly(screens, "play");
    render();
  }

  function render() {
    const q = state.queue[state.index];
    const total = state.queue.length;
    state.answered = false;
    state.hintLevel = 0;

    $("#short-progress").textContent = `${state.index + 1} / ${total}`;
    $("#short-score").textContent = `맞힌 문제 ${state.score}`;
    $("#short-progress-fill").style.width = `${(state.index / total) * 100}%`;
    $("#short-era").textContent = q.era;
    // 주제가 곧 정답인 문제가 많아서, 답을 고른 뒤에 보여 준다
    $("#short-topic").textContent = q.topic;
    $("#short-topic").hidden = true;
    $("#short-question").textContent = `${state.index + 1}. ${q.question}`;

    const input = $("#short-input");
    input.value = "";
    input.disabled = false;
    $("#short-submit").disabled = false;
    $("#short-giveup").disabled = false;
    $("#short-hint-btn").disabled = false;
    $("#short-hint-btn").textContent = "💡 힌트 보기";
    $("#short-hint-text").hidden = true;
    $("#short-choseong").hidden = true;
    $("#short-feedback").hidden = true;
    $("#short-accept").hidden = true;
    $("#short-next").hidden = true;
    input.focus();
  }

  function showHint() {
    const q = state.queue[state.index];
    if (state.answered || state.hintLevel >= 2) return;
    if (state.hintLevel === 0) state.hintsUsed++;
    state.hintLevel++;

    if (state.hintLevel === 1) {
      $("#short-hint-text").textContent = q.hint;
      $("#short-hint-text").hidden = false;
      $("#short-hint-btn").textContent = "🔤 초성 보기";
    } else {
      $("#short-choseong").textContent = `초성: ${toChoseong(q.answer)}`;
      $("#short-choseong").hidden = false;
      $("#short-hint-btn").disabled = true;
    }
    $("#short-input").focus();
  }

  function submit(e) {
    e.preventDefault();
    if (state.answered) return;
    const value = $("#short-input").value.trim();
    if (!value) {
      $("#short-input").focus();
      return;
    }
    finish(isCorrect(state.queue[state.index], value), value);
  }

  function finish(correct, value) {
    state.answered = true;
    const q = state.queue[state.index];

    $("#short-topic").hidden = false;
    $("#short-input").disabled = true;
    $("#short-submit").disabled = true;
    $("#short-giveup").disabled = true;
    $("#short-hint-btn").disabled = true;

    if (correct) state.score++;
    else state.wrong.push({ question: q, mine: value });

    const feedback = $("#short-feedback");
    feedback.classList.toggle("is-wrong", !correct);
    $("#short-feedback-title").textContent = correct
      ? `정답입니다! (${q.answer})`
      : `${value ? "오답이에요." : "정답을 확인해 보세요."} 정답: ${q.answer}`;
    $("#short-explanation").textContent = q.explanation;
    feedback.hidden = false;

    // 띄어쓰기 외의 표기 차이(예: 별칭)로 오답 처리됐을 때 직접 정답으로 인정할 수 있게 한다
    $("#short-accept").hidden = correct || !value;

    $("#short-score").textContent = `맞힌 문제 ${state.score}`;
    const nextBtn = $("#short-next");
    nextBtn.textContent = state.index === state.queue.length - 1 ? "결과 보기" : "다음 문제";
    nextBtn.hidden = false;
    nextBtn.focus();
  }

  function acceptAsCorrect() {
    const q = state.queue[state.index];
    state.wrong = state.wrong.filter((w) => w.question !== q);
    state.score++;
    $("#short-feedback").classList.remove("is-wrong");
    $("#short-feedback-title").textContent = `정답으로 인정했어요. (정답: ${q.answer})`;
    $("#short-score").textContent = `맞힌 문제 ${state.score}`;
    $("#short-accept").hidden = true;
    $("#short-next").focus();
  }

  function next() {
    state.index++;
    if (state.index < state.queue.length) render();
    else showResult();
  }

  function showResult() {
    const total = state.queue.length;
    const percent = Math.round((state.score / total) * 100);
    $("#short-result-score").textContent = `${state.score} / ${total} (${percent}점)`;
    $("#short-result-hints").textContent =
      state.hintsUsed > 0 ? `힌트 사용: ${state.hintsUsed}회` : "힌트 없이 풀었어요!";
    $("#short-retry").hidden = state.wrong.length === 0;

    const review = $("#short-review");
    review.innerHTML = "";
    for (const { question: q, mine } of state.wrong) {
      review.appendChild(reviewItem({
        title: `[${q.era}] ${q.question}`,
        mine: `내 답: ${mine || "(모름)"}`,
        answer: `정답: ${q.answer}`,
        explanation: q.explanation,
      }));
    }
    showOnly(screens, "result");
  }

  $("#short-start-btn").addEventListener("click", startFromFilters);
  $("#short-form").addEventListener("submit", submit);
  $("#short-giveup").addEventListener("click", () => {
    if (!state.answered) finish(false, "");
  });
  $("#short-hint-btn").addEventListener("click", showHint);
  $("#short-accept").addEventListener("click", acceptAsCorrect);
  $("#short-next").addEventListener("click", next);
  $("#short-quit").addEventListener("click", () => showOnly(screens, "start"));
  $("#short-retry").addEventListener("click", () => start(shuffle(state.wrong.map((w) => w.question))));
  $("#short-home").addEventListener("click", () => showOnly(screens, "start"));

  loadData("short")
    .then((items) => {
      $("#short-total").textContent = `총 ${items.length}문제`;
      eraFilter = createEraFilter($("#short-era-filters"), items);
      $("#short-start-btn").disabled = false;
    })
    .catch((err) => showLoadError(panel, err));
})();
