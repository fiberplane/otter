# Coding Style

General TypeScript coding conventions enforced across the codebase.

## Type Safety Over Convenience

Strictly avoid `any` types (prohibited by Biome) and non-null assertions (`!`). Use proper type definitions and type guards instead of `as any` casts.

```typescript
// Bad
function processData(data: any): any { return data.someProperty; }
const error = someError as any;

// Good - proper types and type guards
type DataInput = { someProperty: string; }
function processData(data: DataInput): string { return data.someProperty; }
if ("details" in error && typeof error.details === "string") {
  const details = JSON.parse(error.details);
}
```

## Modern JavaScript Performance Patterns

Use `for...of` loops instead of `forEach` for better performance, and template literals instead of string concatenation for cleaner code. Avoid accumulating spread (`...`) in reducers (also enforced by Biome's `noAccumulatingSpread` rule).

## Else Blocks and Early Returns

- Prefer early return (over nesting in if statements)
- Add a newline to blocks with return statement
- Don't use needless else blocks

```typescript
// Bad: Useless else statements
function getStatusComponent(status: string | undefined) {
  if (status === "error") {
    return ErrorComponent
  } else if (status === "ok") {
    return OkComponent;
  } else if (status === undefined) {
    throw new Error("Encountered an unknown status")
  } else {
    return DefaultComponent;
  }
}

// Good: return errors early, use clear code blocks and no needless else statements
function getStatusComponent(status: string | undefined) {
  if (status === undefined) {
    throw new Error("Encountered an unknown status")
  }

  if (status === "error") {
    return ErrorComponent
  }

  if (status === "ok") {
    return OkComponent;
  }

  return DefaultComponent
}
```

## Consistent Code Structure

Always use block statements (`{}`) for control flow -- required by Biome. Use 2-space indentation, trailing commas in multiline structures, and group related code with blank lines.

```typescript
// Bad: Missing curly braces
if (status === "connected") return;
for (const item of items) processItem(item);

// Good: Always use curly braces
if (status === "connected") {
  return;
}

for (const item of items) {
  processItem(item);
}
```
