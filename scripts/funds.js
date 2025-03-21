export class FundsManager {
  constructor() {
    this.funds = {
      platinum: 0,
      gold: 0,
      silver: 0,
      copper: 0,
    };
    this.fundHistory = [];
  }

  async initialize() {
    await this.refreshFunds();
    await this.refreshFundHistory();
  }

  async refreshFunds() {
    const fundsData = await game.partyLoot.api.fetchFunds();
    if (fundsData) {
      this.funds = {
        platinum: fundsData.platinum || 0,
        gold: fundsData.gold || 0,
        silver: fundsData.silver || 0,
        copper: fundsData.copper || 0,
      };
    }
    return this.funds;
  }

  async refreshFundHistory() {
    const historyData = await game.partyLoot.api.fetchFundHistory();
    this.fundHistory = historyData.map((entry) => ({
      id: entry.id,
      platinum: entry.platinum,
      gold: entry.gold,
      silver: entry.silver,
      copper: entry.copper,
      description: entry.description,
      date: new Date(entry.transaction_date).toLocaleString(),
      dateRaw: new Date(entry.transaction_date),
      subtract: entry.subtract === 1 || entry.subtract === true,
    }));
    return this.fundHistory;
  }

  async addFundEntry(data) {
    const result = await game.partyLoot.api.addFundEntry(data);
    if (result) {
      await this.refreshFunds();
      await this.refreshFundHistory();
      return true;
    }
    return false;
  }

  async deleteFundEntry(entryId) {
    const result = await game.partyLoot.api.deleteFundEntry(entryId);
    if (result) {
      await this.refreshFunds();
      await this.refreshFundHistory();
      return true;
    }
    return false;
  }

  renderFundsPanel() {
    // Create application dialog
    const fundsApp = new FundsApplication(this);
    fundsApp.render(true);
  }
}

class FundsApplication extends Application {
  constructor(fundsManager) {
    super();
    this.fundsManager = fundsManager;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "party-loot-funds",
      title: "Party Funds",
      template: "modules/party-loot/templates/funds-panel.html",
      width: 600,
      height: "auto",
      resizable: true,
      closeOnSubmit: false,
    });
  }

  async getData() {
    // Refresh data before rendering
    await this.fundsManager.refreshFunds();
    await this.fundsManager.refreshFundHistory();

    return {
      funds: this.fundsManager.funds,
      fundHistory: this.fundsManager.fundHistory.slice(0, 10), // Show last 10 entries
    };
  }

  activateListeners(html) {
    super.activateListeners(html);

    // Add fund entry
    html.find(".add-fund-btn").click(() => this._onAddFund(false));
    html.find(".subtract-fund-btn").click(() => this._onAddFund(true));

    // Delete fund entry
    html.find(".delete-fund-btn").click((ev) => this._onDeleteFund(ev));

    // Open full history view
    html.find(".view-history-btn").click(() => this._onViewHistory());
  }

  async _onAddFund(isSubtract) {
    const content = await renderTemplate(
      "modules/party-loot/templates/fund-form.html",
      {
        isSubtract: isSubtract,
      }
    );

    new Dialog({
      title: isSubtract ? "Subtract Funds" : "Add Funds",
      content: content,
      buttons: {
        submit: {
          label: isSubtract ? "Subtract" : "Add",
          callback: (html) => this._processFundForm(html, isSubtract),
        },
        cancel: {
          label: "Cancel",
        },
      },
    }).render(true);
  }

  async _processFundForm(html, isSubtract) {
    const formData = {
      platinum: parseInt(html.find('[name="platinum"]').val()) || 0,
      gold: parseInt(html.find('[name="gold"]').val()) || 0,
      silver: parseInt(html.find('[name="silver"]').val()) || 0,
      copper: parseInt(html.find('[name="copper"]').val()) || 0,
      description: html.find('[name="description"]').val(),
      subtract: isSubtract,
    };

    // Validate
    if (
      formData.platinum + formData.gold + formData.silver + formData.copper ===
      0
    ) {
      ui.notifications.error("Please enter at least one currency amount.");
      return false;
    }

    if (!formData.description) {
      ui.notifications.error("Please enter a description.");
      return false;
    }

    const result = await this.fundsManager.addFundEntry(formData);
    if (result) {
      ui.notifications.info(
        `Funds ${isSubtract ? "subtracted" : "added"} successfully.`
      );
      this.render();
    }
  }

  async _onDeleteFund(event) {
    const entryId = event.currentTarget.dataset.id;

    new Dialog({
      title: "Confirm Deletion",
      content: "<p>Are you sure you want to delete this fund entry?</p>",
      buttons: {
        yes: {
          label: "Yes",
          callback: async () => {
            const result = await this.fundsManager.deleteFundEntry(entryId);
            if (result) {
              ui.notifications.info("Fund entry deleted successfully.");
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

  _onViewHistory() {
    // Show a dialog with full history and pagination
    new FundHistoryApplication(this.fundsManager).render(true);
  }
}

class FundHistoryApplication extends Application {
  constructor(fundsManager) {
    super();
    this.fundsManager = fundsManager;
    this.page = 1;
    this.entriesPerPage = 10;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "party-loot-fund-history",
      title: "Fund History",
      template: "modules/party-loot/templates/fund-history.html",
      width: 700,
      height: 600,
      resizable: true,
    });
  }

  async getData() {
    const history = this.fundsManager.fundHistory;
    const start = (this.page - 1) * this.entriesPerPage;
    const end = start + this.entriesPerPage;

    return {
      history: history.slice(start, end),
      pagination: {
        page: this.page,
        pages: Math.ceil(history.length / this.entriesPerPage),
        totalEntries: history.length,
      },
    };
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find(".page-prev").click(() => this._onPageChange(-1));
    html.find(".page-next").click(() => this._onPageChange(1));
    html.find(".delete-fund-btn").click((ev) => this._onDeleteFund(ev));
  }

  _onPageChange(direction) {
    const newPage = this.page + direction;
    const maxPages = Math.ceil(
      this.fundsManager.fundHistory.length / this.entriesPerPage
    );

    if (newPage > 0 && newPage <= maxPages) {
      this.page = newPage;
      this.render();
    }
  }

  async _onDeleteFund(event) {
    const entryId = event.currentTarget.dataset.id;

    new Dialog({
      title: "Confirm Deletion",
      content: "<p>Are you sure you want to delete this fund entry?</p>",
      buttons: {
        yes: {
          label: "Yes",
          callback: async () => {
            const result = await this.fundsManager.deleteFundEntry(entryId);
            if (result) {
              ui.notifications.info("Fund entry deleted successfully.");
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
}
