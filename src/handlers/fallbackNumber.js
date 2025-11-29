const { buildCustomReply } = require("../openaiClient");

module.exports = async function handleFallbackNumber(message, context) {
    const { playerName } = context;

    const reply = await buildCustomReply(
        playerName,
        `I see you mentioned a number, ${playerName}, but I'm not quite sure what you wish me to do with it.`,
        `The player mentioned a number but did not clearly express banking intent. Ask, in character, what they would like you to do with that amount, without assuming a deposit or withdrawal.`
    );

    await message.reply(reply);
    console.info({ action: 'ambiguous_number', user_id: message.author.id, playerName });
    return true;
};
