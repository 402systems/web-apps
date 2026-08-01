/**
 * Everything house-specific lives here: the tasks that get reminders, the
 * checklist that fires when you leave, and the full text of the house manual.
 *
 * This is the only file you need to touch to point the app at a different
 * house — nothing below `utils/` or `app/` knows anything about cats.
 */

export type TaskCadence = 'daily' | 'scheduled' | 'watch';

export interface HouseTask {
  id: string;
  title: string;
  /** Ionicons glyph name */
  icon: string;
  cadence: TaskCadence;
  /** Short instruction shown under the title. */
  detail: string;
  /** `scheduled` only: 0 = Sunday … 6 = Saturday. */
  weekdays?: number[];
  /** `scheduled` only: per-weekday override of the detail line. */
  weekdayDetail?: Record<number, string>;
  /** `watch` only: nudge this many days after it was last done. */
  intervalDays?: number;
  /** `watch` only: the real-world signal that it needs doing. */
  trigger?: string;
}

export interface ManualSection {
  id: string;
  title: string;
  icon: string;
  items: string[];
}

export interface Contact {
  label: string;
  name: string;
  url?: string;
}

export const houseName = 'Frost House';

export const wifi = { ssid: 'FROST_HOUSE', password: 'j@ck&p0p0' };

/** Runs every day, resets at midnight. */
export const dailyTasks: HouseTask[] = [
  {
    id: 'wet-food',
    title: 'Wet food for Jack & Popo',
    icon: 'restaurant-outline',
    cadence: 'daily',
    detail:
      'One can split between the two bowls. Fill the empty can with water, add half to each bowl, and mix. Cans are on the counter. Mornings are the usual routine, but any time of day is fine.',
  },
  {
    id: 'jack-water',
    title: "Jack's water bowl",
    icon: 'water-outline',
    cadence: 'daily',
    detail:
      'He drinks from the bowl in front of the fountain, not the fountain itself. Dump the stale water and pour fresh.',
  },
  {
    id: 'squeegee',
    title: 'Squeegee the bathroom',
    icon: 'sparkles-outline',
    cadence: 'daily',
    detail:
      "Only if you showered. The squeegee is on the wall opposite the shower head, near the floor — the bathroom gets musty fast if the wet surfaces don't get wiped down.",
  },
];

/** Fixed nights of the week. */
export const scheduledTasks: HouseTask[] = [
  {
    id: 'garbage',
    title: 'Garbage out to the curb',
    icon: 'trash-outline',
    cadence: 'scheduled',
    weekdays: [0, 2, 4],
    detail:
      'Pickup is the next morning, so it goes out tonight. Right on the curb near the road outside. Bags are next to the can.',
    weekdayDetail: {
      4: 'Garbage AND recycling tonight. Pickup is Friday morning. Right on the curb near the road outside. Good night to swap the litter robot’s waste drawer too.',
    },
  },
];

/** No schedule — done when the house says so. The app tracks how long it's been. */
export const watchTasks: HouseTask[] = [
  {
    id: 'litter',
    title: 'Top up the litter',
    icon: 'albums-outline',
    cadence: 'watch',
    intervalDays: 3,
    trigger: 'when it looks low',
    detail:
      "Pour straight in from the box next to the litter robot. There's a max line inside the globe — it's hard to see, but don't go past it. Press the reset button on top after filling.",
  },
  {
    id: 'waste-drawer',
    title: 'Empty the waste drawer',
    icon: 'file-tray-outline',
    cadence: 'watch',
    intervalDays: 4,
    trigger: 'when the light flashes blue',
    detail:
      'Slide the drawer out from under the litter robot, tie off the bag and take it out. Fresh bags are on the shelf above. Push the new bag flat against the walls of the drawer. Easiest on a garbage night so it’s not sitting around.',
  },
  {
    id: 'fountain',
    title: "Top up Popo's fountain",
    icon: 'rainy-outline',
    cadence: 'watch',
    intervalDays: 7,
    trigger: 'when it’s near the min line',
    detail:
      'Pour water straight onto the top of the fountain from a bowl. Once or twice over the whole stay is normal.',
  },
  {
    id: 'dry-food',
    title: 'Refill the dry feeder',
    icon: 'nutrition-outline',
    cadence: 'watch',
    intervalDays: 14,
    trigger: 'only if it runs empty',
    detail:
      'The feeder dispenses every 4 hours on its own and should hold enough for the whole two weeks. If it does run out: twist the top open to refill, big food bag is in the bedroom closet.',
  },
];

export const allTasks: HouseTask[] = [
  ...dailyTasks,
  ...scheduledTasks,
  ...watchTasks,
];

export function findTask(id: string): HouseTask | undefined {
  return allTasks.find((t) => t.id === id);
}

/** Seeded into settings on first launch; editable in the app afterwards. */
export const defaultLeaveChecklist = [
  'Front door locked — it does not lock on its own',
  'Both cats inside — Jack bolts for an open door',
  'Keys on you — replacing them costs a month’s rent',
];

export const emergency = {
  headline: 'Go to the ER for this one thing',
  body: 'If either cat is peeing — or straining to pee — anywhere that is not the litter box, especially with any blood, go to the ER. That is the one thing that cannot wait. It has happened exactly once in their lives, but it is the most common cat emergency.',
  reassurance: [
    'Jack throwing up now and then is normal — maybe once a month. Not urgent.',
    'How much they sleep is normal. It is a lot.',
  ],
};

export const contacts: Contact[] = [
  {
    label: 'Regular vet',
    name: 'The Cat Practice',
    url: 'https://thecatpractice.com',
  },
  {
    label: 'Emergency',
    name: 'VEG ER',
    url: 'https://veterinaryemergencygroup.com',
  },
];

export const manual: ManualSection[] = [
  {
    id: 'entry',
    title: 'Doors, keys & WiFi',
    icon: 'key-outline',
    items: [
      `WiFi: ${wifi.ssid} — password ${wifi.password}`,
      'The front door does not lock on its own. Lock it every time you leave.',
      'Don’t leave the front door open — Jack will make a run for it. Worth a beat of caution every time you come in or out.',
      'Don’t lose the keys — the building charges one month’s rent to replace them.',
      'Towels are under the sink in the shower. Extra toilet paper is in the closet, above the litter box.',
    ],
  },
  {
    id: 'cats',
    title: 'The cats, every day',
    icon: 'paw-outline',
    items: [
      'Wet food: one can split between the two bowls. Fill the empty can with water, add half to each bowl, mix. Cans are on the counter.',
      'Jack’s water: he drinks from the bowl in front of the fountain, not the fountain. Dump the stale water and pour fresh.',
      'Dry food is automatic — the feeder dispenses every 4 hours and should hold enough for the whole two weeks.',
    ],
  },
  {
    id: 'litter',
    title: 'Litter robot',
    icon: 'albums-outline',
    items: [
      'Litter, when it looks low: pour straight in from the box next to the robot. There’s a max line inside the globe — hard to see, but don’t go past it. Press reset on top after filling.',
      'Waste drawer, when the light flashes blue: slide it out, tie off the bag, take it out. Fresh bags are on the shelf above. Push the new bag flat against the walls of the drawer.',
      'Easiest to do the drawer on a garbage night so it’s not sitting around.',
    ],
  },
  {
    id: 'garbage',
    title: 'Garbage',
    icon: 'trash-outline',
    items: [
      'Out Sunday, Tuesday and Thursday nights — pickup is Monday, Wednesday and Friday mornings.',
      'Thursday night is garbage + recycling. The other two are garbage only.',
      'Goes right on the curb near the road outside.',
      'No need to take it out at all unless it’s full or starting to smell.',
      'Bags are next to the can.',
    ],
  },
  {
    id: 'bathroom',
    title: 'Bathroom',
    icon: 'sparkles-outline',
    items: [
      'The squeegee is on the wall opposite the shower head, near the floor.',
      'Squeegee the wet surfaces after showering — otherwise the bathroom gets musty fast.',
    ],
  },
  {
    id: 'kitchen',
    title: 'Kitchen',
    icon: 'restaurant-outline',
    items: [
      'Help yourself to any dishes, pans, or ingredients — seriously, anything.',
      'Pots and pans live under the oven.',
      'No garbage disposal, so nothing but water down the drain.',
      'Dishwasher: detergent is under the sink. Press power, then close the door — push it firmly until it latches, or it won’t start.',
    ],
  },
  {
    id: 'living',
    title: 'Living room',
    icon: 'tv-outline',
    items: [
      'AC: no need to touch the unit itself. Press the button on the side of the smart plug to turn it on.',
    ],
  },
  {
    id: 'bedroom',
    title: 'Bedroom & laundry',
    icon: 'bed-outline',
    items: [
      'Vacuum in the corner — snap the portable battery on to use it. Not expected of you, but there will be a lot of cat hair.',
      'Laundry: the Quick Coin Four is right downstairs. Detergent, dryer sheets, and the laundry card are all in the bedroom.',
    ],
  },
  {
    id: 'fun',
    title: 'Fun stuff',
    icon: 'happy-outline',
    items: [
      'Toys are by the cat tree — they’d love it if you played with them.',
      'Treats are on top of the fridge. Feel free.',
    ],
  },
];
