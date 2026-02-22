import fs from 'node:fs';
import path from 'node:path';

const booksPath = path.resolve('src/data/books.json');
const questionsDir = path.resolve('src/data/questions');
const generalitesDir = path.join(questionsDir, 'generalites');
const books = JSON.parse(fs.readFileSync(booksPath, 'utf8'));
const difficulties = ['normal', 'difficile'];

const FALLBACK_CHOICE = 'Aucune de ces réponses';

function getDatasetPath(book, difficulty) {
  const baseFile = String(book.questionsFile ?? '').trim();
  if (baseFile.endsWith('-normal.json')) {
    return path.join(questionsDir, baseFile.replace('-normal.json', `-${difficulty}.json`));
  }
  if (baseFile.endsWith('-difficile.json')) {
    return path.join(questionsDir, baseFile.replace('-difficile.json', `-${difficulty}.json`));
  }
  return path.join(questionsDir, `${book.id}-${difficulty}.json`);
}

function normalizeChoicesAndIndex(rawChoices, rawCorrectIndex) {
  if (!Array.isArray(rawChoices)) {
    return null;
  }

  const choices = rawChoices
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter((value) => value.length > 0);

  let correctIndex =
    typeof rawCorrectIndex === 'number' && Number.isInteger(rawCorrectIndex)
      ? rawCorrectIndex
      : Number.parseInt(String(rawCorrectIndex), 10);

  if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= choices.length) {
    return null;
  }

  if (choices.length === 2) {
    const fallback = choices.includes(FALLBACK_CHOICE) ? 'Réponse alternative' : FALLBACK_CHOICE;
    choices.push(fallback);
  } else if (choices.length > 3) {
    const correctChoice = choices[correctIndex];
    const reduced = [correctChoice, ...choices.filter((_, index) => index !== correctIndex).slice(0, 2)];
    return {
      choices: reduced,
      correctIndex: 0
    };
  }

  if (choices.length !== 3) {
    return null;
  }

  return { choices, correctIndex };
}

function normalizeQuestion(raw) {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  if (typeof raw.question !== 'string' || !raw.question.trim()) {
    return null;
  }

  if (typeof raw.verseRef !== 'string' || !raw.verseRef.trim()) {
    return null;
  }

  const normalized = normalizeChoicesAndIndex(raw.choices, raw.correctIndex);
  if (!normalized) {
    return null;
  }

  return {
    question: raw.question.trim(),
    verseRef: raw.verseRef.trim(),
    choices: normalized.choices,
    correctIndex: normalized.correctIndex
  };
}

function validateDataset(dataset) {
  if (!Array.isArray(dataset)) {
    return { ok: false, reason: 'Le JSON doit être un tableau', validCount: 0 };
  }

  if (dataset.length === 0) {
    return { ok: false, reason: 'Tableau vide', validCount: 0 };
  }

  let validCount = 0;
  let invalidCount = 0;
  for (const item of dataset) {
    if (normalizeQuestion(item)) {
      validCount += 1;
    } else {
      invalidCount += 1;
    }
  }

  if (validCount === 0) {
    return { ok: false, reason: 'Aucune question valide après normalisation', validCount };
  }

  if (invalidCount > 0) {
    return { ok: false, reason: `${invalidCount} question(s) invalide(s)`, validCount };
  }

  return { ok: true, reason: 'OK', validCount };
}

function getGeneralitesChunkFiles(difficulty) {
  const dir = path.join(generalitesDir, difficulty);
  if (!fs.existsSync(dir)) {
    return [];
  }
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith('.json'))
    .sort((a, b) => a.localeCompare(b, 'fr'))
    .map((file) => path.join(dir, file));
}

const lines = [];
let hasFailure = false;

for (const book of books) {
  for (const difficulty of difficulties) {
    const filePath = getDatasetPath(book, difficulty);
    const label = `${book.name} (${difficulty})`;

    if (book.id === 'generalitebible') {
      const chunkFiles = getGeneralitesChunkFiles(difficulty);
      if (chunkFiles.length === 0) {
        hasFailure = true;
        lines.push(`FAIL | ${label} | Aucun chunk trouvé dans ${path.relative(process.cwd(), path.join(generalitesDir, difficulty))}`);
        continue;
      }

      let totalValid = 0;
      let chunkFailure = false;

      for (const chunkFile of chunkFiles) {
        try {
          const chunkData = JSON.parse(fs.readFileSync(chunkFile, 'utf8'));
          const chunkResult = validateDataset(chunkData);
          if (!chunkResult.ok) {
            hasFailure = true;
            chunkFailure = true;
            lines.push(`FAIL | ${label} | ${path.basename(chunkFile)}: ${chunkResult.reason}`);
          } else {
            totalValid += chunkResult.validCount;
          }
        } catch (error) {
          hasFailure = true;
          chunkFailure = true;
          const message = error instanceof Error ? error.message : String(error);
          lines.push(`FAIL | ${label} | ${path.basename(chunkFile)}: JSON parse/lecture: ${message}`);
        }
      }

      if (!chunkFailure) {
        lines.push(`OK   | ${label} | ${totalValid} question(s) valides (${chunkFiles.length} chunks)`);
      }
      continue;
    }

    if (!fs.existsSync(filePath)) {
      hasFailure = true;
      lines.push(`FAIL | ${label} | Fichier manquant: ${path.relative(process.cwd(), filePath)}`);
      continue;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const dataset = JSON.parse(content);
      const result = validateDataset(dataset);
      if (!result.ok) {
        hasFailure = true;
        lines.push(`FAIL | ${label} | ${result.reason}`);
      } else {
        lines.push(`OK   | ${label} | ${result.validCount} question(s) valides`);
      }
    } catch (error) {
      hasFailure = true;
      const message = error instanceof Error ? error.message : String(error);
      lines.push(`FAIL | ${label} | JSON parse/lecture: ${message}`);
    }
  }
}

console.log('Rapport verify:questions');
console.log('='.repeat(80));
for (const line of lines) {
  console.log(line);
}
console.log('='.repeat(80));
console.log(hasFailure ? 'Résultat global: FAIL' : 'Résultat global: OK');

if (hasFailure) {
  process.exitCode = 1;
}
