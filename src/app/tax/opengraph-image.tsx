import { OG_SIZE, ogImage } from "@/lib/og";

export const alt = "Миний татвар хаашаа явдаг вэ? Тооцоол";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return ogImage({ eyebrow: "Миний татвар", title: "Таны төлсөн татвар юунд зарцуулагддаг вэ? 1 минутад тооцоол", footer: "Улсын төсвийн албан тоогоор" });
}
