# Vanys Documentation

## User Guide

### What Vanys Is

Vanys is an in-character Discord NPC who handles:

* Factual lore information management
* Payment for adventure recaps
* General conversation and small talk

All interactions require mentioning Vanys directly:

```
@Vanys <your message>
```

If you do not mention him, he will ignore the message.

---

## What Users Can Ask Vanys

### Recap Payouts

If you mention giving a recap, Vanys automatically:

* Provides you with a link to submit a recap/adventure report
* Gives you a link to the marketplace to claim your reward for doing so

### Factual Queries or General Small Talk

If you mention him without any Recap intent, he will check his KB in order to answer as best he can.  If what you are asking is just small talk, Vanys will respond politely.

### Hostile Messages

If you speak rudely or aggressively, he reacts in character and it really hurts his feelings.

---

# Contributor Guide

## Project Structure

```
vanys-bot/
│
├── src/
│   ├── index.js          <-- Main bot logic
│   ├── db.js             <-- SQLite operations
│   ├── openaiClient.js   <-- Response generation
│   ├── intent.js         <-- Intent detection logic
│   ├── hostileSeeds.js   <-- Hostility detection
│   └── fuzzy.js          <-- Numeric extraction
│
├── data/                 <-- SQLite database directory
├── .env.example
├── package.json
└── package-lock.json
```

## Local Development Setup

Clone your fork:

```
git clone <your-fork-url>
cd vanys-bot
```

Install dependencies (Node 22+ required):

```
npm install
```

Create your environment file:

```
cp .env.example .env
```

Add your keys:

```
DISCORD_BOT_TOKEN=your_token
OPENAI_API_KEY=your_key
```

Run the bot locally:

```
npm start
```

---

## How Intent Processing Works

1. User mentions Vanys.
2. Message is evaluated for multiple intents:

   * Recap
   * Hostility
   * Factual Requests
   * General Help
   * General conversation
3. Matching intent triggers appropriate logic.
4. Database updates occur via `db.js`.
5. Replies are generated with `openaiClient.js`.

No slash commands, no prefixes. Entirely natural-language driven.

---

## Adding Features

### Add a new intent

Modify:

* `intent.js`
* `openaiClient.js`
* `index.js` intent handling block

### Modify the database

Edit `db.js` and update the schema.

---

## Submitting a Pull Request

1. Fork the repo.
2. Create a branch:

```
git checkout -b feature/my-change
```

3. Make edits, test locally.
4. Commit cleanly:

```
git commit -m "Describe your change"
```

5. Push and open a PR.

Avoid committing:

* `.env`
* `data/`
* `bank.db`

Keep changes focused and well-described.

---

End of documentation.
