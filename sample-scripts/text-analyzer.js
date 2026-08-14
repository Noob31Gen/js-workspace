/**
 * @name Text & Keyword Analyzer
 * @description Computes word statistics, character counts, and keyword frequencies.
 * 
 * @param {text} sampleText Input Text to Analyze - default: "JavaScript is a versatile language for browser execution and workspace automation."
 * @param {number} topWords Number of Top Words to Output - default: 5
 * @param {boolean} ignoreCase Case Insensitive Matching - default: true
 */
export async function run({ sampleText, topWords, ignoreCase }) {
  console.log("Analyzing text input...");

  const textToProcess = ignoreCase ? sampleText.toLowerCase() : sampleText;
  const words = textToProcess.match(/\b\w+\b/g) || [];
  const charCount = sampleText.length;

  const wordCounts = {};
  words.forEach(w => {
    wordCounts[w] = (wordCounts[w] || 0) + 1;
  });

  const sortedWords = Object.entries(wordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topWords);

  console.log(`Statistics: Total Characters: ${charCount} | Total Words: ${words.length}`);
  console.log(`Top ${topWords} Most Frequent Words:`);
  console.table(sortedWords.map(([word, freq]) => ({ Word: word, Frequency: freq })));

  return { charCount, wordCount: words.length, topWords: sortedWords };
}
