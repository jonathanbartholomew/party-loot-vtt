export class ItemsManager {
  constructor() {
    this.items = [];
    this.itemTypes = [];
    this.itemRarities = [];
  }

  async initialize() {
    await this.refreshItems();
    await this.fetchItemTypes();
    await this.fetchItemRarities();
  }

  async refreshItems() {
    const itemsData = await game.partyLoot.api.fetchItems();
    if (Array.isArray(itemsData) && itemsData.length > 0) {
      this.items = itemsData.map((item) => ({
        id: item.id.toString(), // Ensure ID is a string
        name: item.name || "",
        owner: item.owner || "",
        quantity: item.quantity || 1,
        source: item.source || "",
        colorCode: item.color_code || "#ffffff",
        itemType: item.item_type || "",
        rarity: item.rarity || "",
        iconClass: item.icon_class || "fa-box",
        description: item.description || "",
        valueType: item.value_type || "",
        tags: item.tags || "",
        value: item.value || 0,
        dateAdded: item.added_date
          ? new Date(item.added_date).toLocaleDateString()
          : "",
      }));
      console.log("Party Loot | Updated items:", this.items.length, "items");
    } else {
      console.log("Party Loot | No items data returned from API");
      this.items = [];
    }
    return this.items;
  }

  async fetchItemTypes() {
    // This would fetch from API, but for this example we'll use a placeholder
    this.itemTypes = [
      { id: 1, name: "Weapon", iconClass: "fa-sword" },
      { id: 2, name: "Armor", iconClass: "fa-shield" },
      { id: 3, name: "Potion", iconClass: "fa-flask" },
      { id: 4, name: "Scroll", iconClass: "fa-scroll" },
      { id: 5, name: "Wondrous Item", iconClass: "fa-hat-wizard" },
      { id: 6, name: "Ring", iconClass: "fa-ring" },
      { id: 7, name: "Wand", iconClass: "fa-wand-sparkles" },
    ];
    return this.itemTypes;
  }

  async fetchItemRarities() {
    // Placeholder for rarities
    this.itemRarities = [
      { id: 1, name: "Common", colorCode: "#B0B0B0" },
      { id: 2, name: "Uncommon", colorCode: "#1AFF00" },
      { id: 3, name: "Rare", colorCode: "#0070DD" },
      { id: 4, name: "Very Rare", colorCode: "#A335EE" },
      { id: 5, name: "Legendary", colorCode: "#FF8000" },
      { id: 6, name: "Artifact", colorCode: "#E6CC80" },
    ];
    return this.itemRarities;
  }

  async addItem(itemData) {
    const result = await game.partyLoot.api.addItem(itemData);
    if (result) {
      await this.refreshItems();
      return true;
    }
    return false;
  }

  async updateItem(itemId, itemData) {
    const result = await game.partyLoot.api.updateItem(itemId, itemData);
    if (result) {
      await this.refreshItems();
      return true;
    }
    return false;
  }

  async deleteItem(itemId) {
    const result = await game.partyLoot.api.deleteItem(itemId);
    if (result) {
      await this.refreshItems();
      return true;
    }
    return false;
  }

  async sellItem(itemId, sellParams) {
    // Get the item information first
    const item = this.items.find((i) => i.id === itemId);
    if (!item) return false;

    try {
      // If adding to party funds, create a fund entry
      if (sellParams.addToFunds) {
        // Convert to the correct currency values
        let platinum = 0,
          gold = 0,
          silver = 0,
          copper = 0;

        // Calculate values based on custom or original price
        const itemValue = sellParams.useHagglePrice
          ? sellParams.customValue
          : item.value;
        const valueType = sellParams.useHagglePrice
          ? sellParams.customValueType
          : item.value_type_id;

        // Calculate total value (value × quantity)
        const totalValue = parseInt(itemValue) * parseInt(item.quantity || 1);

        // Set the correct currency field based on value type
        switch (valueType) {
          case "1": // Platinum
            platinum = totalValue;
            break;
          case "2": // Gold
            gold = totalValue;
            break;
          case "3": // Silver
            silver = totalValue;
            break;
          case "4": // Copper
            copper = totalValue;
            break;
        }

        // Create description based on haggled price or original
        const description = sellParams.useHagglePrice
          ? `Sold item: ${item.name} (${item.quantity}x at ${
              sellParams.customValue
            } ${getValueTypeDisplay(valueType)} each - haggled price)`
          : `Sold item: ${item.name} (${item.quantity}x at ${
              item.value
            } ${getValueTypeDisplay(item.value_type_id)} each)`;

        // Create a fund entry
        await game.partyLoot.funds.addFundEntry({
          platinum,
          gold,
          silver,
          copper,
          description,
          subtract: false, // Adding funds
        });
      }

      // Delete the item
      await this.deleteItem(itemId);

      return true;
    } catch (error) {
      console.error("Party Loot | Error selling item:", error);
      ui.notifications.error("Failed to sell item");
      return false;
    }
  }

  renderItemsPanel() {
    // Create application dialog
    const itemsApp = new ItemsApplication(this);
    itemsApp.render(true);
  }
}

class ItemsApplication extends Application {
  constructor(itemsManager) {
    super();
    this.itemsManager = itemsManager;
    this.page = 1;
    this.entriesPerPage = 10;
    this.filterOwner = "";
    this.searchText = "";
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "party-loot-items",
      title: "Party Items",
      template: "modules/party-loot/templates/items-panel.html",
      width: 800,
      height: 700,
      resizable: true,
      closeOnSubmit: false,
    });
  }

  async getData() {
    // Refresh data before rendering
    await this.itemsManager.refreshItems();

    // Apply filters
    let filteredItems = [...this.itemsManager.items];

    if (this.filterOwner) {
      filteredItems = filteredItems.filter(
        (item) => item.owner === this.filterOwner
      );
    }

    if (this.searchText) {
      const searchLower = this.searchText.toLowerCase();
      filteredItems = filteredItems.filter(
        (item) =>
          item.name.toLowerCase().includes(searchLower) ||
          item.owner.toLowerCase().includes(searchLower) ||
          item.source.toLowerCase().includes(searchLower) ||
          (item.description &&
            item.description.toLowerCase().includes(searchLower))
      );
    }

    // Get unique owners for filter dropdown
    const owners = Array.from(
      new Set(this.itemsManager.items.map((item) => item.owner))
    ).sort();

    // Pagination
    const totalPages = Math.ceil(filteredItems.length / this.entriesPerPage);
    const start = (this.page - 1) * this.entriesPerPage;
    const end = start + this.entriesPerPage;
    const paginatedItems = filteredItems.slice(start, end);

    return {
      items: paginatedItems,
      owners: owners,
      filterOwner: this.filterOwner,
      searchText: this.searchText,
      pagination: {
        page: this.page,
        pages: totalPages,
        totalItems: filteredItems.length,
      },
      itemTypes: this.itemsManager.itemTypes,
      itemRarities: this.itemsManager.itemRarities,
    };
  }

  activateListeners(html) {
    super.activateListeners(html);

    // Add new item
    html.find(".add-item-btn").click(() => this._onAddItem());

    // Item actions
    html.find(".edit-item-btn").click((ev) => this._onEditItem(ev));
    html.find(".delete-item-btn").click((ev) => this._onDeleteItem(ev));
    html.find(".view-item-btn").click((ev) => this._onViewItem(ev));
    html.find(".sell-item-btn").click((ev) => this._onSellItem(ev));

    // Pagination
    html.find(".page-prev").click(() => this._onPageChange(-1));
    html.find(".page-next").click(() => this._onPageChange(1));

    // FIX: Improved search input handling to prevent focus loss
    const searchInput = html.find("#item-search");
    if (searchInput.length) {
      // Use keyup instead of input event to prevent focus issues
      searchInput.off("input").on("keyup", (ev) => {
        // Store the current cursor position
        const cursorPos = ev.target.selectionStart;

        // Update the search text
        this.searchText = ev.target.value;

        // Update the UI without losing focus
        this._updateFilteredItems();

        // After the update, explicitly set focus back and restore cursor position
        setTimeout(() => {
          searchInput.focus();
          searchInput[0].setSelectionRange(cursorPos, cursorPos);
        }, 0);
      });
    }

    // Filters
    html.find("#owner-filter").change((ev) => this._onFilterOwner(ev));
  }

  _updateFilteredItems() {
    // Get the filtered items
    let filteredItems = [...this.itemsManager.items];

    if (this.filterOwner) {
      filteredItems = filteredItems.filter(
        (item) => item.owner === this.filterOwner
      );
    }

    if (this.searchText) {
      const searchLower = this.searchText.toLowerCase();
      filteredItems = filteredItems.filter(
        (item) =>
          item.name.toLowerCase().includes(searchLower) ||
          item.owner.toLowerCase().includes(searchLower) ||
          item.source.toLowerCase().includes(searchLower) ||
          (item.description &&
            item.description.toLowerCase().includes(searchLower))
      );
    }

    // Reset to first page when filtering
    this.page = 1;

    // Update the items table without doing a full re-render
    this._updateItemsTable(filteredItems);
  }

  _updateItemsTable(filteredItems) {
    // Pagination
    const totalPages = Math.ceil(filteredItems.length / this.entriesPerPage);
    const start = (this.page - 1) * this.entriesPerPage;
    const end = start + this.entriesPerPage;
    const paginatedItems = filteredItems.slice(start, end);

    // Get the table body
    const tableBody = this.element.find("tbody");

    // Clear existing rows
    tableBody.empty();

    // No items message
    if (paginatedItems.length === 0) {
      tableBody.append(
        `<tr><td colspan="5" class="text-center">No items found.</td></tr>`
      );
    } else {
      // Add each item
      paginatedItems.forEach((item) => {
        const row = this._createItemRow(item);
        tableBody.append(row);
      });
    }

    // Update pagination display
    this._updatePagination(filteredItems.length, totalPages);
  }

  _createItemRow(item) {
    return `
      <tr data-item-id="${item.id}">
        <td>
          <div class="item-name">
            ${
              item.iconClass
                ? `<i class="fas ${item.iconClass}" style="color: ${
                    item.colorCode || "#fff"
                  };"></i>`
                : ""
            }
            ${item.name}
          </div>
        </td>
        <td>${item.owner}</td>
        <td>${item.quantity}</td>
        <td>
          <div class="btn-group">
            <button class="view-item-btn" data-id="${
              item.id
            }"><i class="fas fa-eye"></i></button>
            <button class="edit-item-btn" data-id="${
              item.id
            }"><i class="fas fa-edit"></i></button>
            ${
              item.value
                ? `<button class="sell-item-btn" data-id="${item.id}"><i class="fas fa-coins"></i></button>`
                : ""
            }
            <button class="delete-item-btn" data-id="${
              item.id
            }"><i class="fas fa-trash"></i></button>
          </div>
        </td>
      </tr>
    `;
  }

  // Update pagination info
  _updatePagination(totalItems, totalPages) {
    const paginationElem = this.element.find(".pagination-info");
    if (paginationElem.length) {
      paginationElem.html(
        `Page ${this.page} of ${totalPages || 1} (${totalItems} total)`
      );
    }

    // Enable/disable pagination buttons
    this.element.find(".page-prev").prop("disabled", this.page <= 1);
    this.element.find(".page-next").prop("disabled", this.page >= totalPages);
  }

  _onSearch(event) {
    this.searchText = event.target.value;
    this.page = 1; // Reset to first page
    this._updateFilteredItems(); // Update without full re-render
  }

  _onFilterOwner(event) {
    this.filterOwner = event.target.value;
    this.page = 1; // Reset to first page
    this._updateFilteredItems(); // Update without full re-render
  }

  _onPageChange(direction) {
    const newPage = this.page + direction;

    // Get current filtered items count
    let filteredItems = [...this.itemsManager.items];
    if (this.filterOwner) {
      filteredItems = filteredItems.filter(
        (item) => item.owner === this.filterOwner
      );
    }
    if (this.searchText) {
      const searchLower = this.searchText.toLowerCase();
      filteredItems = filteredItems.filter(
        (item) =>
          item.name.toLowerCase().includes(searchLower) ||
          item.owner.toLowerCase().includes(searchLower) ||
          item.source.toLowerCase().includes(searchLower) ||
          (item.description &&
            item.description.toLowerCase().includes(searchLower))
      );
    }

    const totalPages = Math.ceil(filteredItems.length / this.entriesPerPage);

    if (newPage > 0 && newPage <= totalPages) {
      this.page = newPage;
      this._updateItemsTable(filteredItems);
    }
  }

  _onPageChange(direction) {
    const newPage = this.page + direction;
    if (newPage > 0 && newPage <= this.getData().pagination.pages) {
      this.page = newPage;
      this.render();
    }
  }

  async _onAddItem() {
    const itemFormData = {
      itemTypes: this.itemsManager.itemTypes,
      itemRarities: this.itemsManager.itemRarities,
      isNew: true,
    };

    const content = await renderTemplate(
      "modules/party-loot/templates/item-form.html",
      itemFormData
    );

    new Dialog({
      title: "Add New Item",
      content: content,
      buttons: {
        submit: {
          label: "Save",
          callback: (html) => this._processItemForm(html),
        },
        cancel: {
          label: "Cancel",
        },
      },
      default: "submit",
      width: 600,
    }).render(true);
  }

  async _processItemForm(html, itemId = null) {
    // Get all form values
    const formData = {
      name: html.find('[name="name"]').val(),
      owner: html.find('[name="owner"]').val(),
      quantity: parseInt(html.find('[name="quantity"]').val()) || 1,
      source: html.find('[name="source"]').val(),
      item_type_id: html.find('[name="item_type_id"]').val() || null,
      item_rarity_id: html.find('[name="item_rarity_id"]').val() || null,
      value: html.find('[name="value"]').val() || null,
      value_type_id: html.find('[name="value_type_id"]').val() || null,
      description: html.find('[name="description"]').val() || "",
    };

    // FIX: Properly handle tags - get the raw string value first
    const tagsString = html.find('[name="tags"]').val() || "";

    // Process tags in a more robust way
    if (tagsString.trim() !== "") {
      // Split by commas and filter out empty entries
      const tagsArray = tagsString
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag !== "");

      // If we have any valid tags, join them back with commas
      if (tagsArray.length > 0) {
        formData.tags = tagsArray.join(",");
      } else {
        formData.tags = ""; // Empty string if no valid tags
      }
    } else {
      formData.tags = ""; // Explicitly set to empty string if blank
    }

    // Log the form data for debugging (remove in production)
    console.log("Item form data:", formData);

    // Validate
    if (!formData.name || !formData.owner || !formData.source) {
      ui.notifications.error("Name, owner, and source are required fields.");
      return false;
    }

    let result;
    if (itemId) {
      result = await this.itemsManager.updateItem(itemId, formData);
      if (result) ui.notifications.info("Item updated successfully.");
    } else {
      result = await this.itemsManager.addItem(formData);
      if (result) ui.notifications.info("Item added successfully.");
    }

    if (result) this.render();
  }

  async _onEditItem(event) {
    const itemId = event.currentTarget.dataset.id;
    const item = this.itemsManager.items.find((i) => i.id === itemId);

    if (!item) {
      ui.notifications.error("Item not found.");
      return;
    }

    const itemFormData = {
      item: item,
      itemTypes: this.itemsManager.itemTypes,
      itemRarities: this.itemsManager.itemRarities,
      isNew: false,
    };

    const content = await renderTemplate(
      "modules/party-loot/templates/item-form.html",
      itemFormData
    );

    new Dialog({
      title: `Edit Item: ${item.name}`,
      content: content,
      buttons: {
        submit: {
          label: "Save",
          callback: (html) => this._processItemForm(html, item.id),
        },
        cancel: {
          label: "Cancel",
        },
      },
      default: "submit",
      width: 600,
    }).render(true);
  }

  async _onDeleteItem(event) {
    const itemId = event.currentTarget.dataset.id;
    const item = this.itemsManager.items.find((i) => i.id === itemId);

    if (!item) {
      ui.notifications.error("Item not found.");
      return;
    }

    new Dialog({
      title: "Confirm Deletion",
      content: `<p>Are you sure you want to delete "${item.name}"?</p>`,
      buttons: {
        yes: {
          label: "Yes",
          callback: async () => {
            const result = await this.itemsManager.deleteItem(itemId);
            if (result) {
              ui.notifications.info("Item deleted successfully.");
              this.render();
            }
          },
        },
        no: {
          label: "No",
        },
      },
    }).render(true);
  }

  async _onViewItem(event) {
    const itemId = event.currentTarget.dataset.id;
    const item = this.itemsManager.items.find((i) => i.id === itemId);

    if (!item) {
      ui.notifications.error("Item not found.");
      return;
    }

    // Find the rarity info for this item
    const rarity = this.itemsManager.itemRarities.find(
      (r) => r.name === item.rarity
    );
    const rarityColor = rarity ? rarity.colorCode : "#FFFFFF";

    const content = await renderTemplate(
      "modules/party-loot/templates/item-details.html",
      {
        item: item,
        rarityColor: rarityColor,
      }
    );

    new Dialog({
      title: item.name,
      content: content,
      buttons: {
        close: {
          label: "Close",
        },
        edit: {
          label: "Edit",
          callback: () =>
            this._onEditItem({ currentTarget: { dataset: { id: itemId } } }),
        },
      },
      default: "close",
      width: 600,
    }).render(true);
  }

  async _onSellItem(event) {
    const itemId = event.currentTarget.dataset.id;
    const item = this.itemsManager.items.find((i) => i.id === itemId);

    if (!item) {
      ui.notifications.error("Item not found.");
      return;
    }

    // Check if the item has a value
    if (!item.value) {
      ui.notifications.warn("This item has no value set.");
      return;
    }

    // Create dialog for selling item
    const content = await renderTemplate(
      "modules/party-loot/templates/sell-item.html",
      {
        item: item,
      }
    );

    new Dialog({
      title: `Sell Item: ${item.name}`,
      content: content,
      buttons: {
        funds: {
          icon: '<i class="fas fa-coins"></i>',
          label: "Sell to Party Funds",
          callback: (html) => this._processSellToFunds(html, item),
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel",
        },
      },
      default: "funds",
      width: 400,
    }).render(true);
  }

  async _processSellToFunds(html, item) {
    // Get haggle options
    const useHagglePrice = html.find("#haggleCheckbox").is(":checked");
    const customValue = useHagglePrice ? html.find("#customValue").val() : null;
    const customValueType = useHagglePrice
      ? html.find("#customValueType").val()
      : null;

    // Validate
    if (useHagglePrice && (!customValue || parseInt(customValue) <= 0)) {
      ui.notifications.error(
        "Please enter a valid haggle price greater than 0"
      );
      return;
    }

    // Prepare sell parameters
    const sellParams = {
      addToFunds: true,
      useHagglePrice,
      customValue,
      customValueType,
    };

    // Process the sale
    const success = await this.itemsManager.sellItem(item.id, sellParams);

    if (success) {
      ui.notifications.success(`Item sold and funds added to party treasury.`);
      this.render();
    }
  }
}

function getValueTypeDisplay(valueTypeId) {
  switch (valueTypeId) {
    case "1":
      return "pp";
    case "2":
      return "gp";
    case "3":
      return "sp";
    case "4":
      return "cp";
    default:
      return "gp";
  }
}
