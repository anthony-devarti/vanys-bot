const { createLinkButton } = require("../buttons");
const { RECAP_RATE, RECAP_URL, MARKETPLACE_URL } = require("../APPCONSTANTS");

module.exports = async function handleHistory(message, context) {
  const { playerName } = context;

  console.info({
    action: 'recap_buttons_shown',
    user_id: message.author.id,
    playerName,
    suggestedReward: RECAP_RATE
  });

  const rowRecap = createLinkButton("Create an Adventure Report", RECAP_URL);
  const rowCollect = createLinkButton("Collect Reward", MARKETPLACE_URL);

  const replyText =
    `Farhearth is better for your safe return, ${playerName}! Your tale will be added to the Chronicle. You're helping to form Epgora's history.\n\n` +
    `As thanks for your efforts, you may collect ${RECAP_RATE} gold pieces by using the marketplace link below. Just go to Downtime Activities and choose the "Sell a recap" option.\n` +
    `Please complete the submission process; only one version of each adventure is needed.`;

  await message.reply({ content: replyText, components: [rowRecap, rowCollect] });
};
