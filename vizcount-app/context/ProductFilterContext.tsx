import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { database } from '@/db';
import { DefinedProduct } from '@/db/models/DefinedProduct';

export interface SelectedProduct {
    pid: number;
    name: string;
}

interface ProductFilterContextType {
    selectedProduct: SelectedProduct | 'All';
    setSelectedProduct: (p: SelectedProduct | 'All') => void;
    definedProducts: SelectedProduct[];
}

const ProductFilterContext = createContext<ProductFilterContextType>({
    selectedProduct: 'All',
    setSelectedProduct: () => { },
    definedProducts: [],
});

export function ProductFilterProvider({ children }: { children: ReactNode }) {
    const [selectedProduct, setSelectedProduct] = useState<SelectedProduct | 'All'>('All');
    const [definedProducts, setDefinedProducts] = useState<SelectedProduct[]>([]);

    const fetchDefinedProducts = async () => {
        try {
            const collection = database.collections.get<DefinedProduct>('defined_products');
            const all = await collection.query().fetch();
            setDefinedProducts(all.map(p => ({ pid: p.pid, name: p.name })));
        } catch (e) {
            console.error('[ProductFilter] Failed to load defined products', e);
        }
    };

    useEffect(() => {
        fetchDefinedProducts();
        const sub = database.collections.get('defined_products').changes.subscribe(() => {
            fetchDefinedProducts();
        });
        return () => sub.unsubscribe();
    }, []);

    return (
        <ProductFilterContext.Provider value={{ selectedProduct, setSelectedProduct, definedProducts }}>
            {children}
        </ProductFilterContext.Provider>
    );
}

export function useProductFilter() {
    return useContext(ProductFilterContext);
}
