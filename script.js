const CIRCLED = ["①", "②", "③", "④", "⑤"];
const WRONG_KEY = "khp-wrong-ids";

const $ = (selector) => document.querySelector(selector);

let allQuestions = [];
const state = {
  queue: [],
  index: 0,
  score: 0,
  wrong: [], // { question, picked }
  answered: false,
};

/* ---------- 오답 노트 (localStorage) ---------- */

function loadWrongIds() {
  try {
    return new Set(JSON.parse(localStorage.getItem(WRONG_KEY)) || []);
  } catch {
    return new Set();
  }
}

function saveWrongIds(ids) {
  try {
    localStorage.setItem(WRONG_KEY, JSON.stringify([...ids]));
  } catch {
    // 저장소를 쓸 수 없는 환경(시크릿 모드 등)에서는 무시
  }
}

function updateWrongNote() {
  const ids = loadWrongIds();
  const count = allQuestions.filter((q) => ids.has(q.id)).length;
  $("#wrong-count").textContent = count;
  $("#wrong-only-btn").disabled = count === 0;
  $("#clear-wrong-btn").disabled = count === 0;
}

/* ---------- 유틸 ---------- */

function shuffle(items) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function showScreen(name) {
  for (const id of ["start", "quiz", "result"]) {
    $(`#${id}-screen`).hidden = id !== name;
  }
  window.scrollTo({ top: 0 });
}

/* ---------- 시작 화면 ---------- */

function renderEraFilters() {
  const eras = [...new Set(allQuestions.map((q) => q.era))];
  const container = $("#era-filters");
  container.innerHTML = "";

  for (const era of eras) {
    const count = allQuestions.filter((q) => q.era === era).length;
    const label = document.createElement("label");
    label.className = "chip";
    label.innerHTML = `<input type="checkbox" value="${era}" checked><span>${era} (${count})</span>`;
    container.appendChild(label);
  }
}

function setAllEras(checked) {
  document.querySelectorAll("#era-filters input").forEach((input) => {
    input.checked = checked;
  });
}

function startFromFilters() {
  const eras = new Set(
    [...document.querySelectorAll("#era-filters input:checked")].map((input) => input.value)
  );
  const pool = shuffle(allQuestions.filter((q) => eras.has(q.era)));
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
  showScreen("quiz");
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
  $("#topic-tag").textContent = q.topic;
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

  $("#feedback").hidden = true;
  $("#next-btn").hidden = true;
}

function choose(picked) {
  if (state.answered) return;
  state.answered = true;

  const q = state.queue[state.index];
  const isCorrect = picked === q.answer;
  const buttons = document.querySelectorAll(".choice-btn");
  const wrongIds = loadWrongIds();

  buttons.forEach((btn, i) => {
    btn.disabled = true;
    if (i === q.answer) btn.classList.add("correct");
    else if (i === picked) btn.classList.add("wrong");
  });

  if (isCorrect) {
    state.score++;
    wrongIds.delete(q.id);
  } else {
    state.wrong.push({ question: q, picked });
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

  $("#retry-wrong-btn").hidden = state.wrong.length === 0;

  const review = $("#review");
  review.innerHTML = "";
  for (const { question: q, picked } of state.wrong) {
    const item = document.createElement("div");
    item.className = "review-item";
    item.innerHTML = `
      <h3></h3>
      <p class="review-mine"></p>
      <p class="review-answer"></p>
      <p class="review-explain"></p>`;
    item.querySelector("h3").textContent = `[${q.era}] ${q.question}`;
    item.querySelector(".review-mine").textContent = `내 답: ${CIRCLED[picked]} ${q.choices[picked]}`;
    item.querySelector(".review-answer").textContent = `정답: ${CIRCLED[q.answer]} ${q.choices[q.answer]}`;
    item.querySelector(".review-explain").textContent = q.explanation;
    review.appendChild(item);
  }

  updateWrongNote();
  showScreen("result");
}

/* ---------- 이벤트 ---------- */

$("#start-btn").addEventListener("click", startFromFilters);
$("#select-all-btn").addEventListener("click", () => setAllEras(true));
$("#select-none-btn").addEventListener("click", () => setAllEras(false));
$("#wrong-only-btn").addEventListener("click", startWrongOnly);
$("#clear-wrong-btn").addEventListener("click", () => {
  saveWrongIds(new Set());
  updateWrongNote();
});
$("#next-btn").addEventListener("click", next);
$("#quit-btn").addEventListener("click", () => {
  updateWrongNote();
  showScreen("start");
});
$("#retry-wrong-btn").addEventListener("click", () => {
  startQuiz(shuffle(state.wrong.map((w) => w.question)));
});
$("#home-btn").addEventListener("click", () => showScreen("start"));

// 키보드: 1~5로 선택, Enter로 다음 문제
document.addEventListener("keydown", (e) => {
  if ($("#quiz-screen").hidden) return;
  const n = Number(e.key);
  if (!state.answered && n >= 1 && n <= state.queue[state.index].choices.length) {
    choose(n - 1);
  }
});

/* ---------- 초기화 ---------- */

async function init() {
  try {
    const res = await fetch("data/questions.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    allQuestions = await res.json();
  } catch (err) {
    console.error(err);
    $("#load-error").hidden = false;
    return;
  }
  renderEraFilters();
  updateWrongNote();
  $("#start-btn").disabled = false;
}

init();
