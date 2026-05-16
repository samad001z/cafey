## 2024-05-16 - Contextual ARIA labels for counter cart
**Learning:** Found that counter cart quantity control buttons (plus, minus, delete) only had icons without text or ARIA labels, meaning screen readers wouldn't announce their function or the item they modify.
**Action:** Added context-aware `aria-label` attributes (e.g., `Decrease quantity for ${item.name}`) to make the actions clear and specific to the cart item being modified.
