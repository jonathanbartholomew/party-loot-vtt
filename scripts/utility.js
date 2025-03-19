/**
 * Helper functions for Party Loot Module
 */

// Format currency amounts
export function formatCurrency(amount, type) {
  if (!amount) return "0";
  return `${amount}`;
}

// Generate a readable currency breakdown
export function generateCurrencyBreakdown(funds) {
  let parts = [];

  if (funds.platinum > 0) parts.push(`${funds.platinum}P`);
  if (funds.gold > 0) parts.push(`${funds.gold}G`);
  if (funds.silver > 0) parts.push(`${funds.silver}S`);
  if (funds.copper > 0) parts.push(`${funds.copper}C`);

  return parts.length > 0 ? parts.join(" ") : "0";
}

// Convert the entire amount to the lowest denomination
export function currencyToCopper(funds) {
  return (
    (funds.platinum || 0) * 1000 +
    (funds.gold || 0) * 100 +
    (funds.silver || 0) * 10 +
    (funds.copper || 0)
  );
}

// Handle currency conversion for negative values
export function handleCurrencyConversion(
  currentFunds,
  platToSubtract,
  goldToSubtract,
  silverToSubtract,
  copperToSubtract
) {
  // Create a copy of the funds
  let updatedFunds = {
    platinum: currentFunds.platinum,
    gold: currentFunds.gold,
    silver: currentFunds.silver,
    copper: currentFunds.copper,
  };

  // Check if total funds are sufficient before attempting conversion
  const totalCopperAvailable =
    updatedFunds.platinum * 1000 +
    updatedFunds.gold * 100 +
    updatedFunds.silver * 10 +
    updatedFunds.copper;

  const totalCopperToSubtract =
    platToSubtract * 1000 +
    goldToSubtract * 100 +
    silverToSubtract * 10 +
    copperToSubtract;

  if (totalCopperAvailable < totalCopperToSubtract) {
    return {
      success: false,
      message: "Not enough funds available for this transaction.",
    };
  }

  // Convert everything to copper for subtraction
  let remainingCopper = totalCopperAvailable - totalCopperToSubtract;

  // Convert back to coins, starting with the highest denomination
  updatedFunds.platinum = Math.floor(remainingCopper / 1000);
  remainingCopper %= 1000;

  updatedFunds.gold = Math.floor(remainingCopper / 100);
  remainingCopper %= 100;

  updatedFunds.silver = Math.floor(remainingCopper / 10);
  remainingCopper %= 10;

  updatedFunds.copper = remainingCopper;

  return {
    success: true,
    updatedFunds,
  };
}
