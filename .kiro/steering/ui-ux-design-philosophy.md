---
inclusion: fileMatch
fileMatchPattern: ['**/app/**/*.tsx', '**/app/**/*.ts', '**/components/**/*.tsx', '**/*.css']
---

# UI/UX Design Philosophy

## Core Design Principles

### 1. Clarity Over Complexity
- Single-purpose interface: one input, one clear result
- Minimize cognitive load with progressive disclosure
- Use plain language, avoid technical jargon in user-facing text
- Clear visual hierarchy: input → processing → results

### 2. Trust Through Transparency
- Always show confidence scores and reasoning
- Display retrieved evidence sources prominently
- Use color coding for quick verdict recognition (green/red/yellow)
- Provide "Why this verdict?" explanations

### 3. Speed and Responsiveness
- Instant feedback on user actions
- Loading states with progress indicators
- Optimistic UI updates where possible
- Cache results for instant re-display

### 4. Accessibility First
- WCAG 2.1 AA compliance minimum
- Keyboard navigation support
- Screen reader friendly
- High contrast color schemes
- Responsive design (mobile, tablet, desktop)

## Visual Design System

### Color Palette

**Verdict Colors:**
- ✅ True: Green (#10b981, emerald-500)
- ❌ False: Red (#ef4444, red-500)
- 🤷‍♂️ Unverifiable: Yellow/Amber (#f59e0b, amber-500)

**UI Colors:**
- Primary: Blue (#3b82f6, blue-500)
- Background: White/Gray (#ffffff, #f9fafb)
- Text: Dark Gray (#1f2937, gray-800)
- Borders: Light Gray (#e5e7eb, gray-200)

**Semantic Colors:**
- Success: Green (#10b981)
- Error: Red (#ef4444)
- Warning: Amber (#f59e0b)
- Info: Blue (#3b82f6)

### Typography

- **Headings**: Inter, system-ui, sans-serif
- **Body**: Inter, system-ui, sans-serif
- **Code/Technical**: 'Courier New', monospace

**Scale:**
- H1: 2.25rem (36px) - Page title
- H2: 1.875rem (30px) - Section headers
- H3: 1.5rem (24px) - Card titles
- Body: 1rem (16px) - Default text
- Small: 0.875rem (14px) - Metadata, captions

### Spacing

Use Tailwind's spacing scale (4px base unit):
- xs: 0.5rem (8px)
- sm: 0.75rem (12px)
- md: 1rem (16px)
- lg: 1.5rem (24px)
- xl: 2rem (32px)
- 2xl: 3rem (48px)

### Component Patterns

**Cards:**
- Rounded corners (rounded-lg: 8px)
- Subtle shadow (shadow-md)
- White background with border
- Padding: p-6 (24px)

**Buttons:**
- Primary: Solid blue background, white text
- Secondary: White background, blue border
- Danger: Solid red background, white text
- Disabled: Gray background, reduced opacity

**Input Fields:**
- Clear labels above inputs
- Placeholder text for guidance
- Error states with red border and message
- Focus states with blue ring

## Layout Structure

### Main Interface Layout

```
┌─────────────────────────────────────────┐
│           Header / Logo                 │
├─────────────────────────────────────────┤
│                                         │
│         Claim Input Area                │
│    (Large textarea with submit)         │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│         Results Section                 │
│   ┌─────────────────────────────────┐  │
│   │  Verdict Badge (Large, Colored) │  │
│   ├─────────────────────────────────┤  │
│   │  Confidence Score (Visual bar)  │  │
│   ├─────────────────────────────────┤  │
│   │  Extracted Claim (Highlighted)  │  │
│   ├─────────────────────────────────┤  │
│   │  Reasoning (LLM explanation)    │  │
│   ├─────────────────────────────────┤  │
│   │  Evidence Sources (Expandable)  │  │
│   └─────────────────────────────────┘  │
│                                         │
├─────────────────────────────────────────┤
│   Feedback Toggle (Optional)            │
└─────────────────────────────────────────┘
```

### Responsive Breakpoints

- Mobile: < 640px (sm)
- Tablet: 640px - 1024px (md, lg)
- Desktop: > 1024px (xl, 2xl)

**Mobile Adjustments:**
- Stack elements vertically
- Reduce padding and margins
- Larger touch targets (min 44x44px)
- Simplified navigation

## Interaction Patterns

### Input Flow

1. **Empty State**: Show example claim with "Try this" button
2. **Typing**: Character count indicator (max 1000 chars)
3. **Validation**: Real-time error messages for invalid input
4. **Submission**: Disable input, show loading spinner
5. **Processing**: Progress indicator with status text
6. **Results**: Smooth transition to results display

### Loading States

**Skeleton Screens:**
- Show placeholder content while loading
- Animate with shimmer effect
- Match final content layout

**Progress Indicators:**
- Spinner for quick operations (< 2s)
- Progress bar for longer operations (> 2s)
- Status text: "Extracting claims...", "Searching facts...", "Analyzing..."

### Error Handling

**User-Facing Errors:**
- Friendly error messages (no stack traces)
- Actionable suggestions ("Try shortening your claim")
- Retry button for transient errors
- Contact support link for persistent errors

**Error Types:**
- Input validation: Inline, near input field
- Network errors: Toast notification
- Server errors: Modal with retry option

## Content Guidelines

### Microcopy

**Input Placeholder:**
"Enter a news claim or statement to verify (e.g., 'The government announced free electricity to farmers')"

**Empty State:**
"No claim entered yet. Try an example or paste your own statement."

**Loading Messages:**
- "Extracting key claims..."
- "Searching trusted sources..."
- "Comparing with verified facts..."
- "Generating verdict..."

**Verdict Labels:**
- ✅ "Likely True" or "Verified"
- ❌ "Likely False" or "Disputed"
- 🤷‍♂️ "Unverifiable" or "Insufficient Evidence"

### Tone of Voice

- **Neutral and Objective**: Avoid emotional language
- **Clear and Direct**: No ambiguity in verdicts
- **Educational**: Explain reasoning, don't just state results
- **Respectful**: Acknowledge uncertainty when present

## Animation Guidelines

### Transitions

- **Duration**: 150-300ms for most transitions
- **Easing**: ease-in-out for natural feel
- **Properties**: opacity, transform (avoid animating layout properties)

**Examples:**
- Fade in results: opacity 0 → 1 (200ms)
- Slide in cards: translateY(20px) → 0 (250ms)
- Expand evidence: max-height 0 → auto (300ms)

### Micro-interactions

- Button hover: Scale 1.02, shadow increase
- Input focus: Border color change, ring appearance
- Card hover: Shadow increase, slight lift
- Toggle switch: Smooth slide animation

## Accessibility Requirements

### Keyboard Navigation

- Tab order follows visual flow
- Focus indicators clearly visible
- Escape key closes modals/dropdowns
- Enter key submits forms

### Screen Reader Support

- Semantic HTML (header, main, section, article)
- ARIA labels for icon-only buttons
- ARIA live regions for dynamic content
- Alt text for all images

### Color Contrast

- Text: Minimum 4.5:1 contrast ratio
- Large text: Minimum 3:1 contrast ratio
- Interactive elements: Minimum 3:1 contrast ratio
- Test with tools: WebAIM Contrast Checker

### Focus Management

- Visible focus indicators (2px blue ring)
- Focus trap in modals
- Return focus after modal close
- Skip to main content link

## Component-Specific Guidelines

### Claim Input Component

- Large textarea (min 4 rows)
- Character counter (current/max)
- Clear button (X icon)
- Submit button (prominent, primary color)
- Validation messages below input

### Verdict Display Component

- Large badge with icon and text
- Color-coded background
- Confidence percentage
- Tooltip with explanation

### Evidence Card Component

- Collapsible/expandable
- Source attribution
- Similarity score (optional)
- "Read more" link to original source

### Confidence Meter Component

- Visual progress bar
- Percentage label
- Color gradient (red → yellow → green)
- Tooltip explaining confidence calculation

### Feedback Toggle Component (Bonus)

- Thumbs up/down buttons
- "Was this helpful?" text
- Thank you message after submission
- Optional comment field

## Performance Considerations

### Perceived Performance

- Optimistic UI updates
- Skeleton screens during loading
- Instant feedback on interactions
- Prefetch common queries

### Actual Performance

- Lazy load below-the-fold content
- Optimize images (WebP, responsive sizes)
- Code splitting for routes
- Minimize bundle size

## Testing Guidelines

### Visual Testing

- Test on multiple browsers (Chrome, Firefox, Safari, Edge)
- Test on multiple devices (iPhone, Android, iPad, Desktop)
- Test with different zoom levels (100%, 150%, 200%)
- Test in dark mode (if supported)

### Usability Testing

- Can users complete verification in < 30 seconds?
- Do users understand the verdict?
- Can users find evidence sources?
- Do error messages help users recover?

### Accessibility Testing

- Keyboard-only navigation
- Screen reader testing (NVDA, JAWS, VoiceOver)
- Color blindness simulation
- Automated tools (axe, Lighthouse)

## Design Tokens (Tailwind Config)

```javascript
// Example Tailwind configuration
colors: {
  verdict: {
    true: '#10b981',
    false: '#ef4444',
    uncertain: '#f59e0b'
  }
},
spacing: {
  'card': '1.5rem',
  'section': '3rem'
},
borderRadius: {
  'card': '0.5rem'
}
```

## Future Enhancements

- Dark mode support
- Multi-language support (i18n)
- Claim history/bookmarks
- Share results functionality
- Print-friendly layout
- Batch verification interface
