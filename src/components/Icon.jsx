// アイコンをsvgで管理するコンポーネント
import React from 'react';

// アイコン名(name)に応じたSVGを描画するコンポーネント
export default function Icon({ name, size = 18, className = '', strokeWidth = 2, title, ...rest }) {
  // 共通のSVGプロパティ
  const props = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg',
    className: `icon ${className}`.trim(),
    // アクセシビリティ対応
    'aria-hidden': title ? undefined : true,
    role: title ? 'img' : 'presentation',
    ...rest,
  };

  // 色はcurrentColorに依存
  const stroke = 'currentColor';
  const fill = 'currentColor';

  function path() {
    switch (name) {
      case 'search':
        // 検索アイコン
        return (
          <g stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="9" r="7" />
            <path d="M20 20l-6-6" />
          </g>
        );
      case 'close':
        // バツ印（クリアボタン用）
        return (
          <path d="M7 7l10 10M17 7 7 17" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        );
      case 'settings':
        // 設定の歯車アイコン
        return (
          <g stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="4" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09c0-.66-.38-1.26-1-1.51a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06c.46-.46.6-1.16.33-1.82a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09c.66 0 1.26-.38 1.51-1 .29-.66.13-1.36-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06c.46.46 1.16.6 1.82.33.62-.25 1-0.85 1-1.51V3a2 2 0 1 1 4 0v.09c0 .66.38 1.26 1 1.51.66.27 1.36.13 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06c-.46.46-.6 1.16-.33 1.82.25.62.85 1 1.51 1H21a2 2 0 1 1 0 4h-.09c-.66 0-1.26.38-1.51 1z" />
          </g>
        );
      case 'home':
        // 家のアイコン
        return (
          <g stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 11.5 12 4l9 7.5" />
            <path d="M5 10.5V20h14v-9.5" />
          </g>
        );
      case 'person':
        // 人のアイコン
        return (
          <g fill={fill}>
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20c0-4.5 4-7 8-7s8 2.5 8 7v1H4z" />
          </g>
        );
      case 'calendar':
        // 日付を表すカレンダーアイコン
        return (
          <g stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M8 3v4M16 3v4M3 11h18" />
          </g>
        );
      case 'download':
        // ダウンロードボタン
        return (
          <g stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3v12" />
            <path d="M8 11l4 4 4-4" />
            <path d="M4 21h16" />
          </g>
        );
      case 'refresh':
        // 更新ボタン
        return (
          <g stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12C21 16.9706 16.9706 21 12 21C9.69494 21 7.59227 20.1334 6 18.7083L3 16M3 12C3 7.02944 7.02944 3 12 3C14.3051 3 16.4077 3.86656 18 5.29168L21 8M3 21V16M3 16H8M21 3V8M21 8H16" />
          </g>
        );
      case 'delete':
        // ゴミ箱アイコン
        return (
          <g stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" fill="none">
            <path d="M18 6L17.1991 18.0129C17.129 19.065 17.0939 19.5911 16.8667 19.99C16.6666 20.3412 16.3648 20.6235 16.0011 20.7998C15.588 21 15.0607 21 14.0062 21H9.99377C8.93927 21 8.41202 21 7.99889 20.7998C7.63517 20.6235 7.33339 20.3412 7.13332 19.99C6.90607 19.5911 6.871 19.065 6.80086 18.0129L6 6M4 6H20M16 6L15.7294 5.18807C15.4671 4.40125 15.3359 4.00784 15.0927 3.71698C14.8779 3.46013 14.6021 3.26132 14.2905 3.13878C13.9376 3 13.523 3 12.6936 3H11.3064C10.477 3 10.0624 3 9.70951 3.13878C9.39792 3.26132 9.12208 3.46013 8.90729 3.71698C8.66405 4.00784 8.53292 4.40125 8.27064 5.18807L8 6M14 10V17M10 10V17" />

          </g>
        );
      case 'check_circle':
        // チェックマークアイコン
        return (
          <g fill={fill}>
            <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm-1 14-4-4 1.4-1.4L11 13.2l5.6-5.6L18 9z" />
          </g>
        );
      case 'chevron_left':
        // 左向き矢印
        return (
          <g stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 6l-6 8 6 8" />
          </g>
        );
      case 'chevron_right':
        // 右向き矢印
        return (<path d="M10 6l6 8-6 8" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />);
      case 'chevron_down':
        // 下向き矢印
        return (
          <path d="M6 9l6 6 6-6" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        );
      case 'open_in_new':
        // 外部リンクアイコン
        return (
          <g stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 5h5v5" />
            <path d="M10 14L19 5" />
            <path d="M19 14v5H5V5h5" />
          </g>
        );
      case 'filter':
        // フィルタアイコン
        return (
          <g stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" fill="none">
            <path d="M3 5h18l-7 8v6l-4 2v-8L3 5z" />
          </g>
        );
      case 'bug':
        // 報告を表すマーク
        return (
          <g stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" fill="none">
            <path d="M12 15H12.01M12 12V9M4.98207 19H19.0179C20.5615 19 21.5233 17.3256 20.7455 15.9923L13.7276 3.96153C12.9558 2.63852 11.0442 2.63852 10.2724 3.96153L3.25452 15.9923C2.47675 17.3256 3.43849 19 4.98207 19Z" />
          </g>
        );
      case 'chat':
        // 吹き出しアイコン
        return (
          <g stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" fill="none">
            <path d="M21 12a7 7 0 0 1-7 7H8l-5 3 2-5a7 7 0 0 1-2-5 7 7 0 0 1 7-7h4a7 7 0 0 1 7 7z" />
          </g>
        );
      case 'package':
        // パッケージを表すアイコン
        return (
          <g stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" fill="none">
            <path d="M12 3l8 4-8 4-8-4 8-4z" />
            <path d="M20 7v6l-8 4-8-4V7" />
            <path d="M12 11v6" />
          </g>
        );
      case 'sort_up':
        // 昇順ソートアイコン
        return (
          <g fill={fill}>
            <path fillRule="evenodd" clipRule="evenodd" d="M16.7628 3.28854C17.0691 3.18645 17.4063 3.29179 17.6 3.55005L20.6 7.55005C20.8485 7.88142 20.7814 8.35152 20.45 8.60005C20.1186 8.84858 19.6485 8.78142 19.4 8.45005L17.75 6.25005V20C17.75 20.4143 17.4142 20.75 17 20.75C16.5858 20.75 16.25 20.4143 16.25 20V4.00005C16.25 3.67723 16.4566 3.39062 16.7628 3.28854ZM3.25 8.00005C3.25 7.58583 3.58579 7.25005 4 7.25005H13C13.4142 7.25005 13.75 7.58583 13.75 8.00005C13.75 8.41426 13.4142 8.75005 13 8.75005H4C3.58579 8.75005 3.25 8.41426 3.25 8.00005ZM5.25 13C5.25 12.5858 5.58579 12.25 6 12.25H13C13.4142 12.25 13.75 12.5858 13.75 13C13.75 13.4143 13.4142 13.75 13 13.75H6C5.58579 13.75 5.25 13.4143 5.25 13ZM7.25 18C7.25 17.5858 7.58579 17.25 8 17.25H13C13.4142 17.25 13.75 17.5858 13.75 18C13.75 18.4143 13.4142 18.75 13 18.75H8C7.58579 18.75 7.25 18.4143 7.25 18Z" />
          </g>
        );
      case 'sort_down':
        // 降順ソートアイコン
        return (
          <g fill={fill}>
            <path fillRule="evenodd" clipRule="evenodd" d="M17 3.25C17.4142 3.25 17.75 3.58579 17.75 4V17.75L19.4 15.55C19.6485 15.2186 20.1186 15.1515 20.45 15.4C20.7814 15.6485 20.8485 16.1186 20.6 16.45L17.6 20.45C17.4063 20.7083 17.0691 20.8136 16.7628 20.7115C16.4566 20.6094 16.25 20.3228 16.25 20V4C16.25 3.58579 16.5858 3.25 17 3.25ZM7.25 6C7.25 5.58579 7.58579 5.25 8 5.25H13C13.4142 5.25 13.75 5.58579 13.75 6C13.75 6.41421 13.4142 6.75 13 6.75H8C7.58579 6.75 7.25 6.41421 7.25 6ZM5.25 11C5.25 10.5858 5.58579 10.25 6 10.25H13C13.4142 10.25 13.75 10.5858 13.75 11C13.75 11.4142 13.4142 11.75 13 11.75H6C5.58579 11.75 5.25 11.4142 5.25 11ZM3.25 16C3.25 15.5858 3.58579 15.25 4 15.25H13C13.4142 15.25 13.75 15.5858 13.75 16C13.75 16.4142 13.4142 16.75 13 16.75H4C3.58579 16.75 3.25 16.4142 3.25 16Z" />
          </g>
        );
      case 'moon':
        // 月
        return (
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        );
      case 'sun':
        // 太陽
        return (
          <g stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </g>
        );
      case 'check':
        // チェックマーク
        return (
          <path d="M20 6 9 17l-5-5" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        );
      case 'callout-note':
        // GitHub風のNote（情報）アイコン
        return (
          <g stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v4" />
            <path d="M12 16h.01" />
          </g>
        );
      case 'callout-tip':
        // GitHub風のTip（ヒント）アイコン
        return (
          <g stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18h6" />
            <path d="M10 21h4" />
            <path d="M12 3a6 6 0 0 1 3.5 10.9c-.9.7-1.5 1.8-1.5 3.1V18h-4v-1c0-1.3-.6-2.4-1.5-3.1A6 6 0 0 1 12 3z" />
          </g>
        );
      case 'callout-important':
        // GitHub風のImportant（重要）アイコン
        return (
          <g stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v6" />
            <path d="M12 17h.01" />
            <path d="M9 4l3-2 3 2" />
          </g>
        );
      case 'callout-warning':
        // GitHub風のWarning（警告）アイコン
        return (
          <g stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" fill="none">
            <path d="M12 3l9 16H3l9-16z" />
            <path d="M12 9v5" />
            <path d="M12 17h.01" />
          </g>
        );
      case 'callout-caution':
        // GitHub風のCaution（注意）アイコン
        return (
          <g stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" fill="none">
            <path d="M7.76 3h8.48L21 7.76v8.48L16.24 21H7.76L3 16.24V7.76L7.76 3z" />
            <path d="M12 8v5.5" />
            <path d="M12 17h.01" />
          </g>
        );
      default:
        // 不明なアイコン名の場合は空
        return null;
    }
  }
  return <svg {...props}>{title ? <title>{title}</title> : null}{path()}</svg>;
}
