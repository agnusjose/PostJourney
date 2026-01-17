import React, { createContext, useContext, useState } from "react";

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [cartItems, setCartItems] = useState({}); // Store items with quantity

  const addToCart = (item) => {
    setCart(prev => {
      const existingItem = prev.find(cartItem => cartItem._id === item._id);
      if (existingItem) {
        // Update quantity
        return prev.map(cartItem => 
          cartItem._id === item._id 
            ? { ...cartItem, quantity: (cartItem.quantity || 1) + 1 }
            : cartItem
        );
      } else {
        // Add new item with quantity
        return [...prev, { ...item, quantity: 1 }];
      }
    });
  };

  const removeFromCart = (id) => {
    setCart(prev => prev.filter(item => item._id !== id));
  };

  const updateQuantity = (id, quantity) => {
    setCart(prev => 
      prev.map(item => 
        item._id === id 
          ? { ...item, quantity: Math.max(1, quantity) }
          : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const getCartTotal = () => {
    return cart.reduce((sum, item) => {
      const itemTotal = item.pricePerDay * (item.quantity || 1);
      return sum + itemTotal;
    }, 0);
  };

  const getCartCount = () => {
    return cart.reduce((count, item) => count + (item.quantity || 1), 0);
  };

  return (
    <CartContext.Provider
      value={{ 
        cart, 
        addToCart, 
        removeFromCart, 
        clearCart, 
        updateQuantity,
        getCartTotal,
        getCartCount
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used inside CartProvider");
  }
  return context;
}