/* =========================================================
   State - アプリ全体の状態をここに集中管理
========================================================= */
export const STORAGE_KEY = "bookmarkJSON";

export const state = {
  domainMap: new Map(),          // domain → [bookmarks]
  meta: { addedIndex: 0 },
  ui: {
    selected: null,
    foldState: {},
    favorite: {},
    recentTags: [],
    showEmptyFolder: true,
    lastSelected: null,
    viewMode: "grid",             // grid / list
    headerHidden: false,  // ← これだけ追加
    headerCompact: false  // ← 追加（スクロールで隠した状態を記憶）
  }
};