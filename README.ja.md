# Kaleidoshare

ウェブ上でインタラクティブな万華鏡（kaleidoscope）のデザインを作成・共有できます。

![Kaleidoshare Demo](ogp.png)

## デモ

[**kaleidoshare.deno.dev でライブデモを見る**](https://kaleidoshare.deno.dev/)

## 機能

- **ライブエディター**: リアルタイムプレビューを見ながら、オリジナルの万華鏡をデザインできます。
- **豊富な設定オプション**: JSONベースの設定エディターを使用して、図形、色、物理演算、アニメーションをカスタマイズできます。
- **共有**: 作成した作品を保存し、固有のURLで共有できます。
- **パスワードレス認証**: WebAuthnベースのセキュアなユーザーアカウントで、パスワードを使わずにデザインを管理できます。
- **永続ストレージ**: ユーザーデータと万華鏡のデザインは Deno KV に保存されます。
- **自動テスト**: Playwrightを使用したエンドツーエンドテスト（Chromium向けに設定）が組み込まれています。

## 技術スタック

- **フロントエンド**: React, Vite, TypeScript, Monaco Editor, Matter.js
- **バックエンド**: Deno, Oak（Webフレームワーク）
- **データベース**: Deno KV
- **認証**: WebAuthn（`simplewebauthn` 経由）
- **テスト**: Playwright（フロントエンド）、Node.js Test Runner（バックエンド）
- **デプロイ**: GitHub Actions から Deno Deploy へ

## はじめに

### 前提条件

- [Node.js](https://nodejs.org/) >= v20
- [Deno](https://deno.land/) >= v1.32

### インストールとセットアップ

1.  **リポジトリのクローン:**
    ```bash
    git clone https://github.com/your-username/kaleidoshare.git
    cd kaleidoshare
    ```

2.  **依存関係のインストール:**
    ```bash
    npm ci
    ```

3.  **Playwright ブラウザのインストール:**
    ```bash
    npx playwright install --with-deps
    ```

### ローカルでの実行

Vite フロントエンドと、ホットリロード対応の Deno バックエンドを含む開発サーバーを起動します:

```bash
npm run dev
```

Vite が提供するURL（例: `http://localhost:5173`）をブラウザで開きます。バックエンドAPIはポート8000で実行され、自動的にプロキシされます。

## 利用可能なスクリプト

- `npm run dev`: フロントエンドとバックエンドの開発サーバーを起動します。
- `npm run build`: 本番用のフロントエンドをビルドし、データスキーマを生成します。
- `npm run preview`: ビルド済みのフロントエンドを本番用の Deno サーバーで提供します。
- `npm test`: バックエンドおよびフロントエンド（Playwright）のすべてのテストを実行します。

## API とデータモデル

バックエンドは Oak フレームワークを使用した Deno サーバーです。データは以下のキー構造で Deno KV に保存されます:

- `["contents", author, contentId]`: 万華鏡の `Content` メタデータを保存します。
- `["images", author, contentId, index]`: Deno KV の値のサイズ制限に対応するため、Base64エンコードされた万華鏡の画像をチャンク分割して保存します。
- `["users", userName]`: `User` 情報を保存します。
- `["credentials", credentialID]`: WebAuthn の `Credential` データを保存します。

主要なAPIエンドポイントは `/api/` 配下にあります:

- **認証**: `POST /credential/new`, `POST /session/new`, `GET /session`, `DELETE /session`
- **コンテンツ管理**:
  - `GET /contents/:author`: ユーザーのすべての作品を一覧表示します。
  - `POST /contents/:author`: 新しい万華鏡を作成します。
  - `GET /contents/:author/:contentId`: 特定の万華鏡を取得します。
  - `PUT /contents/:author/:contentId`: 既存の万華鏡を更新します。
  - `DELETE /contents/:author/:contentId`: 万華鏡を削除します。

## ライセンス

MIT License — 詳細は [LICENSE](LICENSE) を参照してください。
