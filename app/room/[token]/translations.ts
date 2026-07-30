// Texts for the in-room QR page. Like the self-checkout screen next door, this
// ships its own tiny i18n instead of next-intl: the page lives outside [locale]
// so the URL printed on the sticker stays locale-free and never changes.

export type Lang = 'de' | 'en';

export const T = {
  de: {
    logo: 'Ihre Buchung',
    moment: 'Einen Moment …',
    askT: 'Willkommen 👋',
    room: 'Zimmer {room}',
    askM:
      'Geben Sie bitte Ihren Nachnamen ein — nur damit wir sicher sind, dass es Ihre Buchung ist.',
    label: 'Nachname',
    go: 'Weiter',
    going: 'Wird geöffnet …',
    perks: 'Danach können Sie Frühstück, späten Check-out, Parkplatz und mehr direkt buchen.',
    wrongT: 'Das passt nicht',
    wrongM:
      'Unter diesem Namen finden wir für dieses Zimmer keine Buchung. Bitte prüfen Sie die Schreibweise — oder schreiben Sie uns kurz, wir helfen sofort.',
    nobodyT: 'Gerade nichts zu tun',
    nobodyM:
      'Für dieses Zimmer ist aktuell kein aktiver Aufenthalt hinterlegt. Sobald Sie eingecheckt sind, geht es hier weiter.',
    invT: 'Code nicht erkannt',
    invM:
      'Dieser QR-Code gehört zu keinem Zimmer. Bitte scannen Sie den Code im Zimmer noch einmal.',
    rateT: 'Kurz durchatmen',
    rateM:
      'Es gab zu viele Versuche. Bitte probieren Sie es in einigen Minuten erneut — oder schreiben Sie uns, wir helfen gern.',
    netT: 'Keine Verbindung',
    netM: 'Wir konnten nichts laden. Bitte prüfen Sie Ihre Verbindung und versuchen Sie es erneut.',
    errT: 'Da ist etwas schiefgelaufen',
    errM: 'Bitte versuchen Sie es gleich noch einmal — oder schreiben Sie uns kurz.',
  },
  en: {
    logo: 'Your booking',
    moment: 'One moment …',
    askT: 'Welcome 👋',
    room: 'Room {room}',
    askM: 'Please enter your surname — just so we know this booking is yours.',
    label: 'Surname',
    go: 'Continue',
    going: 'Opening …',
    perks: 'Then you can book breakfast, a late check-out, parking and more, right here.',
    wrongT: "That doesn't match",
    wrongM:
      "We can't find a booking under that name for this room. Please check the spelling — or message us and we'll sort it out right away.",
    nobodyT: 'Nothing to do right now',
    nobodyM:
      'There is no active stay for this room at the moment. Once you have checked in, this is where you continue.',
    invT: 'Code not recognised',
    invM: "This QR code doesn't belong to a room. Please scan the code in your room again.",
    rateT: 'Let’s pause a moment',
    rateM:
      'That was a few too many tries. Please try again in a few minutes — or message us and we’ll help.',
    netT: 'No connection',
    netM: "We couldn't load anything. Please check your connection and try again.",
    errT: 'Something went wrong',
    errM: 'Please try again in a moment — or drop us a message.',
  },
} as const;

export type TKey = keyof (typeof T)['de'];

export function fmt(tpl: string, values: Record<string, string | number>): string {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => String(values[k] ?? ''));
}
