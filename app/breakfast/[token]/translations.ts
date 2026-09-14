/**
 * Guest-facing breakfast texts.
 *
 * Inline rather than in messages/{en,de}.json on purpose, exactly as the
 * self-checkout page does it: this route lives outside [locale], so there is no
 * next-intl provider around it, and next-intl renders the KEY PATH onto the live
 * page when a lookup misses. A page a guest reaches from a Guestway link is the
 * worst possible place to discover a missing key.
 */

export type Lang = 'de' | 'en'

export const T = {
  de: {
    title: 'Ihr Frühstück',
    hello: 'Guten Tag {name},',
    helloNoName: 'Guten Tag,',
    intro:
      'Hier wählen Sie für jeden Morgen Ihr Menü und Ihre Uhrzeit. Der Platz ist damit für Sie reserviert.',
    nothingTitle: 'Kein Frühstück gebucht',
    nothingMsg:
      'Für diese Buchung ist derzeit kein Frühstück hinterlegt. Sie können es jederzeit in Ihrem Gastkonto hinzubuchen.',
    unknownTitle: 'Link nicht gültig',
    unknownMsg:
      'Dieser Link gehört zu keiner Buchung mehr. Bitte öffnen Sie den Link aus Ihrer letzten Nachricht.',
    netTitle: 'Verbindung fehlgeschlagen',
    netMsg: 'Bitte laden Sie die Seite neu.',
    loading: 'Wird geladen …',

    menuLabel: 'Menü',
    timeLabel: 'Uhrzeit',
    seatsLeft: 'noch {count} frei',
    seatsNone: 'ausgebucht',
    persons: 'für {count} Person',
    personsPlural: 'für {count} Personen',
    allergens: 'Allergene: {list}',
    noMenus: 'An diesem Morgen wird kein Frühstück serviert.',
    whatsIn: 'Was in den Menüs steckt',
    random: 'Zufällig wählen',
    chosen: '{count} von {total} gewählt',

    save: 'Auswahl speichern',
    saving: 'Wird gespeichert …',
    saved: 'Gespeichert',
    chooseBoth: 'Bitte für jede Person ein Menü und eine Uhrzeit wählen.',
    slotFull: 'Diese Uhrzeit ist gerade voll geworden. Bitte wählen Sie eine andere.',
    failed: 'Konnte nicht gespeichert werden. Bitte erneut versuchen.',
    attended: 'Bereits eingecheckt',

    step1: 'Menü für jeden Morgen wählen',
    step2: 'Uhrzeit wählen',
    step3: 'Code am Frühstücksraum zeigen',
    deadline: 'Ändern können Sie Ihre Wahl bis 23:59 Uhr am Vorabend.',
    noteLabel: 'Eine Notiz an die Küche (optional)',
    notePlaceholder: 'z. B. keine Zwiebeln, glutenfreies Brot, Kaffee sehr heiß',
    noteHint:
      'Wir lesen jede Notiz und geben unser Bestes, sie zu berücksichtigen. Wir sind ein kleines Team, das mit Sorgfalt kocht – und ab und zu rutscht etwas durch. Sagen Sie uns dann bitte im Frühstücksraum Bescheid, wir bringen es sofort in Ordnung. Danke für Ihr Verständnis.',
    locked:
      'Seit 23:59 Uhr gestern Abend geschlossen – die Küche bereitet diesen Morgen bereits vor. Änderungen nur noch im Frühstücksraum.',
    lockedShort: 'Gesperrt',
    prevDay: 'Vorheriger Tag',
    nextDay: 'Nächster Tag',
    chosenMark: 'gewählt',
    qrTitle: 'Ihr Code für den Eingang',
    qrMsg: 'Zeigen Sie diesen Code am Frühstücksraum. Er gilt für Ihren gesamten Aufenthalt.',
    qrMsgChooseFirst:
      'Wählen Sie oben zuerst Menü und Uhrzeit. Diesen Code zeigen Sie dann am Frühstücksraum – er gilt für Ihren gesamten Aufenthalt.',
  },
  en: {
    title: 'Your breakfast',
    hello: 'Hello {name},',
    helloNoName: 'Hello,',
    intro:
      'Pick your menu and your time for each morning here. That reserves your seat.',
    nothingTitle: 'No breakfast booked',
    nothingMsg:
      'There is no breakfast on this booking at the moment. You can add it any time in your guest account.',
    unknownTitle: 'Link not valid',
    unknownMsg:
      'This link no longer belongs to a booking. Please open the link from your most recent message.',
    netTitle: 'Connection failed',
    netMsg: 'Please reload the page.',
    loading: 'Loading …',

    menuLabel: 'Menu',
    timeLabel: 'Time',
    seatsLeft: '{count} left',
    seatsNone: 'full',
    persons: 'for {count} person',
    personsPlural: 'for {count} people',
    allergens: 'Allergens: {list}',
    noMenus: 'No breakfast is served on this morning.',
    whatsIn: 'What is in each menu',
    random: 'Surprise me',
    chosen: '{count} of {total} chosen',

    save: 'Save selection',
    saving: 'Saving …',
    saved: 'Saved',
    chooseBoth: 'Please choose a menu for everyone and a time.',
    slotFull: 'That time has just filled up. Please choose another.',
    failed: 'Could not save. Please try again.',
    attended: 'Already checked in',

    step1: 'Choose a menu for each morning',
    step2: 'Pick a time',
    step3: 'Show your code at the breakfast room',
    deadline: 'You can change your choice until 23:59 the evening before.',
    noteLabel: 'A note for the kitchen (optional)',
    notePlaceholder: 'e.g. no onions, gluten-free bread, coffee very hot',
    noteHint:
      'We read every note and do our best to follow it. We are a small team cooking with care — and now and then something slips through. If it does, tell us at the breakfast room and we will put it right straight away. Thank you for your understanding.',
    locked:
      'Closed since 23:59 last night — the kitchen is already preparing this morning. Changes only at the breakfast room.',
    lockedShort: 'Locked',
    prevDay: 'Previous day',
    nextDay: 'Next day',
    chosenMark: 'chosen',
    qrTitle: 'Your code for the entrance',
    qrMsg: 'Show this code at the breakfast room. It is valid for your whole stay.',
    qrMsgChooseFirst:
      'First choose your menu and time above. Then show this code at the breakfast room — it is valid for your whole stay.',
  },
} as const

export type TKey = keyof typeof T.en

export function fmt(tpl: string, values: Record<string, string | number>): string {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => String(values[k] ?? ''))
}

/** "Freitag, 12. September" / "Friday, 12 September" — no year: every morning
 *  shown is within this stay, and the year only adds noise. */
export function niceDate(iso: string, lang: Lang): string {
  const d = new Date(`${iso}T00:00:00Z`)
  return new Intl.DateTimeFormat(lang === 'de' ? 'de-DE' : 'en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(d)
}
