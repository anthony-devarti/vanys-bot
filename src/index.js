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
            console.log('Hostile Intent determined')
            const reply = await buildCustomReply(
                playerName,
                `I'm sorry if I've upset you, ${playerName}. I never meant to cause you any distress.`,
                `The player is being rude or cruel to you. You are Vanys: respond with gentle confusion or mild hurt, never anger, and continue to treat them with kindness and dignity. Do NOT mention gold, balances, deposits, or banking unless they explicitly bring it up.`
            );

            await message.reply(reply);
            return;
        }

        // 2) History / recap intent – pay for recap and give link
        if (isHistoryIntent(content)) {
            console.log('History intent determined');

            // Pay the player RECAP_RATE gold for the recap
            const result = depositGold(message.author.id, playerName, RECAP_RATE);

            const row = createLinkButton(
                "Submit Your Recap",
                RECAP_URL
            );

            const replyText =
                `Farhearth is better for your safe return, ${playerName}! Your tale will be added to the Chronicle. You're helping to form Epgora's history.\n\n` +
                `As thanks for your efforts, I've added ${RECAP_RATE} gold pieces to your account.\n` +
                `I trust you to complete the submission process, but please let everyone know once you've done it. Only one version of each adventure is needed.`;

            await message.reply({
                content: replyText,
                components: [row]
            });

            return;
        }


        // 3) Balance request
        if (isBalanceRequest(content)) {
            console.log('Balance request intent determined')
            const account = getAccount(message.author.id);
            const balance = account ? account.balance : 0;

            const reply = await buildCustomReply(
                playerName,
                `Your current balance is ${balance} gold pieces.`,
                `The player is asking about their current gold balance. Their balance is ${balance} gold pieces. Reply in character as Vanys, warm and kind, optionally expressing relief that they are safe in Farhearth. If their balance is greater than 0, you may treat them as a returning customer, but only use the exact greeting "Farhearth is always happy to see you return!" if their tone is neutral or friendly.`
            );

            await message.reply(reply);
            return;
        }

        // 4) Banking: withdrawal intent
        const withdrawIntent = isWithdrawIntent(content);
        const payment = isPaymentIntent(content)

        if (withdrawIntent && amount === null) {
            console.log('Withdrawal intent determined')
            const reply = await buildCustomReply(
                playerName,
                `You wish to withdraw some gold, ${playerName}? Tell me how much, and I will prepare it.`,
                `The player is expressing intent to withdraw gold but did not specify an amount. Ask them, in character as Vanys, how much gold they would like to withdraw, with your usual warmth and concern. Do not mention deposits.`
            );

            await message.reply(reply);
            return;
        }

        if (payment && amount !== null) {
            console.log('Payment intent determined')
            const reply =
                `I hope your purchase helps you in your duties, ${playerName}. I will remove ${amount} gold from your account and get it to ${payment.shopName} right away.`;
            await message.reply(reply);
            return;
        }

        if (withdrawIntent && amount !== null) {
            console.log('Withdrawal or payment intent determined, but not enough gold balance to complete the payment')
            const result = withdrawGold(message.author.id, playerName, amount);

            //Don't call for a custom message here.  Vanys's personality makes him feel really guilty and get super weird if you overdraft.
            if (!result.success) {
                const reply =
                    `I'm terribly sorry ${playerName}, but your account does not hold enough gold for that withdrawal. ` +
                    `Your current balance is ${result.balance} gold pieces.`;

                await message.reply(reply);
                return;
            }


            const newBalance = result.balance;

            const reply = await buildCustomReply(
                playerName,
                `I have withdrawn ${amount} gold pieces for you, ${playerName}. Your new balance is ${newBalance}.`,
                `The player has successfully withdrawn ${amount} gold pieces. Their new balance is ${newBalance}. Reply in character as Vanys: warm, a bit nervous about them going back into danger if they imply it, and proud to have their accounts in perfect order.`
            );

            await message.reply(reply);
            return;
        }

        // 5) Banking: deposit intent
        const depositIntent = isDepositIntent(content);

        // 5a) Deposit intent but no amount found
        if (depositIntent && amount === null) {
            console.log("Deposit intent determined, but no dollar amount found")
            const reply = await buildNoAmountReply(playerName);
            await message.reply(reply);
            return;
        }

        // 5b) Deposit intent with an amount
        if (depositIntent && amount !== null) {
            console.log("Deposit intent determined")
            const newBalance = depositGold(message.author.id, playerName, amount);

            const reply = await buildTransactionalReply(
                playerName,
                amount,
                newBalance
            );

            await message.reply(reply);
            return;
        }

        //9) Adventure Request
        if (isAdventureRequest(content)) {
            console.log("Adventure request intent determined")
            const row = createLinkButton(
                "View Available Adventures",
                ADVENTURE_SIGNUP_URL
            );

            await message.reply({
                content:
                    `If you're looking to join an adventure, ${playerName}, you can find current postings here:`,
                components: [row]
            });

            return;
        }

        // 6) General small talk (not hostile, not banking, not balance, not history)
        if (!depositIntent && amount === null) {
            console.log("Small talk intent determined.");

            const topics = getSmallTalkTopicsFromKB();
            const topicsText = topics.length
                ? topics.map(t => `- ${t}`).join("\n")
                : "None";

            const reply = await buildCustomReply(
                playerName,
                `Hello ${playerName}. It is good to have you here in Farhearth.`,
                `The player is speaking to you casually or emotionally, but not about gold, deposits, balances, or history payments.

                They just said: "${content}"

                Respond directly to what they said in character as Vanys: warm, friendly, gently humorous, curious about their well-being or any news from beyond Farhearth.

                You may mention ONE relevant detail from the world, but only if it fits naturally with what they said. You must not invent new places or facts. These are the only world details you are allowed to reference in small talk right now:

                ${topicsText}

                Do NOT bring up gold or banking unless they do.
                If the player appears to be asking where to buy something, check the known shops and services. 
                If any shop's services match what they asked for, direct them specifically to that shop by name.
                If there is no known shop offering what they want, tell them you do not know.`
            );

            await message.reply(reply);
            return;
        }

        // 7) Fallback: if somehow we got here with an amount but no intent, treat as deposit safeguard
        if (amount !== null && !depositIntent) {
            console.log("Number found, but could not determine intent.  Suggesting possible banking actions.")
            const reply = await buildCustomReply(
                playerName,
                `I see you mentioned a number, ${playerName}, but I'm not quite sure what you wish me to do with it.`,
                `The player mentioned a number but did not clearly express banking intent. Ask, in character, what they would like you to do with that amount, without assuming a deposit or withdrawal.`
            );

            await message.reply(reply);
            return;
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
