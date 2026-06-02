import { colors } from './colors';

export const fontFamily = [
  '-apple-system',
  'BlinkMacSystemFont',
  '"Segoe UI"',
  'Roboto',
  'Helvetica',
  'Arial',
  'sans-serif',
].join(', ');

export const typography = {
  fontFamily,
  pageTitle: {
    fontSize: '40px',
    lineHeight: 1.05,
    fontWeight: 900,
    color: colors.brand.cyan,
  },
  sectionTitle: {
    fontSize: '20px',
    lineHeight: 1.2,
    fontWeight: 800,
    color: colors.text.primary,
  },
  cardTitle: {
    fontSize: '18px',
    lineHeight: 1.25,
    fontWeight: 800,
    color: colors.text.primary,
  },
  body: {
    fontSize: '12px',
    lineHeight: 1.5,
    fontWeight: 400,
    color: colors.text.spreadsheetBody,
  },
  ui: {
    fontSize: '14px',
    lineHeight: 1.35,
    fontWeight: 700,
  },
  caption: {
    fontSize: '12px',
    lineHeight: 1.35,
    fontWeight: 650,
    color: colors.text.muted,
  },
};
