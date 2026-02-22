"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const quizEngine_ts_1 = require("../src/lib/quizEngine.ts");
function makeQuestion(i) {
    return {
        id: `q-${i}`,
        book: 'Livre Test',
        chapter: 1,
        verseRef: `Livre 1:${i}`,
        verseText: `Texte ${i}`,
        question: `Question ${i}`,
        choices: ['A', 'B', 'C'],
        correctIndex: 0,
        explanation: `Explication ${i}`
    };
}
(0, node_test_1.default)('livres: limit 30 -> session.length = 30', () => {
    const pool = Array.from({ length: 120 }, (_, i) => makeQuestion(i + 1));
    const session = (0, quizEngine_ts_1.buildSession)(pool, { limit: 30, shuffle: true });
    strict_1.default.equal(session.length, 30);
});
(0, node_test_1.default)('livres: limit all -> session.length = pool.length', () => {
    const pool = Array.from({ length: 75 }, (_, i) => makeQuestion(i + 1));
    const session = (0, quizEngine_ts_1.buildSession)(pool, { limit: 'all', shuffle: true });
    strict_1.default.equal(session.length, 75);
});
(0, node_test_1.default)('generalites: limit 50 -> session.length = 50', () => {
    const pool = Array.from({ length: 500 }, (_, i) => makeQuestion(i + 1));
    const session = (0, quizEngine_ts_1.buildSession)(pool, { limit: 50, shuffle: true });
    strict_1.default.equal(session.length, 50);
});
(0, node_test_1.default)('si pool < 20 et limit 20 -> session.length = pool.length', () => {
    const pool = Array.from({ length: 12 }, (_, i) => makeQuestion(i + 1));
    const session = (0, quizEngine_ts_1.buildSession)(pool, { limit: 20, shuffle: true });
    strict_1.default.equal(session.length, 12);
});
(0, node_test_1.default)('pas de crash avec questions invalides, garde les valides', () => {
    const valid = Array.from({ length: 10 }, (_, i) => makeQuestion(i + 1));
    const invalid = {
        id: 'bad-1',
        question: '',
        choices: ['A'],
        correctIndex: 2
    };
    const session = (0, quizEngine_ts_1.buildSession)([...valid, invalid], { limit: 20, shuffle: true });
    strict_1.default.equal(session.length, 10);
    strict_1.default.ok(session.every((q) => q.question.startsWith('Question')));
});
