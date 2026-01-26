// context/CartContext.js
import React, { createContext, useContext, useState, useCallback } from "react";
import axios from "axios";

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);

  const BASE_URL = "http://10.80.34.90:5000";

  // Check stock availability before adding to cart
  const checkStockAvailability = async (itemId, requestedQuantity) => {
    try {
      const response = await axios.get(`${BASE_URL}/equipment/${itemId}`);
      if (response.data.success) {
        const equipment = response.data.equipment;
        return {
          available: equipment.stock >= requestedQuantity,
          currentStock: equipment.stock,
          equipmentName: equipment.equipmentName
        };
      }
      return { available: false, currentStock: 0, equipmentName: '' };
    } catch (error) {
      console.error("Error checking stock:", error);
      return { available: false, currentStock: 0, equipmentName: '' };
    }
  };

  const addToCart = async (item) => {
    setLoading(true);
    try {
      // Check stock availability
      const stockCheck = await checkStockAvailability(item._id, item.quantity || 1);

      if (!stockCheck.available) {
        throw new Error(`Only ${stockCheck.currentStock} unit(s) of "${stockCheck.equipmentName}" available`);
      }

      setCart(prev => {
        const existingItem = prev.find(cartItem => cartItem._id === item._id);
        if (existingItem) {
          // Check if total requested quantity exceeds stock
          const totalRequested = (existingItem.quantity || 0) + (item.quantity || 1);
          if (totalRequested > stockCheck.currentStock) {
            throw new Error(`Cannot add more. Only ${stockCheck.currentStock} unit(s) available`);
          }

          // Update quantity
          return prev.map(cartItem =>
            cartItem._id === item._id
              ? {
                ...cartItem,
                quantity: (cartItem.quantity || 1) + (item.quantity || 1),
                currentStock: stockCheck.currentStock // Store current stock for validation
              }
              : cartItem
          );
        } else {
          // Add new item with quantity
          return [...prev, {
            ...item,
            quantity: item.quantity || 1,
            currentStock: stockCheck.currentStock // Store current stock for validation
          }];
        }
      });

      return { success: true };
    } catch (error) {
      console.error("Error adding to cart:", error);
      return { success: false, message: error.message };
    } finally {
      setLoading(false);
    }
  };

  const removeFromCart = (id) => {
    setCart(prev => prev.filter(item => item._id !== id));
  };

  // Update quantity with stock validation
  const updateQuantity = async (id, newQuantity) => {
    if (newQuantity < 1) return false;

    const item = cart.find(item => item._id === id);
    if (!item) return false;

    // Check stock availability
    const stockCheck = await checkStockAvailability(id, newQuantity);

    if (!stockCheck.available) {
      throw new Error(`Only ${stockCheck.currentStock} unit(s) available`);
    }

    setCart(prev =>
      prev.map(item =>
        item._id === id
          ? {
            ...item,
            quantity: newQuantity,
            currentStock: stockCheck.currentStock // Update current stock
          }
          : item
      )
    );

    return true;
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

  // Validate all cart items stock before checkout
  const validateCartStock = async () => {
    const validationResults = [];

    for (const item of cart) {
      const stockCheck = await checkStockAvailability(item._id, item.quantity || 1);
      validationResults.push({
        itemId: item._id,
        itemName: item.equipmentName,
        requested: item.quantity || 1,
        available: stockCheck.available,
        currentStock: stockCheck.currentStock
      });
    }

    return validationResults;
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        loading,
        addToCart,
        removeFromCart,
        clearCart,
        updateQuantity,
        getCartTotal,
        getCartCount,
        validateCartStock,
        checkStockAvailability
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