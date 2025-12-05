/// <reference types="svelte" />

declare module '*.svelte' {
  import type { Component } from 'svelte';

  // Declare a real value named `component` with the right type,
  // and export it as the default. This makes TS treat imports
  // from `.svelte` files as real values, not type-only.
  const component: Component;
  export default component;
}
