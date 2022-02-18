import { resolve } from 'dns';
import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

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
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const prevCartRef = useRef<Product[]>();

  //Atualizar o localStorage todas as vezes que alterar a variavel cart============================
  useEffect(() =>{
    //O segredo é que useRef não se rerenderiza quando é modificado por isso pode ser usado com useEffect sem array de dependencias
    prevCartRef.current = cart;
    //console.log("Entrou", prevCartRef.current,cartPreviuosValue, cart);
  });

  const cartPreviuosValue = prevCartRef.current ?? cart;//se o primeiro agrumento for nulo ou undefined pega o segundo

  //console.log("X",prevCartRef.current,cartPreviuosValue, cart)

  useEffect(() => {
    //console.log("Entrou2",prevCartRef.current,cartPreviuosValue, cart);
    if(cartPreviuosValue !== cart){
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
    }
  }, [cart, cartPreviuosValue]);
  //FIM Atualizar o localStorage todas as vezes que alterar a variavel cart=========================


  const addProduct = async (productId: number) => {
    try {
      const updateCart = [...cart];
      const productExists = updateCart.find(product => product.id === productId );

      const stock = await api.get(`stock/${productId}`);
      const stockAmount = stock.data.amount;
      const currentAmount = productExists ? productExists.amount : 0;
      const amount = currentAmount + 1;

      if(amount > stockAmount){
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if(productExists){
        productExists.amount = amount;
      } 
      else {
        const product = await api.get(`products/${productId}`);
        const newProduct = {
          ...product.data,
          amount: 1
        }
        updateCart.push(newProduct);
      }

      setCart(updateCart);

    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updateCart = [...cart];
      //const productExists = updateCart.find(product => product.id === productId);
      const productIndex = updateCart.findIndex(product => product.id === productId);

      if(productIndex >= 0){
        //const newCart = updateCart.filter(product => product.id !== productId);
        updateCart.splice(productIndex,1);
        setCart(updateCart);
      }
      else{
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
      const updateCart = [...cart];
      const productExists = updateCart.find(product => product.id === productId );
      const stock: Stock = await api.get(`stock/${productId}`).then(Response => Response.data);

      if(amount <= 0 ){
        return;
      }else if (amount > stock.amount){
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if(productExists) {
        productExists.amount = amount;
        setCart(updateCart);
      }else {
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
