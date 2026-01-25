# Admin Dashboard Refactor

This refactor splits the monolithic `AdminDashboard.tsx` into a Controller/View pattern:

## Architecture

1. **Controller**: `AdminDashboard.tsx` - Contains all state, hooks, data fetching, handlers
2. **Desktop View**: `AdminDesktop.tsx` - Desktop-specific UI
3. **Mobile View**: `AdminMobile.tsx` - Mobile-specific UI (currently uses HomeownerMobile)

## Pattern

Following the same pattern as `HomeownerDashboard`:
- Controller receives `DashboardProps` from parent (App.tsx)
- Controller computes all state, handlers, and manages hooks
- Controller passes everything to views via spread props
- Views are pure presentational components

## Status

- Phase 1: ✅ Analysis complete
- Phase 2: 🚧 In Progress - Creating simplified router
- Phase 3: 🚧 Mobile view will initially reuse HomeownerMobile
- Phase 4: 🚧 Desktop extraction in progress

## Note

AdminDashboard is significantly more complex than HomeownerDashboard (5526 lines vs ~5000 lines).
The initial refactor will create the routing structure, with full Desktop view extraction as a follow-up task.
