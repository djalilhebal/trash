/// Dynamic programming baby!

/**
 * Levenshtein Distance, adapted from Wikipedia
 * @see http://en.wikipedia.org/wiki/Levenshtein_distance
 * @example
 * leDistance("Alice", "Alex") === 3
 *
 * @param {string} a
 * @param {string} b
 * @returns {number} - number of min edits
 */
function leDistance(a, b) {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const v0 = [];
  const v1 = [];

  for (let i = 0; i <= b.length; i++) {
    v0[i] = i;
  }

  for (let i = 0; i < a.length; i++) {
    v1[0] = i + 1;
    for (let j = 0; j < b.length; j++) {
      const cost = a[i] === b[j] ? 0 : 1;
      v1[j + 1] = Math.min(v1[j] + 1,     // delete char from b
                           v0[j + 1] + 1, // insert char to b
                           v0[j] + cost); // substitute a char
    }

    for (let j = 0; j <= b.length; j++) {
      v0[j] = v1[j];
    }
  }

  return v1[b.length];
}

// This recursive version is easier to understand, but inefficient
function /** number */ leDistanceR(/** string */ s, /** string */ t) {
  if (s.length === 0) return t.length;
  if (t.length === 0) return s.length;

  // test if first characters of the strings match
  const cost = s[0] === t[0] ? 0 : 1;

  // Delete char from s, from t, and from both
  return Math.min(leDistanceR(s.slice(1), t) + 1,
                  leDistanceR(s, t.slice(1)) + 1,
                  leDistanceR(s.slice(1), t.slice(1)) + cost);
}
