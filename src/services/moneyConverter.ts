export function brlToCents(brlString: string): number {
  // Remove o "R$", espaços e pontos (separadores de milhar)
  const cleanString = brlString
    .replace("R$", "")
    .trim()
    .replace(/\./g, "") // Remove pontos (1.000 → 1000)
    .replace(",", "."); // Troca vírgula por ponto (53.549,47 → 53549.47)

  // Converte para número e depois para centavos
  const valueInReais = parseFloat(cleanString);

  if (isNaN(valueInReais)) {
    throw new Error(`Valor inválido: ${brlString}`);
  }

  return Math.round(valueInReais * 100);
}

export const formatCentsToBRL = (cents: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
};
