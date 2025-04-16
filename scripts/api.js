export class PartyLootAPI {
  constructor() {
    this.baseUrl = game.settings.get("party-loot", "apiUrl");
    this.apiToken = game.settings.get("party-loot", "apiToken");
    this.authToken = null; // Will hold the JWT from the server
    this.authenticated = false;
    this.campaignId = game.settings.get("party-loot", "campaignId");
  }

  async authenticate() {
    if (!this.apiToken) return false;

    try {
      const response = await fetch(`${this.baseUrl}/api/foundry/authenticate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ apiToken: this.apiToken }),
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

      // Save the JWT auth token for future API calls
      this.authToken = data.token;

      // Save the user details to settings
      game.settings.set("party-loot", "userId", data.userId);
      game.settings.set("party-loot", "userGroupId", data.userGroupId);
      game.settings.set("party-loot", "campaignId", data.campaignId);

      // Update the local campaignId property
      this.campaignId = data.campaignId;

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
    this.apiToken = game.settings.get("party-loot", "apiToken");
    this.campaignId = game.settings.get("party-loot", "campaignId");

    if (!this.apiToken) return false;

    // If we already have an auth token, try to use it first
    if (this.authToken) {
      return true;
    }

    // Otherwise re-authenticate
    return await this.authenticate();
  }

  async fetchFunds() {
    if (!(await this.refreshToken())) return null;

    try {
      const response = await fetch(
        `${this.baseUrl}/api/funds?campaign_id=${this.campaignId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.authToken}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch funds data");

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Party Loot | API Error:", error);
      ui.notifications.error("Failed to fetch Party Loot funds data.");
      return null;
    }
  }

  async fetchFundHistory() {
    if (!(await this.refreshToken())) return [];

    try {
      const response = await fetch(
        `${this.baseUrl}/api/funds/history?campaign_id=${this.campaignId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.authToken}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch fund history");

      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error("Party Loot | API Error:", error);
      ui.notifications.error("Failed to fetch Party Loot fund history.");
      return [];
    }
  }

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

      const response = await fetch(`${this.baseUrl}/api/funds/history`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.authToken}`,
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
      const response = await fetch(
        `${this.baseUrl}/api/funds/history/${entryId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${this.authToken}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to delete fund entry");

      return true;
    } catch (error) {
      console.error("Party Loot | API Error:", error);
      ui.notifications.error("Failed to delete fund entry.");
      return false;
    }
  }

  async fetchItems() {
    if (!(await this.refreshToken())) return [];

    try {
      const response = await fetch(`${this.baseUrl}/api/items`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.authToken}`,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch items");

      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error("Party Loot | API Error:", error);
      ui.notifications.error("Failed to fetch Party Loot items.");
      return [];
    }
  }

  async addItem(itemData) {
    if (!(await this.refreshToken())) return false;

    try {
      const userId = game.settings.get("party-loot", "userId") || 0;
      const userGroupId = game.settings.get("party-loot", "userGroupId") || 0;

      // Create a clean payload object
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
        item_type_id: itemData.item_type_id || null,
        value: itemData.value || null,
        value_type_id: itemData.value_type_id || null,
      };

      // FIX: Handle tags properly - it can be a string or an array
      if (itemData.tags) {
        // If it's already a string, use it directly
        if (typeof itemData.tags === "string") {
          payload.tags = itemData.tags;
        }
        // If it's an array, join it with commas
        else if (Array.isArray(itemData.tags)) {
          payload.tags = itemData.tags.join(",");
        }
        // Otherwise, convert to string
        else {
          payload.tags = String(itemData.tags);
        }
      } else {
        // Explicitly set tags to empty string if not provided
        payload.tags = "";
      }

      // Log the payload for debugging (remove in production)
      console.log("API add item payload:", payload);

      const response = await fetch(`${this.baseUrl}/api/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.authToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Party Loot | API Error:", errorText);
        throw new Error(`Failed to add item: ${errorText}`);
      }

      return true;
    } catch (error) {
      console.error("Party Loot | API Error:", error);
      ui.notifications.error("Failed to add item: " + error.message);
      return false;
    }
  }

  async updateItem(itemId, itemData) {
    if (!(await this.refreshToken())) return false;

    try {
      const response = await fetch(`${this.baseUrl}/api/items/${itemId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.authToken}`,
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
      const response = await fetch(`${this.baseUrl}/api/items/${itemId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${this.authToken}`,
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
