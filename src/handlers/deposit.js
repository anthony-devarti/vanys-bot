const { depositGold } = require("../db");
const { buildTransactionalReply, buildNoAmountReply } = require("../openaiClient");

module.exports = async function handleDeposit(message, context) {
    const { playerName, amount, depositIntent } = context;

    if (!depositIntent) return false;

    // A deposit intent but no amount
    if (depositIntent && amount === null) {
        const reply = await buildNoAmountReply(playerName);
        await message.reply(reply);
        return true;
    }

    if (depositIntent && amount !== null) {
        const newBalance = depositGold(message.author.id, playerName, amount);

        console.info({
            action: 'deposit',
            user_id: message.author.id,
            playerName,
            amount,
            newBalance
        });

        const reply = await buildTransactionalReply(playerName, amount, newBalance);
        await message.reply(reply);
        return true;
    }

    return false;
};
