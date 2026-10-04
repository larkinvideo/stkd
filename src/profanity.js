// Family-friendly filter. Keep in sync with supabase/migrations/*_family_friendly.sql
// Words are matched whole (after normalizing leetspeak like "sh1t" / "@ss"), so titles like
// "Moby Dick", "Cockpit" or "Class" are fine. ROOTS also match longer words ("fucking").
const ROOTS = "f+u+c+k|f+u+k+|sh+it|b+i+t+c+h|c+u+n+t|tw+a+t|w+a+n+k|wh+o+r+e|sl+u+t|p+o+r+n|n+i+g+g|f+a+g+o+t|f+a+g+g|r+e+t+a+r+d|m+o+t+h+e+r+f|a+s+s+h+o+l|d+i+c+k+h+e+a+d|orospu|siktir|yarrak|amina|klootzak|godverdom|hoer";
const WORDS = "ass|asses|arse|bastard|bastards|cock|cocks|pussy|pussies|fag|fags|kys|rape|rapist|nude|nudes|amk|aq|sik|kut|lul|tering";
const RE = new RegExp(`^(?:(?:${ROOTS}).*|(?:${WORDS}))$`);

export function normalize(t) {
  let s = String(t || "").toLowerCase()
    .replace(/[çğıöşü]/g, c => ({ ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u" })[c])
    .replace(/[013457@$!]/g, c => ({ 0: "o", 1: "i", 3: "e", 4: "a", 5: "s", 7: "t", "@": "a", $: "s", "!": "i" })[c]);
  // Join spaced-out letters: "f u c k" / "f.u.c.k" -> "fuck"
  s = s.replace(/\b([a-z])[^a-z]+(?=[a-z]\b)/g, "$1");
  return s;
}

export function hasProfanity(...texts) {
  return texts.some(t => normalize(t).split(/[^a-z]+/).some(w => w && RE.test(w)));
}

export const FAMILY_MSG = "Keep it family-friendly 🙂 Try rewording that.";
export const isProfanityError = e => /STKD_FAMILY_FRIENDLY/.test(e?.message || "");
