# Self-hosted mobile Relay

Run Orca's Relay on your own server. The desktop and phone both connect outbound;
the desktop does not need an SSH tunnel, a local forwarding process, or an open
internet-facing port. Mobile uses the existing encrypted pairing and resume
protocol. A Cloud account is not required for this Relay mode.

This is a single-owner, single-server mode. Everyone holding the owner access key
can register desktops on this relay. Phones receive separate pairing credentials,
not the owner key. The relay still verifies the desktop's private-key proof, and
the phone pins that desktop's public key through its pairing code.

## Server

Use a Linux server with Docker Compose, a DNS name pointing to it, and TCP ports
80 and 443 available. From a checkout containing this feature:

```sh
cd cloud/self-hosted
cp .env.example .env
```

Set `RELAY_DOMAIN` to the DNS name, without a scheme or path. Replace both keys
with **different** random values; generate each with:

```sh
openssl rand -hex 32
```

Keep `.env` private, then start the server:

```sh
docker compose up -d --build
```

Caddy obtains the HTTPS certificate and forwards WebSockets to the Relay. The
Relay's port 8080 is only available inside the Compose network. Check
`https://<your-domain>/ready`; a ready server returns `{"ok":true}`.

The `relay-data` volume stores device credentials and assignments in SQLite.
Retain this volume and the signing key across container upgrades. Cloud deployment
administration routes are disabled in this mode. Do not set the Cloud issuer,
JWKS, or separate director variables alongside the self-hosted key.

For an existing HTTPS reverse proxy, run `cloud/apps/relay/Dockerfile` directly
with the same four environment variables shown in `compose.yaml`, forward
WebSocket upgrades, and persist `/app/data/relay`. Both public URLs must be the
same HTTPS origin. Do not expose the container's plain HTTP port publicly.

## Desktop and phone

The desktop build must include this feature. Before launching it, set:

```text
ORCA_RELAY_SELF_HOSTED_URL=https://relay.example.com
ORCA_RELAY_SELF_HOSTED_KEY=<RELAY_ACCESS_KEY from the server>
```

These are process environment variables, not agent-terminal settings. On macOS,
launch the app executable from the configured shell; on Linux, launch the Orca
executable from that shell. On Windows, set the two variables in PowerShell
before launching `Orca.exe`. Quit an already-running instance first so the new
process receives them. For subsequent launches, keep them in a private launcher
or the environment used by your desktop session.

Without these variables, **Orca Relay** and its **Sign in for Relay** action stay
unchanged. Explicit self-hosted configuration selects the self-hosted provider;
invalid or incomplete values disable Relay startup instead of falling back to
Cloud. Remove both variables and relaunch to return to the official provider.

Open **Settings → Mobile**, select **Self-hosted Relay**, and generate a pairing
code. Scan it with an Orca mobile release that supports Relay v2. Android and iOS
use their existing Relay transport; no mobile protocol change is needed.

An existing phone pairing keeps its previous relay credentials. Remove that host
on the phone and pair again to move it to the new relay. Automatic discovery of
changing LAN addresses is separate from this feature.

## Keys and limits

- Keep the owner access key on the server and desktop only. The server exchanges
  it for a host-scoped token valid for 15 minutes. The signing key stays on the
  server and must never be copied to the desktop or phone.
- Revoke a phone through Orca's paired-device list. Rotating the owner key stops
  future host-token renewals; previously issued tokens may remain valid until
  expiry. This is not an immediate disconnect mechanism.
- Changing the public origin or losing the database requires pairing again.
- This configures mobile Relay only. It does not self-host Cloud sign-in,
  synchronization, artifacts, push notifications, or remote desktop pairing.
- HTTPS is required in packaged desktop builds and mobile pairing offers.
  Loopback HTTP is available only for desktop development tests.
