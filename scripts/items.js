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
    this.items = itemsData.map((item) => ({
      id: item.id,
      name: item.name,
      owner: item.owner,
      quantity: item.quantity,
      source: item.source,
      colorCode: item.color_code,
      itemType: item.item_type,
      rarity: item.rarity,
      iconClass: item.icon_class || "fa-box",
      description: item.description,
      valueType: item.value_type,
      tags: item.tags,
      value: item.value,
      dateAdded: new Date(item.added_date).toLocaleDateString(),
    }));
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
    return mergeObject(super.defaultOptions, {
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

    // Pagination
    html.find(".page-prev").click(() => this._onPageChange(-1));
    html.find(".page-next").click(() => this._onPageChange(1));

    // Filters
    html.find("#item-search").on("input", (ev) => this._onSearch(ev));
    html.find("#owner-filter").change((ev) => this._onFilterOwner(ev));
  }

  _onSearch(event) {
    this.searchText = event.target.value;
    this.page = 1; // Reset to first page
    this.render();
  }

  _onFilterOwner(event) {
    this.filterOwner = event.target.value;
    this.page = 1; // Reset to first page
    this.render();
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
    const formData = {
      name: html.find('[name="name"]').val(),
      owner: html.find('[name="owner"]').val(),
      quantity: parseInt(html.find('[name="quantity"]').val()) || 1,
      source: html.find('[name="source"]').val(),
      item_type_id: html.find('[name="item_type_id"]').val() || null,
      item_rarity_id: html.find('[name="item_rarity_id"]').val() || null,
      value: html.find('[name="value"]').val() || null,
      value_type_id: html.find('[name="value_type_id"]').val() || null,
      tags: html.find('[name="tags"]').val() || "",
      description: html.find('[name="description"]').val() || "",
    };

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
}
