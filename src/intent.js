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

//Check to see if the user intends to make a deposit
function isDepositIntent(text) {
    const t = normalize(text);
    return (
        t.includes("deposit") ||
        t.includes("store") ||
        t.includes("hold") ||
        t.includes("bank") ||
        t.includes("save my gold") ||
        t.includes("put away") ||
        t.includes("stash") ||
        t.includes("keep this safe")
    );
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


//Check if the user intends to make a payment
function isPaymentIntent(text) {
    const t = normalize(text);
    console.log("\n[isPaymentIntent] Raw text:", text);
    console.log("[isPaymentIntent] Normalized:", t);

    // 1. Verb check – must look like a payment/spend/transfer
    const verbs = [
        "pay",
        "spend",
        "transfer",
        "send",
        "give",
        "donate",
        "settle",
        "cover",
        "purchase",
        "buy",
        "tithe"
    ];

    const hasVerb = verbs.some(v => t.includes(v));
    console.log("[isPaymentIntent] Has verb:", hasVerb);
    if (!hasVerb) return null;

    // 2. Must contain "to" or "at" to suggest a destination
    const hasTo = t.includes(" to ");
    const hasAt = t.includes(" at ");
    console.log("[isPaymentIntent] hasTo:", hasTo, "hasAt:", hasAt);

    if (!hasTo && !hasAt) return null;

    // 3. Extract candidate substring after "to" or "at"
    const afterTo = hasTo ? t.split(" to ").pop() : "";
    const afterAt = hasAt ? t.split(" at ").pop() : "";

    let candidate = "";
    if (hasTo) {
        candidate = afterTo;
    } else if (hasAt) {
        candidate = afterAt;
    }

    console.log("[isPaymentIntent] Candidate substring:", candidate);
    console.log("Shops", SHOPS)

    // 4. Word-level fuzzy match against known shops
    const { shop: bestShop, score } = findBestShopForCandidate(candidate);

    console.log("[isPaymentIntent] Word-level fuzzy score:", score);
    console.log("[isPaymentIntent] Word-level fuzzy match:", bestShop);

    if (!bestShop) return null;

    return { shopName: bestShop.name };
}

//Check to see if the user intends to make a withdrawal
function isWithdrawIntent(text) {
    const t = text.toLowerCase();
    return (
        t.includes("withdraw") ||
        t.includes("take out") ||
        t.includes("take back") ||
        t.includes("remove gold") ||
        t.includes("pull gold") ||
        t.includes("cash out") ||
        t.includes("spend from my account") ||
        t.includes("take my gold") ||
        t.includes("get my gold back")
    );
}

//check if the user is just asking about their current balance
function isBalanceRequest(text) {
    const t = normalize(text);
    return (
        t.includes("balance") ||
        t.includes("how much gold") ||
        t.includes("how many gold") ||
        t.includes("how much do i have") ||
        t.includes("gold do i have") ||
        t.includes("current gold") ||
        t.includes("what do i have with you")
    );
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
        t.includes("tell you what happened")
    );
}

// Gold amount extractor, aware of gold terms
function extractGoldAmount(text) {
    const t = normalize(text);

    // Match things like:
    // 10 gp, 10gp, 10 gold, 10 gold pieces, 10 g
    const goldPattern = /\b(\d+)\s*(gp|g|gold|gold pieces?)\b/i;
    const match = t.match(goldPattern);
    if (!match) return null;

    const amount = parseInt(match[1], 10);
    return Number.isFinite(amount) && amount > 0 ? amount : null;
}

module.exports = {
    isHostile,
    isDepositIntent,
    isWithdrawIntent,
    isPaymentIntent,
    isBalanceRequest,
    isHistoryIntent,
    extractGoldAmount
};
