import "./globals.css";
export const metadata = {
  title: "হাজী মতিউর রহমান সরকার উচ্চ বিদ্যালয় | HMRS",
  description: "বিদ্যালয়ের ভর্তি, নোটিশ, শিক্ষার্থী তথ্য, উপস্থিতি এবং ফলাফল ব্যবস্থাপনা",
  robots: { index: true, follow: true }
};
export const viewport = { themeColor: "#176b61", width: "device-width", initialScale: 1, viewportFit: "cover" };
export default function RootLayout({ children }) {
  return <html lang="bn"><body>{children}</body></html>;
}