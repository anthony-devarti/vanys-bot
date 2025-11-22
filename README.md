# Vanys Documentation

## User Guide

### What Vanys Is

Vanys is an in-character Discord NPC who handles:

* Gold banking (deposits, withdrawals, balances)
* Payment for adventure recaps
* General conversation and small talk

All interactions require mentioning Vanys directly:

```
@Vanys <your message>
```

If you do not mention him, he will ignore the message.

---

## What Users Can Ask Vanys

### Check Your Balance

Ask naturally:

```
@Vanys how much gold do I have?
@Vanys what's my balance?
```

He replies with your current balance.

### Deposit Gold

```
@Vanys deposit 20
@Vanys put 15 gold in my account
```

If no amount is provided, he will ask for clarification.

### Withdraw Gold

```
@Vanys withdraw 10
@Vanys I need 25 gold
```

If your balance is insufficient, he tells you.

### Recap Payouts

If you mention giving a recap, Vanys automatically:

* Pays **15 gold**
* Gives you the recap submission link

### General Small Talk

If you mention him without any banking intent, he responds warmly in character.

### Hostile Messages

If you speak rudely or aggressively, he reacts in character and performs no banking actions.

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

   * Deposit
   * Withdrawal
   * Balance
   * Recap
   * Hostility
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
