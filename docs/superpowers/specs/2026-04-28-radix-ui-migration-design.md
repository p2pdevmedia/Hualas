# Radix UI Themes Migration Design

**Date:** 2026-04-28  
**Branch:** `feature/radix-ui`  
**Scope:** 100% UI migration across all pages and components

---

## Executive Summary

Migrate Hualas UI from Tailwind CSS to **Radix UI Themes** — a complete component + theming system. The migration uses a **staged, layer-by-layer approach** to minimize risk and ensure all functionality (payments, chat, forms) continues working.

**Key decisions:**

- Use Radix UI Themes (not just components)
- Maintain Tailwind CSS for utilities (spacing, responsive, flexbox)
- Replace lucide-react icons with Radix UI native icons
- Mountain-themed colors (greens/blues)
- Migrate in 6 ordered steps: setup → base components → layout → pages (public → user → admin)

---

## Architecture

### Tech Stack

```
Next.js 14 App Router
  ↓
React 18 + TypeScript
  ↓
Radix UI Themes (components + theming)
  ↓
Tailwind CSS (utilities only)
  ↓
Radix UI Icons (replace lucide-react)
```

### Theme Configuration

- **Primary color:** Mountain green (e.g., `#16a34a` or similar)
- **Secondary color:** Mountain blue (e.g., `#0369a1` or similar)
- **Neutral colors:** Grays for backgrounds, text, borders
- **Accent colors:** For status (success, error, warning)
- **Dark mode:** Supported natively by Radix UI Themes

### File Structure

```
src/
├── components/
│   ├── ui/
│   │   ├── button.tsx           (Radix Button wrapper)
│   │   ├── input.tsx            (Radix TextField wrapper)
│   │   ├── select.tsx           (Radix Select wrapper)
│   │   ├── textarea.tsx         (Radix TextArea wrapper)
│   │   ├── dialog.tsx           (Radix Dialog wrapper)
│   │   ├── dropdown.tsx         (Radix DropdownMenu wrapper)
│   │   ├── popover.tsx          (Radix Popover wrapper)
│   │   ├── card.tsx             (Radix Card wrapper)
│   │   ├── table.tsx            (Radix Table wrapper)
│   │   ├── tabs.tsx             (Radix Tabs wrapper)
│   │   ├── checkbox.tsx         (Radix Checkbox wrapper)
│   │   ├── radio.tsx            (Radix RadioGroup wrapper)
│   │   ├── label.tsx            (Radix Label wrapper)
│   │   ├── tooltip.tsx          (Radix Tooltip wrapper)
│   │   └── ...
│   ├── navbar.tsx               (Radix UI redesign)
│   ├── footer.tsx               (Radix UI redesign)
│   ├── providers.tsx            (Theme provider wrapper)
│   └── ...
├── app/
│   ├── layout.tsx               (Radix Theme wrapper)
│   ├── globals.css              (Radix config + Tailwind utilities)
│   ├── page.tsx                 (Home redesigned)
│   ├── login/
│   │   └── page.tsx             (Redesigned)
│   ├── register/
│   │   └── page.tsx             (Redesigned)
│   ├── contact/
│   │   └── page.tsx             (Redesigned)
│   ├── activities/
│   │   ├── page.tsx             (Redesigned)
│   │   ├── new/form.tsx         (Redesigned)
│   │   ├── [id]/edit/form.tsx   (Redesigned)
│   │   └── ...
│   ├── profile/
│   │   ├── page.tsx             (Redesigned)
│   │   └── form.tsx             (Redesigned)
│   ├── chat/
│   │   └── page.tsx             (Redesigned)
│   ├── admin/
│   │   ├── users/page.tsx       (Redesigned)
│   │   ├── forms/page.tsx       (Redesigned)
│   │   └── ...
│   ├── accounting/
│   │   ├── page.tsx             (Redesigned)
│   │   ├── movements/page.tsx   (Redesigned)
│   │   └── ...
│   └── ...
├── lib/
│   ├── theme.ts                 (Radix UI theme config)
│   ├── utils.ts                 (existing utilities, unchanged)
│   └── ...
└── styles/
    └── radix-overrides.css      (Custom Radix UI overrides if needed)
```

---

## Migration Strategy: 6-Step Approach

### **Step 1: Setup Radix UI + Theme Configuration**

**Goal:** Configure Radix UI Themes globally and ensure all pages inherit the theme.

**Tasks:**

- Install `@radix-ui/themes` and `@radix-ui/icons`
- Create `src/lib/theme.ts` with mountain-themed color config
- Update `src/app/layout.tsx` to wrap app with `<Theme>` provider
- Update `src/app/globals.css` with Radix UI imports
- Remove lucide-react dependency from `package.json`
- Verify theme applies globally to a test page

**Validation:**

- ✅ Theme colors visible on home page
- ✅ No TypeScript errors
- ✅ Build succeeds

---

### **Step 2: Migrate Base Components**

**Goal:** Create Radix UI wrapper components that match existing API.

**Components to migrate:**

- `Button` (Radix Button)
- `Input` (Radix TextField)
- `Select` (Radix Select)
- `Textarea` (Radix TextArea)
- `Dialog` (Radix Dialog)
- `Dropdown` (Radix DropdownMenu)
- `Popover` (Radix Popover)
- `Card` (Radix Card)
- `Table` (Radix Table)
- `Tabs` (Radix Tabs)
- `Checkbox` (Radix Checkbox)
- `Radio` (Radix RadioGroup)
- `Label` (Radix Label)
- `Tooltip` (Radix Tooltip)

**Pattern:**
Each wrapper component exports the Radix component with sensible defaults and Tailwind utility support.

```tsx
// Example: src/components/ui/button.tsx
import { Button as RadixButton } from '@radix-ui/themes';
import { cn } from '@/lib/utils';

export function Button({ className, ...props }) {
  return <RadixButton className={cn('', className)} {...props} />;
}
```

**Validation:**

- ✅ All base components render correctly
- ✅ Existing props still work (size, variant, disabled)
- ✅ No visual regressions
- ✅ Tests pass

---

### **Step 3: Migrate Layout Components**

**Goal:** Update Navbar and Footer with Radix UI.

**Components:**

- `Navbar` — Navigation bar with logo, menu, user avatar, language selector
- `Footer` — Footer with links and info

**Changes:**

- Replace custom Tailwind styling with Radix UI components
- Update navigation dropdowns to use Radix DropdownMenu
- Ensure responsive design with Radix UI's responsive props
- Maintain existing functionality (language toggle, auth logic)

**Validation:**

- ✅ Navbar renders on all pages
- ✅ Mobile menu works
- ✅ Auth-dependent items appear/disappear correctly
- ✅ Language toggle still works
- ✅ Responsive on mobile, tablet, desktop

---

### **Step 4: Migrate Public Pages**

**Goal:** Redesign public-facing pages with Radix UI.

**Pages:**

- `/` — Home page
- `/contact` — Contact form
- `/login` — Login page
- `/register` — Register page

**Approach:**

- Use Radix UI components (Card, Input, Button, Dialog)
- Maintain existing form validation (Zod + React Hook Form)
- Keep Mercado Pago integration logic unchanged
- Update visual hierarchy to match Radix UI Themes

**Validation:**

- ✅ All pages load without errors
- ✅ Forms submit correctly
- ✅ No functional regressions
- ✅ Visual design consistent with theme
- ✅ Mobile responsive

---

### **Step 5: Migrate User Pages**

**Goal:** Redesign authenticated user pages with Radix UI.

**Pages:**

- `/profile` — User profile page
- `/profile` (profile form) — Edit profile
- `/chat` — Internal messaging
- `/my-activities` — User's activities

**Approach:**

- Replace Tailwind components with Radix UI
- Maintain existing API calls and state management
- Update form inputs (profile edit, etc.)
- Keep chat polling logic unchanged

**Validation:**

- ✅ Protected pages require auth
- ✅ Profile photo uploads work
- ✅ Chat real-time updates work
- ✅ Activity registration flow works
- ✅ No data loss

---

### **Step 6: Migrate Admin + Complex Pages**

**Goal:** Redesign admin dashboard and complex pages with Radix UI.

**Pages:**

- `/activities` — Activities list
- `/activities/new` — Create activity
- `/activities/[id]/edit` — Edit activity
- `/admin/users` — Users management
- `/admin/forms` — Forms builder
- `/accounting/*` — Accounting dashboard

**Approach:**

- Replace data tables with Radix Table
- Update modals/dialogs (Radix Dialog)
- Migrate form components (Radix Input, Select, Checkbox)
- Keep API integration unchanged
- Update status indicators, badges, labels

**Validation:**

- ✅ All admin pages load and function
- ✅ Data tables display correctly
- ✅ Sorting/filtering works
- ✅ Forms submit correctly
- ✅ No regressions in activity management or accounting

---

## Component Guidelines

### Wrapper Pattern

All Radix UI components should be wrapped to:

1. Provide sensible defaults
2. Ensure consistency across the app
3. Allow easy updates (e.g., if we need custom styling)

```tsx
// Example: Button wrapper
import { Button as RadixButton, type ButtonProps } from '@radix-ui/themes';

export function Button({
  variant = 'solid',
  size = 'md',
  ...props
}: ButtonProps) {
  return <RadixButton variant={variant} size={size} {...props} />;
}
```

### Tailwind + Radix UI

- Use Radix UI for component structure and theme colors
- Use Tailwind for spacing, layout, responsive (`md:`, `lg:`)
- Avoid conflicting class names (use `cn()` utility)

### Icons

- Replace all `lucide-react` imports with Radix UI icons
- Radix UI provides `@radix-ui/icons`
- Usage: `import { CheckIcon } from '@radix-ui/react-icons';`

---

## Integration Points

### Form Validation

- Keep Zod for schema validation
- Integrate with Radix UI Input/Select components
- Maintain React Hook Form for state management
- Display validation errors with Radix UI components

### Payments (Mercado Pago)

- No changes to payment logic
- Update UI only (buttons, status displays, modals)
- Maintain existing checkout flow

### Chat

- No changes to Socket.io logic
- Update message display with Radix UI components
- Maintain real-time updates

### Database / API

- No changes to Prisma queries
- No changes to API routes
- Only UI components affected

---

## Success Criteria

✅ All public routes render correctly  
✅ All authenticated routes render correctly  
✅ All admin routes render correctly  
✅ Zero functional regressions:

- User registration and login work
- Activity registration and payment flow works
- Chat sends/receives messages
- Admin forms create and manage content
- Accounting reports generate correctly

✅ Theme consistent across all pages  
✅ Mobile responsive on all pages  
✅ Dark mode works (if enabled)  
✅ Build succeeds  
✅ Tests pass  
✅ No TypeScript errors

---

## Risks & Mitigations

| Risk                     | Mitigation                                 |
| ------------------------ | ------------------------------------------ |
| Big scope (many pages)   | Staged approach reduces risk per step      |
| Radix UI API differences | Wrapper components abstract differences    |
| Form validation breakage | Test all forms after each step             |
| Payment flow breaks      | Verify checkout end-to-end in step 4       |
| Dark mode conflicts      | Test both light and dark modes             |
| Icon missing             | Have fallback or find Radix UI equivalent  |
| Performance regression   | Monitor bundle size; Radix UI is optimized |

---

## Dependencies to Install/Remove

**Install:**

```bash
npm install @radix-ui/themes @radix-ui/icons
```

**Remove:**

```bash
npm uninstall lucide-react
```

**Keep:**

```
@radix-ui/react-dialog
@radix-ui/react-dropdown-menu
@radix-ui/react-select
@radix-ui/react-popover
@radix-ui/react-tabs
@radix-ui/react-checkbox
@radix-ui/react-radio-group
... (other Radix UI primitives if needed)
```

---

## Rollback Plan

If critical issues arise:

1. Revert to `main` branch
2. Each step is isolated, so failures don't cascade
3. Keep git history clean with small, reviewable commits

---

## Questions for Implementation

1. **Mountain colors:** What exact hex codes or Radix UI built-in palette do you prefer? (e.g., `iris`, `grass`, `sky`)
2. **Dark mode:** Should the app support dark mode? Default to light or detect OS preference?
3. **Custom fonts:** Any custom fonts for Hualas branding, or use Radix UI defaults?
4. **Animations:** Keep Tailwind's `tailwindcss-animate` or use Radix UI's animations?
5. **Admin only:** Are admin pages (users, forms, accounting) only for ADMIN/SUPER_ADMIN, or are there other roles?

---

## Next Steps

1. ✅ User approves this spec
2. → Invoke `writing-plans` skill to create detailed implementation plan
3. → Execute 6 steps in sequence
4. → Test after each step
5. → Create PR for review
6. → Merge to main after tests pass
