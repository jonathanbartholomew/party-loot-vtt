import { PartyLootAPI } from "./api.js";
import { FundsManager } from "./funds.js";
import { ItemsManager } from "./items.js";

Hooks.once("init", async function () {
  console.log("Party Loot | Initializing Party Loot Module");

  // Register module settings
  // Register module settings
  game.settings.register("party-loot", "apiUrl", {
    name: "API URL",
    hint: "URL of the Party Loot API service",
    scope: "world",
    config: true,
    type: String,
    default: "https://partylootapp.com",
  });

  game.settings.register("party-loot", "apiToken", {
    name: "API Token",
    hint: "Your Party Loot API token from your profile page",
    scope: "world",
    config: true,
    type: String,
    default: "",
  });

  // Register these settings that are used in the code but weren't registered
  game.settings.register("party-loot", "userId", {
    name: "User ID",
    hint: "Your Party Loot user ID (set automatically)",
    scope: "world",
    config: false,
    type: Number,
    default: 0,
  });

  game.settings.register("party-loot", "userGroupId", {
    name: "User Group ID",
    hint: "Your Party Loot user group ID (set automatically)",
    scope: "world",
    config: false,
    type: Number,
    default: 0,
  });

  game.settings.register("party-loot", "campaignId", {
    name: "Campaign ID",
    hint: "ID of the active campaign to track (set automatically)",
    scope: "world",
    config: false,
    type: Number,
    default: 0,
  });

  // Register Handlebars helpers
  console.log("Party Loot | Registering Handlebars helpers");

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

  // Add Handlebars helper for equality
  Handlebars.registerHelper("eq", function (a, b) {
    return a === b;
  });

  // Add Handlebars helper for splitting strings
  Handlebars.registerHelper("split", function (str, separator) {
    if (!str) return [];
    return str.split(separator);
  });

  // Initialize our API handler
  game.partyLoot = {
    api: new PartyLootAPI(),
    funds: new FundsManager(),
    items: new ItemsManager(),
  };
});

Hooks.once("ready", async function () {
  if (game.user.isGM) {
    // Initialize the API connection and authenticate
    const authenticated = await game.partyLoot.api.authenticate();

    if (authenticated) {
      ui.notifications.info("Party Loot API connected successfully!");

      // Initialize the data
      await game.partyLoot.funds.initialize();
      await game.partyLoot.items.initialize();
    } else {
      ui.notifications.warn(
        "Party Loot API connection failed. Please check your API token in module settings."
      );
    }
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
