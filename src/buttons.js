// buttons.js
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

function createLinkButton(label, url) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setLabel(label)
            .setStyle(ButtonStyle.Link)
            .setURL(url)
    );
}

module.exports = { createLinkButton };