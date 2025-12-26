const ShimmerTable = () => (
    Array.from({ length: 4 }).map((_, item) => (
     <div key={item} className="p-6 border rounded-lg w-full mt-2 animate-pulse">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
        <div className="h-4 w-48 bg-gray-200 rounded" />
        <div className="h-8 w-8 bg-gray-200 rounded" />
        </div>

        {/* Table */}
        <div className="w-full overflow-x-auto">
        <table className="w-full table-auto min-w-[900px]">
            <thead className="bg-gray-100">
            <tr>
                {Array.from({ length: 6 }).map((_, i) => (
                <th key={i} className="px-3 py-2">
                    <div className="h-4 bg-gray-200 rounded" />
                </th>
                ))}
            </tr>
            </thead>
            <tbody>
            {Array.from({ length: 4 }).map((_, r) => (
                <tr key={r} className="border-t">
                {Array.from({ length: 6 }).map((_, c) => (
                    <td key={c} className="px-3 py-3">
                    <div className="h-6 bg-gray-200 rounded" />
                    </td>
                ))}
                </tr>
            ))}
            </tbody>
        </table>
        </div>
    </div>   
    ))
);

export default ShimmerTable;