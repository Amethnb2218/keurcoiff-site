export function moneyXof(amount){
  try { return new Intl.NumberFormat("fr-FR").format(amount) + " FCFA"; }
  catch { return `${amount} FCFA`; }
}
export function dtHuman(iso){
  try { return new Intl.DateTimeFormat("fr-FR",{dateStyle:"medium",timeStyle:"short"}).format(new Date(iso)); }
  catch { return iso; }
}
