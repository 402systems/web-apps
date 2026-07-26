# Friend Tracker (Mobile)

Expo app for tracking friends and hangouts. Pairs with the [Friend Tracker API](../../api/misc/friend-tracker-api/README.md).

## Setup

Create a `.env` file in this directory (gitignored, you'll need to recreate it on each new clone):

```
EXPO_PUBLIC_SUPABASE_URL=https://sgsbfelkbsoueiickbrk.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=sb_publishable_BIXr0dVqTzDWsXnfblaIvg_kp2gHCdZ
```

## Running on your phone

```bash
# From the repo root
pnpm install

cd apps/mobile/misc/friend-tracker
pnpm start
```

Scan the QR code with the Expo Go app. Your device must be on the same Wi-Fi network as your machine, or use tunnel mode:

```bash
pnpm start -- --tunnel
```

## Scripts

| Command              | Description                        |
| -------------------- | ---------------------------------- |
| `pnpm start`         | Start the Metro dev server         |
| `pnpm ios`           | Start and open in iOS simulator    |
| `pnpm android`       | Start and open in Android emulator |
| `pnpm build:ios`     | EAS production build for iOS       |
| `pnpm build:android` | EAS production build for Android   |

## Offline-first behaviour

The app is fully usable with no connectivity; Supabase is treated as a sync
target rather than the source of truth for a session.

- **Launch** — the signed-in user is cached in AsyncStorage (`ft:user`), and the
  Supabase session is read locally (`getSession()`, never `getUser()`), so the
  app opens straight into cached data. If auth doesn't resolve within 4s the
  cached identity is used instead of blocking on a spinner.
- **Reads** — friends and events are cached per user (`ft:friends:<id>`,
  `ft:events:<id>`) and rendered immediately, then refreshed in the background.
- **Writes** — every mutation applies locally first. Anything that can't reach
  the API is appended to a durable queue (`ft:sync_queue:<id>`). Rows created
  offline get a `local:`-prefixed id which is swapped for the real database id
  once the create replays; queued ops that referenced the local id are rewritten
  at the same time.
- **Sync** — the queue is replayed in order (stopping at the first op that is
  still offline) and fresh data pulled every 5 minutes, on app foreground, and
  when the sync pill in the header is tapped. `ft:last_sync:<id>` records the
  last successful pull.

Storage keys live in `storage/offlineStorage.ts`; the queue and its ops live in
`storage/syncQueue.ts`.

## Events views

The Events tab toggles between a **List** view (upcoming, then past) and a
**Calendar** view — a month grid with a dot per event, tap-to-select days, and
the selected day's events listed underneath.
