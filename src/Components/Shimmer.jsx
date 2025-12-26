const Shimmer = ({ rows = 1 }) => (
    <div className="space-y-2 animate-pulse">
        {Array.from({ length: rows }).map((_, i) => (
        <div
            key={i}
            className="h-6 bg-gray-200 rounded"
        />
        ))}
    </div>
);

export default Shimmer;