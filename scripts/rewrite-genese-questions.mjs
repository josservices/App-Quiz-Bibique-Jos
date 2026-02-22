import fs from 'node:fs';
import path from 'node:path';

const filePath = path.resolve('src/data/questions/genese.json');
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

const people = [
  'Dieu',
  'Adam',
  'Eve',
  'Ève',
  'Cain',
  'Caïn',
  'Abel',
  'Noe',
  'Noé',
  'Sem',
  'Cham',
  'Japhet',
  'Abram',
  'Abraham',
  'Sara',
  'Sarai',
  'Saraï',
  'Lot',
  'Isaac',
  'Ismael',
  'Ismaël',
  'Jacob',
  'Esau',
  'Ésaü',
  'Joseph',
  'Benjamin',
  'Juda',
  'Pharaon'
];

const places = [
  'Eden',
  'Éden',
  'Canaan',
  'Egypte',
  'Égypte',
  'Sodome',
  'Gomorrhe',
  'Béthel',
  'Hebron',
  'Hébron',
  'Charan',
  'Sichem',
  'Beer Schéba',
  'Moriah',
  'Mamré'
];

const qQui = [
  'Qui est explicitement mentionné dans {ref} ?',
  'Dans {ref}, qui intervient directement dans la scène ?',
  'Selon {ref}, qui agit au cœur du récit ?',
  'À la lecture de {ref}, qui parle ou accomplit l’action décrite ?'
];

const qOu = [
  'Où se déroule la scène rapportée en {ref} ?',
  'Dans {ref}, dans quel lieu biblique l’événement est-il situé ?',
  'Selon {ref}, où l’action est-elle localisée ?',
  'D’après {ref}, quel lieu est nommé dans le récit ?'
];

const qComment = [
  'Comment {ref} décrit-il le déroulement de la scène ?',
  'Dans {ref}, comment le texte biblique formule-t-il cet événement ?',
  'Selon {ref}, comment la situation est-elle présentée ?',
  'D’après {ref}, comment l’action est-elle racontée ?'
];

const qPourquoi = [
  'Pourquoi l’action mentionnée en {ref} a-t-elle lieu selon le verset ?',
  'Dans {ref}, pourquoi ce fait est-il évoqué dans le récit ?',
  'Selon {ref}, pour quelle raison immédiate cet événement apparaît-il ?',
  'D’après {ref}, pourquoi cette parole ou cette action est-elle rapportée ?'
];

const qQue = [
  'Que déclare précisément {ref} ?',
  'Dans {ref}, quelle affirmation biblique est donnée textuellement ?',
  'Selon {ref}, quel énoncé correspond au verset ?',
  'D’après {ref}, quelle phrase reflète fidèlement le texte ?'
];

function normalize(s) {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function wordsCount(s) {
  return s.split(/\s+/).filter(Boolean).length;
}

function splitClauses(verseText) {
  const parts = verseText
    .split(/[.;:!?]/)
    .map((x) => x.trim())
    .filter((x) => x.length >= 8);

  if (parts.length === 0) {
    return [verseText.trim()];
  }

  return parts;
}

function extractPeople(verseText) {
  const n = normalize(verseText);
  const found = [];
  for (const p of people) {
    const pn = normalize(p);
    if (new RegExp(`(^|[^a-z])${pn}([^a-z]|$)`, 'i').test(n)) {
      found.push(p);
    }
  }
  return [...new Set(found)];
}

function extractPlaces(verseText) {
  const n = normalize(verseText);
  const found = [];
  for (const p of places) {
    const pn = normalize(p);
    if (new RegExp(`(^|[^a-z])${pn}([^a-z]|$)`, 'i').test(n)) {
      found.push(p);
    }
  }
  return [...new Set(found)];
}

function pickPhrase(verseText, seed) {
  const clauses = splitClauses(verseText);
  const ranked = clauses
    .map((text) => ({ text, words: wordsCount(text) }))
    .sort((a, b) => {
      const aScore = Math.abs(8 - a.words);
      const bScore = Math.abs(8 - b.words);
      return aScore - bScore;
    });

  const choice = ranked[seed % Math.min(2, ranked.length)] ?? ranked[0];
  return choice.text;
}

function chooseQuestion(mode, ref, seed) {
  const pools = {
    qui: qQui,
    ou: qOu,
    comment: qComment,
    pourquoi: qPourquoi,
    que: qQue
  };

  const list = pools[mode];
  return list[seed % list.length].replace('{ref}', ref);
}

function randomDifferentIndices(length, currentIndex, count) {
  const indices = [];
  let cursor = (currentIndex + 7) % length;

  while (indices.length < count) {
    if (cursor !== currentIndex && !indices.includes(cursor)) {
      indices.push(cursor);
    }
    cursor = (cursor + 11) % length;
  }

  return indices;
}

function pickPeopleDistractors(correct, seed) {
  const filtered = people.filter((p) => normalize(p) !== normalize(correct));
  const out = [];
  let i = seed % filtered.length;
  while (out.length < 2) {
    const candidate = filtered[i % filtered.length];
    if (!out.some((x) => normalize(x) === normalize(candidate))) {
      out.push(candidate);
    }
    i += 3;
  }
  return out;
}

function pickPlaceDistractors(correct, seed) {
  const filtered = places.filter((p) => normalize(p) !== normalize(correct));
  const out = [];
  let i = seed % filtered.length;
  while (out.length < 2) {
    const candidate = filtered[i % filtered.length];
    if (!out.some((x) => normalize(x) === normalize(candidate))) {
      out.push(candidate);
    }
    i += 2;
  }
  return out;
}

function toUniqueChoices(choices) {
  const out = [];
  const seen = new Set();
  for (const c of choices) {
    const key = normalize(c);
    if (!key || seen.has(key)) continue;
    out.push(c.trim());
    seen.add(key);
  }
  return out;
}

const transformed = data.map((q, idx) => {
  const peopleFound = extractPeople(q.verseText);
  const placesFound = extractPlaces(q.verseText);
  const basePhrase = pickPhrase(q.verseText, idx);

  let mode = 'que';
  if (peopleFound.length > 0 && idx % 5 === 0) mode = 'qui';
  else if (placesFound.length > 0 && idx % 5 === 1) mode = 'ou';
  else if (idx % 5 === 2) mode = 'comment';
  else if (idx % 5 === 3) mode = 'pourquoi';

  let correct = basePhrase;
  if (mode === 'qui') {
    correct = peopleFound[0];
  } else if (mode === 'ou') {
    correct = placesFound[0];
  }

  const otherIndices = randomDifferentIndices(data.length, idx, 6);
  const distractorPool =
    mode === 'qui'
      ? pickPeopleDistractors(correct, idx)
      : mode === 'ou'
        ? pickPlaceDistractors(correct, idx)
        : otherIndices.map((i) => pickPhrase(data[i].verseText, i));

  const merged = toUniqueChoices([correct, ...distractorPool]);
  const choices = merged.slice(0, 3);
  while (choices.length < 3) {
    choices.push(basePhrase);
  }

  const rotate = idx % 3;
  let rotated = choices;
  let correctIndex = 0;

  if (rotate === 1) {
    rotated = [choices[1], choices[2], choices[0]];
    correctIndex = 2;
  } else if (rotate === 2) {
    rotated = [choices[2], choices[0], choices[1]];
    correctIndex = 1;
  }

  return {
    ...q,
    question: chooseQuestion(mode, q.verseRef, idx),
    choices: rotated,
    correctIndex,
    explanation: `Référence : ${q.verseRef} (LSG 1910) - ${q.verseText}`
  };
});

fs.writeFileSync(filePath, JSON.stringify(transformed, null, 2) + '\n', 'utf8');
console.log(`Questions reformulées: ${transformed.length}`);
