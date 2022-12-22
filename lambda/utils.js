/**
 * Returns formatted utterance text
 * @param  {String}   text
 * @param  {String}   locale
 * @param  {Function} t
 * @return {String}
 */
export const formatUtterance = (text, locale, t) => {
  const isQuestion = t('utterance.question_words')
    .split(',')
    .some((word) => word && word.localeCompare(text.slice(0, word.length), locale, { sensitivity: 'base' }) === 0);
  const prefix = isQuestion && locale.startsWith('es') ? '¿' : '';
  const suffix = isQuestion ? '?' : '';
  return `${prefix}${text.charAt(0).toUpperCase()}${text.slice(1)}${suffix}`;
};
