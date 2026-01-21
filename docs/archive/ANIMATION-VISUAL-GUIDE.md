# Animation Flow Visual Guide

## Homeowner Dashboard Animation Timeline

```
┌─────────────────────────────────────────────────────────────────┐
│                      HOMEOWNER VIEW (Mobile)                     │
└─────────────────────────────────────────────────────────────────┘

Timeline (0ms → 800ms):

    0ms                    FadeIn (direction: down)
     │                     ┌─────────────────────┐
     ▼                     │   Header Section    │
   ▓▓▓▓▓▓▓▓▓              │  - Name & Status    │
   ▓▓▓▓▓▓▓▓▓  Fade In     │  - Project Details  │
   ▓▓▓▓▓▓▓▓▓              │  - Expand Button    │
                          └─────────────────────┘
                          
   80ms                    StaggerContainer (delay: 0.08s)
     │                     ┌─────────────────────┐
     ▼                     │  Project Section    │ ← FadeIn (up)
   ▓▓▓▓▓▓                  │  4 Module Buttons   │
   ▓▓▓▓▓▓    Cascade      └─────────────────────┘
   ▓▓▓▓▓▓                           
                          
  160ms                    ┌─────────────────────┐
     │                     │ Quick Actions       │ ← FadeIn (up)
     ▼                     │  4 Action Buttons   │
   ▓▓▓▓▓▓                  └─────────────────────┘
   ▓▓▓▓▓▓                           
                          
  240ms                    ┌─────────────────────┐
     │                     │ Communication       │ ← FadeIn (up)
     ▼                     │  4 Comm Buttons     │
   ▓▓▓▓▓▓                  └─────────────────────┘
   ▓▓▓▓▓▓                           
                          
  320ms                    ┌─────────────────────┐
     │                     │   Financial         │ ← FadeIn (up)
     ▼                     │  2 Finance Buttons  │
   ▓▓▓▓▓▓                  └─────────────────────┘
   ▓▓▓▓▓▓                           
                          
  500ms   All animations complete!
```

---

## Admin Dashboard Animation Timeline

```
┌─────────────────────────────────────────────────────────────────┐
│                      ADMIN VIEW (Desktop)                        │
└─────────────────────────────────────────────────────────────────┘

Timeline (0ms → 600ms):

    0ms     StaggerContainer wraps entire layout
     │      
     │      ┌──────────────────────────────────────────────────┐
     ▼      │                                                  │
            │  LEFT SIDEBAR              RIGHT CONTENT         │
            │  ┌──────────────┐         ┌──────────────┐      │
    0ms     │  │              │  100ms  │              │      │
     ├──────┼─▶│  FadeIn      │    ├────▶│  FadeIn      │      │
     │      │  │  (right)     │    │    │  (up)        │      │
   ▓▓▓      │  │              │  ▓▓▓▓   │              │      │
   ▓▓▓ →    │  │ • Search     │  ▓▓▓▓→  │ • Tabs       │      │
   ▓▓▓      │  │ • Info Card  │  ▓▓▓▓   │ • Content    │      │
   ▓▓▓      │  │ • Contact    │  ▓▓▓▓   │              │      │
            │  └──────────────┘         └──────────────┘      │
            │                                                  │
            └──────────────────────────────────────────────────┘

  500ms   Layout animations complete!
```

---

## Tab Switching Animation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      TAB SWITCHING                               │
└─────────────────────────────────────────────────────────────────┘

User clicks "Tasks" tab while "Claims" is active:

┌─────────────────────────────────────────────────────────────────┐
│ SmoothHeightWrapper (measures content height)                   │
│                                                                  │
│  AnimatePresence (mode: "wait")                                 │
│  ┌────────────────────────────────────────────────────────────┐│
│  │ Step 1: Exit Animation (200ms)                             ││
│  │   AnimatedTabContent (tabKey: "claims")                    ││
│  │   ┌──────────────────────┐                                 ││
│  │   │    Claims Tab        │  opacity: 1 → 0                 ││
│  │   │    Content           │  y: 0 → -10px                   ││
│  │   │  ░░░░░░░░░░░░░░░░   │  ▓▓▓▓▓▓▓▓                       ││
│  │   │  ░░░░░░░░░░░░░░░░   │    ▓▓▓▓▓▓                       ││
│  │   │  ░░░░░░░░░░░░░░░░   │      ▓▓▓▓                       ││
│  │   └──────────────────────┘        ▓▓                       ││
│  │                                                             ││
│  │   Height animates: 800px → auto (300ms)                    ││
│  │   ║                                                         ││
│  │   ║  Smooth transition                                     ││
│  │   ▼                                                         ││
│  │                                                             ││
│  │ Step 2: Enter Animation (200ms)                            ││
│  │   AnimatedTabContent (tabKey: "tasks")                     ││
│  │   ┌──────────────────────┐                                 ││
│  │   │    Tasks Tab         │  opacity: 0 → 1                 ││
│  │   │    Content           │  y: 10px → 0                    ││
│  │   │  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓   │  ░░░░░░░░                       ││
│  │   │  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓   │    ░░░░░░                       ││
│  │   │  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓   │      ░░░░                       ││
│  │   └──────────────────────┘        ░░                       ││
│  └────────────────────────────────────────────────────────────┘│
│                                                                  │
│  Height animates: auto → 600px (300ms)                          │
└─────────────────────────────────────────────────────────────────┘

Total time: ~500ms (smooth, no layout jump!)
```

---

## Key Animation Properties

### Direction Mapping
```
┌────────────────────────────────────────┐
│         Animation Directions            │
├────────────────────────────────────────┤
│                                         │
│       ▲                                 │
│       │  "up"                           │
│       │  (from bottom)                  │
│       │                                 │
│ ◀─────┼─────▶                          │
│"right"│"left"                           │
│ (from │ (from right)                    │
│  left)│                                 │
│       │                                 │
│       │  "down"                         │
│       │  (from top)                     │
│       ▼                                 │
│                                         │
└────────────────────────────────────────┘
```

### Easing Curve (Snappy)
```
cubic-bezier(0.21, 0.47, 0.32, 0.98)

   1.0 │          ┌──────
       │        ┌─┘
       │      ┌─┘
   0.5 │    ┌─┘
       │  ┌─┘
       │┌─┘
   0.0 └──────────────────
       0.0            1.0

Characteristics:
✓ Fast start (acceleration)
✓ Smooth middle (cruise)
✓ Gentle stop (deceleration)
✓ Feels "snappy" and responsive
```

---

## Responsive Behavior

### Desktop (≥ 1024px)
```
┌─────────────────────────────────────────────────┐
│  Sidebar (Fixed)      Content (Grows)           │
│  ┌───────────┐       ┌──────────────────┐      │
│  │           │       │                  │      │
│  │ Homeowner │       │  Tab Content     │      │
│  │ Info      │       │  (Full Width)    │      │
│  │           │       │                  │      │
│  └───────────┘       └──────────────────┘      │
│   288px (w-72)         Flexible Width          │
└─────────────────────────────────────────────────┘
```

### Tablet (768px - 1023px)
```
┌─────────────────────────────────────┐
│  Sidebar (Full Width)                │
│  ┌────────────────────────────────┐ │
│  │     Homeowner Info             │ │
│  └────────────────────────────────┘ │
│                                      │
│  Content (Full Width)                │
│  ┌────────────────────────────────┐ │
│  │     Tab Content                │ │
│  └────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### Mobile (< 768px)
```
┌──────────────────────┐
│  Module Dashboard    │
│  ┌────────────────┐  │
│  │ Header Card    │  │
│  └────────────────┘  │
│                      │
│  ┌────────┬────────┐ │
│  │ Module │ Module │ │
│  │   1    │   2    │ │
│  ├────────┼────────┤ │
│  │ Module │ Module │ │
│  │   3    │   4    │ │
│  └────────┴────────┘ │
│                      │
│  (Cascading Cards)   │
└──────────────────────┘
```

---

## Component Hierarchy

```
App.tsx
 └─ Dashboard.tsx
     ├─ Mobile (< 768px)
     │   └─ HomeownerDashboardMobile
     │       └─ HomeownerDashboardView (animated) ✨
     │           ├─ FadeIn (Header)
     │           └─ StaggerContainer
     │               ├─ FadeIn (Project)
     │               ├─ FadeIn (Quick Actions)
     │               ├─ FadeIn (Communication)
     │               └─ FadeIn (Financial)
     │
     └─ Desktop (≥ 768px)
         └─ StaggerContainer ✨
             ├─ FadeIn (Sidebar)
             │   └─ Homeowner Info
             └─ FadeIn (Content)
                 └─ SmoothHeightWrapper ✨
                     └─ AnimatePresence
                         └─ AnimatedTabContent ✨
                             ├─ Claims Tab
                             ├─ Tasks Tab
                             ├─ Messages Tab
                             └─ ... (all tabs)
```

---

## Animation States

### Loading State
```
┌─────────────────────────┐
│  Initial: hidden        │
│  opacity: 0             │
│  transform: translateY  │
└─────────────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Animating: visible     │
│  opacity: 0 → 1         │
│  transform: moving → 0  │
└─────────────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Loaded: visible        │
│  opacity: 1             │
│  transform: none        │
└─────────────────────────┘
```

### Tab Switch State
```
┌─────────────────────────┐
│  Old Tab: visible       │
│  opacity: 1             │
└─────────────────────────┘
         │
         ▼ (mode: "wait")
┌─────────────────────────┐
│  Old Tab: exit          │
│  opacity: 1 → 0         │
│  transform: 0 → -10px   │
└─────────────────────────┘
         │
         ▼ (height smoothly transitions)
┌─────────────────────────┐
│  New Tab: enter         │
│  opacity: 0 → 1         │
│  transform: 10px → 0    │
└─────────────────────────┘
         │
         ▼
┌─────────────────────────┐
│  New Tab: visible       │
│  opacity: 1             │
└─────────────────────────┘
```

---

## Performance Optimization

### GPU Acceleration
```
Properties that trigger GPU:
✓ opacity
✓ transform (translate, scale, rotate)

Properties to avoid animating:
✗ width/height (triggers reflow)
✗ margin/padding (triggers reflow)
✗ top/left (use transform instead)

Exception: SmoothHeightWrapper
- Uses height animation intentionally
- Measured with ResizeObserver
- Acceptable for tab switching
```

### Animation Budget
```
Target: 60 FPS (16.67ms per frame)

Budget allocation:
- Layout: ~4ms
- Paint: ~4ms
- Composite: ~4ms
- JavaScript: ~4ms
────────────────────────
Total: 16ms ✓ Within budget
```

---

## Accessibility Considerations

### Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  /* Future enhancement */
  /* Disable or reduce animations */
  .motion-safe-only {
    animation: none !important;
    transition: none !important;
  }
}
```

### Focus Management
- Animations don't interfere with keyboard navigation
- Tab order maintained during transitions
- Focus traps work correctly in modals

---

## Legend

```
▓▓▓  = Animation in progress (fading in)
░░░  = Animation in progress (fading out)
─→   = Direction of animation
┌─┐  = Container boundaries
║    = Height transition
```
