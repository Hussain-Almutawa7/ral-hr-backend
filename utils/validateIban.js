const isValidIban = (iban) => {
  if (!/^BH\d{2}[A-Z]{4}[A-Z0-9]{14}$/.test(iban)) {
    return false;
  }
  const rearranged = iban.slice(4) + iban.slice(0, 4);

  const numericIban = rearranged
    .split("")
    .map((char) => {
      if (/[A-Z]/.test(char)) {
        return char.charCodeAt(0) - 55;
      }

      return char;
    })
    .join("");

  let remainder = 0;

  for (const digit of numericIban) {
    remainder = (remainder * 10 + Number(digit)) % 97;
  }

  return remainder === 1;
};

module.exports = isValidIban;