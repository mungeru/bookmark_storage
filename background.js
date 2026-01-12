/* =========================================================
   Background Service Worker - 別タブで開く機能 + 右クリックメニュー
========================================================= */

// コマンド（ショートカットキー）のリスナー
chrome.commands.onCommand.addListener((command) => {
  if (command === "open-in-tab") {
    openInNewTab();
  }
});

// 新しいタブで開く関数
function openInNewTab() {
  chrome.tabs.create({
    url: chrome.runtime.getURL('popup.html')
  });
}

// インストール時に右クリックメニューを作成
chrome.runtime.onInstalled.addListener(() => {
  // 拡張機能アイコンの右クリックメニュー
  chrome.contextMenus.create({
    id: 'open-in-tab',
    title: '別タブでブックマークマネージャーを開く',
    contexts: ['action']
  });
  
  // ページ上での右クリックメニュー（現在のタブを追加）
  chrome.contextMenus.create({
    id: 'add-current-page',
    title: '📌 このページをブックマークに追加',
    contexts: ['page', 'link']
  });
  
  // リンク専用の右クリックメニュー
  chrome.contextMenus.create({
    id: 'add-link',
    title: '🔗 このリンクをブックマークに追加',
    contexts: ['link']
  });
});

// 右クリックメニューのクリックリスナー
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'open-in-tab') {
    openInNewTab();
  } 
  else if (info.menuItemId === 'add-current-page') {
    // 現在のページを追加
    await addBookmarkToStorage(tab.url, tab.title);
    // 通知を表示
    showNotification('ブックマーク追加', `「${tab.title}」を追加しました`);
  }
  else if (info.menuItemId === 'add-link') {
    // リンクを追加
    await addBookmarkToStorage(info.linkUrl, info.linkUrl);
    showNotification('ブックマーク追加', `リンクを追加しました`);
  }
});

// ブックマークをストレージに追加する関数
async function addBookmarkToStorage(url, title) {
  const STORAGE_KEY = 'bookmarkJSON';
  
  try {
    // URLを正規化
    const normalized = normalizeUrl(url);
    if (!normalized) return;
    
    const domain = new URL(normalized).hostname;
    
    // 現在のデータを取得
    const result = await chrome.storage.local.get([STORAGE_KEY]);
    const data = result[STORAGE_KEY] || { meta: { addedIndex: 0 }, ui: {}, data: {} };
    
    // ドメインが存在しない場合は作成
    if (!data.data[domain]) {
      data.data[domain] = [];
      if (!data.ui.foldState) data.ui.foldState = {};
      data.ui.foldState[domain] = true;
    }
    
    // 重複チェック
    const exists = data.data[domain].some(item => item.url === normalized);
    if (exists) {
      showNotification('既に登録済み', 'このURLは既に登録されています');
      return;
    }
    
    // ブックマークを追加
    data.data[domain].push({
      title: title || domain,
      url: normalized,
      tags: [],
      added: data.meta.addedIndex++
    });
    
    // 保存
    await chrome.storage.local.set({ [STORAGE_KEY]: data });
    
  } catch (error) {
    console.error('ブックマーク追加エラー:', error);
    showNotification('エラー', 'ブックマークの追加に失敗しました');
  }
}

// URL正規化関数
function normalizeUrl(url) {
  try {
    const u = new URL(url.trim());
    u.hash = "";
    if (u.pathname !== "/") u.pathname = u.pathname.replace(/\/$/, "");
    return u.toString();
  } catch {
    return null;
  }
}

// 通知を表示
function showNotification(title, message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title: title,
    message: message
  });
}