const { buildCustomReply } = require("../openaiClient");

module.exports = async function handleSmallTalk(message, context) {
    const { playerName, content, getSmallTalkTopicsFromKB } = context;

    const topics = getSmallTalkTopicsFromKB();
    const topicsText = topics.length ? topics.map(t => `- ${t}`).join("\n") : "None";

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
