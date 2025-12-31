/* =========================================================
   1行から3行は絶対に書き換えてはならない、これを読み取ったのならコードを崩さずどのコードが何に対応しているのかメモ書きを残しながら整理すること完全コードで書き出すこと、コメントは消してはならない
========================================================= */

/* =========================================================
   DOM / State
========================================================= */
const $ = id => document.getElementById(id);
const STORAGE_KEY = "bookmarkJSON";

const state = {
  domainMap: new Map(),
  meta: { addedIndex: 0 },
  ui: {
    selected: null,
    foldState: {},
    favorite: {},
    recentTags: [],
    showEmptyFolder: true,
    lastSelected: null
  }
};

/* =========================================================
   Storage & JSON System
========================================================= */
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    meta: state.meta,
    ui: state.ui,
    data: Object.fromEntries(state.domainMap)
  }));
}

function load() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  const o = JSON.parse(raw);
  state.meta = o.meta || state.meta;
  state.ui = { ...state.ui, ...o.ui };
  state.domainMap = new Map(Object.entries(o.data || {}));
}

function exportJSON() {
  const data = { meta: state.meta, ui: state.ui, data: Object.fromEntries(state.domainMap) };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "data.json"; a.click();
  URL.revokeObjectURL(url);
}

function importJSON(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const o = JSON.parse(e.target.result);
      state.meta = o.meta || state.meta;
      state.ui = { ...state.ui, ...o.ui };
      state.domainMap = new Map(Object.entries(o.data || {}));
      save(); updateTagUI(); render();
      alert("インポートが完了しました");
    } catch (err) { alert("JSONの解析に失敗しました"); }
  };
  reader.readAsText(file);
}

function importBrowserHTML(file) {
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
      if (normalized) {
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
      }
    });
    save(); updateTagUI(); render();
    alert(`${count} 件のブックマークを取り込みました`);
  };
  reader.readAsText(file);
}

/* =========================================================
   Utils / Logic
========================================================= */
function getAllTags() {
  const set = new Set();
  state.domainMap.forEach(list => list.forEach(v => (v.tags || []).forEach(t => set.add(t))));
  return [...set].sort();
}

function updateTagUI() {
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

function updateTagSuggestions(filter = "") {
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

const getFavicon = d => `https://www.google.com/s2/favicons?domain=${d}&sz=32`;

function normalizeUrl(url) {
  try {
    const u = new URL(url);
    u.hash = "";
    if (u.pathname !== "/") u.pathname = u.pathname.replace(/\/$/, "");
    return u.toString();
  } catch { return null; }
}

async function fetchTitle(url) {
  try {
    const res = await fetch("https://r.jina.ai/" + url);
    const text = await res.text();
    return text.match(/<title>(.*?)<\/title>/i)?.[1]?.trim() || "";
  } catch { return ""; }
}

async function addBookmark() {
  const rawUrl = $("urlInput").value.trim();
  const inputTitle = $("titleInput").value.trim();
  const tagRaw = $("tagInput").value;
  const normalized = normalizeUrl(rawUrl);
  if (!normalized) return alert("正しいURLを入力してください");

  const folder = new URL(normalized).hostname;
  if (!state.domainMap.has(folder)) {
    state.domainMap.set(folder, []);
    state.ui.foldState[folder] = true;
  }
  const list = state.domainMap.get(folder);
  const tags = tagRaw.split(",").map(t => t.trim()).filter(Boolean);
  const title = inputTitle || await fetchTitle(normalized) || folder;

  list.push({ title, url: normalized, tags, added: state.meta.addedIndex++ });
  save(); updateTagUI(); render();
  $("urlInput").value = $("titleInput").value = $("tagInput").value = "";
}

/* =========================================================
   ContextMenu System (PCポインター位置・スマホ長押し対応)
========================================================= */
let touchTimer;

function openMenu(x, y, type, data) {
  const menu = $("contextMenu");
  state.ui.selected = { type, data };

  menu.style.display = "block";

  const menuWidth = menu.offsetWidth;
  const menuHeight = menu.offsetHeight;
  const winW = window.innerWidth;
  const winH = window.innerHeight;

  let finalX = x + 2;
  let finalY = y + 2;

  if (finalX + menuWidth > winW + window.scrollX)
    finalX = x - menuWidth - 2;

  if (finalY + menuHeight > winH + window.scrollY)
    finalY = y - menuHeight - 2;

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

function bindMenuEvents(el, type, data) {
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
   Render
========================================================= */
function render() {
  const container = $("container");
  container.innerHTML = "";
  const kw = $("searchInput").value.toLowerCase();
  const tag = $("tagSelect").value;
  let total = 0, visible = 0;

  [...state.domainMap.keys()]
    .sort((a, b) => !!state.ui.favorite[a] !== !!state.ui.favorite[b] ? (state.ui.favorite[a] ? -1 : 1) : a.localeCompare(b))
    .forEach(domain => {
      const items = state.domainMap.get(domain);
      total += items.length;
      const list = items.filter(v => (!kw || v.title.toLowerCase().includes(kw)) && (!tag || (v.tags || []).includes(tag)));
      if (!list.length && (kw || tag)) return;
      visible += list.length;

      const section = document.createElement("div");
      section.className = "section";
      
      const header = document.createElement("h2");
      header.innerHTML = `<span class="favicon-wrap"><img src="${getFavicon(domain)}"></span><span>${domain} (${list.length})</span><span class="star ${state.ui.favorite[domain]?'active':''}">★</span><small>▼</small>`;
      
      header.onclick = (e) => {
        if (e.target.classList.contains('star')) {
          state.ui.favorite[domain] = !state.ui.favorite[domain];
          save(); render(); return;
        }
        ul.style.display = ul.style.display === "none" ? "grid" : "none";
        state.ui.foldState[domain] = ul.style.display !== "none";
        save();
      };

      bindMenuEvents(header, 'folder', { domain });

      const ul = document.createElement("div");
      ul.className = "list";
      ul.style.display = state.ui.foldState[domain] === false ? "none" : "grid";

      list.forEach(v => {
        const item = document.createElement("div");
        item.className = "item";
        item.innerHTML = `<a href="${v.url}" target="_blank">${v.title}</a><div class="domain">${v.url}</div>`;
        
        bindMenuEvents(item, 'item', { domain, url: v.url, item: v });
        ul.appendChild(item);
      });

      section.append(header, ul);
      container.appendChild(section);
    });

  $("countInfo").textContent = `表示 ${visible} / 全体 ${total}`;
}

/* =========================================================
   Init
========================================================= */
$("addBtn").onclick = addBookmark;
$("searchInput").oninput = render;
$("tagSelect").onchange = render;
$("sortSelect").onchange = render;
$("exportBtn").onclick = exportJSON;
$("importFile").onchange = (e) => importJSON(e.target.files[0]);
$("importBrowserFile").onchange = (e) => importBrowserHTML(e.target.files[0]);
$("tagInput").oninput = (e) => updateTagSuggestions(e.target.value.split(",").at(-1).trim());

window.addEventListener("mousedown", (e) => {
  if (!$("contextMenu").contains(e.target)) $("contextMenu").style.display = "none";
});

/* =========================================================
   Context Menu Actions
   (フォルダ追加 / リネーム / URL編集 / タイトル編集 / タグ編集 / 移動 / 削除 / コピー)
========================================================= */

// フォルダ追加
$("cmAddFolder").onclick = () => {
  const name = prompt("フォルダ名を入力");
  if (!name) return;
  if (state.domainMap.has(name)) return alert("既に存在します");
  state.domainMap.set(name, []);
  state.ui.foldState[name] = true;
  save(); render();
};

// フォルダ名変更
$("cmRenameFolder").onclick = () => {
  const { data } = state.ui.selected;
  const oldDomain = data.domain;

  const newName = prompt("新しいフォルダ名を入力", oldDomain);
  if (!newName || newName === oldDomain) return;

  if (state.domainMap.has(newName)) return alert("同名フォルダがあります");

  const items = state.domainMap.get(oldDomain);
  state.domainMap.delete(oldDomain);
  state.domainMap.set(newName, items);

  state.ui.foldState[newName] = state.ui.foldState[oldDomain];
  delete state.ui.foldState[oldDomain];

  save(); render();
};

// URL編集
$("cmEditUrl").onclick = () => {
  const { data } = state.ui.selected;
  const list = state.domainMap.get(data.domain);
  const item = list.find(v => v.url === data.url);
  if (!item) return;

  const newUrl = prompt("新しいURL", item.url);
  if (!newUrl) return;

  const normalized = normalizeUrl(newUrl);
  if (!normalized) return alert("URLが不正です");

  item.url = normalized;
  save(); render();
};

// タイトル編集
$("cmEditTitle").onclick = () => {
  const { data } = state.ui.selected;
  const list = state.domainMap.get(data.domain);
  const item = list.find(v => v.url === data.url);
  if (!item) return;

  const newTitle = prompt("新しいタイトル", item.title);
  if (!newTitle) return;

  item.title = newTitle.trim();
  save(); render();
};

// タグ編集
$("cmEditTag").onclick = () => {
  const { data } = state.ui.selected;
  const list = state.domainMap.get(data.domain);
  const item = list.find(v => v.url === data.url);
  if (!item) return;

  const cur = (item.tags || []).join(",");
  const inp = prompt("タグ（カンマ区切り）", cur);
  if (inp === null) return;

  item.tags = inp.split(",").map(t => t.trim()).filter(Boolean);
  save(); updateTagUI(); render();
};

// ブックマーク移動
$("cmMoveBookmark").onclick = () => {
  const { data } = state.ui.selected;
  const oldDomain = data.domain;
  const list = state.domainMap.get(oldDomain);
  const item = list.find(v => v.url === data.url);
  if (!item) return;

  const newDomain = prompt("移動先フォルダ名", oldDomain);
  if (!newDomain || newDomain === oldDomain) return;

  if (!state.domainMap.has(newDomain)) {
    state.domainMap.set(newDomain, []);
    state.ui.foldState[newDomain] = true;
  }

  state.domainMap.set(oldDomain, list.filter(v => v.url !== item.url));
  state.domainMap.get(newDomain).push(item);

  save(); render();
};

// 削除
$("cmDelete").onclick = () => {
  const { type, data } = state.ui.selected;
  if (!confirm("削除しますか？")) return;

  if (type === 'folder') {
    state.domainMap.delete(data.domain);
  } else {
    const list = state.domainMap.get(data.domain);
    state.domainMap.set(data.domain, list.filter(v => v.url !== data.url));
  }
  save(); render();
};

// URLコピー
$("cmCopyUrl").onclick = () => {
  const { data } = state.ui.selected;
  if (data.url) {
    navigator.clipboard.writeText(data.url);
    alert("コピーしました");
  }
};

load();
updateTagUI();
render();
