/* =========================================================
   Bookmark Logic - ブックマーク追加（Chrome拡張機能版）
========================================================= */
import { state } from './state.js';
import { save } from './storage.js';
import { updateTagUI } from './ui-tag.js';
import { render } from './render.js';
import { normalizeUrl, fetchTitle, $ } from './utils.js';

export async function addBookmark() {
  const rawUrl = $("urlInput").value.trim();
  const inputTitle = $("titleInput").value.trim();
  const tagRaw = $("tagInput").value;

  if (!rawUrl) return alert("URLを入力してください");

  const normalized = normalizeUrl(rawUrl);
  if (!normalized) return alert("正しいURLを入力してください");

  const folder = new URL(normalized).hostname;

  if (!state.domainMap.has(folder)) {
    state.domainMap.set(folder, []);
    state.ui.foldState[folder] = true;
  }

  const list = state.domainMap.get(folder);
  const tags = tagRaw.split(",").map(t => t.trim()).filter(Boolean);

  // タイトル決定順：1. ユーザー入力 → 2. 自動取得 → 3. ドメイン名
  let title = inputTitle;
  if (!title) {
    title = await fetchTitle(normalized);
  }
  if (!title) {
    title = folder;
  }

  // 重複チェック
  if (list.some(item => item.url === normalized)) {
    alert("このURLはすでに登録されています");
    return;
  }

  list.push({ title, url: normalized, tags, added: state.meta.addedIndex++ });

  save();
  updateTagUI();
  render();

  // 入力クリア
  $("urlInput").value = $("titleInput").value = $("tagInput").value = "";
}

// 新機能：現在のタブを追加
export async function addCurrentTab() {
  if (!chrome.tabs) {
    alert('Chrome Tabs APIが利用できません');
    return;
  }

  try {
    // 現在のアクティブタブを取得
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab || !tab.url) {
      alert('タブ情報を取得できませんでした');
      return;
    }

    const normalized = normalizeUrl(tab.url);
    if (!normalized) {
      alert('このURLは追加できません');
      return;
    }

    const folder = new URL(normalized).hostname;

    if (!state.domainMap.has(folder)) {
      state.domainMap.set(folder, []);
      state.ui.foldState[folder] = true;
    }

    const list = state.domainMap.get(folder);

    // 重複チェック
    if (list.some(item => item.url === normalized)) {
      alert("このURLはすでに登録されています");
      return;
    }

    // タブのタイトルを使用
    const title = tab.title || folder;
    const tags = [];

    list.push({ title, url: normalized, tags, added: state.meta.addedIndex++ });

    save();
    updateTagUI();
    render();

    alert(`「${title}」を追加しました`);
  } catch (error) {
    console.error('Error adding current tab:', error);
    alert('タブの追加に失敗しました');
  }
}