function DashboardHero({ children, greeting, illustrationSrc, subtitle }) {
  return (
    <section className="dashboard-hero-card">
      <div className="dashboard-hero-content">
        <div className="dashboard-hero-copy">
          <h1>{greeting}</h1>
          <p>{subtitle}</p>
        </div>

        {children}

        {illustrationSrc && (
          <img
            alt=""
            aria-hidden="true"
            className="dashboard-hero-illustration"
            src={illustrationSrc}
          />
        )}
      </div>
    </section>
  );
}

export default DashboardHero;
