import { Link } from 'react-router-dom';

function QuickActionCard({ accentColor, description, icon, label, to }) {
  return (
    <Link
      className="dashboard-quick-action"
      style={{ '--dashboard-quick-action-accent': accentColor }}
      to={to}
    >
      <span className="dashboard-quick-action-icon" aria-hidden="true">
        <i className={icon} />
      </span>
      <span className="dashboard-quick-action-copy">
        <span className="dashboard-quick-action-title">{label}</span>
        <span className="dashboard-quick-action-description">{description}</span>
      </span>
    </Link>
  );
}

export default QuickActionCard;
