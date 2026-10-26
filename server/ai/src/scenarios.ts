export type Level = "A1" | "A2" | "B1";

export interface Scenario {
  id: string;
  titleTr: string;
  descriptionTr: string;
  level: Level;
  goalTr: string;
  opener: string;
}

export interface Course {
  id: string;
  /** Hedef dil adı (İngilizce, prompt içinde kullanılır) */
  languageEn: string;
  scenarios: Scenario[];
}

interface ScenarioDef {
  id: string;
  titleTr: string;
  descriptionTr: string;
  level: Level;
  goalTr: string;
  openers: Record<string, string>; // kurs id -> hedef dilde açılış cümlesi
}

const DEFS: ScenarioDef[] = [
  {
    id: "tanisma",
    titleTr: "Tanışma",
    descriptionTr: "Yeni biriyle tanışıp kendinden bahsediyorsun.",
    level: "A1",
    goalTr: "Karşındaki kişiyle tanışıp adını ve nereden geldiğini söylemek.",
    openers: {
      "tr-en": "Hi! Nice to meet you. What's your name?",
      "tr-de": "Hallo! Schön, dich kennenzulernen. Wie heißt du?",
      "tr-es": "¡Hola! Encantado de conocerte. ¿Cómo te llamas?",
      "tr-fr": "Salut ! Enchanté de te rencontrer. Comment tu t'appelles ?",
      "tr-it": "Ciao! Piacere di conoscerti. Come ti chiami?",
    },
  },
  {
    id: "kafe",
    titleTr: "Kafede sipariş",
    descriptionTr: "Bir kafede içecek ve atıştırmalık sipariş ediyorsun.",
    level: "A1",
    goalTr: "Kafede bir içecek ve bir atıştırmalık sipariş etmek.",
    openers: {
      "tr-en": "Hi there! Welcome to our café. What can I get for you?",
      "tr-de": "Hallo! Willkommen in unserem Café. Was darf ich dir bringen?",
      "tr-es": "¡Hola! Bienvenido a nuestra cafetería. ¿Qué te pongo?",
      "tr-fr": "Salut ! Bienvenue dans notre café. Qu'est-ce que je vous sers ?",
      "tr-it": "Ciao! Benvenuto al nostro bar. Cosa ti porto?",
    },
  },
  {
    id: "yol-sorma",
    titleTr: "Yol sorma",
    descriptionTr: "Şehirde yol tarifi alıyorsun.",
    level: "A2",
    goalTr: "Hedef yerine nasıl gideceğini öğrenmek.",
    openers: {
      "tr-en": "Hello! You look a little lost — are you trying to find somewhere?",
      "tr-de": "Hallo! Du siehst ein bisschen verloren aus — suchst du ein bestimmtes Ziel?",
      "tr-es": "¡Hola! Parece que estás un poco perdido. ¿Buscas algún sitio?",
      "tr-fr": "Salut ! Tu as l'air un peu perdu — tu cherches quelque part ?",
      "tr-it": "Ciao! Sembri un po' perso — stai cercando qualche posto?",
    },
  },
  {
    id: "alisveris",
    titleTr: "Alışveriş",
    descriptionTr: "Bir dükkânda ürün sorup fiyat öğreniyorsun.",
    level: "A2",
    goalTr: "Bir ürünü bulup fiyatını öğrenmek ve satın almak.",
    openers: {
      "tr-en": "Hi! Welcome to our shop. Are you looking for something special?",
      "tr-de": "Hallo! Willkommen in unserem Geschäft. Suchst du etwas Besonderes?",
      "tr-es": "¡Hola! Bienvenido a nuestra tienda. ¿Buscas algo especial?",
      "tr-fr": "Bonjour ! Bienvenue dans notre magasin. Vous cherchez quelque chose de spécial ?",
      "tr-it": "Ciao! Benvenuto nel nostro negozio. Cerchi qualcosa di speciale?",
    },
  },
  {
    id: "otel",
    titleTr: "Otelde konaklama",
    descriptionTr: "Otelde rezervasyon yapıp oda bilgisi alıyorsun.",
    level: "A2",
    goalTr: "Otelde oda ayırtmak ve gerekli bilgileri almak.",
    openers: {
      "tr-en": "Hello! Welcome to our hotel. How can I help you today?",
      "tr-de": "Guten Tag! Willkommen in unserem Hotel. Wie kann ich dir helfen?",
      "tr-es": "¡Buenos días! Bienvenido a nuestro hotel. ¿En qué puedo ayudarte?",
      "tr-fr": "Bonjour ! Bienvenue dans notre hôtel. Comment puis-je vous aider ?",
      "tr-it": "Buongiorno! Benvenuto nel nostro hotel. Come posso aiutarti?",
    },
  },
  {
    id: "doktor",
    titleTr: "Doktorda",
    descriptionTr: "Doktora şikâyetini anlatıp tavsiye alıyorsun.",
    level: "B1",
    goalTr: "Doktora rahatsızlığını anlatıp tavsiye almak.",
    openers: {
      "tr-en": "Good morning! I'm the doctor. What seems to be the problem today?",
      "tr-de": "Guten Morgen! Ich bin der Arzt. Was fehlt Ihnen heute?",
      "tr-es": "¡Buenos días! Soy el médico. ¿Qué le pasa hoy?",
      "tr-fr": "Bonjour ! Je suis le médecin. Qu'est-ce qui ne va pas aujourd'hui ?",
      "tr-it": "Buongiorno! Sono il dottore. Cosa non va oggi?",
    },
  },
  {
    id: "telefon",
    titleTr: "Telefon görüşmesi",
    descriptionTr: "Telefonda bir arkadaşınla sohbet edip buluşma planlıyorsun.",
    level: "B1",
    goalTr: "Telefonda kısa bir sohbet edip bir buluşma planlamak.",
    openers: {
      "tr-en": "Hello? Oh, hi! It's great to hear from you. How are you doing?",
      "tr-de": "Hallo? Ach, hi! Schön, von dir zu hören. Wie geht es dir?",
      "tr-es": "¿Hola? ¡Ah, hola! Me alegro de escucharte. ¿Cómo estás?",
      "tr-fr": "Allô ? Ah, salut ! Je suis content de t'entendre. Comment vas-tu ?",
      "tr-it": "Pronto? Ah, ciao! Che bello sentirti. Come stai?",
    },
  },
  {
    id: "serbest-sohbet",
    titleTr: "Serbest sohbet",
    descriptionTr: "Günlük konularda serbestçe sohbet ediyorsun.",
    level: "B1",
    goalTr: "En az üç tur boyunca doğal bir sohbet sürdürmek.",
    openers: {
      "tr-en": "Hey! It's nice to chat with you. What would you like to talk about today?",
      "tr-de": "Hi! Schön, mit dir zu plaudern. Worüber möchtest du heute sprechen?",
      "tr-es": "¡Hola! Qué bien charlar contigo. ¿De qué te gustaría hablar hoy?",
      "tr-fr": "Salut ! Ça fait plaisir de discuter avec toi. De quoi veux-tu parler aujourd'hui ?",
      "tr-it": "Ciao! Che bello chiacchierare con te. Di cosa vorresti parlare oggi?",
    },
  },
];

const COURSE_LANGUAGES: Record<string, string> = {
  "tr-en": "English",
  "tr-de": "German",
  "tr-es": "Spanish",
  "tr-fr": "French",
  "tr-it": "Italian",
};

export const COURSES: Course[] = Object.entries(COURSE_LANGUAGES).map(([id, languageEn]) => ({
  id,
  languageEn,
  scenarios: DEFS.map((def) => ({
    id: def.id,
    titleTr: def.titleTr,
    descriptionTr: def.descriptionTr,
    level: def.level,
    goalTr: def.goalTr,
    opener: def.openers[id],
  })),
}));

export function getCourse(courseId: string): Course | undefined {
  return COURSES.find((c) => c.id === courseId);
}

export function getScenario(courseId: string, scenarioId: string): Scenario | undefined {
  return getCourse(courseId)?.scenarios.find((s) => s.id === scenarioId);
}
