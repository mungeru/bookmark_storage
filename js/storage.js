/* =========================================================
   Storage - 保存・読み込み・入出力
========================================================= */
import { state, STORAGE_KEY } from './state.js';
import { render } from './render.js';
import { updateTagUI } from './ui-tag.js';

export function save() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      meta: state.meta,
      ui: state.ui,
      data: Object.fromEntries(state.domainMap)
    })
  );
}

export function load() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;

  const o = JSON.parse(raw);
  state.meta = o.meta || state.meta;
  state.ui = { ...state.ui, ...o.ui };
  state.domainMap = new Map(Object.entries(o.data || {}));

  // すべてのドメインのfoldStateをチェック：未定義ならデフォルトtrue（開）
  state.domainMap.forEach((_, domain) => {
    if (state.ui.foldState[domain] === undefined) {
      state.ui.foldState[domain] = true;
    }
  });
}

export function exportJSON() {
  const data = {
    meta: state.meta,
    ui: state.ui,
    data: Object.fromEntries(state.domainMap)
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "data.json";
  a.click();
  URL.revokeObjectURL(url);
}

export function importJSON(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const o = JSON.parse(e.target.result);
      state.meta = o.meta || state.meta;
      state.ui = { ...state.ui, ...o.ui };
      state.domainMap = new Map(Object.entries(o.data || {}));
      save();
      updateTagUI();
      render();
      alert("インポートが完了しました");
    } catch {
      alert("JSONの解析に失敗しました");
    }
  };
  reader.readAsText(file);
}

export function importBrowserHTML(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(e.target.result, "text/html");
    const links = doc.querySelectorAll("a");
    let count = 0;

    links.forEach(link => {
      const url = link.href;
      const title = link.textContent || "No Title";
      const normalized = normalizeUrl(url);
      if (!normalized) return;
      const folder = new URL(normalized).hostname;

      if (!state.domainMap.has(folder)) {
        state.domainMap.set(folder, []);
        state.ui.foldState[folder] = true;
      }

      const list = state.domainMap.get(folder);
      if (!list.some(item => item.url === normalized)) {
        list.push({ title, url: normalized, tags: [], added: state.meta.addedIndex++ });
        count++;
      }
    });

    save();
    updateTagUI();
    render();
    alert(`${count} 件のブックマークを取り込みました`);
  };
  reader.readAsText(file);
}

import { normalizeUrl } from './utils.js';