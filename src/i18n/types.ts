import type { en } from './en';

/** Turns every string literal in the English resource into `string`. */
type Widen<T> = { [K in keyof T]: T[K] extends string ? string : Widen<T[K]> };

/**
 * Shape every translation file must implement. Missing or extra keys in
 * bn.ts are compile-time errors.
 */
export type TranslationSchema = Widen<typeof en>;
