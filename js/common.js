/* 모든 퀴즈 모드에서 함께 쓰는 도구 */

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function shuffle(items) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// 저장소를 쓸 수 없는 환경(시크릿 모드 등)에서도 동작하도록 감싼다
const storage = {
  get(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : JSON.parse(value);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // 무시
    }
  },
};

const dataCache = {};
function loadData(name) {
  dataCache[name] ??= fetch(`data/${name}.json`).then((res) => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  });
  return dataCache[name];
}

/** 시대 선택 칩과 전체 선택/해제 버튼을 그린다. */
function createEraFilter(container, items) {
  const eras = [...new Set(items.map((item) => item.era))];
  container.innerHTML = `<div class="chips" role="group" aria-label="시대 선택"></div>
    <div class="row">
      <button type="button" class="text-btn" data-all="true">전체 선택</button>
      <button type="button" class="text-btn" data-all="false">전체 해제</button>
    </div>`;
  const chips = $(".chips", container);

  for (const era of eras) {
    const count = items.filter((item) => item.era === era).length;
    const label = document.createElement("label");
    label.className = "chip";
    label.innerHTML = `<input type="checkbox" checked><span></span>`;
    label.firstChild.value = era;
    label.lastChild.textContent = `${era} (${count})`;
    chips.appendChild(label);
  }

  $$("[data-all]", container).forEach((btn) => {
    btn.addEventListener("click", () => {
      $$("input", chips).forEach((input) => (input.checked = btn.dataset.all === "true"));
    });
  });

  return {
    pick: () => {
      const selected = new Set($$("input:checked", chips).map((input) => input.value));
      return items.filter((item) => selected.has(item.era));
    },
  };
}

function showOnly(screens, name) {
  for (const [key, el] of Object.entries(screens)) el.hidden = key !== name;
  window.scrollTo({ top: 0 });
}

// 패널이 숨겨져 있으면 offsetParent가 null이 된다
const isShown = (el) => el.offsetParent !== null;

const isTyping = (e) => ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName);

function showLoadError(panel, err) {
  console.error(err);
  $(".load-error", panel).hidden = false;
}

/** 결과 화면의 틀린 문제 목록 항목 */
function reviewItem({ title, mine, answer, explanation }) {
  const item = document.createElement("div");
  item.className = "review-item";
  item.innerHTML = `<h3></h3><p class="review-mine"></p><p class="review-answer"></p><p class="review-explain"></p>`;
  item.querySelector("h3").textContent = title;
  item.querySelector(".review-mine").textContent = mine;
  item.querySelector(".review-answer").textContent = answer;
  item.querySelector(".review-explain").textContent = explanation;
  if (!mine) item.querySelector(".review-mine").remove();
  return item;
}
