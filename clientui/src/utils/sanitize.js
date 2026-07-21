import DOMPurify from 'dompurify';

/**
 * Sanitize message content to prevent XSS attacks
 * Allows only safe tags for rich text (bold, italic, code, etc.)
 * @param {string} content - Raw message content
 * @returns {string} - Sanitized HTML safe content
 */
export const sanitizeMessageContent = (content) => {
  if (!content || typeof content !== 'string') {
    return '';
  }

  // Configure DOMPurify to allow safe formatting tags
  const config = {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'u', 'code', 'pre', 'br', 'a'],
    ALLOWED_ATTR: ['href', 'title', 'target', 'rel'],
    KEEP_CONTENT: true,
    RETURN_DOM_FRAGMENT: false,
    RETURN_DOM: false
  };

  // Sanitize the content
  const cleaned = DOMPurify.sanitize(content, config);
  
  return cleaned;
};

/**
 * Escape HTML special characters
 * Used for plain text display to prevent any potential XSS
 * @param {string} text - Text to escape
 * @returns {string} - Escaped text safe for HTML display
 */
export const escapeHtml = (text) => {
  if (!text || typeof text !== 'string') {
    return '';
  }

  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };

  return text.replace(/[&<>"']/g, (char) => map[char]);
};

/**
 * Highlight @mentions in text
 * Prevents XSS by escaping content first, then wrapping mentions
 * @param {string} content - Text content
 * @returns {Array} - Array of React elements with highlighted mentions
 */
export const highlightMentionsWithSanitization = (content) => {
  if (!content || typeof content !== 'string') {
    return [];
  }

  // First escape the entire content to prevent XSS
  const escaped = escapeHtml(content);

  // Then split by mention pattern and highlight
  return escaped.split(/(@\w+)/g).map((part, index) => {
    if (part.startsWith('@')) {
      return {
        type: 'mention',
        text: part,
        key: `mention-${index}`
      };
    }
    return {
      type: 'text',
      text: part,
      key: `text-${index}`
    };
  });
};

export default {
  sanitizeMessageContent,
  escapeHtml,
  highlightMentionsWithSanitization
};
