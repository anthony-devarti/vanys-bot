// seedShops.js
const { upsertShop } = require("./src/db");

const shops = [
  "Palmetto's Supply INC",
  "Unusual Frank's Bazaar of Animals for you To be On Top Of",
  "Sylvia's Weapons Emporium",
  "The Curiosity Shoppe",
  "Mafiosa Beth's Translation Service",
  "Temple Services"
];

for (const shop of shops) {
  upsertShop(shop);
}

console.log("Shops seeded.");