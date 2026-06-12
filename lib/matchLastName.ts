/**
 * Last-name matching for guest reservation lookup.
 *
 * Verifies that whoever enters a reservation ID also knows the guest's last
 * name, so a known/guessable Apaleo ID alone is not enough to open a booking.
 * Mirrors the trust model of `/api/bookings/search`.
 *
 * Matching is lenient on FORMATTING (case, whitespace, punctuation, diacritics,
 * umlauts, AND cross-script transliteration) but strict on CONTENT. It compares
 * against every last name Apaleo exposes (primaryGuest AND booker), because the
 * payer and the staying guest are often different people.
 *
 * Coverage (all of these MATCH):
 *   Case/space/punct : "Mueller" forms, "O'Brien"="OBrien", "Mary-Jane"="Mary Jane"
 *   German/Nordic    : "Mueller"="Müller", "Strasse"="Straße", "Bronset"="Brønset"
 *   Polish/Icelandic : "Lukasz"="Łukasz",  "Thor"="Þór"
 *   Latin diacritics : "renee"="Renée",    "Celik"="Çelik",   "francois"="François"
 *   Cyrillic         : "Ivanov"="Иванов"="ivanov"   (heuristic translit, see limits)
 *   Greek            : "Papadopoulos"=Greek spelling (heuristic)
 *   Compound names   : "Marquez" matches "García Márquez"  (token match, >= 4 chars)
 *
 * KNOWN LIMITS (do NOT match — need the human fallback / email factor):
 *   - Transliteration is HEURISTIC, not passport-exact: "Александр" -> "aleksandr"
 *     will NOT equal a passport "Alexander". "Сергеев" -> "sergeev" != "Sergeyev".
 *   - Arabic, Hebrew, CJK, Thai, etc. are NOT transliterated (ambiguous / no 1:1
 *     mapping). Latinized "Tanaka"/"Mohammed" won't equal their native script.
 *   - Token match requires >= 4 chars, so very short surnames ("Li", "Wu", "Ng")
 *     won't match as a token of a compound name.
 *   - Typos ("Smith" vs "Smyth") are rejected — this is a security check.
 *
 * NOTE: For full deterministic coverage of every script you could swap the maps
 * below for the `any-ascii` package (server-only). Left as a self-contained map
 * to avoid adding a dependency. See README.
 */

// Minimum length for a single token to count as a match inside a compound name.
// Tuned to 4 so short surnames can't be guessed as a token. (Product decision.)
const TOKEN_MIN_LENGTH = 4;

// Single character -> ASCII map, applied BEFORE diacritic stripping so multi-
// char expansions survive (ü -> ue, not ü -> u). Latin letters absent from the
// map fall through unchanged; their combining diacritics are stripped by NFD
// afterwards (é -> e, ñ -> n, ç -> c, å -> a ...).
const TRANSLIT_MAP: Record<string, string> = {
  // --- Latin: atomic letters NFD does NOT decompose ---
  ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss',
  ø: 'o', æ: 'ae', œ: 'oe', ł: 'l', đ: 'd', þ: 'th', ð: 'd', ı: 'i',

  // --- Cyrillic (Russian + Ukrainian/Belarusian extras), heuristic ---
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh',
  з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o',
  п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts',
  ч: 'ch', ш: 'sh', щ: 'shch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu',
  я: 'ya', і: 'i', ї: 'yi', є: 'ye', ґ: 'g', ў: 'u',

  // --- Greek (incl. accented vowels), heuristic ---
  α: 'a', β: 'v', γ: 'g', δ: 'd', ε: 'e', ζ: 'z', η: 'i', θ: 'th',
  ι: 'i', κ: 'k', λ: 'l', μ: 'm', ν: 'n', ξ: 'x', ο: 'o', π: 'p',
  ρ: 'r', σ: 's', ς: 's', τ: 't', υ: 'y', φ: 'f', χ: 'ch', ψ: 'ps',
  ω: 'o', ά: 'a', έ: 'e', ή: 'i', ί: 'i', ϊ: 'i', ΐ: 'i', ό: 'o',
  ύ: 'y', ϋ: 'y', ΰ: 'y', ώ: 'o',
};

// Combining diacritical marks left over after NFD (é -> e + mark).
const DIACRITIC_MARKS = /\p{Diacritic}/gu;

// Code points treated as separators / ignorable inside a name. Built from hex
// (not literal glyphs) so the source stays plain ASCII and no invisible chars
// live in the file. ASCII whitespace is handled separately via \s.
//   zero-width: ZWSP/ZWNJ/ZWJ, word-joiner, BOM
//   apostrophes: ' ‘ ’ ʼ ′      backtick `      acute ´
//   dot .       hyphen -        dashes: figure/en/em/horizontal/minus
const IGNORABLE_CODES = [
  0x200b, 0x200c, 0x200d, 0x2060, 0xfeff,
  0x0027, 0x2018, 0x2019, 0x02bc, 0x2032, 0x0060, 0x00b4,
  0x002e, 0x002d, 0x2012, 0x2013, 0x2014, 0x2015, 0x2212,
];
const IGNORABLE_CHARS = IGNORABLE_CODES.map((code) => String.fromCodePoint(code));

// Lowercase + NFC + transliterate. Separators are NOT removed here (so the
// result can be both joined and tokenized by the callers below).
function normalizeChars(value: string | null | undefined): string {
  if (!value) return '';
  const lowered = value.normalize('NFC').toLowerCase();
  const transliterated = lowered.replace(/./gu, (ch) => TRANSLIT_MAP[ch] ?? ch);
  return transliterated.normalize('NFD').replace(DIACRITIC_MARKS, '');
}

// Replace every separator (ASCII whitespace + IGNORABLE_CHARS) with a single
// space, so the result can be split into tokens or glued together.
function spaceOutSeparators(value: string): string {
  let result = value.replace(/\s+/g, ' ');
  for (const ch of IGNORABLE_CHARS) {
    if (result.includes(ch)) result = result.split(ch).join(' ');
  }
  return result;
}

/** Fully normalized, separators removed — the canonical comparison form. */
export function normalizeLastName(value: string | null | undefined): string {
  return spaceOutSeparators(normalizeChars(value)).replace(/ /g, '').trim();
}

/** Significant tokens of a name (split on separators, each normalized). */
function significantTokens(value: string | null | undefined): string[] {
  return spaceOutSeparators(normalizeChars(value))
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
}

/**
 * True when `input` matches ANY candidate, by either:
 *   - full normalized equality ("Mueller" === "Müller"), or
 *   - the WHOLE input equalling one significant token (>= 4 chars) of a
 *     compound candidate, so a guest who types one surname of a compound name
 *     ("Márquez" of "García Márquez") still matches.
 *
 * The input is deliberately NEVER tokenized: tokenizing it let a single
 * request carry many guesses at once ("Smith Jones Brown Mueller …" matched
 * if ANY token hit). One request = one guess; this is a security factor.
 * Empty input never matches.
 */
export function lastNameMatches(
  input: string,
  candidates: Array<string | null | undefined>,
): boolean {
  const inputJoined = normalizeLastName(input);
  if (!inputJoined) return false;

  return candidates.some((candidate) => {
    const candidateJoined = normalizeLastName(candidate);
    if (!candidateJoined) return false;

    if (candidateJoined === inputJoined) return true;

    // Compound-name fallback: the whole input vs candidate tokens only,
    // min length enforced so short fragments can't be guessed.
    if (inputJoined.length < TOKEN_MIN_LENGTH) return false;
    return significantTokens(candidate).includes(inputJoined);
  });
}
