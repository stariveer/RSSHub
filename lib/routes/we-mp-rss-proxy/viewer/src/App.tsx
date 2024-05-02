import { useState, useEffect } from 'react';
import type { IndexItem, LandeData } from './types';
import ProductTable from './components/ProductTable';

function App() {
    const [indexData, setIndexData] = useState<IndexItem[]>([]);
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [currentData, setCurrentData] = useState<LandeData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        fetch('/data/index.json')
            .then((res) => {
                if (!res.ok) throw new Error('Failed to load index');
                return res.json();
            })
            .then((data: IndexItem[]) => {
                setIndexData(data);
                if (data.length > 0) {
                    setSelectedFile(data[0].fileName);
                }
            })
            .catch((err) => {
                console.error(err);
                setError('无法加载数据索引，请确保已生成数据。');
            });
    }, []);

    useEffect(() => {
        if (!selectedFile) return;

        setLoading(true);
        setError(null);
        fetch(`/data/${selectedFile}`)
            .then((res) => {
                if (!res.ok) throw new Error('Failed to load data');
                return res.json();
            })
            .then((data: LandeData) => {
                setCurrentData(data);
                setLoading(false);
            })
            .catch((err) => {
                console.error(err);
                setError('加载详情失败');
                setLoading(false);
            });
    }, [selectedFile]);

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row">
            {/* Mobile Header */}
            <div className="md:hidden bg-white p-4 shadow-sm flex justify-between items-center sticky top-0 z-10">
                <h1 className="font-bold text-lg text-gray-800">云鹏数码报价</h1>
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 rounded-md hover:bg-gray-100">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
            </div>

            {/* Sidebar */}
            <div
                className={`
        fixed inset-y-0 left-0 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0 transition duration-200 ease-in-out
        w-64 bg-white shadow-md z-20 flex flex-col h-screen
      `}
            >
                <div className="p-6 border-b">
                    <h1 className="text-xl font-bold text-gray-800">历史报价</h1>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                    {indexData.map((item) => (
                        <button
                            key={item.fileName}
                            onClick={() => {
                                setSelectedFile(item.fileName);
                                setIsSidebarOpen(false);
                            }}
                            className={`w-full text-left p-3 rounded-lg mb-1 transition-colors ${selectedFile === item.fileName ? 'bg-blue-50 text-blue-600 font-medium border-l-4 border-blue-500' : 'hover:bg-gray-50 text-gray-600'}`}
                        >
                            <div className="font-medium">{item.date}</div>
                            <div className="text-xs text-gray-400 truncate">{item.title}</div>
                        </button>
                    ))}
                    {indexData.length === 0 && !error && <div className="p-4 text-center text-gray-400 text-sm">暂无历史数据</div>}
                </div>
            </div>

            {/* Overlay for mobile sidebar */}
            {isSidebarOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-10 md:hidden" onClick={() => setIsSidebarOpen(false)}></div>}

            {/* Main Content */}
            <div className="flex-1 p-4 md:p-8 overflow-y-auto h-screen">
                <div className="max-w-5xl mx-auto">
                    {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 border border-red-200">{error}</div>}

                    {loading ? (
                        <div className="flex justify-center items-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                        </div>
                    ) : currentData ? (
                        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                            <div className="p-6 border-b bg-white">
                                <h2 className="text-2xl font-bold text-gray-800 mb-2">{currentData.title}</h2>
                                <div className="flex items-center text-sm text-gray-500 space-x-4">
                                    <span>发布日期: {currentData.date}</span>
                                    <span>生成时间: {new Date(currentData.generatedAt).toLocaleString()}</span>
                                </div>
                            </div>
                            <div className="p-0">
                                <ProductTable data={currentData} />
                            </div>
                        </div>
                    ) : (
                        !error && <div className="text-center text-gray-500 mt-20">请选择一个日期查看报价</div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default App;
