const { createLinkButton } = require("../buttons");
const { MARKETPLACE_URL } = require("../APPCONSTANTS");

module.exports = async function handleBanking(message, context) {
    const row = createLinkButton('Bank of Vanys — Marketplace', MARKETPLACE_URL);
    const replyText =
        "Banking actions are now handled via the Marketplace. Please use the 'Bank of Vanys' option there to manage deposits and withdrawals.";

    await message.reply({ content: replyText, components: [row] });
    return true;
};
