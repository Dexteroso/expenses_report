import { useState } from 'react';
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
  zIndex,
} from './index';

const flattenTokens = (group, prefix = '') =>
  Object.entries(group).flatMap(([key, value]) => {
    const tokenName = prefix ? `${prefix}.${key}` : key;

    if (value && typeof value === 'object') {
      return flattenTokens(value, tokenName);
    }

    return [{ name: tokenName, value }];
  });

const sampleMovements = [
  {
    amount: '$1,280.00',
    category: 'Operacion',
    concept: 'AWS infraestructura',
    date: '02 Jun 2026',
    status: 'Pagado',
    tone: 'success',
  },
  {
    amount: '$460.50',
    category: 'Ventas',
    concept: 'Comision Stripe',
    date: '01 Jun 2026',
    status: 'Conciliar',
    tone: 'warning',
  },
  {
    amount: '$2,950.00',
    category: 'Equipo',
    concept: 'Monitor ultrawide',
    date: '29 May 2026',
    status: 'Pendiente',
    tone: 'info',
  },
  {
    amount: '$215.00',
    category: 'Marketing',
    concept: 'Anuncios LinkedIn',
    date: '28 May 2026',
    status: 'Revisar',
    tone: 'error',
  },
  {
    amount: '$780.00',
    category: 'Servicios',
    concept: 'Consultoria legal',
    date: '27 May 2026',
    status: 'Pagado',
    tone: 'success',
  },
];

const statusTone = {
  error: {
    background: `color-mix(in srgb, ${colors.status.error} 10%, ${colors.background.surface})`,
    border: colors.status.error,
    color: colors.status.error,
  },
  info: {
    background: `color-mix(in srgb, ${colors.brand.dashboardBlue} 10%, ${colors.background.surface})`,
    border: colors.brand.dashboardBlue,
    color: colors.brand.dashboardBlue,
  },
  success: {
    background: `color-mix(in srgb, ${colors.status.success} 10%, ${colors.background.surface})`,
    border: colors.status.success,
    color: colors.status.success,
  },
  warning: {
    background: `color-mix(in srgb, ${colors.kpi.warningYellow} 14%, ${colors.background.surface})`,
    border: colors.kpi.warningYellow,
    color: colors.kpi.warningYellow,
  },
};

const sampleGridStyle = {
  display: 'grid',
  gap: spacing.lg,
  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
};

const compactGridStyle = {
  display: 'grid',
  gap: spacing.md,
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
};

const formGridStyle = {
  display: 'grid',
  gap: spacing.lg,
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
};

function SectionHeading({ children, subtitle }) {
  return (
    <div style={{ display: 'grid', gap: spacing.xs }}>
      <h2 style={{ ...typography.sectionTitle, margin: 0 }}>{children}</h2>
      {subtitle && <p style={{ ...typography.caption, margin: 0 }}>{subtitle}</p>}
    </div>
  );
}

function TokenPreview({ title, tokens, type = 'text' }) {
  return (
    <Card variant="compact">
      <h2 style={{ ...typography.cardTitle, margin: `0 0 ${spacing.md}` }}>{title}</h2>
      <div style={{ display: 'grid', gap: spacing.sm }}>
        {tokens.map((token) => (
          <div
            key={token.name}
            style={{
              display: 'grid',
              gridTemplateColumns: type === 'color' ? '42px minmax(0, 1fr)' : 'minmax(0, 1fr)',
              gap: spacing.sm,
              alignItems: 'center',
              minWidth: 0,
            }}
          >
            {type === 'color' && (
              <span
                aria-hidden="true"
                style={{
                  width: 42,
                  height: 28,
                  border: `1px solid ${colors.border.subtle}`,
                  borderRadius: radius.input,
                  background: token.value,
                }}
              />
            )}
            <span style={{ color: colors.text.body, fontSize: typography.body.fontSize, lineHeight: 1.35 }}>
              <strong>{token.name}</strong>: {String(token.value)}
            </span>
          </div>
        ))}
      </div>
    </Card>
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
        minHeight: spacing.xl,
        padding: `0 ${spacing.sm}`,
        border: `1px solid ${resolvedTone.border}`,
        borderRadius: radius.pill,
        background: resolvedTone.background,
        color: resolvedTone.color,
        fontSize: typography.caption.fontSize,
        fontWeight: 800,
        lineHeight: 1,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}

function AlertSample({ title, children, tone }) {
  const resolvedTone = statusTone[tone] || statusTone.info;

  return (
    <div
      style={{
        display: 'grid',
        gap: spacing.xs,
        minWidth: 0,
        padding: spacing.md,
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
        value={value}
        onChange={() => {}}
        style={{
          width: '100%',
          minHeight: '30px',
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
      >
        <option value="Santander Empresas">Santander Empresas</option>
        <option value="Amex Corporativa">Amex Corporativa</option>
        <option value="Caja chica">Caja chica</option>
      </select>
    </FieldShell>
  );
}

function TextareaField({ helperText, label, value }) {
  return (
    <FieldShell helperText={helperText} label={label}>
      <textarea
        value={value}
        onChange={() => {}}
        rows={4}
        style={{
          width: '100%',
          minHeight: 96,
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
      />
    </FieldShell>
  );
}

function TableSample({ compact = false }) {
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
          minWidth: compact ? 640 : 760,
          borderCollapse: 'collapse',
          color: colors.text.body,
          fontSize: typography.body.fontSize,
        }}
      >
        <thead>
          <tr style={{ background: colors.background.surfaceMuted }}>
            {['Fecha', 'Categoria / concepto', 'Cuenta', 'Estado', 'Monto'].map((heading) => (
              <th
                key={heading}
                style={{
                  padding: cellPadding,
                  borderBottom: `1px solid ${colors.border.subtle}`,
                  color: colors.text.primary,
                  fontSize: typography.caption.fontSize,
                  fontWeight: 800,
                  lineHeight: 1.2,
                  textAlign: heading === 'Monto' ? 'right' : 'left',
                }}
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sampleMovements.map((movement) => (
            <tr key={`${movement.date}-${movement.concept}`}>
              <td style={{ padding: cellPadding, borderBottom: `1px solid ${colors.border.subtle}` }}>
                {movement.date}
              </td>
              <td style={{ padding: cellPadding, borderBottom: `1px solid ${colors.border.subtle}` }}>
                <strong style={{ display: 'block', color: colors.text.primary }}>{movement.category}</strong>
                <span style={{ ...typography.caption }}>{movement.concept}</span>
              </td>
              <td style={{ padding: cellPadding, borderBottom: `1px solid ${colors.border.subtle}` }}>
                Santander Empresas
              </td>
              <td style={{ padding: cellPadding, borderBottom: `1px solid ${colors.border.subtle}` }}>
                <StatusBadge tone={movement.tone}>{movement.status}</StatusBadge>
              </td>
              <td
                style={{
                  padding: cellPadding,
                  borderBottom: `1px solid ${colors.border.subtle}`,
                  color: colors.text.primary,
                  fontWeight: 800,
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

function TypographyShowcase() {
  return (
    <Card>
      <SectionHeading subtitle="Scale and tone examples mapped to real app copy.">Typography Showcase</SectionHeading>
      <div style={{ display: 'grid', gap: spacing.md, marginTop: spacing.lg }}>
        <h1 style={{ ...typography.pageTitle, margin: 0 }}>Movimientos</h1>
        <p style={{ ...typography.caption, margin: 0, fontSize: typography.sectionTitle.fontSize }}>
          Revisa ingresos, egresos y conciliaciones recientes.
        </p>
        <h2 style={{ ...typography.sectionTitle, margin: 0 }}>Resumen mensual</h2>
        <div>
          <h3 style={{ ...typography.cardTitle, margin: 0 }}>Gastos operativos</h3>
          <p style={{ ...typography.body, margin: `${spacing.xs} 0 0` }}>
            Total acumulado por proveedores, servicios y herramientas del equipo.
          </p>
        </div>
        <span style={{ ...typography.caption }}>Se actualizo hace 12 minutos.</span>
        <span style={{ ...typography.caption, color: colors.status.error }}>El monto debe ser mayor a cero.</span>
        <span style={{ ...typography.body, color: colors.text.muted }}>Sin movimientos para el filtro seleccionado.</span>
      </div>
    </Card>
  );
}

function CardSamples() {
  return (
    <>
      <SectionHeading subtitle="Common surfaces shown with realistic finance app content.">Card Samples</SectionHeading>
      <div style={sampleGridStyle}>
        <Card>
          <h3 style={{ ...typography.cardTitle, margin: 0 }}>Cierre de junio</h3>
          <p style={{ ...typography.body, margin: `${spacing.sm} 0 0` }}>
            Revisa movimientos pendientes antes de generar el reporte mensual.
          </p>
          <Button style={{ marginTop: spacing.lg }} variant="secondary">Ver pendientes</Button>
        </Card>
        <Card variant="compact">
          <h3 style={{ ...typography.cardTitle, margin: 0 }}>Filtro activo</h3>
          <p style={{ ...typography.body, margin: `${spacing.xs} 0 0` }}>Junio 2026, egresos, cuenta empresarial.</p>
        </Card>
        <Card variant="metric">
          <span style={{ ...typography.caption, display: 'block' }}>Flujo neto</span>
          <strong style={{ color: colors.brand.cyan, fontSize: '32px', lineHeight: 1 }}>$18,420</strong>
          <p style={{ ...typography.caption, margin: `${spacing.sm} 0 0`, color: colors.status.success }}>+12.4% vs. mayo</p>
        </Card>
        <Card>
          <h3 style={{ ...typography.cardTitle, margin: 0 }}>Dashboard summary</h3>
          <div style={{ ...compactGridStyle, marginTop: spacing.lg }}>
            <div>
              <span style={{ ...typography.caption }}>Ingresos</span>
              <strong style={{ display: 'block', color: colors.text.primary }}>$84,300</strong>
            </div>
            <div>
              <span style={{ ...typography.caption }}>Egresos</span>
              <strong style={{ display: 'block', color: colors.text.primary }}>$65,880</strong>
            </div>
          </div>
        </Card>
        <Card>
          <h3 style={{ ...typography.cardTitle, margin: `0 0 ${spacing.lg}` }}>Nueva categoria</h3>
          <div style={{ display: 'grid', gap: spacing.md }}>
            <Input label="Nombre" placeholder="Servicios profesionales" />
            <Input helperText="Visible en reportes y filtros." label="Grupo" placeholder="Operacion" />
          </div>
        </Card>
        <Card variant="compact">
          <h3 style={{ ...typography.cardTitle, margin: `0 0 ${spacing.md}` }}>Movimientos recientes</h3>
          <TableSample compact />
        </Card>
      </div>
    </>
  );
}

function FormSample() {
  return (
    <Card>
      <SectionHeading subtitle="Movement creation flow with normal, disabled, helper, and error states.">Form Sample</SectionHeading>
      <form style={{ display: 'grid', gap: spacing.lg, marginTop: spacing.lg }}>
        <div style={formGridStyle}>
          <Input label="Date" type="date" defaultValue="2026-06-02" />
          <Input label="Category" defaultValue="Operacion" />
          <Input label="Concept" defaultValue="AWS infraestructura" />
          <Input error="Amount is required for expense movements." label="Amount" placeholder="$0.00" type="number" />
          <SelectField label="Payment account" value="Santander Empresas" />
          <Input disabled label="Disabled example" defaultValue="Autogenerated folio" />
        </div>
        <TextareaField
          helperText="Optional internal note for the finance team."
          label="Description"
          value="Monthly infrastructure invoice for the production workspace."
        />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'flex-end' }}>
          <Button variant="secondary">Cancel</Button>
          <Button>Save movement</Button>
        </div>
      </form>
    </Card>
  );
}

function EmptyStateSample() {
  return (
    <Card>
      <div style={{ display: 'grid', gap: spacing.lg, justifyItems: 'center', padding: spacing.xl, textAlign: 'center' }}>
        <div
          aria-hidden="true"
          style={{
            display: 'grid',
            placeItems: 'center',
            width: 64,
            height: 64,
            borderRadius: radius.pill,
            background: `color-mix(in srgb, ${colors.brand.cyan} 12%, ${colors.background.surface})`,
            color: colors.brand.cyan,
            fontSize: typography.sectionTitle.fontSize,
            fontWeight: 900,
          }}
        >
          0
        </div>
        <div style={{ display: 'grid', gap: spacing.xs, maxWidth: 420 }}>
          <h3 style={{ ...typography.cardTitle, margin: 0 }}>No movements yet</h3>
          <p style={{ ...typography.body, margin: 0 }}>
            Once expenses or income are captured, the latest activity and totals will appear here.
          </p>
        </div>
        <Button>Add first movement</Button>
      </div>
    </Card>
  );
}

function LayoutSample() {
  return (
    <section style={{ display: 'grid', gap: spacing.lg }}>
      <SectionHeading subtitle="A composed app page preview built from current foundation pieces.">Layout Sample</SectionHeading>
      <div
        style={{
          display: 'grid',
          gap: spacing.lg,
          padding: spacing.lg,
          border: `1px solid ${colors.border.subtle}`,
          borderRadius: radius.card,
          background: colors.background.surfaceMuted,
        }}
      >
        <PageHeader
          actions={<Button>Nuevo movimiento</Button>}
          eyebrow="Finanzas"
          subtitle="Vista operativa de movimientos, filtros y resumen."
          title="Panel de movimientos"
        />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.sm }}>
          <Button variant="secondary">Junio 2026</Button>
          <Button variant="secondary">Todas las cuentas</Button>
          <Button variant="ghost">Limpiar filtros</Button>
        </div>
        <div style={compactGridStyle}>
          {[
            ['Ingresos', '$84,300', 'Facturado este mes'],
            ['Egresos', '$65,880', 'Pagos registrados'],
            ['Pendientes', '7', 'Requieren conciliacion'],
          ].map(([label, value, caption]) => (
            <div
              key={label}
              style={{
                display: 'grid',
                gap: spacing.xs,
                padding: spacing.lg,
                border: `1px solid ${colors.border.subtle}`,
                borderRadius: radius.dashboardCard,
                background: colors.background.surface,
                boxShadow: shadows.card,
              }}
            >
              <span style={{ ...typography.caption }}>{label}</span>
              <strong style={{ color: colors.text.primary, fontSize: typography.sectionTitle.fontSize }}>{value}</strong>
              <span style={{ ...typography.caption }}>{caption}</span>
            </div>
          ))}
        </div>
        <div
          style={{
            display: 'grid',
            gap: spacing.md,
            padding: spacing.md,
            border: `1px solid ${colors.border.subtle}`,
            borderRadius: radius.table,
            background: colors.background.surface,
            boxShadow: shadows.table,
          }}
        >
          <h3 style={{ ...typography.cardTitle, margin: 0 }}>Ultimos movimientos</h3>
          <TableSample compact />
        </div>
      </div>
    </section>
  );
}

function DesignSystemPlayground() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const colorTokens = flattenTokens(colors);
  const radiusTokens = flattenTokens(radius);
  const shadowTokens = flattenTokens(shadows);
  const spacingTokens = flattenTokens(spacing);
  const zIndexTokens = flattenTokens(zIndex);

  return (
    <PageShell>
      <PageHeader
        actions={<Button onClick={() => setIsModalOpen(true)}>Open modal</Button>}
        eyebrow="DexForge v2.0"
        subtitle="Development-only playground for tokens, primitives, and realistic app usage samples."
        title="Design System"
      />

      <TypographyShowcase />

      <Card>
        <SectionHeading subtitle="Primitive button variants from the Sprint 0.4 foundation.">Buttons</SectionHeading>
        <div style={{ display: 'flex', gap: spacing.sm, flexWrap: 'wrap', marginTop: spacing.lg }}>
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button aria-label="Icon action" icon="+" variant="icon" />
          <Button disabled>Disabled</Button>
          <Button isLoading>Loading</Button>
        </div>
      </Card>

      <CardSamples />

      <Card>
        <SectionHeading subtitle="A DexForge-style movement table with regular density.">Table Sample</SectionHeading>
        <div style={{ marginTop: spacing.lg }}>
          <TableSample />
        </div>
      </Card>

      <FormSample />

      <Card>
        <SectionHeading subtitle="System feedback examples using available status and brand tokens.">Alert / Status Samples</SectionHeading>
        <div style={{ ...sampleGridStyle, marginTop: spacing.lg }}>
          <AlertSample title="Success" tone="success">Movement saved and reflected in the monthly report.</AlertSample>
          <AlertSample title="Warning" tone="warning">Three expenses still need account reconciliation.</AlertSample>
          <AlertSample title="Error" tone="error">The movement could not be saved. Check the required fields.</AlertSample>
          <AlertSample title="Info" tone="info">Dashboard data is filtered to June 2026.</AlertSample>
        </div>
      </Card>

      <EmptyStateSample />

      <LayoutSample />

      <Card>
        <SectionHeading subtitle="Token catalog retained for implementation reference.">Tokens</SectionHeading>
        <div style={{ marginTop: spacing.lg }}>
          <div
            style={{
              borderRadius: radius.card,
              background: gradients.primary,
              color: colors.text.inverse,
              padding: spacing.xl,
            }}
          >
            <strong>Primary gradient</strong>
            <p style={{ margin: `${spacing.xs} 0 0`, maxWidth: 560 }}>
              Sidebar and mobile background decisions use the DexForge purple-to-blue gradient.
            </p>
          </div>
        </div>
      </Card>

      <div style={sampleGridStyle}>
        <TokenPreview title="Colors" tokens={colorTokens} type="color" />
        <TokenPreview title="Typography" tokens={flattenTokens(typography)} />
        <TokenPreview title="Spacing" tokens={spacingTokens} />
        <TokenPreview title="Radius" tokens={radiusTokens} />
        <TokenPreview title="Shadows" tokens={shadowTokens} />
        <TokenPreview title="Z-Index" tokens={zIndexTokens} />
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Review movement">
        <p style={{ ...typography.caption, margin: `0 0 ${spacing.lg}` }}>
          Confirm the movement details before saving it to the June report.
        </p>
        <div
          style={{
            display: 'grid',
            gap: spacing.sm,
            marginBottom: spacing.lg,
            padding: spacing.md,
            border: `1px solid ${colors.border.subtle}`,
            borderRadius: radius.table,
            background: colors.background.surfaceMuted,
          }}
        >
          <strong style={{ ...typography.cardTitle }}>AWS infraestructura</strong>
          <span style={{ ...typography.body }}>$1,280.00 charged to Santander Empresas.</span>
          <StatusBadge tone="success">Ready to save</StatusBadge>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'flex-end' }}>
          <Button onClick={() => setIsModalOpen(false)} variant="secondary">Cancel</Button>
          <Button onClick={() => setIsModalOpen(false)}>Save movement</Button>
        </div>
      </Modal>
    </PageShell>
  );
}

export default DesignSystemPlayground;
