# Accessibility Requirements

## Compliance Target

**Standard:** WCAG 2.1 AA compliance with industrial environment enhancements

## Key Requirements

**Visual:**
- Color contrast ratios: 4.5:1 minimum for normal text, 3:1 for large text and UI components (both light and dark modes tested)
- Focus indicators: High-contrast 3px outline with 2px offset, visible in both themes, GSAP-animated for smooth transitions
- Text sizing: Minimum 16px base size, scalable to 200% without horizontal scrolling, readable with safety glasses

**Interaction:**
- Keyboard navigation: Full application navigable via keyboard only, logical tab order, skip links for data tables, custom key shortcuts for power users
- Screen reader support: Proper ARIA labels, live regions for status updates, structured headings, descriptive link text, table headers properly associated
- Touch targets: Minimum 44px for all interactive elements, adequate spacing between targets, works reliably with work gloves

**Content:**
- Alternative text: Descriptive alt text for all equipment diagrams and status icons, empty alt for decorative images
- Heading structure: Logical H1-H6 hierarchy, each page starts with H1, no skipped heading levels
- Form labels: Every form field has associated label, required fields clearly marked, error messages descriptive and linked to fields

## Testing Strategy

**Multi-Method Accessibility Testing:**

1. **Automated Testing:** axe-core integration in Storybook, Lighthouse accessibility audits in CI/CD pipeline, color contrast analyzers for both themes

2. **Manual Testing:** Keyboard-only navigation, screen reader testing (NVDA, JAWS, VoiceOver), high contrast mode compatibility, zoom testing up to 200%

3. **Industrial Context Testing:** Interface testing while wearing safety glasses, touch interaction with work gloves, visibility under industrial lighting, noise environment validation

4. **User Testing:** Testing with engineers who use assistive technologies, validation with users who have visual/motor impairments
