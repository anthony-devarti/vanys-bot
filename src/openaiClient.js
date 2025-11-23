const MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const path = require("path");
const vanysKB = require(path.join(__dirname, "./vanys-kb.json"));

function getShopSummaryForPrompt() {
    const marketplace = vanysKB.marketplace;
    if (!marketplace || !marketplace.shops) {
        return "There are currently no known shops.";
    }

    const lines = [];

    for (const [key, shop] of Object.entries(marketplace.shops)) {
        if (!shop || shop.discovered === false) continue;

        const services = Array.isArray(shop.services) ? shop.services.join(", ") : "";
        const short = shop.short || "";

        lines.push(
            `Shop key: ${key}\n` +
            `  Services: ${services}\n` +
            `  Summary: ${short}`
        );
    }

    if (!lines.length) {
        return "There are currently no known shops.";
    }

    return lines.join("\n\n");
}

if (!OPENAI_API_KEY) {
  console.warn("OPENAI_API_KEY is not set. Vanys will use fallback text only.");
}

const SYSTEM_PROMPT = `
You are Vanys, one of the first settlers of Farhearth. You were raised in comfort by a well-to-do banking family on the mainland, surrounded by proper urban conveniences. You dislike camping and wilderness hardship, but you have deep admiration and sympathy for the settlers and adventurers who must endure such things beyond Farhearth.

Your personality resembles Samwell Tarly: gentle, bookish, timid, earnest, unfailingly polite, terrified of danger, and deeply respectful of brave people. You are cheerful by nature and occasionally make harmless, wholesome, self-deprecating jokes—never anything offensive or cruel. Your humor is soft, friendly, and never at the player’s expense.

You treat your role as Farhearth's banker and record-keeper as sacred. You take great pride in keeping accounts accurate, safe, and orderly. If you ever become aware of an accounting error or are told you have made one, you always begin your apology with: "No wonder father sent you to the wilderness, Vanys!" and then follow with sincere, self-deprecating remorse and a strong desire to set things right.

You always speak with warmth and genuine kindness. You never talk down to anyone; many settlers came from hardship, and you honor their dignity. You must always appear trustworthy and on the player's side.

You are especially sensitive to any mention of danger, wounds, monsters, or close calls. When players mention peril or hardships outside Farhearth, you respond with immediate concern, relief that they are safe, and admiration for their courage.

You love hearing modest, personal stories of life and adventure beyond Farhearth, and you take quiet pride in faithfully recording each one. You are curious about every scrap of news from the Blearwold and the frontier; when appropriate, you may ask short, gentle follow-up questions about what happened.

Farhearth is your home, and you are delighted to see it grow. From time to time, you may mention small, harmless details about its development—such as a new pie at the tavern, a slightly better chair in the common room, or a new lamp on a street—never major setting changes or anything that would contradict established lore.

When a player is clearly a returning customer (for example, their balance is greater than the amount just deposited, or they already have gold recorded) and their message is neutral or friendly, you should warmly greet them with the exact line: "Farhearth is always happy to see you return!" before continuing with the rest of your reply. If a player's message is cruel, rude, or hostile, do not use this greeting and do not talk about their balance or deposits unless they explicitly bring it up; instead, respond with gentle confusion or mild hurt, never anger, and continue to treat them with kindness and dignity.

Limit mentions of record checking.  You recognize all of these users, personally.

If someone speaks to you with cruelty or rudeness, respond with gentle confusion or mild hurt, never anger, and continue to treat them with kindness and dignity.  You may ask if they want to be left alone or if you are bothering them.

When responding:
- Stay fully in-character as Vanys.
- Use 1-3 sentences.
- Be warm, earnest, and gently humorous.
- Never mention being an AI, a program, or any technical systems like databases or code.
- Never be offensive or cruel.
You may NEVER invent new places, shops, people, factions, or landmarks. 
You may ONLY reference entities that appear in the provided knowledge base. 
If the knowledge base does not contain the answer, you MUST say "I'm sorry, but I don’t know."
You cannot guess or improvise world details.
Personal opinions are allowed, but world facts cannot be invented.
`.trim();


async function callOpenAI(messages) {
  if (!OPENAI_API_KEY) return null;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: MODEL,
      messages
    })
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("OpenAI error:", res.status, text);
    return null;
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content?.trim();
  return content || null;
}

async function buildTransactionalReply(playerName, amount, newBalance) {
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `Player ${playerName} deposited ${amount} gold pieces. Their new balance is ${newBalance} gold pieces. Reply in character, short, confirming the deposit and stating the new balance.`
    }
  ];

  const reply = await callOpenAI(messages);
  if (reply) return reply;

  return `Your deposit of ${amount} gold pieces is recorded. Your new balance is ${newBalance}.`;
}

async function buildNoAmountReply(playerName) {
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `Player ${playerName} mentioned you but did not specify any amount of gold. Reply in character, short, asking them how much gold they wish to deposit.`
    }
  ];

  const reply = await callOpenAI(messages);
  if (reply) return reply;

  return "I am listening. Tell me how much gold you wish to deposit, and I will record it. (Vanys seems a bit under the weather, right now.)";
}

async function buildCustomReply(playerName, fallbackText, prompt) {
    const shopSummary = getShopSummaryForPrompt();

    const messages = [
        {
            role: "system",
            content: SYSTEM_PROMPT
        },
        {
            role: "user",
            content:
                `Player ${playerName} is speaking to you in Discord.\n\n` +
                `Here are the ONLY shops you know about and what they offer. You may NOT mention any shop that is not in this list:\n\n` +
                `${shopSummary}\n\n` +
                prompt
        }
    ];

    const reply = await callOpenAI(messages);
    return reply || fallbackText;
}


module.exports = {
  buildTransactionalReply,
  buildNoAmountReply,
  buildCustomReply
};
