import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header.jsx';
import Icon from '../components/Icon.jsx';
import { collectDeviceInfo, readAppLog, loadInstalledMap } from '../app/utils.js';

// プラグイン投稿フォームの初期値
const pkgInitial = {
  id: '',
  name: '',
  type: '',
  summary: '',
  description: '',
  author: '',
  // パッケージのサイトURL（既存の表示仕様に合わせ repoURL を使用）
  repoURL: '',
  // ダウンロードURL（任意。サイトがない場合はこちら/添付）
  downloadURL: '',
  license: '',
  tags: '',
  dependencies: '',
  images: '',
  // オリジナル作者（派生/フォークの場合）
  originalAuthor: '',
  // 最新バージョン
  version: '',
  // 送信者が作者かどうか（任意）
  isAuthor: false,
  // その他（任意）
  other: '',
};

// 投稿ページコンポーネント
// 不具合報告・問い合わせ・プラグイン情報の投稿フォームを提供
export default function Submit() {
  // 投稿の種類（'bug' | 'inquiry' | 'package'）
  const [mode, setMode] = useState('bug');

  // 共通のUI状態管理
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  // 不具合報告用の状態管理
  const [bug, setBug] = useState({ title: '', detail: '', contact: '', includeDevice: true, includeLog: true });
  const [device, setDevice] = useState(null);
  const [pluginsPreview, setPluginsPreview] = useState('');
  const [appLog, setAppLog] = useState('');
  const [loadingDiag, setLoadingDiag] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [appVersion, setAppVersion] = useState('');

  // 問い合わせ用の状態管理（デフォルトですべて送信オン）
  const [inq, setInq] = useState({ title: '', detail: '', contact: '', includeApp: true, includeDevice: true, includeLog: true });

  // プラグイン投稿用の状態管理
  const [pkg, setPkg] = useState(pkgInitial);

  // 同意事項のテキスト
  const consentText = useMemo(() => (
    '送信内容は品質改善のために利用します。個人情報は返信目的以外では使用しません。'
  ), []);

  // ルート識別クラスを付与（ホームボタンの位置調整用）
  useEffect(() => {
    document.body.classList.add('route-submit');
    return () => { document.body.classList.remove('route-submit'); };
  }, []);

  // コンポーネント初期化時に端末情報とプラグイン一覧を取得
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingDiag(true);
      try {
        const info = await collectDeviceInfo();
        if (!cancelled) setDevice(info);
      } catch (_) {
        if (!cancelled) setDevice(null);
      }
      // アプリのバージョン取得
      try {
        const app = await import('@tauri-apps/api/app');
        const v = (app?.getVersion) ? await app.getVersion() : '';
        if (!cancelled) setAppVersion(String(v || ''));
      } catch (_) { if (!cancelled) setAppVersion(''); }
      // インストール済みプラグイン一覧をloadInstalledMapを使用して表示
      try {
        const map = await loadInstalledMap();
        if (!cancelled) {
          const lines = Object.entries(map || {})
            .map(([id, ver]) => (ver ? `${id} ${ver}` : id))
            .slice(0, 300)
            .join('\n');
          setPluginsPreview(lines);
        }
      } catch (_) {
        if (!cancelled) setPluginsPreview('');
      } finally {
        if (!cancelled) setLoadingDiag(false);
      }
      try {
        const text = await readAppLog();
        if (!cancelled) setAppLog(text || '');
      } catch (_) { if (!cancelled) setAppLog(''); }
    }
    if (mode === 'bug') load();
    return () => { cancelled = true; };
  }, [mode]);

  // プラグイン投稿フォームの値変更処理
  function onPkgChange(e) {
    const { name, value, type, checked } = e.target;
    setPkg(prev => ({ ...prev, [name]: type === 'checkbox' ? !!checked : value }));
  }

  // 不具合報告フォームの値変更処理
  function onBugChange(e) {
    const { name, value, type, checked } = e.target;
    setBug(prev => ({ ...prev, [name]: type === 'checkbox' ? !!checked : value }));
  }

  // 問い合わせフォームの値変更処理
  function onInqChange(e) {
    const { name, value, type, checked } = e.target;
    setInq(prev => ({ ...prev, [name]: type === 'checkbox' ? !!checked : value }));
  }

  // 添付ファイルの選択
  function onFilesChange(e) {
    const files = Array.from(e.target?.files || []);
    setAttachments(prev => {
      const list = Array.from(prev || []);
      const existing = new Set(list.map(f => `${f.name}:${f.size}:${f.lastModified}`));
      for (const f of files) {
        const key = `${f.name}:${f.size}:${f.lastModified}`;
        if (!existing.has(key)) {
          list.push(f);
          existing.add(key);
        }
      }
      return list;
    });
    // 同じ input で再選択できるように値をリセット
    try { if (e.target) e.target.value = ''; } catch (_) { /* ignore */ }
  }

  function removeAttachment(index) {
    setAttachments(prev => (prev || []).filter((_, i) => i !== index));
  }

  // プラグイン投稿フォームのバリデーション
  function validatePkg() {
    const req = ['id', 'name', 'type', 'summary', 'description', 'author', 'license'];
    for (const k of req) if (!String(pkg[k] || '').trim()) return `${k} は必須です`;
    // 概要は55文字以内
    if ((pkg.summary || '').trim().length > 55) return 'summary は55文字以内で入力してください';
    // サイトURL/ダウンロードURL/添付 のいずれかは必須
    const hasSite = !!(pkg.repoURL || '').trim();
    const hasDL = !!(pkg.downloadURL || '').trim();
    const hasFiles = attachments && attachments.length > 0;
    if (!hasSite && !hasDL && !hasFiles) return 'サイトURL または ダウンロードURL または 添付ファイルのいずれかを指定してください';
    return '';
  }

  // カンマ区切りの文字列を配列に変換
  function parseArray(s) {
    return (s || '').split(',').map(v => v.trim()).filter(Boolean);
  }

  // 画像情報を解析（url|alt形式）
  function parseImages(s) {
    const arr = (s || '').split(',').map(v => v.trim()).filter(Boolean);
    return arr.map(p => {
      const [src, alt] = p.split('|');
      return { src: src?.trim(), alt: (alt || '').trim() };
    }).filter(x => !!x.src);
  }

  // フォーム送信処理
  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setResult('');
    try {
      let payload = {};
      // プラグイン投稿の場合の処理（payload は Cloudflare Workers 側仕様に合わせて title/body/labels などに整形）
      if (mode === 'package') {
        const msg = validatePkg();
        if (msg) { setError(msg); return; }
        const item = {
          id: pkg.id.trim(),
          name: pkg.name.trim(),
          type: pkg.type.trim(),
          summary: pkg.summary.trim(),
          description: pkg.description.trim() || undefined,
          author: pkg.author.trim(),
          repoURL: pkg.repoURL.trim() || undefined,
          downloadURL: pkg.downloadURL.trim() || undefined,
          license: pkg.license.trim() || undefined,
          tags: parseArray(pkg.tags),
          dependencies: parseArray(pkg.dependencies),
          images: parseImages(pkg.images),
          originalAuthor: pkg.originalAuthor.trim() || undefined,
          version: pkg.version.trim() || undefined,
          isAuthor: !!pkg.isAuthor,
          other: pkg.other.trim() || undefined,
        };
        payload = {
          title: `パッケージ提案: ${item.name} (${item.id})`,
          labels: ['package', 'from-client'],
          body: [
            '以下の内容でパッケージ提案が送信されました。',
            '',
            '```json',
            JSON.stringify(item, null, 2),
            '```'
          ].join('\n')
        };
      } else if (mode === 'bug') {
        // 不具合報告の場合の処理
        if (!bug.title.trim() || !bug.detail.trim()) { setError('タイトルと詳細は必須です'); return; }
        const lines = [];
        if (appVersion) lines.push(`アプリのバージョン: ${appVersion}`);
        lines.push(bug.detail.trim());
        let osStr = '';
        let cpuStr = '';
        let gpuStr = '';
        let installedStr = '';
        if (bug.includeDevice) {
          osStr = `${device?.os?.name || ''} ${device?.os?.version || ''} (${device?.os?.arch || ''})`.trim();
          cpuStr = `${device?.cpu?.model || ''}${device?.cpu?.cores ? ` / Cores: ${device.cpu.cores}` : ''}`.trim();
          gpuStr = `${device?.gpu?.vendor || ''} ${device?.gpu?.renderer || ''} ${device?.gpu?.driver || ''}`.trim();
        }
        if (pluginsPreview) {
          installedStr = pluginsPreview;
        }
        payload = {
          title: `不具合報告: ${bug.title.trim()}`,
          body: lines.join('\n'),
          labels: ['bug', 'from-client'],
          contact: bug.contact.trim() || undefined,
          appVersion: appVersion || undefined,
          os: osStr || undefined,
          cpu: cpuStr || undefined,
          gpu: gpuStr || undefined,
          // Send installed list as array, not newline-separated string
          installed: (installedStr ? installedStr.split('\n').map(s => s.trim()).filter(Boolean) : undefined),
        };
      } else {
        // 問い合わせの場合の処理
        if (!inq.title.trim() || !inq.detail.trim()) { setError('タイトルと詳細は必須です'); return; }
        payload = {
          title: `問い合わせ: ${inq.title.trim()}`,
          body: inq.detail.trim(),
          labels: ['inquiry', 'from-client'],
          contact: inq.contact.trim() || undefined,
        };
      }

      setSubmitting(true);
      // 送信先（Cloudflare Workers）: multipart/form-data で payload(JSON) と files[]（任意）
      const endpoint = import.meta.env.VITE_ISSUES_ENDPOINT || '/api/issues';

      const form = new FormData();
      form.append('payload', JSON.stringify(payload));
      // 任意添付: ユーザー選択ファイル
      for (const f of attachments) {
        form.append('files[]', f, f.name || 'attachment');
      }
      // 任意添付: 不具合報告で app.log を追加
      if (mode === 'bug' && bug.includeLog && appLog) {
        const blob = new Blob([appLog], { type: 'text/plain' });
        form.append('files[]', blob, 'app.log');
      }
      console.debug('Submitting to', endpoint);
      const res = await fetch(endpoint, { method: 'POST', body: form });
      if (!res.ok) {
        let msg = '';
        try {
          const jt = await res.clone().text();
          try {
            const j = JSON.parse(jt);
            msg = j?.message || (j?.detail ? `${j.error || ''}${j.error ? ': ' : ''}${j.detail}` : jt);
          } catch (_) {
            msg = jt;
          }
        } catch (_) { /* ignore */ }
        throw new Error(`HTTP ${res.status}${msg ? `: ${msg}` : ''}`);
      }
      const data = await res.json().catch(() => ({}));
      setResult(data.url || data.message || '送信に成功しました');
    } catch (e2) {
      console.error(e2);
      setError('送信に失敗しました。ネットワークや設定をご確認ください。');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <Header />
      <main className="container">
        <h1>フィードバック</h1>
        <p style={{ color: 'var(--muted)' }}>このページから不具合報告・意見/問い合わせ・プラグイン情報を送信できます。</p>
        {error && <div className="error" role="alert">{error}</div>}
        {result && <div className="success">{/^https?:/i.test(result) ? (<a href={result} target="_blank" rel="noreferrer noopener">{result}</a>) : result}</div>}

        {/* 投稿種類選択タブ */}
        <div className="segmented" role="tablist" aria-label="投稿の種類">
          <button type="button" role="tab" aria-selected={mode === 'bug'} className={`btn btn--toggle ${mode === 'bug' ? 'is-active' : ''}`} onClick={() => setMode('bug')}>
            <span aria-hidden><Icon name="bug" /></span> 不具合
          </button>
          <button type="button" role="tab" aria-selected={mode === 'inquiry'} className={`btn btn--toggle ${mode === 'inquiry' ? 'is-active' : ''}`} onClick={() => setMode('inquiry')}>
            <span aria-hidden><Icon name="chat" /></span> 意見/問い合わせ
          </button>
          <button type="button" role="tab" aria-selected={mode === 'package'} className={`btn btn--toggle ${mode === 'package' ? 'is-active' : ''}`} onClick={() => setMode('package')}>
            <span aria-hidden><Icon name="package" /></span> プラグイン情報
          </button>
        </div>

        <form className="form" onSubmit={onSubmit}>
          {/* 不具合報告フォーム */}
          {mode === 'bug' && (
            <>
              <div className="form__grid">
                <label>タイトル*<input name="title" value={bug.title} onChange={onBugChange} required placeholder="タイトルを入力してください。" /></label>
                <label>ご連絡先（任意）<input name="contact" value={bug.contact} onChange={onBugChange} placeholder="メールや X/Twitter など（折り返し用）" /></label>
                <label style={{ gridColumn: '1 / -1' }}>問題の詳細*<textarea className="textarea--lg" name="detail" value={bug.detail} onChange={onBugChange} required placeholder="発生手順や期待する動作などを入力してください。" /></label>
              </div>

              <div className="sidebar">
                <div className="sidebar__header">添付ファイル（任意・複数可）</div>
                <div className="sidebar__group">
                  <input type="file" multiple onChange={onFilesChange} className="allow-contextmenu" />
                  {attachments?.length ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {attachments.map((f, i) => (
                        <div key={`${f.name}-${f.size}-${f.lastModified}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="badge" title={f.name} style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {f.path || f.webkitRelativePath || f.name}
                          </div>
                          <button type="button" aria-label="削除" onClick={() => removeAttachment(i)} className="btn">×</button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="note">スクリーンショットなどを追加できます</div>
                  )}
                </div>
              </div>

              <div className="sidebar">
                <div className="sidebar__header">アプリの情報</div>
                <div className="sidebar__group">
                  <label className="switch">
                    <input type="checkbox" name="includeApp" checked={inq.includeApp} onChange={onInqChange} />
                    <span className="switch__slider" aria-hidden></span>
                    <span className="switch__label">アプリ情報を併せて送信する</span>
                  </label>
                  <div>アプリのバージョン: {appVersion || '取得中…'}</div>
                  <div>
                    インストール済みプラグイン一覧
                    <pre className="modal__pre pre--wrap pre--scroll">{pluginsPreview || '取得できませんでした'}</pre>
                  </div>
                </div>
              </div>

              <div className="sidebar">
                <div className="sidebar__header">デバイス情報</div>
                {loadingDiag ? <div>収集中…</div> : (
                  <div className="sidebar__group">
                    <label className="switch">
                      <input type="checkbox" name="includeDevice" checked={bug.includeDevice} onChange={onBugChange} />
                      <span className="switch__slider" aria-hidden></span>
                      <span className="switch__label">デバイス情報を併せて送信する</span>
                    </label>
                    <div>OS: {device?.os?.name || ''} {device?.os?.version || ''} ({device?.os?.arch || ''})</div>
                    <div>CPU: {device?.cpu?.model || ''} / 論理コア: {device?.cpu?.cores || ''}</div>
                    <div>GPU: {device?.gpu?.vendor || ''} {device?.gpu?.renderer || ''} {device?.gpu?.driver || ''}</div>
                  </div>
                )}
              </div>

              <div className="sidebar" style={{ position: 'relative' }}>
                <div className="sidebar__header">アプリログ</div>
                <div className="sidebar__group">
                  <label className="switch">
                    <input type="checkbox" name="includeLog" checked={bug.includeLog} onChange={onBugChange} />
                    <span className="switch__slider" aria-hidden></span>
                    <span className="switch__label">app.log を併せて送信する</span>
                  </label>
                  {appLog ? <pre className="modal__pre pre--wrap pre--scroll">{appLog}</pre> : <div className="badge">ログがまだありません</div>}
                </div>
              </div>
            </>
          )}

          {mode === 'inquiry' && (
            <>
              <div className="form__grid">
                <label>タイトル*<input name="title" value={inq.title} onChange={onInqChange} required placeholder="タイトルを入力してください。" /></label>
                <label>ご連絡先（任意）<input name="contact" value={inq.contact} onChange={onInqChange} placeholder="メールや X/Twitter など（折り返し用）" /></label>
                <label style={{ gridColumn: '1 / -1' }}>意見・問い合わせの詳細*<textarea className="textarea--lg" name="detail" value={inq.detail} onChange={onInqChange} required placeholder="意見・問い合わせの詳細を入力してください。" /></label>
              </div>

              <div className="sidebar">
                <div className="sidebar__header">添付ファイル（任意・複数可）</div>
                <div className="sidebar__group">
                  <input type="file" multiple onChange={onFilesChange} className="allow-contextmenu" />
                  {attachments?.length ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {attachments.map((f, i) => (
                        <div key={`${f.name}-${f.size}-${f.lastModified}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="badge" title={f.name} style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {f.path || f.webkitRelativePath || f.name}
                          </div>
                          <button type="button" aria-label="削除" onClick={() => removeAttachment(i)} className="btn">×</button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </>
          )}

          {mode === 'package' && (
            <>
              <div className="note" style={{ marginBottom: 8 }}>
                注意: AviUtl2 に対応しているパッケージのみアップロードしてください。
              </div>
              <div className="form__grid">
                <label>ID*<input name="id" value={pkg.id} onChange={onPkgChange} required placeholder="作者名.パッケージ名（例：Kenkun.AviUtlExEdit2）" /></label>
                <label>パッケージ名*<input name="name" value={pkg.name} onChange={onPkgChange} required placeholder="パッケージ名" /></label>
                <label>作者名*<input name="author" value={pkg.author} onChange={onPkgChange} required placeholder="作者名" /></label>
                <label>オリジナルの作者名（任意）<input name="originalAuthor" value={pkg.originalAuthor} onChange={onPkgChange} placeholder="オリジナル版がある場合のみ" /></label>
                <label style={{ gridColumn: '1 / -1' }}>種類*<input name="type" value={pkg.type} onChange={onPkgChange} required placeholder="入力プラグイン/出力プラグイン/アニメーション効果/言語ファイル/シーンチェンジ/カスタムオブジェクト など" /></label>
                <label style={{ gridColumn: '1 / -1' }}>概要*<input name="summary" value={pkg.summary} onChange={onPkgChange} required maxLength={55} placeholder="パッケージを55文字以内で要約してください。" /></label>
                <label style={{ gridColumn: '1 / -1' }}>詳細*<textarea className="textarea--lg" name="description" value={pkg.description} onChange={onPkgChange} required placeholder="パッケージの詳細説明を入力してください。" /></label>

                <label>パッケージのサイト<input name="repoURL" value={pkg.repoURL} onChange={onPkgChange} placeholder="サイトやリポジトリのURL" /></label>
                <label>ダウンロードURL<input name="downloadURL" value={pkg.downloadURL} onChange={onPkgChange} placeholder="直接ダウンロードできるURL" /></label>
                <label>最新バージョン<input name="version" value={pkg.version} onChange={onPkgChange} placeholder="" /></label>
                <label>ライセンス*<input name="license" value={pkg.license} onChange={onPkgChange} required placeholder="例：MIT" /></label>
                <label>タグ（任意）<input name="tags" value={pkg.tags} onChange={onPkgChange} placeholder="複数可能(カンマ区切り)" /></label>
                <label>依存パッケージ（任意）<input name="dependencies" value={pkg.dependencies} onChange={onPkgChange} placeholder="作者名.パッケージ名" /></label>
                <label style={{ gridColumn: '1 / -1' }}>画像（任意）<input name="images" value={pkg.images} onChange={onPkgChange} placeholder="URLを入力して下さい。例： url1, url2（1枚目がサムネになります)　添付する場合は下記から添付してください。" /></label>
                <label style={{ gridColumn: '1 / -1' }}>その他（任意）<textarea className="textarea--lg" name="other" value={pkg.other} onChange={onPkgChange} placeholder="特記事項や補足があれば記入してください。" /></label>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="switch" style={{ marginTop: 8 }}>
                    <input type="checkbox" name="isAuthor" checked={!!pkg.isAuthor} onChange={onPkgChange} />
                    <span className="switch__slider" aria-hidden></span>
                    <span className="switch__label">作者の場合はチェックしてください。</span>
                  </label>
                </div>
              </div>

              <div className="sidebar">
                <div className="sidebar__header">添付（任意・複数可）</div>
                <div className="sidebar__group">
                  <input type="file" multiple onChange={onFilesChange} className="allow-contextmenu" />
                  {attachments?.length ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {attachments.map((f, i) => (
                        <div key={`${f.name}-${f.size}-${f.lastModified}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="badge" title={f.name} style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {f.path || f.webkitRelativePath || f.name}
                          </div>
                          <button type="button" aria-label="削除" onClick={() => removeAttachment(i)} className="btn">×</button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="note">サイトやDL URLがない場合は、パッケージ本体や画像を添付してください（1枚目がサムネ表示になります）。</div>
                  )}
                </div>
              </div>
            </>
          )}

          <div className="form__actions form__actions--sticky" style={{ marginTop: 4 }}>
            <div style={{ alignSelf: 'center', color: 'var(--muted)', marginRight: 'auto' }}>{consentText}</div>
            <button type="submit" className="btn btn--primary btn--lg" disabled={submitting}>{submitting ? '送信中…' : '送信'}</button>
          </div>
        </form>
      </main>
    </div>
  );
}
