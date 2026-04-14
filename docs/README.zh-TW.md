<h1 align="center">
  <img src="../src-tauri/icons/icon.svg" width="120"><br>
  AviUtl2 目錄
</h1>

<p align="center">
  一款可集中管理 AviUtl2 外掛與腳本的桌面應用程式<br>
  支援搜尋、安裝與更新
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Windows-Only-0078D6">
  <a href="https://github.com/Neosku/aviutl2-catalog/releases/latest">
    <img src="https://img.shields.io/github/v/release/Neosku/aviutl2-catalog">
  </a>
  <img src="https://img.shields.io/winget/v/Neosku.AviUtl2-Catalog">
  <a href="https://github.com/Neosku/aviutl2-catalog/releases/latest">
    <img src="https://img.shields.io/github/downloads/Neosku/aviutl2-catalog/total">
  </a>
  <img src="https://img.shields.io/github/license/Neosku/aviutl2-catalog">
  <img src="https://img.shields.io/github/last-commit/Neosku/aviutl2-catalog">
</p>

<p align="center">
  <a href="../README.md">日本語</a> |
  <a href="./README.en.md">English</a> |
  <a href="./README.ko.md">한국어</a> |
  <a href="./README.zh-CN.md">简体中文</a> |
  繁體中文
</p>

## 主要功能

- 🚀 輕鬆安裝 AviUtl2 主程式與推薦外掛
- 📦 一鍵完成安裝、更新、刪除，並支援批次更新
- 🔔 當 AviUtl2 主程式、外掛或腳本有更新時，會在 AviUtl2 功能表列顯示通知
- 🔍 搜尋並篩選套件
- 📋 批次複製 Nico Nico Commons ID
- 🧩 使用 XXH3-128 雜湊自動偵測已安裝套件
- 📨 支援提交套件，經審核後收錄至目錄

---

## 支援的下載來源

目前支援以下下載來源：

- 直接下載 URL
- GitHub Releases
- Google Drive
- BOOTH

---

## 應用程式預覽

<table>
  <tr>
    <td><img src="./info1.png"><br>主畫面</td>
    <td><img src="./info2.png"><br>套件詳細資訊</td>
  </tr>
  <tr>
    <td><img src="./info3.png"><br>更新中心</td>
    <td><img src="./info4.png"><br>套件提交</td>
  </tr>
</table>

---

## 安裝示意

本應用程式可一鍵完成 AviUtl2 主程式與推薦外掛的安裝與設定。

<table>
  <tr>
    <td><img src="./setup1.png"><br>主畫面</td>
    <td><img src="./setup2.png"><br>套件詳細資訊</td>
  </tr>
  <tr>
    <td><img src="./setup3.png"><br>更新中心</td>
    <td><img src="./setup4.png"><br>套件提交</td>
  </tr>
</table>

---

## 畫面構成

- **套件列表**：顯示套件列表，支援搜尋、篩選與排序
- **套件詳細資訊**：查看套件的詳細說明
- **更新中心**：集中管理已安裝套件的更新
- **套件提交**：提交新套件的表單
- **回饋**：回報問題、提供意見或聯絡我們

## 目錄資料

- 請使用應用程式內的 **套件提交** 功能提交套件。非常歡迎非作者使用者一起參與。
- 目錄資料記錄於 `aviutl2-catalog-data` 的 `index.json`。對於透過 GitHub Releases 發佈的套件，應用程式會每 30 分鐘自動檢查更新。
  ([套件列表](https://github.com/Neosku/aviutl2-catalog-data/blob/main/%E3%83%91%E3%83%83%E3%82%B1%E3%83%BC%E3%82%B8.md))

---

## Deep Link（應用程式啟動連結）

可使用自訂協定 `aviutl2-catalog://` 啟動應用程式並直接開啟指定頁面。  
開啟連結後，應用程式會切換到前景並跳轉至對應頁面。

支援的路徑：

- `aviutl2-catalog://`（首頁）
- `aviutl2-catalog://updates`（更新中心）
- `aviutl2-catalog://register`（套件提交）
- `aviutl2-catalog://package/<package-id>`（套件詳細資訊）

選項：

- `aviutl2-catalog://package/<package-id>?install=true`  
  開啟套件詳細資訊頁面後，若該套件尚未安裝，則會自動開始安裝。

上述以外的路徑會被忽略。

---

## 安裝

### 手動安裝（推薦）

1. 從 https://github.com/Neosku/aviutl2-catalog/releases/latest 下載最新版本
2. 執行下載好的安裝程式（`.exe`）

### Winget

Winget 的收錄或同步可能會有延遲。若未顯示最新版本，請改用手動安裝。

```powershell
winget install --id Neosku.AviUtl2-Catalog -e
```

## 更新

啟動應用程式時，如果有可用更新會顯示提示訊息。依照畫面指示即可直接更新。

---

## 授權

本軟體以 **MIT 授權** 釋出。
