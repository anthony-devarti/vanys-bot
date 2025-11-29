const { buildCustomReply } = require("../openaiClient");

module.exports = async function handleHostile(message, context) {
    const { playerName, content } = context;

    // 1) Hostile / abusive messages
    const reply = await buildCustomReply(
        playerName,
        `I'm sorry if I've upset you, ${playerName}. I never meant to cause you any distress.`,
        `The player is being rude or cruel to you. You are Vanys: respond with gentle confusion or mild hurt, never anger, and continue to treat them with kindness and dignity. Do NOT mention gold, balances, deposits, or banking unless they explicitly bring it up.`
    );

    await message.reply(reply);
    return true; // handled
};
