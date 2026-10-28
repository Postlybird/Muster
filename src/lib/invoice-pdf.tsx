import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";

import { formatAbn } from "@/adapters/abn/validate";
import { brand } from "@/config/brand";
import type { Week } from "@/domain/pay-runs";

import { formatCalendarDate, formatCents } from "./format";
import { pdfText } from "./pdf-text";

/** Everything printed on a tax invoice (brief §4.8). */
export type InvoicePdfData = {
  number: string;
  issuedOn: string;
  dueOn: string;
  week: Week;
  from: {
    legalName: string;
    abn: string;
    address: string;
    email: string;
    phone: string;
    /** Our labour hire licences where they must be shown, e.g. "QLD 1234". */
    licences: string[];
  };
  to: {
    legalName: string;
    tradingName: string | null;
    abn: string;
    contact: string | null;
    email: string | null;
  };
  lines: {
    date: string;
    description: string;
    detail: string | null;
    hours: number;
    amountCents: number;
  }[];
  subtotalCents: number;
  gstCents: number;
  totalCents: number;
  bank: { accountName: string; bsb: string; accountNumber: string };
};

const MUTED = "#57534e";
const RULE = "#d6d3d1";

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 56,
    paddingHorizontal: 40,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: "#1c1917",
  },
  header: { flexDirection: "row", justifyContent: "space-between" },
  brand: {
    fontFamily: "Helvetica-Bold",
    fontSize: 18,
    color: brand.colours.primary,
    marginBottom: 6,
  },
  title: { fontFamily: "Helvetica-Bold", fontSize: 16, textAlign: "right" },
  muted: { color: MUTED },
  bold: { fontFamily: "Helvetica-Bold" },
  facts: { marginTop: 6, alignItems: "flex-end" },
  billTo: { marginTop: 24, marginBottom: 16 },
  label: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: MUTED,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: RULE,
    paddingVertical: 5,
  },
  headRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#1c1917",
    paddingBottom: 4,
  },
  date: { width: 62 },
  what: { flex: 1, paddingRight: 8 },
  hours: { width: 40, textAlign: "right" },
  amount: { width: 70, textAlign: "right" },
  detail: { color: MUTED, fontSize: 8, marginTop: 1 },
  totals: { marginTop: 10, alignSelf: "flex-end", width: 200 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  grandTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#1c1917",
    marginTop: 4,
    paddingTop: 4,
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
  },
  payment: {
    marginTop: 24,
    padding: 10,
    borderWidth: 0.5,
    borderColor: RULE,
    borderRadius: 4,
  },
  // Drawn on each page. (A line height set on the page would hide it.)
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    color: MUTED,
    fontSize: 8,
  },
});

type Style = Parameters<typeof StyleSheet.create>[0][string];

function T({ children, style }: { children: string; style?: Style | Style[] }) {
  return <Text style={style}>{pdfText(children)}</Text>;
}

function hoursText(hours: number): string {
  return hours.toLocaleString("en-AU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function InvoiceDocument({ data }: { data: InvoicePdfData }) {
  const { from, to, bank } = data;
  return (
    <Document
      title={`Tax invoice ${data.number}`}
      author={from.legalName}
      creator={brand.name}
      producer={brand.name}
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <T style={styles.brand}>{brand.name}</T>
            <T style={styles.bold}>{from.legalName}</T>
            <T>{`ABN ${formatAbn(from.abn)}`}</T>
            {from.address ? <T>{from.address}</T> : null}
            {from.email ? <T>{from.email}</T> : null}
            {from.phone ? <T>{from.phone}</T> : null}
            {from.licences.map((licence) => (
              <T key={licence}>{`Labour hire licence: ${licence}`}</T>
            ))}
          </View>
          <View>
            <T style={styles.title}>Tax invoice</T>
            <View style={styles.facts}>
              <T style={styles.bold}>{data.number}</T>
              <T>{`Issued ${formatCalendarDate(data.issuedOn)}`}</T>
              <T>{`Due ${formatCalendarDate(data.dueOn)}`}</T>
              <T
                style={styles.muted}
              >{`Work up to ${formatCalendarDate(data.week.end)}`}</T>
            </View>
          </View>
        </View>

        <View style={styles.billTo}>
          <T style={styles.label}>Bill to</T>
          <T style={styles.bold}>{to.legalName}</T>
          {to.tradingName && to.tradingName !== to.legalName ? (
            <T>{`Trading as ${to.tradingName}`}</T>
          ) : null}
          <T>{`ABN ${formatAbn(to.abn)}`}</T>
          {to.contact ? <T>{`Attention: ${to.contact}`}</T> : null}
          {to.email ? <T>{to.email}</T> : null}
        </View>

        <View style={styles.headRow}>
          <T style={[styles.date, styles.bold]}>Date</T>
          <T style={[styles.what, styles.bold]}>Worker and work</T>
          <T style={[styles.hours, styles.bold]}>Hours</T>
          <T style={[styles.amount, styles.bold]}>Amount</T>
        </View>
        {data.lines.map((line, index) => (
          <View key={index} style={styles.row} wrap={false}>
            <T style={styles.date}>{formatCalendarDate(line.date)}</T>
            <View style={styles.what}>
              <T>{line.description}</T>
              {line.detail ? <T style={styles.detail}>{line.detail}</T> : null}
            </View>
            <T style={styles.hours}>{hoursText(line.hours)}</T>
            <T style={styles.amount}>{formatCents(line.amountCents)}</T>
          </View>
        ))}

        <View style={styles.totals} wrap={false}>
          <View style={styles.totalRow}>
            <T>Subtotal</T>
            <T>{formatCents(data.subtotalCents)}</T>
          </View>
          <View style={styles.totalRow}>
            <T>GST</T>
            <T>{formatCents(data.gstCents)}</T>
          </View>
          <View style={styles.grandTotal}>
            <T>Total (AUD)</T>
            <T>{formatCents(data.totalCents)}</T>
          </View>
        </View>

        <View style={styles.payment} wrap={false}>
          <T style={styles.label}>How to pay</T>
          <T>{`Please pay ${formatCents(data.totalCents)} by ${formatCalendarDate(data.dueOn)} by bank transfer.`}</T>
          <T>{`Account name: ${bank.accountName}`}</T>
          <T>{`BSB: ${bank.bsb}   Account number: ${bank.accountNumber}`}</T>
          <T>{`Reference: ${data.number}`}</T>
        </View>

        <Text
          style={styles.footer}
          fixed
          render={({ pageNumber, totalPages }) =>
            pdfText(
              `${data.number} · ${from.legalName} · Page ${pageNumber} of ${totalPages}`,
            )
          }
        />
      </Page>
    </Document>
  );
}

export async function renderInvoicePdf(data: InvoicePdfData): Promise<Buffer> {
  return renderToBuffer(<InvoiceDocument data={data} />);
}
