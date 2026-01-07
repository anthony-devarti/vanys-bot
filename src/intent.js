// All text/intention parsing logic for Vanys lives here.

//Check if the user intends to make a payment
// Recreated cleanly with isPaymentIntent removed
// All text/intention parsing logic for Vanys lives here.

const OpenAI = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const hostileSeeds = require("./hostileSeeds");
const { getAllShops } = require("./db");
const { bestFuzzyMatch, similarity } = require("./fuzzy");
const SHOPS = getAllShops();   // [{ name, normalized_name }]


// Strip Discord mentions and normalize (this is message metadata that will confuse vanys with a crazy big number)
function normalize(text) {
  return text.replace(/<@!?\d+>/g, "").toLowerCase();
}

//see if something even needs to be checked for moderation.
function looksRude(text) {
  const t = text.toLowerCase();
  return hostileSeeds.some(seed => t.includes(seed));
}

//Check for hostile or abusive responses so Vanys can be sad and make the user feel bad
async function isHostile(text) {
  //1. cheap local prefilter check to see if moderation should be run.
  if (!looksRude(text)) return false;

  // 2. If no API key, fail-safe to false
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return false;

  //hop into an intelligent moderation check
  try {
    const response = await openai.moderations.create({
      model: "omni-moderation-latest",
      input: text
    });

    const categories = response.results[0].categories;

    // If any of these are flagged, treat the message as hostile
    if (
      categories.harassment ||
      categories.harassment_threatening ||
      categories.hate ||
      categories.hate_threatening
    ) {
      return true;
    }

    return false;
  } catch (err) {
    console.error("Moderation API error:", err);
    // Fail-safe: if moderation fails, assume NOT hostile
    return false;
  }
}

// Unified banking intent: catches deposit, withdraw, and other bank-related requests.
function isBankingIntent(text) {
  if (!text) return false;
  const t = normalize(text);

  // phrases that indicate depositing/saving/storing
  const depositPhrases = ["deposit", "store", "hold", "bank", "save my gold", "put away", "stash", "keep this safe"];

  // phrases that indicate withdrawing/taking out
  const withdrawPhrases = ["withdraw", "take out", "take back", "remove gold", "pull gold", "cash out", "spend from my account", "take my gold", "get my gold back"];

  for (const p of depositPhrases) {
    if (t.includes(p)) return true;
  }
  for (const p of withdrawPhrases) {
    if (t.includes(p)) return true;
  }

  // also treat plain mentions of "bank" or "account" as banking intent
  if (t.includes("account") || t.includes("bank of vanys")) return true;

  return false;
}

//Helper function to find the best shop name
const STOPWORDS = new Set([
  "the", "a", "an", "of", "to", "at", "on", "in", "for", "with", "and", "but"
]);

function findBestShopForCandidate(candidate) {
  // break into words, normalize, and drop stopwords
  const candWords = candidate
  .toLowerCase()
  .split(/\s+/)
  .map(w => w.replace(/[^a-z0-9]/g, "")) // strip punctuation
  .filter(w => w.length > 0 && !STOPWORDS.has(w));

  if (candWords.length === 0) {
  return { shop: null, score: 0 };
  }

  let bestShop = null;
  let bestScore = 0;
  const THRESHOLD = 0.6;

  for (const shop of SHOPS) {
  const base = (shop.normalized_name || shop.name).toLowerCase();
  const shopWords = base
    .split(/\s+/)
    .map(w => w.replace(/[^a-z0-9]/g, ""))
    .filter(w => w.length > 0 && !STOPWORDS.has(w));

  for (const cw of candWords) {
    for (const sw of shopWords) {
    const score = similarity(cw, sw);
    if (score > bestScore) {
      bestScore = score;
      bestShop = shop;
    }
    }
  }
  }

  if (!bestShop || bestScore < THRESHOLD) {
  return { shop: null, score: bestScore };
  }

  return { shop: bestShop, score: bestScore };
}

//Vanys will happily share history fact with users, 
//but he gets excited so we make sure they actually want to talk about that or he'll bring it up constantly
function isHistoryIntent(text) {
  const t = normalize(text);
  return (
    t.includes("session recap") ||
    t.includes("sell my story") ||
    t.includes("sell my history") ||
    t.includes("record my tale") ||
    t.includes("write this down") ||
    t.includes("pay for recap") ||
    t.includes("tell you what happened") ||
    t.includes("adventure report") ||
    t.includes("recap")
  );
}

function isAdventureRequest(text) {
  if (!text) return false;
  const t = text.toLowerCase();

  // Only treat explicit signup/availability phrases as adventure requests.
  const adventurePhrases = [
    "sign up",
    "sign-up",
    "signup",
    "go on a quest",
    "join a quest",
    "join an adventure",
    "available adventures",
    "upcoming adventure",
    "upcoming adventures",
    "view adventures",
    "adventure sign up"
  ];

  for (const p of adventurePhrases) {
    if (t.includes(p)) return true;
  }

  return false;
}

module.exports = {
  isHostile,
  isBankingIntent,
  isHistoryIntent,
  isAdventureRequest
};
