/* =========================================================
   Main - 起動とイベント登録の総まとめ
========================================================= */
import { load, save } from './storage.js';
import { render } from './render.js';
import { updateTagUI } from './ui-tag.js';
import { addBookmark } from './bookmark.js';
import { $ } from './utils.js';
import { state } from './state.js';

// 起動処理
load();
updateTagUI();

// viewToggleBtn の初期テキスト設定（load後に一度だけ）
const viewBtn = $("viewToggleBtn");
if (viewBtn) {
  viewBtn.textContent = "表示: " + (state.ui.viewMode === "grid" ? "グリッド" : "縦並び");
}

render();

// イベント登録
$("addBtn").onclick = addBookmark;
$("searchInput").oninput = render;
$("tagSelect").onchange = render;
$("sortSelect").onchange = render;
$("exportBtn").onclick = () => exportJSON();

$("importFile").onchange = e => importJSON(e.target.files[0]);
$("importBrowserFile").onchange = e => importBrowserHTML(e.target.files[0]);

$("tagInput").oninput = e =>
  updateTagSuggestions(e.target.value.split(",").at(-1)?.trim() || "");

// viewToggleBtn のテキストをより明確に
viewBtn.textContent = state.ui.viewMode === "grid" ? "表示: リスト" : "表示: グリッド";

viewBtn.onclick = () => {
  state.ui.viewMode = state.ui.viewMode === "grid" ? "list" : "grid";
  viewBtn.textContent = state.ui.viewMode === "grid" ? "表示: リスト" : "表示: グリッド";
  save();
  render();
};

window.addEventListener("click", (e) => {
  const menu = $("contextMenu");
  if (menu && menu.style.display === "block" && !menu.contains(e.target)) {
    menu.style.display = "none";
  }
});

// ヘッダー開閉トグル（CSS変更なしでtransformだけ使う）
const header = document.querySelector('header');
const headerToggleBtn = $("headerToggleBtn");

if (header && headerToggleBtn) {
  // 保存された状態を復元
  if (state.ui.headerHidden) {
    header.style.transform = 'translateY(-100%)';
    header.style.transition = 'transform 0.3s ease';
    headerToggleBtn.textContent = '▲ 操作パネルを表示';
  }

  headerToggleBtn.onclick = () => {
    if (header.style.transform === 'translateY(-100%)') {
      header.style.transform = 'translateY(0)';
      headerToggleBtn.textContent = '▼ 操作パネルを隠す';
      state.ui.headerHidden = false;
    } else {
      header.style.transform = 'translateY(-100%)';
      headerToggleBtn.textContent = '▲ 操作パネルを表示';
      state.ui.headerHidden = true;
    }
    save();
  };
}

// スクロールでヘッダー隠し（検索欄は残る）
let lastScrollY = window.scrollY;
let ticking = false;

function updateHeaderOnScroll() {
  const currentScrollY = window.scrollY;
  const header = document.querySelector('header');
  const controls = document.querySelector('.controls');

  if (currentScrollY > lastScrollY && currentScrollY > 100) {
    // 下スクロール → ヘッダー隠す
    header.classList.add('hidden');
    document.body.classList.add('header-compact');
    state.ui.headerCompact = true;
  } else if (currentScrollY < lastScrollY) {
    // 上スクロール → ヘッダー表示
    header.classList.remove('hidden');
    document.body.classList.remove('header-compact');
    state.ui.headerCompact = false;
  }

  lastScrollY = currentScrollY;
  ticking = false;
  save();
}

window.addEventListener('scroll', () => {
  if (!ticking) {
    requestAnimationFrame(updateHeaderOnScroll);
    ticking = true;
  }
});

// 起動時に状態復元
if (state.ui.headerCompact) {
  document.querySelector('header').classList.add('hidden');
  document.body.classList.add('header-compact');
}

import { exportJSON, importJSON, importBrowserHTML } from './storage.js';
import { updateTagSuggestions } from './ui-tag.js';