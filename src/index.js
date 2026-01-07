require("dotenv").config();

const { Client, GatewayIntentBits } = require("discord.js");
// openaiClient and db helpers are used by handlers; not needed directly here
const {
    isHostile,
    isBankingIntent,
    isHistoryIntent,
    isAdventureRequest
} = require("./intent");
const path = require("path");
const vanysKB = require(path.join(__dirname, "./vanys-kb.json"));
const { createLinkButton } = require("./buttons");
const { ADVENTURE_SIGNUP_URL, RECAP_URL, RECAP_RATE, MARKETPLACE_URL } = require("./APPCONSTANTS")

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

const { execSync } = require("child_process");

//startup message showing last main update for version tracking (I refuse to do semantic versioning, no one else is going to see it)
client.once("ready", () => {
  let mainUpdated = "unknown";
  try {
    execSync("git fetch -q origin main");
    mainUpdated = execSync("git log -1 --format=%cs origin/main")
      .toString()
      .trim();
  } catch {}

  console.log(
    `Logged in as ${client.user.tag} | main last updated: ${mainUpdated}`
  );
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
// banking handler no longer used for in-chat payments; marketplace redirects are used instead
const handleAdventure = require("./handlers/adventure");
const handleSmallTalk = require("./handlers/smallTalk");

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


        // 4) Payments to shops handled via Marketplace; in-chat payments disabled

        // 5) Banking intents (deposit/withdraw) — redirect users to marketplace
        if (isBankingIntent(content)) {
            console.log('Intent recognized: banking -> redirect to marketplace');
            const row = createLinkButton('Bank of Vanys — Marketplace', MARKETPLACE_URL);
            const replyText =
                "To deposit or withdraw gold, please use the 'Bank of Vanys' option in the Marketplace.\n\n" +
                "Use the link below to open the Marketplace and select the Bank of Vanys to safely manage your funds.";

            await message.reply({ content: replyText, components: [row] });
            return;
        }

        // 7) Adventure Request — send adventure signup link
        if (isAdventureRequest(content)) {
            console.log("Intent recognized: adventure request -> adventure signup link")
            const row = createLinkButton('Adventures — Sign Up', ADVENTURE_SIGNUP_URL);
            const replyText = "If you'd like to join an upcoming adventure, please use the Adventures link to view and sign up.";
            await message.reply({ content: replyText, components: [row] });
            return;
        }

        // 8) Fallback: Knowledge-base-backed reply / small talk
        console.log('No specific intent matched — falling back to KB/OpenAI small talk');
        const handled = await handleSmallTalk(message, { playerName, content, getSmallTalkTopicsFromKB });
        if (handled) return;

    } catch (err) {
        console.error("Error handling message:", err);
        try {
            await message.reply(
                'No wonder father sent you to the wilderness, Vanys! I seem to have make a terrible blunder just now. Please give me a moment and try again, and I will make absolutely certain it is correct.'
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
