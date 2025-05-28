// Party Loot - Foundry VTT Module
// Provides integration with the Party Loot web service

class PartyLootApp extends Application {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "party-loot",
      title: "Party Loot",
      template: "modules/party-loot/templates/party-loot.html",
      width: 800,
      height: 700,
      dragDrop: [{ dragSelector: ".item-row", dropSelector: null }],
      resizable: true,
      minimizable: true,
      scrollY: [".tab-content"],
      classes: ["party-loot", "sheet"],
    });
  }

  constructor(options = {}) {
    super(options);
    this.funds = { platinum: 0, gold: 0, silver: 0, copper: 0 };
    this.fundHistory = [];
    this.items = [];
    this.filteredItems = [];
    this.currentPage = 1;
    this.itemsPerPage = 10;
    this.error = null;

    // Set up API connection details
    this.apiUrl = game.settings.get("party-loot", "apiUrl");
    this.token = game.settings.get("party-loot", "token");

    // Add debug info
    console.log("PartyLootApp initialized with:", {
      apiUrl: this.apiUrl,
      hasToken: !!this.token,
      campaignId: game.settings.get("party-loot", "campaignId"),
    });

    // Load data when initialized
    setTimeout(() => {
      console.log("Starting data load...");
      this.loadData().catch((err) => {
        console.error("Unhandled error in loadData:", err);
        this.error = "Unexpected error loading data";
        this.render();
      });
    }, 500);
  }

  render(force = false, options = {}) {
    return super.render(force, options);
  }

  async _populateItemTypeOptions() {
    // Fetch item types and rarities for dropdowns
    this.itemTypes = [];
    this.itemRarities = [];

    try {
      // Fetch item types from API
      const typeResponse = await fetch(`${this.apiUrl}/api/items/item-types`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      });

      if (typeResponse.ok) {
        this.itemTypes = await typeResponse.json();
      }

      // Fetch item rarities from API
      const rarityResponse = await fetch(
        `${this.apiUrl}/api/items/item-rarities`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${this.token}`,
          },
        }
      );

      if (rarityResponse.ok) {
        this.itemRarities = await rarityResponse.json();
      }
    } catch (error) {
      console.error("Error fetching item metadata:", error);
      // Fallback to default options
      this.itemTypes = [
        { id: 1, name: "Weapon" },
        { id: 2, name: "Armor" },
        { id: 3, name: "Adventuring Gear" },
        { id: 4, name: "Tool" },
        { id: 5, name: "Mount or Vehicle" },
        { id: 9, name: "Magic Item" },
      ];

      this.itemRarities = [
        { id: 1, name: "Common", color_code: "#ffffff" },
        { id: 2, name: "Uncommon", color_code: "#1eff00" },
        { id: 3, name: "Rare", color_code: "#0070dd" },
        { id: 4, name: "Very Rare", color_code: "#a335ee" },
        { id: 5, name: "Legendary", color_code: "#ff8000" },
        { id: 6, name: "Artifact", color_code: "#e6cc80" },
      ];
    }

    return {
      types: this.itemTypes,
      rarities: this.itemRarities,
    };
  }

  async getData() {
    // If we don't have item types and rarities yet, fetch them
    if (!this.itemTypes || !this.itemRarities) {
      await this._populateItemTypeOptions();
    }

    return {
      funds: this.funds || { platinum: 0, gold: 0, silver: 0, copper: 0 },
      fundHistory: this.fundHistory || [],
      items:
        this.filteredItems?.slice(
          (this.currentPage - 1) * this.itemsPerPage,
          this.currentPage * this.itemsPerPage
        ) || [],
      error: this.error,
      totalPages:
        Math.ceil((this.filteredItems?.length || 0) / this.itemsPerPage) || 1,
      currentPage: this.currentPage,
      showFundHistory: this.showFundHistory || false,
      totalItem: this.calculateTotalItemValue(),
      itemTypes: this.itemTypes || [],
      itemRarities: this.itemRarities || [],
      owners: [...new Set(this.items?.map((item) => item.owner) || [])],
    };
  }

  activateListeners(html) {
    super.activateListeners(html);

    // Fund buttons
    html.find(".add-funds").click(this._onAddFunds.bind(this));
    html.find(".remove-funds").click(this._onRemoveFunds.bind(this));
    html.find(".view-fund-history").click(this._onViewFundHistory.bind(this));
    html.find(".back-button").click(this._onBackToFunds.bind(this));

    // Add fund history delete button listener
    html.find(".delete-fund").click(this._onDeleteFundEntry.bind(this));

    // Items - Fix the add-item-button selector
    html.find(".add-item-button").click(this._onAddItem.bind(this));
    html.find(".toggle-details").click(this._onToggleDetails.bind(this));

    // Item actions
    html.find(".delete-button").click(this._onDeleteItem.bind(this));
    html.find(".edit-button").click(this._onEditItem.bind(this));
    html.find(".sell-button").click(this._onSellItem.bind(this));

    // Pagination
    html.find(".prev-page").click(this._onPrevPage.bind(this));
    html.find(".next-page").click(this._onNextPage.bind(this));

    // Search and filter
    html.find("#itemSearch").on("input", this._onSearchItems.bind(this));
    html.find("#itemOwnerFilter").change(this._onFilterItems.bind(this));

    // Advanced options toggle
    html
      .find(".show-advanced-options")
      .click(this._toggleAdvancedOptions.bind(this));

    // Refresh button
    html.find(".refresh-data").click(this._onRefreshData.bind(this));
  }

  async _onDeleteFundEntry(event) {
    event.preventDefault();
    event.stopPropagation();

    const fundId = event.currentTarget.dataset.id;

    if (!fundId) {
      ui.notifications.error("Invalid fund entry ID");
      return;
    }

    // Find the fund entry to get its details for confirmation
    const fundEntry = this.fundHistory.find((entry) => entry.id == fundId);
    if (!fundEntry) {
      ui.notifications.error("Fund entry not found");
      return;
    }

    // Confirm deletion
    const confirmDelete = await Dialog.confirm({
      title: "Delete Fund Entry",
      content: `<p>Are you sure you want to delete this fund entry?</p>
              <p><strong>Description:</strong> ${fundEntry.desc}</p>
              <p><strong>Amount:</strong> ${fundEntry.amount}</p>
              <p><strong>Date:</strong> ${fundEntry.date}</p>`,
      yes: () => true,
      no: () => false,
      defaultYes: false,
    });

    if (!confirmDelete) return;

    try {
      await this.deleteFundEntry(fundId);
      ui.notifications.info("Fund entry deleted successfully!");

      // Refresh data
      await this.loadData();
    } catch (error) {
      console.error("Error deleting fund entry:", error);
      ui.notifications.error("Failed to delete fund entry");
    }
  }

  async deleteFundEntry(fundId) {
    if (!this.apiUrl || !this.token) {
      throw new Error("API URL and token must be configured in settings");
    }

    try {
      const response = await fetch(
        `${this.apiUrl}/api/funds/history/${fundId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${this.token}`,
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Delete fund entry API error:", errorText);
        throw new Error(
          `Failed to delete fund entry: ${response.status} ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error("Delete fund entry error:", error);
      throw error;
    }
  }

  async _onAddFunds(event) {
    event.preventDefault();

    // Get values from form
    const form = event.currentTarget.closest("form");
    const platinum = parseInt(form.querySelector("#platInput").value) || 0;
    const gold = parseInt(form.querySelector("#goldInput").value) || 0;
    const silver = parseInt(form.querySelector("#silverInput").value) || 0;
    const copper = parseInt(form.querySelector("#copperInput").value) || 0;
    const description = form.querySelector("#fundDesc").value;

    if (platinum + gold + silver + copper === 0) {
      ui.notifications.error("Please enter at least one currency value");
      return;
    }

    if (!description) {
      ui.notifications.error("Please enter a description");
      return;
    }

    this.render();

    try {
      await this.addFundEntry({
        platinum,
        gold,
        silver,
        copper,
        description,
        subtract: false,
      });

      // Reset form
      form.reset();
      ui.notifications.info("Funds added successfully!");

      // Refresh data
      await this.loadData();
    } catch (error) {
      console.error("Error adding funds:", error);
      ui.notifications.error("Failed to add funds");
    }
    this.render();
  }

  async _onRemoveFunds(event) {
    event.preventDefault();

    // Same logic as add funds but with subtract=true
    const form = event.currentTarget.closest("form");
    const platinum = parseInt(form.querySelector("#platInput").value) || 0;
    const gold = parseInt(form.querySelector("#goldInput").value) || 0;
    const silver = parseInt(form.querySelector("#silverInput").value) || 0;
    const copper = parseInt(form.querySelector("#copperInput").value) || 0;
    const description = form.querySelector("#fundDesc").value;

    if (platinum + gold + silver + copper === 0) {
      ui.notifications.error("Please enter at least one currency value");
      return;
    }

    if (!description) {
      ui.notifications.error("Please enter a description");
      return;
    }
    this.render();

    try {
      await this.addFundEntry({
        platinum,
        gold,
        silver,
        copper,
        description,
        subtract: true,
      });

      // Reset form
      form.reset();
      ui.notifications.info("Funds removed successfully!");

      // Refresh data
      await this.loadData();
    } catch (error) {
      console.error("Error removing funds:", error);
      ui.notifications.error("Failed to remove funds");
    }
    this.render();
  }

  _onViewFundHistory(event) {
    event.preventDefault();
    this.showFundHistory = true;
    this.render();
  }

  _onBackToFunds(event) {
    event.preventDefault();
    this.showFundHistory = false;
    this.render();
  }

  async _onAddItem(event) {
    event.preventDefault();

    // Get values from form
    const form = this.element.find(".item-form");
    const name = form.find("#itemName").val();
    const owner = form.find("#itemOwner").val();
    const quantity = parseInt(form.find("#itemQuantity").val()) || 1;
    const source = form.find("#itemSource").val();

    // Get advanced fields
    const itemType = form.find("#itemType").val();
    const itemRarity = form.find("#itemRarity").val();
    const itemValue = form.find("#itemValue").val();
    const valueCurrency = form.find("#valueCurrency").val() || "2"; // Default to gold
    const itemTags = form.find("#itemTags").val();
    const itemDescription = form.find("#itemDescription").val();

    if (!name || !owner || !source) {
      ui.notifications.error(
        game.i18n.localize("PARTYLOOT.Items.Error.RequiredFields")
      );
      return;
    }

    this.render();

    try {
      await this.addItem({
        name,
        owner,
        quantity,
        source,
        item_type_id: itemType || null,
        item_rarity_id: itemRarity || null,
        value: itemValue || null,
        value_type_id: valueCurrency || null,
        tags: itemTags ? itemTags.split(",").map((tag) => tag.trim()) : [],
        description: itemDescription || "",
      });

      // Reset form
      form.find("input, textarea, select").val("");
      form.find("#itemQuantity").val("1"); // Reset quantity to 1
      ui.notifications.info(
        game.i18n.localize("PARTYLOOT.Items.Info.ItemAdded")
      );

      // Refresh data
      await this.loadData();
    } catch (error) {
      console.error("Error adding item:", error);
      ui.notifications.error(
        game.i18n.localize("PARTYLOOT.Items.Error.AddError")
      );
    }
    this.render();
  }

  // Add this method to your PartyLootApp class
  async _onEditItem(event) {
    event.preventDefault();
    event.stopPropagation();

    const itemRow = event.currentTarget.closest(".item-row");
    const itemId = itemRow.dataset.itemId;

    // Find the item in our data
    const item = this.items.find((i) => i.id == itemId);

    if (!item) {
      ui.notifications.error(
        game.i18n.localize("PARTYLOOT.Items.Error.ItemNotFound")
      );
      return;
    }

    // Show loading indicator
    this.render();

    try {
      // Fetch item types and rarities for dropdowns if not already loaded
      if (!this.itemTypes || !this.itemRarities) {
        await this._populateItemTypeOptions();
      }

      // Create type options HTML
      let typeOptionsHTML = `<option value="">Select Type</option>`;
      this.itemTypes.forEach((type) => {
        // Need to compare as strings since values from API might be strings or numbers
        const selected =
          String(item.item_type_id) === String(type.id) ? "selected" : "";
        typeOptionsHTML += `<option value="${type.id}" ${selected}>${type.name}</option>`;
      });

      // Create rarity options HTML
      let rarityOptionsHTML = `<option value="">Select Rarity</option>`;
      this.itemRarities.forEach((rarity) => {
        // Need to compare as strings
        const selected =
          String(item.item_rarity_id) === String(rarity.id) ? "selected" : "";
        rarityOptionsHTML += `<option value="${rarity.id}" 
          style="color: ${rarity.color_code};" 
          ${selected}>${rarity.name}</option>`;
      });

      // Create currency options HTML
      const currencyOptions = [
        { id: 2, name: "Gold" },
        { id: 1, name: "Platinum" },
        { id: 3, name: "Silver" },
        { id: 4, name: "Copper" },
      ];

      let currencyOptionsHTML = "";
      currencyOptions.forEach((currency) => {
        // Need to compare as strings
        const selected =
          String(item.value_type_id) === String(currency.id) ? "selected" : "";
        currencyOptionsHTML += `<option value="${currency.id}" ${selected}>${currency.name}</option>`;
      });

      // Create a dialog for editing
      new Dialog({
        title: `Edit ${item.name}`,
        content: `
          <form class="edit-form">
            <div class="form-group">
              <label for="name">Item Name *</label>
              <input type="text" id="name" name="name" value="${
                item.name
              }" required>
            </div>
            <div class="form-group">
              <label for="owner">Owner *</label>
              <input type="text" id="owner" name="owner" value="${
                item.owner
              }" required>
            </div>
            <div class="form-group">
              <label for="quantity">Quantity</label>
              <input type="number" id="quantity" name="quantity" value="${
                item.quantity
              }" min="1">
            </div>
            <div class="form-group">
              <label for="source">Source *</label>
              <input type="text" id="source" name="source" value="${
                item.source
              }" required>
            </div>
            <div class="form-group">
              <label for="itemType">Item Type</label>
              <select id="itemType" name="itemType">
                ${typeOptionsHTML}
              </select>
            </div>
            <div class="form-group">
              <label for="itemRarity">Rarity</label>
              <select id="itemRarity" name="itemRarity">
                ${rarityOptionsHTML}
              </select>
            </div>
            <div class="form-group">
              <label for="value">Value</label>
              <div style="display: flex; gap: 5px;">
                <input type="number" id="value" name="value" value="${
                  item.value || 0
                }" min="0" style="flex: 2;">
                <select id="valueCurrency" name="valueCurrency" style="flex: 1;">
                  ${currencyOptionsHTML}
                </select>
              </div>
            </div>
            <div class="form-group">
              <label for="tags">Tags (comma separated)</label>
              <input type="text" id="tags" name="tags" value="${
                item.tags || ""
              }" placeholder="Weapon, Magic, Sword">
            </div>
            <div class="form-group">
              <label for="description">Description</label>
              <textarea id="description" name="description" rows="3">${
                item.description || ""
              }</textarea>
            </div>
          </form>
        `,
        buttons: {
          save: {
            icon: '<i class="fas fa-save"></i>',
            label: "Save",
            callback: async (html) => {
              const form = html.find("form")[0];

              const updateData = {
                id: itemId,
                name: form.querySelector("#name").value,
                owner: form.querySelector("#owner").value,
                quantity: parseInt(form.querySelector("#quantity").value) || 1,
                source: form.querySelector("#source").value,
                item_type_id: form.querySelector("#itemType").value || null,
                item_rarity_id: form.querySelector("#itemRarity").value || null,
                value: form.querySelector("#value").value || null,
                value_type_id:
                  form.querySelector("#valueCurrency").value || null,
                tags: form.querySelector("#tags").value,
                description: form.querySelector("#description").value || "",
              };

              try {
                await this.updateItem(updateData);
                ui.notifications.info("Item updated successfully!");
                this.loadData();
              } catch (error) {
                console.error("Error updating item:", error);
                ui.notifications.error("Failed to update item");
              }
            },
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: "Cancel",
          },
        },
        default: "save",
        width: 500,
      }).render(true);
    } catch (error) {
      console.error("Error preparing edit dialog:", error);
      ui.notifications.error("Failed to prepare edit dialog");
    } finally {
      this.render();
    }
  }
  // Add this method to your PartyLootApp class
  async _onSellItem(event) {
    event.preventDefault();
    event.stopPropagation();

    const itemRow = event.currentTarget.closest(".item-row");
    const itemId = itemRow.dataset.itemId;

    // Find the item in our data
    const item = this.items.find((i) => i.id == itemId);

    if (!item) {
      ui.notifications.error(
        game.i18n.localize("PARTYLOOT.Items.Error.ItemNotFound")
      );
      return;
    }

    // Create a dialog for selling
    new Dialog({
      title: `Sell or Give ${item.name}`,
      content: `
        <form class="sell-form">
          <div class="form-group">
            <label for="sellAction">Action:</label>
            <select id="sellAction" name="action">
              <option value="sell">Sell Item (add funds)</option>
              <option value="give">Give to Player (just remove item)</option>
            </select>
          </div>
          
          <div id="sellPriceGroup">
            <div class="form-group">
              <label for="sellQuantity">Quantity:</label>
              <input type="number" id="sellQuantity" name="quantity" value="${
                item.quantity
              }" min="1" max="${item.quantity}">
            </div>
            <div class="form-group">
              <label for="sellPrice">Sale Price (${
                item.value_type || "Gold"
              }):</label>
              <input type="number" id="sellPrice" name="price" value="${
                item.value || 0
              }" min="0">
            </div>
          </div>
          
          <div class="form-group">
            <label for="sellDescription">Transaction Description:</label>
            <input type="text" id="sellDescription" name="description" value="Sold ${
              item.name
            }" placeholder="What is this transaction for?">
          </div>
        </form>
        
        <script>
          // Toggle price fields based on action
          document.getElementById('sellAction').addEventListener('change', function() {
            const isPriceVisible = this.value === 'sell';
            document.getElementById('sellPriceGroup').style.display = isPriceVisible ? 'block' : 'none';
            
            // Update description based on action
            const descField = document.getElementById('sellDescription');
            if (this.value === 'give') {
              descField.value = "Gave ${item.name} to player";
            } else {
              descField.value = "Sold ${item.name}";
            }
          });
        </script>
      `,
      buttons: {
        confirm: {
          icon: '<i class="fas fa-check"></i>',
          label: "Confirm",
          callback: async (html) => {
            const form = html.find("form")[0];
            const action = form.querySelector("#sellAction").value;
            const quantityToSell =
              parseInt(form.querySelector("#sellQuantity").value) || 1;
            const description =
              form.querySelector("#sellDescription").value ||
              (action === "sell"
                ? `Sold ${item.name}`
                : `Gave ${item.name} to player`);

            try {
              // If selling, add funds
              if (action === "sell") {
                const salePrice =
                  parseInt(form.querySelector("#sellPrice").value) || 0;

                // Add funds from the sale
                const fundData = {
                  user_id: game.settings.get("party-loot", "userId"),
                  platinum: 0,
                  gold: 0,
                  silver: 0,
                  copper: 0,
                  description: description,
                  subtract: false,
                  user_group_id: game.settings.get("party-loot", "userGroupId"),
                  campaign_id: game.settings.get("party-loot", "campaignId"),
                };

                // Set the appropriate currency type based on the item's value_type_id
                const currencyType = String(item.value_type_id) || "2"; // Default to gold
                console.log(
                  "Selling item with currency type:",
                  currencyType,
                  "for amount:",
                  salePrice
                );

                switch (currencyType) {
                  case "1":
                    fundData.platinum = salePrice;
                    break;
                  case "2":
                    fundData.gold = salePrice;
                    break;
                  case "3":
                    fundData.silver = salePrice;
                    break;
                  case "4":
                    fundData.copper = salePrice;
                    break;
                  default:
                    fundData.gold = salePrice;
                    break;
                }

                await this.addFundEntry(fundData);

                // Update or delete the item based on quantity
                if (quantityToSell >= item.quantity) {
                  await this.deleteItem(itemId);
                  ui.notifications.info(
                    `Sold all ${item.name} for ${salePrice} ${
                      item.value_type || "gold"
                    }`
                  );
                } else {
                  const newQuantity = item.quantity - quantityToSell;
                  await this.updateItem({
                    ...item,
                    quantity: newQuantity,
                  });
                  ui.notifications.info(
                    `Sold ${quantityToSell} ${item.name} for ${salePrice} ${
                      item.value_type || "gold"
                    }`
                  );
                }
              } else {
                // Just remove the item (give to player)
                if (quantityToSell >= item.quantity) {
                  await this.deleteItem(itemId);
                  ui.notifications.info(
                    `Removed ${item.name} from party inventory`
                  );
                } else {
                  const newQuantity = item.quantity - quantityToSell;
                  await this.updateItem({
                    ...item,
                    quantity: newQuantity,
                  });
                  ui.notifications.info(
                    `Removed ${quantityToSell} ${item.name} from party inventory`
                  );
                }
              }

              // Refresh the data
              await this.loadData();
            } catch (error) {
              console.error("Error processing item:", error);
              ui.notifications.error("Failed to process item");
            }
          },
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel",
        },
      },
      default: "confirm",
      width: 500,
    }).render(true);
  }

  // Update _onDeleteItem to use the right selector
  async _onDeleteItem(event) {
    event.preventDefault();
    event.stopPropagation();

    // Get item ID
    const itemId = event.currentTarget.closest(".item-row").dataset.itemId;

    // Find the item to get its name for confirmation
    const item = this.items.find((i) => i.id == itemId);
    if (!item) {
      ui.notifications.error(
        game.i18n.localize("PARTYLOOT.Items.Error.ItemNotFound")
      );
      return;
    }

    // Confirm deletion
    const confirmDelete = await Dialog.confirm({
      title: "Delete Item",
      content: `Are you sure you want to delete "${item.name}"?`,
      yes: () => true,
      no: () => false,
      defaultYes: false,
    });

    if (!confirmDelete) return;

    try {
      await this.deleteItem(itemId);
      ui.notifications.info("Item deleted successfully!");

      // Refresh data
      await this.loadData();
    } catch (error) {
      console.error("Error deleting item:", error);
      ui.notifications.error("Failed to delete item");
    }
  }

  // Add this method to update an item
  async updateItem(itemData) {
    if (!this.apiUrl || !this.token) {
      throw new Error("API URL and token must be configured in settings");
    }

    try {
      const response = await fetch(`${this.apiUrl}/api/items/${itemData.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify(itemData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update item");
      }

      return await response.json();
    } catch (error) {
      console.error("Update item error:", error);
      throw error;
    }
  }

  _onItemClick(event) {
    // Handle item row click to show details
    const itemId = event.currentTarget.dataset.itemId;
    this._toggleItemDetails(itemId);
  }

  async _onDeleteItem(event) {
    event.preventDefault();
    event.stopPropagation();

    // Get item ID
    const itemId = event.currentTarget.closest(".item-row").dataset.itemId;

    if (
      !(await Dialog.confirm({
        title: "Delete Item",
        content: "Are you sure you want to delete this item?",
        yes: () => true,
        no: () => false,
      }))
    ) {
      return;
    }
    this.render();

    try {
      await this.deleteItem(itemId);
      ui.notifications.info("Item deleted successfully!");

      // Refresh data
      await this.loadData();
    } catch (error) {
      console.error("Error deleting item:", error);
      ui.notifications.error("Failed to delete item");
    }
    this.render();
  }

  _onToggleDetails(event) {
    event.preventDefault();
    event.stopPropagation();

    const itemId = event.currentTarget.closest(".item-row").dataset.itemId;
    this._toggleItemDetails(itemId);
  }

  _toggleItemDetails(itemId) {
    const detailsEl = this.element.find(`#details-${itemId}`);
    const row = this.element.find(`tr[data-item-id="${itemId}"]`);
    const button = row.find(".toggle-details i");

    if (detailsEl.is(":visible")) {
      detailsEl.hide();
      button.removeClass("fa-chevron-up").addClass("fa-chevron-down");
    } else {
      // Close any open details
      this.element.find(".item-details-row").hide();
      this.element
        .find(".toggle-details i")
        .removeClass("fa-chevron-up")
        .addClass("fa-chevron-down");

      // Open this one
      detailsEl.show();
      button.removeClass("fa-chevron-down").addClass("fa-chevron-up");
    }
  }

  _onPrevPage(event) {
    event.preventDefault();
    if (this.currentPage > 1) {
      this.currentPage--;
      this.render();
    }
  }

  _onNextPage(event) {
    event.preventDefault();
    const totalPages = Math.ceil(this.filteredItems.length / this.itemsPerPage);
    if (this.currentPage < totalPages) {
      this.currentPage++;
      this.render();
    }
  }

  _onSearchItems(event) {
    const searchTerm = event.currentTarget.value.toLowerCase();
    this._filterAndSearchItems(searchTerm);
  }

  _onFilterItems(event) {
    const owner = event.currentTarget.value;
    this._filterAndSearchItems(this.searchTerm, owner);
  }

  _filterAndSearchItems(searchTerm = "", owner = "") {
    this.searchTerm = searchTerm;
    this.ownerFilter = owner;

    this.filteredItems = this.items.filter((item) => {
      // Apply owner filter if set
      if (owner && item.owner !== owner) {
        return false;
      }

      // Apply search if term exists
      if (searchTerm) {
        return (
          item.name.toLowerCase().includes(searchTerm) ||
          item.owner.toLowerCase().includes(searchTerm) ||
          item.source.toLowerCase().includes(searchTerm) ||
          (item.description &&
            item.description.toLowerCase().includes(searchTerm))
        );
      }

      return true;
    });

    // Reset to first page when filtering
    this.currentPage = 1;
    this.render();
  }

  _toggleAdvancedOptions(event) {
    event.preventDefault();
    const advancedSection = this.element.find("#advancedOptionsSection");
    const toggleButton = this.element.find(".show-advanced-options");

    if (advancedSection.is(":visible")) {
      advancedSection.hide();
      toggleButton.html(
        '<i class="fa-solid fa-chevron-down me-1"></i> Show Advanced Options'
      );
    } else {
      advancedSection.show();
      toggleButton.html(
        '<i class="fa-solid fa-chevron-up me-1"></i> Hide Advanced Options'
      );
    }
  }

  async _onRefreshData(event) {
    if (event) event.preventDefault();

    this.render();

    try {
      await this.loadData();
    } catch (error) {
      console.error("Error refreshing data:", error);
      this.error = error.message || "Failed to refresh data";
    } finally {
      this.render();
    }
  }

  // API Methods
  async loadData() {
    try {
      // Load all data in parallel
      const [fundsData, fundHistoryData, itemsData, itemMetadata] =
        await Promise.all([
          this.fetchFunds(),
          this.fetchFundHistory(),
          this.fetchItems(),
          this._populateItemTypeOptions(),
        ]);

      this.funds = fundsData;
      this.fundHistory = fundHistoryData;
      this.items = itemsData;
      this.filteredItems = itemsData; // Ensure filteredItems is initialized

      // itemMetadata already set by _populateItemTypeOptions

      // Apply current filters
      this._filterAndSearchItems(this.searchTerm, this.ownerFilter);

      this.error = null;
      console.log("Data loaded successfully:", {
        funds: fundsData,
        items: itemsData.length,
        itemTypes: this.itemTypes?.length,
        itemRarities: this.itemRarities?.length,
      });
    } catch (error) {
      console.error("Error loading data:", error);
      this.error = error.message || "Failed to load data from Party Loot API";
    } finally {
      this.render();
    }
  }

  async fetchFunds() {
    if (!this.apiUrl || !this.token) {
      throw new Error("API URL and token must be configured in settings");
    }

    const campaignId = game.settings.get("party-loot", "campaignId");

    try {
      const response = await fetch(
        `${this.apiUrl}/api/funds?campaign_id=${campaignId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.token}`,
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Funds API error:", errorText);
        throw new Error(
          `Failed to fetch funds: ${response.status} ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error("Fetch funds error:", error);
      throw error;
    }
  }

  async fetchFundHistory() {
    if (!this.apiUrl || !this.token) {
      throw new Error("API URL and token must be configured in settings");
    }

    const campaignId = game.settings.get("party-loot", "campaignId");

    try {
      const response = await fetch(
        `${this.apiUrl}/api/funds/history?campaign_id=${campaignId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch fund history: ${response.statusText}`);
      }

      const data = await response.json();

      // Format dates and currency display
      return data.map((entry) => ({
        id: entry.id,
        platinum: entry.platinum,
        gold: entry.gold,
        silver: entry.silver,
        copper: entry.copper,
        amount: this.formatCurrencyDisplay(entry),
        desc: entry.description,
        date: new Date(entry.transaction_date).toLocaleString(),
        dateRaw: new Date(entry.transaction_date),
        subtract: entry.subtract === 1 || entry.subtract === true,
      }));
    } catch (error) {
      console.error("Fetch fund history error:", error);
      throw error;
    }
  }

  async fetchItems() {
    if (!this.apiUrl || !this.token) {
      throw new Error("API URL and token must be configured in settings");
    }

    try {
      const response = await fetch(`${this.apiUrl}/api/items`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch items: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Fetch items error:", error);
      throw error;
    }
  }

  async addFundEntry(entryData) {
    if (!this.apiUrl || !this.token) {
      throw new Error("API URL and token must be configured in settings");
    }

    const userId = game.settings.get("party-loot", "userId");
    const userGroupId = game.settings.get("party-loot", "userGroupId");
    const campaignId = game.settings.get("party-loot", "campaignId");

    const payload = {
      ...entryData,
      user_id: userId,
      user_group_id: userGroupId,
      campaign_id: campaignId,
    };

    try {
      const response = await fetch(`${this.apiUrl}/api/funds/history`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add fund entry");
      }

      return await response.json();
    } catch (error) {
      console.error("Add fund entry error:", error);
      throw error;
    }
  }

  async addItem(itemData) {
    if (!this.apiUrl || !this.token) {
      throw new Error("API URL and token must be configured in settings");
    }

    const userId = game.settings.get("party-loot", "userId");
    const userGroupId = game.settings.get("party-loot", "userGroupId");
    const campaignId = game.settings.get("party-loot", "campaignId");

    const payload = {
      ...itemData,
      user_id: userId,
      user_group_id: userGroupId,
      campaign_id: campaignId,
    };

    try {
      const response = await fetch(`${this.apiUrl}/api/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add item");
      }

      return await response.json();
    } catch (error) {
      console.error("Add item error:", error);
      throw error;
    }
  }

  async deleteItem(itemId) {
    if (!this.apiUrl || !this.token) {
      throw new Error("API URL and token must be configured in settings");
    }

    try {
      const response = await fetch(`${this.apiUrl}/api/items/${itemId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete item");
      }

      return await response.json();
    } catch (error) {
      console.error("Delete item error:", error);
      throw error;
    }
  }

  // Utility Methods

  formatCurrencyDisplay(entry) {
    let amountParts = [];

    if (entry.platinum > 0) amountParts.push(`${entry.platinum}P`);
    if (entry.gold > 0) amountParts.push(`${entry.gold}G`);
    if (entry.silver > 0) amountParts.push(`${entry.silver}S`);
    if (entry.copper > 0) amountParts.push(`${entry.copper}C`);

    let formattedAmount = amountParts.length ? amountParts.join(" ") : "0";
    return formattedAmount.toString();
  }

  calculateTotalItemValue() {
    // Convert all items to a single currency (copper) for total
    let platinum = 0;
    let gold = 0;
    let silver = 0;
    let copper = 0;

    this.items.forEach((item) => {
      if (!item.value) return;

      switch (item.value_type) {
        case "pp":
          platinum += parseInt(item.value) || 0;
          break;
        case "gp":
          gold += parseInt(item.value) || 0;
          break;
        case "sp":
          silver += parseInt(item.value) || 0;
          break;
        case "cp":
          copper += parseInt(item.value) || 0;
          break;
      }
    });

    return { platinum, gold, silver, copper };
  }
}

// Register module settings
Hooks.once("init", () => {
  game.settings.register("party-loot", "apiUrl", {
    name: "API URL",
    hint: "URL of the Party Loot API service",
    scope: "world",
    config: true,
    type: String,
    default: "https://test.partylootapp.com",
  });

  game.settings.register("party-loot", "apiToken", {
    name: "API Token",
    hint: "Your Party Loot API token from your profile page",
    scope: "world",
    config: true,
    type: String,
    default: "",
  });

  game.settings.register("party-loot", "userId", {
    name: "User ID",
    scope: "world",
    config: false,
    type: Number,
    default: 0,
  });

  game.settings.register("party-loot", "userGroupId", {
    name: "User Group ID",
    scope: "world",
    config: false,
    type: Number,
    default: 0,
  });

  game.settings.register("party-loot", "campaignId", {
    name: "Campaign ID",
    hint: "Your Party Loot campaign ID",
    scope: "world",
    config: false,
    type: Number,
    default: 0,
  });
  game.settings.register("party-loot", "token", {
    name: "API Auth Token",
    hint: "Return Token from authenticate API call",
    scope: "world",
    config: true,
    type: String,
    default: 0,
  });
});

Hooks.once("ready", async () => {
  const apiUrl = game.settings.get("party-loot", "apiUrl");
  const apiToken = game.settings.get("party-loot", "apiToken");

  if (apiUrl && apiToken) {
    try {
      const response = await fetch(`${apiUrl}/api/foundry/authenticate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiToken }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          game.settings.set("party-loot", "userId", data.userId);
          game.settings.set("party-loot", "userGroupId", data.userGroupId);
          game.settings.set("party-loot", "campaignId", data.campaignId);
          game.settings.set("party-loot", "token", data.token);
          console.log("Party Loot: Authenticated");
        }
      }
    } catch (e) {
      console.error("Party Loot: API error", e);
    }
  }

  // Keep the settings tab button as well
  Hooks.on("renderSidebarTab", (app, html) => {
    if (app.options.id !== "settings") return;
    const button = $(`
      <div class="party-loot-button flexrow">
        <button type="button">
          <i class="fas fa-coins"></i> Party Loot
        </button>
      </div>
    `);
    button.find("button").click(() => new PartyLootApp().render(true));
    html.find(".directory-footer").append(button);
  });
});

// Add the Party Loot button to scene controls as its own group
Hooks.on("getSceneControlButtons", (controls) => {
  controls.push({
    name: "partyloot",
    title: "Party Loot",
    icon: "fas fa-coins",
    layer: "controls",
    visible: true,
    tools: [
      {
        name: "open",
        title: "Open Party Loot",
        icon: "fas fa-coins",
        button: true,
        onClick: () => new PartyLootApp().render(true),
      },
    ],
  });
});

Hooks.once("canvasReady", () => {
  setTimeout(() => {
    if (ui.controls) {
      console.log("Party Loot: Refreshing scene controls");
      ui.controls.render(true);
    }
  }, 100);
});

Hooks.on("renderSceneControls", (controls, html, data) => {
  if (!html.find('[data-control="partyloot"]').length) {
    setTimeout(() => {
      console.log("Party Loot: Scene control missing, forcing refresh");
      controls.render(true);
    }, 50);
  }
});

Hooks.once("setup", () => {
  console.log("Party Loot: Module setup complete");
});
