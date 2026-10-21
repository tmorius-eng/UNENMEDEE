import { OG_SIZE, ogImage } from "@/lib/og";

export const alt = "ИЛ ТОД МЭДЭЭ — Монголын улс төр, эдийн засаг, төрийн шинэ мэдээ";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return ogImage({ eyebrow: "Шинэ мэдээ · 2 цаг тутам", title: "Монголын улс төр, эдийн засаг, тендер, төсвийн мэдээ — баримтыг пи-араас салгасан", footer: "AI шүүлттэй" });
}
