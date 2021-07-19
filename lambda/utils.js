'use strict';

/**
 * Defines utility functions
 * @type {Object}
 */
module.exports = {
  /**
   * Returns formatted utterance text
   * @param  {String} text
   * @return {String}
   */
  formatUtterance: (text) => {
    const keywords = ['who', 'what', 'when', 'where', 'why', 'how', 'is', 'can', 'does', 'do'];
    const isQuestion = keywords.some((word) => text.toLowerCase().startsWith(word));
    return text.charAt(0).toUpperCase() + text.slice(1) + (isQuestion ? '?' : '');
  }
};
