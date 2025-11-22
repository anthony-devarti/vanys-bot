// src/fuzzy.js
// Generic fuzzy helpers for re-use across the bot.

function simplify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "") // drop punctuation
    .replace(/\s+/g, " ")        // collapse spaces
    .trim();
}

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,       // deletion
        dp[i][j - 1] + 1,       // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return dp[m][n];
}

function similarity(a, b) {
  const s1 = simplify(a);
  const s2 = simplify(b);
  if (!s1.length && !s2.length) return 1;
  const dist = levenshtein(s1, s2);
  const maxLen = Math.max(s1.length, s2.length);
  return 1 - dist / maxLen;
}

/**
 * Find best fuzzy match in a list.
 * candidates: array of anything
 * getText: function to turn each candidate into a string
 * returns { match, score } or { match: null, score: 0 }
 */
function bestFuzzyMatch(input, candidates, getText, threshold = 0) {
  let best = null;
  let bestScore = 0;

  for (const item of candidates) {
    const text = getText(item);
    const score = similarity(input, text);
    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }

  if (!best || bestScore < threshold) {
    return { match: null, score: bestScore };
  }

  return { match: best, score: bestScore };
}

module.exports = {
  similarity,
  bestFuzzyMatch
};
