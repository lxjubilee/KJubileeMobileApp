import type { Resource } from 'i18next';
import en from '../en.json';
import es from './es.json';
import fr from './fr.json';
import de from './de.json';
import it from './it.json';
import ptBR from './pt-BR.json';
import nl from './nl.json';
import ru from './ru.json';
import pl from './pl.json';
import zh from './zh.json';
import ja from './ja.json';
import ko from './ko.json';
import ar from './ar.json';
import hi from './hi.json';
import th from './th.json';
import tr from './tr.json';
import vi from './vi.json';
import tl from './tl.json';
import he from './he.json';
import sv from './sv.json';
import da from './da.json';
import cs from './cs.json';
import hu from './hu.json';
import bg from './bg.json';
import hr from './hr.json';
import id from './id.json';
import ro from './ro.json';
import uk from './uk.json';
import el from './el.json';
import yue from './yue.json';
import ms from './ms.json';
import ur from './ur.json';
import bn from './bn.json';
import ta from './ta.json';
import fa from './fa.json';
import sw from './sw.json';
import no from './no.json';
import fi from './fi.json';
import af from './af.json';
import la from './la.json';

/**
 * i18next resources. English (en.json) is the source of truth and the fallback
 * language; every other locale mirrors its key structure. Any missing key in a
 * locale falls back to English, so partial translations are safe.
 *
 * All 40 languages offered by the picker (localization/languages.ts) now have a
 * translation file. To add another, drop `<code>.json` (mirroring en.json) here
 * and register it below.
 */
export const resources: Resource = {
  en: { translation: en },
  es: { translation: es },
  fr: { translation: fr },
  de: { translation: de },
  it: { translation: it },
  'pt-BR': { translation: ptBR },
  'pt-PT': { translation: ptBR },
  nl: { translation: nl },
  ru: { translation: ru },
  pl: { translation: pl },
  zh: { translation: zh },
  ja: { translation: ja },
  ko: { translation: ko },
  ar: { translation: ar },
  hi: { translation: hi },
  th: { translation: th },
  tr: { translation: tr },
  vi: { translation: vi },
  tl: { translation: tl },
  he: { translation: he },
  sv: { translation: sv },
  da: { translation: da },
  cs: { translation: cs },
  hu: { translation: hu },
  bg: { translation: bg },
  hr: { translation: hr },
  id: { translation: id },
  ro: { translation: ro },
  uk: { translation: uk },
  el: { translation: el },
  yue: { translation: yue },
  ms: { translation: ms },
  ur: { translation: ur },
  bn: { translation: bn },
  ta: { translation: ta },
  fa: { translation: fa },
  sw: { translation: sw },
  no: { translation: no },
  fi: { translation: fi },
  af: { translation: af },
  la: { translation: la },
};
