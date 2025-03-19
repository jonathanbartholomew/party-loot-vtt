import { PartyLootAPI } from "./api.js";
import { FundsManager } from "./funds.js";
import { ItemsManager } from "./items.js";

Hooks.once("init", async function () {
  console.log("Party Loot | Initializing Party Loot Module");

  // Register module settings
  game.settings.register("party-loot", "apiUrl", {
    name: "API URL",
    hint: "URL of the Party Loot API service",
    scope: "world",
    config: true,
    type: String,
    default: "https://partylootapp.com/api",
  });

  game.settings.register("party-loot", "apiToken", {
    name: "API Token",
    hint: "Authentication token for the Party Loot API",
    scope: "world",
    config: true,
    type: String,
    default: "",
  });

  game.settings.register("party-loot", "campaignId", {
    name: "Campaign ID",
    hint: "ID of the active campaign to track",
    scope: "world",
    config: true,
    type: String,
    default: "",
  });

  // Initialize our API handler
  game.partyLoot = {
    api: new PartyLootAPI(),
    funds: new FundsManager(),
    items: new ItemsManager(),
  };
});

// Once the game is ready
Hooks.once("ready", async function () {
  if (game.user.isGM) {
    // Initialize the data
    await game.partyLoot.funds.initialize();
    await game.partyLoot.items.initialize();
  }
});

// Add control buttons
Hooks.on("getSceneControlButtons", (controls) => {
  // Add a Party Loot button to the scene controls
  controls.push({
    name: "party-loot",
    title: "Party Loot",
    icon: "fas fa-coins",
    layer: "controls",
    tools: [
      {
        name: "funds",
        title: "Party Funds",
        icon: "fas fa-piggy-bank",
        onClick: () => game.partyLoot.funds.renderFundsPanel(),
        button: true,
      },
      {
        name: "items",
        title: "Party Items",
        icon: "fas fa-box-open",
        onClick: () => game.partyLoot.items.renderItemsPanel(),
        button: true,
      },
    ],
    activeTool: "funds",
  });
});

// Register handlebars helpers
Hooks.on("renderTemplates", () => {
  Handlebars.registerHelper("formatCurrency", (amount) => {
    return new Handlebars.SafeString(`${amount}`);
  });

  Handlebars.registerHelper("currencyIcon", (type) => {
    const icons = {
      platinum: "fa-diamond plat",
      gold: "fa-diamond gold",
      silver: "fa-diamond silver",
      copper: "fa-diamond copper",
    };
    return icons[type] || "fa-coin";
  });
});
