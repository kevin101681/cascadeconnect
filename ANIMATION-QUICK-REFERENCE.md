# Animation Quick Reference Card

## Import Statements

```tsx
import { StaggerContainer, FadeIn, AnimatedTabContent } from '@/components/motion/MotionWrapper';
import { SmoothHeightWrapper } from '@/components/motion/SmoothHeightWrapper';
```

---

## Common Patterns

### 1. Staggered List/Grid

```tsx
<StaggerContainer staggerDelay={0.08}>
  {items.map((item) => (
    <FadeIn key={item.id} direction="up">
      <Card>{item.content}</Card>
    </FadeIn>
  ))}
</StaggerContainer>
```

### 2. Sidebar + Content Layout

```tsx
<StaggerContainer className="flex gap-6" staggerDelay={0.08}>
  <FadeIn direction="right" className="w-72">
    <Sidebar />
  </FadeIn>
  
  <FadeIn direction="up" delay={0.1} fullWidth>
    <MainContent />
  </FadeIn>
</StaggerContainer>
```

### 3. Tab Switching with Smooth Height

```tsx
<SmoothHeightWrapper className="min-h-[300px]">
  <AnimatePresence mode="wait">
    <AnimatedTabContent tabKey={activeTab}>
      {activeTab === 'tab1' && <Tab1Content />}
      {activeTab === 'tab2' && <Tab2Content />}
    </AnimatedTabContent>
  </AnimatePresence>
</SmoothHeightWrapper>
```

### 4. Hero Section

```tsx
<StaggerContainer>
  <FadeIn direction="down">
    <h1>Welcome</h1>
  </FadeIn>
  
  <FadeIn direction="up" delay={0.1}>
    <p>Description</p>
  </FadeIn>
  
  <FadeIn direction="up" delay={0.2}>
    <Button />
  </FadeIn>
</StaggerContainer>
```

### 5. Collapsible Section

```tsx
<SmoothHeightWrapper>
  {isExpanded && (
    <div>
      <p>Expandable content here</p>
      <p>Height animates automatically!</p>
    </div>
  )}
</SmoothHeightWrapper>
```

---

## Component API

### StaggerContainer

```tsx
interface StaggerContainerProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;  // Default: 0.1 (seconds)
  delay?: number;          // Initial delay before starting
}
```

**Example:**
```tsx
<StaggerContainer 
  staggerDelay={0.08}  // 80ms between each child
  delay={0.2}          // Wait 200ms before starting
>
  {children}
</StaggerContainer>
```

---

### FadeIn

```tsx
interface FadeInProps {
  children: ReactNode;
  className?: string;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  distance?: number;     // Slide distance in px (default: 20)
  delay?: number;        // Delay in seconds (default: 0)
  duration?: number;     // Animation duration (default: 0.5)
  fullWidth?: boolean;   // Make element full width
}
```

**Example:**
```tsx
<FadeIn 
  direction="up" 
  distance={30}
  delay={0.2}
  duration={0.6}
  fullWidth
>
  <Card />
</FadeIn>
```

---

### AnimatedTabContent

```tsx
interface AnimatedTabContentProps {
  children: ReactNode;
  tabKey: string;        // Unique key for this tab
  className?: string;
}
```

**Example:**
```tsx
<AnimatedTabContent tabKey="dashboard">
  <DashboardContent />
</AnimatedTabContent>
```

**Important:** Always wrap with `<AnimatePresence mode="wait">`

---

### SmoothHeightWrapper

```tsx
interface SmoothHeightWrapperProps {
  children: ReactNode;
  className?: string;
}
```

**Example:**
```tsx
<SmoothHeightWrapper className="min-h-[200px]">
  {content}
</SmoothHeightWrapper>
```

---

## Animation Directions

```tsx
// Visual guide
'up'    → ▲ (from bottom, default)
'down'  → ▼ (from top)
'left'  → ◀ (from right)
'right' → ▶ (from left)
'none'  →   (pure fade)
```

---

## Timing Recommendations

| Use Case | Delay | Duration | Stagger |
|----------|-------|----------|---------|
| Page Load | 0s | 0.5s | 0.08s |
| Tab Switch | 0s | 0.2s | - |
| Height Change | 0s | 0.3s | - |
| Sidebar | 0s | 0.5s | - |
| Content | 0.1s | 0.5s | - |
| Cards | 0s | 0.5s | 0.08s |
| Hero Section | 0s-0.3s | 0.6s | 0.1s |

---

## Common Issues & Solutions

### Issue: Dropdown gets clipped

**Problem:**
```tsx
<SmoothHeightWrapper>
  <Select> {/* Clipped! */}
    <SelectContent />
  </Select>
</SmoothHeightWrapper>
```

**Solution 1 - Portal:**
```tsx
<Select>
  <SelectContent portalled /> {/* Portals to body */}
</Select>
```

**Solution 2 - Min Height:**
```tsx
<SmoothHeightWrapper className="min-h-[400px]">
  <Select />
</SmoothHeightWrapper>
```

---

### Issue: Animation triggers too often

**Problem:**
```tsx
// Re-renders cause animation replay
<FadeIn>
  <Component data={data} /> {/* data changes */}
</FadeIn>
```

**Solution - Memoize:**
```tsx
const MemoizedComponent = React.memo(Component);

<FadeIn>
  <MemoizedComponent data={data} />
</FadeIn>
```

---

### Issue: Content flashes during tab switch

**Problem:**
```tsx
<AnimatePresence>
  {tab === 'a' && <TabA />}
  {tab === 'b' && <TabB />}
</AnimatePresence>
```

**Solution - Use mode="wait":**
```tsx
<AnimatePresence mode="wait">
  <AnimatedTabContent tabKey={tab}>
    {tab === 'a' && <TabA />}
    {tab === 'b' && <TabB />}
  </AnimatedTabContent>
</AnimatePresence>
```

---

### Issue: Height jumps on mobile

**Problem:**
```tsx
<SmoothHeightWrapper>
  {content} {/* Large on desktop, small on mobile */}
</SmoothHeightWrapper>
```

**Solution - Responsive min-height:**
```tsx
<SmoothHeightWrapper className="min-h-[200px] md:min-h-[400px]">
  {content}
</SmoothHeightWrapper>
```

---

## Performance Tips

### ✅ DO

```tsx
// Use GPU-accelerated properties
<FadeIn direction="up">    // ✓ Uses transform + opacity
<FadeIn duration={0.3}>    // ✓ Short, snappy animations
<StaggerContainer>         // ✓ One container, many children

// Memoize expensive content
const Content = React.memo(() => <ExpensiveComponent />);
```

### ❌ DON'T

```tsx
// Avoid animating layout properties directly
<motion.div animate={{ width: '100%' }}>  // ✗ Triggers reflow

// Avoid very long animations
<FadeIn duration={2}>  // ✗ Too slow, feels sluggish

// Avoid deep nesting
<StaggerContainer>
  <FadeIn>
    <StaggerContainer>  // ✗ Unnecessary nesting
      <FadeIn>
```

---

## Testing Checklist

When adding animations, verify:

- [ ] No layout shift on page load
- [ ] Smooth transitions between states
- [ ] No content flashing or flickering
- [ ] Works on mobile and desktop
- [ ] Animations complete within 1 second
- [ ] No janky scrolling
- [ ] Dropdowns/popovers not clipped
- [ ] Keyboard navigation still works
- [ ] Screen readers can access content

---

## Debug Tips

### Slow down animations for debugging

```tsx
// Temporarily increase duration
<FadeIn duration={2}>  // Normal: 0.5
  <Component />
</FadeIn>
```

### Disable animations for testing

```tsx
// Wrap in conditional
const enableAnimations = process.env.NODE_ENV !== 'test';

{enableAnimations ? (
  <FadeIn><Component /></FadeIn>
) : (
  <Component />
)}
```

### Log animation lifecycle

```tsx
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  onAnimationStart={() => console.log('Started')}
  onAnimationComplete={() => console.log('Completed')}
>
  <Content />
</motion.div>
```

---

## Browser Support

| Browser | Version | Support |
|---------|---------|---------|
| Chrome | 90+ | ✅ Full |
| Firefox | 88+ | ✅ Full |
| Safari | 14+ | ✅ Full |
| Edge | 90+ | ✅ Full |
| iOS Safari | 14+ | ✅ Full |
| Chrome Android | 90+ | ✅ Full |

**Note:** Framer Motion uses CSS transforms and will work in all modern browsers. For older browsers, animations gracefully fall back to instant transitions.

---

## Examples by Use Case

### Dashboard Page
```tsx
<StaggerContainer>
  <FadeIn direction="right" className="sidebar">
    <Sidebar />
  </FadeIn>
  <FadeIn direction="up" delay={0.1} fullWidth>
    <MainContent />
  </FadeIn>
</StaggerContainer>
```

### Product Grid
```tsx
<StaggerContainer className="grid grid-cols-3 gap-4">
  {products.map(product => (
    <FadeIn key={product.id} direction="up">
      <ProductCard product={product} />
    </FadeIn>
  ))}
</StaggerContainer>
```

### Settings Panel
```tsx
<SmoothHeightWrapper>
  <AnimatePresence mode="wait">
    <AnimatedTabContent tabKey={activeSection}>
      {activeSection === 'profile' && <ProfileSettings />}
      {activeSection === 'security' && <SecuritySettings />}
      {activeSection === 'billing' && <BillingSettings />}
    </AnimatedTabContent>
  </AnimatePresence>
</SmoothHeightWrapper>
```

### Modal/Dialog
```tsx
<FadeIn direction="down" duration={0.3}>
  <Dialog>
    <DialogContent />
  </Dialog>
</FadeIn>
```

### Form Wizard
```tsx
<SmoothHeightWrapper>
  <AnimatedTabContent tabKey={`step-${currentStep}`}>
    {currentStep === 1 && <Step1 />}
    {currentStep === 2 && <Step2 />}
    {currentStep === 3 && <Step3 />}
  </AnimatedTabContent>
</SmoothHeightWrapper>
```

---

## Resources

- **Framer Motion Docs:** https://www.framer.com/motion/
- **Animation Principles:** https://material.io/design/motion/
- **Performance:** https://web.dev/animations/
- **Project Files:**
  - `components/motion/MotionWrapper.tsx`
  - `components/motion/SmoothHeightWrapper.tsx`
  - `ANIMATION-IMPLEMENTATION-SUMMARY.md`
  - `ANIMATION-VISUAL-GUIDE.md`

---

## Need Help?

**Common Questions:**

Q: How do I disable animations for a specific element?  
A: Wrap in a regular `<div>` instead of using animation components.

Q: Can I customize the easing curve?  
A: Yes! Edit `MotionWrapper.tsx` to add more easing options.

Q: Why is my animation not working?  
A: Check that parent has `"use client"` directive (for Next.js).

Q: How do I animate on scroll?  
A: Use Framer Motion's `useInView` hook with these components.

---

**Last Updated:** January 11, 2026  
**Version:** 1.0
