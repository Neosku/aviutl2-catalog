// AviUtl2を起動したときに、更新があるかチェックしてメニューに表示するプラグイン
#ifndef WIN32_LEAN_AND_MEAN
#define WIN32_LEAN_AND_MEAN  // Windows ヘッダの軽量化
#endif
#ifndef _WIN32_WINNT
#define _WIN32_WINNT 0x0A00  // Windows 10 以降を前提にする
#endif
#include <windows.h>
#include <mmreg.h>
#include <shellapi.h>
#include <commctrl.h>
#include <shlobj.h>        // SHGetKnownFolderPath
#include <knownfolders.h>  // FOLDERID_RoamingAppData
#include <urlmon.h>        // URLDownloadToFileW
#include <math.h>          // sqrt
#if defined(_MSC_VER)
#pragma comment(lib, "urlmon.lib")
#endif

#include <string>
#include <vector>
#include <map>
#include <fstream>
#include <sstream>
#include <algorithm>
#include <utility>
#include <cwctype>

#include "input2.h"

// ------------------------ 定数/グローバル ------------------------
static constexpr UINT ID_MENU_UPDATE = 0xE711;  // メニューID 固定
static constexpr UINT WM_APP_APPLY_MENU = WM_APP + 100;
static constexpr UINT IDC_LISTVIEW = 2001;
static constexpr UINT IDC_BTN_LAUNCH = 2002;

// index.jsonのURL
static const wchar_t kCatalogIndexUrl[] = L"https://raw.githubusercontent.com/Neosku/aviutl2-catalog-data/main/index.json";

static WNDPROC g_OrigWndProc = nullptr;
static HWND g_MainWnd = nullptr;
static HINSTANCE g_hInst = nullptr;

static bool g_MenuReady = false;        // 起動直後はメニューを出さない
static bool g_UpdateAvailable = false;  // 比較結果

// メニューアイコン用ビットマップ
static HBITMAP g_hBmpUpdateAvail = nullptr;  // 更新ありアイコン
static HBITMAP g_hBmpUpdateNone = nullptr;   // 更新なしアイコン
static int g_MenuIconSizePx = 0;             // メニューアイコンのサイズ

struct UpdateEntry {
    std::wstring id;
    std::wstring installed;
    std::wstring latest;
};
static std::vector<UpdateEntry> g_Updates;  // 比較結果

// ------------------------ ユーティリティ ------------------------
// 画面スケーリング（DPI）関連のユーティリティ
static float GetScaleForHwnd(HWND hWnd) {
    // 既定値（96DPI = 1.0）
    UINT dpi = 96;
    // GetDpiForWindow を動的取得
    typedef UINT(WINAPI * PFN_GetDpiForWindow)(HWND);
    static PFN_GetDpiForWindow pGetDpiForWindow = (PFN_GetDpiForWindow)GetProcAddress(GetModuleHandleW(L"user32.dll"), "GetDpiForWindow");
    if (pGetDpiForWindow) {
        dpi = pGetDpiForWindow(hWnd);
    } else {
        // フォールバック: デバイスコンテキストから DPI を取得
        HDC hdc = GetDC(hWnd ? hWnd : nullptr);
        if (hdc) {
            int dpix = GetDeviceCaps(hdc, LOGPIXELSX);
            if (dpix > 0) dpi = (UINT)dpix;
            ReleaseDC(hWnd ? hWnd : nullptr, hdc);
        }
    }
    if (dpi < 96) dpi = 96;  // 最低 100%
    return (float)dpi / 96.0f;
}

static inline int ScalePx(int v, float s) { return (int)(v * s + 0.5f); }

// UI 用に少し抑えたスケール（高DPIで大きくなりすぎないよう緩和）
static float GetUiScaleForHwnd(HWND hWnd) {
    float s = GetScaleForHwnd(hWnd);
    if (s <= 1.0f) return 1.0f;
    // 緩和率 0.8: 200%→180% 程度に抑制（必要に応じて微調整可能）
    float s2 = 1.0f + (s - 1.0f) * 0.8f;
    return s2;
}

// AppData/Roaming のパスを取得（C:\\Users\\<name>\\AppData\\Roaming）
static std::wstring GetRoamingAppDataDir() {
    PWSTR psz = nullptr;
    std::wstring path;
    HRESULT hr = SHGetKnownFolderPath(FOLDERID_RoamingAppData, 0, nullptr, &psz);
    if (SUCCEEDED(hr) && psz) {
        path.assign(psz);
        CoTaskMemFree(psz);
    }
    return path;
}

// 2つのパスを結合
static std::wstring JoinPath(const std::wstring& a, const std::wstring& b) {
    // if (a.empty()) return b;
    // if (b.empty()) return a;
    // if (a.back() == L'\\' || a.back() == L'/') return a + b;
    return a + L"\\" + b;
}

// ディレクトリパス全体を作成
static bool EnsureDir(const std::wstring& path) {
    if (path.empty()) return false;
    // 再帰的に作成
    size_t pos = 0;
    while (true) {
        pos = path.find_first_of(L"/\\", pos + 1);
        std::wstring cur = (pos == std::wstring::npos) ? path : path.substr(0, pos);
        if (!cur.empty()) CreateDirectoryW(cur.c_str(), nullptr);
        if (pos == std::wstring::npos) break;
    }
    return true;
}

// 指定パスのファイルを全読み込みしてバイト列（std::string）に格納
static bool ReadFileAll(const std::wstring& path, std::string& out) {
    HANDLE h = CreateFileW(path.c_str(), GENERIC_READ, FILE_SHARE_READ, nullptr, OPEN_EXISTING, FILE_ATTRIBUTE_NORMAL, nullptr);
    if (h == INVALID_HANDLE_VALUE) return false;
    LARGE_INTEGER li{};
    if (!GetFileSizeEx(h, &li)) {
        CloseHandle(h);
        return false;
    }
    if (li.QuadPart < 0 || li.QuadPart > (LONGLONG)(64ull * 1024 * 1024)) {
        CloseHandle(h);
        return false;
    }
    DWORD size = (DWORD)li.QuadPart;
    out.resize(size);
    DWORD read = 0;
    BOOL ok = ReadFile(h, out.data(), size, &read, nullptr);
    CloseHandle(h);
    if (!ok) return false;
    out.resize(read);
    return true;
}

// UTF-8 を UTF-16 に変換
static std::wstring U82W(const std::string& s) {
    if (s.empty()) return {};
    int len = MultiByteToWideChar(CP_UTF8, 0, s.data(), (int)s.size(), nullptr, 0);
    std::wstring ws(len, L'\0');
    MultiByteToWideChar(CP_UTF8, 0, s.data(), (int)s.size(), ws.data(), len);
    return ws;
}

// 文字列検索：pos 以降で token を検索して位置を返す
static size_t FindToken(const std::string& s, size_t pos, const char* token) {
    return s.find(token, pos);
}

// ------------------------ メニューアイコン作成 ------------------------

// 指定色の円形ビットマップを作成
static HBITMAP MakeCircleBitmap(COLORREF color, int size = 16) {
    // 32bit ARGB ビットマップを作成
    BITMAPINFO bmi = {};
    bmi.bmiHeader.biSize = sizeof(BITMAPINFOHEADER);
    bmi.bmiHeader.biWidth = size;
    bmi.bmiHeader.biHeight = -size;
    bmi.bmiHeader.biPlanes = 1;
    bmi.bmiHeader.biBitCount = 32;
    bmi.bmiHeader.biCompression = BI_RGB;
    void* pBits = nullptr;
    HDC hdcScreen = GetDC(nullptr);
    HBITMAP hBitmap = CreateDIBSection(hdcScreen, &bmi, DIB_RGB_COLORS, &pBits, nullptr, 0);
    ReleaseDC(nullptr, hdcScreen);
    if (!hBitmap || !pBits) return nullptr;
    // ピクセルデータを直接操作
    DWORD* pixels = (DWORD*)pBits;
    // 色成分を取得
    BYTE r = GetRValue(color);
    BYTE g = GetGValue(color);
    BYTE b = GetBValue(color);
    float centerX = size / 2.0f;
    float centerY = size / 2.0f;
    float radius = (size - 2) / 2.0f;  // 少しマージンを取る
    for (int y = 0; y < size; y++) {
        for (int x = 0; x < size; x++) {
            float dx = x - centerX;
            float dy = y - centerY;
            float distance = sqrt(dx * dx + dy * dy);
            BYTE alpha = 0;
            if (distance <= radius) {
                // アンチエイリアシングのため、エッジ部分でアルファ値を調整
                if (distance >= radius - 1.0f) {
                    alpha = (BYTE)((radius - distance) * 255);
                } else {
                    alpha = 255;
                }
            }
            // premultiplied alpha で色を計算
            BYTE premult_r = (r * alpha) / 255;
            BYTE premult_g = (g * alpha) / 255;
            BYTE premult_b = (b * alpha) / 255;
            // ARGB形式で格納
            pixels[y * size + x] = (alpha << 24) | (premult_r << 16) | (premult_g << 8) | premult_b;
        }
    }
    return hBitmap;
}

// メニューアイコンを初期化
// 指定ウィンドウの DPI からメニューアイコン推奨サイズを取得
static int GetMenuIconSizeForHwnd(HWND hWnd) {
    // DIP（96DPI基準）のサイズをスケーリングして決定
    const float s = GetUiScaleForHwnd(hWnd);
    const int baseDip = 10;  // 10dip を基準
    const int minDip = 7;    // 下限 7dip
    int dipPx = ScalePx(baseDip, s);
    int minPx = ScalePx(minDip, s);

    // Windows 10 以降: メニューの推奨チェックサイズを上限として使用
    typedef int(WINAPI * PFN_GetSystemMetricsForDpi)(int, UINT);
    typedef UINT(WINAPI * PFN_GetDpiForWindow)(HWND);
    static PFN_GetSystemMetricsForDpi pGetSysMetForDpi = (PFN_GetSystemMetricsForDpi)GetProcAddress(GetModuleHandleW(L"user32.dll"), "GetSystemMetricsForDpi");
    static PFN_GetDpiForWindow pGetDpiForWindow = (PFN_GetDpiForWindow)GetProcAddress(GetModuleHandleW(L"user32.dll"), "GetDpiForWindow");
    if (pGetSysMetForDpi && pGetDpiForWindow && hWnd) {
        UINT dpi = pGetDpiForWindow(hWnd);
        int w = pGetSysMetForDpi(SM_CXMENUCHECK, dpi);
        int h = pGetSysMetForDpi(SM_CYMENUCHECK, dpi);
        int sys = (w > 0 && h > 0) ? (w < h ? w : h) : 0;
        int sz = (sys > 0) ? std::min(dipPx, sys) : dipPx;
        if (sz < minPx) sz = minPx;
        return sz;
    }
    // フォールバック: システム値がなければ DIP ベースのみ
    if (dipPx < minPx) dipPx = minPx;
    return dipPx;
}

// DPI に応じたメニューアイコンを用意（サイズが変われば作り直し）
static void EnsureMenuIcons(HWND hWnd) {
    int desired = GetMenuIconSizeForHwnd(hWnd);
    if (desired <= 0) desired = 16;
    if (g_MenuIconSizePx != desired || !g_hBmpUpdateAvail || !g_hBmpUpdateNone) {
        // 既存を破棄して作り直す
        if (g_hBmpUpdateAvail) {
            DeleteObject(g_hBmpUpdateAvail);
            g_hBmpUpdateAvail = nullptr;
        }
        if (g_hBmpUpdateNone) {
            DeleteObject(g_hBmpUpdateNone);
            g_hBmpUpdateNone = nullptr;
        }
        g_hBmpUpdateAvail = MakeCircleBitmap(RGB(76, 175, 80), desired);
        g_hBmpUpdateNone = MakeCircleBitmap(RGB(153, 153, 153), desired);
        g_MenuIconSizePx = desired;
    }
}
// メニューアイコンをクリーンアップ
static void CleanupMenuIcons() {
    if (g_hBmpUpdateAvail) {
        DeleteObject(g_hBmpUpdateAvail);
        g_hBmpUpdateAvail = nullptr;
    }
    if (g_hBmpUpdateNone) {
        DeleteObject(g_hBmpUpdateNone);
        g_hBmpUpdateNone = nullptr;
    }
    g_MenuIconSizePx = 0;
}

// ------------------------ JSON パース（簡易） ------------------------

// コロン以降初めて出てくる" "を抽出（簡易）
static bool ExtractJSONString(const std::string& s, size_t posAfterColon, std::string& out) {
    size_t q1 = s.find('"', posAfterColon);
    if (q1 == std::string::npos) return false;
    size_t q2 = s.find('"', q1 + 1);
    if (q2 == std::string::npos) return false;
    out = s.substr(q1 + 1, q2 - (q1 + 1));
    return true;
}

// installed.jsonを解析しパッケージIDと最新バージョンを取得
static std::map<std::wstring, std::wstring> ParseInstalledJson(const std::string& json) {
    // { "id": "ver", ... }
    std::map<std::wstring, std::wstring> m;
    size_t pos = 0;
    while (true) {
        size_t qKey1 = json.find('"', pos);
        if (qKey1 == std::string::npos) break;
        size_t qKey2 = json.find('"', qKey1 + 1);
        if (qKey2 == std::string::npos) break;
        std::string key = json.substr(qKey1 + 1, qKey2 - (qKey1 + 1));

        size_t colon = json.find(':', qKey2);
        if (colon == std::string::npos) break;

        std::string val;
        if (!ExtractJSONString(json, colon + 1, val)) {
            pos = qKey2 + 1;
            continue;
        }
        m[U82W(key)] = U82W(val);
        pos = qKey2 + 1;
    }
    return m;
}

// index.json から、指定IDのみの latest-version を抽出（早期終了対応）
static std::map<std::wstring, std::wstring> ParseIndexLatestJsonFiltered(const std::string& json, const std::vector<std::wstring>& idsWanted) {
    std::map<std::wstring, std::wstring> m;
    if (idsWanted.empty()) return m;
    auto isWanted = [&idsWanted](const std::wstring& id) {
        for (const auto& w : idsWanted)
            if (w == id) return true;
        return false;
    };
    size_t pos = 0;
    while (true) {
        size_t idField = FindToken(json, pos, "\"id\"");
        if (idField == std::string::npos) break;
        size_t colon = json.find(':', idField);
        if (colon == std::string::npos) break;
        std::string idUtf8;
        if (!ExtractJSONString(json, colon + 1, idUtf8)) {
            pos = idField + 4;
            continue;
        }
        std::wstring idW = U82W(idUtf8);

        // このオブジェクトの閉じカッコ（簡易）
        size_t afterIdVal = json.find('"', colon + 1);
        if (afterIdVal == std::string::npos) {
            pos = idField + 4;
            continue;
        }
        size_t objClose = json.find('}', afterIdVal);
        if (objClose == std::string::npos) {
            pos = idField + 4;
            continue;
        }
        if (!isWanted(idW)) {
            pos = objClose + 1;
            continue;
        }
        size_t lvField = FindToken(json, colon, "\"latest-version\"");
        if (lvField == std::string::npos || lvField > objClose) {
            pos = objClose + 1;
            continue;
        }
        size_t lvColon = json.find(':', lvField);
        if (lvColon == std::string::npos || lvColon > objClose) {
            pos = objClose + 1;
            continue;
        }
        std::string latestUtf8;
        if (!ExtractJSONString(json, lvColon + 1, latestUtf8)) {
            pos = objClose + 1;
            continue;
        }
        m[idW] = U82W(latestUtf8);
        pos = objClose + 1;
        if (m.size() >= idsWanted.size()) break;  // 全ID見つかったら早期終了
    }
    return m;
}

// ------------------------ jsonの取得/比較 処理 ------------------------
// %APPDATA%\aviutl2-catalogを返す
static std::wstring GetAppCatalogRoot() {
    std::wstring appdata = GetRoamingAppDataDir();
    if (appdata.empty()) return L"";
    return JoinPath(appdata, L"aviutl2-catalog");
}

// index.jsonをダウンロード
static bool DownloadIndexJsonTo() {
    const std::wstring dir = JoinPath(GetAppCatalogRoot(), L"catalog");
    EnsureDir(dir);
    std::wstring path = JoinPath(dir, L"index.json");
    HRESULT hr = URLDownloadToFileW(nullptr, kCatalogIndexUrl, path.c_str(), 0, nullptr);
    return SUCCEEDED(hr);
}

// installed.json を読み込んで outJson（UTF-8データ）に格納
static bool LoadInstalledJson(std::string& outJson) {
    std::wstring path = JoinPath(GetAppCatalogRoot(), L"installed.json");
    if (ReadFileAll(path, outJson)) return true;
    return false;
}

// catalog\index.json を読み込んで outJson（UTF-8データ）に格納
static bool LoadIndexJson(std::string& outJson) {
    std::wstring path = JoinPath(JoinPath(GetAppCatalogRoot(), L"catalog"), L"index.json");
    return ReadFileAll(path, outJson);
}

// installed.jsonと index.jsonを比較して更新リストを作成
static void ComputeUpdates() {
    // 1) index.jsonをダウンロードして保存
    DownloadIndexJsonTo();

    // 2) 読み込み
    std::string installedJson, indexJson;
    if (!LoadInstalledJson(installedJson)) {
        // installed.jsonが無い場合は更新判断せず
        g_Updates.clear();
        g_UpdateAvailable = false;
        return;
    }
    if (!LoadIndexJson(indexJson)) {
        // index.jsonが無い場合は更新判断せず
        g_Updates.clear();
        g_UpdateAvailable = false;
        return;
    }

    // 3) installed.jsonのIDをもとに、index.jsonに記載されている最新のバージョンを求める。
    auto installed = ParseInstalledJson(installedJson);
    std::vector<std::wstring> idsWanted;
    idsWanted.reserve(installed.size());
    for (const auto& kv : installed) idsWanted.push_back(kv.first);
    auto latestMap = ParseIndexLatestJsonFiltered(indexJson, idsWanted);

    // 4) 比較して更新があるものを抽出
    std::vector<UpdateEntry> result;
    for (const auto& kv : installed) {
        auto it = latestMap.find(kv.first);
        if (it == latestMap.end()) continue;
        if (it->second != kv.second) {
            UpdateEntry e;
            e.id = kv.first;
            e.installed = kv.second;
            e.latest = it->second;
            result.push_back(std::move(e));
        }
    }

    g_Updates = std::move(result);
    g_UpdateAvailable = !g_Updates.empty();
}

// ------------------------ メニュー操作 ------------------------

// 「更新」メニュー項目が既に存在するか判定
static bool HasUpdateItem(HMENU hMenu) {
    const int count = GetMenuItemCount(hMenu);
    for (int i = 0; i < count; ++i) {
        MENUITEMINFOW mii{sizeof(mii)};
        mii.fMask = MIIM_ID;
        if (GetMenuItemInfoW(hMenu, i, TRUE, &mii)) {
            if (mii.wID == ID_MENU_UPDATE) return true;
        }
    }
    return false;
}

// 状態フラグに応じてメニューのラベルとアイコンを適用
static void ApplyUpdateLabel(HWND hWnd) {
    HMENU hMenu = GetMenu(hWnd);
    if (!hMenu) return;
    // DPI に応じたアイコンを準備
    EnsureMenuIcons(hWnd);
    // 更新メニュー項目が無ければ追加
    if (!HasUpdateItem(hMenu)) {
        AppendMenuW(hMenu, MF_STRING | MF_ENABLED, ID_MENU_UPDATE, L"更新");
        ApplyUpdateLabel(hWnd);
        return;
    }
    // ラベルとアイコンを更新
    MENUITEMINFOW mii{sizeof(mii)};
    mii.fMask = MIIM_STRING | MIIM_BITMAP;
    const wchar_t* label = L"更新";
    HBITMAP hBitmap = nullptr;
    if (g_MenuReady) {
        if (g_UpdateAvailable) {
            label = L"更新";
            hBitmap = g_hBmpUpdateAvail;
        } else {
            label = L"更新";
            hBitmap = g_hBmpUpdateNone;
        }
    }
    mii.dwTypeData = const_cast<wchar_t*>(label);
    mii.hbmpItem = hBitmap;
    SetMenuItemInfoW(hMenu, ID_MENU_UPDATE, FALSE, &mii);
    DrawMenuBar(hWnd);
}

// 起動完了後にメニューの挿入とラベル更新
static void EnsureUpdateMenuIfReady(HWND hWnd) {
    if (!g_MenuReady) return;  // 起動直後は何もしない
    HMENU hMenu = GetMenu(hWnd);
    if (!hMenu) return;  // メニューなし
    // 追加とラベル更新
    // if (!HasUpdateItem(hMenu)) { // ここ必要か検討必要
    //     AppendMenuW(hMenu, MF_STRING | MF_ENABLED, ID_MENU_UPDATE, L"更新");
    //     ApplyUpdateLabel(hWnd);
    //     return;
    // }
    ApplyUpdateLabel(hWnd);
}

// ------------------------ 一覧ダイアログ ------------------------
// 文字列の前後の空白類を除去（一応）
static std::wstring Trim(const std::wstring& s) {
    size_t a = 0, b = s.size();
    while (a < b && iswspace(s[a])) ++a;
    while (b > a && iswspace(s[b - 1])) --b;
    return s.substr(a, b - a);
}

// 前後の二重引用符を除去
static std::wstring StripQuotes(const std::wstring& s) {
    if (s.size() >= 2 && s.front() == L'"' && s.back() == L'"') {
        return s.substr(1, s.size() - 2);
    }
    return s;
}

static std::wstring ToLower(const std::wstring& s) {
    std::wstring t = s;
    std::transform(t.begin(), t.end(), t.begin(), towlower);
    return t;
}

// 指定パスをコンソールなしで起動する（必要に応じてスクリプトも隠し起動）
static bool LaunchExternalNoConsole(const std::wstring& rawPath) {
    std::wstring path = StripQuotes(Trim(rawPath));
    if (path.empty()) return false;

    DWORD attr = GetFileAttributesW(path.c_str());
    if (attr != INVALID_FILE_ATTRIBUTES && (attr & FILE_ATTRIBUTE_DIRECTORY)) {
        // ディレクトリはエクスプローラーで開く（コンソールなし）
        HINSTANCE hr = ShellExecuteW(nullptr, L"open", path.c_str(), nullptr, nullptr, SW_SHOWNORMAL);
        return (INT_PTR)hr > 32;
    }

    // 拡張子によって起動方法を分岐
    std::wstring lower = ToLower(path);
    size_t dot = lower.find_last_of(L'.');
    std::wstring ext = (dot != std::wstring::npos) ? lower.substr(dot) : L"";

    // 作業ディレクトリ
    std::wstring workDir;
    size_t slash = path.find_last_of(L"/\\");
    if (slash != std::wstring::npos) workDir = path.substr(0, slash);

    if (ext == L".exe") {
        STARTUPINFOW si{};
        si.cb = sizeof(si);
        si.dwFlags = STARTF_USESHOWWINDOW;
        si.wShowWindow = SW_SHOWNORMAL;
        PROCESS_INFORMATION pi{};
        // applicationName に直接 exe を指定（引数なし）
        BOOL ok = CreateProcessW(path.c_str(), nullptr, nullptr, nullptr, FALSE,
                                 CREATE_NO_WINDOW, nullptr,
                                 workDir.empty() ? nullptr : workDir.c_str(),
                                 &si, &pi);
        if (ok) {
            CloseHandle(pi.hThread);
            CloseHandle(pi.hProcess);
            return true;
        }
        // 失敗したら ShellExecute にフォールバック
        HINSTANCE hr = ShellExecuteW(nullptr, L"open", path.c_str(), nullptr, workDir.empty() ? nullptr : workDir.c_str(), SW_SHOWNORMAL);
        return (INT_PTR)hr > 32;
    } else if (ext == L".bat" || ext == L".cmd") {
        wchar_t comspec[MAX_PATH] = L"";
        DWORD n = GetEnvironmentVariableW(L"COMSPEC", comspec, MAX_PATH);
        std::wstring cmdExe = (n > 0 && n < MAX_PATH) ? std::wstring(comspec) : std::wstring(L"C\\Windows\\System32\\cmd.exe");
        std::wstring cmdLine = L"/c \"" + path + L"\"";
        // 可変コマンドラインバッファ
        std::vector<wchar_t> cl(cmdLine.begin(), cmdLine.end());
        cl.push_back(L'\0');
        STARTUPINFOW si{};
        si.cb = sizeof(si);
        si.dwFlags = STARTF_USESHOWWINDOW;
        si.wShowWindow = SW_HIDE;
        PROCESS_INFORMATION pi{};
        BOOL ok = CreateProcessW(cmdExe.c_str(), cl.data(), nullptr, nullptr, FALSE,
                                 CREATE_NO_WINDOW, nullptr,
                                 workDir.empty() ? nullptr : workDir.c_str(),
                                 &si, &pi);
        if (ok) {
            CloseHandle(pi.hThread);
            CloseHandle(pi.hProcess);
            return true;
        }
        return false;
    } else if (ext == L".ps1") {
        // PowerShell スクリプトを隠れて実行
        std::wstring ps = L"C\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe";
        std::wstring cmdLine = L"-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File \"" + path + L"\"";
        std::vector<wchar_t> cl(cmdLine.begin(), cmdLine.end());
        cl.push_back(L'\0');
        STARTUPINFOW si{};
        si.cb = sizeof(si);
        si.dwFlags = STARTF_USESHOWWINDOW;
        si.wShowWindow = SW_HIDE;
        PROCESS_INFORMATION pi{};
        BOOL ok = CreateProcessW(ps.c_str(), cl.data(), nullptr, nullptr, FALSE,
                                 CREATE_NO_WINDOW, nullptr,
                                 workDir.empty() ? nullptr : workDir.c_str(),
                                 &si, &pi);
        if (ok) {
            CloseHandle(pi.hThread);
            CloseHandle(pi.hProcess);
            return true;
        }
        return false;
    } else {
        // その他は関連付けに任せる
        HINSTANCE hr = ShellExecuteW(nullptr, L"open", path.c_str(), nullptr, workDir.empty() ? nullptr : workDir.c_str(), SW_SHOWNORMAL);
        return (INT_PTR)hr > 32;
    }
}

// 1バイト文字が空白類か判定
static inline bool IsSpace(char c) {
    return c == ' ' || c == '\t' || c == '\r' || c == '\n' || c == '\f';
}

// JSON文字列からキーに対応する文字列値を取得（対応必要）
static bool JsonFindString(const std::string& json, const char* key, std::string& out) {
    // 探索: "key" の位置
    std::string token = std::string("\"") + key + "\"";
    size_t pos = json.find(token);
    if (pos == std::string::npos) return false;
    // ':' をスキップ
    size_t i = json.find(':', pos + token.size());
    if (i == std::string::npos) return false;
    // 空白スキップ
    ++i;
    while (i < json.size() && IsSpace(json[i])) ++i;
    if (i >= json.size() || json[i] != '"') return false;
    // 文字列抽出（エスケープ処理）
    ++i;
    std::string acc;
    while (i < json.size()) {
        // 必要なものだけ
        unsigned char ch = (unsigned char)json[i++];
        if (ch == '\\') {
            if (i >= json.size()) break;
            unsigned char esc = (unsigned char)json[i++];
            switch (esc) {
                case '"':
                    acc.push_back('"');
                    break;
                case '\\':
                    acc.push_back('\\');
                    break;
                case '/':
                    acc.push_back('/');
                    break;
                default:
                    acc.push_back((char)esc);
            }
        } else if (ch == '"') {
            out = std::move(acc);
            return true;
        } else {
            acc.push_back((char)ch);
        }
    }
    return false;
}

// setting.jsonからcatalogDirを読み取る
static int ReadCatalogExePath(std::wstring& outPath) {
    std::string data;
    if (!ReadFileAll(JoinPath(GetAppCatalogRoot(), L"settings.json"), data)) return 1;
    std::string valUtf8;
    if (!JsonFindString(data, "catalogDir", valUtf8)) return 2;
    outPath = Trim(U82W(valUtf8));
    return 0;
}

// 更新一覧の ListView にID/現在/最新を追加します。
static void InitListViewColumns(HWND hList) {
    // while (ListView_DeleteColumn(hList, 0)) {}// 初期化されるため必要なし
    const float s = GetUiScaleForHwnd(hList);
    LVCOLUMNW col{};
    col.mask = LVCF_TEXT | LVCF_WIDTH | LVCF_SUBITEM;
    col.pszText = const_cast<wchar_t*>(L"パッケージ ID");
    col.cx = ScalePx(300, s);
    col.iSubItem = 0;
    ListView_InsertColumn(hList, 0, &col);
    col.pszText = const_cast<wchar_t*>(L"現在のバージョン");
    col.cx = ScalePx(165, s);
    col.iSubItem = 1;
    ListView_InsertColumn(hList, 1, &col);
    col.pszText = const_cast<wchar_t*>(L"最新バージョン");
    col.cx = ScalePx(165, s);
    col.iSubItem = 2;
    ListView_InsertColumn(hList, 2, &col);
}

// 比較結果 を ListView の各行に反映
static void PopulateListView(HWND hList) {
    ListView_DeleteAllItems(hList);
    for (size_t i = 0; i < g_Updates.size(); ++i) {
        const auto& e = g_Updates[i];
        LVITEMW item{};
        item.mask = LVIF_TEXT;
        item.iItem = (int)i;
        item.pszText = const_cast<wchar_t*>(e.id.c_str());
        ListView_InsertItem(hList, &item);
        ListView_SetItemText(hList, (int)i, 1, const_cast<wchar_t*>(e.installed.c_str()));
        ListView_SetItemText(hList, (int)i, 2, const_cast<wchar_t*>(e.latest.c_str()));
    }
}

// ListView 列幅をクライアント幅に合わせて設定（DPIを考慮しつつ可変）
static void SetListViewColumnWidths(HWND hList, float s, int clientCX, int margin) {
    if (!hList) return;
    int contentW = clientCX - (margin * 2) - 4;  // 境界線分の余白
    // 比率: ID 55%, 現在 22.5%, 最新 22.5%
    int w0 = (contentW * 55) / 100;
    int w12 = (contentW - w0) / 2;
    int w1 = w12;
    int w2 = contentW - w0 - w1;  // 端数調整
    LVCOLUMNW col{};
    col.mask = LVCF_WIDTH;
    col.cx = w0;
    ListView_SetColumn(hList, 0, &col);
    col.cx = w1;
    ListView_SetColumn(hList, 1, &col);
    col.cx = w2;
    ListView_SetColumn(hList, 2, &col);
}

// ダイアログ用のフォントハンドルと、所有権を管理するためのグローバル変数
static HFONT g_hDlgFont = nullptr;
static bool g_hDlgFontOwned = false;

// ダイアログに使う既定のメッセージフォントを作成・取得
static HFONT CreateSystemMessageFont() {
    NONCLIENTMETRICSW ncm{};
    ncm.cbSize = sizeof(ncm);
    if (SystemParametersInfoW(SPI_GETNONCLIENTMETRICS, sizeof(ncm), &ncm, 0)) {
        HFONT h = CreateFontIndirectW(&ncm.lfMessageFont);
        if (h) {
            g_hDlgFontOwned = true;
            return h;
        }
    }
    g_hDlgFontOwned = false;
    return (HFONT)GetStockObject(DEFAULT_GUI_FONT);
}

// ダイアログを親ウィンドウの中央へ移動
static void CenterToParent(HWND hWnd, HWND hParent) {
    RECT rc{}, pr{};
    GetWindowRect(hWnd, &rc);
    int w = rc.right - rc.left;
    int h = rc.bottom - rc.top;
    if (hParent && GetWindowRect(hParent, &pr)) {
        int x = pr.left + ((pr.right - pr.left) - w) / 2;
        int y = pr.top + ((pr.bottom - pr.top) - h) / 2;
        SetWindowPos(hWnd, nullptr, x, y, 0, 0, SWP_NOSIZE | SWP_NOZORDER | SWP_NOACTIVATE);
    }
}

// ダイアログテンプレート用に4バイト境界へパディング
static void AlignDWORD(std::vector<BYTE>& buf) {
    while ((buf.size() & 3) != 0) buf.push_back(0);
}

// バッファ末尾に WORD 値をリトルエンディアンで書き込み
static void PushWORD(std::vector<BYTE>& buf, WORD v) {
    buf.push_back((BYTE)(v & 0xFF));
    buf.push_back((BYTE)((v >> 8) & 0xFF));
}

// Unicode 文字列を終端付き UTF-16LE としてバッファに追記
static void PushWStr(std::vector<BYTE>& buf, const wchar_t* s) {
    if (!s) {
        PushWORD(buf, 0);
        return;
    }
    while (*s) {
        PushWORD(buf, (WORD)*s++);
    }
    PushWORD(buf, 0);
}

// 更新一覧ダイアログの DLGTEMPLATE を生成
static std::vector<BYTE> BuildUpdateDlgTemplate() {
    // DLGTEMPLATE を生成
    std::vector<BYTE> buf;
    buf.resize(sizeof(DLGTEMPLATE));
    DLGTEMPLATE* dt = (DLGTEMPLATE*)buf.data();
    // 基本プロパティの設定
    dt->style = WS_CAPTION | WS_SYSMENU | DS_MODALFRAME;  // タイトルバー・システムメニュー・太めの枠（フォントを自分で設定したい場合は DS_SETFONT）
    dt->dwExtendedStyle = 0;
    dt->cdit = 0;  // 子コントロールは動的生成
    dt->x = 0;
    dt->y = 0;     // 初期位置
    dt->cx = 320;  // 幅(後に変更)
    dt->cy = 100;  // 高さ

    // menu = 0(メニューなし), class = 0, title = L"更新があるパッケージ"
    PushWORD(buf, 0);
    PushWORD(buf, 0);
    PushWStr(buf, L"更新が必要なパッケージ");

    // // フォント設定(全体)（設定せず）
    // PushWORD(buf, 10); // フォントのサイズ
    // PushWStr(buf, L"Segoe UI");

    AlignDWORD(buf);
    return buf;
}

// 更新一覧ダイアログのウィンドウプロシージャ（各種イベント処理）
static INT_PTR CALLBACK UpdateDlgProc(HWND hWnd, UINT msg, WPARAM wParam, LPARAM lParam) {
    static HWND s_hList = nullptr;  // 一覧表示用 ListView
    switch (msg) {
        // ダイアログを初期化
        case WM_INITDIALOG: {
            // クライアントの幅を取得
            RECT rc{};
            GetClientRect(hWnd, &rc);
            int cx = rc.right - rc.left;
            int cy = rc.bottom - rc.top;
            // スケール係数（DPI に応じて）
            const float s = GetUiScaleForHwnd(hWnd);
            // 共通コントロールを初期化
            INITCOMMONCONTROLSEX icc{sizeof(icc), ICC_LISTVIEW_CLASSES};
            InitCommonControlsEx(&icc);
            // レイアウト用（小さめ基準をDPIスケール）
            const int margin = ScalePx(8, s);
            const int spacing = ScalePx(8, s);       // ボタン間の隙間
            const int btnH = ScalePx(32, s);         // ボタンの高さ
            const int closeW = ScalePx(96, s);       // 閉じるボタンの幅
            const int minLaunchW = ScalePx(120, s);  // 起動ボタンの最小幅
            // 更新一覧の ListView を作成
            s_hList = CreateWindowExW(WS_EX_CLIENTEDGE, WC_LISTVIEWW, L"",
                                      WS_CHILD | WS_VISIBLE | LVS_REPORT | LVS_SINGLESEL | LVS_SHOWSELALWAYS,
                                      margin, margin, cx - (margin * 2), cy - (margin * 3) - btnH, hWnd, (HMENU)(INT_PTR)IDC_LISTVIEW, g_hInst, nullptr);
            ListView_SetExtendedListViewStyle(s_hList, LVS_EX_FULLROWSELECT | LVS_EX_GRIDLINES | LVS_EX_DOUBLEBUFFER);
            InitListViewColumns(s_hList);
            PopulateListView(s_hList);
            // ボタンを作成
            int launchX = margin;
            int launchW = cx - margin - spacing - closeW - margin;
            if (launchW < minLaunchW) launchW = minLaunchW;
            HWND hBtn = CreateWindowExW(0, L"BUTTON", L"AviUtl2 カタログを起動",
                                        WS_CHILD | WS_VISIBLE | WS_TABSTOP | BS_DEFPUSHBUTTON,
                                        launchX, cy - margin - btnH, launchW, btnH, hWnd, (HMENU)(INT_PTR)IDC_BTN_LAUNCH, g_hInst, nullptr);
            CreateWindowExW(0, L"BUTTON", L"閉じる",
                            WS_CHILD | WS_VISIBLE | WS_TABSTOP,
                            cx - margin - closeW, cy - margin - btnH, closeW, btnH, hWnd, (HMENU)IDCANCEL, g_hInst, nullptr);

            // ダイアログのフォントを子にも適用
            HFONT hFont = (HFONT)SendMessageW(hWnd, WM_GETFONT, 0, 0);
            if (!hFont) {
                if (!g_hDlgFont) g_hDlgFont = CreateSystemMessageFont();
                hFont = g_hDlgFont;
            }
            if (hFont) {
                SendMessageW(s_hList, WM_SETFONT, (WPARAM)hFont, TRUE);
                SendMessageW(hBtn, WM_SETFONT, (WPARAM)hFont, TRUE);
                SendMessageW(GetDlgItem(hWnd, IDCANCEL), WM_SETFONT, (WPARAM)hFont, TRUE);
            }

            // 列幅を現在のクライアント幅に合わせる
            SetListViewColumnWidths(s_hList, s, cx, margin);

            // 最小幅・最小高さの確保（極端に小さい場合のみ拡大）
            int minClientW = margin + minLaunchW + spacing + closeW + margin;
            int maxClientW = ScalePx(380, s);  // 初期の最大横幅
            int minListH = ScalePx(180, s);
            int minClientH = margin + minListH + margin + btnH + margin;
            int desiredClientW = cx;
            if (desiredClientW < minClientW) desiredClientW = minClientW;
            if (desiredClientW > maxClientW) desiredClientW = maxClientW;
            int desiredClientH = (cy < minClientH) ? minClientH : cy;
            if (desiredClientW != cx || desiredClientH != cy) {
                RECT adj{0, 0, desiredClientW, desiredClientH};
                DWORD style = (DWORD)GetWindowLongPtrW(hWnd, GWL_STYLE);
                DWORD exStyle = (DWORD)GetWindowLongPtrW(hWnd, GWL_EXSTYLE);
                AdjustWindowRectEx(&adj, style, FALSE, exStyle);
                RECT wr{};
                GetWindowRect(hWnd, &wr);
                int newW = adj.right - adj.left;
                int newH = adj.bottom - adj.top;
                SetWindowPos(hWnd, nullptr, 0, 0, newW, newH, SWP_NOMOVE | SWP_NOZORDER);
                // 幅が変わったので再度列幅を調整
                GetClientRect(hWnd, &rc);
                cx = rc.right - rc.left;
                SetListViewColumnWidths(s_hList, s, cx, margin);
            }

            // 親ウィンドウ中央へ配置
            CenterToParent(hWnd, (HWND)lParam);
            return TRUE;
        }
        case WM_SIZE: {
            // クライアントの幅を取得
            RECT rc{};
            GetClientRect(hWnd, &rc);
            int cx = rc.right - rc.left;
            int cy = rc.bottom - rc.top;
            // レイアウト用（スケール適用）
            const float s = GetUiScaleForHwnd(hWnd);
            const int margin = ScalePx(8, s);
            const int spacing = ScalePx(8, s);       // ボタン間の隙間
            const int btnH = ScalePx(32, s);         // ボタンの高さ
            const int closeW = ScalePx(96, s);       // 閉じるボタンの幅
            const int minLaunchW = ScalePx(120, s);  // 起動ボタンの最小幅
            // ListView をリサイズ
            if (s_hList) {
                MoveWindow(s_hList, margin, margin, cx - (margin * 2), cy - (margin * 3) - btnH, TRUE);
                // 列幅もクライアント幅に合わせて更新
                SetListViewColumnWidths(s_hList, s, cx, margin);
            }
            // ボタンをリサイズ/再配置
            int launchX = margin;
            int launchW = cx - margin - spacing - closeW - margin;
            if (launchW < minLaunchW) launchW = minLaunchW;
            MoveWindow(GetDlgItem(hWnd, IDC_BTN_LAUNCH), launchX, cy - margin - btnH, launchW, btnH, TRUE);
            MoveWindow(GetDlgItem(hWnd, IDCANCEL), cx - margin - closeW, cy - margin - btnH, closeW, btnH, TRUE);
            return TRUE;
        }
        case WM_DPICHANGED: {
            // DPI 変更の推奨矩形に合わせて位置・サイズを更新
            if (lParam) {
                RECT* prc = (RECT*)lParam;
                // 推奨サイズをベースに、最大横幅を超えないように調整
                const float s = GetScaleForHwnd(hWnd);
                int suggestedW = prc->right - prc->left;
                int suggestedH = prc->bottom - prc->top;
                // クライアントの最大幅（DPIに応じて）
                int maxClientW = ScalePx(380, s);
                // 現在のウィンドウスタイルのフレーム込みサイズへ変換
                RECT clientRect{0, 0, maxClientW, 100};
                DWORD style = (DWORD)GetWindowLongPtrW(hWnd, GWL_STYLE);
                DWORD exStyle = (DWORD)GetWindowLongPtrW(hWnd, GWL_EXSTYLE);
                AdjustWindowRectEx(&clientRect, style, FALSE, exStyle);
                int maxWindowW = clientRect.right - clientRect.left;
                if (suggestedW > maxWindowW) suggestedW = maxWindowW;
                SetWindowPos(hWnd, nullptr, prc->left, prc->top,
                             suggestedW, suggestedH,
                             SWP_NOZORDER | SWP_NOACTIVATE);
            }
            // 新 DPI に応じてフォントと列幅を再適用
            HFONT hFont = (HFONT)SendMessageW(hWnd, WM_GETFONT, 0, 0);
            if (!hFont) {
                if (!g_hDlgFont) g_hDlgFont = CreateSystemMessageFont();
                hFont = g_hDlgFont;
            }
            if (hFont) {
                if (s_hList) SendMessageW(s_hList, WM_SETFONT, (WPARAM)hFont, TRUE);
                HWND hBtn1 = GetDlgItem(hWnd, IDC_BTN_LAUNCH);
                if (hBtn1) SendMessageW(hBtn1, WM_SETFONT, (WPARAM)hFont, TRUE);
                HWND hBtn2 = GetDlgItem(hWnd, IDCANCEL);
                if (hBtn2) SendMessageW(hBtn2, WM_SETFONT, (WPARAM)hFont, TRUE);
            }
            const float s = GetUiScaleForHwnd(hWnd);
            RECT rc{};
            GetClientRect(hWnd, &rc);
            int cx = rc.right - rc.left;
            const int margin = ScalePx(8, s);
            SetListViewColumnWidths(s_hList, s, cx, margin);
            return TRUE;
        }
        case WM_COMMAND:
            // ボタン押したとき
            switch (LOWORD(wParam)) {
                case IDC_BTN_LAUNCH: {
                    std::wstring exePath;
                    int rc = ReadCatalogExePath(exePath);  // 0=成功,1=settings.jsonが無い,2=catalogDirが無い
                    if (rc == 1) {
                        MessageBoxW(hWnd, L"設定ファイル (settings.json) が見つかりません。\n%APPDATA%\\aviutl2-catalog\\settings.json を確認してください。",
                                    L"起動エラー", MB_OK | MB_ICONERROR | MB_TOPMOST);
                    } else if (rc == 2) {
                        MessageBoxW(hWnd, L"設定ファイルに catalogDir が見つかりません。",
                                    L"起動エラー", MB_OK | MB_ICONERROR | MB_TOPMOST);
                    } else {
                        if (!LaunchExternalNoConsole(exePath)) {
                            MessageBoxW(hWnd, L"AviUtl2 カタログを起動できませんでした。\nパスが正しいか、実行権限があるかをご確認ください。",
                                        L"起動エラー", MB_OK | MB_ICONERROR | MB_TOPMOST);
                        }
                    }
                    return TRUE;
                }
                case IDCANCEL:
                    // ダイアログを閉じる
                    EndDialog(hWnd, IDOK);
                    return TRUE;
            }
            break;
        case WM_CLOSE:
            // 閉じるボタン
            EndDialog(hWnd, IDOK);
            return TRUE;
    }
    return FALSE;
}

// 更新あるか判定
static void ShowUpdatesDialog(HWND hParent) {
    // 更新なし
    if (g_Updates.empty()) {
        MessageBoxW(hParent, L"現在、更新はありません。", L"AviUtl2 カタログ", MB_OK | MB_ICONINFORMATION | MB_SETFOREGROUND);
        return;
    }
    // 更新あり
    auto tmpl = BuildUpdateDlgTemplate();
    DialogBoxIndirectParam(g_hInst, (LPCDLGTEMPLATE)tmpl.data(), hParent, UpdateDlgProc, (LPARAM)hParent);
}

// ------------------- メインウィンドウのメニュー更新フック ---------------------
// メインウィンドウをサブクラス化してメニュー挿入・更新ダイアログ表示を差し込む
static LRESULT CALLBACK HookedWndProc(HWND hWnd, UINT msg, WPARAM wParam, LPARAM lParam) {
    switch (msg) {
        // メニューが表示される直前/メニューループに入った時点でフック
        case WM_INITMENU:
        case WM_ENTERMENULOOP:
            EnsureUpdateMenuIfReady(hWnd);
            break;
        // メニュー/コマンド処理
        case WM_COMMAND:
            if (LOWORD(wParam) == ID_MENU_UPDATE) {
                ShowUpdatesDialog(hWnd);
                return 0;
            }
            break;
        case WM_DPICHANGED:
            // メニューアイコンサイズを DPI に合わせて更新
            ApplyUpdateLabel(hWnd);
            break;
        // 起動完了後にメニューを適用
        case WM_APP_APPLY_MENU:
            EnsureUpdateMenuIfReady(hWnd);
            return 0;
    }
    return CallWindowProcW(g_OrigWndProc, hWnd, msg, wParam, lParam);
}

// 同一プロセス内でメニューを持つ可視ウィンドウを探索
static BOOL CALLBACK EnumWindowsProc(HWND hwnd, LPARAM lParam) {
    DWORD pid = 0;
    GetWindowThreadProcessId(hwnd, &pid);
    if (pid == GetCurrentProcessId() && IsWindowVisible(hwnd) && GetMenu(hwnd)) {
        *(HWND*)lParam = hwnd;
        return FALSE;
    }
    return TRUE;
}

// メインウィンドウを見つけてサブクラス化(最大5秒,50回試行)(対策必要)
static DWORD WINAPI InjectorThread(LPVOID) {
    for (int i = 0; i < 50; ++i) {
        HWND found = nullptr;
        EnumWindows(EnumWindowsProc, (LPARAM)&found);
        if (found) {
            g_MainWnd = found;
            g_OrigWndProc = (WNDPROC)SetWindowLongPtrW(g_MainWnd, GWLP_WNDPROC, (LONG_PTR)HookedWndProc);
            // 起動時は何も表示しない。結果が出たら WM_APP で適用する
            if (g_MenuReady) PostMessageW(g_MainWnd, WM_APP_APPLY_MENU, 0, 0);
            break;
        }
        Sleep(100);
    }
    return 0;
}

// バックグラウンドで更新情報を収集・比較
static DWORD WINAPI WorkerThread(LPVOID) {
    // 更新情報の取得と比較
    ComputeUpdates();
    // 完了後にメニュー表示を許可
    g_MenuReady = true;
    // メニューを更新
    if (g_MainWnd) PostMessageW(g_MainWnd, WM_APP_APPLY_MENU, 0, 0);
    return 0;
}

// ------------------------ 入力プラグイン スタブ ------------------------
static INPUT_PLUGIN_TABLE s_table = {
    INPUT_PLUGIN_TABLE::FLAG_VIDEO | INPUT_PLUGIN_TABLE::FLAG_AUDIO,
    L"AviUtl2 カタログ",                   // プラグインの名前
    L"*.*",                                // 入力ファイルフィルタ
    L"AviUtl2 カタログ UpdateChecker v2",  // プラグインの情報
};

// 入力プラグイン構造体を返す関数
EXTERN_C __declspec(dllexport) INPUT_PLUGIN_TABLE* GetInputPluginTable(void) {
    return &s_table;
}

// ------------------------ DLL エントリ ------------------------
BOOL WINAPI DllMain(HINSTANCE hinstDLL, DWORD fdwReason, LPVOID lpvReserved) {
    switch (fdwReason) {
        case DLL_PROCESS_ATTACH: {
            g_hInst = hinstDLL;
            // スレッド関連の通知を抑止
            DisableThreadLibraryCalls(hinstDLL);
            // バックグラウンド処理を開始
            HANDLE h1 = CreateThread(nullptr, 0, InjectorThread, nullptr, 0, nullptr);
            if (h1) CloseHandle(h1);
            HANDLE h2 = CreateThread(nullptr, 0, WorkerThread, nullptr, 0, nullptr);
            if (h2) CloseHandle(h2);
            break;
        }

        case DLL_PROCESS_DETACH: {
            // プロセス終了時
            if (lpvReserved == nullptr) {
                // サブクラス化を元に戻す
                if (g_MainWnd && g_OrigWndProc) {
                    SetWindowLongPtrW(g_MainWnd, GWLP_WNDPROC, (LONG_PTR)g_OrigWndProc);
                    g_MainWnd = nullptr;
                    g_OrigWndProc = nullptr;
                }
                // ダイアログ用フォントが自前作成なら破棄(一応)
                if (g_hDlgFont && g_hDlgFontOwned) {
                    DeleteObject(g_hDlgFont);
                    g_hDlgFont = nullptr;
                    g_hDlgFontOwned = false;
                }
                // メニューアイコンをクリーンアップ
                CleanupMenuIcons();
            }
            break;
        }
    }
    return TRUE;
}
