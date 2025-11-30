import React, { useMemo } from 'react';
import type { Product, LandeData } from '../types';
import { compareiPhoneProducts, getProductSortWeight } from '../utils/sorter';

interface Props {
    data: LandeData;
}

const CATEGORY_ORDER = ['iPhone', 'iPad', 'Mac', 'Watch', 'AirPods', 'Other'];

const ProductTable: React.FC<Props> = ({ data }) => {
    const sortedProducts = useMemo(() => {
        const allProducts: Product[] = [];

        // Iterate through categories in specific order
        CATEGORY_ORDER.forEach((category) => {
            const products = data.categories[category] || [];

            // Sort products within category
            const sorted = [...products].sort((a, b) => {
                if (category === 'iPhone') {
                    return compareiPhoneProducts(a, b);
                }
                // For other categories, use general weight or model name
                const weightA = getProductSortWeight(a);
                const weightB = getProductSortWeight(b);
                if (weightA !== weightB) {
                    return weightA - weightB;
                }
                return a.model.localeCompare(b.model);
            });

            allProducts.push(...sorted);
        });

        // Also include any categories not in the predefined list (just in case)
        Object.keys(data.categories).forEach((category) => {
            if (!CATEGORY_ORDER.includes(category)) {
                allProducts.push(...(data.categories[category] || []));
            }
        });

        return allProducts;
    }, [data]);

    if (sortedProducts.length === 0) {
        return <div className="text-center p-4 text-gray-500">暂无产品数据</div>;
    }

    return (
        <div className="overflow-x-auto shadow-md sm:rounded-lg">
            <table className="w-full text-sm text-left text-gray-500">
                <thead className="text-xs text-white uppercase bg-blue-500">
                    <tr>
                        <th scope="col" className="px-6 py-3 w-[30%]">
                            产品名称
                        </th>
                        <th scope="col" className="px-6 py-3 w-[20%]">
                            规格
                        </th>
                        <th scope="col" className="px-6 py-3 w-[20%]">
                            颜色
                        </th>
                        <th scope="col" className="px-6 py-3 w-[30%]">
                            价格
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {sortedProducts.map((product, index) => {
                        const priceDisplay =
                            product.prices.length > 0 ? (product.prices.length === 1 ? `¥${product.prices[0]}` : `¥${product.prices.join('/')} ${product.colors.length > 1 ? `(${product.colors.join('/')})` : ''}`) : '价格面议';

                        const colorDisplay = product.colors.length > 0 ? product.colors.join('/') : '-';
                        const specDisplay = [product.storage, product.region].filter(Boolean).join(' ') || '-';
                        const versionDisplay = product.version || '-';

                        return (
                            <tr key={index} className="bg-white border-b hover:bg-blue-50 even:bg-gray-50">
                                <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                                    <div className="font-bold">{product.model}</div>
                                    <div className="text-xs text-gray-500">{versionDisplay}</div>
                                </td>
                                <td className="px-6 py-4">{specDisplay}</td>
                                <td className="px-6 py-4">{colorDisplay}</td>
                                <td className="px-6 py-4 font-bold text-red-500 text-left">{priceDisplay}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            <div className="text-center text-gray-400 text-xs mt-4 mb-2">* 价格单位：人民币元 | * 现货价格为最新报价，颜色后面对应不同颜色价格</div>
        </div>
    );
};

export default ProductTable;
