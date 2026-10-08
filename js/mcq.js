/* 객관식 모드 */
(() => {
  const CIRCLED = ["①", "②", "③", "④", "⑤"];
  const WRONG_KEY = "khp-wrong-ids";

  const panel = $("#panel-mcq");
  const screens = { start: $("#start-screen"), quiz: $("#quiz-screen"), result: $("#result-screen") };

  let allQuestions = [];
  let eraFilter;
  const state = {
    queue: [],
    index: 0,
    score: 0,
    wrong: [], // { question, picked, usedHint }
    answered: false,
    hintShown: false,
    hintsUsed: 0,
  };

  /* ---------- 오답 노트 ---------- */

  const loadWrongIds = () => new Set(storage.get(WRONG_KEY, []));
  const saveWrongIds = (ids) => storage.set(WRONG_KEY, [...ids]);

  function updateWrongNote() {
    const ids = loadWrongIds();
    const count = allQuestions.filter((q) => ids.has(q.id)).length;
    $("#wrong-count").textContent = count;
    $("#wrong-only-btn").disabled = count === 0;
    $("#clear-wrong-btn").disabled = count === 0;
  }

  /* ---------- 시작 화면 ---------- */

  function startFromFilters() {
    const pool = shuffle(eraFilter.pick());
    const msg = $("#start-msg");

    if (pool.length === 0) {
      msg.textContent = "시대를 하나 이상 골라 주세요.";
      msg.hidden = false;
      return;
    }
    msg.hidden = true;

    const countValue = $("#count-select").value;
    const count = countValue === "all" ? pool.length : Number(countValue);
    startQuiz(pool.slice(0, count));
  }

  function startWrongOnly() {
    const ids = loadWrongIds();
    startQuiz(shuffle(allQuestions.filter((q) => ids.has(q.id))));
  }

  /* ---------- 문제 풀기 ---------- */

  function startQuiz(questions) {
    state.queue = questions;
    state.index = 0;
    state.score = 0;
    state.wrong = [];
    state.hintsUsed = 0;
    showOnly(screens, "quiz");
    renderQuestion();
  }

  function renderQuestion() {
    const q = state.queue[state.index];
    const total = state.queue.length;
    state.answered = false;

    $("#progress-text").textContent = `${state.index + 1} / ${total}`;
    $("#score-text").textContent = `맞힌 문제 ${state.score}`;
    $("#progress-fill").style.width = `${(state.index / total) * 100}%`;
    $("#era-tag").textContent = q.era;
    // 주제가 곧 정답인 문제가 많아서, 답을 고른 뒤에 보여 준다
    $("#topic-tag").textContent = q.topic;
    $("#topic-tag").hidden = true;
    $("#question-text").textContent = `${state.index + 1}. ${q.question}`;

    const list = $("#choices");
    list.innerHTML = "";
    q.choices.forEach((choice, i) => {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "choice-btn";
      btn.innerHTML = `<span class="choice-num">${CIRCLED[i]}</span><span></span>`;
      btn.lastChild.textContent = choice;
      btn.addEventListener("click", () => choose(i));
      li.appendChild(btn);
      list.appendChild(li);
    });

    state.hintShown = false;
    $("#hint-btn").disabled = !q.hint;
    $("#hint-text").hidden = true;
    $("#feedback").hidden = true;
    $("#next-btn").hidden = true;
  }

  function showHint() {
    const q = state.queue[state.index];
    if (state.answered || state.hintShown || !q.hint) return;
    state.hintShown = true;
    state.hintsUsed++;
    $("#hint-text").textContent = q.hint;
    $("#hint-text").hidden = false;
    $("#hint-btn").disabled = true;
  }

  function choose(picked) {
    if (state.answered) return;
    state.answered = true;

    const q = state.queue[state.index];
    const isCorrect = picked === q.answer;
    const wrongIds = loadWrongIds();

    $("#topic-tag").hidden = false;
    $("#hint-btn").disabled = true;
    $$(".choice-btn", panel).forEach((btn, i) => {
      btn.disabled = true;
      if (i === q.answer) btn.classList.add("correct");
      else if (i === picked) btn.classList.add("wrong");
    });

    if (isCorrect) {
      state.score++;
      wrongIds.delete(q.id);
    } else {
      state.wrong.push({ question: q, picked, usedHint: state.hintShown });
      wrongIds.add(q.id);
    }
    saveWrongIds(wrongIds);

    const feedback = $("#feedback");
    feedback.classList.toggle("is-wrong", !isCorrect);
    $("#feedback-title").textContent = isCorrect
      ? "정답입니다!"
      : `오답입니다. 정답은 ${CIRCLED[q.answer]}번이에요.`;
    $("#explanation").textContent = q.explanation;
    feedback.hidden = false;

    $("#score-text").textContent = `맞힌 문제 ${state.score}`;
    const nextBtn = $("#next-btn");
    nextBtn.textContent = state.index === state.queue.length - 1 ? "결과 보기" : "다음 문제";
    nextBtn.hidden = false;
    nextBtn.focus();
  }

  function next() {
    state.index++;
    if (state.index < state.queue.length) {
      renderQuestion();
    } else {
      showResult();
    }
  }

  /* ---------- 결과 화면 ---------- */

  function showResult() {
    const total = state.queue.length;
    const percent = Math.round((state.score / total) * 100);

    $("#result-score").textContent = `${state.score} / ${total} (${percent}점)`;
    $("#result-msg").textContent =
      percent >= 80 ? "1급 합격선(80점) 이상이에요!" :
      percent >= 70 ? "2급 합격선(70점)은 넘었어요. 조금만 더!" :
      percent >= 60 ? "3급 합격선(60점) 수준이에요. 오답을 꼭 복습해 보세요." :
      "아직 합격선 아래예요. 해설을 읽으며 다시 풀어 봐요.";

    $("#result-hints").textContent =
      state.hintsUsed > 0 ? `힌트 사용: ${state.hintsUsed}회` : "힌트 없이 풀었어요!";

    $("#retry-wrong-btn").hidden = state.wrong.length === 0;

    const review = $("#review");
    review.innerHTML = "";
    for (const { question: q, picked, usedHint } of state.wrong) {
      const item = reviewItem({
        title: `[${q.era}] ${q.question}`,
        mine: `내 답: ${CIRCLED[picked]} ${q.choices[picked]}`,
        answer: `정답: ${CIRCLED[q.answer]} ${q.choices[q.answer]}`,
        explanation: q.explanation,
      });
      if (usedHint) {
        const badge = document.createElement("span");
        badge.className = "review-hint";
        badge.textContent = "힌트 사용";
        item.querySelector("h3").appendChild(badge);
      }
      review.appendChild(item);
    }

    updateWrongNote();
    showOnly(screens, "result");
  }

  /* ---------- 이벤트 ---------- */

  $("#start-btn").addEventListener("click", startFromFilters);
  $("#wrong-only-btn").addEventListener("click", startWrongOnly);
  $("#clear-wrong-btn").addEventListener("click", () => {
    saveWrongIds(new Set());
    updateWrongNote();
  });
  $("#next-btn").addEventListener("click", next);
  $("#hint-btn").addEventListener("click", showHint);
  $("#quit-btn").addEventListener("click", () => {
    updateWrongNote();
    showOnly(screens, "start");
  });
  $("#retry-wrong-btn").addEventListener("click", () => {
    startQuiz(shuffle(state.wrong.map((w) => w.question)));
  });
  $("#home-btn").addEventListener("click", () => showOnly(screens, "start"));

  // 키보드: 1~5로 선택, H로 힌트, Enter로 다음 문제
  document.addEventListener("keydown", (e) => {
    if (!isShown(screens.quiz) || isTyping(e)) return;
    if (e.key === "h" || e.key === "H" || e.key === "ㅗ") {
      showHint();
      return;
    }
    const n = Number(e.key);
    if (!state.answered && n >= 1 && n <= state.queue[state.index].choices.length) {
      choose(n - 1);
    }
  });

  /* ---------- 초기화 ---------- */

  loadData("questions")
    .then((questions) => {
      allQuestions = questions;
      $("#total-count").textContent = `총 ${allQuestions.length}문제`;
      eraFilter = createEraFilter($("#era-filters"), allQuestions);
      updateWrongNote();
      $("#start-btn").disabled = false;
    })
    .catch((err) => showLoadError(panel, err));
})();
