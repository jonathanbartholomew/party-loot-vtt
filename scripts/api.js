export class PartyLootAPI {
  constructor() {
    this.baseUrl = game.settings.get("party-loot", "apiUrl");
    this.token = game.settings.get("party-loot", "apiToken");
    this.authenticated = false;
  }

  async authenticate() {
    if (!this.token) return false;

    try {
      const response = await fetch(`${this.baseUrl}/foundry/authenticate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ apiToken: this.token }),
      });

      if (!response.ok) {
        console.error(
          "Party Loot | Authentication failed:",
          await response.text()
        );
        ui.notifications.error(
          "Party Loot authentication failed. Please check your API token."
        );
        return false;
      }

      const data = await response.json();

      // Save the user details to settings
      game.settings.set("party-loot", "userId", data.userId);
      game.settings.set("party-loot", "userGroupId", data.userGroupId);
      game.settings.set("party-loot", "campaignId", data.campaignId);

      console.log(
        "Party Loot | Authentication successful for user:",
        data.username
      );
      this.authenticated = true;
      return true;
    } catch (error) {
      console.error("Party Loot | API Error:", error);
      ui.notifications.error("Failed to authenticate with Party Loot API.");
      return false;
    }
  }

  async refreshToken() {
    this.token = game.settings.get("party-loot", "apiToken");
    return this.token && (await this.authenticate());
  }

  async fetchFunds() {
    if (!(await this.refreshToken())) return null;

    try {
      const response = await fetch(`${this.baseUrl}/funds`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch funds data");

      const data = await response.json();
      console.log("Party Loot | Funds data received:", data);
      return data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error("Party Loot | API Error:", error);
      ui.notifications.error("Failed to fetch Party Loot funds data.");
      return null;
    }
  }

  async fetchFundHistory() {
    if (!(await this.refreshToken())) return [];

    try {
      const response = await fetch(`${this.baseUrl}/fund-history`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch fund history");

      const data = await response.json();
      console.log("Party Loot | Fund history received:", data);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error("Party Loot | API Error:", error);
      ui.notifications.error("Failed to fetch Party Loot fund history.");
      return [];
    }
  }

  async fetchItems() {
    if (!(await this.refreshToken())) return [];

    try {
      const response = await fetch(`${this.baseUrl}/items`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch items");

      const data = await response.json();
      console.log("Party Loot | Items received:", data);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error("Party Loot | API Error:", error);
      ui.notifications.error("Failed to fetch Party Loot items.");
      return [];
    }
  }

  // Other methods remain the same...
  async addFundEntry(entryData) {
    if (!(await this.refreshToken())) return false;

    try {
      const userId = game.settings.get("party-loot", "userId") || 0;
      const userGroupId = game.settings.get("party-loot", "userGroupId") || 0;

      const payload = {
        user_id: userId,
        platinum: entryData.platinum || 0,
        gold: entryData.gold || 0,
        silver: entryData.silver || 0,
        copper: entryData.copper || 0,
        description: entryData.description,
        subtract: entryData.subtract === true,
        user_group_id: userGroupId,
        campaign_id: this.campaignId,
      };

      const response = await fetch(`${this.baseUrl}/fund-history`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Failed to add fund entry");

      return true;
    } catch (error) {
      console.error("Party Loot | API Error:", error);
      ui.notifications.error("Failed to add fund entry.");
      return false;
    }
  }

  async deleteFundEntry(entryId) {
    if (!(await this.refreshToken())) return false;

    try {
      const response = await fetch(`${this.baseUrl}/fund-history/${entryId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to delete fund entry");

      return true;
    } catch (error) {
      console.error("Party Loot | API Error:", error);
      ui.notifications.error("Failed to delete fund entry.");
      return false;
    }
  }

  async addItem(itemData) {
    if (!(await this.refreshToken())) return false;

    try {
      const userId = game.settings.get("party-loot", "userId") || 0;
      const userGroupId = game.settings.get("party-loot", "userGroupId") || 0;

      const payload = {
        user_id: userId,
        name: itemData.name,
        owner: itemData.owner,
        quantity: itemData.quantity || 1,
        source: itemData.source,
        user_group_id: userGroupId,
        campaign_id: this.campaignId,
        description: itemData.description || "",
        item_rarity_id: itemData.item_rarity_id || null,
        tags: itemData.tags || "",
        item_type_id: itemData.item_type_id || null,
        value: itemData.value || null,
        value_type: itemData.value_type || null,
      };

      const response = await fetch(`${this.baseUrl}/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Failed to add item");

      return true;
    } catch (error) {
      console.error("Party Loot | API Error:", error);
      ui.notifications.error("Failed to add item.");
      return false;
    }
  }

  async updateItem(itemId, itemData) {
    if (!(await this.refreshToken())) return false;

    try {
      const response = await fetch(`${this.baseUrl}/items/${itemId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify(itemData),
      });

      if (!response.ok) throw new Error("Failed to update item");

      return true;
    } catch (error) {
      console.error("Party Loot | API Error:", error);
      ui.notifications.error("Failed to update item.");
      return false;
    }
  }

  async deleteItem(itemId) {
    if (!(await this.refreshToken())) return false;

    try {
      const response = await fetch(`${this.baseUrl}/items/${itemId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to delete item");

      return true;
    } catch (error) {
      console.error("Party Loot | API Error:", error);
      ui.notifications.error("Failed to delete item.");
      return false;
    }
  }
}
