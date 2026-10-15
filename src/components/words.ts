// Counts in headings read better as words ("Eleven projects"), and deriving
// them from the data keeps the copy right when projects are added.
const WORDS = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty',
]

export function numberWord(n: number, capitalize = false) {
  const word = WORDS[n] ?? String(n)
  return capitalize ? word.charAt(0).toUpperCase() + word.slice(1) : word
}
