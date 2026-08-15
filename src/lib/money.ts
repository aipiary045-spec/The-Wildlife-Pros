export function lineTotals(
  items: Array<{ quantity: number; unitPrice: number; taxable?: boolean }>,
  taxRate = 0.07,
) {
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const taxable = items
    .filter((item) => item.taxable !== false)
    .reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const taxAmount = Number((taxable * taxRate).toFixed(2));
  const total = Number((subtotal + taxAmount).toFixed(2));
  return {
    subtotal: Number(subtotal.toFixed(2)),
    taxAmount,
    total,
  };
}
