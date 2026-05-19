function KpiCard({
  accentColor,
  children,
  className = '',
  icon,
  title,
}) {
  return (
    <article
      className={`dashboard-kpi-shell ${className}`.trim()}
      style={{ '--dashboard-kpi-accent': accentColor }}
    >
      <div className="dashboard-kpi-shell-header">
        <span>{title}</span>
      </div>
      <span className="dashboard-kpi-icon" aria-hidden="true">
        <i className={icon} />
      </span>
      {children}
    </article>
  );
}

export default KpiCard;
