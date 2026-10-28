import test from 'node:test';
import assert from 'node:assert/strict';
import { safetySignals } from '../dist/safety-signals.js';

const ids = (text) => safetySignals(text).map((s) => s.id);

test('erkennt akute Gefahrenzeichen in Chatfragen', () => {
  assert.deepEqual(ids('Die Bremse fühlt sich ganz weich an'), ['brake']);
  assert.deepEqual(ids('Rote Bremswarnleuchte ist an'), ['brake']);
  assert.deepEqual(ids('Lenkung ist plötzlich schwergängig'), ['steering']);
  assert.deepEqual(ids('Öldrucklampe leuchtet kurz auf'), ['oil']);
  assert.deepEqual(ids('Temperaturanzeige steigt in den roten Bereich'), ['heat']);
  assert.deepEqual(ids('Unter der Haube kommt Dampf raus'), ['heat']);
  assert.deepEqual(ids('Es riecht verbrannt und qualmt'), ['fire']);
  assert.deepEqual(ids('Die Motorkontrollleuchte blinkt'), ['misfire']);
  assert.deepEqual(ids('Im Innenraum riecht es nach Benzin'), ['fuel']);
  assert.deepEqual(ids('Hochvolt-Warnung im Display'), ['highvoltage']);
});

test('mehrere Zeichen, feste Reihenfolge', () => {
  assert.deepEqual(ids('Öldrucklampe an und es qualmt'), ['oil', 'fire']);
});

test('normale Fragen lösen keinen Sicherheitshinweis aus', () => {
  for (const text of ['Was bedeutet P0420?', 'Welche Live-Daten soll ich bei P0171 ansehen?', 'Kann ich mit P0301 noch weiterfahren?', 'Wie teuer ist ein neuer Bremsbelag?', 'Was kostet ein Lenkradbezug?'])
    assert.deepEqual(ids(text), [], text);
});

test('erkennt Bremsverlust und absinkendes Bremspedal ohne KI-Antwort', () => {
  for (const text of ['Ich kann nicht mehr bremsen.', 'Ich kann nicht bremsen.', 'Wir können plötzlich nicht mehr bremsen.', 'Das Bremspedal sinkt bis zum Boden.', 'Mein Bremspedal fällt bis auf den Boden.'])
    assert.deepEqual(ids(text), ['brake'], text);
  for (const text of ['Wie kann ich die Bremsbeläge wechseln?', 'Was kostet ein Bremspedal?'])
    assert.deepEqual(ids(text), [], text);
});
