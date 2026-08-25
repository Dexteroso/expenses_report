import { useEffect, useState } from 'react';
import dexforgeIcon from '../assets/brand/dexforge-icon-transparent.png';
import {
  Button,
  Card,
  Input,
  Modal,
  PageHeader,
  PageShell,
  colors,
  gradients,
  radius,
  shadows,
  spacing,
  typography,
} from './index';

const colorMix = (color, amount = 10) => `color-mix(in srgb, ${color} ${amount}%, ${colors.background.surface})`;

const sidebarSections = [
  {
    group: 'Foundation',
    items: [
      ['overview', 'Overview'],
      ['typography', 'Typography'],
      ['colors', 'Colors'],
      ['spacing', 'Spacing'],
      ['radius', 'Radius'],
      ['shadows', 'Shadows'],
    ],
  },
  {
    group: 'Components',
    items: [
      ['buttons', 'Buttons'],
      ['inputs', 'Inputs'],
      ['cards', 'Cards'],
      ['forms', 'Forms'],
      ['tables', 'Tables'],
      ['alerts', 'Alerts'],
      ['modals', 'Modals'],
    ],
  },
  {
    group: 'Patterns',
    items: [
      ['dashboard', 'Dashboard'],
      ['empty-states', 'Empty States'],
    ],
  },
];

const sectionShellStyle = {
  display: 'grid',
  gap: spacing.lg,
  scrollMarginTop: spacing.xl,
};

const showcaseGridStyle = {
  display: 'grid',
  gap: spacing.lg,
  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
};

const compactGridStyle = {
  display: 'grid',
  gap: spacing.md,
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
};

const fieldGridStyle = {
  display: 'grid',
  gap: spacing.lg,
  gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
};

const foundationSplitStyle = {
  alignItems: 'start',
  display: 'grid',
  gap: spacing.lg,
  gridTemplateColumns: 'minmax(0, 7fr) minmax(280px, 3fr)',
};

const statusTone = {
  danger: {
    background: colorMix(colors.status.danger, 10),
    border: colors.status.danger,
    color: colors.status.error,
  },
  error: {
    background: colorMix(colors.status.error, 10),
    border: colors.status.error,
    color: colors.status.error,
  },
  info: {
    background: colorMix(colors.brand.dashboardBlue, 10),
    border: colors.brand.dashboardBlue,
    color: colors.brand.dashboardBlue,
  },
  success: {
    background: colorMix(colors.status.success, 10),
    border: colors.status.success,
    color: colors.status.success,
  },
  warning: {
    background: colorMix(colors.kpi.warningYellow, 14),
    border: colors.kpi.warningYellow,
    color: '#8A6D00',
  },
};

const typographySamples = [
  {
    color: colors.brand.cyan,
    description: 'Primary screen heading for pages such as Dashboard or Movimientos.',
    example: 'Título de Página',
    size: '40px',
    token: 'pageTitle',
    weight: '900',
    style: typography.pageTitle,
  },
  {
    color: colors.text.muted,
    description: 'Supporting line below a page title.',
    example: 'Subtítulo de página',
    size: '20px',
    token: 'pageSubtitle',
    weight: '800',
    style: { ...typography.sectionTitle, color: colors.text.muted },
  },
  {
    color: colors.text.primary,
    description: 'Section heading for grouped content.',
    example: 'Resumen mensual',
    size: '20px',
    token: 'sectionTitle',
    weight: '800',
    style: typography.sectionTitle,
  },
  {
    color: colors.text.primary,
    description: 'Card title for KPI and form surfaces.',
    example: 'Gastos operativos',
    size: '18px',
    token: 'cardTitle',
    weight: '800',
    style: typography.cardTitle,
  },
  {
    color: colors.text.spreadsheetBody,
    description: 'Default body copy and helper descriptions.',
    example: 'Total acumulado por servicios y herramientas.',
    size: '12px',
    token: 'body',
    weight: '400',
    style: typography.body,
  },
  {
    color: colors.text.muted,
    description: 'Metadata, labels, and timestamps.',
    example: 'Actualizado hace 12 minutos',
    size: '12px',
    token: 'caption',
    weight: '650',
    style: typography.caption,
  },
  {
    color: colors.status.error,
    description: 'Validation text and destructive feedback.',
    example: 'El monto debe ser mayor a cero.',
    size: '12px',
    token: 'errorText',
    weight: '650',
    style: { ...typography.caption, color: colors.status.error },
  },
];

const colorSwatches = [
  {
    hex: colors.brand.cyan,
    name: 'Primary Cyan',
    usage: 'Primary buttons, focus states, product highlights, active navigation.',
  },
  {
    gradient: gradients.primary,
    hex: '#582888 -> #557EFA',
    name: 'App Gradient',
    usage: 'Sidebar, mobile drawer, brand areas, and hero sections.',
  },
  {
    hex: colors.status.success,
    name: 'Success',
    usage: 'Saved records, healthy status chips, positive confirmations.',
  },
  {
    hex: colors.kpi.warningYellow,
    name: 'Warning',
    usage: 'Reconciliation notices, budget caution, pending review states.',
  },
  {
    hex: colors.status.danger,
    name: 'Danger',
    usage: 'Destructive actions, critical spend indicators, deletion flows.',
  },
  {
    hex: colors.background.app,
    name: 'Background',
    usage: 'Application canvas behind content cards and dashboard surfaces.',
  },
  {
    hex: colors.background.surface,
    name: 'Surface',
    usage: 'Cards, form panels, tables, modals, and primary content regions.',
  },
];

const foundationTokens = {
  spacing: [
    ['2xs', spacing['2xs'], 'Micro gaps and icon offsets.'],
    ['xs', spacing.xs, 'Compact field and label rhythm.'],
    ['sm', spacing.sm, 'Small button and card gaps.'],
    ['md', spacing.md, 'Default inner spacing.'],
    ['lg', spacing.lg, 'Section and form grouping.'],
    ['xl', spacing.xl, 'Card padding and page rhythm.'],
  ],
  radius: [
    ['input', radius.input, 'Inputs and selects.'],
    ['button', radius.button, 'Primary and secondary actions.'],
    ['table', radius.table, 'Table and compact surfaces.'],
    ['dashboardCard', radius.dashboardCard, 'Metric cards.'],
    ['card', radius.card, 'Large showcase cards.'],
    ['pill', radius.pill, 'Badges and chips.'],
  ],
  shadows: [
    ['card', shadows.card, 'Primary elevated surfaces.'],
    ['table', shadows.table, 'Compact panels and data regions.'],
    ['modal', shadows.modal, 'Dialog focus layer.'],
    ['button', shadows.button, 'Primary action emphasis.'],
    ['focus', shadows.focus, 'Input focus/error halo.'],
  ],
};

const kpiCards = [
  {
    statusColor: colors.status.success,
    statusLabel: '+12.4%',
    title: 'Income',
    value: '$84,300',
  },
  {
    statusColor: colors.status.danger,
    statusLabel: '+5.2%',
    title: 'Expenses',
    value: '$65,880',
  },
  {
    statusColor: colors.kpi.warningYellow,
    statusLabel: 'Near limit',
    title: 'Budget Usage',
    value: '82%',
  },
];

const cardExamples = [
  ['Default Card', 'Large surface for documentation and high-value dashboard content.', 'default'],
  ['Compact Card', 'Dense content such as tables, alerts, and sidebar previews.', 'compact'],
  ['Metric Card', 'Focused KPI surface with clear number hierarchy.', 'metric'],
];

const movementRows = [
  {
    account: 'Santander Empresas',
    amount: '-$1,280.00',
    category: 'Operacion',
    concept: 'AWS infraestructura',
    date: '02 Jun 2026',
    status: 'Pagado',
    tone: 'success',
  },
  {
    account: 'Amex Corporativa',
    amount: '-$460.50',
    category: 'Ventas',
    concept: 'Comision Stripe',
    date: '01 Jun 2026',
    status: 'Conciliar',
    tone: 'warning',
  },
  {
    account: 'Santander Empresas',
    amount: '-$2,950.00',
    category: 'Equipo',
    concept: 'Monitor ultrawide',
    date: '29 May 2026',
    status: 'Pendiente',
    tone: 'info',
  },
  {
    account: 'Amex Corporativa',
    amount: '-$215.00',
    category: 'Marketing',
    concept: 'Anuncios LinkedIn',
    date: '28 May 2026',
    status: 'Revisar',
    tone: 'error',
  },
  {
    account: 'Caja chica',
    amount: '+$780.00',
    category: 'Servicios',
    concept: 'Reembolso cliente',
    date: '27 May 2026',
    status: 'Pagado',
    tone: 'success',
  },
];

const emptyStates = [
  {
    action: 'Crear movimiento',
    icon: '0',
    title: 'No movements found',
    text: 'No hay ingresos o egresos para los filtros seleccionados.',
  },
  {
    action: 'Ver todos',
    icon: 'A',
    title: 'No activity records',
    text: 'La actividad auditada aparecera despues del primer evento del usuario.',
  },
  {
    action: 'Configurar presupuesto',
    icon: '$',
    title: 'No budget configured',
    text: 'Agrega metas por concepto para habilitar variaciones y alertas.',
  },
];

function useActiveSection() {
  const [activeSection, setActiveSection] = useState('overview');

  useEffect(() => {
    const targets = sidebarSections.flatMap((section) => section.items.map(([id]) => document.getElementById(id))).filter(Boolean);

    const observer = new IntersectionObserver(
      (entries) => {
        const hashId = window.location.hash.slice(1);
        const hashEntry = entries.find((entry) => entry.target.id === hashId && entry.isIntersecting);

        if (hashEntry) {
          setActiveSection(hashId);
          return;
        }

        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];

        if (visibleEntry?.target?.id) {
          setActiveSection(visibleEntry.target.id);
        }
      },
      {
        rootMargin: '-18% 0px -68% 0px',
        threshold: 0.01,
      }
    );

    targets.forEach((target) => observer.observe(target));

    return () => observer.disconnect();
  }, []);

  return [activeSection, setActiveSection];
}

function SectionHeading({ children, subtitle }) {
  return (
    <div style={{ display: 'grid', gap: spacing.xs, maxWidth: 720 }}>
      <h2 style={{ ...typography.sectionTitle, margin: 0 }}>{children}</h2>
      {subtitle && <p style={{ ...typography.caption, margin: 0 }}>{subtitle}</p>}
    </div>
  );
}

function VersionBadge({ children }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 32,
        padding: `0 ${spacing.md}`,
        border: `1px solid ${colorMix(colors.brand.cyan, 35)}`,
        borderRadius: radius.pill,
        background: colorMix(colors.brand.cyan, 12),
        color: colors.brand.cyan,
        fontSize: typography.caption.fontSize,
        fontWeight: 900,
        lineHeight: 1,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}

function StatusBadge({ children, tone = 'info' }) {
  const resolvedTone = statusTone[tone] || statusTone.info;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 26,
        padding: `0 ${spacing.sm}`,
        border: `1px solid ${resolvedTone.border}`,
        borderRadius: radius.pill,
        background: resolvedTone.background,
        color: resolvedTone.color,
        fontSize: typography.caption.fontSize,
        fontWeight: 850,
        lineHeight: 1,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}

function ShowcaseSidebar({ activeSection, onSectionSelect }) {
  return (
    <aside
      aria-label="Design system sections"
      style={{
        position: 'sticky',
        top: spacing.xl,
        display: 'grid',
        gridTemplateRows: 'auto minmax(0, 1fr)',
        gap: spacing.lg,
        width: '100%',
        height: `calc(100vh - ${spacing.xl} - ${spacing.xl})`,
        padding: spacing.lg,
        border: `1px solid ${colorMix(colors.brand.blue, 22)}`,
        borderRadius: radius.dashboardCard,
        background: gradients.primary,
        boxShadow: shadows.drawer,
        boxSizing: 'border-box',
        color: colors.text.inverse,
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, minWidth: 0 }}>
        <img
          alt=""
          src={dexforgeIcon}
          style={{
            width: 38,
            height: 38,
            borderRadius: radius.input,
            background: 'rgba(255,255,255,0.16)',
            objectFit: 'contain',
            padding: 3,
          }}
        />
        <div style={{ display: 'grid', gap: 2, minWidth: 0 }}>
          <strong style={{ ...typography.ui, color: colors.text.inverse }}>DexForge DS</strong>
          <span style={{ ...typography.caption, color: 'rgba(255,255,255,0.72)' }}>v2 Foundation</span>
        </div>
      </div>

      <nav style={{ display: 'grid', alignContent: 'start', gap: spacing.md, minHeight: 0, overflowY: 'auto' }}>
        {sidebarSections.map((section) => (
          <div key={section.group} style={{ display: 'grid', gap: spacing.xs }}>
            <span
              style={{
                color: 'rgba(255,255,255,0.62)',
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: 0,
                textTransform: 'uppercase',
              }}
            >
              {section.group}
            </span>
            <div style={{ display: 'grid', gap: 2 }}>
              {section.items.map(([id, label]) => {
                const isActive = activeSection === id;

                return (
                  <a
                    href={`#${id}`}
                    key={id}
                    onClick={() => onSectionSelect(id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      minHeight: 34,
                      padding: `0 ${spacing.sm}`,
                      border: `1px solid ${isActive ? 'rgba(255,255,255,0.38)' : 'transparent'}`,
                      borderRadius: radius.input,
                      background: isActive ? 'rgba(255,255,255,0.18)' : 'transparent',
                      color: colors.text.inverse,
                      fontSize: typography.caption.fontSize,
                      fontWeight: isActive ? 900 : 700,
                      textDecoration: 'none',
                    }}
                  >
                    {label}
                  </a>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}

function HeroSection({ onOpenModal }) {
  return (
    <section
      id="overview"
      style={{
        position: 'relative',
        overflow: 'hidden',
        display: 'grid',
        gap: spacing.xl,
        padding: spacing['3xl'],
        border: `1px solid ${colors.border.subtle}`,
        borderRadius: radius.card,
        background: colors.background.surface,
        boxShadow: shadows.card,
        scrollMarginTop: spacing.xl,
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          height: 8,
          background: gradients.primary,
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: spacing.lg, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.lg, minWidth: 0 }}>
          <img
            alt="DexForge"
            src={dexforgeIcon}
            style={{
              width: 72,
              height: 72,
              borderRadius: radius.dashboardCard,
              background: colorMix(colors.brand.cyan, 9),
              boxShadow: shadows.table,
              objectFit: 'contain',
              padding: spacing.xs,
            }}
          />
          <div style={{ display: 'grid', gap: spacing.xs, minWidth: 0 }}>
            <VersionBadge>v2 Foundation</VersionBadge>
            <h1 style={{ ...typography.pageTitle, margin: 0 }}>DexForge Design System</h1>
            <p style={{ ...typography.body, maxWidth: 680, margin: 0, fontSize: typography.ui.fontSize }}>
              Presentation-ready foundations for a modern fintech workspace: tokens, primitives, dashboard surfaces,
              forms, tables, feedback states, and composed page examples.
            </p>
          </div>
        </div>
        <Button onClick={onOpenModal}>Preview modal</Button>
      </div>
    </section>
  );
}

function TypographyShowcase() {
  return (
    <section id="typography" style={sectionShellStyle}>
      <SectionHeading subtitle="Compact product-copy examples mapped to current DexForge foundation typography.">
        Typography
      </SectionHeading>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {typographySamples.map((sample, index) => (
          <div
            key={sample.token}
            style={{
              display: 'grid',
              gap: spacing.xs,
              padding: `${spacing.md} ${spacing.lg}`,
              borderTop: index === 0 ? 'none' : `1px solid ${colors.border.subtle}`,
            }}
          >
            <div
              style={{
                alignItems: 'start',
                display: 'grid',
                gap: spacing.md,
                gridTemplateColumns: 'minmax(0, 7fr) minmax(96px, 3fr)',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <p style={{ ...sample.style, margin: 0, textAlign: 'left' }}>{sample.example}</p>
              </div>
              <div
                style={{
                  display: 'grid',
                  gap: 2,
                  justifyItems: 'end',
                  justifySelf: 'end',
                  minWidth: 0,
                  textAlign: 'right',
                }}
              >
                <strong style={{ ...typography.ui, color: colors.text.primary }}>{sample.token}</strong>
                <span style={{ ...typography.caption }}>{sample.size} / {sample.weight}</span>
                <code style={{ ...typography.caption, color: sample.color }}>{sample.color}</code>
              </div>
            </div>
            <p style={{ ...typography.body, margin: 0, textAlign: 'center' }}>{sample.description}</p>
          </div>
        ))}
      </Card>
    </section>
  );
}

function ColorSystemShowcase() {
  return (
    <section id="colors" style={sectionShellStyle}>
      <SectionHeading subtitle="Design decisions shown as usage cards, including the app gradient.">
        Colors
      </SectionHeading>
      <div style={{ display: 'grid', gap: spacing.md }}>
        {colorSwatches.map((swatch) => (
          <Card key={swatch.name} variant="compact" style={{ overflow: 'hidden', padding: 0 }}>
            <div
              style={{
                minHeight: 72,
                background: swatch.gradient || swatch.hex,
                borderBottom: `1px solid ${colors.border.subtle}`,
              }}
            />
            <div style={{ display: 'grid', gap: spacing.xs, padding: spacing.md }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: spacing.md, alignItems: 'start' }}>
                <strong style={{ ...typography.cardTitle }}>{swatch.name}</strong>
                <code style={{ ...typography.caption, color: colors.text.primary }}>{swatch.hex}</code>
              </div>
              <p style={{ ...typography.body, margin: 0 }}>{swatch.usage}</p>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}

function FoundationComparison() {
  return (
    <div style={foundationSplitStyle}>
      <TypographyShowcase />
      <ColorSystemShowcase />
    </div>
  );
}

function TokenReferenceCard({ id, items, title }) {
  return (
    <section id={id} style={sectionShellStyle}>
      <SectionHeading subtitle="Compact reference for implementation handoff.">{title}</SectionHeading>
      <Card variant="compact">
        <div style={{ display: 'grid', gap: spacing.sm }}>
          {items.map(([name, value, usage]) => (
            <div
              key={name}
              style={{
                display: 'grid',
                gap: spacing.md,
                gridTemplateColumns: '120px minmax(120px, 1fr) minmax(180px, 1fr)',
                alignItems: 'center',
                padding: spacing.sm,
                border: `1px solid ${colors.border.subtle}`,
                borderRadius: radius.input,
                background: colors.background.surfaceMuted,
              }}
            >
              <strong style={{ ...typography.ui, color: colors.text.primary }}>{name}</strong>
              <code style={{ ...typography.caption, color: colors.text.body }}>{value}</code>
              <span style={{ ...typography.body }}>{usage}</span>
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}

function ButtonShowcase() {
  return (
    <section id="buttons" style={sectionShellStyle}>
      <SectionHeading subtitle="Primary, secondary, ghost, danger, disabled, loading, and icon action treatments.">
        Buttons
      </SectionHeading>
      <Card>
        <div style={{ display: 'flex', gap: spacing.sm, flexWrap: 'wrap' }}>
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button aria-label="Add movement" icon="+" variant="icon" />
          <Button disabled>Disabled</Button>
          <Button isLoading>Loading</Button>
        </div>
      </Card>
    </section>
  );
}

function KpiCard({ statusColor, statusLabel, title, value }) {
  return (
    <Card
      variant="metric"
      style={{
        display: 'grid',
        gap: spacing.md,
        minHeight: 154,
      }}
    >
      <span style={{ ...typography.caption, color: colors.text.muted, textTransform: 'uppercase' }}>{title}</span>
      <strong style={{ color: colors.text.primary, fontSize: '30px', lineHeight: 1 }}>{value}</strong>
      <span
        style={{
          alignSelf: 'start',
          color: statusColor,
          fontSize: typography.caption.fontSize,
          fontWeight: 900,
          lineHeight: 1.2,
        }}
      >
        {statusLabel}
      </span>
    </Card>
  );
}

function DashboardCardShowcase() {
  return (
    <section id="dashboard" style={sectionShellStyle}>
      <SectionHeading subtitle="Neutral title and amount treatments with semantic color reserved for status indicators.">
        Dashboard
      </SectionHeading>
      <div style={showcaseGridStyle}>
        {kpiCards.map((card) => (
          <KpiCard key={card.title} {...card} />
        ))}
      </div>
    </section>
  );
}

function CardShowcase() {
  return (
    <section id="cards" style={sectionShellStyle}>
      <SectionHeading subtitle="Core surface variants used by the showcase and future production migrations.">
        Cards
      </SectionHeading>
      <div style={showcaseGridStyle}>
        {cardExamples.map(([title, text, variant]) => (
          <Card key={title} variant={variant}>
            <h3 style={{ ...typography.cardTitle, margin: 0 }}>{title}</h3>
            <p style={{ ...typography.body, margin: `${spacing.sm} 0 0` }}>{text}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}

function FieldShell({ children, error, helperText, label }) {
  return (
    <label
      style={{
        display: 'grid',
        gap: spacing.xs,
        color: colors.text.body,
        fontSize: typography.caption.fontSize,
        fontWeight: 700,
        minWidth: 0,
      }}
    >
      <span>{label}</span>
      {children}
      {(error || helperText) && (
        <span
          style={{
            color: error ? colors.status.error : colors.text.muted,
            fontSize: typography.caption.fontSize,
            fontWeight: 650,
            lineHeight: 1.35,
          }}
        >
          {error || helperText}
        </span>
      )}
    </label>
  );
}

function SelectField({ disabled = false, error, helperText, label, value }) {
  return (
    <FieldShell error={error} helperText={helperText} label={label}>
      <select
        disabled={disabled}
        onChange={() => {}}
        style={{
          width: '100%',
          minHeight: 34,
          padding: `0 ${spacing.md}`,
          border: `1px solid ${error ? colors.status.error : colors.border.subtle}`,
          borderRadius: radius.input,
          outline: 'none',
          background: disabled ? colors.background.surfaceMuted : colors.background.surface,
          boxSizing: 'border-box',
          color: disabled ? colors.text.disabled : colors.text.body,
          fontFamily: typography.fontFamily,
          fontSize: typography.body.fontSize,
          lineHeight: 1.3,
        }}
        value={value}
      >
        <option value="Operacion">Operacion</option>
        <option value="Ventas">Ventas</option>
        <option value="Equipo">Equipo</option>
        <option value="Santander Empresas">Santander Empresas</option>
        <option value="Amex Corporativa">Amex Corporativa</option>
      </select>
    </FieldShell>
  );
}

function TextareaField({ helperText, label, value }) {
  return (
    <FieldShell helperText={helperText} label={label}>
      <textarea
        onChange={() => {}}
        rows={4}
        style={{
          width: '100%',
          minHeight: 98,
          padding: spacing.md,
          border: `1px solid ${colors.border.subtle}`,
          borderRadius: radius.input,
          outline: 'none',
          resize: 'vertical',
          background: colors.background.surface,
          boxSizing: 'border-box',
          color: colors.text.body,
          fontFamily: typography.fontFamily,
          fontSize: typography.body.fontSize,
          lineHeight: 1.4,
        }}
        value={value}
      />
    </FieldShell>
  );
}

function InputShowcase() {
  return (
    <section id="inputs" style={sectionShellStyle}>
      <SectionHeading subtitle="Default, helper, error, disabled, select, and textarea input states.">
        Inputs
      </SectionHeading>
      <Card>
        <div style={fieldGridStyle}>
          <Input label="Default Input" defaultValue="AWS infraestructura" />
          <Input helperText="Visible in reports and filters." label="Helper Input" defaultValue="Operacion" />
          <Input error="Amount is required." label="Error Input" placeholder="$0.00" />
          <Input disabled label="Disabled Input" defaultValue="Autogenerated folio" />
          <SelectField label="Select Field" value="Santander Empresas" />
          <TextareaField helperText="Optional internal audit context." label="Textarea" value="Monthly platform invoice." />
        </div>
      </Card>
    </section>
  );
}

function FormShowcase() {
  return (
    <section id="forms" style={sectionShellStyle}>
      <SectionHeading subtitle="A realistic movement creation card with default, error, and disabled field states.">
        Forms
      </SectionHeading>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: spacing.md, flexWrap: 'wrap', marginBottom: spacing.lg }}>
          <div>
            <h3 style={{ ...typography.cardTitle, margin: 0 }}>New Movement</h3>
            <p style={{ ...typography.caption, margin: `${spacing.xs} 0 0` }}>Capture an expense and assign it to a payment account.</p>
          </div>
          <StatusBadge tone="info">Draft</StatusBadge>
        </div>
        <form style={{ display: 'grid', gap: spacing.lg }}>
          <div style={fieldGridStyle}>
            <Input label="Date" type="date" defaultValue="2026-06-02" />
            <SelectField label="Category" value="Operacion" />
            <Input label="Concept" defaultValue="AWS infraestructura" />
            <Input label="Description" defaultValue="Production workspace invoice" />
            <Input error="Amount is required for expense movements." label="Amount" placeholder="$0.00" type="number" />
            <SelectField label="Payment Account" value="Santander Empresas" />
            <Input disabled label="Disabled State" defaultValue="Autogenerated folio" />
            <SelectField disabled helperText="Locked while the movement is approved." label="Disabled Select" value="Amex Corporativa" />
          </div>
          <TextareaField
            helperText="Optional note for monthly close and audit context."
            label="Internal Note"
            value="Infrastructure subscription for June production operations."
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'flex-end' }}>
            <Button variant="secondary">Cancel</Button>
            <Button>Save movement</Button>
          </div>
        </form>
      </Card>
    </section>
  );
}

function MovementTable({ compact = false }) {
  const cellPadding = compact ? `${spacing.xs} ${spacing.sm}` : `${spacing.sm} ${spacing.md}`;

  return (
    <div
      style={{
        overflowX: 'auto',
        border: `1px solid ${colors.border.subtle}`,
        borderRadius: radius.table,
        background: colors.background.surface,
      }}
    >
      <table
        style={{
          width: '100%',
          minWidth: compact ? 680 : 800,
          borderCollapse: 'collapse',
          color: colors.text.body,
          fontSize: typography.body.fontSize,
        }}
      >
        <thead>
          <tr style={{ background: colors.background.surfaceMuted }}>
            {['Date', 'Category', 'Concept', 'Account', 'Status', 'Amount'].map((heading) => (
              <th
                key={heading}
                style={{
                  padding: cellPadding,
                  borderBottom: `1px solid ${colors.border.subtle}`,
                  color: colors.text.primary,
                  fontSize: typography.caption.fontSize,
                  fontWeight: 850,
                  lineHeight: 1.2,
                  textAlign: heading === 'Amount' ? 'right' : 'left',
                }}
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {movementRows.map((movement) => (
            <tr key={`${movement.date}-${movement.concept}`}>
              <td style={{ padding: cellPadding, borderBottom: `1px solid ${colors.border.subtle}`, whiteSpace: 'nowrap' }}>
                {movement.date}
              </td>
              <td style={{ padding: cellPadding, borderBottom: `1px solid ${colors.border.subtle}` }}>
                <strong style={{ color: colors.text.primary }}>{movement.category}</strong>
              </td>
              <td style={{ padding: cellPadding, borderBottom: `1px solid ${colors.border.subtle}` }}>{movement.concept}</td>
              <td style={{ padding: cellPadding, borderBottom: `1px solid ${colors.border.subtle}` }}>{movement.account}</td>
              <td style={{ padding: cellPadding, borderBottom: `1px solid ${colors.border.subtle}` }}>
                <StatusBadge tone={movement.tone}>{movement.status}</StatusBadge>
              </td>
              <td
                style={{
                  padding: cellPadding,
                  borderBottom: `1px solid ${colors.border.subtle}`,
                  color: movement.amount.startsWith('+') ? colors.status.success : colors.text.primary,
                  fontWeight: 850,
                  textAlign: 'right',
                  whiteSpace: 'nowrap',
                }}
              >
                {movement.amount}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TableShowcase() {
  return (
    <section id="tables" style={sectionShellStyle}>
      <SectionHeading subtitle="Movement history tables demonstrating standard and compact density for operational screens.">
        Tables
      </SectionHeading>
      <Card>
        <div style={{ display: 'grid', gap: spacing.lg }}>
          <div>
            <h3 style={{ ...typography.cardTitle, margin: `0 0 ${spacing.sm}` }}>Standard Density</h3>
            <MovementTable />
          </div>
          <div>
            <h3 style={{ ...typography.cardTitle, margin: `0 0 ${spacing.sm}` }}>Compact Density</h3>
            <MovementTable compact />
          </div>
        </div>
      </Card>
    </section>
  );
}

function AlertSample({ children, title, tone }) {
  const resolvedTone = statusTone[tone] || statusTone.info;

  return (
    <div
      style={{
        display: 'grid',
        gap: spacing.xs,
        minWidth: 0,
        padding: spacing.lg,
        border: `1px solid ${resolvedTone.border}`,
        borderRadius: radius.table,
        background: resolvedTone.background,
      }}
    >
      <strong style={{ ...typography.ui, color: resolvedTone.color }}>{title}</strong>
      <span style={{ ...typography.body, margin: 0 }}>{children}</span>
    </div>
  );
}

function AlertShowcase() {
  return (
    <section id="alerts" style={sectionShellStyle}>
      <SectionHeading subtitle="Operational feedback states for save flows, reconciliation, validation, and filtered views.">
        Alerts
      </SectionHeading>
      <div style={showcaseGridStyle}>
        <AlertSample title="Success" tone="success">Movement saved and reflected in the June report.</AlertSample>
        <AlertSample title="Warning" tone="warning">Three expenses still need account reconciliation.</AlertSample>
        <AlertSample title="Error" tone="error">The movement could not be saved. Check the required fields.</AlertSample>
        <AlertSample title="Info" tone="info">Dashboard data is filtered to June 2026.</AlertSample>
      </div>
    </section>
  );
}

function ModalShowcase({ onOpenModal }) {
  return (
    <section id="modals" style={sectionShellStyle}>
      <SectionHeading subtitle="A destructive confirmation pattern for high-risk movement actions.">
        Modals
      </SectionHeading>
      <Card style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: spacing.lg, flexWrap: 'wrap' }}>
        <div style={{ display: 'grid', gap: spacing.xs, maxWidth: 520 }}>
          <h3 style={{ ...typography.cardTitle, margin: 0 }}>Delete Movement</h3>
          <p style={{ ...typography.body, margin: 0 }}>
            Shows copy, spacing, secondary action, and a primary destructive action inside the Modal primitive.
          </p>
        </div>
        <Button onClick={onOpenModal} variant="danger">Open delete modal</Button>
      </Card>
    </section>
  );
}

function EmptyStateCard({ action, icon, text, title }) {
  return (
    <Card variant="compact" style={{ minHeight: 246 }}>
      <div style={{ display: 'grid', gap: spacing.lg, justifyItems: 'start', height: '100%' }}>
        <div
          aria-hidden="true"
          style={{
            display: 'grid',
            placeItems: 'center',
            width: 56,
            height: 56,
            borderRadius: radius.pill,
            background: colorMix(colors.brand.cyan, 12),
            color: colors.brand.cyan,
            fontSize: typography.sectionTitle.fontSize,
            fontWeight: 900,
          }}
        >
          {icon}
        </div>
        <div style={{ display: 'grid', gap: spacing.xs }}>
          <h3 style={{ ...typography.cardTitle, margin: 0 }}>{title}</h3>
          <p style={{ ...typography.body, margin: 0 }}>{text}</p>
        </div>
        <Button style={{ marginTop: 'auto' }} variant="secondary">{action}</Button>
      </div>
    </Card>
  );
}

function EmptyStateShowcase() {
  return (
    <section id="empty-states" style={sectionShellStyle}>
      <SectionHeading subtitle="Reusable zero-data patterns for financial workflows and audit views.">
        Empty States
      </SectionHeading>
      <div style={showcaseGridStyle}>
        {emptyStates.map((state) => (
          <EmptyStateCard key={state.title} {...state} />
        ))}
      </div>
    </section>
  );
}

function LayoutShowcase() {
  return (
    <section style={sectionShellStyle}>
      <SectionHeading subtitle="A composed page mockup showing how PageHeader, filters, KPI cards, and data tables work together.">
        Page Composition
      </SectionHeading>
      <div
        style={{
          display: 'grid',
          gap: spacing.lg,
          padding: spacing.xl,
          border: `1px solid ${colors.border.subtle}`,
          borderRadius: radius.card,
          background: colors.background.surfaceMuted,
          boxShadow: shadows.table,
        }}
      >
        <PageHeader
          actions={<Button>Nuevo movimiento</Button>}
          eyebrow="Finanzas"
          subtitle="Vista operativa de movimientos, filtros y resumen mensual."
          title="Panel de movimientos"
        />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing.sm,
            flexWrap: 'wrap',
            padding: spacing.md,
            border: `1px solid ${colors.border.subtle}`,
            borderRadius: radius.table,
            background: colors.background.surface,
          }}
        >
          <Button variant="secondary">Junio 2026</Button>
          <Button variant="secondary">Todas las cuentas</Button>
          <Button variant="secondary">Egresos e ingresos</Button>
          <Button variant="ghost">Limpiar filtros</Button>
        </div>
        <div style={compactGridStyle}>
          {kpiCards.map((card) => (
            <KpiCard key={`layout-${card.title}`} {...card} />
          ))}
        </div>
        <Card variant="compact">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, flexWrap: 'wrap', marginBottom: spacing.md }}>
            <h3 style={{ ...typography.cardTitle, margin: 0 }}>Movement History</h3>
            <StatusBadge tone="info">5 records</StatusBadge>
          </div>
          <MovementTable compact />
        </Card>
      </div>
    </section>
  );
}

function DeleteMovementModal({ isOpen, onClose }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete Movement">
      <p style={{ ...typography.body, margin: `0 0 ${spacing.lg}` }}>
        This will remove the AWS infraestructura movement from the June report. This action cannot be undone.
      </p>
      <div
        style={{
          display: 'grid',
          gap: spacing.xs,
          marginBottom: spacing.lg,
          padding: spacing.md,
          border: `1px solid ${colors.border.subtle}`,
          borderRadius: radius.table,
          background: colors.background.surfaceMuted,
        }}
      >
        <strong style={{ ...typography.cardTitle }}>AWS infraestructura</strong>
        <span style={{ ...typography.body }}>$1,280.00 charged to Santander Empresas.</span>
        <StatusBadge tone="warning">Pending deletion</StatusBadge>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'flex-end' }}>
        <Button onClick={onClose} variant="secondary">Cancel</Button>
        <Button onClick={onClose} variant="danger">Delete movement</Button>
      </div>
    </Modal>
  );
}

function DesignSystemPlayground() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeSection, setActiveSection] = useActiveSection();

  return (
    <PageShell>
      <div
        style={{
          alignItems: 'start',
          display: 'grid',
          gap: spacing.xl,
          gridTemplateColumns: '220px minmax(0, 1fr)',
          width: '100%',
        }}
      >
        <ShowcaseSidebar activeSection={activeSection} onSectionSelect={setActiveSection} />
        <div style={{ display: 'grid', gap: spacing.xl, minWidth: 0 }}>
          <HeroSection onOpenModal={() => setIsModalOpen(true)} />
          <FoundationComparison />
          <TokenReferenceCard id="spacing" items={foundationTokens.spacing} title="Spacing" />
          <TokenReferenceCard id="radius" items={foundationTokens.radius} title="Radius" />
          <TokenReferenceCard id="shadows" items={foundationTokens.shadows} title="Shadows" />
          <ButtonShowcase />
          <InputShowcase />
          <CardShowcase />
          <FormShowcase />
          <TableShowcase />
          <AlertShowcase />
          <ModalShowcase onOpenModal={() => setIsModalOpen(true)} />
          <DashboardCardShowcase />
          <EmptyStateShowcase />
          <LayoutShowcase />
        </div>
      </div>
      <DeleteMovementModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </PageShell>
  );
}

export default DesignSystemPlayground;
