// Feste Liste akuter Gefahrenzeichen für den Chat (KI-Richtlinie, Abschnitt 4).
// Die App zeigt den passenden Hinweis sofort an – unabhängig davon, ob und wann die KI antwortet.
// Bewusst vorsichtig: Lieber einmal zu oft warnen als einmal zu wenig. Texte brauchen noch eine fachliche Prüfung.
const near = (a, b) => new RegExp(`(${a})[^.!?\\n]{0,40}(${b})|(${b})[^.!?\\n]{0,40}(${a})`, 'i');

export const SAFETY_SIGNALS = [
  { id: 'brake', re: [near('brems', 'weich|schwammig|durch|versag|wirkt nicht|ohne wirkung|kaum|schlecht'), /(?:kann|können)\s+[^.!?\n]{0,30}nicht\s+(?:mehr\s+)?bremsen/i, near('bremspedal', 'sinkt|fällt|boden'), /bremswarn|bremsflüssigkeit/i],
    text: 'Bremse: Fühlt sich die Bremse anders an oder leuchtet die rote Bremswarnleuchte, nicht weiterfahren. Sicher anhalten und abschleppen lassen.' },
  { id: 'steering', re: [near('lenk', 'schwer|blockier|fest|hakt|ausgefallen|warn')],
    text: 'Lenkung: Wird die Lenkung schwergängig oder ungewohnt, sicher anhalten und nicht weiterfahren.' },
  { id: 'oil', re: [/öldruck|ölkanne|öl ?lampe|öl-?warn|oil pressure/i],
    text: 'Öldruck: Bei Öldruckwarnung sofort sicher anhalten und den Motor abstellen. Nicht weiterfahren, bevor die Ursache geklärt ist.' },
  { id: 'heat', re: [/überhitz|zu heiß|kocht|dampf/i, near('temperatur|kühlmittel', 'rot|warn|hoch|steigt|leer|verlust')],
    text: 'Überhitzung: Sofort sicher anhalten und den Motor abstellen. Das heiße Kühlsystem nicht öffnen.' },
  { id: 'fire', re: [/rauch|qualm|brandgeruch|feuer|flamme|brennt|riecht\w* verbrannt/i],
    text: 'Rauch oder Brandgeruch: Sofort sicher anhalten, Motor aus, alle aussteigen und Abstand halten. Bei Feuer 112 anrufen.' },
  { id: 'misfire', re: [near('blink', 'motor|kontroll|mkl|warnleucht')],
    text: 'Blinkende Motorkontrollleuchte: Möglichst bald sicher anhalten und nicht weiter belasten – unverbrannter Kraftstoff kann den Katalysator überhitzen.' },
  { id: 'fuel', re: [/benzingeruch|dieselgeruch|kraftstoffgeruch/i, near('riech|geruch', 'benzin|diesel|sprit|kraftstoff'), near('benzin|diesel|kraftstoff|sprit', 'läuft aus|tropft|leck|undicht')],
    text: 'Kraftstoffgeruch oder -austritt: Brandgefahr. Sicher anhalten, Motor aus, nicht rauchen und Abstand halten.' },
  { id: 'highvoltage', re: [/hochvolt|hv-?(warn|system|batterie)|stromschlag/i],
    text: 'Hochvoltsystem: Keine eigenen Arbeiten. Bei einer Hochvolt-Warnmeldung sicher anhalten und geschultes Fachpersonal hinzuziehen.' },
];

// Liefert die Hinweise, deren Gefahrenzeichen im Text vorkommen (in fester Reihenfolge, ohne Doppelte).
export function safetySignals(text) {
  return SAFETY_SIGNALS.filter(({ re }) => re.some((r) => r.test(text)));
}
