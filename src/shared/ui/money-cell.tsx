/**
 * Celda monetaria: símbolo de moneda + importe en monoespaciada con numerales
 * tabulares, para que las columnas de importes aliñen y se lean como un balance.
 * Un valor ausente se muestra como guión, no como "0" engañoso.
 */
export function MoneyCell({
  amount,
  currency = "PEN",
}: {
  amount: string | number | null | undefined
  currency?: string
}) {
  if (amount === null || amount === undefined || amount === "") {
    return <span className="text-muted-foreground">—</span>
  }
  const simbolo = currency === "USD" ? "US$" : "S/"
  return (
    <span className="font-mono tabular-nums">
      {simbolo} {amount}
    </span>
  )
}
