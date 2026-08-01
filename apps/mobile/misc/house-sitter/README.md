# House Sitter (Mobile)

Expo app for looking after someone else's house while they're away. It holds
the house manual, reminds you about the daily routine, and — the reason it
exists — notices when you've walked away from the house and asks whether you
locked the door.

No login, no backend, no Supabase. Everything lives in AsyncStorage on the
device.

## How the "did you lock up?" alert works

The app saves one coordinate: the house. From there, two things watch it.

1. **An OS geofence** (`expo-location` + `expo-task-manager`). When the phone
   leaves a circle of the configured radius around the house, Android hands the
   event to a background task, which records the departure and posts a local
   notification listing the leave checklist. This works with the app closed.
2. **A foreground distance check** (`hooks/useProximity`). While the app is
   open it takes a fix on launch, when it comes back to the foreground, and
   every 90 seconds, and compares it to the saved location. This is what keeps
   the app useful when the user only granted "while using the app" location.

Both funnel into `recordDeparture()` in `storage/store.ts`, which de-dupes so
one walk out the door produces one alert. The departure stays "unresolved"
until you tick through the checklist in the app, so it's still waiting for you
when you open it.

Background geofencing needs the **"Allow all the time"** location permission.
Android only offers that after foreground location has been granted, so the app
asks in that order and shows a banner on the Leaving tab if you're running
without it.

## Reminders

All local notifications, rebuilt from scratch whenever their inputs change
(`utils/notifications.ts`):

- one daily morning reminder for the cats,
- one weekly evening reminder per weekday, so garbage nights (Sun / Tue / Thu,
  with recycling on Thu) read differently from ordinary evenings,
- one dated nudge per "when it looks low" task, scheduled from when you last
  ticked it off.

Notifications don't work in Expo Go on Android, so they're no-ops there and the
UI says so. Install the APK build for the real thing.

## The house itself

Everything house-specific — the tasks, the leave checklist, the manual text,
the vet contacts — is in [`house.config.ts`](./house.config.ts). Point the app
at a different house by editing that one file.

## Running it

```bash
# From the repo root
pnpm install

cd apps/mobile/misc/house-sitter
pnpm start          # Metro dev server; scan with Expo Go (no notifications)
pnpm prebuild       # regenerate ./android from app.json
pnpm build:android  # EAS build → installable APK
```

CI builds the APK: **Actions → Build House Sitter APK**, which publishes it to
the `house-sitter-latest` GitHub release.

## Scripts

| Command              | Description                              |
| -------------------- | ---------------------------------------- |
| `pnpm start`         | Start the Metro dev server               |
| `pnpm android`       | Open on a connected Android device       |
| `pnpm prebuild`      | Regenerate the native `android/` project |
| `pnpm build:android` | EAS build for Android (installable APK)  |
| `pnpm lint`          | ESLint                                   |
