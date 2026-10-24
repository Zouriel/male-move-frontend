# MALÉ MOVE Frontend

Angular 22 staff planning workspace using the shared `@zouriel/ui` library. It uses the library's `ui-sidebar-layout`, `ui-side-nav`, `ui-map`, `ui-stat-card`, `ui-button`, `ui-badge`, `ui-table`, `ui-empty-state`, and `ui-form-renderer`; the map uses the library's Leaflet component. No substitute navigation, map, table, button system, application shell, or custom form/workflow designer is introduced.

## Setup

The UI package is hosted in GitHub Packages. For local installs, use a classic personal access token with `read:packages` in `NODE_AUTH_TOKEN`; do not commit it. For CI, the workflow uses the short-lived `GITHUB_TOKEN` with read-only package permission. In the `@zouriel/ui` package settings, grant the `Zouriel/male-move-frontend` repository Read access under **Manage Actions access**. The `.npmrc` reads the token from the environment and contains no secret.

```sh
npm install
npm start
```

The development server proxies `/api` to `http://localhost:5080`. Set the API's development CORS origin to `http://localhost:4200` when calling it directly.

`npm start` and `npm run build:staging` build with `src/environments/environment.local.ts`, which signs in through the API's local token issuer (`POST /api/v1/dev/token`, available only when the API runs in Development or Staging with `Authentication__DevelopmentSigningKey`; see the backend README). `npm run build` (production) never calls it.

Staging (https://staging-4.zouriel.com) is deployed from the backend repo with `deploy/staging/ship.sh`, which builds this app with `build:staging` and packages `dist/` with `Dockerfile.prebuilt`. `Dockerfile` builds from source and takes the package token as a BuildKit secret.

## Current application state

- The responsive app shell and Greater Malé map frame use the shared UI package.
- All statistics are deliberately blank until approved data sources are connected. The map does not fabricate road or facility layers.
- Permit document registration, field capture, population/source/permit lists, map layers and route scenario requests are wired to the backend API. Map and data pages remain empty until a source dataset/network is loaded.
- The API requires OIDC JWT bearer auth. The front end has an in-memory token handoff seam only; production identity provider/client registration and Authorization Code + PKCE callback wiring are deployment tasks. Tokens must never be placed in local storage or query strings.
- The UI library includes a form builder and workflow builder/runtime. Use `@zouriel/ui/form-builder` and `@zouriel/ui/workflow` for those product surfaces when persisted form definitions and workflow engine are connected; do not build equivalent custom designers.
- The workflow builder/panel are not wired yet: their .NET engine is in `Zouriel/zouriel-workflows` and is not published to NuGet. Connect its pinned source and lifecycle storage before handling operational permit approvals; the current API has an interim permit state service and a non-tamper-evident event table.
- Road-segment assignment/confirmation is not implemented in the current API or UI. That capability is required before an approver can safely approve a route-affecting permit.
- `package-lock.json` is committed; CI can move to `npm ci`.

Read [SECURITY.md](SECURITY.md) for deployment headers, CSP, identity and map tile requirements.

## Package access and releases

Never commit `.npmrc` credentials, package tokens, identity secrets, or production configuration. CI uses the repository-scoped `GITHUB_TOKEN` with `packages: read`, and requires explicit package access for this repository. Pin the UI package release used by a deployment and review its changelog before upgrading.
