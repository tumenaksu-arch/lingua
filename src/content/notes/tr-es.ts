import type { CourseNotes } from './types';

/** Türkçe → İspanyolca (İspanya) ünite notları. */
export const trEsNotes: CourseNotes = {
  'tr-es.u1': {
    unitId: 'tr-es.u1',
    title: 'Selamlaşma ve kendini tanıtma',
    sections: [
      {
        heading: 'Temel selamlaşmalar',
        body: [
          'İspanyolcada selamlaşmalar Türkçeye çok benzer: hola (merhaba), adiós (hoşça kal), gracias (teşekkürler), por favor (lütfen). Kısa ve doğrudan kullanılırlar.',
          'Evet demek için sí (noktalı í ile), hayır için no kullanılır. İspanyolcada evet/hayır cevabından sonra teşekkür eklemek çok yaygındır: Sí, gracias veya No, gracias.',
        ],
        examples: [
          { target: 'Hola, ¿qué tal?', tr: 'Merhaba, nasılsın?' },
          { target: 'No, gracias.', tr: 'Hayır, teşekkürler.' },
          { target: 'Sí, claro.', tr: 'Evet, elbette.' },
        ],
      },
      {
        heading: "Özne zamirleri ve 'ser'",
        body: [
          'İspanyolcada fiiller kişiye göre çekimlenir, bu yüzden özne zamirini (yo, tú) çoğu zaman söylemek zorunda değilsin. Ama bu ünitede yo soy, tú eres kalıplarıyla tanışıyorsun.',
          'Türkçedeki ben öğrenciyim ifadesi İspanyolcada soy estudiante olur: -im eki yoktur, onun yerine soy fiilinin kendisi kişiyi belli eder. Yo soy ben ... -im, tú eres sen ... -sin demektir.',
        ],
        examples: [
          { target: 'Yo soy Ayşe.', tr: 'Ben Ayşe’yim.' },
          { target: 'Tú eres mi amigo.', tr: 'Sen benim arkadaşımsın.' },
          { target: 'Soy estudiante.', tr: 'Öğrenciyim.' },
        ],
      },
      {
        heading: 'İlk tanıdıklık cümleleri',
        body: [
          '¿Cómo estás? Türkçedeki Nasılsın? sorusuna karşılık gelir ve karşıdakinin durumunu sorar. Cevap genellikle Estoy bien (iyiyim) ile verilir.',
          'Estoy, geçici durumlar için kullanılan estar fiilinin bir çekimidir; soy (ser) ise kalıcı özellikler içindir. Bu ünitede sadece hazır kalıplar olarak öğren, ayrımına ileride değineceğiz.',
        ],
        examples: [
          { target: '¿Cómo estás?', tr: 'Nasılsın?' },
          { target: 'Estoy bien, gracias.', tr: 'İyiyim, teşekkürler.' },
        ],
      },
    ],
  },
  'tr-es.u2': {
    unitId: 'tr-es.u2',
    title: 'Yiyecekler ve içecekler',
    sections: [
      {
        heading: 'Artikeller: el ve la',
        body: [
          'Türkçede artikel yoktur ama İspanyolcada her isim ya eril (el) ya dişil (la) artikel alır. su, pan, café, té eril olduğu için el su, el pan, el café, el té denir; manzana ve leche dişil olduğu için la manzana, la leche denir.',
          'Artikeli kelimeyle birlikte ezberle; zaten kelimenin sonu genelde cinsiyeti ele verir: -a ile bitenler çoğunlukla dişil, -o ile bitenler eril.',
        ],
        examples: [
          { target: 'El pan está rico.', tr: 'Ekmek lezzetli.' },
          { target: 'La manzana es pequeña.', tr: 'Elma küçük.' },
          { target: 'Yo bebo el café.', tr: 'Kahve içiyorum.' },
        ],
      },
      {
        heading: 'Comer ve beber çekimi',
        body: [
          'İspanyolca fiiller kişiye göre sonları değişir. comer (yemek): yo como, tú comes; beber (içmek): yo bebo, tú bebes. Türkçedeki -ırım/-ırsın eklerinin karşılığı fiilin sonudur.',
          'Özne zamirini (yo, tú) eklemeden de sadece como, bebes diyebilirsin; çekim zaten kimin eylemi yaptığını söyler.',
        ],
        examples: [
          { target: 'Yo como pan.', tr: 'Ekmek yerim.' },
          { target: 'Tú bebes té.', tr: 'Çay içersin.' },
          { target: 'Yo como una manzana.', tr: 'Bir elma yerim.' },
        ],
      },
      {
        heading: 'Restoranda kullanışlı ifadeler',
        body: [
          'Aç olmak İspanyolcada fiil değil, tener hambre kalıbıyla söylenir: Tengo hambre (açım). Hesap istemek için La cuenta, por favor dersin.',
          'Lezzetli demek için rico kullanılır; Türkçedeki zengin anlamını kastetmez, yemek için lezzetli demektir.',
        ],
        examples: [
          { target: 'Tengo hambre.', tr: 'Açım.' },
          { target: 'La cuenta, por favor.', tr: 'Hesap, lütfen.' },
          { target: 'El queso está rico.', tr: 'Peynir lezzetli.' },
        ],
      },
    ],
  },
  'tr-es.u3': {
    unitId: 'tr-es.u3',
    title: 'Aile ve sahip olmak',
    sections: [
      {
        heading: 'Aile kelimeleri ve cinsiyet',
        body: [
          'Aile üyelerinde de cinsiyet ayrımı vardır: madre (la, anne), padre (el, baba), hermana (la, kız kardeş), hermano (el, erkek kardeş), hija (la, kız evlat), hijo (el, oğul).',
          'İspanyolcada Türkçedeki gibi benim annem demek için ayrı bir iyelik eki yoktur; mi kelimesi kullanılır: mi madre (annem), mi familia (ailem).',
        ],
        examples: [
          { target: 'Mi madre bebe té.', tr: 'Annem çay içer.' },
          { target: 'Mi hermano come pan.', tr: 'Erkek kardeşim ekmek yer.' },
          { target: 'Mi familia es grande.', tr: 'Ailem büyük.' },
        ],
      },
      {
        heading: 'Tener: sahip olmak ve varlık bildirmek',
        body: [
          'Türkçedeki ...ım var cümleleri İspanyolcada tener ile kurulur: Tengo una hermana (bir kız kardeşim var). tener fiili bende/yaşamımda var anlamı taşır.',
          'tener çekimi: yo tengo, tú tienes. Tekrar etmeye dikkat et: tengo (ben), tienes (sen).',
        ],
        examples: [
          { target: 'Tengo dos hermanos.', tr: 'İki erkek kardeşim var.' },
          { target: 'Tú tienes una hermana.', tr: 'Bir kız kardeşin var.' },
          { target: 'Mi amigo tiene un niño.', tr: 'Arkadaşımın bir çocuğu var.' },
        ],
      },
      {
        heading: 'Querer: sevmek ve istemek',
        body: [
          'Querer fiili hem sevmek hem istemek demektir. Kişileri severken İspanyolcada a edatı eklenir: Quiero a mi familia (ailemi seviyorum).',
          'Bu ünitede ayrıca grande (büyük) ve pequeño (küçük) sıfatlarıyla tanışıyorsun; Türkçedeki gibi cümlede isimden önce ya da sonra gelebilir.',
        ],
        examples: [
          { target: 'Quiero a mi familia.', tr: 'Ailemi seviyorum.' },
          { target: 'Mi abuela bebe té.', tr: 'Büyükannem çay içer.' },
        ],
      },
    ],
  },
  'tr-es.u4': {
    unitId: 'tr-es.u4',
    title: 'Seyahat ve yol tarifi',
    sections: [
      {
        heading: 'Nerede sorusu ve estar',
        body: [
          'Nerede? sorusu İspanyolcada ¿Dónde ...? ile sorulur ve cevapta yer bildiren estar fiili kullanılır: Dónde está el hotel? (Otel nerede?).',
          'esta (estar) bir yerde olma durumunu anlatır; soy gibi değildir. Türkçedeki otel nerede kelime dizisi yerine İspanyolcada soru kelimesi cümle başına gelir: ¿Dónde está el hotel?',
        ],
        examples: [
          { target: '¿Dónde está el hotel?', tr: 'Otel nerede?' },
          { target: 'La estación está cerca.', tr: 'İstasyon yakın.' },
          { target: 'El tren está lejos.', tr: 'Tren uzak.' },
        ],
      },
      {
        heading: 'Yön ve mesafe kelimeleri',
        body: [
          'Sol ve sağ İspanyolcada izquierda ve derecha; yakın cerca, uzak lejos. Yön bildirirken a edatı kullanılır: a la izquierda (sola), a la derecha (sağa).',
          'Bu kelimeler cinsiyetsizdir, yani the/la/los ayrımı yapmazsın; ama yanlarındaki isimler artikel alır.',
        ],
        examples: [
          { target: 'El hotel está a la derecha.', tr: 'Otel sağda.' },
          { target: 'A la izquierda, por favor.', tr: 'Sola, lütfen.' },
        ],
      },
      {
        heading: 'Yardım isteme ve ulaşım',
        body: [
          'Yardım istemek için Necesito ayuda (Yardıma ihtiyacım var) ya da Perdón (affedersiniz) ile cümleye nazikçe başlayabilirsin.',
          'Bilet billete, uçak avión, araba coche, bavul maleta kelimeleri bu ünitede geçer; hepsi eril: el billete, el avión, el coche, la maleta (dişil).',
        ],
        examples: [
          { target: 'Necesito ayuda.', tr: 'Yardıma ihtiyacım var.' },
          { target: 'Perdón, no entiendo.', tr: 'Affedersiniz, anlamıyorum.' },
          { target: 'Tengo un billete para el tren.', tr: 'Tren için bir biletim var.' },
        ],
      },
    ],
  },
  'tr-es.u5': {
    unitId: 'tr-es.u5',
    title: 'Alışveriş ve renkler',
    sections: [
      {
        heading: 'Fiyat sorma',
        body: [
          'Ne kadar? sorusu İspanyolcada ¿Cuánto ...? ile sorulur. Tekil bir şeyin fiyatı için ¿Cuánto cuesta? (Ne kadar?), çoğul için cuestan kullanılır.',
          'Para dinero, fiyat precio, dükkân tienda kelimeleri bu ünitede geçiyor; alışveriş diyaloğunun temel taşları.',
        ],
        examples: [
          { target: '¿Cuánto cuesta?', tr: 'Ne kadar?' },
          { target: 'El precio es diez euros.', tr: 'Fiyat on avro.' },
          { target: 'No tengo dinero.', tr: 'Param yok.' },
        ],
      },
      {
        heading: 'Pahalı ve ucuz',
        body: [
          'Caro pahalı, barato ucuz demektir. İspanyolcada bu sıfatlar ukladıkları isimle cinsiyet ve sayı bakımından uyumlu olur: la tienda es cara (dükkân pahalı), los zapatos son baratos.',
          'Türkçede sıfatlar hiç çekimlenmez; İspanyolcada ise -a/-o ve -s eklerine dikkat et.',
        ],
        examples: [
          { target: 'La tienda es cara.', tr: 'Dükkân pahalı.' },
          { target: 'Es muy barato.', tr: 'Çok ucuz.' },
          { target: 'Los zapatos son grandes.', tr: 'Ayakkabılar büyük.' },
        ],
      },
      {
        heading: 'Gustar ile beğeni bildirme',
        body: [
          'Me gusta ... kalıbı Türkçedeki hoşuma gidiyor / severim anlamına gelir ve sondaki fiil isim gibi mastar alır: Me gusta la música (Müziği severim).',
          'Dikkat: gustar fiilinin öznesi aslında beğenilen şeydir, bu yüzden beğenilen şey çoğulsa gusta yerine gustan kullanılır: Me gustan las películas (Filmleri severim).',
        ],
        examples: [
          { target: 'Me gusta la música.', tr: 'Müziği severim.' },
          { target: 'Me gusta el vestido azul.', tr: 'Mavi elbiseyi beğeniyorum.' },
          { target: 'Quiero comprar una camisa.', tr: 'Bir gömlek almak istiyorum.' },
        ],
      },
    ],
  },
  'tr-es.u6': {
    unitId: 'tr-es.u6',
    title: 'İş ve okul',
    sections: [
      {
        heading: 'Meslek söyleme',
        body: [
          'Meslek bildirirken İspanyolcada Türkçeden farklı olarak genelde belirsiz artikel (bir) kullanılmaz: Soy médico (Doktorum), Mi padre es ingeniero (Babam mühendis).',
          'Meslekler erilse el, dişilse la alır: el médico, el ingeniero. İspanyolcada (İspanya) bilgisayar kelimesi ordenador’dur; Latino İspanyolcasında bilgisayar denir.',
        ],
        examples: [
          { target: 'Mi padre es médico.', tr: 'Babam doktordur.' },
          { target: 'Soy médico.', tr: 'Doktorum.' },
          { target: 'El trabajo es bueno.', tr: 'İş iyi.' },
        ],
      },
      {
        heading: 'Okul eylemleri: leer, escribir, aprender',
        body: [
          'Yo leo (okurum), yo escribo (yazarım), yo aprendo (öğrenirim) çekimleri ilk tekil kişidedir. İspanyolcada -o ile biten fiil çekimi ben anlamına gelir.',
          'Özne zamirini atıp sadece Leo un libro (Bir kitap okuyorum) demen de yeterlidir; fiil kimin yaptığını zaten söyler.',
        ],
        examples: [
          { target: 'Leo un libro.', tr: 'Bir kitap okuyorum.' },
          { target: 'Escribo con un bolígrafo.', tr: 'Kalemla yazıyorum.' },
          { target: 'Aprendo español.', tr: 'İspanyolca öğreniyorum.' },
        ],
      },
      {
        heading: 'Yer bildiren edatlar: en',
        body: [
          'Türkçedeki -de/-da ekinin karşılığı İspanyolcada çoğunlukla en edatıdır: en la oficina (ofiste), en la escuela (okulda).',
          'Meşgul olmak için estar + ocupado kalıbı kullanılır: Estoy ocupado (Meşgulüm). Cinsiyete göre ocupada da denir.',
        ],
        examples: [
          { target: 'Trabajo en una oficina.', tr: 'Bir ofiste çalışıyorum.' },
          { target: 'El ordenador está en la oficina.', tr: 'Bilgisayar ofiste.' },
          { target: 'Hoy tengo una reunión.', tr: 'Bugün bir toplantım var.' },
        ],
      },
    ],
  },
  'tr-es.u7': {
    unitId: 'tr-es.u7',
    title: 'Hava durumu ve zaman',
    sections: [
      {
        heading: 'Hava durumu: hace kalıbı',
        body: [
          'Hava durumu anlatırken İspanyolcada hace kalıbı kullanılır; Türkçedeki hava güneşli / hava soğuk yapısının birebir karşılığı yoktur: Hace sol (Güneşli), Hace frío (Hava soğuk), Hace calor (Hava sıcak).',
          'Bu kalıplarda hava kelimesi (el tiempo) ayrıca söylenmez; tek başına hace yeterlidir.',
        ],
        examples: [
          { target: 'Hoy hace sol.', tr: 'Bugün hava güneşli.' },
          { target: 'Hace frío.', tr: 'Hava soğuk.' },
          { target: 'Hace buen tiempo.', tr: 'Hava güzel.' },
        ],
      },
      {
        heading: 'Günler ve hafta',
        body: [
          'Gün adları İspanyolcada küçük harfle yazılır: lunes (pazartesi), domingo (pazar), mañana (yarın), hoy (bugün).',
          'Bugün pazartesi demek için hava durumu kalıbı gibi hace değil, es kullanılır: Hoy es lunes. Günler eril olduğundan el öneki alabilir: el domingo (pazar günü).',
        ],
        examples: [
          { target: 'Hoy es lunes.', tr: 'Bugün pazartesi.' },
          { target: 'Mañana es lunes.', tr: 'Yarın pazartesi.' },
          { target: 'Trabajo toda la semana.', tr: 'Bütün hafta çalışıyorum.' },
        ],
      },
      {
        heading: 'Saat sorma',
        body: [
          'Saat kaç? sorusu ¿Qué hora es? ile sorulur. Cevap 2’den itibaren çoğul kullanır: Son las tres (Saat üç). Tekil sadece bir için: Es la una (Saat bir).',
          'Bu çoğul/tekil ayrımı Türkçede yoktur; İspanyolcada saat 1 dışındaki tüm saatlerde son las kalıbını kullan.',
        ],
        examples: [
          { target: '¿Qué hora es?', tr: 'Saat kaç?' },
          { target: 'Son las tres.', tr: 'Saat üç.' },
          { target: 'Es la una.', tr: 'Saat bir.' },
        ],
      },
    ],
  },
  'tr-es.u8': {
    unitId: 'tr-es.u8',
    title: 'Hobiler ve hafta sonu',
    sections: [
      {
        heading: 'Hobi fiilleri',
        body: [
          'Bu ünitede jugar (oynamak), tocar (çalmak), nadar (yüzmek), correr (koşmak), bailar (dans etmek), cocinar (yemek pişirmek), viajar (seyahat etmek) fiilleri geçiyor.',
          'İspanyolca fiiller -o ekiyle ben anlamına gelir: juego (oynarım), nado (yüzerim), corro (koşarım). Tekrarlı pratikle bu kalıp otomatikleşir.',
        ],
        examples: [
          { target: 'Juego al fútbol.', tr: 'Futbol oynarım.' },
          { target: 'Toco la guitarra.', tr: 'Gitar çalarım.' },
          { target: 'Corro en el parque.', tr: 'Parkta koşarım.' },
        ],
      },
      {
        heading: 'Jugar ve tocar ayrımı',
        body: [
          'Oyun oynamak jugar ile, enstrüman çalmak ise tocar ile söylenir; Türkçedeki oynamak/çalmak ayrımına benzer ama dikkat: futbol jugar, gitar tocar.',
          'Jugar fiili oyun adından önce al edatı alır: Juego al fútbol. Bu a, Türkçede karşılığı olmayan küçük ama önemli bir ayrıntıdır.',
        ],
        examples: [
          { target: 'Juego al fútbol.', tr: 'Futbol oynarım.' },
          { target: 'Toco la guitarra el fin de semana.', tr: 'Hafta sonu gitar çalarım.' },
        ],
      },
      {
        heading: 'Gustar ile hobiler ve hafta sonu',
        body: [
          'Hobilerinden bahsederken Me gusta + fiil mastarı kalıbını kullan: Me gusta nadar (Yüzmeyi severim), Me gusta bailar (Dans etmeyi severim).',
          'Hafta sonu için el fin de semana kalıbı kullanılır; cümlede zaman zarfı gibi geçer: Viajo el fin de semana (Hafta sonu seyahat ederim).',
        ],
        examples: [
          { target: 'Me gusta bailar.', tr: 'Dans etmeyi severim.' },
          { target: 'Me gusta viajar.', tr: 'Seyahat etmeyi severim.' },
          { target: 'Me gustan las películas.', tr: 'Filmleri severim.' },
        ],
      },
    ],
  },
};
