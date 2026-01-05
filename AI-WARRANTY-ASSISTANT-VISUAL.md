# 🎨 AI Warranty Assistant - Quick Visual Reference

## 📸 UI Components

### Before (No Image Uploaded)
```
┌─────────────────────────────────────────┐
│ Attachments                             │
├─────────────────────────────────────────┤
│                                         │
│  [Upload Area]                          │
│  Click to upload or drag and drop       │
│                                         │
└─────────────────────────────────────────┘
```

### After Image Upload (Empty Description)
```
┌─────────────────────────────────────────┐
│ Attachments    [✨ Auto-Fill with AI]  │
├─────────────────────────────────────────┤
│  [Image Thumbnail]                      │
│                                         │
│  [Upload Area]                          │
│  Add more files...                      │
└─────────────────────────────────────────┘
```

### After Image Upload (Has Description)
```
┌─────────────────────────────────────────┐
│ Attachments    [✨ Refine with AI]     │
├─────────────────────────────────────────┤
│  [Image Thumbnail]                      │
│                                         │
│  [Upload Area]                          │
│  Add more files...                      │
└─────────────────────────────────────────┘
```

### While Analyzing
```
┌─────────────────────────────────────────┐
│ Attachments    [⏳ Analyzing...]       │
├─────────────────────────────────────────┤
│  [Image Thumbnail]                      │
│                                         │
│  [Upload Area]                          │
│  Add more files...                      │
└─────────────────────────────────────────┘
```

## 🎬 User Flow

### Scenario 1: Brand New Claim
```
1. User uploads photo of broken faucet
   ↓
2. AI button appears: "✨ Auto-Fill with AI"
   ↓
3. User clicks button
   ↓
4. Loading: "⏳ Analyzing..." (2-4 seconds)
   ↓
5. Form auto-fills:
   Title: "Leaking Kitchen Faucet"
   Description: "The kitchen faucet shows visible water 
                 damage beneath the sink. Water appears 
                 to be leaking from the base connection 
                 point. Immediate repair recommended."
   ↓
6. Success toast: "✨ AI analysis complete!"
```

### Scenario 2: Refine Existing Description
```
1. User uploads photo
   ↓
2. User types: "kitchen sink dripping"
   ↓
3. Button shows: "✨ Refine with AI"
   ↓
4. User clicks button
   ↓
5. Loading: "⏳ Analyzing..." (2-4 seconds)
   ↓
6. Description updates to:
   "kitchen sink dripping
   
   --- 🤖 AI Suggestion ---
   The kitchen faucet exhibits continuous dripping 
   from the spout, with visible water accumulation 
   beneath the sink basin. The leak appears to 
   originate from worn internal components requiring 
   professional replacement."
   ↓
7. Success toast: "✨ AI analysis complete!"
```

## 🎨 Styling Details

### Button Styles

**Default State (Ready to Analyze)**
```css
background: rgba(103, 80, 164, 0.1)  /* primary/10 */
color: #6750A4                        /* primary */
hover: rgba(103, 80, 164, 0.2)       /* primary/20 */
icon: Sparkles (✨)
```

**Analyzing State**
```css
background: gray-700
color: gray-400
cursor: wait
icon: Loader2 (spinning)
```

**Disabled State**
```css
background: gray-700
color: gray-400
cursor: not-allowed
opacity: 0.5
```

### Button Layout
```
┌──────────────────────────────┐
│  [icon] Button Text          │
│   3.5w   text-xs             │
│   3.5h   font-medium         │
└──────────────────────────────┘
  px-3    rounded-full
  py-1.5  gap-2
```

## 📝 Form Interaction

### Title Field Behavior
```typescript
Before AI: [empty]
After AI:  "Leaking Kitchen Faucet"

Logic:
if (!title.trim() && result.title) {
  setTitle(result.title);
}
```

### Description Field Behavior

**Case A: Empty**
```typescript
Before AI: [empty]
After AI:  "Professional description from AI..."

Logic:
if (!description.trim()) {
  setDescription(result.description);
}
```

**Case B: Has Content**
```typescript
Before AI: "User wrote this description"
After AI:  "User wrote this description

            --- 🤖 AI Suggestion ---
            Professional enhanced description..."

Logic:
const separator = "\n\n--- 🤖 AI Suggestion ---\n";
setDescription(description + separator + result.description);
```

## 🎯 Button Visibility Logic

```typescript
// Only show when:
attachments.some(att => att.type === 'IMAGE' && att.url)

// Button is disabled when:
isAnalyzing || isUploading || !hasImage
```

## 🎨 Color Scheme

### Light Mode
- Primary: `#6750A4` (purple)
- Primary/10: `rgba(103, 80, 164, 0.1)`
- Primary/20: `rgba(103, 80, 164, 0.2)`
- Success: Green
- Error: Red

### Dark Mode
- Primary: `#D0BCFF` (lighter purple)
- Primary/20: `rgba(208, 188, 255, 0.2)`
- Primary/30: `rgba(208, 188, 255, 0.3)`
- Background: Gray-700
- Text: Gray-100

## 📱 Responsive Design

### Desktop (md+)
```
┌────────────────────────────────────────────────┐
│ Attachments            [✨ Auto-Fill with AI] │
├────────────────────────────────────────────────┤
│  [img] [img] [img]                            │
│                                               │
│  [Upload Area - Full Width]                   │
└────────────────────────────────────────────────┘
```

### Mobile
```
┌──────────────────────────────┐
│ Attachments                  │
│ [✨ Auto-Fill with AI]       │
├──────────────────────────────┤
│  [img]                       │
│  [img]                       │
│                              │
│  [Upload Area]               │
└──────────────────────────────┘
```

## 🔔 Toast Notifications

### Success
```
╔════════════════════════════╗
║ ✅ ✨ AI analysis complete! ║
╚════════════════════════════╝
```

### Error
```
╔══════════════════════════════════════╗
║ ❌ AI analysis failed: [reason]      ║
╚══════════════════════════════════════╝
```

### Warning
```
╔═══════════════════════════════════╗
║ ⚠️  Please upload an image first   ║
╚═══════════════════════════════════╝
```

## 🎭 Animation States

### Button Hover
```
transition: all 200ms ease
hover → scale(1.02) + shadow-sm
```

### Spinner
```
<Loader2 className="animate-spin" />
rotation: infinite 1s linear
```

### Toast Slide In
```
slide-in from right
duration: 300ms
easing: ease-out
```

---

**Visual Reference Complete** ✅
Ready for implementation review.

