"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildSession = buildSession;
exports.buildQuizSession = buildQuizSession;
exports.computeScore = computeScore;
const minQuestions_1 = require("./minQuestions");
function isValidQuestion(value) {
    if (!value || typeof value !== 'object') {
        return false;
    }
    const candidate = value;
    if (typeof candidate.id !== 'string' || !candidate.id.trim())
        return false;
    if (typeof candidate.question !== 'string' || !candidate.question.trim())
        return false;
    if (!Array.isArray(candidate.choices) || candidate.choices.length < 2)
        return false;
    if (typeof candidate.correctIndex !== 'number')
        return false;
    if (candidate.correctIndex < 0 || candidate.correctIndex >= candidate.choices.length)
        return false;
    return true;
}
function shuffleInPlace(items) {
    for (let i = items.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
}
function pickRandomSubset(items, count) {
    const n = items.length;
    if (count >= n) {
        return [...items];
    }
    const selected = new Set();
    for (let i = n - count; i < n; i += 1) {
        const rand = Math.floor(Math.random() * (i + 1));
        if (selected.has(rand)) {
            selected.add(i);
        }
        else {
            selected.add(rand);
        }
    }
    const subset = [];
    for (const index of selected) {
        subset.push(items[index]);
    }
    return subset;
}
function buildSession(questions, options) {
    const validQuestions = questions.filter(isValidQuestion);
    if (validQuestions.length === 0) {
        throw new Error('Aucune question valide disponible pour cette session.');
    }
    const requestedLimit = options.limit === 'all' ? validQuestions.length : options.limit;
    const effectiveLimit = Math.max(1, Math.min(requestedLimit, validQuestions.length));
    const shuffle = options.shuffle ?? true;
    const selected = effectiveLimit >= validQuestions.length
        ? [...validQuestions]
        : pickRandomSubset(validQuestions, effectiveLimit);
    if (!shuffle) {
        return selected;
    }
    return shuffleInPlace(selected);
}
function buildQuizSession(book, questions) {
    const minimum = (0, minQuestions_1.minQuestions)(book.chaptersCount);
    if (questions.length < minimum) {
        throw new Error(`Le livre ${book.name} nécessite au moins ${minimum} questions, reçu ${questions.length}.`);
    }
    return {
        book,
        questions
    };
}
function computeScore(correctAnswers, totalQuestions) {
    if (totalQuestions === 0) {
        return 0;
    }
    return Math.round((correctAnswers / totalQuestions) * 100);
}
