import {createContext, useContext} from 'react';

// Temporary: side-by-side options for the user to pick from. Remove once chosen.
export type Variants = {opening: 'A' | 'B' | 'C'; reveal: 'now' | 'X' | 'Y'};
export const defaultVariants: Variants = {opening: 'A', reveal: 'X'};
export const VariantCtx = createContext<Variants>(defaultVariants);
export const useVariant = () => useContext(VariantCtx);
