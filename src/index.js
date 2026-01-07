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

client.once("ready", () => {
    let mainUpdated = "unknown";
    try {
        execSync("git fetch -q origin main");
        mainUpdated = execSync("git log -1 --format=%cs origin/main")
            .toString()
            .trim();
    } catch { }

    console.log(`
BBBBBB#BBBB#B#BBB#BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB
BBBBBB#BBBB#B#BBB#BBBBBBBBBBBBBBBBBBBBBBBBBB######BBBBBBBBBBBBBBBBBBB#GGGBBBBBGBGGGBBBBBBBBBBBBBBBBB
#######BBBB#B#BBB#BBBBBBBBBBBBBBBBBBBBB###BBBBBBBBBB###B#&#BBBBBBBBBB#YPB5YYYYYYYYYYYYYYYYYYY55YYYYY
#######BBBB#B#BBB#BBBBBBBBBBBBBBB######BBBBBBGGGBBBBBBB##&######BBBBB#5PG5YYYYY55555YYYY5PP5Y5555555
&&&&&&&BBBB#B#BBB#BBBBBBBBBBBBBBB##BBBBB###BBGB#BGGPGGBB####&##BBBBBB#5YYYYY5YYYYYYY55PPPPPGYYYY5GPP
####&&&BBBBBB#BBB#BBBBBBBBBBBBBBBB##&BPG&BBBG#GJ7777777?JPG#BBBB##BBB#5YY5YYPYYYY555GPPPPPPG55P5PGPP
GGGB&&&BBBBBB#BBB#BBBBBBBBBBBBB##BBBY777G###G&5?77777777777YBBGGBB##B#5YYYY55YY5PPPPPPPPPPPPPPPPPPPP
BBGB&##BBBBBB#BBB#BBBBBBBBBBBB##BBB?77?JJ5GBBGGY??J?77777777JBBBBB###BYYYYY55Y5GPPPPGPPPPPPPPPPPPPPP
GGPB#B#BBB#BB#BBB#BBBBBBBBBBBB#&B#J?JYYJ?777?777????Y555J77775BGBBB&#B5YYYY55YYYPPPPPPPPPPPPPPGPPPPP
PPPG#B#B#B#BB#BBB#BBBBBBBBBBBBB&#BJB#BBBGY??P7YJ?YPBBBBB#B?77PBBB#B#BB5YYYY55YY5GPPPPPPPPPPPPPGGPPPP
PGPG#B#B#BBBB#BBB#BBBBBBBBBBBBBB&BYGGBBB###JY75#B##BBBBPYJ?77JBB##&#BB5YYYY55YYY5PP5YPGPPPPPPPPPGPPP
PPPG#B#B#BBBB#BBB#BBBBBBBBBBBBBGB&5?777?JGP?JJ?JBP?77?7JPP?7??B###P55BB5YYY55YYYYYYYPPPPPPPPPPPPGPPP
PPPB#B#BBBBBB#BBB#BBBBBBBBBBB#P5#P~777B&J7#GPPPB5~!7B&J!!GBPP5G##J?PG?P#5Y5P5YYY5PPPPPPGPPPPPPGGGPPP
BBBB#B#BBBB#B#BBB#BBBBBBBBBBB#GG#P!777YP555JJJJB5!775GJ!7G5?775#5J#BYY?&PYY5PYYPGPPPPPPPGPPPPPGPPPGP
BGGB###BBBB#B#BBB#BBBBBBBBBBBB&575PY???G5YJJJJY5BPJ????YP57777?J?J5G7?P#5YY55YY5PPPPPPPPPPPPPPGPPPGP
BBB####BBBBBB#BBB#BBBBBBBBBBB#P7J7?JYPB#YJJJJJY5G#GP555Y?777??JJ??JJYG#BGGP5YYYYYY5PGPPPGPPPPPPPPPPP
BBBBBB#BBBBBB#BBB#BBBBBBBBBBB#???77YGBB##GGGGBBBBBBBG5?77????J7?7P##&&##BB##B5Y5YYYPGPPPP55PPPPPPPPP
&&&&&&#BBB#BB#BBB#BBBBBBBBBB#B77?5G#BBBBB#####BBBBBBBBBPJ7?J????7G&Y#&&&BBBB#BYY5YY5PP55PPGPPPPPPPPP
&&&&&&&BBB#BB#BBB#BBBBBBBBBB#B77?5GB##BGPPPP5PPGBBBB#BGGY7?????7J#Y?#&#BBBBB##P55YY5555YPPPPP5555555
BB#&&&&BBBBBB#BBB#BBBBBBBB##B#57J???J??7?YJJ???7?JJJJ???7??????5BYYB#BBBBBBB####BGP55555YYYYY5555555
####BB#BBBBBB#BBB#BBBBBBB##BBB&PJ??77JJ7?JY55Y???77??7J??777J5GP5G#BBBBBBB##BBBBB##BP555PPPPP555PPPP
BB##GG#BB#BBB#BBB#BBBBB####BBB&&#5J?7?GY?77777777?J???77?JY5P55GBBBBBB####BBBBBBBBBB###BBBBBBBBBBBBB
BBB#GG#BB#BBB#BBB#BBB##BBB##BB#&&BPP5YYPP5YYYYY555J??JY5P5YJ5BBBBBB####BBBBB##########&BBBBBBBBBBBBB
BBB#PG#BBBBBB#BBB#BB#&#BBBBB#BB#&#BP555PP5YYY5P5555555YJ??5B#BBB####BBB####BBBBBBBBB###&BBBBBBBBBBBB
BBB#PG#BBBBBB#BBB###PG&&#BBGBBBB###BYY??BP77JGPJJJJ?JJY5G##BB###BBBBBBBBBBBB######BBBBBB##BBBBBBBBBB
BBB#PG#BBBBBB#BB#BPJ?##B#####BBB##BB7JY??P55PJ7JYY5YY5PB#BB#BBBBBBBB#####&#BGP55PPG####BB##BBBBBBBBB
BB##PG#BB#BBB###5?77P&BBBBBB#####BB#57?YJJBP??Y??7?YPB#&##BBBB#####&##B##P??????????JPB&#BB&#BBBBBBB
####GG#BBBBB##5?7JJY#BBBBBBBBBBBBBBB#J?GB##BBY??YPB####BB######BBBB#BBB#J7J55J?????????5#&#B&#BBBBBB
####GG#BBB#B5??J??YBB#BBBBBBBBBBBBBBB#Y?55Y555GBBBB##BBB##BBBBBBBB##BB#575PJ????????????J#&#B&BBBBBB
BBBBBB#B#B5????YY?G##BBBBBBBBBBBBBBBBB#PY5PGBBBBBBBBBBBBBBBBBBBBBB#BBBB?PP?7?????????????J#&#B&BBBBB
########5?5BPPPPPG&#BBBBBBBBBBBBBBBBBB##BBBBBBBBBBBBBBBBBBBBBBBBBB#BB#P5G??JY?????????????5&&B######
BBBBB#G??JGB?JJYY5PGB##BBBBBBBBBBBBBB#BBB#BBBBBBBBB#BBBBBBBBBBBBBB#BB#PBJ??J?7?????????????B&#B&####
###B#P75BB#GP5YYYJJJ?J5GB#BBBBBBBBBB#BB##&#BBGGPP55YY5555##BBBBBBBB#B#&G7???JYYYYYYYJ??????5&&B##BBB
BBB#G?75&BBBBBBGGPYJ????J5PB#BBBBBB&#BBGPYYJJJJJYYYJJYYYG###BBBBBBBB##&BJ5GBGGPP55YJJ??????J#&#B####
###&Y7YGG&BBBBBBBBBBGP5JJYYY5BBB#BGP5YJ???????JJY55PPGGB####&GGB#BBBB#&#G5YJJJJJYY5P5J??????B&#B#&##
###&JYBYGP##BBBBBBBBBBBBGGPYJY#G5YJYY5555555PGGBBBBBBBBBG####PJ?YB#BGPP555Y?????????J5Y?????G&#BB&##
BBB&PGYBY7JPGBBBBBBBBBBBBBBG5Y5JY5PGGBBBBBBBBBBBBBB###B##BBBG5J?7?5BGJ7??J5GY???????????????B&&BB##B
BBBB&BY&GJ?7JYJB#BBBBBBBB#BBBBBBBBBBBBBBBBBBBBBBBBB#5JJ?????777???7JPBY????JG5??????JJ?????J#&&#B##B
###B##J##BP5P55B#BBBBBBBB#&BBBBBB#&#BBBBBBBBBBBBBBB#5Y5????JJY?????77J#J?????BY????YJJ?????P&&&#BB#B
#B#BB#GP##5JJYYY5#BBBBBBBB##BBBBBB#&##BBBBBBBBBBBBBY5555555YYJ???????7G5?????5G????YJ?????5&&&&#BB#B
#B#BBB#BG#&G555PP#BBBBBBBBB#&BBBBBB#&B#BBBBBBBBBBBB55???????J????????7G5?????5G?????????JG&&&&&&BB##
#B#BBBB#&&&BP555P#BBBBBBBBBB##BBBBBB#&B#BBBBBBBBBBB&P5555555Y???????7YBJJY5??BY??????J5G&&&&&#&&#B##
#B#BBBB&#&&&&###&#BBBBBBBBBBB##BBBBBB##B#BBBBBBBBBBBBGP5YYYJJ?????JYPGJJBBPJP5??JJYPG#&&&&&&&##&#BB&
#B#BBB####&&&&&&######BBBBBBBB&&#B######B#BBBBBBBBBBBB##BGPP555PGB##PYYYPPG#GPGB##&&##B#&&&&&##&&BB&
#B#BBB&#B##&&&&&#BBBB########BB&#BBBBBB##BBBBBBBBBBBBBB##&&&&&&&#&&&&&&&&&&&&&&###BBB##&&&&&&&B&&BB#
#B#BB#&BBB#&&&&&&&##BBBBBB#####&&#BBBBB#&##################BBBBBBBBBBBBB##BBBBBBBB##&&&&&&&#&&B#&#BB
#B#BB&#BBB&&&&&&&&&#&###BBBBBB#&##&&&&&&&&&&&###BBBBBBBBBBBBBBBBBBBBBBBBBBBBBB###&##BB&&&&&##&#B&#BB

Logged in as ${client.user.tag}
Main last updated: ${mainUpdated}

Vanys is online.
This log shows queries made to Vanys.
`);
});

// Extract small talk topics from knowledge base
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
