# Nudgy – Animated Reminders (Chrome extension)

Free, friendly reminders that pop up in a small window with an animation matched to the task. Use it for anything you need to remember, or for healthy habits like drinking water and taking breaks.

| Type | Animation | Auto-picked when the text mentions… |
|---|---|---|
| 🔔 General | Ringing bell | anything else (the default) |
| 💧 Water | Glass fills up while drops fall in | water, drink, hydrate, sip |
| 🙆 Stretch | Figure reaches up and leans side to side | stretch, posture, back, neck |
| 👀 Eyes | Blinking eye plus a 20-second countdown (20-20-20 rule) | eye, screen, blink |
| 🌬️ Breathe | Glowing orb guides 3 slow breaths | breathe, calm, relax, meditate |
| 🚶 Move | Footsteps walk up the screen | walk, stand, move, steps |
| ☕ Break | Steaming coffee cup | coffee, tea, break, lunch |

**Description:** each reminder can have an optional description (up to 200 characters). It appears under the title in the list, in the reminder window, and in the system notification.

**Schedules:** repeat every N minutes or hours (optionally only between set hours and on chosen days), daily at a set time on chosen days, or once (in N minutes or at a date and time).

**Deleting:** click the trash icon on a reminder, then click **Delete** to confirm. You can also delete a reminder from its edit screen.

**In the reminder window:** Done (counted in "Done today"), Snooze (5/10/15/30 min, set in Settings), or Skip. Keyboard: Enter = Done, Esc = Skip.

Each type also has its own sound (synthesised, so there are no audio files), plus an optional system notification.

## Try it
1. Open `chrome://extensions`, switch on **Developer mode**, click **Load unpacked** and choose this folder.
2. Click the Nudgy icon. Pick a quick start, or create your own and press **▶ Preview** to see the animation.

## Price
Free. Unlimited reminders and every animation, with no account and no payments.

## Permissions (Web Store justifications)
- `alarms`: fire reminders at the scheduled times
- `storage`: save reminders, settings and "done today" counts locally
- `notifications`: optional system notification alongside the animated window

No website access is requested. The animation opens in the extension's own small window, so it works on every tab, including new-tab pages.

## Files
```
manifest.json     MV3 manifest
background.js     scheduling (alarms), opens the reminder window
lib/core.js       types, presets, scheduling maths, storage, config
popup.*           create / edit / list reminders, settings
reminder.*        the animated reminder window and sounds
animations.js     the 7 SVG animations
icons/            16/32/48/128
```

## Ideas for v2
- More animations (medicine, posture check, plant watering, stand-up meeting)
- Streaks and a weekly chart
- Custom colours and your own emoji per reminder
- Sync across devices with `chrome.storage.sync`
