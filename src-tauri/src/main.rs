// リリースビルド時に Windows 用のコンソール画面を非表示にする
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // メイン処理をライブラリ側の run 関数に委譲する
    aviutl2_catalog::run();
}
