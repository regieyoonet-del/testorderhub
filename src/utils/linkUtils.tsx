/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export interface TextToken {
  type: 'text' | 'url';
  content: string;
  url?: string;
}

/**
 * Tokenizes text into regular text strings and detected URLs (http:// or https://).
 * Handles sentence punctuation directly following URLs (periods, commas, parens, quotes).
 */
export function tokenizeTextWithUrls(text: string): TextToken[] {
  if (!text) return [];

  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  const tokens: TextToken[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = urlRegex.exec(text)) !== null) {
    const matchIndex = match.index;
    let rawUrl = match[0];

    // Preceding text before this URL match
    if (matchIndex > lastIndex) {
      tokens.push({
        type: 'text',
        content: text.slice(lastIndex, matchIndex)
      });
    }

    // Separate trailing sentence punctuation from the actual URL
    let trailingPunctuation = '';
    while (rawUrl.length > 0) {
      const lastChar = rawUrl[rawUrl.length - 1];

      // Standard sentence-ending punctuation or enclosure marks
      if (/[.,;:!?"'>]/.test(lastChar)) {
        trailingPunctuation = lastChar + trailingPunctuation;
        rawUrl = rawUrl.slice(0, -1);
      } else if (lastChar === ')' && (rawUrl.match(/\(/g) || []).length < (rawUrl.match(/\)/g) || []).length) {
        // Trailing closing parenthesis without an opening parenthesis in the URL
        trailingPunctuation = lastChar + trailingPunctuation;
        rawUrl = rawUrl.slice(0, -1);
      } else if (lastChar === ']' && (rawUrl.match(/\[/g) || []).length < (rawUrl.match(/\]/g) || []).length) {
        // Trailing closing bracket without an opening bracket in the URL
        trailingPunctuation = lastChar + trailingPunctuation;
        rawUrl = rawUrl.slice(0, -1);
      } else {
        break;
      }
    }

    // Verify there is an actual host/path after http(s)://
    const hostPart = rawUrl.replace(/^https?:\/\//i, '');
    if (rawUrl && hostPart.trim().length > 0) {
      tokens.push({
        type: 'url',
        url: rawUrl,
        content: rawUrl
      });
    } else if (rawUrl) {
      // Degenerate case (e.g. just "https://")
      tokens.push({
        type: 'text',
        content: rawUrl
      });
    }

    if (trailingPunctuation) {
      tokens.push({
        type: 'text',
        content: trailingPunctuation
      });
    }

    lastIndex = matchIndex + match[0].length;
  }

  // Any remaining text after the last URL
  if (lastIndex < text.length) {
    tokens.push({
      type: 'text',
      content: text.slice(lastIndex)
    });
  }

  return tokens;
}

/**
 * Safely renders comment text with auto-detected clickable URLs.
 * URLs open in a new tab with security attributes (target="_blank", rel="noopener noreferrer").
 * Non-URL text is preserved as regular text fragments without dangerouslySetInnerHTML.
 */
export function renderCommentWithLinks(text: string): React.ReactNode {
  if (!text) return null;

  const tokens = tokenizeTextWithUrls(text);

  return (
    <>
      {tokens.map((token, idx) => {
        if (token.type === 'url' && token.url) {
          return (
            <a
              key={`link-${idx}-${token.url.slice(0, 20)}`}
              href={token.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline underline-offset-2 font-medium break-all transition-colors cursor-pointer"
              onClick={e => e.stopPropagation()}
              title={token.url}
            >
              {token.content}
            </a>
          );
        }
        return <React.Fragment key={`txt-${idx}`}>{token.content}</React.Fragment>;
      })}
    </>
  );
}
