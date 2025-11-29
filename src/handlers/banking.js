const { withdrawGold } = require("../db");
const { buildCustomReply } = require("../openaiClient");

module.exports = async function handleBanking(message, context) {
    const { playerName, amount, payment, withdrawIntent } = context;

    // If no amount provided, we shouldn't be here
    if (amount === null) return false;

    // Payments and withdrawals are the same; perform withdraw
    const result = withdrawGold(message.author.id, playerName, amount);

    // Structured log: action performed
    console.info({
        action: 'withdraw_attempt',
        user_id: message.author.id,
        playerName,
        amount,
        payment: payment?.shopName || null
    });

    if (!result.success) {
        console.info({
            action: 'withdraw_failed',
            user_id: message.author.id,
            playerName,
            amount,
            balance: result.balance
        });
        const reply =
            `I'm terribly sorry ${playerName}, but your account does not hold enough gold for that transaction. Your current balance is ${result.balance} gold pieces.`;

        await message.reply(reply);
        return true;
    }

    const newBalance = result.balance;
    console.info({
        action: 'withdraw_success',
        user_id: message.author.id,
        playerName,
        amount,
        newBalance
    });

    // For payments we may want to specify the shop
    if (payment && payment.shopName) {
        const reply = await buildCustomReply(
            playerName,
            `I hope your purchase helps you in your duties, ${playerName}. I have removed ${amount} gold from your account and given it to ${payment.shopName}. Your new balance is ${newBalance}.`,
            `The player has made a payment of ${amount} gold pieces to ${payment.shopName}. Deduct that from their balance and confirm. Their new balance is ${newBalance}.`
        );

        await message.reply(reply);
        return true;
    }

    // Otherwise treat as withdrawal
    const reply = await buildCustomReply(
        playerName,
        `I have withdrawn ${amount} gold pieces for you, ${playerName}. Your new balance is ${newBalance}.`,
        `The player has successfully withdrawn ${amount} gold pieces. Their new balance is ${newBalance}. Reply in character as Vanys: warm, a bit nervous about them going back into danger if they imply it, and proud to have their accounts in perfect order.`
    );

    await message.reply(reply);
    return true;
};
