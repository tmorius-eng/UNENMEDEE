/**
 * Search wording for each feed page (`/topic/<key>`): the phrase people type ("улс төрийн мэдээ"),
 * how it is commonly typed in Latin letters ("uls turiin medee"), and a short, true description of
 * what the page shows. Rendered as the page's visible <h1> and intro and used in its <title>,
 * description and JSON-LD, so every topic is its own page about one subject ("content silo").
 * Only visible text: no hidden keyword lists (search engines penalise them).
 */
export interface TopicSeo {
  /** Visible <h1> and the start of the <title>: the phrase people search for. */
  heading: string;
  /** Common Latin spellings (Mongolians often type without Cyrillic); shown once under the intro. */
  latin: string[];
  /** One or two sentences about what the page covers. */
  intro: string;
}

const SEO: Record<string, TopicSeo> = {
  politics: {
    heading: "Улс төрийн мэдээ",
    latin: ["uls tur", "uls turiin medee"],
    intro: "УИХ, Засгийн газар, Ерөнхийлөгчийн Тамгын газар, яамдын албан ёсны мэдээ, тогтоол, томилгоо: эх сурвалжийн холбоостой, AI-аар баримтыг пи-араас ялгасан товч хураангуйгаар.",
  },
  economy: {
    heading: "Эдийн засгийн мэдээ",
    latin: ["ediin zasag", "ediin zasgiin medee"],
    intro: "Төсөв, татвар, Монголбанк, ханш, үнэ, тендер, худалдан авалт: Сангийн яам, Монголбанк, Гаалийн ерөнхий газар зэрэг албан эх сурвалжийн шинэ мэдээ, мөнгөн дүнтэйгээ.",
  },
  corruption: {
    heading: "Авлига, хяналт шалгалтын мэдээ",
    latin: ["avliga", "avligiin medee"],
    intro: "Авлигатай тэмцэх газар, Үндэсний аудитын газар, хяналт шалгалтын байгууллагуудын мэдээ, аудитын дүгнэлт, эрсдэлтэй худалдан авалт.",
  },
  justice: {
    heading: "Хууль, шүүхийн мэдээ",
    latin: ["huuli", "shuukh", "huuli shuukhiin medee"],
    intro: "Шинэ хууль, тогтоол, шүүх, прокурор, цагдаагийн албан мэдээ: legalinfo.mn, шүүхийн байгууллагууд болон Цагдаагийн ерөнхий газраас.",
  },
  mining: {
    heading: "Уул уурхай, эрчим хүчний мэдээ",
    latin: ["uul uurhai", "erchim huch"],
    intro: "Ашигт малтмал, лиценз, уул уурхайн бодлого, эрчим хүч, түлшний албан мэдээ: салбарын яамд, Ашигт малтмал, газрын тосны газар болон эрчим хүчний байгууллагуудаас.",
  },
  health: {
    heading: "Эрүүл мэндийн мэдээ",
    latin: ["eruul mend", "eruul mendiin medee"],
    intro: "Эрүүл мэндийн яам, эмнэлэг, дархлаажуулалт, урьдчилан сэргийлэх үзлэг, эмийн мэдээ: албан эх сурвалжаас.",
  },
  education: {
    heading: "Боловсрол, соёлын мэдээ",
    latin: ["bolovsrol", "soyol"],
    intro: "Сургууль, цэцэрлэг, их дээд сургууль, соёл, спорт, шинжлэх ухааны албан мэдээ, шийдвэр.",
  },
  society: {
    heading: "Нийгмийн мэдээ",
    latin: ["niigem", "niigmiin medee"],
    intro: "Нийгмийн халамж, хөдөлмөр эрхлэлт, тэтгэвэр, нийгмийн даатгал, гэр бүл, хүүхэд, хот байгуулалтын албан мэдээ.",
  },
  environment: {
    heading: "Байгаль орчин, хөдөө аж ахуйн мэдээ",
    latin: ["baigali orchin", "mal aj ahui"],
    intro: "Байгаль орчин, ус, цаг агаар, агаарын бохирдол, мал аж ахуй, газар тариалангийн албан мэдээ.",
  },
  infrastructure: {
    heading: "Дэд бүтэц, технологийн мэдээ",
    latin: ["ded butets", "zam teever"],
    intro: "Зам тээвэр, барилга, орон сууц, харилцаа холбоо, цахим үйлчилгээ, технологийн албан мэдээ.",
  },
  foreign: {
    heading: "Гадаад харилцаа, батлан хамгаалахын мэдээ",
    latin: ["gadaad hariltsaa", "batlan hamgaalah"],
    intro: "Гадаад харилцааны яам, олон улсын гэрээ, айлчлал, Батлан хамгаалах яамны албан мэдээ.",
  },
  local: {
    heading: "Орон нутгийн мэдээ",
    latin: ["oron nutag", "aimgiin medee"],
    intro: "21 аймаг, Улаанбаатарын дүүргүүдийн Засаг даргын Тамгын газар, ИТХ-ын албан мэдээ: орон нутгийн шийдвэр, төсөв, үйл явдал.",
  },
  data: {
    heading: "Нээлттэй өгөгдөл, тоо баримт",
    latin: ["neelttei ugugdul", "statistik"],
    intro: "opendata.gov.mn-д нийтлэгдсэн төрийн нээлттэй өгөгдлийн шинэчлэл, статистикийн тоо баримт.",
  },
  risk: {
    heading: "Эрсдэлтэй мэдээ: тендер, төсөв, шууд гэрээ",
    latin: ["tender", "avliga", "tusuv"],
    intro: "AI-ийн эрсдэлийн үнэлгээ өндөр гарсан төрийн мэдээ: тендергүй худалдан авалт, их хэмжээний төсөв, аудит. Энэ нь хардлага биш, анхаарах шаардлагатай гэсэн тэмдэглэгээ.",
  },
  budget: {
    heading: "Төсөв, тендерийн мэдээ",
    latin: ["tusuv", "tender"],
    intro: "Улсын болон орон нутгийн төсөв, тендер, худалдан авах ажиллагааны албан мэдээ, мөнгөн дүнтэйгээ.",
  },
  ministry: {
    heading: "Яамдын шийдвэр, мэдээ",
    latin: ["yamnii medee"],
    intro: "Засгийн газрын яамдын албан ёсны мэдээ, тушаал, шийдвэр.",
  },
};

export function topicSeo(key: string): TopicSeo | undefined {
  return SEO[key];
}

/** The page <title> for a feed page: "Улс төрийн мэдээ — өнөөдрийн шинэ мэдээ". */
export function topicTitle(key: string, fallbackLabel: string): string {
  return `${SEO[key]?.heading ?? fallbackLabel} — өнөөдрийн шинэ мэдээ`;
}
