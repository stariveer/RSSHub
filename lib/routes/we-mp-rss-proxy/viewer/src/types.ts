export interface Product {
    brand?: string;
    model: string;
    version?: string;
    region?: string;
    storage?: string;
    colors: string[];
    status?: string;
    prices: number[];
    notes?: string;
    originalText?: string;
}

export interface CategoryData {
    [category: string]: Product[];
}

export interface LandeData {
    date: string;
    title: string;
    generatedAt: string;
    categories: CategoryData;
}

export interface IndexItem {
    fileName: string;
    date: string;
    title: string;
    priceStr: string;
}
