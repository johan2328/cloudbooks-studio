import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { X, ShoppingBag, ArrowRight } from "lucide-react";
import { BookCover } from "@/components/book-cover";
import { formatDef, PACK_COLOR, fmtUSD } from "@/lib/catalog";

export interface CartItem {
  id: string;
  name: string;
  cert: string;
  format: string;
  price: number;
}

interface CartCtx {
  items: CartItem[];
  open: boolean;
  setOpen: (v: boolean) => void;
  add: (item: CartItem) => void;
  remove: (id: string) => void;
  clear: () => void;
  total: number;
  count: number;
}

const CartContext = createContext<CartCtx | null>(null);

const STORAGE_KEY = "cloudbooks_cart_v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as CartItem[]) : [];
    } catch {
      return [];
    }
  });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const add = useCallback((item: CartItem) => {
    setItems(prev => {
      const exists = prev.find(i => i.id === item.id);
      if (exists) return prev;
      return [...prev, item];
    });
    setOpen(true);
  }, []);

  const remove = useCallback((id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const total = items.reduce((s, i) => s + i.price, 0);
  const count = items.length;

  return (
    <CartContext.Provider value={{ items, open, setOpen, add, remove, clear, total, count }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart debe usarse dentro de CartProvider");
  return ctx;
}

/* ── CartPanel (marca oscura CloudBooks Editorial) ──────────────── */
const CART_FONT = "'Space Grotesk','Inter',sans-serif";

export function CartPanel() {
  const { items, open, setOpen, remove, total, count } = useCart();
  const [, navigate] = useLocation();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100]" onClick={() => setOpen(false)}>
      <div className="absolute inset-0" style={{ backgroundColor: "rgba(6,6,10,0.6)", backdropFilter: "blur(4px)" }} />
      <div
        className="absolute right-0 top-0 bottom-0 w-full max-w-sm shadow-2xl flex flex-col"
        style={{ backgroundColor: "#0a0a0e", borderLeft: "1px solid rgba(243,243,246,0.12)" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(243,243,246,0.08)" }}>
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4" style={{ color: "#8b5cf6" }} />
            <span className="text-sm" style={{ fontFamily: CART_FONT, fontWeight: 700, color: "#f3f3f6" }}>Tu selección</span>
            <span className="text-[11px] font-mono" style={{ color: "rgba(243,243,246,0.4)" }}>({count})</span>
          </div>
          <button onClick={() => setOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full transition-colors hover:bg-white/5" style={{ color: "rgba(243,243,246,0.6)" }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16" style={{ color: "rgba(243,243,246,0.4)" }}>
              <ShoppingBag className="w-8 h-8 mb-3 opacity-40" />
              <p className="text-sm">Tu carrito está vacío</p>
              <p className="text-[11px] mt-1">Explora las colecciones y añade libros.</p>
            </div>
          ) : (
            items.map(item => {
              const coverColor = item.format === "Collection Pack" ? PACK_COLOR : (formatDef(item.format)?.color ?? "#8b5cf6");
              return (
              <div key={item.id} className="rounded-xl p-3 flex gap-3" style={{ backgroundColor: "#15151d", border: "1px solid rgba(243,243,246,0.08)" }}>
                <div className="w-10 shrink-0 rounded overflow-hidden self-start" style={{ aspectRatio: "1023 / 1537", border: "1px solid rgba(243,243,246,0.08)" }}>
                  <BookCover id={item.id} color={coverColor} format={item.format} cert={item.cert} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[13px] truncate" style={{ fontFamily: CART_FONT, fontWeight: 600, color: "#f3f3f6" }}>{item.name}</p>
                      <p className="text-[11px] mt-0.5" style={{ color: "rgba(243,243,246,0.5)" }}>{item.cert} &middot; {item.format}</p>
                    </div>
                    <span className="text-[13px] font-mono shrink-0" style={{ color: "rgba(243,243,246,0.7)" }}>{fmtUSD(item.price)}</span>
                  </div>
                  <button onClick={() => remove(item.id)} className="mt-2 text-[11px] transition-colors hover:opacity-100" style={{ color: "rgba(248,113,113,0.7)" }}>
                    Eliminar
                  </button>
                </div>
              </div>
              );
            })
          )}
        </div>

        {items.length > 0 && (
          <div className="p-4 space-y-3" style={{ borderTop: "1px solid rgba(243,243,246,0.08)" }}>
            <div className="flex items-center justify-between">
              <span className="text-[13px]" style={{ color: "rgba(243,243,246,0.6)" }}>Total estimado</span>
              <span style={{ fontFamily: CART_FONT, fontWeight: 700, fontSize: "1.15rem", color: "#f3f3f6" }}>{fmtUSD(total)}</span>
            </div>
            <button onClick={() => { setOpen(false); navigate("/checkout"); }} className="w-full h-11 rounded-full text-sm flex items-center justify-center gap-2 transition-all hover:brightness-110" style={{ backgroundColor: "#6d28d9", color: "#fff", fontFamily: CART_FONT, fontWeight: 600 }}>
              Finalizar compra <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
