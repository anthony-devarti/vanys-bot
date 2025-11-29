const { buildCustomReply } = require("../openaiClient");

module.exports = async function handleWithdrawRequest(message, context) {
    const { playerName } = context;

    const reply = await buildCustomReply(
        playerName,
        `You wish to withdraw some gold, ${playerName}? Tell me how much, and I will prepare it.`,
        `The player is expressing intent to withdraw gold but did not specify an amount. Ask them, in character as Vanys, how much gold they would like to withdraw, with your usual warmth and concern. Do not mention deposits.`
    );

    await message.reply(reply);
    console.info({
        action: 'withdraw_request_prompted',
        user_id: message.author.id,
        playerName
    });
    return true;
};
