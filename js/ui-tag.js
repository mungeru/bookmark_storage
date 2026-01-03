/* =========================================================
   UI Tag - タグ関連のUI更新専用
========================================================= */
import { state } from './state.js';
import { getAllTags, $ } from './utils.js';

export function updateTagUI() {
  const sel = $("tagSelect");
  const cur = sel.value;

  sel.innerHTML = `<option value="">タグ</option>`;
  getAllTags().forEach(t => {
    const o = document.createElement("option");
    o.value = o.textContent = t;
    sel.appendChild(o);
  });

  sel.value = cur;
}

export function updateTagSuggestions(filter = "") {
  const dl = $("tagSuggestions");
  if (!dl) return;

  dl.innerHTML = "";
  getAllTags()
    .filter(t => !filter || t.toLowerCase().includes(filter.toLowerCase()))
    .forEach(t => {
      const o = document.createElement("option");
      o.value = t;
      dl.appendChild(o);
    });
}