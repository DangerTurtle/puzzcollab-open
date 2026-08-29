# Untitled Puzzle Collaboration Service

Under construction. Watch this space for an introduction to this exciting technology!

This is leveraged from the Statusphere example app found at [Bluesky's GitHub](https://github.com/bluesky-social/statusphere-example-app).

## Getting Started

```sh
git clone https://github.com/bluesky-social/statusphere-example-app.git
cd statusphere-example-app
cp env.template .env.local
pnpm install
pnpm dev
# Navigate to http://127.0.0.1:3000
```

To read data from the network, you'll need an instance of Tap running. Find full setup instructions in the [Statusphere tutorial](https://atproto.com/guides/statusphere-tutorial). Quickest way locally:

```sh
docker compose up -d
```

It watches the `us.puzzling` collection, so it'll pick up any account that's posted a status through this app without you registering repos by hand. Data persists in `.tap-data/` between restarts.

For other setups (running from source, securing the webhook with `TAP_ADMIN_PASSWORD`, etc.), see the [Tap repository](https://github.com/bluesky-social/indigo/blob/main/cmd/tap/README.md).
