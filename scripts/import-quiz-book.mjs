import fs from 'node:fs';
import path from 'node:path';

function argValue(flag) {
  const idx = process.argv.indexOf(flag);
  return idx >= 0 ? process.argv[idx + 1] : null;
}

const input = argValue('--input');
const bookName = argValue('--book-name');
const bookCode = argValue('--book-code');
const normalOut = argValue('--normal-out');
const difficultOut = argValue('--difficile-out');

if (!input || !bookName || !bookCode || !normalOut || !difficultOut) {
  throw new Error(
    'Usage: node scripts/import-quiz-book.mjs --input <file> --book-name <name> --book-code <code> --normal-out <json> --difficile-out <json>'
  );
}

const inputPath = path.resolve(input);
const normalPath = path.resolve(normalOut);
const difficultPath = path.resolve(difficultOut);
const text = fs.readFileSync(inputPath, 'utf8');
const lines = text.split(/\r?\n/).map((line) => line.trim());

function normalizeVerseRef(rawRef) {
  const raw = (rawRef ?? '').replace(/\s+/g, ' ').trim();

  if (!raw) {
    return raw;
  }

  const normalizedBook = bookName;

  if (bookName === '2 Samuel') {
    const compact = raw
      .replace(/Deuxi[eè]me\s+livre\s+de\s+Samuel/gi, '2 Samuel')
      .replace(/Second\s+livre\s+de\s+Samuel/gi, '2 Samuel')
      .replace(/\bII\s*Samuel\b/gi, '2 Samuel')
      .replace(/\b2\s*S\b/gi, '2 Samuel')
      .replace(/\b2\s*Sam(?:uel)?\b/gi, '2 Samuel');

    const prose = compact.match(
      /2 Samuel[, ]*chapitre\s*(\d+)\s*,?\s*verset(?:s)?\s*([0-9]+(?:\s*[–-]\s*[0-9]+)?)/i
    );
    if (prose) {
      const verses = prose[2].replace(/\s*[–-]\s*/g, '-');
      return `2 Samuel ${prose[1]}:${verses}`;
    }

    const short = compact.match(/2 Samuel\s+(\d+)\s*:\s*([0-9]+(?:\s*[–-]\s*[0-9]+)?)/i);
    if (short) {
      const verses = short[2].replace(/\s*[–-]\s*/g, '-');
      return `2 Samuel ${short[1]}:${verses}`;
    }
  }

  const escapedName = normalizedBook.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const proseGeneric = raw.match(
    new RegExp(
      `${escapedName}[, ]*chapitre\\s*(\\d+)\\s*,?\\s*verset(?:s)?\\s*([0-9]+(?:\\s*[–-]\\s*[0-9]+)?)`,
      'i'
    )
  );
  if (proseGeneric) {
    const verses = proseGeneric[2].replace(/\s*[–-]\s*/g, '-');
    return `${normalizedBook} ${proseGeneric[1]}:${verses}`;
  }

  const shortGeneric = raw.match(
    new RegExp(`${escapedName}\\s+(\\d+)\\s*[:v]\\s*([0-9]+(?:\\s*[–-]\\s*[0-9]+)?)`, 'i')
  );
  if (shortGeneric) {
    const verses = shortGeneric[2].replace(/\s*[–-]\s*/g, '-');
    return `${normalizedBook} ${shortGeneric[1]}:${verses}`;
  }

  return raw;
}

function parseChapter(ref) {
  const escapedName = bookName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = ref.match(new RegExp(`${escapedName}\\s+(\\d+):`, 'i'));
  return match ? Number(match[1]) : 0;
}

function parseAnswerLine(line) {
  const withLabel = line.match(
    /^(?:✅\s*)?Bonne\s+réponse\s*:\s*([A-C])\)?\s*(.*?)\s*[—-]\s*(?:R[ée]f\s*:\s*)?(.+)$/i
  );
  if (withLabel) {
    return {
      correctLetter: withLabel[1].toUpperCase(),
      answerText: withLabel[2].trim(),
      verseRef: normalizeVerseRef(withLabel[3].trim())
    };
  }

  const short = line.match(/^(?:✅\s*)?([A-C])\)?\s*(.*?)\s*[—-]\s*(?:R[ée]f\s*:\s*)?(.+)$/i);
  if (short) {
    return {
      correctLetter: short[1].toUpperCase(),
      answerText: short[2].trim(),
      verseRef: normalizeVerseRef(short[3].trim())
    };
  }

  return null;
}

function parseQuestions(prefix) {
  const entries = [];
  let i = 0;

  while (i < lines.length) {
    const qMatch = lines[i].match(new RegExp(`^${prefix}0*([0-9]{1,3})\\.?\\s*(.*)$`));
    if (!qMatch) {
      i += 1;
      continue;
    }

    const order = Number(qMatch[1]);
    let question = qMatch[2].trim();
    i += 1;

    if (!question) {
      while (i < lines.length && !lines[i]) {
        i += 1;
      }
      question = (lines[i] ?? '').trim();
      i += 1;
    }

    const choices = [];
    while (i < lines.length) {
      const cMatch = lines[i].match(/^([A-C])\)\s+(.+)$/);
      if (!cMatch) {
        break;
      }
      choices.push(cMatch[2].trim());
      i += 1;
    }

    while (i < lines.length && !lines[i]) {
      i += 1;
    }

    const answer = parseAnswerLine(lines[i] ?? '');
    if (!answer) {
      throw new Error(`Ligne de réponse invalide pour ${prefix}${order} à la ligne ${i + 1}`);
    }

    entries.push({ order, question, choices, ...answer });
    i += 1;
  }

  return entries.sort((a, b) => a.order - b.order);
}

function toQuestion(entry, level) {
  const correctIndex = entry.correctLetter.charCodeAt(0) - 65;
  return {
    id: `${bookCode}-${level}-${String(entry.order).padStart(3, '0')}`,
    book: bookName,
    chapter: parseChapter(entry.verseRef),
    verseRef: entry.verseRef,
    verseText: `Voir ${entry.verseRef}.`,
    question: entry.question,
    choices: entry.choices,
    correctIndex,
    explanation: `Référence : ${entry.verseRef} (LSG 1910).`
  };
}

const normalEntries = parseQuestions('N');
const difficultEntries = parseQuestions('D');

if (normalEntries.length === 0 || difficultEntries.length === 0) {
  throw new Error('Sections normales ou difficiles introuvables.');
}

for (const entry of normalEntries) {
  if (entry.choices.length !== 3) {
    throw new Error(`Question normale N${entry.order}: 3 choix attendus, trouvé ${entry.choices.length}`);
  }
}

for (const entry of difficultEntries) {
  if (entry.choices.length !== 2) {
    throw new Error(`Question difficile D${entry.order}: 2 choix attendus, trouvé ${entry.choices.length}`);
  }
}

const normalQuestions = normalEntries.map((entry) => toQuestion(entry, 'N'));
const difficultQuestions = difficultEntries.map((entry) => toQuestion(entry, 'D'));

fs.writeFileSync(normalPath, JSON.stringify(normalQuestions, null, 2) + '\n', 'utf8');
fs.writeFileSync(difficultPath, JSON.stringify(difficultQuestions, null, 2) + '\n', 'utf8');

console.log(`Import terminé pour ${bookName}`);
console.log(`Normal: ${normalQuestions.length}`);
console.log(`Difficile: ${difficultQuestions.length}`);
