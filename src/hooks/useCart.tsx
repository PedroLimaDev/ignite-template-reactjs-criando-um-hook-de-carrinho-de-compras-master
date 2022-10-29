import { 
  createContext, 
  ReactNode, 
  useContext, 
  useState, 
  useEffect,
  useRef,
} from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');;

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const prevCartRef = useRef<Product[]>();

  useEffect(() => {
    prevCartRef.current = cart;
  })
  
  const cartPreviousValue = prevCartRef.current ?? cart;

  useEffect(() => {
    if (cartPreviousValue !== cart) {
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));  
    }
  }, [cart, cartPreviousValue])

  const addProduct = async (productId: number) => {
    try {
      const newCart = [...cart];
      const foundInCart = newCart.find(product => product.id === productId)

      const { data: inStockProduct } = await api.get(`/stock/${productId}`);
      
      const currentAmountInCart = foundInCart ? foundInCart?.amount : 0;

      if (inStockProduct.amount <= currentAmountInCart) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if (foundInCart) {
        foundInCart.amount = currentAmountInCart + 1;
      } else {
        const { data: productDetails } = await api.get(`/products/${productId}`);

        const newProduct = {
          ...productDetails,
          amount: 1,
        }

        newCart.push(newProduct);
      }

      setCart(newCart);
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const newCart = [...cart];

      const foundInCart = newCart.findIndex(product => product.id === productId);
      
      if (foundInCart !== -1) {
        newCart.splice(foundInCart, 1);
        setCart(newCart);
      } else {
        throw Error();
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return;

      const { data: productResponse } = await api.get(`/stock/${productId}`);
      const currentStock = productResponse.amount;

      if (amount > currentStock) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const newCart = [...cart];
      const foundInCart = newCart.find(product => product.id === productId);

      if (foundInCart) {
        foundInCart.amount = amount;
        setCart(newCart);
      } else {
        throw Error();
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
