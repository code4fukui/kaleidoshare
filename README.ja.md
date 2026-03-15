# Kaleidoshare

Web上でカレイドスコープを作成して共有しましょう。

## デモ
[https://kaleidoshare.deno.dev/](https://kaleidoshare.deno.dev/)

## 機能
- カレイドスコープの作成
- カレイドスコープの共有
- ユーザー認証

## 必要環境
- Node >= v20
- Deno >= v1.32 (KV用)

## 使い方
1. 依存関係をインストール
```
npm ci
npx playwright install --with-deps
```
2. 開発サーバを起動
```
npm run dev
```
3. ブラウザで [http://localhost:3000](http://localhost:3000) を開く

## ライセンス
MIT