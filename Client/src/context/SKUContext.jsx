import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getSKUs, createSKU as createSKUApi, updateSKU as updateSKUApi } from '@/api/cargo.api';
import { useToast } from './ToastContext';

const SKUContext = createContext(null);

export const useSKU = () => {
  const context = useContext(SKUContext);
  if (!context) {
    throw new Error('useSKU must be used within SKUProvider');
  }
  return context;
};

export const SKUProvider = ({ children }) => {
  const { showToast } = useToast();
  const [skus, setSkus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 1. Initial / On-demand Fetch
  const fetchSKUs = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      setError(null);
      // axios interceptor unwraps response.data directly => res = { success, count, skus }
      const res = await getSKUs(params);
      const list = res?.skus || res?.data?.skus || [];
      setSkus(list);
      return list;
    } catch (err) {
      console.error('Fetch SKUs error:', err);
      const errMsg = err?.response?.data?.message || err?.message || 'Failed to load SKUs';
      setError(errMsg);
      showToast('Failed to load SKUs', 'error');
      return [];
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // Initial fetch on mount
  useEffect(() => {
    fetchSKUs();
  }, [fetchSKUs]);

  // 2. Create SKU
  const createSKU = useCallback(async (payload) => {
    try {
      setError(null);
      // axios interceptor unwraps response.data directly => res = { success, message, sku }
      const res = await createSKUApi(payload);
      if (res?.success || res?.sku) {
        const createdSKU = res?.sku || payload;
        setSkus(prev => [createdSKU, ...prev.filter(s => s._id !== createdSKU._id && s.skuCode !== createdSKU.skuCode)]);
        showToast('SKU created successfully', 'success');
        return { success: true, sku: createdSKU };
      } else {
        const errMsg = res?.message || 'Failed to create SKU';
        setError(errMsg);
        showToast('Failed to create SKU', 'error');
        return { success: false, message: errMsg };
      }
    } catch (err) {
      console.error('Create SKU error:', err);
      const errMsg = err?.response?.data?.message || err?.message || 'Failed to create SKU';
      setError(errMsg);
      showToast('Failed to create SKU', 'error');
      return { success: false, message: errMsg };
    }
  }, [showToast]);

  // 3. Update SKU
  const updateSKU = useCallback(async (id, payload) => {
    try {
      setError(null);
      // axios interceptor unwraps response.data directly => res = { success, message, sku }
      const res = await updateSKUApi(id, payload);
      if (res?.success || res?.sku) {
        const updatedSKU = res?.sku || { _id: id, ...payload };
        setSkus(prev =>
          prev.map(sku => (sku._id === id || sku.skuCode === updatedSKU.skuCode ? updatedSKU : sku))
        );
        showToast('SKU updated successfully', 'success');
        return { success: true, sku: updatedSKU };
      } else {
        const errMsg = res?.message || 'Failed to update SKU';
        setError(errMsg);
        showToast('Failed to update SKU', 'error');
        return { success: false, message: errMsg };
      }
    } catch (err) {
      console.error('Update SKU error:', err);
      const errMsg = err?.response?.data?.message || err?.message || 'Failed to update SKU';
      setError(errMsg);
      showToast('Failed to update SKU', 'error');
      return { success: false, message: errMsg };
    }
  }, [showToast]);

  // 4. Deactivate / Activate SKU
  const deactivateSKU = useCallback(async (skuOrId) => {
    const targetId = typeof skuOrId === 'object' ? skuOrId._id : skuOrId;
    const currentSku = typeof skuOrId === 'object' ? skuOrId : skus.find(s => s._id === targetId);
    const newStatus = currentSku?.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const isDeactivating = newStatus === 'INACTIVE';

    // Optimistic UI update
    setSkus(prev =>
      prev.map(s => (s._id === targetId ? { ...s, status: newStatus } : s))
    );

    try {
      setError(null);
      const res = await updateSKUApi(targetId, { status: newStatus });
      if (res?.success || res?.sku) {
        const updatedSKU = res?.sku || { ...currentSku, status: newStatus };
        setSkus(prev =>
          prev.map(s => (s._id === targetId ? updatedSKU : s))
        );
        const toastMessage = isDeactivating
          ? 'SKU deactivated successfully'
          : 'SKU activated successfully';
        showToast(toastMessage, 'success');
        return { success: true, sku: updatedSKU };
      } else {
        // Revert optimistic update
        if (currentSku) {
          setSkus(prev =>
            prev.map(s => (s._id === targetId ? currentSku : s))
          );
        }
        const errMsg = res?.message || (isDeactivating ? 'Failed to deactivate SKU' : 'Failed to update SKU');
        setError(errMsg);
        showToast(isDeactivating ? 'Failed to deactivate SKU' : 'Failed to update SKU', 'error');
        return { success: false, message: errMsg };
      }
    } catch (err) {
      console.error('Deactivate SKU error:', err);
      // Revert optimistic update
      if (currentSku) {
        setSkus(prev =>
          prev.map(s => (s._id === targetId ? currentSku : s))
        );
      }
      const errMsg = err?.response?.data?.message || err?.message || (isDeactivating ? 'Failed to deactivate SKU' : 'Failed to update SKU');
      setError(errMsg);
      showToast(isDeactivating ? 'Failed to deactivate SKU' : 'Failed to update SKU', 'error');
      return { success: false, message: errMsg };
    }
  }, [skus, showToast]);

  const value = {
    skus,
    loading,
    error,
    fetchSKUs,
    createSKU,
    updateSKU,
    deactivateSKU
  };

  return <SKUContext.Provider value={value}>{children}</SKUContext.Provider>;
};

export default SKUProvider;
