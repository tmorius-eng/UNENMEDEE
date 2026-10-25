import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Empty } from "@/components/iltod/empty";
import { PlacePicker } from "@/components/iltod/place-picker";
import { StoryList } from "@/components/iltod/story-list";
import { findPlace, type Place, placeGenitive, placeLabel, PLACES } from "@/lib/places";
import { getPlaceFeed, getPoliticians } from "@/lib/queries";
import { absoluteUrl, jsonLd, SITE_NAME } from "@/lib/site";

/** Every place is prerendered, so its title and description are in <head> for crawlers. */
export function generateStaticParams() {
  return PLACES.map((p) => ({ slug: p.slug }));
}

function description(p: Place): string {
  const what = p.kind === "aimag" ? "Засаг даргын Тамгын газар, Иргэдийн Төлөөлөгчдийн Хурлын" : p.kind === "district" ? "дүүргийн Засаг даргын Тамгын газрын" : "нийслэл болон дүүргүүдийн";
  return `${placeGenitive(p)} шинэ мэдээ: ${what} албан мэдээ, шийдвэр, тойргийн УИХ-ын гишүүд. Эх сурвалжийн холбоостой, AI-аар товчилсон.`;
}

export async function generateMetadata({ params }: PageProps<"/place/[slug]">): Promise<Metadata> {
  const place = findPlace((await params).slug);
  if (!place) return { title: "Газар олдсонгүй", robots: { index: false } };
  const title = `${placeGenitive(place)} мэдээ — өнөөдрийн шинэ мэдээ`;
  return { title, description: description(place), alternates: { canonical: `/place/${place.slug}` }, openGraph: { title, description: description(place), url: `/place/${place.slug}` } };
}

function PlaceJsonLd({ place }: { place: Place }) {
  const url = absoluteUrl(`/place/${place.slug}`);
  const name = `${placeGenitive(place)} мэдээ`;
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "CollectionPage", "@id": `${url}#page`, url, name, description: description(place), inLanguage: "mn", about: { "@type": "Place", name: placeLabel(place) }, isPartOf: { "@id": `${absoluteUrl("/")}#website` } },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: SITE_NAME, item: absoluteUrl("/") },
          { "@type": "ListItem", position: 2, name: "Орон нутаг", item: absoluteUrl("/topic/local") },
          { "@type": "ListItem", position: 3, name, item: url },
        ],
      },
    ],
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(data) }} />;
}

async function PlaceView({ params }: { params: PageProps<"/place/[slug]">["params"] }) {
  const place = findPlace((await params).slug);
  if (!place) notFound();
  const [stories, people] = await Promise.all([getPlaceFeed(place.domains), getPoliticians()]);
  const mps = place.constituency ? people.filter((p) => p.constituency === place.constituency) : [];
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <PlaceJsonLd place={place} />
      <header className="flex flex-col gap-2">
        <p className="text-xs font-semibold tracking-wider text-tertiary uppercase">
          <Link href="/topic/local" prefetch={false} className="hover:text-secondary">
            Орон нутаг
          </Link>
        </p>
        <h1 className="text-display-xs font-semibold tracking-tight text-primary md:text-display-sm">{placeGenitive(place)} мэдээ</h1>
        <p className="text-sm text-secondary">{description(place)}</p>
        {place.domains.length > 0 && (
          <p className="text-sm text-tertiary">
            Эх сурвалж:{" "}
            {place.domains.map((d, i) => (
              <span key={d}>
                {i > 0 && ", "}
                <a href={`https://${d}`} target="_blank" rel="noopener noreferrer" className="underline hover:text-secondary">
                  {d}
                </a>
              </span>
            ))}
          </p>
        )}
      </header>

      {mps.length > 0 && (
        <section aria-labelledby="mps" className="rounded-2xl bg-primary p-4 shadow-xs ring-1 ring-secondary ring-inset">
          <h2 id="mps" className="text-sm font-semibold text-primary">
            Тойргийн УИХ-ын гишүүд <span className="font-normal text-tertiary">· {place.constituency}</span>
          </h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {mps.map((m) => (
              <li key={m.id}>
                <Link href={`/officials/${m.id}`} prefetch={false} className="inline-flex h-9 items-center rounded-full px-3 text-sm font-medium text-secondary ring-1 ring-primary ring-inset hover:bg-primary_hover">
                  {m.shortName}
                  {m.party && <span className="ml-1.5 text-xs text-tertiary">{m.party}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {stories.length ? (
        <StoryList stories={stories} />
      ) : (
        <Empty
          title="Сүүлийн үед мэдээ ирээгүй"
          description={place.domains.length ? "Энэ газрын албан сайт шинэ мэдээ нийтлээгүй, эсвэл түр ажиллахгүй байна. Скрапер 2 цаг тутам шалгадаг." : "Энэ дүүргийн албан сайт одоогоор ажиллахгүй байна."}
        />
      )}

      <PlacePicker current={place.slug} title="Бусад аймаг, дүүрэг" />
    </div>
  );
}

export default function PlacePage(props: PageProps<"/place/[slug]">) {
  return (
    <Suspense fallback={<div className="mx-auto h-[32rem] w-full max-w-2xl animate-pulse rounded-2xl bg-secondary" />}>
      <PlaceView params={props.params} />
    </Suspense>
  );
}
