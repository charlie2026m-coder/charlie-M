import { describe, it, expect } from 'vitest';
import { lastNameMatches, normalizeLastName } from '@/lib/matchLastName';

describe('normalizeLastName', () => {
  it('lowercases and strips separators', () => {
    expect(normalizeLastName('  Müller ')).toBe(normalizeLastName('müller'));
  });
  it('returns empty for nullish', () => {
    expect(normalizeLastName(null)).toBe('');
    expect(normalizeLastName(undefined)).toBe('');
    expect(normalizeLastName('   ')).toBe('');
  });
});

describe('lastNameMatches', () => {
  const check = (input: string, candidate: string) => lastNameMatches(input, [candidate]);

  it('matches case-insensitively', () => {
    expect(check('MÜLLER', 'Müller')).toBe(true);
    expect(check('müller', 'Müller')).toBe(true);
  });

  it('matches German/Nordic umlaut transliteration', () => {
    expect(check('Mueller', 'Müller')).toBe(true);
    expect(check('Strasse', 'Straße')).toBe(true);
    expect(check('Bronset', 'Brønset')).toBe(true);
  });

  it('matches Latin diacritics', () => {
    expect(check('renee', 'Renée')).toBe(true);
    expect(check('francois', 'François')).toBe(true);
    expect(check('Celik', 'Çelik')).toBe(true);
  });

  it('matches Cyrillic transliteration both ways', () => {
    expect(check('Ivanov', 'Иванов')).toBe(true);
    expect(check('иванов', 'Ivanov')).toBe(true);
  });

  it('ignores apostrophes, hyphens and spaces', () => {
    expect(check('OBrien', "O'Brien")).toBe(true);
    expect(check('Mary Jane', 'Mary-Jane')).toBe(true);
  });

  it('matches a single part of a compound surname (>= 4 chars)', () => {
    expect(check('Marquez', 'García Márquez')).toBe(true);
  });

  it('rejects typos and wrong names (security check)', () => {
    expect(check('Smyth', 'Smith')).toBe(false);
    expect(check('Schmidt', 'Müller')).toBe(false);
  });

  it('rejects multi-name fishing — input with 3+ tokens never opens a single surname', () => {
    // The reverse match is capped at 2 input tokens, so a bag of common
    // surnames (the review's 🔴 finding) cannot fish.
    expect(check('Smith Jones Brown Mueller', 'Hans Brown')).toBe(false);
    expect(check('Smith Jones Brown', 'Brown')).toBe(false);
    expect(check('Anna Maria Schmidt', 'Schmidt')).toBe(false);
  });

  it('accepts a guest who types their full name (<= 2 tokens) against a stored single surname', () => {
    // Common: one name box, guest types "Firstname Lastname"; record has only
    // the surname. Or a double surname stored as one part.
    expect(check('Anna Garcia', 'Garcia')).toBe(true);
    expect(check('Garcia Marquez', 'Marquez')).toBe(true);
  });

  it('still accepts the full compound input against the same compound candidate', () => {
    expect(check('Garcia Marquez', 'García Márquez')).toBe(true);
  });

  it('rejects fragments shorter than the token minimum', () => {
    expect(check('Li', 'Li Wei Zhang')).toBe(false);
  });

  it('never matches empty input', () => {
    expect(lastNameMatches('', ['Müller'])).toBe(false);
    expect(lastNameMatches('Müller', [null, undefined])).toBe(false);
  });

  it('matches against any candidate (guest OR booker)', () => {
    expect(lastNameMatches('Booker', ['Guest', 'Booker'])).toBe(true);
  });
});
