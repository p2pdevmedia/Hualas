# Radix UI Themes Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate Hualas UI from Tailwind CSS to Radix UI Themes (100% coverage) across all pages while maintaining functionality and using mountain-themed colors (greens/blues).

**Architecture:** Layer-by-layer staged migration (6 steps): Install Radix UI and configure theme → Create wrapper components for base Radix components → Update layout (Navbar/Footer) → Migrate public pages → Migrate user pages → Migrate admin pages. Each step is independent and testable.

**Tech Stack:** Radix UI Themes, Radix UI Icons, Tailwind CSS (utilities only), Next.js 14, React 18, TypeScript

---

## File Structure Overview

```
src/
├── lib/
│   └── theme.ts                          (NEW: Radix UI theme config)
├── components/
│   ├── ui/
│   │   ├── button.tsx                    (NEW: Radix Button wrapper)
│   │   ├── input.tsx                     (NEW: Radix TextField wrapper)
│   │   ├── select.tsx                    (NEW: Radix Select wrapper)
│   │   ├── textarea.tsx                  (NEW: Radix TextArea wrapper)
│   │   ├── dialog.tsx                    (NEW: Radix Dialog wrapper)
│   │   ├── dropdown.tsx                  (NEW: Radix DropdownMenu wrapper)
│   │   ├── popover.tsx                   (NEW: Radix Popover wrapper)
│   │   ├── card.tsx                      (NEW: Radix Card wrapper)
│   │   ├── table.tsx                     (NEW: Radix Table wrapper)
│   │   ├── tabs.tsx                      (NEW: Radix Tabs wrapper)
│   │   ├── checkbox.tsx                  (NEW: Radix Checkbox wrapper)
│   │   ├── radio.tsx                     (NEW: Radix RadioGroup wrapper)
│   │   ├── label.tsx                     (NEW: Radix Label wrapper)
│   │   └── tooltip.tsx                   (NEW: Radix Tooltip wrapper)
│   ├── navbar.tsx                        (MODIFY: Radix UI redesign)
│   ├── footer.tsx                        (MODIFY: Radix UI redesign)
│   ├── providers.tsx                     (MODIFY: Add Radix Theme)
│   └── ...
├── app/
│   ├── layout.tsx                        (MODIFY: Add Theme wrapper)
│   ├── globals.css                       (MODIFY: Radix imports + Tailwind config)
│   ├── page.tsx                          (MODIFY: Redesign with Radix)
│   ├── login/page.tsx                    (MODIFY: Redesign with Radix)
│   ├── register/page.tsx                 (MODIFY: Redesign with Radix)
│   ├── contact/page.tsx                  (MODIFY: Redesign with Radix)
│   ├── activities/                       (MODIFY: All pages redesigned)
│   ├── profile/                          (MODIFY: All pages redesigned)
│   ├── chat/                             (MODIFY: Pages redesigned)
│   ├── my-activities/page.tsx            (MODIFY: Redesigned)
│   ├── admin/                            (MODIFY: All pages redesigned)
│   ├── accounting/                       (MODIFY: All pages redesigned)
│   └── ...
└── ...
```

---

# STEP 1: Setup Radix UI + Theme Configuration

## Task 1.1: Install Radix UI Themes and Icons

**Files:**

- Modify: `package.json`

- [ ] **Step 1: Add Radix UI Themes and Icons to dependencies**

```bash
npm install @radix-ui/themes @radix-ui/icons
```

Verify it added to `package.json`:

```json
{
  "dependencies": {
    "@radix-ui/themes": "^2.x.x",
    "@radix-ui/icons": "^1.x.x",
    ...
  }
}
```

- [ ] **Step 2: Remove lucide-react**

```bash
npm uninstall lucide-react
```

- [ ] **Step 3: Install dependencies**

```bash
npm install
```

Expected: No errors, node_modules updated.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: add Radix UI Themes and Icons, remove lucide-react"
```

---

## Task 1.2: Create Radix UI Theme Configuration

**Files:**

- Create: `src/lib/theme.ts`

- [ ] **Step 1: Create theme configuration file**

```typescript
// src/lib/theme.ts
// Mountain-themed colors for Hualas (greens/blues)

export const hualasTheme = {
  // Primary: Mountain green
  accent: 'grass', // Radix UI built-in: grass green

  // Secondary: Mountain blue
  // We'll use 'sky' for secondary

  // Neutrals: Grays
  gray: 'mauve', // Radix UI built-in: neutral gray

  // Dark mode support
  appearance: 'light' as const, // or 'dark', or 'inherit'

  // Scaling
  scaling: '100%',

  // Radius
  radius: 'medium',
};

// Export for use in layout
export default hualasTheme;
```

- [ ] **Step 2: Verify file exists**

```bash
cat src/lib/theme.ts
```

Expected: File contains theme config.

- [ ] **Step 3: Commit**

```bash
git add src/lib/theme.ts
git commit -m "config: add Radix UI theme configuration (mountain green/blue)"
```

---

## Task 1.3: Update Root Layout to Wrap with Theme Provider

**Files:**

- Modify: `src/app/layout.tsx` (lines 1-50)

- [ ] **Step 1: Read current layout**

```bash
head -50 src/app/layout.tsx
```

- [ ] **Step 2: Update imports and add Theme wrapper**

Look for the root layout function. Update it to wrap children with `<Theme>`:

```typescript
// src/app/layout.tsx (beginning of file)

import type { Metadata } from 'next';
import { Theme } from '@radix-ui/themes';
import '@radix-ui/themes/styles.css'; // Add this import for Radix styles
import './globals.css';
import { Providers } from '@/components/providers';
import Navbar from '@/components/navbar';
import Footer from '@/components/footer';

export const metadata: Metadata = {
  title: 'Hualas - Club Management',
  description: 'Mountain club management system',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <Theme appearance="light" accentColor="grass" grayColor="mauve">
          <Providers>
            <Navbar />
            <main className="min-h-screen">
              {children}
            </main>
            <Footer />
          </Providers>
        </Theme>
      </body>
    </html>
  );
}
```

**Key changes:**

- Import `Theme` from `@radix-ui/themes`
- Import Radix UI theme styles (`@radix-ui/themes/styles.css`)
- Wrap `<Providers>` with `<Theme>` component
- Set `accentColor="grass"` (mountain green) and `grayColor="mauve"` (neutral gray)

- [ ] **Step 3: Update globals.css to import Radix styles at the top**

Add to the very beginning of `src/app/globals.css`:

```css
/* Radix UI Themes */
@import '@radix-ui/themes/styles.css';

/* Rest of existing styles below */
...
```

- [ ] **Step 4: Build to verify no TypeScript errors**

```bash
npm run build
```

Expected: Build succeeds, no errors about Theme component.

- [ ] **Step 5: Commit**

```bash
git add src/app/layout.tsx src/app/globals.css
git commit -m "feat: add Radix UI Theme provider to root layout"
```

---

## Task 1.4: Verify Theme is Applied Globally

**Files:**

- Test: Home page visual

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Open browser to http://localhost:3000**

Expected: Home page loads. You should see Radix UI theme colors applied (though components aren't migrated yet, the theme is active).

- [ ] **Step 3: Verify no console errors**

Open DevTools (F12) → Console tab. Should see no errors about Theme or @radix-ui imports.

- [ ] **Step 4: Stop dev server**

```bash
Ctrl+C
```

---

**Checkpoint:** ✅ Radix UI installed, theme configured, root layout wrapped. Ready for Step 2 (base components).

---

# STEP 2: Migrate Base Components

## Task 2.1: Create Button Component Wrapper

**Files:**

- Create: `src/components/ui/button.tsx`

- [ ] **Step 1: Create button wrapper**

```typescript
// src/components/ui/button.tsx
'use client';

import React from 'react';
import { Button as RadixButton } from '@radix-ui/themes';
import { cn } from '@/lib/utils';

export interface ButtonProps
  extends React.ComponentPropsWithoutRef<typeof RadixButton> {
  variant?: 'solid' | 'soft' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export function Button({
  className,
  variant = 'solid',
  size = 'md',
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <RadixButton
      variant={variant}
      size={size}
      disabled={disabled || loading}
      className={cn(className)}
      {...props}
    >
      {loading ? '...' : children}
    </RadixButton>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/button.tsx
git commit -m "feat: add Button component wrapper for Radix UI"
```

---

## Task 2.2: Create Input Component Wrapper

**Files:**

- Create: `src/components/ui/input.tsx`

- [ ] **Step 1: Create input wrapper**

```typescript
// src/components/ui/input.tsx
'use client';

import React from 'react';
import { TextField } from '@radix-ui/themes';
import { cn } from '@/lib/utils';

export interface InputProps
  extends React.ComponentPropsWithoutRef<typeof TextField.Input> {
  label?: string;
  error?: string;
  helperText?: string;
}

export function Input({
  className,
  label,
  error,
  helperText,
  ...props
}: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium mb-1">
          {label}
        </label>
      )}
      <TextField.Input
        className={cn('w-full', className)}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-600 mt-1">{error}</p>
      )}
      {helperText && !error && (
        <p className="text-sm text-gray-500 mt-1">{helperText}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/input.tsx
git commit -m "feat: add Input component wrapper for Radix UI"
```

---

## Task 2.3: Create Select Component Wrapper

**Files:**

- Create: `src/components/ui/select.tsx`

- [ ] **Step 1: Create select wrapper**

```typescript
// src/components/ui/select.tsx
'use client';

import React from 'react';
import {
  Select as RadixSelect,
  type SelectContentProps,
} from '@radix-ui/themes';
import { cn } from '@/lib/utils';

export interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

export function Select({
  value,
  onValueChange,
  label,
  placeholder,
  error,
  children,
  className,
}: SelectProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium mb-1">
          {label}
        </label>
      )}
      <RadixSelect.Root value={value} onValueChange={onValueChange}>
        <RadixSelect.Trigger
          className={cn('w-full', className)}
          placeholder={placeholder}
        />
        <RadixSelect.Content>
          {children}
        </RadixSelect.Content>
      </RadixSelect.Root>
      {error && (
        <p className="text-sm text-red-600 mt-1">{error}</p>
      )}
    </div>
  );
}

export const SelectItem = RadixSelect.Item;
export const SelectGroup = RadixSelect.Group;
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/select.tsx
git commit -m "feat: add Select component wrapper for Radix UI"
```

---

## Task 2.4: Create Dialog Component Wrapper

**Files:**

- Create: `src/components/ui/dialog.tsx`

- [ ] **Step 1: Create dialog wrapper**

```typescript
// src/components/ui/dialog.tsx
'use client';

import React from 'react';
import { Dialog as RadixDialog } from '@radix-ui/themes';
import { cn } from '@/lib/utils';

export interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function Dialog({
  open,
  onOpenChange,
  title,
  children,
  className,
}: DialogProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Content className={cn(className)}>
        {title && (
          <RadixDialog.Title>{title}</RadixDialog.Title>
        )}
        {children}
      </RadixDialog.Content>
    </RadixDialog.Root>
  );
}

export const DialogTrigger = RadixDialog.Trigger;
export const DialogClose = RadixDialog.Close;
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/dialog.tsx
git commit -m "feat: add Dialog component wrapper for Radix UI"
```

---

## Task 2.5: Create Remaining Base Components (Batch)

**Files:**

- Create: `src/components/ui/textarea.tsx`
- Create: `src/components/ui/label.tsx`
- Create: `src/components/ui/card.tsx`
- Create: `src/components/ui/checkbox.tsx`

- [ ] **Step 1: Create textarea wrapper**

```typescript
// src/components/ui/textarea.tsx
'use client';

import React from 'react';
import { TextArea as RadixTextArea } from '@radix-ui/themes';
import { cn } from '@/lib/utils';

export interface TextareaProps
  extends React.ComponentPropsWithoutRef<typeof RadixTextArea> {
  label?: string;
  error?: string;
}

export function Textarea({
  className,
  label,
  error,
  ...props
}: TextareaProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium mb-1">
          {label}
        </label>
      )}
      <RadixTextArea
        className={cn('w-full', className)}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-600 mt-1">{error}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create label wrapper**

```typescript
// src/components/ui/label.tsx
'use client';

import React from 'react';
import { Label as RadixLabel } from '@radix-ui/themes';
import { cn } from '@/lib/utils';

export interface LabelProps
  extends React.ComponentPropsWithoutRef<typeof RadixLabel> {}

export function Label({ className, ...props }: LabelProps) {
  return (
    <RadixLabel className={cn(className)} {...props} />
  );
}
```

- [ ] **Step 3: Create card wrapper**

```typescript
// src/components/ui/card.tsx
'use client';

import React from 'react';
import { Card as RadixCard } from '@radix-ui/themes';
import { cn } from '@/lib/utils';

export interface CardProps
  extends React.ComponentPropsWithoutRef<typeof RadixCard> {}

export function Card({ className, ...props }: CardProps) {
  return (
    <RadixCard className={cn(className)} {...props} />
  );
}
```

- [ ] **Step 4: Create checkbox wrapper**

```typescript
// src/components/ui/checkbox.tsx
'use client';

import React from 'react';
import { Checkbox as RadixCheckbox } from '@radix-ui/themes';
import { cn } from '@/lib/utils';

export interface CheckboxProps
  extends React.ComponentPropsWithoutRef<typeof RadixCheckbox> {
  label?: string;
}

export function Checkbox({
  className,
  label,
  id,
  ...props
}: CheckboxProps) {
  return (
    <div className="flex items-center gap-2">
      <RadixCheckbox
        id={id}
        className={cn(className)}
        {...props}
      />
      {label && (
        <label htmlFor={id} className="text-sm cursor-pointer">
          {label}
        </label>
      )}
    </div>
  );
}
```

- [ ] **Step 5: TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Create index file for easy imports**

```typescript
// src/components/ui/index.ts
export { Button, type ButtonProps } from './button';
export { Input, type InputProps } from './input';
export { Select, SelectItem, SelectGroup, type SelectProps } from './select';
export { Textarea, type TextareaProps } from './textarea';
export { Label, type LabelProps } from './label';
export { Card, type CardProps } from './card';
export { Checkbox, type CheckboxProps } from './checkbox';
export { Dialog, DialogTrigger, DialogClose, type DialogProps } from './dialog';
```

- [ ] **Step 7: Commit all base components**

```bash
git add src/components/ui/
git commit -m "feat: add base UI component wrappers for Radix UI (input, textarea, label, card, checkbox, dialog)"
```

---

**Checkpoint:** ✅ All base components created and wrapped. Ready for Step 3 (layout).

---

# STEP 3: Migrate Layout Components (Navbar & Footer)

## Task 3.1: Update Navbar with Radix UI

**Files:**

- Modify: `src/components/navbar.tsx` (full file)

- [ ] **Step 1: Read current navbar**

```bash
wc -l src/components/navbar.tsx
```

- [ ] **Step 2: Backup and rewrite navbar with Radix UI**

Replace entire file with Radix UI version:

```typescript
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Box, Flex, Button as RadixButton, DropdownMenu, Avatar } from '@radix-ui/themes';
import { HamburgerMenuIcon, ExitIcon } from '@radix-ui/react-icons';
import {
  useTranslation,
  useLang,
  availableLanguages,
} from './language-provider';
import type { Lang } from '@/lib/i18n';
import { Button } from './ui/button';

const IPFS_HASH = 'QmToPhMQe1dqt7aVAoPumwkqyRhR2EjnvCmw1stPjCpvq3';
const defaultLogo = `https://gateway.pinata.cloud/ipfs/${IPFS_HASH}/`;

const AVATAR_COLORS = [
  'tomato',
  'orange',
  'amber',
  'grass',
  'sky',
  'violet',
  'pink',
  'plum',
];

function avatarColor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function initials(name: string | null | undefined) {
  const parts = (name ?? '?').trim().split(/\s+/);
  return (parts[0]?.[0] ?? '?').concat(parts[1]?.[0] ?? '').toUpperCase();
}

export default function Navbar() {
  const { data: session } = useSession();
  const role = session?.user.role;
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';
  const isSuperAdmin = role === 'SUPER_ADMIN';
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const t = useTranslation();
  const lang = useLang();

  return (
    <Box
      as="nav"
      className="border-b border-gray-200 bg-white"
      py="3"
    >
      <Flex
        justify="between"
        align="center"
        px="4"
        maxWidth="1200px"
        margin="0 auto"
      >
        {/* Logo */}
        <Link href="/">
          <Image
            src={defaultLogo}
            alt="Hualas Logo"
            width={40}
            height={40}
            priority
          />
        </Link>

        {/* Desktop Menu */}
        <Flex gap="4" className="hidden md:flex" align="center">
          <Link href="/activities" className="text-sm font-medium hover:text-grass-900">
            {t.activities}
          </Link>
          {isAdmin && (
            <>
              <Link href="/admin/users" className="text-sm font-medium hover:text-grass-900">
                {t.users}
              </Link>
              <Link href="/admin/forms" className="text-sm font-medium hover:text-grass-900">
                {t.forms}
              </Link>
              {isSuperAdmin && (
                <Link href="/accounting" className="text-sm font-medium hover:text-grass-900">
                  {t.accounting}
                </Link>
              )}
            </>
          )}
        </Flex>

        {/* Right Section: Auth + Language */}
        <Flex gap="3" align="center">
          {/* Language Dropdown */}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <Button variant="ghost" size="sm">
                {lang.toUpperCase()}
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
              {availableLanguages.map((availLang) => (
                <DropdownMenu.Item key={availLang}>
                  <Link href={`?lang=${availLang}`}>
                    {availLang === 'es' ? 'Español' : 'English'}
                  </Link>
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Root>

          {/* Auth Section */}
          {session ? (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <Avatar
                  src={session.user.image || undefined}
                  fallback={initials(session.user.name)}
                  color={avatarColor(session.user.id) as any}
                  className="cursor-pointer"
                />
              </DropdownMenu.Trigger>
              <DropdownMenu.Content align="end">
                <DropdownMenu.Item>
                  <Link href="/profile">{t.profile}</Link>
                </DropdownMenu.Item>
                <DropdownMenu.Item>
                  <Link href="/chat">{t.messages}</Link>
                </DropdownMenu.Item>
                {isAdmin && (
                  <DropdownMenu.Item>
                    <Link href="/admin/users">{t.admin}</Link>
                  </DropdownMenu.Item>
                )}
                <DropdownMenu.Separator />
                <DropdownMenu.Item
                  onClick={() => signOut()}
                  className="text-red-600"
                >
                  <Flex gap="2" align="center">
                    <ExitIcon width={16} height={16} />
                    {t.logout}
                  </Flex>
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Root>
          ) : (
            <Link href="/login">
              <Button variant="solid" size="sm">
                {t.login}
              </Button>
            </Link>
          )}
        </Flex>

        {/* Mobile Menu Trigger */}
        <RadixButton
          variant="ghost"
          size="1"
          className="md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <HamburgerMenuIcon />
        </RadixButton>
      </Flex>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <Box className="md:hidden border-t border-gray-200 p-4">
          <Flex direction="column" gap="2">
            <Link href="/activities" className="text-sm font-medium">
              {t.activities}
            </Link>
            {isAdmin && (
              <>
                <Link href="/admin/users" className="text-sm font-medium">
                  {t.users}
                </Link>
                <Link href="/admin/forms" className="text-sm font-medium">
                  {t.forms}
                </Link>
              </>
            )}
          </Flex>
        </Box>
      )}
    </Box>
  );
}
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: No errors (may have warnings about types, fix as needed).

- [ ] **Step 4: Commit navbar update**

```bash
git add src/components/navbar.tsx
git commit -m "feat: redesign Navbar with Radix UI components"
```

---

## Task 3.2: Update Footer with Radix UI

**Files:**

- Modify: `src/components/footer.tsx`

- [ ] **Step 1: Read current footer**

```bash
head -50 src/components/footer.tsx
```

- [ ] **Step 2: Rewrite footer with Radix UI**

```typescript
'use client';

import Link from 'next/link';
import { Box, Flex, Text } from '@radix-ui/themes';
import { useTranslation } from './language-provider';

export default function Footer() {
  const t = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <Box
      as="footer"
      className="border-t border-gray-200 bg-gray-50 mt-8"
      py="6"
      px="4"
    >
      <Flex
        direction={{ initial: 'column', sm: 'row' }}
        justify="between"
        gap="6"
        maxWidth="1200px"
        margin="0 auto"
      >
        {/* Info Section */}
        <Flex direction="column" gap="2">
          <Text weight="bold" size="3">
            Hualas
          </Text>
          <Text size="1" className="text-gray-600">
            Club de montaña en San Martín de los Andes
          </Text>
        </Flex>

        {/* Links Section */}
        <Flex direction="column" gap="2">
          <Text weight="bold" size="2">
            {t.links}
          </Text>
          <Flex direction="column" gap="1">
            <Link
              href="/activities"
              className="text-sm text-grass-600 hover:text-grass-900"
            >
              {t.activities}
            </Link>
            <Link
              href="/contact"
              className="text-sm text-grass-600 hover:text-grass-900"
            >
              {t.contact}
            </Link>
          </Flex>
        </Flex>

        {/* Copyright */}
        <Flex direction="column" justify="end" align={{ initial: 'start', sm: 'end' }}>
          <Text size="1" className="text-gray-500">
            © {currentYear} Hualas. All rights reserved.
          </Text>
        </Flex>
      </Flex>
    </Box>
  );
}
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit footer update**

```bash
git add src/components/footer.tsx
git commit -m "feat: redesign Footer with Radix UI components"
```

---

**Checkpoint:** ✅ Navbar and Footer redesigned with Radix UI. Ready for Step 4 (public pages).

---

# STEP 4: Migrate Public Pages

## Task 4.1: Update Home Page

**Files:**

- Modify: `src/app/page.tsx`

- [ ] **Step 1: Read current home page**

```bash
head -80 src/app/page.tsx
```

- [ ] **Step 2: Rewrite home page with Radix UI**

```typescript
'use client';

import Link from 'next/link';
import { Heading, Text, Button, Box, Flex, Container } from '@radix-ui/themes';
import { useSession } from 'next-auth/react';
import { useTranslation } from '@/components/language-provider';

export default function Home() {
  const { data: session } = useSession();
  const t = useTranslation();

  return (
    <Box className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <Box
        className="bg-gradient-to-r from-grass-50 to-sky-50"
        py="8"
        px="4"
      >
        <Container maxWidth="4" mx="auto" className="text-center">
          <Heading size="8" weight="bold" className="mb-4">
            {t.welcomeHualas}
          </Heading>
          <Text size="4" className="text-gray-600 mb-8">
            Club de montaña comunitario en San Martín de los Andes, Patagonia
          </Text>

          <Flex gap="4" justify="center">
            {session ? (
              <>
                <Link href="/activities">
                  <Button variant="solid" size="lg">
                    {t.browseActivities}
                  </Button>
                </Link>
                <Link href="/my-activities">
                  <Button variant="outline" size="lg">
                    {t.myActivities}
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="solid" size="lg">
                    {t.login}
                  </Button>
                </Link>
                <Link href="/register">
                  <Button variant="outline" size="lg">
                    {t.register}
                  </Button>
                </Link>
              </>
            )}
          </Flex>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="4" mx="auto" py="8" px="4">
        <Heading size="6" weight="bold" className="mb-8 text-center">
          Nuestros Servicios
        </Heading>

        <Flex gap="6" className="grid grid-cols-1 md:grid-cols-3">
          {/* Feature 1 */}
          <Box
            className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
          >
            <Heading size="4" weight="bold" className="mb-2">
              Actividades
            </Heading>
            <Text size="2" className="text-gray-600">
              Explora cursos, salidas y eventos organizados por expertos en montaña
            </Text>
          </Box>

          {/* Feature 2 */}
          <Box
            className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
          >
            <Heading size="4" weight="bold" className="mb-2">
              Comunidad
            </Heading>
            <Text size="2" className="text-gray-600">
              Conecta con otros miembros, comparte experiencias y aprende juntos
            </Text>
          </Box>

          {/* Feature 3 */}
          <Box
            className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
          >
            <Heading size="4" weight="bold" className="mb-2">
              Gestión
            </Heading>
            <Text size="2" className="text-gray-600">
              Sistema completo de inscripciones, pagos y administración de eventos
            </Text>
          </Box>
        </Flex>
      </Container>

      {/* CTA Section */}
      <Box className="bg-grass-50 py="8" px="4" className="flex-grow flex items-center">
        <Container maxWidth="4" mx="auto" className="text-center">
          <Heading size="6" weight="bold" className="mb-4">
            ¿Listo para unirte?
          </Heading>
          {!session && (
            <Link href="/register">
              <Button variant="solid" size="lg" color="grass">
                Registrarse Ahora
              </Button>
            </Link>
          )}
        </Container>
      </Box>
    </Box>
  );
}
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit home page**

```bash
git add src/app/page.tsx
git commit -m "feat: redesign Home page with Radix UI"
```

---

## Task 4.2: Update Login Page

**Files:**

- Modify: `src/app/login/page.tsx`

- [ ] **Step 1: Rewrite login page**

```typescript
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Box, Container, Heading, Text } from '@radix-ui/themes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    if (result?.ok) {
      router.push('/');
    } else {
      setError('Email o contraseña inválidos');
    }

    setLoading(false);
  }

  return (
    <Box className="min-h-screen flex items-center justify-center bg-gradient-to-r from-grass-50 to-sky-50">
      <Container maxWidth="2" px="4">
        <Box className="bg-white rounded-lg shadow-lg p-8">
          <Heading size="6" weight="bold" className="mb-2 text-center">
            Iniciar Sesión
          </Heading>
          <Text size="2" className="text-gray-600 text-center mb-6">
            Accede a tu cuenta de Hualas
          </Text>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Box className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </Box>
            )}

            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
            />

            <Input
              label="Contraseña"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />

            <Button
              type="submit"
              variant="solid"
              className="w-full"
              disabled={loading}
              loading={loading}
            >
              {loading ? 'Iniciando...' : 'Iniciar Sesión'}
            </Button>
          </form>

          <Text size="2" className="text-center mt-6">
            ¿No tienes cuenta?{' '}
            <Link href="/register" className="text-grass-600 hover:text-grass-900 font-medium">
              Regístrate aquí
            </Link>
          </Text>
        </Box>
      </Container>
    </Box>
  );
}
```

- [ ] **Step 2: TypeScript check and commit**

```bash
npx tsc --noEmit
git add src/app/login/page.tsx
git commit -m "feat: redesign Login page with Radix UI"
```

---

## Task 4.3: Update Register Page

**Files:**

- Modify: `src/app/register/page.tsx`

- [ ] **Step 1: Rewrite register page with Radix UI**

```typescript
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Box, Container, Heading, Text } from '@radix-ui/themes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      if (res.ok) {
        router.push('/login?registered=true');
      } else {
        const data = await res.json();
        setError(data.message || 'Error al registrarse');
      }
    } catch (err) {
      setError('Error de conexión');
    }

    setLoading(false);
  }

  return (
    <Box className="min-h-screen flex items-center justify-center bg-gradient-to-r from-grass-50 to-sky-50">
      <Container maxWidth="2" px="4">
        <Box className="bg-white rounded-lg shadow-lg p-8">
          <Heading size="6" weight="bold" className="mb-2 text-center">
            Crear Cuenta
          </Heading>
          <Text size="2" className="text-gray-600 text-center mb-6">
            Únete a la comunidad de Hualas
          </Text>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Box className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </Box>
            )}

            <Input
              label="Nombre Completo"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Juan Pérez"
              required
            />

            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
            />

            <Input
              label="Contraseña"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />

            <Button
              type="submit"
              variant="solid"
              className="w-full"
              disabled={loading}
              loading={loading}
            >
              {loading ? 'Registrando...' : 'Crear Cuenta'}
            </Button>
          </form>

          <Text size="2" className="text-center mt-6">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="text-grass-600 hover:text-grass-900 font-medium">
              Inicia sesión
            </Link>
          </Text>
        </Box>
      </Container>
    </Box>
  );
}
```

- [ ] **Step 2: TypeScript check and commit**

```bash
npx tsc --noEmit
git add src/app/register/page.tsx
git commit -m "feat: redesign Register page with Radix UI"
```

---

## Task 4.4: Update Contact Page

**Files:**

- Modify: `src/app/contact/page.tsx`

- [ ] **Step 1: Rewrite contact page**

```typescript
'use client';

import { useState } from 'react';
import { Box, Container, Heading, Text } from '@radix-ui/themes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    // In a real app, you'd send this to an API
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setSubmitted(true);
    setName('');
    setEmail('');
    setMessage('');
    setLoading(false);

    setTimeout(() => setSubmitted(false), 3000);
  }

  return (
    <Box className="min-h-screen bg-gradient-to-r from-grass-50 to-sky-50 py-8">
      <Container maxWidth="2" px="4">
        <Heading size="7" weight="bold" className="mb-2 text-center">
          Contacto
        </Heading>
        <Text size="3" className="text-gray-600 text-center mb-8">
          ¿Preguntas? Nos encantaría escucharte
        </Text>

        <Box className="bg-white rounded-lg shadow-lg p-8">
          {submitted && (
            <Box className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-6">
              ¡Mensaje enviado! Nos pondremos en contacto pronto.
            </Box>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Nombre"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre"
              required
            />

            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
            />

            <Textarea
              label="Mensaje"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tu mensaje aquí..."
              rows={6}
              required
            />

            <Button
              type="submit"
              variant="solid"
              className="w-full"
              disabled={loading}
              loading={loading}
            >
              {loading ? 'Enviando...' : 'Enviar Mensaje'}
            </Button>
          </form>
        </Box>
      </Container>
    </Box>
  );
}
```

- [ ] **Step 2: TypeScript check and commit**

```bash
npx tsc --noEmit
git add src/app/contact/page.tsx
git commit -m "feat: redesign Contact page with Radix UI"
```

---

**Checkpoint:** ✅ All public pages (Home, Login, Register, Contact) redesigned with Radix UI. Ready for Step 5 (user pages).

---

# STEP 5: Migrate User Pages (Profile, Chat, My Activities)

**Note:** Due to length, this step covers the key files. Implementation follows same pattern as Step 4.

## Task 5.1: Update Profile Page

**Files:**

- Modify: `src/app/profile/page.tsx`

- [ ] **Step 1-3:** Rewrite profile page to use Radix UI components instead of Tailwind

Replace all `className="..."` with Radix UI components (`<Box>`, `<Heading>`, `<Button>`, etc.). Use `Input` and `Textarea` wrappers from Step 2.

Example pattern:

```typescript
// OLD:
<div className="max-w-2xl mx-auto p-4">
  <h1 className="text-3xl font-bold mb-6">Perfil</h1>
  <button className="bg-blue-600 text-white px-4 py-2 rounded">Guardar</button>
</div>

// NEW:
<Container maxWidth="2" px="4">
  <Heading size="7" weight="bold" className="mb-6">Perfil</Heading>
  <Button variant="solid">Guardar</Button>
</Container>
```

- [ ] **Step 4: Build and verify**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/app/profile/
git commit -m "feat: redesign Profile page with Radix UI"
```

---

## Task 5.2: Update Chat Page

**Files:**

- Modify: `src/app/chat/page.tsx` and `src/app/chat/chat-client.tsx`

- [ ] **Steps 1-5:** Follow same pattern as Task 5.1

Replace Tailwind classes with Radix UI components.

```bash
git add src/app/chat/
git commit -m "feat: redesign Chat page with Radix UI"
```

---

## Task 5.3: Update My Activities Page

**Files:**

- Modify: `src/app/my-activities/page.tsx`

- [ ] **Steps 1-5:** Follow same pattern

```bash
git add src/app/my-activities/
git commit -m "feat: redesign My Activities page with Radix UI"
```

---

**Checkpoint:** ✅ User pages migrated. Ready for Step 6 (admin pages).

---

# STEP 6: Migrate Admin + Complex Pages

## Task 6.1-6.N: Admin Pages (Activities, Users, Forms, Accounting)

**Files to update:**

- `src/app/activities/page.tsx` and related forms
- `src/app/admin/users/page.tsx`
- `src/app/admin/forms/page.tsx`
- `src/app/accounting/page.tsx` and subpages

**Approach:** Follow same pattern as Steps 4-5. Replace all Tailwind classes with Radix UI components.

For complex components like tables, use the Radix UI Table wrapper created in Step 2.

Example (admin users list):

```typescript
import { Box, Heading, Table } from '@radix-ui/themes';

export default function UsersPage() {
  return (
    <Box>
      <Heading>Users</Heading>
      <Table.Root>
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeaderCell>Name</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Email</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Actions</Table.ColumnHeaderCell>
          </Table.Row>
        </Table.Header>
        {/* ... */}
      </Table.Root>
    </Box>
  );
}
```

- [ ] **Final Steps:**

```bash
# Build
npm run build

# All should pass with no errors
npm run lint

# Commit batch
git add src/app/activities/ src/app/admin/ src/app/accounting/
git commit -m "feat: redesign all admin and complex pages with Radix UI"
```

---

**Checkpoint:** ✅ All pages migrated to Radix UI Themes!

---

# Final Verification & Testing

## Task 7.1: Build and Test

- [ ] **Step 1: Full build**

```bash
npm run build
```

Expected: ✅ Build succeeds, no errors.

- [ ] **Step 2: Run tests**

```bash
npm test
```

Expected: ✅ All tests pass.

- [ ] **Step 3: Run linter**

```bash
npm run lint
```

Expected: ✅ No linting errors.

- [ ] **Step 4: Start dev server and manual test**

```bash
npm run dev
```

- [ ] **Step 5: Manual QA checklist**

- [ ] Navigate to home page → Radix UI theme applied ✓
- [ ] Login/Register pages render correctly ✓
- [ ] Profile page loads and form works ✓
- [ ] Activities list displays with Radix Table ✓
- [ ] Chat page real-time updates work ✓
- [ ] Admin users page renders correctly ✓
- [ ] Activity registration and payment flow works end-to-end ✓
- [ ] Forms submit correctly ✓
- [ ] Mobile responsive on all pages ✓
- [ ] Navbar/Footer display correctly on all pages ✓

- [ ] **Step 6: Commit final state**

```bash
git add -A
git commit -m "feat: complete Radix UI Themes migration (100% coverage)"
```

---

## Task 7.2: Create PR for Review

- [ ] **Step 1: Push branch**

```bash
git push -u origin feature/radix-ui
```

- [ ] **Step 2: Create GitHub PR**

```bash
gh pr create \
  --title "feat: Migrate UI to Radix UI Themes (100% coverage)" \
  --body "Complete migration to Radix UI Themes

## Summary
- All pages migrated from Tailwind CSS to Radix UI Themes
- Mountain theme (grass green + sky blue) configured
- All functionality preserved (payments, chat, forms, admin)
- Icons replaced lucide-react with Radix UI Icons
- Tailwind CSS retained for utilities only

## Testing
- ✅ Build succeeds
- ✅ All tests pass
- ✅ Manual QA on all pages
- ✅ Mobile responsive

## Files Changed
- 50+ components and pages updated
- New base UI components created
- Theme configuration added

Co-Authored-By: Claude <noreply@anthropic.com>" \
  --base main \
  --head feature/radix-ui
```

---

# Summary

**Total Steps:** 7 major tasks  
**Commits:** ~20 atomic commits  
**Files Created:** ~15 new component wrappers + theme config  
**Files Modified:** ~40 pages and components  
**Time Estimate:** 4-6 hours (depending on code complexity)

**Success Criteria (All must pass):**

- ✅ Build succeeds with no errors
- ✅ All tests pass
- ✅ No TypeScript errors
- ✅ All pages render with Radix UI Themes
- ✅ Theme colors (grass/sky) visible and consistent
- ✅ Mobile responsive
- ✅ All functionality works (auth, payments, chat, forms, admin)
- ✅ PR created and ready for review
