/* =========================================================
   Storage - localStorage + Chrome Storage API 両対応（修正版）
========================================================= */
import { state, STORAGE_KEY } from './state.js';
import { render } from './render.js';
import { updateTagUI } from './ui-tag.js';

// Chrome Storage が使えるかチェック
function isChromeStorageAvailable() {
  return typeof chrome !== 'undefined' && 
         chrome.storage && 
         chrome.storage.local;
}

// 保存（両方に保存）
export function save() {
  const data = {
    meta: state.meta,
    ui: state.ui,
    data: Object.fromEntries(state.domainMap)
  };
  
  // localStorage に保存
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    console.log('✓ localStorage保存完了');
  } catch (e) {
    console.error('✗ localStorage保存失敗:', e);
  }
  
  // Chrome Storage にも保存
  if (isChromeStorageAvailable()) {
    chrome.storage.local.set({ [STORAGE_KEY]: data }).then(() => {
      console.log('✓ Chrome storage保存完了');
    }).catch(error => {
      console.error('✗ Chrome storage保存失敗:', error);
    });
  } else {
    console.log('Chrome storage利用不可（通常のWebページとして動作中）');
  }
}

// 読み込み（優先順：Chrome Storage → localStorage → なし）
export async function load() {
  console.log('=== データ読み込み開始 ===');
  
  // まずlocalStorageを確認
  const localData = loadFromLocalStorage();
  console.log('localStorage確認:', localData ? `${Object.keys(localData.data || {}).length}個のドメイン, ${Object.values(localData.data || {}).reduce((sum, arr) => sum + arr.length, 0)}個のブックマーク` : 'データなし');
  
  // Chrome Storage が使えるか確認
  if (isChromeStorageAvailable()) {
    try {
      const result = await chrome.storage.local.get([STORAGE_KEY]);
      const chromeData = result[STORAGE_KEY];
      console.log('Chrome storage確認:', chromeData ? `${Object.keys(chromeData.data || {}).length}個のドメイン, ${Object.values(chromeData.data || {}).reduce((sum, arr) => sum + arr.length, 0)}個のブックマーク` : 'データなし');
      
      // どちらのデータを使うか判定
      let dataToUse = null;
      
      if (chromeData && localData) {
        // 両方ある場合：ブックマーク数で判定
        const chromeCount = Object.values(chromeData.data || {}).reduce((sum, arr) => sum + arr.length, 0);
        const localCount = Object.values(localData.data || {}).reduce((sum, arr) => sum + arr.length, 0);
        
        if (localCount > chromeCount) {
          console.log(`→ localStorageの方が多い（${localCount} vs ${chromeCount}）（移行します）`);
          dataToUse = localData;
          // Chrome Storageに上書き保存
          await chrome.storage.local.set({ [STORAGE_KEY]: localData });
          console.log('✓ localStorageからChrome storageへ移行完了');
        } else {
          console.log(`→ Chrome storageのデータを使用（${chromeCount} >= ${localCount}）`);
          dataToUse = chromeData;
        }
      } else if (chromeData) {
        console.log('→ Chrome storageのデータを使用');
        dataToUse = chromeData;
      } else if (localData) {
        console.log('→ localStorageからデータを移行');
        dataToUse = localData;
        // Chrome Storageに保存
        await chrome.storage.local.set({ [STORAGE_KEY]: localData });
        console.log('✓ localStorageからChrome storageへ移行完了');
      }
      
      if (dataToUse) {
        applyLoadedData(dataToUse);
        console.log('=== データ適用完了 ===');
      } else {
        console.log('=== 新規起動（データなし） ===');
      }
    } catch (error) {
      console.error('Chrome storage読み込みエラー:', error);
      // エラーの場合はlocalStorageフォールバック
      if (localData) {
        console.log('→ localStorageをフォールバックとして使用');
        applyLoadedData(localData);
        console.log('=== データ適用完了 ===');
      }
    }
  } else {
    // Chrome Storage が使えない場合は localStorage のみ
    console.log('Chrome storage利用不可（通常のWebページとして動作中）、localStorageのみ使用');
    if (localData) {
      applyLoadedData(localData);
      console.log('=== データ適用完了 ===');
    } else {
      console.log('=== 新規起動（データなし） ===');
    }
  }
}

// localStorage から読み込み（内部用）
function loadFromLocalStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed;
    }
  } catch (e) {
    console.error('localStorage読み込みエラー:', e);
  }
  return null;
}

// 読み込んだデータを state に適用
function applyLoadedData(o) {
  state.meta = o.meta || state.meta;
  state.ui = { ...state.ui, ...o.ui };
  state.domainMap = new Map(Object.entries(o.data || {}));

  // すべてのドメインのfoldStateをチェック：未定義ならデフォルトtrue（開）
  state.domainMap.forEach((_, domain) => {
    if (state.ui.foldState[domain] === undefined) {
      state.ui.foldState[domain] = true;
    }
  });
  
  const bookmarkCount = Array.from(state.domainMap.values()).reduce((sum, arr) => sum + arr.length, 0);
  console.log('state適用結果:', {
    domains: state.domainMap.size,
    bookmarks: bookmarkCount
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
  a.download = "bookmarks_data.json";
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

// Chrome ブックマークから同期
export async function syncFromChrome() {
  if (!chrome.bookmarks) {
    alert('Chrome Bookmarks APIが利用できません');
    return;
  }

  const tree = await chrome.bookmarks.getTree();
  let count = 0;

  function traverse(nodes) {
    nodes.forEach(node => {
      if (node.url) {
        const normalized = normalizeUrl(node.url);
        if (!normalized) return;
        
        try {
          const folder = new URL(normalized).hostname;
          
          if (!state.domainMap.has(folder)) {
            state.domainMap.set(folder, []);
            state.ui.foldState[folder] = true;
          }

          const list = state.domainMap.get(folder);
          if (!list.some(item => item.url === normalized)) {
            list.push({ 
              title: node.title || folder, 
              url: normalized, 
              tags: [], 
              added: state.meta.addedIndex++ 
            });
            count++;
          }
        } catch (e) {
          console.warn('Invalid URL:', node.url);
        }
      }
      
      if (node.children) {
        traverse(node.children);
      }
    });
  }

  traverse(tree);
  save();
  updateTagUI();
  render();
  alert(`${count} 件のブックマークをChromeから同期しました`);
}

import { normalizeUrl } from './utils.js';