# Party Loot

A Foundry VTT module to track party funds and items for your roleplaying games.

## Features

- Track party currency (platinum, gold, silver, copper)
- Record item acquisitions with detailed properties
- Full history of monetary transactions
- Customizable item types and rarities

## Installation

### Method 1: Foundry VTT Module Browser

1. Open the Foundry VTT setup screen
2. Go to "Add-on Modules"
3. Click "Install Module"
4. Search for "Party Loot" or paste this manifest URL: 
   `https://raw.githubusercontent.com/yourusername/party-loot/main/module.json`

### Method 2: Manual Installation

1. Download the [latest release](https://github.com/yourusername/party-loot/releases/latest)
2. Extract the zip file to your Foundry VTT `Data/modules/` folder
3. Restart Foundry VTT

## Configuration

After installation:

1. Enable the module in your world settings
2. Configure the API connection in Module Settings:
   - API URL: The URL of your Party Loot API service
   - API Token: Your authentication token
   - Campaign ID: Your campaign identifier

## Usage

Once enabled, you'll see a Party Loot button in your scene controls that gives access to:

- Party Funds panel: Add or subtract currency with transaction history
- Party Items panel: Track and manage the party's inventory

## License

[MIT License](LICENSE)
