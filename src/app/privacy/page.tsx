import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/iltod/page-header";
import { CONTACT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Нууцлалын бодлого",
  alternates: { canonical: "/privacy" },
  description: "ИЛ ТОД МЭДЭЭ ямар мэдээлэл хадгалдаг, юуг хадгалдаггүй вэ: бүртгэлгүй, хувийн мэдээлэл цуглуулдаггүй, Facebook хуудсанд зөвхөн нийтэлдэг.",
};

const STORED = [
  {
    title: "Таны төхөөрөмж дээр (localStorage)",
    text: "Уншсан мэдээ, дагасан сэдэв, гишүүн, үсгийн хэмжээ, анхны танилцуулгыг хаасан эсэх зэрэг тохиргоо зөвхөн таны браузерт хадгалагдана. Бидэнд илгээгддэггүй. Браузерын өгөгдлөө цэвэрлэхэд бүгд устна.",
  },
  {
    title: "Мэдэгдэл (🔔 асаасан үед)",
    text: "Браузерын push үйлчилгээний хаяг, түүний шифрлэлтийн түлхүүр болон дагасан гишүүдийн дугаар. Нэр, имэйл, утас, IP хаяг хадгалдаггүй. Мэдэгдлээ унтраахад эсвэл браузер захиалгыг цуцлахад мөр устна.",
  },
  {
    title: "Зочлолын статистик",
    text: "Vercel Web Analytics: хуудас үзсэн тоог күүкигүйгээр, хүн тус бүрийг ялгахгүйгээр тоолдог. Сурталчилгааны болон мөшгөх скрипт байхгүй.",
  },
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <PageHeader
        eyebrow="🔒 Нууцлал"
        title="Нууцлалын бодлого"
        description="ИЛ ТОД МЭДЭЭ-д бүртгэл, нэвтрэлт байхгүй. Бид таны хувийн мэдээллийг цуглуулдаггүй, зардаггүй, бусдад дамжуулдаггүй."
      />

      <section aria-labelledby="stored" className="flex flex-col gap-3">
        <h2 id="stored" className="text-lg font-semibold text-primary">
          Юу хадгалагддаг вэ?
        </h2>
        <ul className="flex flex-col gap-3">
          {STORED.map((s) => (
            <li key={s.title} className="flex flex-col gap-1 rounded-2xl bg-primary p-4 ring-1 ring-secondary ring-inset">
              <h3 className="font-semibold text-primary">{s.title}</h3>
              <p className="text-sm text-secondary">{s.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="facebook" className="flex flex-col gap-2">
        <h2 id="facebook" className="text-lg font-semibold text-primary">
          Facebook хуудас
        </h2>
        <p className="text-sm text-secondary">
          Манай Facebook апп ИЛ ТОД МЭДЭЭ-ийн өөрийн хуудсанд тойм, чухал мэдээ нийтэлдэг. Хуудас руу Messenger эсвэл Instagram-аар бичихэд автомат туслах тухайн мессежийг
          уншиж, сайтын мэдээний холбоосоор хариулдаг. Мессеж, таны нэр, Facebook-ийн мэдээллийг хадгалдаггүй, AI-д дамжуулдаггүй. Facebook-ээр нэвтрэх боломж байхгүй.
        </p>
      </section>

      <section aria-labelledby="data-deletion" className="flex flex-col gap-2">
        <h2 id="data-deletion" className="text-lg font-semibold text-primary">
          Мэдээллээ устгуулах
        </h2>
        <p className="text-sm text-secondary">
          Таны төхөөрөмж дээрх тохиргоо браузерын өгөгдлийг цэвэрлэхэд устна. Мэдэгдлийн захиалгаа 🔔 цэснээс унтраана. Бусад асуудлаар{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-brand-secondary hover:underline">
            {CONTACT_EMAIL}
          </a>{" "}
          хаягаар бичвэл 30 хоногийн дотор шийдвэрлэнэ. Бидэнд таны Facebook-ийн мэдээлэл хадгалагддаггүй тул устгах зүйл үүсэхгүй.
        </p>
      </section>

      <section aria-labelledby="sources" className="flex flex-col gap-2">
        <h2 id="sources" className="text-lg font-semibold text-primary">
          Нийтэлдэг мэдээлэл
        </h2>
        <p className="text-sm text-secondary">
          Сайт зөвхөн төрийн байгууллагуудын нийтэд зарласан мэдээ, нээлттэй өгөгдлийг эх холбоосын хамт харуулдаг. Хэрхэн ажилладгийг{" "}
          <Link href="/method" className="font-semibold text-brand-secondary hover:underline">
            арга зүйн хуудаснаас
          </Link>{" "}
          уншина уу.
        </p>
      </section>
    </div>
  );
}
