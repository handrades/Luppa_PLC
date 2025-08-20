/**
 * useSearchHighlight Hook
 * 
 * Provides utilities for highlighting search terms in text
 */

import React, { useMemo, useCallback } from 'react';

interface UseSearchHighlightOptions {
  caseSensitive?: boolean;
  highlightTag?: string;
  highlightClass?: string;
  maxHighlights?: number;
}

interface UseSearchHighlightReturn {
  highlightText: (text: string, searchTerms: string | string[]) => string;
  highlightReactNode: (text: string, searchTerms: string | string[]) => React.ReactNode;
  extractHighlights: (highlightedText: string) => string[];
  removeHighlights: (highlightedText: string) => string;
}

/**
 * useSearchHighlight Hook
 * 
 * @param options - Configuration options for highlighting
 * @returns Highlighting utilities
 */
export function useSearchHighlight(
  options: UseSearchHighlightOptions = {}
): UseSearchHighlightReturn {
  const {
    caseSensitive = false,
    highlightTag = 'mark',
    highlightClass = 'search-highlight',
    maxHighlights = 50,
  } = options;

  // Create regex for highlighting
  const createHighlightRegex = useCallback(
    (terms: string[]): RegExp => {
      // Escape special regex characters
      const escapedTerms = terms
        .filter(term => term.trim().length > 0)
        .map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .slice(0, maxHighlights);

      if (escapedTerms.length === 0) {
        return /(?:)/; // Match nothing
      }

      const pattern = `(${escapedTerms.join('|')})`;
      return new RegExp(pattern, caseSensitive ? 'g' : 'gi');
    },
    [caseSensitive, maxHighlights]
  );

  // Normalize search terms
  const normalizeTerms = useCallback((searchTerms: string | string[]): string[] => {
    if (typeof searchTerms === 'string') {
      return searchTerms
        .split(/\s+/)
        .filter(term => term.length > 0);
    }
    return searchTerms.filter(term => term.length > 0);
  }, []);

  // Highlight text with HTML tags
  const highlightText = useCallback(
    (text: string, searchTerms: string | string[]): string => {
      if (!text || (!searchTerms || searchTerms.length === 0)) {
        return text;
      }

      const terms = normalizeTerms(searchTerms);
      const regex = createHighlightRegex(terms);

      return text.replace(regex, (match) => {
        const className = highlightClass ? ` class="${highlightClass}"` : '';
        return `<${highlightTag}${className}>${match}</${highlightTag}>`;
      });
    },
    [normalizeTerms, createHighlightRegex, highlightTag, highlightClass]
  );

  // Highlight text for React (returns JSX elements)
  const highlightReactNode = useCallback(
    (text: string, searchTerms: string | string[]): React.ReactNode => {
      if (!text || (!searchTerms || searchTerms.length === 0)) {
        return text;
      }

      const terms = normalizeTerms(searchTerms);
      const regex = createHighlightRegex(terms);
      
      const parts = text.split(regex);
      
      return parts.map((part, index) => {
        const isHighlight = terms.some(term => 
          caseSensitive 
            ? part === term 
            : part.toLowerCase() === term.toLowerCase()
        );

        if (isHighlight) {
          return React.createElement('mark', {
            key: index,
            className: highlightClass,
            style: {
              backgroundColor: '#fff59d',
              padding: '0 2px',
              borderRadius: '2px',
              fontWeight: 500,
            }
          }, part);
        }

        return part;
      });
    },
    [normalizeTerms, createHighlightRegex, caseSensitive, highlightClass]
  );

  // Extract highlighted terms from HTML string
  const extractHighlights = useCallback(
    (highlightedText: string): string[] => {
      const regex = new RegExp(`<${highlightTag}[^>]*>(.*?)</${highlightTag}>`, 'gi');
      const matches: string[] = [];
      let match;

      while ((match = regex.exec(highlightedText)) !== null && matches.length < maxHighlights) {
        const term = match[1];
        if (term && !matches.includes(term)) {
          matches.push(term);
        }
      }

      return matches;
    },
    [highlightTag, maxHighlights]
  );

  // Remove highlight tags from text
  const removeHighlights = useCallback(
    (highlightedText: string): string => {
      const regex = new RegExp(`</?${highlightTag}[^>]*>`, 'gi');
      return highlightedText.replace(regex, '');
    },
    [highlightTag]
  );

  return useMemo(
    () => ({
      highlightText,
      highlightReactNode,
      extractHighlights,
      removeHighlights,
    }),
    [highlightText, highlightReactNode, extractHighlights, removeHighlights]
  );
}
