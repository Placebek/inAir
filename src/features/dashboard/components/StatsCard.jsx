function StatsCard({ title, value, color }) {
  return (
    <div className={`${color} text-white p-4 rounded-lg shadow`}>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-2xl">{value}</p>
    </div>
  );
}

export default StatsCard;