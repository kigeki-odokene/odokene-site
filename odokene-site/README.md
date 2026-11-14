# ODOKENE / MIX依頼サイト（Ver.11）

既存のVer.9の見た目・文章をベースにしたAstro製のサイトです。

- HOME / SERVICE / PRICE / WORKS / FLOW / ABOUT / FAQ / CONTACT の8ページ
- `/admin/` の Decap CMSから文章、WORKS、料金データを編集
- GitHub OAuthのログイン用 `/auth` と `/callback` のCloudflare Pages Functions
- `/api/request/` のMIX依頼受付（Turnstile検証、Resendメール通知、Discord通知）
- デザインは既存のVer.9から変更せず、ロゴ02・OGP・ファビコンを同梱
- `src/data/pricing.json` から料金表示・概算計算・サーバー計算を共通化

**設定手順は `SETUP_GUIDE.md` を参照してください。**

```sh
npm install
npm run test
npm run build
npm run dev
```

現在はソースと自動テストの提供段階です。Astroのビルド、実際のGitHubログイン・メール送信・Discord通知は、アカウントと環境変数を設定してからの最終検証が必要です。秘密情報はGitHubに公開しないでください。
