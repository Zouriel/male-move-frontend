# Frontend security

- This application is staff-facing and expects the API to validate OIDC JWTs and roles. UI visibility is never an authorization boundary.
- Configure an OIDC Authorization Code + PKCE integration before deployment. Keep access tokens in memory; do not put tokens, identity responses, permit metadata, or route coordinates in local storage, URL parameters, analytics, or logs.
- Serve over HTTPS. Configure a reverse-proxy Content Security Policy with `default-src 'self'`, `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`, `form-action 'self'`, same-origin script/connect sources, and only the approved OIDC issuer and map tile hosts. The shared map uses OpenStreetMap tiles by default and must follow its attribution and tile usage policy.
- Use exact API CORS origins. Do not allow wildcard origins with bearer credentials.
- Keep GitHub Packages credentials in a read-only `NODE_AUTH_TOKEN` secret. Never commit credentials or runtime configuration secrets.
- Keep production source maps disabled. Configure the static host with `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, a restrictive `Permissions-Policy`, and HSTS.
- Do not claim local legal compliance or security certification. Obtain local privacy, data-sharing, retention, accessibility and licensing review before launch.
