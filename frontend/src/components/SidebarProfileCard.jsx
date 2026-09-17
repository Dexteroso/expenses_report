export default function SidebarProfileCard({ user }) {
  if (!user) return null;
  const initials = (user.name || '').trim().split(/\s+/).slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase()).join('') || 'U';

  return (
    <div className="desktop-sidebar-profile sidebar-account-card">
      <span className="desktop-sidebar-avatar" aria-hidden="true">{initials}</span>
      <span className="desktop-sidebar-profile-copy">
        <span className="desktop-sidebar-profile-name">{user.name}</span>
        <span className="sidebar-account-email" title={user.email}>{user.email}</span>
      </span>
    </div>
  );
}
