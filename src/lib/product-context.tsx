import { createContext, useContext, useState, type ReactNode } from "react";
import { PRODUCTS } from "./mock-data";

interface Ctx { productCode: string; setProductCode: (s: string) => void; product: typeof PRODUCTS[number]; }
const C = createContext<Ctx | null>(null);

export function ProductProvider({ children }: { children: ReactNode }) {
  const [productCode, setProductCode] = useState(PRODUCTS[0].code);
  const product = PRODUCTS.find(p => p.code === productCode) ?? PRODUCTS[0];
  return <C.Provider value={{ productCode, setProductCode, product }}>{children}</C.Provider>;
}

export function useProduct() {
  const c = useContext(C);
  if (!c) throw new Error("useProduct fuera de ProductProvider");
  return c;
}
