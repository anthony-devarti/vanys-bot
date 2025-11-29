const { depositGold } = require("../db");
const { createLinkButton } = require("../buttons");
const { RECAP_RATE, RECAP_URL } = require("../APPCONSTANTS");

module.exports = async function handleHistory(message, context) {
  const { playerName } = context;

  // Pay the player RECAP_RATE gold for the recap
  const newBalance = depositGold(message.author.id, playerName, RECAP_RATE);

  console.info({
    action: 'recap_paid',
    user_id: message.author.id,
    playerName,
    amount: RECAP_RATE,
    newBalance
  });

  const row = createLinkButton("Submit Your Recap", RECAP_URL);

  const replyText =
    `Farhearth is better for your safe return, ${playerName}! Your tale will be added to the Chronicle. You're helping to form Epgora's history.\n\n` +
    `As thanks for your efforts, I've added ${RECAP_RATE} gold pieces to your account.\n` +
    `I trust you to complete the submission process, but please let everyone know once you've done it. Only one version of each adventure is needed.`;

  await message.reply({ content: replyText, components: [row] });
  return true;
};
