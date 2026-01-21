# 🎨 Claim Editor UI Refactor Guide

## Overview
This guide provides a comprehensive refactoring plan for the Claim Editor modal to achieve a clean, professional, and uniform grid layout with consistent styling across all input fields.

---

## 🎯 Global Design Principles

### 1. **Uniform Input Heights**
All interactive elements must have the same height:
```tsx
className="h-10"
```

### 2. **Consistent Border Style**
All inputs, selects, and buttons use:
```tsx
variant="outline"
```

### 3. **Grid Layout**
Group related fields in responsive grids:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  {/* Fields */}
</div>
```

### 4. **Icons**
Every input should have a muted leading icon:
```tsx
import { Calendar, Clock, Tag, Search, UserPlus, ClipboardCheck } from 'lucide-react';
```

### 5. **Section Cards**
Wrap distinct sections in cards for visual separation:
```tsx
<div className="p-6 border rounded-lg bg-card">
  {/* Section content */}
</div>
```

---

## 📋 Reusable Components

### Label Component
```tsx
import { Label } from "@/components/ui/label";

<Label className="text-xs font-medium uppercase text-muted-foreground">
  Field Name
</Label>
```

### Date Picker Field
```tsx
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

function DatePickerField({ 
  label, 
  date, 
  onSelect,
  placeholder = "Pick a date" 
}: {
  label: string;
  date: Date | undefined;
  onSelect: (date: Date | undefined) => void;
  placeholder?: string;
}) {
  return (
    <div className="grid gap-2">
      <Label className="text-xs font-medium uppercase text-muted-foreground">
        {label}
      </Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "h-10 w-full justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, "PPP") : <span>{placeholder}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={onSelect}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
```

### Select Field with Icon
```tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function SelectFieldWithIcon({
  label,
  value,
  onValueChange,
  placeholder,
  icon: Icon,
  options,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  icon: React.ComponentType<{ className?: string }>;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="grid gap-2">
      <Label className="text-xs font-medium uppercase text-muted-foreground">
        {label}
      </Label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
        <Select value={value} onValueChange={onValueChange}>
          <SelectTrigger className="h-10 pl-9">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
```

### Search Input Field
```tsx
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

function SearchField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="grid gap-2">
      <Label className="text-xs font-medium uppercase text-muted-foreground">
        {label}
      </Label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="h-10 pl-9"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      </div>
    </div>
  );
}
```

---

## 🏗️ Section Implementations

### 1. Scheduling Section

```tsx
import { Calendar, Clock } from "lucide-react";

function SchedulingSection({
  scheduledDate,
  onScheduledDateChange,
  timeSlot,
  onTimeSlotChange,
}: {
  scheduledDate: Date | undefined;
  onScheduledDateChange: (date: Date | undefined) => void;
  timeSlot: string;
  onTimeSlotChange: (slot: string) => void;
}) {
  const timeSlots = [
    { value: "AM", label: "Morning (AM)" },
    { value: "PM", label: "Afternoon (PM)" },
    { value: "All Day", label: "All Day" },
  ];

  return (
    <div className="p-6 border rounded-lg bg-card space-y-4">
      <h3 className="text-sm font-semibold">Scheduling</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Scheduled Date */}
        <DatePickerField
          label="Scheduled Date"
          date={scheduledDate}
          onSelect={onScheduledDateChange}
          placeholder="Select date..."
        />

        {/* Time Slot */}
        <SelectFieldWithIcon
          label="Time Slot"
          value={timeSlot}
          onValueChange={onTimeSlotChange}
          placeholder="Select time slot..."
          icon={Clock}
          options={timeSlots}
        />
      </div>
    </div>
  );
}
```

---

### 2. Warranty Assessment Section

```tsx
import { Tag, Calendar, ClipboardCheck } from "lucide-react";

function WarrantyAssessmentSection({
  classification,
  onClassificationChange,
  dateEvaluated,
  onDateEvaluatedChange,
  classifications,
}: {
  classification: string;
  onClassificationChange: (value: string) => void;
  dateEvaluated: Date | undefined;
  onDateEvaluatedChange: (date: Date | undefined) => void;
  classifications: { value: string; label: string }[];
}) {
  return (
    <div className="p-6 border rounded-lg bg-card space-y-4">
      <h3 className="text-sm font-semibold">Warranty Assessment</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Classification */}
        <SelectFieldWithIcon
          label="Classification"
          value={classification}
          onValueChange={onClassificationChange}
          placeholder="Select classification..."
          icon={ClipboardCheck}
          options={classifications}
        />

        {/* Date Evaluated */}
        <DatePickerField
          label="Date Evaluated"
          date={dateEvaluated}
          onSelect={onDateEvaluatedChange}
          placeholder="Select evaluation date..."
        />
      </div>
    </div>
  );
}
```

---

### 3. Subcontractor Assignment Section

```tsx
import { UserPlus, Search } from "lucide-react";

function SubcontractorAssignmentSection({
  searchValue,
  onSearchChange,
  selectedContractor,
  contractors,
  onSelectContractor,
}: {
  searchValue: string;
  onSearchChange: (value: string) => void;
  selectedContractor: string | null;
  contractors: Array<{ id: string; name: string; email: string }>;
  onSelectContractor: (id: string) => void;
}) {
  const filteredContractors = contractors.filter(c =>
    c.name.toLowerCase().includes(searchValue.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchValue.toLowerCase())
  );

  return (
    <div className="p-6 border rounded-lg bg-card space-y-4">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <UserPlus className="h-4 w-4" />
        Subcontractor Assignment
      </h3>
      
      {/* Search Input */}
      <SearchField
        label="Search Subcontractor"
        value={searchValue}
        onChange={onSearchChange}
        placeholder="Search by name or email..."
      />

      {/* Results */}
      {searchValue && filteredContractors.length > 0 && (
        <div className="mt-2 border rounded-md max-h-48 overflow-y-auto">
          {filteredContractors.map((contractor) => (
            <button
              key={contractor.id}
              onClick={() => onSelectContractor(contractor.id)}
              className={cn(
                "w-full px-4 py-3 text-left hover:bg-accent transition-colors border-b last:border-b-0",
                selectedContractor === contractor.id && "bg-accent"
              )}
            >
              <div className="font-medium text-sm">{contractor.name}</div>
              <div className="text-xs text-muted-foreground">{contractor.email}</div>
            </button>
          ))}
        </div>
      )}

      {/* Selected Contractor Display */}
      {selectedContractor && !searchValue && (
        <div className="p-3 bg-muted rounded-md flex items-center justify-between">
          <div>
            <div className="font-medium text-sm">
              {contractors.find(c => c.id === selectedContractor)?.name}
            </div>
            <div className="text-xs text-muted-foreground">
              {contractors.find(c => c.id === selectedContractor)?.email}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSelectContractor('')}
          >
            Change
          </Button>
        </div>
      )}
    </div>
  );
}
```

---

## 🎨 Complete Modal Layout

```tsx
function ClaimEditorModal({
  claim,
  onSave,
  onCancel,
  isAdmin,
}: {
  claim: Claim;
  onSave: (updatedClaim: Claim) => void;
  onCancel: () => void;
  isAdmin: boolean;
}) {
  // State management
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(
    claim.scheduledDate ? new Date(claim.scheduledDate) : undefined
  );
  const [timeSlot, setTimeSlot] = useState(claim.timeSlot || 'AM');
  const [classification, setClassification] = useState(claim.classification || '');
  const [dateEvaluated, setDateEvaluated] = useState<Date | undefined>(
    claim.dateEvaluated ? new Date(claim.dateEvaluated) : undefined
  );
  const [contractorSearch, setContractorSearch] = useState('');
  const [selectedContractor, setSelectedContractor] = useState(claim.contractorId || '');

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Edit Claim</h2>
        <p className="text-sm text-muted-foreground">
          Update claim details and schedule repairs
        </p>
      </div>

      {/* Sections with consistent spacing */}
      <div className="space-y-6">
        {/* Scheduling Section */}
        {isAdmin && (
          <SchedulingSection
            scheduledDate={scheduledDate}
            onScheduledDateChange={setScheduledDate}
            timeSlot={timeSlot}
            onTimeSlotChange={setTimeSlot}
          />
        )}

        {/* Warranty Assessment Section */}
        {isAdmin && (
          <WarrantyAssessmentSection
            classification={classification}
            onClassificationChange={setClassification}
            dateEvaluated={dateEvaluated}
            onDateEvaluatedChange={setDateEvaluated}
            classifications={CLAIM_CLASSIFICATIONS.map(c => ({
              value: c,
              label: c
            }))}
          />
        )}

        {/* Subcontractor Assignment Section */}
        {isAdmin && (
          <SubcontractorAssignmentSection
            searchValue={contractorSearch}
            onSearchChange={setContractorSearch}
            selectedContractor={selectedContractor}
            contractors={contractors}
            onSelectContractor={setSelectedContractor}
          />
        )}
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-end gap-3 pt-6 border-t">
        <Button
          variant="ghost"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            // Mark as processed logic
          }}
        >
          Mark Processed
        </Button>
        <Button
          onClick={() => {
            onSave({
              ...claim,
              scheduledDate,
              timeSlot,
              classification,
              dateEvaluated,
              contractorId: selectedContractor,
            });
          }}
        >
          Save Changes
        </Button>
      </div>
    </div>
  );
}
```

---

## 📐 Spacing & Layout Standards

### Section Spacing
```tsx
<div className="space-y-6">
  {/* Major sections */}
</div>
```

### Card Padding
```tsx
<div className="p-6 border rounded-lg bg-card">
  {/* Section content */}
</div>
```

### Grid Gaps
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  {/* Fields */}
</div>
```

### Label Styling
```tsx
<Label className="text-xs font-medium uppercase text-muted-foreground">
  Field Name
</Label>
```

---

## 🎨 Visual Polish Checklist

- [ ] All inputs have consistent `h-10` height
- [ ] All triggers use `variant="outline"`
- [ ] Every field has a leading icon
- [ ] Related fields grouped in 2-column grids
- [ ] Sections wrapped in cards with borders
- [ ] Labels use uppercase + muted styling
- [ ] Consistent `gap-6` between major sections
- [ ] Footer buttons aligned to bottom right
- [ ] Hover states on all interactive elements
- [ ] Dark mode compatible colors

---

## 🔄 Migration Steps

### Step 1: Install Dependencies (if needed)
```bash
npm install date-fns @radix-ui/react-popover @radix-ui/react-select
```

### Step 2: Create Utility Components
Create new files in `components/ui/`:
- `date-picker.tsx` - Reusable date picker
- `select-with-icon.tsx` - Select with leading icon
- `search-input.tsx` - Search input with icon

### Step 3: Refactor Sections
Replace existing sections in `ClaimInlineEditor.tsx` one at a time:
1. Start with Scheduling Section
2. Then Warranty Assessment
3. Finally Subcontractor Assignment

### Step 4: Test Each Section
- Verify all state updates work correctly
- Test responsive layout (mobile + desktop)
- Check dark mode appearance
- Validate form submission

### Step 5: Polish
- Add loading states
- Implement error handling
- Add validation messages
- Ensure accessibility (ARIA labels)

---

## 🎯 Expected Results

**Before:**
- Inconsistent input heights
- Mixed button styles (rounded, filled, outline)
- Scattered layout
- No visual grouping
- Inconsistent icons

**After:**
- ✅ Uniform `h-10` inputs
- ✅ Consistent `outline` variant
- ✅ Clean grid layout
- ✅ Sections in cards
- ✅ Icons for all fields
- ✅ Professional, modern appearance
- ✅ Better scannability
- ✅ Improved UX

---

**Created:** January 8, 2026  
**Status:** Implementation guide ready  
**Estimated Time:** 2-4 hours for full refactor

