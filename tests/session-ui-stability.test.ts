import test from 'node:test';
import assert from 'node:assert/strict';
import { canDisplayDeferredError, isLatestRequest } from '../src/lib/uiStability.ts';

test('stabilité UI: accepte uniquement la requête courante', () => {
  assert.equal(isLatestRequest(4, 4), true);
  assert.equal(isLatestRequest(5, 4), false);
});

test('stabilité UI: ne montre pas une erreur pendant un chargement', () => {
  assert.equal(
    canDisplayDeferredError({
      isLatest: true,
      isLoading: true,
      isPreparing: false
    }),
    false
  );
});

test('stabilité UI: ne montre pas une erreur pendant la préparation de session', () => {
  assert.equal(
    canDisplayDeferredError({
      isLatest: true,
      isLoading: false,
      isPreparing: true
    }),
    false
  );
});

test('stabilité UI: montre une erreur uniquement si état stable et requête courante', () => {
  assert.equal(
    canDisplayDeferredError({
      isLatest: true,
      isLoading: false,
      isPreparing: false
    }),
    true
  );

  assert.equal(
    canDisplayDeferredError({
      isLatest: false,
      isLoading: false,
      isPreparing: false
    }),
    false
  );
});
