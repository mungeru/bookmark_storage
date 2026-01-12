/* =========================================================
   Main - 起動とイベント登録（Chrome拡張機能版・非同期対応）
========================================================= */
import { load, save, exportJSON, importJSON, importBrowserHTML, syncFromChrome } from './storage.js';
import { render } from './render.js';
import { updateTagUI, updateTagSuggestions } from './ui-tag.js';
import { addBookmark, addCurrentTab } from './bookmark.js';
import { $ } from './utils.js';
import { state } from './state.js';

// 起動処理（完全非同期対応）
async function init() {
  console.log('🚀 アプリ起動中...');
  
  // データ読み込みを待つ
  await load();
  
  console.log('📊 データ読み込み完了:', {
    domains: state.domainMap.size,
    bookmarks: Array.from(state.domainMap.values()).reduce((sum, arr) => sum + arr.length, 0)
  });
  
  // UIを更新
  updateTagUI();

  // viewToggleBtn の初期テキスト設定
  const viewBtn = $("viewToggleBtn");
  if (viewBtn) {
    viewBtn.textContent = "表示: " + (state.ui.viewMode === "grid" ? "リスト" : "グリッド");
  }

  // 画面描画
  render();
  
  console.log('✅ 初期化完了');
}

// 初期化実行
init().catch(error => {
  console.error('❌ 初期化エラー:', error);
});

// イベント登録
$("addBtn").onclick = addBookmark;
$("addCurrentBtn").onclick = addCurrentTab;
$("searchInput").oninput = render;
$("tagSelect").onchange = render;
$("sortSelect").onchange = render;
$("exportBtn").onclick = () => exportJSON();
$("syncChromeBtn").onclick = () => syncFromChrome();

$("importFile").onchange = e => importJSON(e.target.files[0]);
$("importBrowserFile").onchange = e => importBrowserHTML(e.target.files[0]);

$("tagInput").oninput = e =>
  updateTagSuggestions(e.target.value.split(",").at(-1)?.trim() || "");

// 表示切替ボタン
const viewBtn = $("viewToggleBtn");
viewBtn.onclick = () => {
  state.ui.viewMode = state.ui.viewMode === "grid" ? "list" : "grid";
  viewBtn.textContent = state.ui.viewMode === "grid" ? "表示: リスト" : "表示: グリッド";
  save();
  render();
};

// 右クリックメニューを閉じる
window.addEventListener("click", (e) => {
  const menu = $("contextMenu");
  if (menu && menu.style.display === "block" && !menu.contains(e.target)) {
    menu.style.display = "none";
  }
});

// ヘッダー開閉トグル
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
  document.querySelector('header')?.classList.add('hidden');
  document.body.classList.add('header-compact');
}