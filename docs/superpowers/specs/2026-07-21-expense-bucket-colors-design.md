# Expense Bucket Colors Design

## Scope

Users can customize colors for expense bucket groups from Settings. Income bucket groups and member colors are unchanged.

## Data model

Bucket-color overrides will use an expense-specific key derived from the normalized group name, for example `expense:housing`. This prevents an expense `Housing` color from affecting an income `Housing` bucket. Existing repository persistence remains the storage mechanism.

## Settings interaction

Each expense bucket card exposes an **Edit color** button. It opens an inline color editor containing:

- a native color picker;
- a six-digit hex input;
- red, green, and blue numeric inputs (0–255);
- a color swatch preview; and
- Save and Cancel controls.

The picker, hex, RGB fields, and preview stay synchronized. Valid input updates the rendered expense bucket color immediately before saving. Saving persists the override and retains the new color after remounting. Cancel restores the saved color.

## Validation and errors

Hex input accepts `#RRGGBB` (case-insensitive) and is normalized to lowercase. RGB channels accept whole numbers from 0 through 255. Invalid or incomplete values show an inline error, preserve the entered text, and disable Save. A failed persistence operation shows an inline error and retains the editor values for retry.

## Testing

Tests cover editor opening, picker/hex/RGB synchronization, immediate card-preview updates, invalid hex and RGB validation, persistence, retryable save failure, and isolation from an income bucket with the same group name.
