// context/CartContext.js
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const CartContext = createContext();

// Storage key
const CART_STORAGE_KEY = "@medical_equipment_cart";

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const BASE_URL = "http://192.168.115.72:5000";

  // Load cart from storage on mount
  useEffect(() => {
    loadCartFromStorage();
  }, []);

  const loadCartFromStorage = async () => {
    try {
      const storedCart = await AsyncStorage.getItem(CART_STORAGE_KEY);
      if (storedCart) {
        const parsedCart = JSON.parse(storedCart);
        // Ensure all items have selected property
        const cartWithSelection = parsedCart.map(item => ({
          ...item,
          selected: item.selected !== undefined ? item.selected : true
        }));
        setCart(cartWithSelection);
      }
      setInitialized(true);
    } catch (error) {
      console.error("Error loading cart from storage:", error);
      setInitialized(true);
    }
  };

  // Save cart to storage whenever it changes
  useEffect(() => {
    if (initialized && cart.length > 0) {
      saveCartToStorage();
    }
  }, [cart, initialized]);

  const saveCartToStorage = async () => {
    try {
      await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (error) {
      console.error("Error saving cart to storage:", error);
    }
  };

  // Clear storage when cart is empty
  useEffect(() => {
    if (initialized && cart.length === 0) {
      AsyncStorage.removeItem(CART_STORAGE_KEY);
    }
  }, [cart, initialized]);

  // Check stock availability
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

  // Add to cart
  const addToCart = async (item) => {
    setLoading(true);
    try {
      const stockCheck = await checkStockAvailability(item._id, item.quantity || 1);

      if (!stockCheck.available) {
        throw new Error(`Only ${stockCheck.currentStock} unit(s) of "${stockCheck.equipmentName}" available`);
      }

      setCart(prev => {
        const existingItem = prev.find(cartItem => cartItem._id === item._id);
        if (existingItem) {
          const totalRequested = (existingItem.quantity || 0) + (item.quantity || 1);
          if (totalRequested > stockCheck.currentStock) {
            return prev; // Don't add if exceeds stock
          }

          return prev.map(cartItem =>
            cartItem._id === item._id
              ? {
                ...cartItem,
                quantity: (cartItem.quantity || 1) + (item.quantity || 1),
                currentStock: stockCheck.currentStock,
                selected: true
              }
              : cartItem
          );
        } else {
          return [...prev, {
            ...item,
            quantity: item.quantity || 1,
            currentStock: stockCheck.currentStock,
            selected: true
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

  // Prepare item for immediate booking (Book Now)
  const prepareForImmediateBooking = async (item) => {
    setLoading(true);
    try {
      const stockCheck = await checkStockAvailability(item._id, item.quantity || 1);

      if (!stockCheck.available) {
        throw new Error(`Only ${stockCheck.currentStock} unit(s) of "${stockCheck.equipmentName}" available`);
      }

      return {
        success: true,
        bookingItem: {
          ...item,
          quantity: item.quantity || 1,
          currentStock: stockCheck.currentStock
        }
      };
    } catch (error) {
      console.error("Error preparing for booking:", error);
      return { success: false, message: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Remove from cart
  const removeFromCart = (id) => {
    setCart(prev => prev.filter(item => item._id !== id));
  };

  // Clear cart
  const clearCart = () => {
    setCart([]);
  };

  // Remove selected items after booking
  const removeSelectedItems = () => {
    setCart(prev => prev.filter(item => !item.selected));
  };

  // Update quantity
  const updateQuantity = async (id, newQuantity) => {
    if (newQuantity < 1) {
      removeFromCart(id);
      return false;
    }

    const item = cart.find(item => item._id === id);
    if (!item) return false;

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
            currentStock: stockCheck.currentStock
          }
          : item
      )
    );

    return true;
  };

  // Toggle item selection
  const toggleItemSelection = (id) => {
    setCart(prev =>
      prev.map(item =>
        item._id === id
          ? { ...item, selected: !item.selected }
          : item
      )
    );
  };

  // Select all items
  const selectAllItems = () => {
    setCart(prev =>
      prev.map(item => ({ ...item, selected: true }))
    );
  };

  // Deselect all items
  const deselectAllItems = () => {
    setCart(prev =>
      prev.map(item => ({ ...item, selected: false }))
    );
  };

  // Get selected items
  const getSelectedItems = () => {
    return cart.filter(item => item.selected);
  };

  // Get cart total (all items)
  const getCartTotal = () => {
    return cart.reduce((sum, item) => {
      const itemTotal = item.pricePerDay * (item.quantity || 1);
      return sum + itemTotal;
    }, 0);
  };

  // Get selected total
  const getSelectedTotal = () => {
    return cart.reduce((sum, item) => {
      if (item.selected) {
        const itemTotal = item.pricePerDay * (item.quantity || 1);
        return sum + itemTotal;
      }
      return sum;
    }, 0);
  };

  // Get cart count (all items)
  const getCartCount = () => {
    return cart.reduce((count, item) => count + (item.quantity || 1), 0);
  };

  // Get selected count
  const getSelectedCount = () => {
    return cart.reduce((count, item) => {
      if (item.selected) {
        return count + (item.quantity || 1);
      }
      return count;
    }, 0);
  };

  // Validate selected stock
  const validateSelectedStock = async () => {
    const selectedItems = getSelectedItems();
    const validationResults = [];

    for (const item of selectedItems) {
      const stockCheck = await checkStockAvailability(item._id, item.quantity || 1);
      validationResults.push({
        itemId: item._id,
        itemName: item.equipmentName,
        requested: item.quantity || 1,
        available: stockCheck.available,
        currentStock: stockCheck.currentStock,
        isOutOfStock: !stockCheck.available
      });
    }

    return validationResults;
  };

  // Validate all cart items stock
  const validateCartStock = async () => {
    const validationResults = [];

    for (const item of cart) {
      const stockCheck = await checkStockAvailability(item._id, item.quantity || 1);
      validationResults.push({
        itemId: item._id,
        itemName: item.equipmentName,
        requested: item.quantity || 1,
        available: stockCheck.available,
        currentStock: stockCheck.currentStock,
        isOutOfStock: !stockCheck.available
      });
    }

    return validationResults;
  };

  // Refresh cart stock
  const refreshCartStock = async () => {
    const updatedCart = await Promise.all(
      cart.map(async (item) => {
        const stockCheck = await checkStockAvailability(item._id, item.quantity || 1);
        return {
          ...item,
          currentStock: stockCheck.currentStock
        };
      })
    );
    setCart(updatedCart);
    return updatedCart;
  };

  // Check if item is in cart
  const isItemInCart = (itemId) => {
    return cart.some(item => item._id === itemId);
  };

  // Get cart item quantity
  const getCartItemQuantity = (itemId) => {
    const item = cart.find(item => item._id === itemId);
    return item ? item.quantity : 0;
  };

  // Get available quantity (stock - cart quantity)
  const getAvailableQuantity = async (itemId) => {
    const stockCheck = await checkStockAvailability(itemId, 1);
    const cartQuantity = getCartItemQuantity(itemId);
    return Math.max(0, stockCheck.currentStock - cartQuantity);
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        loading,
        initialized,
        addToCart,
        prepareForImmediateBooking,
        removeFromCart,
        clearCart,
        removeSelectedItems,
        updateQuantity,
        toggleItemSelection,
        selectAllItems,
        deselectAllItems,
        getSelectedItems,
        getCartTotal,
        getSelectedTotal,
        getCartCount,
        getSelectedCount,
        validateSelectedStock,
        validateCartStock,
        checkStockAvailability,
        refreshCartStock,
        isItemInCart,
        getCartItemQuantity,
        getAvailableQuantity
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