require("dotenv").config();

const { Client, GatewayIntentBits } = require("discord.js");
const { depositGold, getAccount, withdrawGold } = require("./db");
const {
    buildTransactionalReply,
    buildNoAmountReply,
    buildCustomReply
} = require("./openaiClient");
const {
    isHostile,
    isDepositIntent,
    isWithdrawIntent,
    isPaymentIntent,
    isBalanceRequest,
    isHistoryIntent,
    extractGoldAmount,
    isAdventureRequest
} = require("./intent");
const path = require("path");
const vanysKB = require(path.join(__dirname, "./vanys-kb.json"));
const { createLinkButton } = require("./buttons");
const { ADVENTURE_SIGNUP_URL, RECAP_URL, RECAP_RATE } = require("./APPCONSTANTS")

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

if (!DISCORD_BOT_TOKEN) {
    console.error("DISCORD_BOT_TOKEN is not set");
    process.exit(1);
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.once("ready", () => {
    console.log(`Logged in as ${client.user.tag}`);
});

function getSmallTalkTopicsFromKB() {
    const topics = [];

    if (vanysKB.locations) {
        for (const [key, loc] of Object.entries(vanysKB.locations)) {
            if (loc && loc.discovered && loc.short) {
                topics.push(loc.short);
            }
        }
    }

    // You can cap this so the prompt doesn’t get huge
    return topics.slice(0, 8);
}

//Message Handler
const handleHostile = require("./handlers/hostile");
const handleHistory = require("./handlers/history");
const handleBalance = require("./handlers/balance");
const handleWithdrawRequest = require("./handlers/withdrawRequest");
const handleBanking = require("./handlers/banking");
const handleDeposit = require("./handlers/deposit");
const handleAdventure = require("./handlers/adventure");
const handleSmallTalk = require("./handlers/smallTalk");
const handleFallbackNumber = require("./handlers/fallbackNumber");

client.on("messageCreate", async (message) => {
    try {
        // Ignore other bots
        if (message.author.bot) return;

        // Only react when Vanys is mentioned
        if (!message.mentions.users.has(client.user.id)) return;

        const content = message.content;
        const playerName =
            message.member?.displayName ||
            message.author.globalName ||
            message.author.username;

        const amount = extractGoldAmount(content);
        const hostile = await isHostile(content);

        // 1) Hostile / abusive messages
        if (hostile) {
            // Intent recognized: hostile
            console.log('Intent recognized: hostile')
            const handled = await handleHostile(message, { playerName, content });
            if (handled) return;
        }

        // 2) History / recap intent – pay for recap and give link
        if (isHistoryIntent(content)) {
            // Intent recognized: summary/recap
            console.log('Intent recognized: history/recap');
            const handled = await handleHistory(message, { playerName });
            if (handled) return;
        }


        // 3) Balance request
        if (isBalanceRequest(content)) {
            // Intent recognized: balance inquiry
            console.log('Intent recognized: balance');
            const handled = await handleBalance(message, { playerName });
            if (handled) return;
        }

        // 4) Banking: withdrawal intent
        const withdrawIntent = isWithdrawIntent(content);
        const payment = isPaymentIntent(content)

        if (withdrawIntent && amount === null) {
            // Intent recognized: withdraw (amount needed)
            console.log('Intent recognized: withdraw -> prompt for amount');
            const handled = await handleWithdrawRequest(message, { playerName });
            if (handled) return;
        }

        if (payment && amount !== null) {
            // Intent recognized: payment with amount
            console.log('Intent recognized: payment');
            const handled = await handleBanking(message, { playerName, amount, payment, withdrawIntent });
            if (handled) return;
        }

        if (withdrawIntent && amount !== null) {
            // Intent recognized: withdraw with amount
            console.log('Intent recognized: withdraw');
            const handled = await handleBanking(message, { playerName, amount, payment, withdrawIntent });
            if (handled) return;
        }

        // 5) Banking: deposit intent
        const depositIntent = isDepositIntent(content);

        // 5a) Deposit intent but no amount found
        if (depositIntent && amount === null) {
            console.log("Intent recognized: deposit -> prompt for amount")
            const handled = await handleDeposit(message, { playerName, amount, depositIntent });
            if (handled) return;
        }

        // 5b) Deposit intent with an amount
        if (depositIntent && amount !== null) {
            console.log("Intent recognized: deposit");
            const handled = await handleDeposit(message, { playerName, amount, depositIntent });
            if (handled) return;
        }

        //9) Adventure Request
        if (isAdventureRequest(content)) {
            console.log("Intent recognized: adventure request")
            const handled = await handleAdventure(message, { playerName });
            if (handled) return;
        }

        // 6) General small talk (not hostile, not banking, not balance, not history)
        if (!depositIntent && amount === null) {
            console.log("Intent recognized: small talk");
            const handled = await handleSmallTalk(message, { playerName, content, getSmallTalkTopicsFromKB });
            if (handled) return;
        }

        // 7) Fallback: if somehow we got here with an amount but no intent, treat as deposit safeguard
        if (amount !== null && !depositIntent) {
            console.log("Intent recognized: ambiguous numeric mention");
            const handled = await handleFallbackNumber(message, { playerName });
            if (handled) return;
        }

    } catch (err) {
        console.error("Error handling message:", err);
        try {
            await message.reply(
                'No wonder father sent you to the wilderness, Vanys! I seem to have blundered your account just now. Please give me a moment and try again, and I will make absolutely certain it is correct.'
            );
        } catch { }
    }
});


//only for testing discord functionality
// client.on("messageCreate", async (message) => {
//   if (message.author.bot) return;
//   if (!message.mentions.users.has(client.user.id)) return;

//   await message.reply("Vanys is online.");
// });

client.login(DISCORD_BOT_TOKEN);
