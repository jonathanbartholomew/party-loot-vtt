# Party Loot VTT

A Foundry VTT module that connects to the Party Loot web application to seamlessly track your party's funds and items across your roleplaying campaigns.

## What is Party Loot?

Party Loot is a comprehensive party inventory management system that helps D&D and other RPG groups track their shared funds, items, and loot. This Foundry VTT module integrates directly with the Party Loot web service, allowing you to manage your party's resources without leaving your virtual tabletop.

## Features

- **Party Currency Tracking**: Monitor platinum, gold, silver, and copper with automatic calculations
- **Item Management**: Record detailed item acquisitions with types, rarities, values, and descriptions
- **Transaction History**: Full history of all monetary transactions with descriptions and timestamps
- **Real-time Sync**: Changes sync instantly with the Party Loot web application

## Prerequisites

Before installing this module, you need:

1. **A Party Loot Account with active Tier 2 Subscription**: Sign up at [partylootapp.com](https://www.partylootapp.com)
2. **Your API Token**: Found in your Party Loot profile settings
3. **A Campaign**: Create or join a campaign in Party Loot

## Installation

### Manual Installation via Manifest URL

1. Open Foundry VTT and go to the **Setup** screen
2. Click on **Add-on Modules**
3. Click **Install Module**
4. Paste this manifest URL in the **Manifest URL** field:
   https://raw.githubusercontent.com/jonathanbartholomew/party-loot-vtt/main/module.json 5. Click **Install**
5. Enable the module in your world's **Module Settings**

### Method 3: Manual File Installation

1. Download the latest release from [GitHub](https://github.com/jonathanbartholomew/party-loot-vtt/releases)
2. Extract the ZIP file to your Foundry VTT `Data/modules/` folder
3. Restart Foundry VTT
4. Enable the module in your world's **Module Settings**

## Configuration

### Step 1: Get Your API Token

1. Go to [partylootapp.com](https://www.partylootapp.com) and log in
2. Navigate to your **Profile** page
3. Copy your **API Token** (you'll need this for the next step)

### Step 2: Configure the Module

1. In Foundry VTT, go to **Game Settings** → **Configure Settings** → **Module Settings**
2. Find **Party Loot** in the list and configure:

- **API URL**: `https://partylootapp.com` (default - don't change unless instructed)
- **API Token**: Paste your API token from Step 1
- **Campaign ID**: Enter your campaign ID from Party Loot (found in your campaign settings)

### Step 3: Test the Connection

1. Save your settings
2. The module will automatically authenticate when you load your world
3. Check the browser console (F12) for "Party Loot: Authenticated" to confirm connection

## Usage

### Accessing Party Loot

Once configured, you'll see a **gold coins icon** (💰) in your scene controls toolbar on the left side of the screen. Click this to open the Party Loot interface.

![image](https://github.com/user-attachments/assets/54439b0c-ec3c-470a-9d9b-a152a1ed57e0)


### Managing Party Funds

**Adding Funds:**

1. Enter amounts in any currency fields (platinum, gold, silver, copper)
2. Add a description (e.g., "Sold magic sword", "Quest reward")
3. Click **Add Funds**

**Removing Funds:**

1. Enter amounts to subtract
2. Add a description (e.g., "Bought supplies", "Paid for lodging")
3. Click **Remove Funds**

**Viewing Transaction History:**

- Click **View History** to see all past transactions
- Each entry shows date, description, amount, and transaction type

### Managing Party Items

**Adding Items:**

1. Fill in the required fields:

- **Item Name**: The name of the item
- **Owner**: Which character owns it
- **Source**: Where it came from
- **Quantity**: How many (defaults to 1)

2. **Optional Advanced Properties** (click "Show Advanced Options"):

- **Item Type**: Weapon, Armor, Magic Item, etc.
- **Rarity**: Common, Uncommon, Rare, Very Rare, Legendary, Artifact
- **Value**: Monetary worth and currency type
- **Tags**: Comma-separated keywords
- **Description**: Detailed item description

3. Click **Add Item**

**Managing Existing Items:**

- **Edit**: Click the pencil icon to modify item details
- **Sell**: Click the coins icon to sell an item and add funds automatically
- **Delete**: Click the trash icon to remove an item
- **View Details**: Click the arrow to expand item information

### Search and Filter

- Use the **search box** to find items by name, owner, source, or description
- Use the **owner filter** dropdown to show items for specific characters
- Navigate through multiple pages using the pagination controls

## Troubleshooting

### Common Issues

**"You must be logged in" Error:**

- Check that your API Token is correct in Module Settings
- Verify your Campaign ID is accurate
- Check browser console for authentication errors

**Button Not Appearing:**

- Ensure you're logged in as a GM (only GMs can access Party Loot)
- Try refreshing the page
- Check that the module is enabled in Module Settings

**Connection Errors:**

- Verify your internet connection
- Check that partylootapp.com is accessible
- Ensure your API token hasn't expired

**Items/Funds Not Syncing:**

- Check your Campaign ID is correct
- Verify you have permission to modify the campaign
- Try refreshing the Party Loot interface

### Getting Help

1. **Check the Console**: Press F12 and look for error messages in the Console tab
2. **GitHub Issues**: Report bugs at [github.com/jonathanbartholomew/party-loot-vtt/issues](https://github.com/jonathanbartholomew/party-loot-vtt/issues)
3. **Party Loot Support**: Contact support through [partylootapp.com](https://www.partylootapp.com)

## Discord Bot Integration

Party Loot also offers a Discord bot for managing your party's resources directly from Discord. Check the [Party Loot website](https://www.partylootapp.com) for setup instructions.

## Version History

- **v3.0.1**: Current release with improved UI and bug fixes
- **v3.0.0**: Major update with enhanced item management
- **v2.x**: Legacy versions with basic functionality
