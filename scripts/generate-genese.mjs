import fs from 'node:fs';
import path from 'node:path';

const sourcePath = '/tmp/fraLSG_vpl/fraLSG_vpl.txt';
const outputPath = path.resolve('src/data/questions/genese.json');

if (!fs.existsSync(sourcePath)) {
  throw new Error(`Source introuvable: ${sourcePath}`);
}

const peoplePool = [
  'Dieu',
  'Adam',
  'Ève',
  'Caïn',
  'Abel',
  'Noé',
  'Sem',
  'Cham',
  'Japhet',
  'Abram',
  'Abraham',
  'Saraï',
  'Sara',
  'Lot',
  'Isaac',
  'Ismaël',
  'Ésaü',
  'Jacob',
  'Israël',
  'Laban',
  'Rachel',
  'Léa',
  'Joseph',
  'Benjamin',
  'Juda',
  'Pharaon',
  'Éphraïm',
  'Manassé'
];

const placePool = [
  'Éden',
  'Canaan',
  'Égypte',
  'Béthel',
  'Hébron',
  'Sodome',
  'Gomorrhe',
  'Charan',
  'Sichem',
  'Beer Schéba',
  'Moriah',
  'Mamré'
];

const numberPool = [
  'un',
  'deux',
  'trois',
  'sept',
  'douze',
  'quatorze',
  'vingt',
  'trente',
  'quarante',
  'cinquante',
  'soixante-dix',
  'cent',
  'cent dix'
];

const conceptPool = [
  'alliance',
  'autel',
  'arche',
  'serpent',
  'jardin',
  'terre',
  'cieux',
  'lumière',
  'ténèbres',
  'troupeau',
  'famine',
  'bénédiction',
  'descendance',
  'circoncision',
  'rêve',
  'blé',
  'puits',
  'frères',
  'étoiles',
  'sable',
  'échelle',
  'manteau',
  'citerne',
  'gerbes',
  'offrande',
  'sacrifice'
];

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function containsWholeWord(text, token) {
  const re = new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegExp(token)}([^\\p{L}\\p{N}]|$)`, 'iu');
  return re.test(text);
}

function exactInVerse(verseText, candidate) {
  return verseText.match(new RegExp(escapeRegExp(candidate), 'iu'))?.[0] ?? null;
}

function pickFromPool(verseText, pool) {
  for (const item of pool) {
    const exact = exactInVerse(verseText, item);
    if (exact) {
      return exact;
    }
  }
  return null;
}

function chooseBestCategory(verseText) {
  const number = pickFromPool(verseText, numberPool);
  if (number) {
    return { type: 'nombre', answer: number, pool: numberPool };
  }

  const place = pickFromPool(verseText, placePool);
  if (place) {
    return { type: 'lieu', answer: place, pool: placePool };
  }

  const concept = pickFromPool(verseText, conceptPool);
  if (concept) {
    return { type: 'concept', answer: concept, pool: conceptPool };
  }

  const peopleWithoutDieu = peoplePool.filter((x) => x !== 'Dieu');
  const person = pickFromPool(verseText, peopleWithoutDieu) ?? pickFromPool(verseText, peoplePool);
  if (person) {
    return { type: 'personne', answer: person, pool: peoplePool };
  }

  const fallback = verseText.match(/[\p{L}][\p{L}'’\-]{3,}/u)?.[0] ?? 'terre';
  return { type: 'concept', answer: fallback, pool: conceptPool };
}

function pickDistractors(verseText, answer, pool) {
  const out = [];

  for (const value of pool) {
    if (value.toLowerCase() === answer.toLowerCase()) {
      continue;
    }
    if (containsWholeWord(verseText, value)) {
      continue;
    }
    out.push(value);
    if (out.length === 2) {
      break;
    }
  }

  while (out.length < 2) {
    out.push(`Option ${out.length + 1}`);
  }

  return out;
}

function rotateChoices(answer, distractors, seed) {
  const choices = [answer, distractors[0], distractors[1]];
  const rotate = seed % 3;

  if (rotate === 1) {
    return { choices: [choices[1], choices[2], choices[0]], correctIndex: 2 };
  }
  if (rotate === 2) {
    return { choices: [choices[2], choices[0], choices[1]], correctIndex: 1 };
  }
  return { choices, correctIndex: 0 };
}

function buildQuestionText(type, verseRef, answer) {
  if (type === 'nombre') {
    return `Selon ${verseRef}, quelle valeur numérique est bibliquement exacte ? Indice: le mot recherché est un nombre écrit en toutes lettres.`;
  }
  if (type === 'lieu') {
    return `Selon ${verseRef}, quel lieu est mentionné explicitement ? Indice: il s’agit d’un repère géographique du récit.`;
  }
  if (type === 'personne') {
    const first = answer[0] ?? '?';
    return `Selon ${verseRef}, quel personnage est cité dans le verset ? Indice: le nom commence par « ${first} ».`;
  }
  return `Selon ${verseRef}, quel élément du récit est explicitement présent ? Indice: c’est un mot-clé biblique du verset.`;
}

function buildQuestion(verse, index) {
  const verseRef = `Genèse ${verse.chapter}:${verse.verse}`;
  const category = chooseBestCategory(verse.verseText);
  const distractors = pickDistractors(verse.verseText, category.answer, category.pool);
  const { choices, correctIndex } = rotateChoices(category.answer, distractors, index + 1);

  return {
    id: `GEN-${String(index + 1).padStart(3, '0')}`,
    book: 'Genèse',
    chapter: verse.chapter,
    verseRef,
    verseText: verse.verseText,
    question: buildQuestionText(category.type, verseRef, category.answer),
    choices,
    correctIndex,
    explanation: `Référence : ${verseRef} (LSG 1910) - ${verse.verseText}`
  };
}

const content = fs.readFileSync(sourcePath, 'utf8');
const lines = content.split(/\r?\n/);

const geneseVerses = lines
  .filter((line) => line.startsWith('GEN '))
  .map((line) => {
    const match = line.match(/^GEN (\d+):(\d+) (.+)$/);
    if (!match) {
      return null;
    }

    return {
      chapter: Number(match[1]),
      verse: Number(match[2]),
      verseText: match[3].trim()
    };
  })
  .filter(Boolean);

const byChapter = new Map();
for (const verse of geneseVerses) {
  if (!byChapter.has(verse.chapter)) {
    byChapter.set(verse.chapter, []);
  }
  byChapter.get(verse.chapter).push(verse);
}

const selected = [];
for (let chapter = 1; chapter <= 50; chapter += 1) {
  const verses = byChapter.get(chapter) ?? [];
  if (verses.length < 3) {
    throw new Error(`Chapitre ${chapter} ne contient pas assez de versets.`);
  }

  const first = verses[0];
  const hard1 = verses[Math.floor(verses.length * 0.45)];
  const hard2 = verses[Math.floor(verses.length * 0.8)];
  selected.push(first, hard1, hard2);
}

if (selected.length !== 150) {
  throw new Error(`Nombre de questions attendu: 150, obtenu: ${selected.length}`);
}

const questions = selected.map((verse, idx) => buildQuestion(verse, idx));

for (const question of questions) {
  if (!containsWholeWord(question.verseText, question.choices[question.correctIndex])) {
    throw new Error(`Réponse correcte absente du verset: ${question.id}`);
  }

  if (question.choices.length !== 3) {
    throw new Error(`Nombre de choix invalide: ${question.id}`);
  }

  const unique = new Set(question.choices.map((x) => x.toLowerCase()));
  if (unique.size !== 3) {
    throw new Error(`Choix non uniques: ${question.id}`);
  }

  for (let i = 0; i < question.choices.length; i += 1) {
    if (i === question.correctIndex) {
      continue;
    }
    if (containsWholeWord(question.verseText, question.choices[i])) {
      throw new Error(`Distracteur présent dans le verset: ${question.id}`);
    }
  }

  if (!question.question.includes('Indice:')) {
    throw new Error(`Indice manquant dans la question: ${question.id}`);
  }
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(questions, null, 2), 'utf8');

console.log(`Fichier généré: ${outputPath}`);
console.log(`Questions générées: ${questions.length}`);
