<h1 align="center">
  <img src="../src-tauri/icons/icon.svg" width="120"><br>
  AviUtl2 Catalog
</h1>

<p align="center">
  A desktop app for managing AviUtl2 plugins and scripts in one place<br>
  from search and installation to updates
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
  English |
  <a href="./README.ko.md">한국어</a> |
  <a href="./README.zh-CN.md">简体中文</a> |
  <a href="./README.zh-TW.md">繁體中文</a>
</p>

## Key Features

- 🚀 Easily install AviUtl2 and recommended plugins
- 📦 Install, update, and remove packages with one click, including bulk updates
- 🔔 Receive notifications in the AviUtl2 menu bar when updates are available for AviUtl2, plugins, or scripts
- 🔍 Search and filter packages
- 📋 Copy Nico Nico Commons IDs in one batch
- 🧩 Automatically detect installed packages using XXH3-128 hashes
- 📨 Submit packages for review and publication in the catalog

---

## Supported Download Sources

The app currently supports the following download sources:

- Direct download URLs
- GitHub Releases
- Google Drive
- BOOTH

---

## App Preview

<table>
  <tr>
    <td><img src="./info1.png"><br>Main screen</td>
    <td><img src="./info2.png"><br>Package details</td>
  </tr>
  <tr>
    <td><img src="./info3.png"><br>Update Center</td>
    <td><img src="./info4.png"><br>Package submission</td>
  </tr>
</table>

---

## Setup Preview

This app can set up AviUtl2 and recommended plugins with a single click.

<table>
  <tr>
    <td><img src="./setup1.png"><br>Main screen</td>
    <td><img src="./setup2.png"><br>Package details</td>
  </tr>
  <tr>
    <td><img src="./setup3.png"><br>Update Center</td>
    <td><img src="./setup4.png"><br>Package submission</td>
  </tr>
</table>

---

## Screen Layout

- **Package List**: Browse packages, search, and filter/sort
- **Package Details**: View detailed package information
- **Update Center**: Manage updates for installed packages in one place
- **Package Submission**: Submit new packages through the form
- **Feedback**: Report bugs, share feedback, or contact us

## Catalog Data

- Please use **Package Submission** in the app to submit packages. Contributions from non-authors are very welcome.
- Catalog data is stored in `index.json` of `aviutl2-catalog-data`. Updates are checked automatically every 30 minutes for packages distributed via GitHub Releases.
  ([Package List](https://github.com/Neosku/aviutl2-catalog-data/blob/main/%E3%83%91%E3%83%83%E3%82%B1%E3%83%BC%E3%82%B8.md))

---

## Deep Links

You can launch the app with the custom scheme `aviutl2-catalog://` and open a page directly.  
When a link is opened, the app comes to the foreground and navigates to the corresponding page.

Supported paths:

- `aviutl2-catalog://` (Home)
- `aviutl2-catalog://updates` (Update Center)
- `aviutl2-catalog://register` (Package Submission)
- `aviutl2-catalog://package/<package-id>` (Package Details)

Options:

- `aviutl2-catalog://package/<package-id>?install=true`  
  Opens the package details page and automatically starts installation if the package is not installed yet.

Paths other than those above are ignored.

---

## Installation

### Manual (Recommended)

1. Download the latest version from https://github.com/Neosku/aviutl2-catalog/releases/latest
2. Run the downloaded installer (`.exe`)

### Winget

Winget publication or propagation may lag behind. If the latest version does not appear, please use manual installation.

```powershell
winget install --id Neosku.AviUtl2-Catalog -e
```

## Updates

When you launch the app, a message appears if an update is available. You can update it directly by following the on-screen guidance.

---

## License

This software is released under the **MIT License**.
