import ReactQRCode from "react-qr-code";

/**
 * Scannable QR — uses react-qr-code (pure inline SVG).
 * Size bumped to 200px default to comfortably hold the signed payload.
 */
export default function QRCode({ data = "MINTY", size = 200, dark = "#1F2937", light = "white" }) {
  return (
    <div style={{
      background: light,
      padding: 10,
      borderRadius: 10,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      lineHeight: 0,
    }}>
      <ReactQRCode
        value={data}
        size={size - 20}
        fgColor={dark}
        bgColor={light}
        level="L"
      />
    </div>
  );
}