# CRM UX Improvements - January 31, 2026

## Summary

This document describes the UX/UI improvements made to the CRM Kanban module after Phase 1 completion.

---

## 🎯 Issues Addressed

### 1. Drag & Drop Not Fluid

**Problem**: When dragging a card to another column, the card wouldn't stay in the new column - the page would refresh and revert.

**Solution**:

- Implemented **optimistic updates** in `useCRMCards` hook
- State updates immediately when card is dropped
- API call happens in background
- If API fails, state is automatically reverted

**Files Changed**:

- `src/hooks/useCRMCards.ts` - Added optimistic state updates in `moveCard` function

### 2. Collision Detection Too Precise

**Problem**: User had to position the card exactly over the target column, making drag-drop frustrating.

**Solution**:

- Changed from `closestCorners` to custom collision detection algorithm
- Uses `pointerWithin` as primary detection
- Falls back to `rectIntersection` if nothing found
- Card drops as soon as mouse enters column area

**Files Changed**:

- `src/components/crm/KanbanBoard.tsx` - Custom `collisionDetectionStrategy`

### 3. Messages Not Showing in Card Detail Panel

**Problem**: When clicking on a card, no messages appeared in the messages tab.

**Solution**:

- Fixed interface mismatch: API returns `direction` but code expected `role`
- Changed `Message` interface to use `direction: "incoming" | "outgoing"`

**Files Changed**:

- `src/components/crm/CardDetailPanel.tsx` - Updated `Message` interface

### 4. Messages Only Showing Small Area

**Problem**: Messages were constrained to a tiny area instead of using available space.

**Solution**:

- Changed ScrollArea from fixed height to `flex-1` with calculated max height
- Added proper flex column layout

**Files Changed**:

- `src/components/crm/CardDetailPanel.tsx` - Updated TabsContent and ScrollArea classes

### 5. No Button to View Full Conversation

**Problem**: User wanted to navigate directly to full conversation page from CRM card.

**Solution**:

- Added "Ver Conversa Completa" button in CardDetailPanel header
- Button navigates to `/dashboard/conversations?phone={phone}`
- Conversations page reads `phone` parameter and auto-selects conversation

**Files Changed**:

- `src/components/crm/CardDetailPanel.tsx` - Added navigation button
- `src/app/dashboard/conversations/page.tsx` - Added `useSearchParams` for phone
- `src/components/ConversationsIndexClient.tsx` - Added `initialPhone` prop with auto-selection

### 6. No Place to Add Tags to Client

**Problem**: User couldn't find where to add/remove tags from a card.

**Solution**:

- Added **Tags Section** in CardDetailPanel header
- Shows current tags with colored dots
- "Adicionar" button opens tag selector dropdown
- X button on each tag to remove
- Only shows tags not already assigned in selector

**Files Changed**:

- `src/components/crm/CardDetailPanel.tsx` - Added tags section with add/remove UI

### 7. CRM Page Loading Too Slow

**Problem**: Page showed blank screen while loading data.

**Solution**:

- Added **Skeleton loading** component
- Shows skeleton placeholders while columns/cards/tags load
- Immediate visual feedback

**Files Changed**:

- `src/app/dashboard/crm/page.tsx` - Added Skeleton loading state
- `src/components/ui/skeleton.tsx` - Created new component

### 8. Tags Not Updating Instantly

**Problem**: After adding/removing a tag, the panel didn't reflect the change until page refresh.

**Solution**:

- Added **local state** `localTagIds` in CardDetailPanel
- `handleAddTagLocal` and `handleRemoveTagLocal` functions
- Optimistic updates - UI changes immediately
- Reverts if API call fails

**Files Changed**:

- `src/components/crm/CardDetailPanel.tsx` - Added local tag state management

### 9. Tags Manager for Creating/Deleting Tags

**Problem**: No UI to create or manage custom tags.

**Solution**:

- Created **TagsManager** component as a dialog
- Accessible via "Gerenciar Tags" button in CRM page
- Create new tags with name and color picker
- Delete existing tags
- 8 color options available

**Files Changed**:

- `src/components/crm/TagsManager.tsx` - New component
- `src/app/dashboard/crm/page.tsx` - Added TagsManager to UI

### 10. Messages Need Space at Bottom

**Problem**: Messages scroll exactly to bottom edge, feels cramped.

**Solution**:

- Added `pb-16` (64px padding) at bottom of messages list
- "Mais recentes" button positioned with `bottom-4`
- Button has semi-transparent background for visibility

**Files Changed**:

- `src/components/crm/CardDetailPanel.tsx` - Increased bottom padding, adjusted button position

---

## 📁 Files Created

| File                                                              | Purpose                           |
| ----------------------------------------------------------------- | --------------------------------- |
| `src/components/ui/skeleton.tsx`                                  | Skeleton loading component        |
| `src/components/crm/TagsManager.tsx`                              | Dialog for creating/deleting tags |
| `supabase/migrations/20260131150000_crm_default_columns.sql`      | Default columns migration         |
| `supabase/migrations/20260131160000_crm_last_message_trigger.sql` | Last message sync trigger         |

---

## 📁 Files Modified

| File                                          | Changes                                                         |
| --------------------------------------------- | --------------------------------------------------------------- |
| `src/hooks/useCRMCards.ts`                    | Optimistic updates for moveCard, addTag, removeTag              |
| `src/hooks/useCRMColumns.ts`                  | Added useEffect for auto-fetch                                  |
| `src/components/crm/KanbanBoard.tsx`          | Custom collision detection, improved sensors                    |
| `src/components/crm/KanbanCard.tsx`           | Added will-change, touchAction for performance                  |
| `src/components/crm/KanbanColumn.tsx`         | Added droppable data, isOver highlighting                       |
| `src/components/crm/CardDetailPanel.tsx`      | Tags section, scroll button, local tag state, navigation button |
| `src/components/ConversationsIndexClient.tsx` | initialPhone prop, auto-selection                               |
| `src/app/dashboard/conversations/page.tsx`    | useSearchParams for phone parameter                             |
| `src/app/dashboard/crm/page.tsx`              | Skeleton loading, TagsManager integration                       |

---

## 🎨 UX Patterns Implemented

### Optimistic Updates

Updates happen immediately in the UI, with automatic rollback if API fails. Applied to:

- Card movement (drag-drop)
- Tag addition
- Tag removal

### Skeleton Loading

Provides visual feedback during initial data load instead of blank screens.

### Local State Sync

For CardDetailPanel, tags are managed in local state with sync to props, enabling instant UI updates while keeping data integrity.

### Smart Navigation

"Ver Conversa Completa" uses URL parameters to maintain context across pages.

---

## ✅ Status

All UX improvements are **complete and tested**. Ready for Phase 2 implementation.

---

## 🚀 Next: Phase 2

See `docs/mellow-greeting-goblet.md` section "Fase 2" for Phase 2 scope:

- Activity Log API
- Scheduled Messages
- Auto-status integration
- Advanced filters
