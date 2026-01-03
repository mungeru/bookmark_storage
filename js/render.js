/* =========================================================
   Render - 画面描画の心臓部
========================================================= */
import { state } from './state.js';
import { getFavicon, getThumbnail, $ } from './utils.js';
import { bindMenuEvents } from './contextmenu.js';

export function render() {
  const container = $("container");
  container.innerHTML = "";

  const kw = $("searchInput").value.toLowerCase();
  const tag = $("tagSelect").value;

  let total = 0, visible = 0;

  // ソートモード取得（sortSelect が存在しなければデフォルト）
  const sortMode = $("sortSelect")?.value || "added";

  // ドメインリストをソート
  [...state.domainMap.keys()].sort((a, b) => {
    // お気に入り優先（addedモードのみ）
    if (sortMode === "added") {
      if (!!state.ui.favorite[a] !== !!state.ui.favorite[b]) {
        return state.ui.favorite[a] ? -1 : 1;
      }
    }

    // どちらのモードでも最終的にはドメイン名（アルファベット）順
    return a.localeCompare(b);
  })
    .forEach(domain => {
      const items = state.domainMap.get(domain);
      total += items.length;

      const list = items.filter(v =>
        (!kw || v.title.toLowerCase().includes(kw)) &&
        (!tag || (v.tags || []).includes(tag))
      );

      if (!list.length && (kw || tag)) return;
      visible += list.length;

      const section = document.createElement("div");
      section.className = "section";

      const header = document.createElement("h2");
      header.innerHTML = `
        <span class="favicon-wrap"><img src="${getFavicon(domain)}"></span>
        <span>${domain} (${list.length})</span>
        <span class="star ${state.ui.favorite[domain] ? 'active' : ''}">★</span>
        <span class="toggle-arrow">${state.ui.foldState[domain] === false ? '▼' : '▲'}</span>`;

      header.onclick = (e) => {
        if (e.target.classList.contains('star')) {
          state.ui.favorite[domain] = !state.ui.favorite[domain];
          save();
          render();
          return;
        }

        // 開閉トグル
        const currentlyOpen = state.ui.foldState[domain] !== false;  // デフォルトtrue（開）
        state.ui.foldState[domain] = !currentlyOpen;

        const ul = section.querySelector(".list");
        ul.style.display = state.ui.foldState[domain] ? "grid" : "none";

        save();  // 即保存
      };

      bindMenuEvents(header, 'folder', { domain });

      const ul = document.createElement("div");
      ul.className = "list";
      if (state.ui.viewMode === "list") {
        ul.classList.add("single");
      }
      ul.style.display = state.ui.foldState[domain] === false ? "none" : "grid";

      list.forEach(v => {
        const item = document.createElement("div");
        item.className = "item";
        item.innerHTML = `
          <div class="thumb-wrap ${getThumbnail(v.url) ? "" : "empty"}">
            <img src="${getThumbnail(v.url)}" loading="lazy">
          </div>
          <div class="info">
            <a href="${v.url}" target="_blank">${v.title}</a>
            <div class="domain">${v.url}</div>
          </div>`;
        bindMenuEvents(item, 'item', { domain, url: v.url, item: v });
        ul.appendChild(item);
      });

      section.append(header, ul);
      container.appendChild(section);
    });

  $("countInfo").textContent = `表示 ${visible} / 全体 ${total}`;
}

import { save } from './storage.js';