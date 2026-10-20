import Link from "next/link";

import { Empty } from "@/components/iltod/empty";

export default function NotFound() {
  return (
    <div className="py-12">
      <Empty title="Хуудас олдсонгүй" description="Энэ мэдээ устгагдсан эсвэл хаяг буруу байж магадгүй.">
        <Link href="/" className="rounded-lg bg-brand-solid px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-solid_hover">
          Нүүр хуудас руу
        </Link>
      </Empty>
    </div>
  );
}
