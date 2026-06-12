// Texts of the guest self-checkout page — copied verbatim from the approved
// design (checkout-design.html). The page deliberately ships its own tiny
// i18n instead of next-intl: it lives outside [locale] so the printed QR URL
// stays locale-free.

export type Lang = 'de' | 'en';

export const T = {
  de: {
    logo: 'Self-Check-out',
    moment: 'Einen Moment …',
    demo: '● DEMO — Testlauf, niemand wird ausgecheckt',
    greet: 'Lieber Gast 👋',
    room: 'Abreise heute',
    readyMsg:
      'Schön, dass Sie da waren! Mit einem Tipp ist Ihr Check-out erledigt — schnell und unkompliziert.',
    go: 'Jetzt auschecken',
    going: 'Wird ausgecheckt …',
    fine: 'Nur tippen, wenn Sie wirklich abreisen.',
    doneT: 'Ausgecheckt',
    doneM:
      'Vielen Dank für Ihren Aufenthalt und gute Reise! Wir freuen uns, Sie bald wiederzusehen.',
    noDepT: 'Gerade nichts zu tun',
    noDepM:
      'Für dieses Zimmer ist aktuell kein aktiver Aufenthalt hinterlegt. Der Self-Check-out erscheint, sobald Sie eingecheckt sind.',
    balT: 'Kleiner Moment',
    balM:
      'Es ist noch ein Betrag von {amount} offen. Sobald dieser beglichen ist, ist der Check-out automatisch erledigt.',
    blockT: 'Gleich geschafft',
    blockM:
      'Der Check-out ist gerade nicht möglich. Bitte melden Sie sich kurz bei uns — wir helfen sofort.',
    errT: 'Kurzer Aussetzer',
    errM: 'Bitte versuchen Sie es gleich noch einmal — oder melden Sie sich kurz bei uns.',
    netT: 'Keine Verbindung',
    netM: 'Bitte WLAN/Internet prüfen und die Seite neu laden.',
    invT: 'Code ungültig',
    invM: 'Dieser QR-Code ist nicht (mehr) gültig. Bitte melden Sie sich kurz bei uns.',
    depToday: 'Abreise heute',
    depOn: 'Abreise am {date}',
    earlyT: 'Wirklich heute auschecken?',
    earlyM:
      'Ihr Aufenthalt ist noch bis {date} gebucht. Möchten Sie wirklich schon heute auschecken?',
    earlyGo: 'Ja, jetzt auschecken',
    earlyWait: 'Bitte kurz warten … {n}s',
    cancel: 'Abbrechen',
    fineEarly:
      'Ihr Aufenthalt läuft noch — bitte nur bestätigen, wenn Sie wirklich früher abreisen.',
  },
  en: {
    logo: 'Self-check-out',
    moment: 'One moment …',
    demo: '● DEMO — test run, nobody is checked out',
    greet: 'Dear guest 👋',
    room: 'Departing today',
    readyMsg: 'Lovely having you here! One tap completes your check-out — quick and easy.',
    go: 'Check out now',
    going: 'Checking out …',
    fine: 'Only tap if you are really leaving.',
    doneT: 'Checked out',
    doneM: 'Thank you for your stay and safe travels! We look forward to welcoming you again.',
    noDepT: 'Nothing to do yet',
    noDepM:
      'There is no active stay for this room right now. Self-check-out appears once you are checked in.',
    balT: 'One small moment',
    balM:
      'There is still an open amount of {amount}. Once it is settled, your check-out is completed automatically.',
    blockT: 'Almost there',
    blockM:
      'Check-out is not possible right now. Please reach out to us briefly — we will help straight away.',
    errT: 'Brief hiccup',
    errM: 'Please try again in a moment — or reach out to us briefly.',
    netT: 'No connection',
    netM: 'Please check your Wi-Fi/internet and reload the page.',
    invT: 'Invalid code',
    invM: 'This QR code is no longer valid. Please reach out to us briefly.',
    depToday: 'Departing today',
    depOn: 'Check-out on {date}',
    earlyT: 'Check out today already?',
    earlyM: 'Your stay is booked until {date}. Are you sure you want to check out today?',
    earlyGo: 'Yes, check out now',
    earlyWait: 'Please wait … {n}s',
    cancel: 'Cancel',
    fineEarly: 'Your stay is not over yet — only confirm if you are really leaving early.',
  },
} as const;

export type TKey = keyof typeof T.de;

export function fmt(s: string, o: Record<string, string | number> = {}): string {
  return String(s).replace(/\{(\w+)\}/g, (_, k) => (o[k] != null ? String(o[k]) : ''));
}

export function niceDate(iso: string, lang: Lang): string {
  if (!iso) return '';
  const p = String(iso).slice(0, 10).split('-');
  if (p.length < 3) return iso;
  const dt = new Date(+p[0], +p[1] - 1, +p[2]);
  if (isNaN(dt.getTime())) return iso;
  try {
    return dt.toLocaleDateString(lang === 'en' ? 'en-GB' : 'de-DE', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}
