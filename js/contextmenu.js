/* =========================================================
   Context Menu System
========================================================= */
import { state } from './state.js';
import { save } from './storage.js';
import { render } from './render.js';
import { updateTagUI } from './ui-tag.js';
import { normalizeUrl, $ } from './utils.js';

let touchTimer;

export function openMenu(x, y, type, data) {
  const menu = $("contextMenu");
  state.ui.selected = { type, data };

  menu.style.display = "block";

  const menuWidth = menu.offsetWidth;
  const menuHeight = menu.offsetHeight;
  const winW = window.innerWidth;
  const winH = window.innerHeight;

  let finalX = x + 2;
  let finalY = y + 2;

  if (finalX + menuWidth > winW + window.scrollX) finalX = x - menuWidth - 2;
  if (finalY + menuHeight > winH + window.scrollY) finalY = y - menuHeight - 2;

  menu.style.left = `${finalX}px`;
  menu.style.top = `${finalY}px`;

  const isItem = (type === 'item');
  $("cmRenameFolder").style.display = (type === 'folder') ? 'block' : 'none';
  $("cmAddFolder").style.display   = (type === 'folder') ? 'block' : 'none';
  $("cmEditUrl").style.display     = isItem ? 'block' : 'none';
  $("cmEditTitle").style.display   = isItem ? 'block' : 'none';
  $("cmCopyUrl").style.display     = isItem ? 'block' : 'none';
  $("cmEditTag").style.display     = isItem ? 'block' : 'none';
  $("cmMoveBookmark").style.display = isItem ? 'block' : 'none';
}

export function bindMenuEvents(el, type, data) {
  el.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    openMenu(e.pageX, e.pageY, type, data);
  });

  el.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    touchTimer = setTimeout(() => {
      openMenu(t.pageX, t.pageY, type, data);
    }, 600);
  }, { passive: true });

  el.addEventListener('touchend', () => clearTimeout(touchTimer));
  el.addEventListener('touchmove', () => clearTimeout(touchTimer));
}

/* =========================================================
   Context Menu Actions - 右クリックメニューの各項目の処理
========================================================= */

// URLコピー
$("cmCopyUrl").onclick = () => {
  const { data } = state.ui.selected;
  if (data?.url) {
    navigator.clipboard.writeText(data.url);
    alert("URLをコピーしました");
  }
  $("contextMenu").style.display = "none";
};

// 削除（フォルダ or ブックマーク）
$("cmDelete").onclick = () => {
  if (!confirm("本当に削除しますか？")) return;

  const { type, data } = state.ui.selected;

  if (type === "folder") {
    state.domainMap.delete(data.domain);
  } else if (type === "item") {
    const list = state.domainMap.get(data.domain);
    if (list) {
      const newList = list.filter(item => item.url !== data.url);
      state.domainMap.set(data.domain, newList);
    }
  }

  save();
  render();
  $("contextMenu").style.display = "none";
};

// 新しいフォルダ追加
$("cmAddFolder").onclick = () => {
  const name = prompt("新しいフォルダ名を入力してください（ドメイン名推奨）");
  if (!name || name.trim() === "") return;
  const trimmed = name.trim();

  if (state.domainMap.has(trimmed)) {
    alert("そのフォルダはすでに存在します");
    return;
  }

  state.domainMap.set(trimmed, []);
  state.ui.foldState[trimmed] = true;
  save();
  render();
  $("contextMenu").style.display = "none";
};

// フォルダ名変更
$("cmRenameFolder").onclick = () => {
  const { data } = state.ui.selected;
  if (state.ui.selected?.type !== "folder") return;

  const newName = prompt("新しいフォルダ名を入力", data.domain);
  if (!newName || newName.trim() === "" || newName.trim() === data.domain) return;
  const trimmed = newName.trim();

  if (state.domainMap.has(trimmed)) {
    alert("その名前はすでに使われています");
    return;
  }

  const items = state.domainMap.get(data.domain);
  state.domainMap.delete(data.domain);
  state.domainMap.set(trimmed, items);

  // foldState と favorite も移行
  if (state.ui.foldState[data.domain] !== undefined) {
    state.ui.foldState[trimmed] = state.ui.foldState[data.domain];
    delete state.ui.foldState[data.domain];
  }
  if (state.ui.favorite[data.domain] !== undefined) {
    state.ui.favorite[trimmed] = state.ui.favorite[data.domain];
    delete state.ui.favorite[data.domain];
  }

  save();
  render();
  $("contextMenu").style.display = "none";
};

// ブックマークを別フォルダへ移動
$("cmMoveBookmark").onclick = () => {
  const { type, data } = state.ui.selected;
  if (type !== "item") return;

  const currentDomain = data.domain;
  const item = data.item;

  const targetDomain = prompt("移動先のフォルダ名を入力", "");
  if (!targetDomain || targetDomain.trim() === "") return;
  const trimmed = targetDomain.trim();

  if (trimmed === currentDomain) return;

  // 移動先フォルダ作成
  if (!state.domainMap.has(trimmed)) {
    state.domainMap.set(trimmed, []);
    state.ui.foldState[trimmed] = true;
  }

  // 元フォルダから削除
  const currentList = state.domainMap.get(currentDomain);
  const newCurrentList = currentList.filter(i => i.url !== item.url);
  state.domainMap.set(currentDomain, newCurrentList);

  // 移動先に追加
  state.domainMap.get(trimmed).push(item);

  save();
  render();
  $("contextMenu").style.display = "none";
};

// 題名を編集
$("cmEditTitle").onclick = () => {
  const { type, data } = state.ui.selected;
  if (type !== "item") return;

  const newTitle = prompt("新しい題名を入力", data.item.title);
  if (newTitle === null || newTitle.trim() === "") return;

  data.item.title = newTitle.trim();

  save();
  render();
  $("contextMenu").style.display = "none";
};

// URL編集（上級者向け）
$("cmEditUrl").onclick = () => {
  const { type, data } = state.ui.selected;
  if (type !== "item") return;

  const newUrl = prompt("新しいURLを入力", data.item.url);
  if (!newUrl || !normalizeUrl(newUrl)) {
    alert("有効なURLを入力してください");
    return;
  }

  const normalized = normalizeUrl(newUrl);
  const newDomain = new URL(normalized).hostname;

  // ドメインが変わる場合は移動処理が必要
  if (newDomain !== data.domain) {
    // 元から削除
    const currentList = state.domainMap.get(data.domain);
    const filtered = currentList.filter(i => i.url !== data.url);
    state.domainMap.set(data.domain, filtered);

    // 新ドメインに追加
    if (!state.domainMap.has(newDomain)) {
      state.domainMap.set(newDomain, []);
      state.ui.foldState[newDomain] = true;
    }
    data.item.url = normalized;
    state.domainMap.get(newDomain).push(data.item);
  } else {
    data.item.url = normalized;
  }

  save();
  render();
  $("contextMenu").style.display = "none";
};

// タグ編集（カンマ区切りで複数入力可能）
$("cmEditTag").onclick = () => {
  const { type, data } = state.ui.selected;
  if (type !== "item") return;

  const currentTags = (data.item.tags || []).join(", ");
  const newTagsInput = prompt("タグを入力（カンマ区切りで複数可）", currentTags);
  if (newTagsInput === null) return;

  const newTags = newTagsInput.split(",").map(t => t.trim()).filter(Boolean);
  data.item.tags = newTags;

  save();
  updateTagUI();
  render();
  $("contextMenu").style.display = "none";
};

// 空フォルダ表示切替
$("cmToggleEmpty").onclick = () => {
  state.ui.showEmptyFolder = !state.ui.showEmptyFolder;
  save();
  render();
  $("contextMenu").style.display = "none";
};