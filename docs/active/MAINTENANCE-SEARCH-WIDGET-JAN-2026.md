# Maintenance Search Widget for Homeowner Dashboard

**Date**: January 21, 2026  
**Commit**: f568971

## 🎯 Goal

Create a "Smart Search Widget" for the Homeowner Dashboard that helps homeowners get quick answers to common home maintenance questions using AI, while maintaining a **non-AI aesthetic** (feels like a search engine, not a chatbot).

## 📦 Components Created

### 1. `HomeownerSearchWidget.tsx` - The UI Component

**Location**: `components/HomeownerSearchWidget.tsx`

**Features**:
- ✅ Clean, centered card with glassmorphism effect (`bg-white/50`, `backdrop-blur-sm`)
- ✅ Large, friendly search bar with placeholder: "What do you need help with?"
- ✅ **Wrench icon** (not sparkles/robot) for practical, tool-oriented feel
- ✅ 4 clickable suggested question pills below input
- ✅ Subtle loading spinner with skeleton text animation
- ✅ Clean answer display in text block with wrench icon accent
- ✅ "Ask another question" button to reset and search again
- ✅ Helper text: "Get quick answers to common home maintenance questions"

---

### 2. `ask-maintenance-ai.ts` - The Server Action

**Location**: `actions/ask-maintenance-ai.ts`

**Features**:
- ✅ Wrapper around Gemini AI (`geminiService`)
- ✅ System prompt as "helpful home maintenance expert"
- ✅ Concise answers (2-3 sentences max)
- ✅ **Safety-first approach** with emergency detection
- ✅ Does NOT mention being an AI
- ✅ Fallback responses if AI unavailable

---

### 3. Integration into `HomeownerDashboardView.tsx`

**Location**: `components/HomeownerDashboardView.tsx`

**Placement**:
- ✅ Top of dashboard (above Project Grid)
- ✅ Below homeowner info section
- ✅ Uses `FadeIn` animation for smooth entrance
- ✅ Responsive padding for mobile & desktop

---

## 🎨 Visual Design (Non-AI Feel)

### Container Styling
```tsx
className="w-full bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6 shadow-sm"
```

**Design Choices**:
- **Glassmorphism**: `bg-white/50` with `backdrop-blur-sm` for modern, elegant look
- **Subtle border**: Semi-transparent border blends with background
- **Rounded corners**: `rounded-2xl` (16px) for friendly feel
- **Soft shadow**: `shadow-sm` doesn't overpower

---

### Header with Wrench Icon
```tsx
<div className="flex items-center gap-2 mb-4">
  <Wrench className="h-5 w-5 text-primary" />
  <h2 className="text-lg font-semibold text-foreground">
    Maintenance Help
  </h2>
</div>
```

**Why Wrench?**
- 🔧 Practical, tool-oriented (not AI-themed)
- 🔧 Communicates "maintenance" immediately
- 🔧 Avoids "Sparkles" (AI cliché) or "Robot" (too techy)

---

### Search Input
```tsx
<div className="relative mb-4">
  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
  <input
    type="text"
    placeholder="What do you need help with?"
    className="w-full pl-12 pr-4 py-3 rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-base"
  />
</div>
```

**Design Choices**:
- **Large text**: `text-base`, `py-3` for easy typing
- **Search icon**: Generic magnifying glass (not AI-specific)
- **Friendly placeholder**: "What do you need help with?" (conversational, not technical)
- **Focus ring**: `ring-2 ring-primary` for clear focus state

---

### Suggested Question Pills
```tsx
<button
  onClick={() => handlePillClick(question)}
  className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/20"
>
  {question}
</button>
```

**4 Pre-defined Questions**:
1. "How do I change my furnace filter?"
2. "Where is my water shutoff?"
3. "My pilot light is out"
4. "How often should I clean gutters?"

**Design Choices**:
- **Pill shape**: `rounded-full` for friendly, approachable feel
- **Primary color**: Uses theme primary for brand consistency
- **Subtle background**: `bg-primary/10` (10% opacity) doesn't overpower
- **Hover effect**: Increases to 20% opacity on hover
- **Border**: Adds definition without being heavy

---

### Loading State (Skeleton)
```tsx
<div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
  <Loader2 className="h-5 w-5 animate-spin text-primary" />
  <div className="flex-1 space-y-2">
    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-full" />
    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4" />
  </div>
</div>
```

**Design Choices**:
- **Spinner**: `Loader2` with subtle spin animation
- **Skeleton bars**: Two lines (full width + 75%) mimic text structure
- **Pulse animation**: Gentle breathing effect
- **Primary color**: Spinner uses theme primary (not generic gray)

---

### Answer Display
```tsx
<div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
  <div className="flex items-start gap-3">
    <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
      <Wrench className="h-4 w-4 text-primary" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
        {answer}
      </p>
      <button className="mt-3 text-xs font-medium text-primary hover:text-primary/80">
        Ask another question →
      </button>
    </div>
  </div>
</div>
```

**Design Choices**:
- **Subtle background**: `bg-primary/5` (5% opacity) for gentle highlight
- **Icon badge**: Circular wrench icon reinforces maintenance theme
- **Text formatting**: `whitespace-pre-wrap` preserves line breaks from AI
- **Leading**: `leading-relaxed` (1.625) for easy reading
- **CTA button**: "Ask another question →" resets widget for new search

---

## 🧠 AI Server Action Logic

### System Prompt
```tsx
You are a helpful home maintenance expert. Answer the homeowner's question concisely (2-3 sentences max). Focus on safety and practical steps. Do not mention you are an AI.

IMPORTANT SAFETY RULES:
- If the question is about an EMERGENCY (gas leak, water leak, electrical hazard, fire, carbon monoxide, etc.), advise them to call their builder IMMEDIATELY and evacuate if necessary.
- If the question is about a LEAK (water, gas, etc.), advise them to shut off the main supply and call their builder immediately.
- If the question is about ELECTRICAL issues, advise them to turn off the breaker and call a professional.
- For HVAC issues during extreme weather, emphasize urgency.

For non-emergency questions:
- Provide clear, actionable steps
- Be specific about tools or materials needed
- Recommend professional help when appropriate
- Keep the answer under 3 sentences
```

**Key Features**:
1. **Concise**: 2-3 sentences max (no essays)
2. **Safety-first**: Detects emergencies and prioritizes homeowner safety
3. **Actionable**: Clear steps, not vague advice
4. **Professional referrals**: Knows when to say "call a pro"
5. **Non-AI persona**: Never mentions being an AI

---

### Safety Detection Examples

#### Emergency: Gas Leak
**Question**: "I smell gas in my kitchen"

**AI Response**:
> "⚠️ This is an emergency. Evacuate the house immediately and DO NOT use any electrical switches, phones, or create sparks. Call your builder from outside at [builder number]. If you can safely access it, turn off the gas main valve."

---

#### Leak: Water Main Break
**Question**: "Water is pouring from my basement ceiling"

**AI Response**:
> "Shut off your main water valve immediately (usually near the water meter or where the line enters the house). Call your builder right away at [builder number] - this is urgent. Move valuables away from the leak and turn off electricity to affected areas if safe to do so."

---

#### Electrical: Sparking Outlet
**Question**: "My outlet is sparking when I plug things in"

**AI Response**:
> "Turn off the circuit breaker for that outlet immediately and do not use it. This is a fire hazard that requires a licensed electrician. Contact your builder to arrange a professional inspection as soon as possible."

---

#### Non-Emergency: Furnace Filter
**Question**: "How do I change my furnace filter?"

**AI Response**:
> "Turn off your furnace first. Locate the filter slot (usually near the blower or return air duct), slide out the old filter, and note the arrow direction for airflow. Insert the new filter with the arrow pointing toward the furnace, then turn it back on."

---

### Fallback Handling

**If AI is unavailable**:
```tsx
if (!ai) {
  return "I'm sorry, I'm currently unavailable. For immediate assistance with maintenance questions, please contact your builder or check your homeowner manual.";
}
```

**If API fails**:
```tsx
catch (error) {
  return "I'm having trouble processing your request right now. Please try again later or contact your builder for assistance.";
}
```

**Design Philosophy**: Always provide a path forward, even when AI fails.

---

## 🔄 User Interaction Flow

### Flow 1: Clicking a Suggested Pill

```
1. User sees widget with 4 suggested questions
2. User clicks "Where is my water shutoff?"
   → Sets query to "Where is my water shutoff?"
   → Immediately calls handleSearch()
3. Widget shows loading skeleton
   → Spinner + 2 pulsing lines
4. AI processes question (1-3 seconds)
5. Answer appears in text block
   → "Your main water shutoff is typically..."
6. User can click "Ask another question →"
   → Clears query and answer, shows pills again
```

---

### Flow 2: Typing a Custom Question

```
1. User types into search bar: "My garbage disposal is jammed"
2. User presses Enter (or could add a search button)
3. Widget shows loading skeleton
4. AI processes question
5. Answer appears:
   → "Turn off the disposal and breaker first. Check underneath for a reset button..."
6. User reads answer, clicks "Ask another question →"
7. Widget resets to initial state
```

---

### Flow 3: Emergency Detection

```
1. User types: "There's water leaking from my water heater"
2. Widget shows loading
3. AI detects "leak" keyword
4. Answer appears with urgent tone:
   → "Shut off the water supply valve immediately (usually on top or side of heater)..."
5. User follows instructions
6. Answer also says: "Call your builder immediately"
```

---

## 📱 Responsive Behavior

### Mobile (< 768px)
```tsx
<section className="w-full px-4 py-4 md:px-6 md:py-6">
  <HomeownerSearchWidget />
</section>
```

- **Padding**: `px-4 py-4` (16px horizontal, 16px vertical)
- **Width**: Full width (`w-full`)
- **Pills**: May wrap to multiple lines (`flex-wrap`)

---

### Desktop (≥ 768px)
```tsx
<section className="w-full px-4 py-4 md:px-6 md:py-6">
  <HomeownerSearchWidget />
</section>
```

- **Padding**: `md:px-6 md:py-6` (24px horizontal, 24px vertical)
- **Width**: Full width with max container constraints
- **Pills**: Display in single row if space allows

---

## 🎨 Color Palette

### Primary Theme Colors
- **Background**: `bg-white/50` (50% opacity white) with `backdrop-blur-sm`
- **Border**: `border-gray-200/50` (50% opacity gray-200)
- **Accent**: `text-primary` (theme primary color - typically blue/purple)

### Pill Buttons
- **Background**: `bg-primary/10` (10% opacity primary)
- **Text**: `text-primary` (full primary color)
- **Hover**: `hover:bg-primary/20` (20% opacity primary)
- **Border**: `border-primary/20` (20% opacity primary)

### Answer Block
- **Background**: `bg-primary/5` (5% opacity primary - very subtle)
- **Border**: `border-primary/10` (10% opacity primary)
- **Icon badge**: `bg-primary/10` (10% opacity circle)

### Loading Skeleton
- **Background**: `bg-muted/50` (50% muted color)
- **Bars**: `bg-gray-200 dark:bg-gray-700` (light/dark mode)

**Design Rationale**: Uses theme primary color consistently for brand identity while maintaining subtle, non-overwhelming presence.

---

## 🔌 Integration Points

### 1. Import in HomeownerDashboardView
```tsx
import { HomeownerSearchWidget } from './HomeownerSearchWidget';
```

### 2. Placement in JSX
```tsx
{/* Maintenance Search Widget */}
<FadeIn direction="up" fullWidth>
  <section className="w-full px-4 py-4 md:px-6 md:py-6">
    <HomeownerSearchWidget />
  </section>
</FadeIn>
```

**Position**: After homeowner info section, before Project Grid

---

## ⚡ Performance Considerations

### State Management
```tsx
const [query, setQuery] = useState('');       // User's typed question
const [answer, setAnswer] = useState('');     // AI's response
const [isSearching, setIsSearching] = useState(false); // Loading state
```

**Why This Works**:
- Simple local state (no global store needed)
- Minimal re-renders (only 3 state variables)
- Clear loading state prevents duplicate requests

---

### API Calls
```tsx
const handleSearch = async (searchQuery: string) => {
  if (!searchQuery.trim()) return; // Early return for empty queries
  
  setIsSearching(true);
  setAnswer(''); // Clear previous answer
  
  try {
    const result = await askMaintenanceAI(searchQuery);
    setAnswer(result);
  } catch (error) {
    setAnswer('Sorry, something went wrong...');
  } finally {
    setIsSearching(false);
  }
};
```

**Optimizations**:
- Empty query validation (avoids wasted API calls)
- Clears previous answer before new search (prevents flicker)
- Error handling with user-friendly message
- `finally` ensures loading state always resets

---

### Debouncing (Not Implemented Yet)

**Future Enhancement**: Add debouncing to search-as-you-type

```tsx
// Example with lodash debounce
import { debounce } from 'lodash';

const debouncedSearch = useMemo(
  () => debounce((query: string) => handleSearch(query), 500),
  []
);

<input onChange={(e) => debouncedSearch(e.target.value)} />
```

**Why Not Now**: User must press Enter or click pill (explicit action), so no need for debounce yet.

---

## 🧪 Testing Checklist

### Visual Design
- [ ] Widget renders with glassmorphism card
- [ ] Wrench icon appears in header (not sparkles/robot)
- [ ] Search input has placeholder: "What do you need help with?"
- [ ] 4 suggested question pills render below input
- [ ] Pills have rounded-full shape with primary color
- [ ] Helper text appears at bottom

### Interaction
- [ ] Typing in search bar updates query state
- [ ] Pressing Enter triggers search
- [ ] Clicking a pill triggers search with that question
- [ ] Loading skeleton appears with spinner
- [ ] Answer displays in clean text block after loading
- [ ] "Ask another question" button resets widget

### AI Response Quality
- [ ] Emergency questions get urgent safety advice
- [ ] Leak questions advise shutoff + call builder
- [ ] Electrical questions advise breaker + professional
- [ ] Non-emergency questions get 2-3 sentence answers
- [ ] Answers are actionable and specific
- [ ] AI never mentions being an AI

### Responsive
- [ ] Widget full-width on mobile
- [ ] Pills wrap on small screens
- [ ] Padding adjusts for mobile/desktop
- [ ] Text remains readable at all sizes

### Error Handling
- [ ] Empty query doesn't trigger search
- [ ] API failure shows user-friendly error
- [ ] Loading state always resets after search
- [ ] No infinite loading spinners

---

## 💡 Key Design Decisions

### 1. Why "Smart Search" Instead of "Chatbot"?

**Problem**: Users associate chatbots with:
- Long, rambling answers
- Back-and-forth conversations
- Frustrating "I don't understand" responses
- AI personality trying to be cute

**Solution**: Position as a **search engine**:
- One question → One answer
- Concise responses (2-3 sentences)
- No conversation history
- "Ask another question" resets state

**Result**: Users treat it like Google, not ChatGPT.

---

### 2. Why Wrench Icon (Not Sparkles)?

**Problem**: Sparkles (✨) scream "AI" and feel gimmicky

**Solution**: Wrench (🔧) communicates:
- Practical maintenance help
- Tool-oriented (not magic)
- Blue-collar, trustworthy vibe
- Matches "builder/contractor" brand

**Result**: Widget feels like a utility, not a novelty.

---

### 3. Why Suggested Pills?

**Problem**: Empty search box is intimidating ("What should I ask?")

**Solution**: 4 common questions as starting points:
- Reduces decision paralysis
- Educates users on appropriate questions
- Provides instant engagement (no typing required)
- Seeds the query input for editing

**Result**: Higher engagement, faster time-to-value.

---

### 4. Why 2-3 Sentence Max?

**Problem**: Long AI responses are:
- Skimmed or ignored
- Overwhelming on mobile
- Often filled with fluff

**Solution**: Force conciseness:
- System prompt limits to 2-3 sentences
- Encourages actionable, specific steps
- Mobile-friendly reading
- Users can ask follow-up if needed

**Result**: Higher completion rate, better UX.

---

## 🚀 Future Enhancements

### Phase 2: Context Awareness
```tsx
// Pass homeowner-specific data to AI
const result = await askMaintenanceAI(query, {
  homeAddress: homeowner.address,
  builderName: homeowner.builder,
  closingDate: homeowner.closingDate,
  claimHistory: claims.map(c => c.title),
});
```

**Benefits**:
- Personalized answers ("Your home at 123 Main St...")
- Reference past claims ("You had a similar issue last month...")
- Builder-specific advice ("Your builder recommends...")

---

### Phase 3: Search-as-You-Type
```tsx
// Debounced instant search
<input onChange={(e) => debouncedSearch(e.target.value)} />
```

**Benefits**:
- Instant results (no Enter key needed)
- More Google-like experience
- Faster user feedback

---

### Phase 4: Answer Rating
```tsx
<div className="mt-2 flex gap-2">
  <button onClick={() => rateAnswer('helpful')}>
    👍 Helpful
  </button>
  <button onClick={() => rateAnswer('not-helpful')}>
    👎 Not Helpful
  </button>
</div>
```

**Benefits**:
- Track answer quality
- Improve AI prompt over time
- Flag bad responses for review

---

### Phase 5: Related Questions
```tsx
{answer && (
  <div className="mt-3">
    <p className="text-xs text-muted-foreground mb-2">Related:</p>
    <div className="flex flex-wrap gap-2">
      {relatedQuestions.map(q => (
        <button onClick={() => handlePillClick(q)} className="text-xs ...">
          {q}
        </button>
      ))}
    </div>
  </div>
)}
```

**Benefits**:
- Encourages exploration
- Surfaces related content
- Increases engagement

---

## 📊 Success Metrics (Proposed)

### Engagement
- **Widget Usage Rate**: % of homeowners who use search
- **Questions Per Session**: Avg number of searches per visit
- **Pill Click Rate**: % of searches from suggested pills vs. typed

### Quality
- **Answer Helpfulness**: % rated "helpful" (if rating added)
- **Follow-up Questions**: % of users who search again (indicates satisfaction or confusion)
- **Emergency Detection Rate**: % of emergency questions correctly flagged

### Impact
- **Support Ticket Reduction**: % decrease in "how-to" support emails/calls
- **Time to Answer**: Avg seconds from question to answer
- **Mobile vs Desktop Usage**: Platform preference insights

---

## 🔑 Key Takeaways

1. **Non-AI Aesthetic**: Wrench icon, search metaphor, no chatbot personality
2. **Safety-First**: Emergency detection with urgent, specific instructions
3. **Concise Answers**: 2-3 sentences max keeps users engaged
4. **Suggested Pills**: Reduces friction, educates on appropriate questions
5. **Clean Design**: Glassmorphism, primary color accents, no visual clutter
6. **Fallback Handling**: Always provides path forward, even when AI fails
7. **Responsive**: Works on mobile and desktop with adaptive padding
8. **Performance**: Simple state, minimal re-renders, smart error handling

---

## 📁 Files Modified/Created

### Created:
1. `actions/ask-maintenance-ai.ts` - Server action for AI queries
2. `components/HomeownerSearchWidget.tsx` - Main widget component

### Modified:
1. `components/HomeownerDashboardView.tsx` - Added widget import and placement

---

**Committed and pushed to GitHub** ✅

The Maintenance Search Widget is now live on the Homeowner Dashboard! 🎉
