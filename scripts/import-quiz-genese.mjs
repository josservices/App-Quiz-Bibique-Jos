import fs from 'node:fs';
import path from 'node:path';

const inputPath = path.resolve('Quiz/Quiz Genese');
const normalOutPath = path.resolve('src/data/questions/genese-normal.json');
const difficultOutPath = path.resolve('src/data/questions/genese-difficile.json');

const raw = fs.readFileSync(inputPath, 'utf8');
const lines = raw.split(/\r?\n/).map((line) => line.trim());

function parseChapter(ref) {
  const m = ref.match(/Gen[eè]se\s+(\d+):/i);
  return m ? Number(m[1]) : 0;
}

function makeQuestion(entry, mode) {
  const correctIndex = entry.correctLetter.charCodeAt(0) - 65;
  return {
    id: `GEN-${mode}-${String(entry.order).padStart(3, '0')}`,
    book: 'Genèse',
    chapter: parseChapter(entry.verseRef),
    verseRef: entry.verseRef,
    verseText: `Voir ${entry.verseRef}.`,
    question: entry.question,
    choices: entry.choices,
    correctIndex,
    explanation: `Référence : ${entry.verseRef} (LSG 1910).`
  };
}

function parseSection(lines, modePrefix) {
  const entries = [];
  let i = 0;

  while (i < lines.length) {
    const qRe = new RegExp(`^${modePrefix}(\\d{2,3})\\.\\s+(.+)$`);
    const qMatch = lines[i].match(qRe);
    if (!qMatch) {
      i += 1;
      continue;
    }

    const order = Number(qMatch[1]);
    const question = qMatch[2].trim();
    i += 1;

    const choices = [];
    while (i < lines.length) {
      const line = lines[i];
      if (!line) {
        i += 1;
        continue;
      }

      const cMatch = line.match(/^([A-C])\)\s+(.+)$/);
      if (cMatch) {
        choices.push(cMatch[2].trim());
        i += 1;
        continue;
      }

      break;
    }

    const answerLine = lines[i] ?? '';
    const aMatch = answerLine.match(/^✅\s+Bonne réponse\s*:\s*([A-C])\s*[—-]\s*Réf\.\s*:\s*(.+)$/i);
    if (!aMatch) {
      throw new Error(`Réponse non trouvée pour ${modePrefix}${String(order).padStart(2, '0')} autour de la ligne ${i + 1}`);
    }

    const correctLetter = aMatch[1].toUpperCase();
    const verseRef = aMatch[2].trim();

    entries.push({ order, question, choices, correctLetter, verseRef });
    i += 1;
  }

  return entries.sort((a, b) => a.order - b.order);
}

const normalStart = lines.findIndex((line) => /^N01\./.test(line));
const difficultStart = lines.findIndex((line) => /^D01\./.test(line));

if (normalStart === -1 || difficultStart === -1) {
  throw new Error('Sections N01 ou D01 introuvables dans Quiz/Quiz Genese.');
}

const normalLines = lines.slice(normalStart, difficultStart);
const difficultLines = lines.slice(difficultStart);

const normalEntries = parseSection(normalLines, 'N');
const difficultEntries = parseSection(difficultLines, 'D');

if (normalEntries.length !== 160) {
  throw new Error(`Normal: 160 attendues, trouvé ${normalEntries.length}`);
}
if (difficultEntries.length !== 160) {
  throw new Error(`Difficile: 160 attendues, trouvé ${difficultEntries.length}`);
}

for (const e of normalEntries) {
  if (e.choices.length !== 3) {
    throw new Error(`Normal ${e.order}: 3 choix attendus, trouvé ${e.choices.length}`);
  }
}
for (const e of difficultEntries) {
  if (e.choices.length !== 2) {
    throw new Error(`Difficile ${e.order}: 2 choix attendus, trouvé ${e.choices.length}`);
  }
}

const normalQuestions = normalEntries.map((e) => makeQuestion(e, 'N'));
const difficultQuestions = difficultEntries.map((e) => makeQuestion(e, 'D'));

fs.writeFileSync(normalOutPath, JSON.stringify(normalQuestions, null, 2) + '\n', 'utf8');
fs.writeFileSync(difficultOutPath, JSON.stringify(difficultQuestions, null, 2) + '\n', 'utf8');

console.log(`Normal importé: ${normalQuestions.length}`);
console.log(`Difficile importé: ${difficultQuestions.length}`);
