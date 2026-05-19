function DashboardCard({ children, className = '', title }) {
  return (
    <section className={`dashboard-card ${className}`.trim()}>
      {title && (
        <div className="dashboard-card-header">
          <h2>{title}</h2>
        </div>
      )}
      {children}
    </section>
  );
}

export default DashboardCard;
