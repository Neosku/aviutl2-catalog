<h1 align="center">
  <img src="../src-tauri/icons/icon.svg" width="120"><br>
  AviUtl2 카탈로그
</h1>

<p align="center">
  AviUtl2 플러그인과 스크립트를<br>
  검색, 설치, 업데이트까지 한곳에서 관리할 수 있는 데스크톱 앱
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
  한국어 |
  <a href="./README.zh-CN.md">简体中文</a> |
  <a href="./README.zh-TW.md">繁體中文</a>
</p>

## 주요 기능

- 🚀 AviUtl2 본체와 권장 플러그인을 손쉽게 설치
- 📦 설치, 업데이트, 삭제를 원클릭으로 처리하고 일괄 업데이트도 지원
- 🔔 AviUtl2 본체, 플러그인 또는 스크립트에 업데이트가 있으면 AviUtl2 메뉴 바에 알림을 표시
- 🔍 패키지 검색 및 필터링
- 📋 니코니코 코먼즈 ID 일괄 복사
- 🧩 XXH3-128 해시를 사용해 설치된 패키지를 자동 감지
- 📨 패키지를 등록할 수 있으며, 심사 후 카탈로그에 게시

---

## 지원하는 다운로드 소스

현재 다음 다운로드 소스를 지원합니다.

- 직접 다운로드 URL
- GitHub Releases
- Google Drive
- BOOTH

---

## 앱 이미지

<table>
  <tr>
    <td><img src="./info1.png"><br>메인 화면</td>
    <td><img src="./info2.png"><br>패키지 상세</td>
  </tr>
  <tr>
    <td><img src="./info3.png"><br>업데이트 센터</td>
    <td><img src="./info4.png"><br>패키지 등록</td>
  </tr>
</table>

---

## 셋업 미리보기

이 앱에서는 AviUtl2 본체와 권장 플러그인의 셋업을 원클릭으로 진행할 수 있습니다.

<table>
  <tr>
    <td><img src="./setup1.png"><br>메인 화면</td>
    <td><img src="./setup2.png"><br>패키지 상세</td>
  </tr>
  <tr>
    <td><img src="./setup3.png"><br>업데이트 센터</td>
    <td><img src="./setup4.png"><br>패키지 등록</td>
  </tr>
</table>

---

## 화면 구성

- **패키지 목록**: 패키지 목록 표시, 검색, 필터/정렬
- **패키지 상세**: 패키지에 대한 자세한 설명
- **업데이트 센터**: 설치된 패키지의 업데이트를 한곳에서 관리
- **패키지 등록**: 새 패키지 등록 폼
- **피드백**: 버그 제보 / 의견 / 문의

## 카탈로그 데이터

- 패키지 등록은 앱 내부의 **패키지 등록** 메뉴를 이용해 주세요. 작성자가 아니어도 환영합니다.
- 카탈로그 데이터는 `aviutl2-catalog-data` 의 `index.json` 에 기록됩니다. GitHub Releases를 통해 배포되는 패키지에 한해 30분마다 자동으로 업데이트를 확인합니다.
  ([패키지 목록](https://github.com/Neosku/aviutl2-catalog-data/blob/main/%E3%83%91%E3%83%83%E3%82%B1%E3%83%BC%E3%82%B8.md))

---

## 딥 링크(앱 실행 링크)

커스텀 스킴 `aviutl2-catalog://` 로 앱을 실행하고 원하는 페이지를 바로 열 수 있습니다.  
링크를 열면 앱이 전면에 표시되고 해당 페이지로 이동합니다.

지원 경로:

- `aviutl2-catalog://` (홈)
- `aviutl2-catalog://updates` (업데이트 센터)
- `aviutl2-catalog://register` (패키지 등록)
- `aviutl2-catalog://package/<package-id>` (패키지 상세)

옵션:

- `aviutl2-catalog://package/<package-id>?install=true`  
  패키지 상세를 연 뒤, 아직 설치되지 않았다면 자동으로 설치를 시작합니다.

위에 없는 경로는 무시됩니다.

---

## 설치

### 수동 설치(권장)

1. https://github.com/Neosku/aviutl2-catalog/releases/latest 에서 최신 버전을 다운로드
2. 다운로드한 설치 파일(`.exe`)을 실행

### Winget

Winget 등록 또는 반영이 늦어질 수 있습니다. 최신 버전이 보이지 않으면 수동 설치를 이용해 주세요.

```powershell
winget install --id Neosku.AviUtl2-Catalog -e
```

## 업데이트

앱을 실행하면 업데이트가 있을 때 메시지가 표시됩니다. 안내에 따라 바로 업데이트할 수 있습니다.

---

## 라이선스

이 소프트웨어는 **MIT 라이선스**로 배포됩니다.
