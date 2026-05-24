import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { X, ShoppingBag, ArrowRight } from "lucide-react";

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

/* ── CartPanel ────────────────────────────────────────────────── */
export function CartPanel() {
  const { items, open, setOpen, remove, total, count } = useCart();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100]" onClick={() => setOpen(false)}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-[#0d1629] border-l border-white/[0.08] shadow-2xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-white/40" />
            <span className="text-sm font-bold text-white/80">Tu seleccion</span>
            <span className="text-[10px] text-white/30 font-mono">({count})</span>
          </div>
          <button onClick={() => setOpen(false)} className="w-7 h-7 flex items-center justify-center rounded-sm hover:bg-white/[0.06] transition-colors">
            <X className="w-4 h-4 text-white/40" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-white/30">
              <ShoppingBag className="w-8 h-8 mb-3 opacity-30" />
              <p className="text-xs">El carrito esta vacio</p>
              <p className="text-[10px] mt-1">Explora las colecciones y anade packs.</p>
            </div>
          ) : (
            items.map(item => (
              <div key={item.id} className="bg-white/[0.03] border border-white/[0.06] rounded-sm p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold text-white/80">{item.name}</p>
                    <p className="text-[10px] text-white/40 mt-0.5">{item.cert} &middot; {item.format}</p>
                  </div>
                  <span className="text-xs font-mono text-white/60 shrink-0">${item.price}</span>
                </div>
                <button onClick={() => remove(item.id)} className="mt-2 text-[10px] text-red-400/60 hover:text-red-400 transition-colors">
                  Eliminar
                </button>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-white/[0.06] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/50">Total estimado</span>
              <span className="text-sm font-bold text-white/90">${total.toFixed(2)}</span>
            </div>
            <button className="w-full h-9 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold rounded-sm transition-all flex items-center justify-center gap-1.5">
              Finalizar compra <ArrowRight className="w-3 h-3" />
            </button>
            <p className="text-[9px] text-white/25 text-center">Pago proximamente. Tu seleccion se guarda localmente.</p>
          </div>
        )}
      </div>
    </div>
  );
}
