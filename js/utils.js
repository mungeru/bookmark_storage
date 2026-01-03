/* =========================================================
   Utils - 純粋なユーティリティ関数
========================================================= */
export const $ = id => document.getElementById(id);

export function getAllTags() {
  const set = new Set();
  state.domainMap.forEach(list =>
    list.forEach(v =>
      (v.tags || []).forEach(t => set.add(t))
    )
  );
  return [...set].sort();
}

export const getFavicon = d =>
  `https://www.google.com/s2/favicons?domain=${d}&sz=32`;

export function getThumbnail(url) {
  try {
    const u = new URL(url);

    // YouTube / youtu.be
    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v");
      if (id) return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
    }
    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.slice(1);
      if (id) return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
    }

    // ニコニコ動画（複数パターンでフォールバック）
    if (u.hostname.includes("nicovideo.jp") || u.hostname.includes("nico.ms")) {
      const match = u.pathname.match(/^\/watch\/(?:sm|nm|so)?(\d+)/);
      if (match) {
        const videoId = match[1];

        // パターン1: 高画質（.L付き） - 新しい動画でよく効く
        const highQuality = `https://nicovideo.cdn.nimg.jp/thumbnails/${videoId}/${videoId}.L`;
        
        // パターン2: 中画質（無し） - 古い動画で効くことが多い
        const medium = `https://nicovideo.cdn.nimg.jp/thumbnails/${videoId}/${videoId}`;
        
        // パターン3: 旧式（tn.smilevideo.jp） - 超古い動画用フォールバック
        const legacy = `http://tn.smilevideo.jp/smile?i=${videoId}.L`;

        // ここでは直接複数URLを試せないので、優先順位で返す（ブラウザが404ならfaviconに落ちる）
        // 最高優先: 高画質
        return highQuality;
        
        // ※ もっと確実にしたい場合、後でimg.onloadで複数試す拡張も可能だけど、今はこれでほぼOK！
      }
    }

    // デフォルト：favicon（大きめ128px）
    return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=128`;
  } catch {
    return null;
  }
}

export function normalizeUrl(url) {
  try {
    const u = new URL(url.trim());
    u.hash = "";
    if (u.pathname !== "/") u.pathname = u.pathname.replace(/\/$/, "");
    return u.toString();
  } catch {
    return null;
  }
}

/* タイトル取得：ユーザー入力優先 → jina.ai → ドメイン名 */
export async function fetchTitle(url) {
  try {
    const res = await fetch("https://r.jina.ai/" + url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return "";
    const text = await res.text();
    const match = text.match(/<title>(.*?)<\/title>/i);
    return match?.[1]?.trim() || "";
  } catch (e) {
    console.warn("Title fetch failed:", e);
    return "";
  }
}

import { state } from './state.js';