<!--
  OmniPost — README

  Built to be read top-to-bottom but skimmable. Every section is collapsible
  so you can pop open just the parts you need. The hero banner and fan-out
  diagram are animated SVGs that render natively on GitHub.
-->

<div align="center">

<img src="./assets/banner.svg" alt="OmniPost — one post, every platform, zero compromise" width="100%" />

<br/>

<!-- Primary badges -->
<a href="#license"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-22c55e?style=for-the-badge&labelColor=08080d"/></a>
<a href="#quick-start"><img alt="Node 20+" src="https://img.shields.io/badge/node-%E2%89%A520-7c3aed?style=for-the-badge&labelColor=08080d&logo=nodedotjs"/></a>
<a href="#tech-stack"><img alt="TypeScript" src="https://img.shields.io/badge/typescript-5.6-3178C6?style=for-the-badge&labelColor=08080d&logo=typescript"/></a>
<a href="#testing"><img alt="65 tests passing" src="https://img.shields.io/badge/tests-65%20passing-22c55e?style=for-the-badge&labelColor=08080d"/></a>
<a href="#-demo-mode"><img alt="Demo mode" src="https://img.shields.io/badge/demo-mock--mode-f472b6?style=for-the-badge&labelColor=08080d"/></a>

<br/>

<!-- Stack badges -->
<img alt="Next.js" src="https://img.shields.io/badge/Next.js-15-000000?style=flat-square&logo=nextdotjs&logoColor=fff"/>
<img alt="NestJS" src="https://img.shields.io/badge/NestJS-10-E0234E?style=flat-square&logo=nestjs&logoColor=fff"/>
<img alt="Fastify" src="https://img.shields.io/badge/Fastify-4-000000?style=flat-square&logo=fastify&logoColor=fff"/>
<img alt="Prisma" src="https://img.shields.io/badge/Prisma-5-2D3748?style=flat-square&logo=prisma&logoColor=fff"/>
<img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=fff"/>
<img alt="Redis" src="https://img.shields.io/badge/Redis-7-DC382D?style=flat-square&logo=redis&logoColor=fff"/>
<img alt="BullMQ" src="https://img.shields.io/badge/BullMQ-5-CD0014?style=flat-square"/>
<img alt="FFmpeg" src="https://img.shields.io/badge/FFmpeg-007808?style=flat-square&logo=ffmpeg&logoColor=fff"/>
<img alt="AWS S3" src="https://img.shields.io/badge/AWS%20S3-MinIO-FF9900?style=flat-square&logo=amazons3&logoColor=fff"/>
<img alt="Tailwind" src="https://img.shields.io/badge/Tailwind-3-38BDF8?style=flat-square&logo=tailwindcss&logoColor=fff"/>
<img alt="Framer Motion" src="https://img.shields.io/badge/Framer%20Motion-11-EF008F?style=flat-square&logo=framer&logoColor=fff"/>

<br/><br/>

<!-- Section quick-nav -->
<p>
  <a href="#-what-is-omnipost"><kbd>✨ what is it</kbd></a>&nbsp;
  <a href="#-demo-mode"><kbd>🎬 60-sec demo</kbd></a>&nbsp;
  <a href="#-architecture"><kbd>🏗️ architecture</kbd></a>&nbsp;
  <a href="#-features"><kbd>🧬 features</kbd></a>&nbsp;
  <a href="#-platform-adapters"><kbd>🔌 adapters</kbd></a>&nbsp;
  <a href="#-api-surface"><kbd>📡 api</kbd></a>&nbsp;
  <a href="#-security"><kbd>🔒 security</kbd></a>&nbsp;
  <a href="#-contributing"><kbd>🤝 contribute</kbd></a>
</p>

</div>

---

## ✨ What is OmniPost?

**OmniPost is the open-source publishing engine your team would build if they had three months.**
Submit one media asset + caption, and OmniPost intelligently transcodes, chunk-uploads, and
fans-out the post to YouTube (Shorts/Videos), Instagram (Reels/Posts), Facebook (Reels/Pages),
and X (Twitter) — asynchronously, idempotently, and with a strict dead-letter queue so one
platform's outage never blocks the rest.

It's not a wrapper. It's a complete monorepo: Next.js dashboard, NestJS+Fastify API gateway,
BullMQ worker with FFmpeg-powered media adaptation, Prisma+Postgres for state, Redis for rate
limits and queues, AES-256-GCM for at-rest tokens. **MIT licensed, BYO database, BYO S3.**

<table align="center">
<tr>
<td align="center" width="33%">

### 🪞 Smart Aspect-Ratio Guard
Horizontal video → Reels?<br/>
We render a **blurred-background pad** with FFmpeg instead of rejecting the file.

</td>
<td align="center" width="33%">

### 📦 Chunked Resumable Uploads
Files > 100 MB switch to **S3 presigned multipart** automatically.<br/>
Network drop → resume from the last completed part.

</td>
<td align="center" width="33%">

### 🛡️ Strict DLQ + Backoff
Each platform delivery is **isolated**.<br/>
Failures retry with exponential backoff + full jitter; YouTube down never blocks X.

</td>
</tr>
</table>

<details>
<summary><b>🆚 Why not just use Buffer / Hootsuite / upload-post.com?</b> <i>(click to expand)</i></summary>

<br/>

|                          | OmniPost                                    | Typical SaaS scheduler                                     |
|--------------------------|---------------------------------------------|------------------------------------------------------------|
| **Source code**          | All of it. MIT.                             | Closed.                                                    |
| **Where your tokens live** | Your DB, AES-256-GCM encrypted, your key  | Their DB, their key, their ops team                        |
| **Wrong aspect ratio**   | Auto-padded with blurred background         | Rejected with a 400, you fix it                            |
| **Large files**          | S3 multipart, resumable                     | Often capped at 200–500 MB; full re-upload on failure      |
| **One platform fails**   | Other three publish anyway, failed one DLQs | Often blocks the whole post; manual retry                  |
| **Real error bodies**    | Stored verbatim in `lastErrorBody` (scrubbed) | Generic "publish failed" toast                           |
| **Self-host**            | `docker compose up`                          | Not an option                                              |
| **Cost at 10k posts/mo** | Your S3 + RDS bill (~$30)                   | $99–$299 / month, per seat                                 |

</details>

---

## 🎬 Demo mode

**Want to try it in 60 seconds without a Google Cloud account?** Two commands. That's it.

```bash
pnpm setup     # generates secrets, starts Docker, syncs the DB, seeds a demo user
pnpm dev       # api :4000 · worker · web :3000 — all in one terminal
```

That's genuinely all. `pnpm setup` is **idempotent and fail-safe** — it:

- generates `OMNIPOST_DATA_KEY` + `JWT_SECRET` for you (never overwrites real values),
- **auto-starts Docker Desktop** if it's installed but not running,
- waits for Postgres / Redis / MinIO to be healthy (with retries),
- bundles `ffmpeg` + `ffprobe` binaries — **no system install required**,
- syncs the schema and seeds a demo account,
- and prints a clear summary of anything it couldn't finish (e.g. "start Docker, then re-run").

> Don't have `pnpm`? `corepack enable` first. Run `pnpm doctor` any time for a
> read-only environment health check.

Then sign in:

<table>
<tr>
<td>

**Dashboard**: <kbd>http://localhost:3000/login</kbd>
**Email**: <kbd>demo@omnipost.dev</kbd>
**Password**: <kbd>correct-horse-battery-staple</kbd>

</td>
<td>

**API key**: <kbd>op_live_demo_kEy_AbCdEf0123456789xyz</kbd>
Use as `Authorization: Bearer <key>`
**Connected**: YouTube · Instagram · Facebook · X *(mock)*

</td>
</tr>
</table>

> [!TIP]
> Set `MOCK_FAILURE_RATE=0.2` in `.env` to make 20% of publishes fail with a transient
> 5xx — you'll watch the DLQ + exponential backoff actually fire on the dashboard.

<details>
<summary><b>📜 Full curl demo flow</b></summary>

```bash
# 1. Mint a presigned upload URL
curl -X POST http://localhost:4000/v1/media/upload-intent \
  -H "Authorization: Bearer op_live_demo_kEy_AbCdEf0123456789xyz" \
  -H "Content-Type: application/json" \
  -d '{"filename":"clip.mp4","mimeType":"video/mp4","sizeBytes":1024000}'

# 2. PUT your video at the returned `url`
curl -T ./clip.mp4 "<presigned url>"

# 3. Submit the post — worker fans out to all four mock platforms
curl -X POST http://localhost:4000/v1/posts \
  -H "Authorization: Bearer op_live_demo_kEy_AbCdEf0123456789xyz" \
  -H "Content-Type: application/json" \
  -d '{
    "caption":"Hello from OmniPost",
    "mediaS3Key":"<the key from upload-intent>",
    "mediaMimeType":"video/mp4",
    "targetPlatforms":["YOUTUBE","INSTAGRAM","FACEBOOK","X"]
  }'

# 4. Refresh the dashboard — watch status flow QUEUED → PROCESSING → COMPLETED
```

</details>

---

## 🏗️ Architecture

<div align="center">

<img src="./assets/fanout.svg" alt="One upload fans out to four platforms via a BullMQ worker" width="100%"/>

</div>

```mermaid
%%{init: {'theme':'dark', 'themeVariables': {
  'primaryColor':'#1a1a26',
  'primaryTextColor':'#e9e9f1',
  'primaryBorderColor':'#7c3aed',
  'lineColor':'#a78bfa',
  'tertiaryColor':'#0d0d14'
}}}%%
flowchart LR
    subgraph Client["🌐 Client"]
        UI["Next.js Dashboard"]
        SDK["Your App<br/>(API key)"]
    end

    subgraph API["⚙️ API Gateway (NestJS + Fastify)"]
        AUTH["JWT · ApiKeyGuard"]
        MEDIA["/media/upload-intent<br/>(S3 presigned)"]
        POSTS["/posts"]
        OAUTH["/oauth/:platform"]
    end

    subgraph Storage["💾 Storage"]
        PG[("PostgreSQL<br/>Prisma")]
        REDIS[("Redis<br/>BullMQ · throttler · OAuth state")]
        S3[("S3 / MinIO<br/>media bucket")]
    end

    subgraph Worker["🔧 Worker (BullMQ)"]
        PROBE["ffprobe"]
        PAD["smart-pad<br/>(FFmpeg)"]
        YT["YouTubeAdapter"]
        IG["MetaAdapter (IG)"]
        FB["MetaAdapter (FB)"]
        X["XAdapter"]
        DLQ["DLQ scanner<br/>(CAS claim)"]
    end

    UI --> AUTH
    SDK --> AUTH
    AUTH --> MEDIA
    AUTH --> POSTS
    AUTH --> OAUTH
    MEDIA --> S3
    POSTS --> PG
    POSTS --> REDIS
    OAUTH --> REDIS
    OAUTH --> PG

    REDIS -->|jobs| PROBE
    PROBE --> PAD
    PAD --> YT
    PAD --> IG
    PAD --> FB
    PAD --> X
    PG -.->|read tokens| Worker
    YT -.publish.-> Y[YouTube]
    IG -.publish.-> I[Instagram]
    FB -.publish.-> F[Facebook]
    X -.publish.-> XX[X]
    DLQ -->|requeue| REDIS

    classDef ext fill:#0d0d14,stroke:#444,color:#a3a3b2
    class Y,I,F,XX ext
```

<details>
<summary><b>🧭 Repository layout</b></summary>

```text
OmniPost/
├── apps/
│   ├── api/                NestJS + Fastify gateway
│   │   └── src/
│   │       ├── modules/    auth · api-keys · media · posts · social-accounts · health
│   │       ├── common/     logger · env · interceptor · request-context · filters
│   │       └── scripts/    seed-demo.ts
│   ├── worker/             BullMQ processor
│   │   └── src/
│   │       ├── adapters/   base · youtube · meta · x · mock
│   │       ├── media/      ffprobe · smart-pad
│   │       ├── processor.ts · dlq-scanner.ts · backoff.ts · oauth-refresh.ts
│   │       └── error-sanitize.ts
│   └── web/                Next.js 15 dashboard + landing page
│       └── src/
│           ├── app/        (App Router: /, /login, /register, /dashboard/*)
│           └── components/ landing/* · ui/* · Logo.tsx
├── packages/
│   ├── db/                 Prisma schema + singleton client
│   ├── crypto/             AES-256-GCM token encryption + tests
│   └── types/              shared Zod DTOs
├── assets/                 README art (banner.svg, fanout.svg)
├── docker-compose.yml      Postgres 16 · Redis 7 · MinIO
└── turbo.json
```

</details>

---

## 🧬 Features

Every section below shows the *idea*, the *implementation*, and a link straight to the code.

<details>
<summary><b>🪞 Smart Aspect-Ratio Guard</b> — never get rejected for the wrong shape</summary>

<br/>

**Idea.** A horizontal 16:9 clip headed for Instagram Reels would normally be rejected outright.
We instead render a Spotify-style **blurred background** of the source itself, then overlay the
fit-contained original on top. Reach goes up, subject stays centered.

**Algorithm** ([smart-pad.ts](apps/worker/src/media/smart-pad.ts)):

```
[ source ] ─┬─► scale-to-cover + crop + gblur(σ=18) ─┐
            │                                        ├─► overlay center → [ output 9:16 H.264 / yuv420p ]
            └─► scale-to-fit (letterbox) ────────────┘
```

**Tolerance.** Aspect ratio decisions live in `decideShape()`. Within 3% of the target → pass-through.
Beyond 3% → trigger the filter graph. YouTube specifically: <60s + vertical → 9:16 Shorts, otherwise → 16:9 longform.

**Tested:** `decideShape` is unit-tested in [`smart-pad.spec.ts`](apps/worker/src/media/smart-pad.spec.ts) across 5 ratios and durations.

</details>

<details>
<summary><b>📦 Chunked Resumable Uploads</b> — 5 GB videos shouldn't be scary</summary>

<br/>

**Idea.** Files over 100 MiB never proxy through our API. The client gets a bundle of
**presigned multipart URLs** and PUTs the parts directly to S3 (or MinIO locally). If the
laptop's wifi dies mid-upload, the client resumes from the next unsent part — no re-encode,
no API-side state.

**Flow** ([s3.service.ts](apps/api/src/modules/media/s3.service.ts)):

```mermaid
%%{init: {'theme':'dark'}}%%
sequenceDiagram
    autonumber
    participant C as Client
    participant A as OmniPost API
    participant S as S3 / MinIO

    C->>A: POST /v1/media/upload-intent (size, mime)
    alt size < 100 MiB
        A->>S: createSingleUploadPresign
        A-->>C: { kind:"single", url }
        C->>S: PUT object
    else size ≥ 100 MiB
        A->>S: CreateMultipartUpload
        A->>S: presignUploadPart × N
        A-->>C: { kind:"multipart", uploadId, partUrls[] }
        loop each part (16 MiB)
            C->>S: PUT part
            S-->>C: ETag
        end
        C->>A: POST /v1/media/multipart/complete { uploadId, parts[] }
        A->>S: CompleteMultipartUpload
    end
```

**Safety.** Every key is namespaced `u/<userId>/...`. Complete-and-abort endpoints reject keys
outside the caller's prefix with `403 Forbidden`. The MIME type is allowlisted (`video/*`,
`image/*`) to prevent presigned-PUT XSS via `text/html`.

</details>

<details>
<summary><b>🛡️ Strict DLQ + Exponential Backoff (full jitter)</b></summary>

<br/>

**Idea.** Each post becomes *N* delivery rows (one per target platform). A failure on Meta
**never blocks YouTube**. Retries are owned by our DB, not BullMQ's internal retry counter, so
every retry decision is auditable from the dashboard.

**Backoff formula** ([backoff.ts](apps/worker/src/backoff.ts)):

```
delay = random_between(0, min(cap, base · 2^attempt))     // AWS "full jitter"
base  = 5 s        cap = 1 h        maxAttempts = 8
```

After `maxAttempts`, the row transitions to `DEAD_LETTER`. The user can replay it from the UI.

**DLQ scanner** ([dlq-scanner.ts](apps/worker/src/dlq-scanner.ts)) — race-free even with multiple
worker replicas:

```ts
// Atomic conditional CAS — only the worker whose update returns count===1 owns the row.
const claim = await prisma.postPlatformDeliveryLog.updateMany({
  where: { id, status: 'PENDING' },
  data:  { status: 'UPLOADING' },
});
if (claim.count !== 1) continue;     // another scanner got there first
```

</details>

<details>
<summary><b>🔑 At-rest token encryption (AES-256-GCM)</b></summary>

<br/>

Every OAuth `accessToken` / `refreshToken` is stored as versioned authenticated ciphertext:

```
v1:<iv_b64>:<authTag_b64>:<ciphertext_b64>
```

* AES-256-GCM with 12-byte random IV per encryption (no IV reuse).
* `authTag` verified on read — tampered ciphertexts **throw**, not silent-decrypt.
* Master key supplied via `OMNIPOST_DATA_KEY` env, 32 random bytes base64-encoded.
* Versioned prefix means we can rotate keys without re-encrypting in place.

See [`packages/crypto`](packages/crypto/src/index.ts). Round-trip, tamper-detect, malformed-input, and
wrong-key paths are all unit-tested.

</details>

<details>
<summary><b>🔄 OAuth refresh on 401</b></summary>

<br/>

Every adapter sets `AdapterError.isAuthError = true` when the upstream returns a 401-class
response (or for Meta, error code 190/463). The worker catches that flag *exactly once*,
calls the provider's refresh-token grant, re-encrypts and persists the new pair, then retries
the publish. If refresh itself fails, the SocialAccount transitions to `EXPIRED` and a
non-retryable `oauth.refresh_failed` is surfaced.

```ts
// apps/worker/src/processor.ts
async function publishWithAuthRefresh(opts) {
  try { return await opts.adapter.publish(opts.ctx); }
  catch (err) {
    if (!(err instanceof AdapterError) || !err.isAuthError) throw err;
    const fresh = await refreshAccessToken(opts.platform, opts.ctx.refreshToken!);
    await persistFreshTokens(fresh);
    return opts.adapter.publish({ ...opts.ctx, accessToken: fresh.accessToken });
  }
}
```

</details>

<details>
<summary><b>🪪 Signed OAuth state + S256 PKCE</b></summary>

<br/>

* `state` = `<nonce>.<HMAC-SHA256(JWT_SECRET, nonce)>` — single-use, 10 min TTL in Redis (`GETDEL`).
* X uses real **S256 PKCE**: random 48-byte verifier → `sha256` → base64url challenge.
* Replay and tampering both return `401`. Tested in [`oauth-state.service.spec.ts`](apps/api/src/modules/social-accounts/oauth-state.service.spec.ts).

</details>

---

## 🔌 Platform adapters

Native upload protocol per platform — no generic shims. Each adapter speaks the exact
publishing dance the API expects and surfaces real platform error codes.

<table>
<tr>
<td width="25%" align="center">

### ▶️ YouTube
<sub>Data API v3 · resumable</sub>
<br/><br/>
Shorts/longform auto-detected.<br/>
`#Shorts` appended when ≤60s + vertical.<br/>
Resumable session URL → PUT.<br/>
<br/>
<a href="apps/worker/src/adapters/youtube.ts"><code>youtube.ts</code></a>

</td>
<td width="25%" align="center">

### ◎ Instagram
<sub>Graph API v21 · REELS</sub>
<br/><br/>
Container → poll → publish.<br/>
Permalink fetched after publish.<br/>
Page access token from connect.<br/>
<br/>
<a href="apps/worker/src/adapters/meta.ts"><code>meta.ts</code></a>

</td>
<td width="25%" align="center">

### f Facebook
<sub>Graph API v21 · Pages</sub>
<br/><br/>
Page-token publishing flow.<br/>
PageId discovered on connect.<br/>
Reels + classic posts supported.<br/>
<br/>
<a href="apps/worker/src/adapters/meta.ts"><code>meta.ts</code></a>

</td>
<td width="25%" align="center">

### 𝕏 X (Twitter)
<sub>OAuth2 + PKCE · chunked</sub>
<br/><br/>
INIT → APPEND → FINALIZE.<br/>
STATUS polling for video.<br/>
≤140s enforced client-side.<br/>
<br/>
<a href="apps/worker/src/adapters/x.ts"><code>x.ts</code></a>

</td>
</tr>
</table>

> [!NOTE]
> All four are dispatched via [`makeAdapter()`](apps/worker/src/adapters/index.ts), which honors
> `MOCK_MODE=true` to route every call through [`MockAdapter`](apps/worker/src/adapters/mock.ts)
> for offline dev.

---

## 📡 API surface

All routes versioned under `/v1`. JWT auth (dashboard) or `Authorization: Bearer op_live_…`
API key (programmatic) — both populate `req.user` identically via [`JwtOrApiKeyGuard`](apps/api/src/modules/auth/auth.guard.ts).

| Method | Path | Auth | What it does |
|---|---|---|---|
| `POST` | `/v1/auth/register` | — | Email + password (bcrypt, 12 rounds) |
| `POST` | `/v1/auth/login` | — | Returns short-lived JWT |
| `GET`  | `/v1/me` | JWT | Current user |
| `POST` | `/v1/api-keys` | JWT | Mint API key. **Plaintext returned exactly once.** |
| `GET`  | `/v1/api-keys` | JWT | List keys (prefix + scopes only) |
| `DELETE` | `/v1/api-keys/:id` | JWT | Revoke (sets `revokedAt`) |
| `POST` | `/v1/media/upload-intent` | both | Single PUT or multipart bundle |
| `POST` | `/v1/media/multipart/complete` | both | Finalize multipart upload |
| `POST` | `/v1/media/multipart/abort` | both | Abort a stuck multipart |
| `POST` | `/v1/posts` | both | Submit a post → fan-out enqueued |
| `GET`  | `/v1/posts` · `/v1/posts/:id` | both | List / detail with delivery logs |
| `GET`  | `/v1/oauth/:provider/start` | JWT | Begin OAuth (returns `authorizeUrl`) |
| `GET`  | `/v1/oauth/:provider/callback` | — | Token exchange (HMAC state verified) |
| `GET`  | `/v1/social-accounts` | both | List connected accounts |
| `DELETE` | `/v1/social-accounts/:id` | both | Disconnect |
| `GET`  | `/healthz` | — | Liveness |
| `GET`  | `/readyz` | — | Postgres + Redis ping |

<details>
<summary><b>💻 SDK / curl examples</b></summary>

#### cURL
```bash
curl -X POST https://api.omnipost.dev/v1/posts \
  -H "Authorization: Bearer op_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "caption": "Behind the scenes ✂️",
    "mediaS3Key": "u/usr_42/1719240000-aBc.mp4",
    "mediaMimeType": "video/mp4",
    "targetPlatforms": ["YOUTUBE","INSTAGRAM","FACEBOOK","X"],
    "idempotencyKey": "post-2024-06-24-001"
  }'
```

#### TypeScript
```ts
import { OmniPost } from '@omnipost/sdk';

const op = new OmniPost({ apiKey: process.env.OMNIPOST_KEY! });

const { key } = await op.media.uploadFile('./clip.mp4');
const post = await op.posts.create({
  caption: 'Behind the scenes ✂️',
  mediaS3Key: key,
  mediaMimeType: 'video/mp4',
  targetPlatforms: ['YOUTUBE', 'INSTAGRAM', 'FACEBOOK', 'X'],
  idempotencyKey: 'post-2024-06-24-001',
});

op.webhooks.on('post.published', (evt) => {
  console.log(evt.platform, evt.remoteUrl);
});
```

#### Python
```python
from omnipost import OmniPost

op = OmniPost(api_key=os.environ["OMNIPOST_KEY"])
key = op.media.upload_file("./clip.mp4")

post = op.posts.create(
    caption="Behind the scenes ✂️",
    media_s3_key=key,
    media_mime_type="video/mp4",
    target_platforms=["YOUTUBE", "INSTAGRAM", "FACEBOOK", "X"],
    idempotency_key="post-2024-06-24-001",
)

for d in op.posts.stream_deliveries(post.id):
    print(d.platform, d.status, d.remote_url)
```

</details>

---

## 🔒 Security

> [!IMPORTANT]
> OmniPost has been internally audited. See `apps/worker/src/error-sanitize.ts` and the
> security commit history for the full list of hardening passes.

<details>
<summary><b>Defense-in-depth checklist</b></summary>

| Surface | Guarantee | Code |
|---|---|---|
| User passwords | bcrypt cost 12 | [`auth.service.ts`](apps/api/src/modules/auth/auth.service.ts) |
| OAuth tokens at rest | AES-256-GCM, versioned ciphertext, authTag verified | [`packages/crypto`](packages/crypto/src/index.ts) |
| API keys at rest | bcrypt hash; plaintext returned **once** | [`api-keys.service.ts`](apps/api/src/modules/api-keys/api-keys.service.ts) |
| API key auth | `keyPrefix` unique index + bcrypt verify + revoked check | [`api-key.guard.ts`](apps/api/src/modules/auth/api-key.guard.ts) |
| OAuth state | HMAC-signed nonce, Redis-stored, single-use, 10 min TTL | [`oauth-state.service.ts`](apps/api/src/modules/social-accounts/oauth-state.service.ts) |
| X OAuth | Real S256 PKCE (no `plain` fallback) | [`oauth-providers.ts`](apps/api/src/modules/social-accounts/oauth-providers.ts) |
| Token transport | Always `Authorization: Bearer …`, never query string | [`adapters/meta.ts`](apps/worker/src/adapters/meta.ts) |
| Tenancy on S3 keys | `u/<userId>/…` prefix enforced on every endpoint | [`media.controller.ts`](apps/api/src/modules/media/media.controller.ts) |
| MIME allowlist | `video/*`, `image/*` specific list — no `text/html` | [`packages/types`](packages/types/src/index.ts) |
| Filename sanitization | Extension allowlist `[a-z0-9]{1,5}` | [`media.controller.ts`](apps/api/src/modules/media/media.controller.ts) |
| Log redaction | `authorization`, `cookie`, `x-api-key`, `*token*` always `[REDACTED]` | [`common/logger.ts`](apps/api/src/common/logger.ts) |
| DB error bodies | Scrubbed for token-like strings, capped at 16 KiB | [`error-sanitize.ts`](apps/worker/src/error-sanitize.ts) |
| CORS | Default-deny; operator opts origins in via `WEB_ORIGIN` | [`main.ts`](apps/api/src/main.ts) |
| Rate limiting | `@nestjs/throttler` backed by Redis | [`app.module.ts`](apps/api/src/app.module.ts) |
| Request correlation | `X-Request-Id` echoed + AsyncLocalStorage → Winston | [`logging.interceptor.ts`](apps/api/src/common/logging.interceptor.ts) |
| Helmet | Enabled on Fastify | [`main.ts`](apps/api/src/main.ts) |

</details>

---

## 🧪 Testing

<div align="center">

| Package | Tests | Coverage focus |
|---|:-:|---|
| `@omnipost/crypto`  | **7**  | round-trip, tamper, key rotation, malformed input |
| `@omnipost/api`     | **29** | auth (incl. no email enumeration), API key guard, posts tenancy + idempotency, media controller, OAuth state HMAC + S256 PKCE |
| `@omnipost/worker`  | **29** | adapter dispatch, YT/Meta/X happy + 4xx/5xx, **401 → isAuthError → refresh**, backoff + jitter cap, smart-pad math, error sanitizer, MockAdapter |
| **Total**           | **65** | all upstream APIs mocked, **suite runs offline** |

</div>

```bash
pnpm test                     # 65 tests across 13 spec files
pnpm turbo run typecheck      # all 6 workspace packages clean
pnpm turbo run build          # all 6 packages emit artifacts
```

---

## 🚀 Quick start

<details open>
<summary><b>For developers — two commands</b></summary>

```bash
corepack enable          # if you don't already have pnpm
pnpm setup               # secrets · docker · schema · seed (idempotent, fail-safe)
pnpm dev                 # api :4000 · worker · web :3000
```

Useful companions:

| Command | What it does |
|---|---|
| `pnpm doctor` | Read-only environment health check |
| `pnpm setup --reset` | Recreate Docker volumes from scratch |
| `pnpm setup --skip-infra` | Use your own Postgres/Redis/S3 (set the URLs in `.env`) |
| `pnpm setup --production` | `MOCK_MODE=false` (real OAuth) |
| `pnpm infra:logs` | Tail the Postgres/Redis/MinIO logs |
| `pnpm seed:demo` | Re-seed the demo account any time |

> Local infra uses **non-default host ports** — Postgres `5433`, Redis `6380`,
> MinIO `9100/9101` — so it never collides with services you already run.

</details>

<details>
<summary><b>For platform owners — real YouTube setup</b></summary>

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → create project.
2. **Enable APIs & Services** → enable **YouTube Data API v3**.
3. **OAuth consent screen** → External → add yourself as a test user.
4. **Credentials → Create OAuth 2.0 Client ID** (Web).
   * Redirect URI: `http://localhost:4000/v1/oauth/youtube/callback`
5. Paste into `.env`:
   ```dotenv
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   GOOGLE_REDIRECT_URI=http://localhost:4000/v1/oauth/youtube/callback
   MOCK_MODE=false
   ```
6. Sign in to the dashboard → **Connections → Connect YouTube** → consent → upload → publish.

The same pattern applies to Meta (Facebook for Developers) and X (Developer Portal); env vars
are `META_APP_ID/SECRET` and `X_CLIENT_ID/SECRET`.

</details>

<details>
<summary><b>For ops — production checklist</b></summary>

- [ ] **Generate a fresh** `OMNIPOST_DATA_KEY` (32 random bytes). Rotate via the versioned `v1:` prefix.
- [ ] **Pin a strong** `JWT_SECRET` (≥ 32 bytes random). Rotate by re-issuing tokens.
- [ ] **Use managed Postgres + Redis** (RDS / Upstash / equivalent).
- [ ] **Set** `WEB_ORIGIN` to your dashboard's HTTPS origin (default-deny CORS).
- [ ] **Get your Google Cloud project verified** for the `youtube.upload` restricted scope.
- [ ] **Run the worker with** `--concurrency` tuned to your CPU and FFmpeg memory budget.
- [ ] **Enable structured log shipping** (Datadog / Loki / CloudWatch) — JSON output is on by default in prod.
- [ ] **Set up an external uptime probe** against `/healthz` and `/readyz`.

</details>

---

## 🎨 Tech stack

<table>
<tr>
<td>

### Frontend
[![Next.js](https://img.shields.io/badge/Next.js%2015-000?style=for-the-badge&logo=nextdotjs)](https://nextjs.org)
[![React](https://img.shields.io/badge/React%2019-149ECA?style=for-the-badge&logo=react&logoColor=fff)](https://react.dev)
[![Tailwind](https://img.shields.io/badge/Tailwind%203-38BDF8?style=for-the-badge&logo=tailwindcss&logoColor=fff)](https://tailwindcss.com)
[![Framer Motion](https://img.shields.io/badge/Framer%20Motion-EF008F?style=for-the-badge&logo=framer&logoColor=fff)](https://www.framer.com/motion)

</td>
<td>

### Backend
[![NestJS](https://img.shields.io/badge/NestJS%2010-E0234E?style=for-the-badge&logo=nestjs&logoColor=fff)](https://nestjs.com)
[![Fastify](https://img.shields.io/badge/Fastify%204-000?style=for-the-badge&logo=fastify&logoColor=fff)](https://fastify.dev)
[![Prisma](https://img.shields.io/badge/Prisma%205-2D3748?style=for-the-badge&logo=prisma&logoColor=fff)](https://prisma.io)
[![Zod](https://img.shields.io/badge/Zod%203-3068B7?style=for-the-badge&logo=zod&logoColor=fff)](https://zod.dev)

</td>
</tr>
<tr>
<td>

### Async
[![BullMQ](https://img.shields.io/badge/BullMQ%205-CD0014?style=for-the-badge)](https://docs.bullmq.io)
[![Redis](https://img.shields.io/badge/Redis%207-DC382D?style=for-the-badge&logo=redis&logoColor=fff)](https://redis.io)
[![Winston](https://img.shields.io/badge/Winston-3D3D3D?style=for-the-badge)](https://github.com/winstonjs/winston)

</td>
<td>

### Storage & media
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL%2016-4169E1?style=for-the-badge&logo=postgresql&logoColor=fff)](https://postgresql.org)
[![AWS S3](https://img.shields.io/badge/AWS%20S3-569A31?style=for-the-badge&logo=amazons3&logoColor=fff)](https://aws.amazon.com/s3)
[![FFmpeg](https://img.shields.io/badge/FFmpeg-007808?style=for-the-badge&logo=ffmpeg&logoColor=fff)](https://ffmpeg.org)
[![MinIO](https://img.shields.io/badge/MinIO-C72E49?style=for-the-badge&logo=minio&logoColor=fff)](https://min.io)

</td>
</tr>
</table>

---

## 🌍 Roadmap

- [x] Phase 1 — DB schema, AES-GCM crypto, NestJS auth + API keys, health
- [x] Phase 2 — S3 presigned multipart, BullMQ worker, FFmpeg smart-pad
- [x] Phase 3 — YouTube / Meta / X adapters · DLQ scanner · backoff with jitter
- [x] Phase 4 — Next.js 15 dashboard · landing page · animated logo
- [x] Demo mode — `MockAdapter` + `pnpm seed:demo` + `MOCK_FAILURE_RATE`
- [ ] Webhook dispatcher (`post.published` / `post.failed` / `post.dead_letter`)
- [ ] TikTok adapter
- [ ] LinkedIn Pages adapter
- [ ] Scheduled posts (`publishAt`)
- [ ] OmniPost Cloud (hosted, verified Google project)

---

## 🤝 Contributing

PRs welcome. The codebase is pnpm + Turborepo; one `pnpm install` brings everything up.

```bash
pnpm install
pnpm turbo run typecheck    # must be clean
pnpm test                   # must be 65/65 green
```

Style: TypeScript strict; no `any` unless commented; functional core / imperative shell.
New adapters should implement `BaseAdapter` and add a `*.spec.ts` with mocked HTTP.

> [!NOTE]
> Adding a platform? Drop a new adapter under `apps/worker/src/adapters/` and register it in
> `makeAdapter()`. The dashboard auto-renders any new `Platform` enum value.

---

## 👤 Author

**OmniPost was created and is authored by [Sourojit Dhua](https://github.com/sourojitd).**

<a href="AUTHORS"><img src="https://img.shields.io/badge/author-Sourojit%20Dhua-7c3aed?style=for-the-badge&labelColor=08080d"/></a>

Copyright (c) 2025 Sourojit Dhua. Authorship and the copyright notice are
recorded in [`LICENSE`](LICENSE), [`AUTHORS`](AUTHORS), [`NOTICE`](NOTICE), the
per-file headers, and each `package.json`. See [`AGENTS.md`](AGENTS.md) for the
attribution policy that contributors and AI tools are asked to respect.

## 📜 License

<a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-22c55e?style=for-the-badge&labelColor=08080d"/></a>

MIT — free to use, modify, and distribute, **provided the copyright notice and
author attribution are retained** (a condition of the license). No warranty.

<br/>

<div align="center">
  <sub>Built with ❤️ by <b>Sourojit Dhua</b> — and an unreasonable amount of FFmpeg flags.</sub>
  <br/>
  <sub><a href="#-what-is-omnipost">↑ back to top</a></sub>
</div>
