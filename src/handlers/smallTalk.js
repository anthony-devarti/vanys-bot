const { buildCustomReply } = require("../openaiClient");
const path = require("path");
const vanysKB = require(path.join(__dirname, "..", "vanys-kb.json"));

module.exports = async function handleSmallTalk(message, context) {
    const { playerName, content, getSmallTalkTopicsFromKB } = context;

    const topics = getSmallTalkTopicsFromKB();
    const topicsText = topics.length ? topics.map(t => `- ${t}`).join("\n") : "None";

    // Quick KB search heuristic: check if the user's message mentions any KB keys
    // or keywords from KB entries (short/detail/services). This helps logging
    // whether the KB likely contains relevant information for the query.
    function findKBMatches(text) {
        if (!text) return [];
        const t = text.toLowerCase();

        const STOPWORDS = new Set([
            "the", "a", "an", "and", "or", "but", "to", "of", "in", "on", "at", "for", "with", "from", "into", "by",
            "is", "are", "was", "were", "be", "been", "being", "it", "this", "that", "these", "those",
            "i", "you", "he", "she", "they", "we", "me", "him", "her", "them", "us", "my", "your", "our", "their",
            "about", "tell", "know", "what", "where", "who", "when", "how", "why", "please"
        ]);

        const normalizeWords = (s) => {
            return (s || "")
                .toLowerCase()
                .replace(/<@!?\d+>/g, " ")      // strip mentions
                .replace(/[^a-z0-9\s]/g, " ")   // strip punctuation
                .replace(/\s+/g, " ")
                .trim()
                .split(" ")
                .filter(w => w.length >= 3 && !STOPWORDS.has(w));
        };

        const queryWords = new Set(normalizeWords(t));
        if (queryWords.size === 0) return [];

        const matches = [];

        const scoreEntry = (category, key, entry) => {
            const keyWords = normalizeWords(key.replace(/[_-]+/g, " "));
            const shortWords = normalizeWords(entry?.short || "");
            const detailWords = normalizeWords(entry?.detail || "");
            const serviceWords = Array.isArray(entry?.services)
                ? entry.services.flatMap(s => normalizeWords(s))
                : [];

            const allWords = new Set([...keyWords, ...shortWords, ...detailWords, ...serviceWords]);

            let score = 0;
            const hits = [];

            for (const qw of queryWords) {
                if (allWords.has(qw)) {
                    // weight key hits more
                    const isKeyHit = keyWords.includes(qw);
                    score += isKeyHit ? 3 : 1;
                    hits.push({ word: qw, weight: isKeyHit ? 3 : 1 });
                }
            }

            // bonus if query contains the exact key with spaces (skalethron keep)
            const humanKey = key.toLowerCase().replace(/[_-]+/g, " ").trim();
            if (humanKey && t.includes(humanKey)) score += 4;

            if (score > 0) {
                matches.push({ category, key, score, hits: hits.slice(0, 6) });
            }
        };

        for (const [cat, obj] of Object.entries(vanysKB)) {
            if (cat === "marketplace" && obj && obj.shops) {
                for (const [k, e] of Object.entries(obj.shops)) {
                    scoreEntry("marketplace.shop", k, e);
                }
                continue;
            }

            if (obj && typeof obj === "object") {
                for (const [k, e] of Object.entries(obj)) {
                    scoreEntry(cat, k, e);
                }
            }
        }

        // Sort by score, highest first
        matches.sort((a, b) => b.score - a.score);

        // return top 5 to keep things sane
        return matches.slice(0, 5);
    }


    const kbMatches = findKBMatches(content);
    console.info({ action: 'kb_search', user_id: message.author.id, message: message.content, playerName, found: kbMatches.length > 0, matches: kbMatches.slice(0, 5) });

    // If we found KB matches, produce a concise, KB-grounded factual reply instead
    if (kbMatches && kbMatches.length) {
        // Prefer the first reliable match and use only its `short` and `detail` fields.
        let chosen = null;
        for (const m of kbMatches) {
            const { category, key } = m;
            let entry = null;
            if (category === 'marketplace.shop') {
                entry = vanysKB.marketplace && vanysKB.marketplace.shops && vanysKB.marketplace.shops[key];
            } else if (vanysKB[category] && vanysKB[category][key]) {
                entry = vanysKB[category][key];
            }
            if (entry) {
                chosen = { category, key, entry };
                break;
            }
        }

        if (chosen) {
            const { category, key, entry } = chosen;
            const shortText = (entry.short || '').trim();
            const detailText = (entry.detail || '').trim();



            // Build a strict factual prompt that includes the entire KB entry
            // so the LLM can generate a natural reply while being constrained
            // to the provided facts. Provide a deterministic fallback built
            // from the KB entry for when the OpenAI key is not set.
            const kbJson = JSON.stringify({ category, key, short: shortText, detail: detailText }, null, 2);

            const factualPrompt = `Use ONLY the knowledge-base entry below to answer the player's question. Do NOT invent, infer, or add any facts not present in these fields. If the player's question cannot be answered using these fields, reply exactly: "I'm sorry, but I don't know."\n\n` +
                `KB_ENTRY:\n${kbJson}\n\n` +
                `Player input: "${content}"\n\n` +
                `Instructions:\n- Answer in 1-2 concise sentences in-character as Vanys.\n- You may rephrase or combine the KB fields, but you cannot add new facts.\n- If the KB entry does not contain the requested information, reply that you don't know, but would love to hear about the user's new discoveries on the topic.`;

            // sensible deterministic fallback for local testing (uses short + first sentence of detail)
            const firstSentence = (s) => {
                if (!s) return '';
                const m = s.trim().match(/([^.!?]+[.!?])\s*/);
                return m ? m[1].trim() : s.trim();
            };
            const detailSentence = firstSentence(detailText);
            const fallbackReply = detailSentence ? `${shortText} ${detailSentence}`.trim() : shortText;

            console.info({ action: 'kb_chosen', user_id: message.author.id, playerName, chosen: { category, key } });

            // Log prompt preview and API key presence so we can verify whether
            // the LLM path is being used or the deterministic fallback.
            try {
                console.info({
                    action: 'kb_prompt_sent',
                    user_id: message.author.id,
                    playerName,
                    hasApiKey: !!process.env.OPENAI_API_KEY,
                    promptPreview: factualPrompt.slice(0, 800)
                });
            } catch (e) {
                console.info({ action: 'kb_prompt_sent', note: 'prompt preview unavailable' });
            }

            const reply = await buildCustomReply(playerName, fallbackReply, factualPrompt);
            // Heuristic: if the reply exactly matches the fallback, assume fallback used.
            const usedFallback = reply === fallbackReply;
            console.info({ action: 'kb_prompt_result', user_id: message.author.id, playerName, usedFallback, reply });

            await message.reply(reply);
            console.info({ action: 'small_talk_kb_factual', user_id: message.author.id, playerName, used: { category, key } });
            return true;
        }
    }

    //classify the query as SMALLTALK or FACTUAL
    async function classifyQuery(playerName, content) {
        const fallback = "SMALLTALK"; // safest default

        // If no API key, default to small talk rather than "I don't know"
        if (!process.env.OPENAI_API_KEY) return fallback;

        const systemPrompt =
            `You are a strict classifier. Output exactly one token: SMALLTALK or FACTUAL.\n` +
            `Rules:\n` +
            `- SMALLTALK: greetings, feelings, check-ins, casual conversation, jokes, roleplay banter, insults, compliments.\n` +
            `- FACTUAL: asking for world facts, locations, services, prices, rules, timelines, who/what/where/when/how about setting details.\n` +
            `- If unclear, choose SMALLTALK.\n` +
            `- Do not output anything else.`;

        const userPrompt = `Player message: "${content}"`;

        // We can reuse buildCustomReply as a classifier by forcing strict output.
        // buildCustomReply(playerName, fallbackReply, prompt)
        const label = await buildCustomReply(playerName, fallback, systemPrompt + "\n\n" + userPrompt);

        const cleaned = String(label || "").trim().toUpperCase();
        if (cleaned === "FACTUAL" || cleaned === "SMALLTALK") return cleaned;

        return fallback;
    }


    if (!kbMatches || kbMatches.length < 1) {
        const classification = await classifyQuery(playerName, content);

        console.info({
            action: "kb_no_match_classified",
            user_id: message.author.id,
            playerName,
            classification
        });

        if (classification === "FACTUAL") {
            const reply =
                `I'm sorry, ${playerName}, but I don't know the answer to that. ` +
                `If you learn more, I would be grateful to hear it and add it to my notes.`;
            await message.reply(reply);
            console.info({ action: "small_talk_factual_admission", user_id: message.author.id, playerName });
            return true;
        }

        // SMALLTALK falls through to your normal warm buildCustomReply below
    }


    const reply = await buildCustomReply(
        playerName,
        `Hello ${playerName}. It is good to have you here in Farhearth.`,
        `The player is speaking to you casually or emotionally, but not about gold, deposits, balances, or history payments.

                They just said: "${content}"

                Respond directly to what they said in character as Vanys: warm, friendly, gently humorous, curious about their well-being or any news from beyond Farhearth.

                You may mention ONE relevant detail from the world, but only if it fits naturally with what they said. You must not invent new places or facts. These are the only world details you are allowed to reference in small talk right now:

                ${topicsText}

                Do NOT bring up gold or banking unless they do.
                If the player appears to be asking where to buy something, check the known shops and services. 
                If any shop's services match what they asked for, direct them specifically to that shop by name.
                If there is no known shop offering what they want, tell them you do not know.`
    );

    await message.reply(reply);
    console.info({ action: 'small_talk', user_id: message.author.id, playerName });
    return true;
};
