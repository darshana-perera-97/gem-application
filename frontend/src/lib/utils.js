import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount, currency = 'LKR') {
  if (amount >= 1000000) {
    const millions = amount / 1000000;
    const symbol = currency === 'LKR' ? 'Rs.' : currency;
    return `${symbol} ${millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1)}M`;
  }
  
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
