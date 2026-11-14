# ODOKENE 公開と管理画面の設定ガイド

サイトデザインはVer.9に合わせています。今回追加したのは **料金の一元管理、GitHub OAuthの認証処理、フォームの検証テスト** です。

## 1. ローカルで確認

Node.js 20.11以降（推奨22）をインストールして、このフォルダで実行します。

```bash
npm install
npm run test
npm run build
npm run dev
```

`http://localhost:4321/` でサイトが開けます。※ `npm run dev` だけでは Cloudflare Pages Functions のフォーム送信処理は動きません。

## 2. GitHubとCloudflare Pages

1. GitHubに新規リポジトリを作成（例 `odokene-site`）。このフォルダの中身を登録します。
2. `public/admin/config.yml` を開き、`backend.repo` の `YOUR_GITHUB_NAME/odokene-site` を実際の所有者名とリポジトリ名へ変更します。
3. Cloudflare → **Workers & Pages** → **Pages** → **Connect to Git** を選び、このリポジトリを接続します。
4. Framework preset = `Astro`、Build command = `npm run build`、Build output directory = `dist` とします。ルートディレクトリはリポジトリのルートです。
5. 一度デプロイして `https://{your-project}.pages.dev` のURLを確認します。独自ドメインは後で追加できます。
6. `public/admin/config.yml` の `backend.base_url` を実際のページのオリジンに変更します（例 `https://{your-project}.pages.dev`）。**パスや末尾の `/` を追加しない**でください。
7. Build環境変数 `SITE_URL` を上記のURLに設定し、再デプロイします。独自ドメイン取得後は本番URLに変更してください。

## 3. `/admin/` のGitHubログイン

ソースには **Cloudflare Pages Functions** の `/auth` と `/callback` を同梱しています。別のOAuth用Workerは不要です。

1. GitHub → **Settings** → **Developer settings** → **OAuth Apps** → **New OAuth App** からアプリを作成します。
2. Homepage URL：サイトのURL（例 `https://{your-project}.pages.dev`）。Authorization callback URL：サイトURL＋`/callback`（例 `https://{your-project}.pages.dev/callback`）。
3. GitHubが発行したClient IDとClient SecretをCloudflare Pagesの **Settings → Variables and Secrets** に追加。Secretは暗号化して保存します。
4. 次の設定を追加します。

| 変数名 | 種別 | 値 |
|---|---|---|
| `CMS_SITE_ORIGIN` | 通常変数 | `https://{your-project}.pages.dev`（末尾スラッシュなし） |
| `GITHUB_CLIENT_ID` | 通常変数 | GitHub OAuth AppのClient ID |
| `GITHUB_CLIENT_SECRET` | Secret | GitHub OAuth AppのClient Secret |
| `CMS_ALLOWED_GITHUB_LOGIN` | 通常変数 | **自分のGitHubログイン名**（表示名でなくID） |
| `CMS_GITHUB_SCOPE` | 通常変数 | 公開リポジトリなら `public_repo`（省略可）。非公開なら `repo` |

5. 再デプロイし、`https://{your-project}.pages.dev/admin/` へアクセス → GitHubでログイン → 「文章の編集」「制作実績・表示順」「料金の数値」を確認します。

注意：OAuth Appの認可スコープは編集するリポジトリだけに限定されない場合があります。非公開リポジトリの `repo` スコープはGitHubアカウントの他の非公開リポジトリも対象になり得るため、内容を確認してから許可してください。OAuthログインは **CMS_ALLOWED_GITHUB_LOGIN** とリポジトリのGitHub権限の両方で制限しています。

独自ドメインに切り替えたら、GitHub OAuth Appのcallback URL、`CMS_SITE_ORIGIN`、`backend.base_url`、`SITE_URL` の4項目を同じ新しいサイトURLに合わせます。

## 4. 問い合わせフォーム：メール＋Discord

Cloudflareの無料枠での運用を想定しています。通知先のメールアドレスやWebhook URLをHTMLやGitHubの公開ソースに記載しないでください。

1. **Cloudflare Turnstile** でフォーム用サイトキーとシークレットキーを発行します。サイトを追加して実際のドメインを許可してください。
2. **Resend** でアカウントを作成し、メール送信元のドメインのDNS認証を完了してAPIキーを発行します。送信元は認証済みのドメインを使用する必要があります。
3. Discordの新規ODOKENE専用サーバーに非公開チャンネルを作り、チャンネル設定からWebhookを生成します。
4. Cloudflare Pagesの **Settings → Variables and Secrets** に以下を設定します。`PUBLIC_TURNSTILE_SITE_KEY` は**ビルド時に**必要です。

| 変数名 | 種別 | 値 |
|---|---|---|
| `PUBLIC_TURNSTILE_SITE_KEY` | 通常変数（ビルド） | Turnstile公開サイトキー |
| `TURNSTILE_SECRET_KEY` | Secret | Turnstileシークレットキー |
| `RESEND_API_KEY` | Secret | Resend APIキー |
| `RESEND_FROM` | 通常変数 | `ODOKENE <notify@送信元として認証済みのドメイン>` |
| `NOTIFY_EMAIL` | Secret | 指定済みの非公開通知先メールアドレス |
| `DISCORD_WEBHOOK_URL` | Secret | Discordの非公開Webhook URL |

5. 再デプロイし、`/contact/` から自分でテスト依頼を送信します。メールとDiscord **両方** に届くことを確認してください。
6. 連絡手段を「メール」「XのDM」それぞれで試し、スマートフォンからも動作を確認してください。通知先が携帯キャリアのメールの場合は、受信拒否・迷惑メール設定にも注意してください。

メール通知はResendの無料枠で始められますが、**送信ドメインの認証が必要**なため、独自ドメイン取得前に本番送信を有効化することはできません。利用量が無料枠を超える場合は課金が発生する可能性があります。

フォームは必要なサーバー設定が不足していると送信できず、XのDMへ案内するよう設計しています。Turnstileによるボット対策・入力値のサーバー側検証が入っています。通知処理に一部失敗した場合は、二重送信を避けるためXで確認するよう案内します。

## 5. 更新方法

- **文章**：`/admin/` → サイト管理 → **文章の編集（全ページ）**。HOME、SERVICE、PRICEの説明文、FLOW、ABOUT、FAQ、CONTACTなど。
- **制作実績**：`/admin/` → **制作実績・表示順**。YouTubeのURL、タイトル、担当範囲、TOPの注目作品、表示順を変更できます。
- **料金**：`/admin/` → **料金の数値**。トップページ・料金表・フォーム・サーバー見積もりが共通ファイルを参照します。*文章内に数字を直接書いた場所は別途文章編集が必要*です。

編集後に公開するとGitHubに保存され、Cloudflare Pagesが再ビルドします。再ビルドが終わった後に表示されます。

## 6. 公開前チェック

- [ ] `npm run build` 成功（PCとスマホで表示）
- [ ] `/admin/` にGitHubでログインでき、文章・作品を保存したら再デプロイされる
- [ ] `/contact/` からテスト送信でき、メールとDiscordの両方に届く
- [ ] 料金計算・XのDM誘導が正しい
- [ ] 作品サムネイルが表示でき、許可を得た作品のみ掲載している
- [ ] キャンセル規定、個人情報の取り扱い、商標、ドメインを最終確認
- [ ] ローカルやGitHubにシークレットキー・振込口座情報を書かない

## 現在の検証状況

- `node tests/check.mjs`：外部APIをモックしたフォーム送信・GitHub OAuth・入力エラー等のテストが通過。
- `public/admin/config.yml`：YAML解析と参照ファイルの存在確認が通過。
- **Astroの `npm install` / `npm run build`：この環境ではnpmレジストリへの接続ができず未実施。**
- **実際の外部送信・実アカウントログイン・Cloudflare上での運用：未検証。**

### 参考ドキュメント

- [Cloudflare Pages Functions](https://developers.cloudflare.com/pages/functions/)
- [Cloudflare Pages の Variables and Secrets](https://developers.cloudflare.com/pages/functions/bindings/)
- [Decap CMS / GitHub OAuth](https://decapcms.org/docs/backends-overview/)
- [Resend / ドメイン認証](https://resend.com/docs/dashboard/domains/introduction)
