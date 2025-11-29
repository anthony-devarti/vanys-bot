const { getAccount } = require("../db");
const { buildCustomReply } = require("../openaiClient");

module.exports = async function handleBalance(message, context) {
  const { playerName } = context;
  const account = getAccount(message.author.id);
  const balance = account ? account.balance : 0;

  console.info({
    action: 'balance_inquiry',
    user_id: message.author.id,
    playerName,
    balance
  });

  const reply = await buildCustomReply(
    playerName,
    `Your current balance is ${balance} gold pieces.`,
    `The player is asking about their current gold balance. Their balance is ${balance} gold pieces. Reply in character as Vanys, warm and kind, optionally expressing relief that they are safe in Farhearth. If their balance is greater than 0, you may treat them as a returning customer, but only use the exact greeting "Farhearth is always happy to see you return!" if their tone is neutral or friendly.`
  );

  await message.reply(reply);
  return true;
};
