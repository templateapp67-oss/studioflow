export const formatNexoraMoney = (amount: number) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(amount);
