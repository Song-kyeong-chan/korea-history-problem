/* 탭 전환: 주소의 #해시와 마지막으로 연 탭을 기억한다 */
(() => {
  const TAB_KEY = "khp-tab";
  const tabs = $$('[role="tab"]');
  const names = tabs.map((tab) => tab.dataset.tab);

  function activate(name, { focus = false } = {}) {
    if (!names.includes(name)) name = names[0];
    for (const tab of tabs) {
      const on = tab.dataset.tab === name;
      tab.setAttribute("aria-selected", on);
      tab.tabIndex = on ? 0 : -1;
      $(`#panel-${tab.dataset.tab}`).hidden = !on;
      if (on && focus) tab.focus();
    }
    history.replaceState(null, "", `#${name}`);
    storage.set(TAB_KEY, name);
  }

  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => activate(tab.dataset.tab));
    tab.addEventListener("keydown", (e) => {
      const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (!step) return;
      e.preventDefault();
      activate(names[(i + step + names.length) % names.length], { focus: true });
    });
  });

  window.addEventListener("hashchange", () => activate(location.hash.slice(1)));
  activate(location.hash.slice(1) || storage.get(TAB_KEY, names[0]));
})();
