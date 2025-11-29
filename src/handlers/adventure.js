const { createLinkButton } = require("../buttons");
const { ADVENTURE_SIGNUP_URL } = require("../APPCONSTANTS");

module.exports = async function handleAdventure(message, context) {
    const { playerName } = context;

    const row = createLinkButton("View Available Adventures", ADVENTURE_SIGNUP_URL);

    await message.reply({
        content: `If you're looking to join an adventure, ${playerName}, you can find current postings here:`,
        components: [row]
    });

    return true;
};
