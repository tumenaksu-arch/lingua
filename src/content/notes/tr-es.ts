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
          'Türkçede artikel yoktur ama İspanyolcada her isim ya eril (el) ya dişil (la) artikel alır. su, pan, café, té eril olduğu için el agua, el pan, el café, el té denir; manzana ve leche dişil olduğu için la manzana, la leche denir.',
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
          'Türkçedeki açım ifadesi İspanyolcada sıfatla değil, tener hambre kalıbıyla kurulur: Tengo hambre (açım). Hesap istemek için La cuenta, por favor dersin.',
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
          'Nerede? sorusu İspanyolcada ¿Dónde ...? ile sorulur ve cevapta yer bildiren estar fiili kullanılır: ¿Dónde está el hotel? (Otel nerede?).',
          'está (estar) bir yerde olma durumunu anlatır; soy gibi değildir. Türkçedeki otel nerede kelime dizisi yerine İspanyolcada soru kelimesi cümle başına gelir: ¿Dónde está el hotel?',
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
          'Yönler zarf olarak kullanıldığında biçim değiştirmezler; ama isim olarak kullanılırlarsa dişildir: a la izquierda, a la derecha.',
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
          'Bilet billete, uçak avión, araba coche, bavul maleta kelimeleri bu ünitede geçer; billete, avión ve coche erildir (el billete, el avión, el coche), maleta ise dişildir (la maleta).',
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
          'Caro pahalı, barato ucuz demektir. İspanyolcada bu sıfatlar uydukları isimle cinsiyet ve sayı bakımından uyumlu olur: la tienda es cara (dükkân pahalı), los zapatos son baratos.',
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
          'Meslekler erilse el, dişilse la alır: el médico, el ingeniero. İspanyolcada (İspanya) bilgisayar kelimesi ordenador’dur; Latin Amerika İspanyolcasında ise computadora denir.',
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
  'tr-es.u9': {
    unitId: 'tr-es.u9',
    title: 'Geçmiş zaman: dün ne yaptın?',
    sections: [
      {
        heading: 'Pretérito: bitmiş geçmiş',
        body: [
          'İspanyolcada bitmiş geçmiş eylemler için pretérito kullanılır: dün, geçen hafta, anoche gibi zamanlarda yapılan ve biten şeyler. Türkçedeki -dı/-di ekine benzer.',
          'Zaman zarfları önemlidir: ayer (dün) ve anoche (dün gece) bu ünitede geçiyor; cümlede geçmiş fiille birlikte bu zarflar, olayın bittiğini gösterir.',
        ],
        examples: [
          { target: 'Ayer fui al parque.', tr: 'Dün parka gittim.' },
          { target: 'Anoche dormí bien.', tr: 'Dün gece iyi uyudum.' },
          { target: 'Ayer trabajé ocho horas.', tr: 'Dün sekiz saat çalıştım.' },
        ],
      },
      {
        heading: '-Ar fiillerinin geçmişi',
        body: [
          '-Ar ile biten fiillerde geçmiş kişisi -é ile biter: trabajé (çalıştım), estudié (ders çalıştım), compré (aldım). Özne zamirine gerek yok; fiil kendisi ben anlamını taşır.',
          '-Er/-ir fiillerinde ise -í ile biter: comí, bebí, dormí (uyudum). Bu kalıp çok düzenlidir, tek yapman gereken fiil köküne -é/-í eklemek.',
        ],
        examples: [
          { target: 'Ayer estudié español.', tr: 'Dün İspanyolca çalıştım.' },
          { target: 'Ayer compré un vestido.', tr: 'Dün bir elbise aldım.' },
          { target: 'Anoche comí pescado.', tr: 'Dün gece balık yedim.' },
        ],
      },
      {
        heading: 'Düzensiz fiiller: fui, vi, hice',
        body: [
          'Bazı yaygın fiiller düzensizdir ve ayrıca ezberlenir: ir (gitmek) → fui, ver (görmek/izlemek) → vi, hacer (yapmak) → hice.',
          'Bu fiillerin geçmiş biçimi fiilin kendisine benzemez; en yaygın olanlarını bu ünitede öğreniyorsun. salir (dışarı çıkmak) düzenlidir: salí.',
        ],
        examples: [
          { target: 'Ayer hice la tarea.', tr: 'Dün ödevimi yaptım.' },
          { target: 'Anoche vi una película.', tr: 'Dün gece bir film izledim.' },
          { target: 'Ayer salí con mis amigos.', tr: 'Dün arkadaşlarımla dışarı çıktım.' },
        ],
      },
    ],
  },
  'tr-es.u10': {
    unitId: 'tr-es.u10',
    title: 'Ev ve günlük işler',
    sections: [
      {
        heading: 'Ev bölümleri',
        body: [
          'Ev ve odalar: la casa (ev), la cocina (mutfak), el baño (banyo), el dormitorio (yatak odası). Artikelleriyle birlikte ezberle: cocina dişil (la), baño ve dormitorio eril (el).',
          'Türkçedeki evde / mutfakta ifadesinin karşılığı yine en edatıdır: en la cocina (mutfakta), en el baño (banyoda).',
        ],
        examples: [
          { target: 'La cocina está sucia.', tr: 'Mutfak kirli.' },
          { target: 'El baño está limpio.', tr: 'Banyo temiz.' },
          { target: 'Mi dormitorio es grande.', tr: 'Yatak odam büyük.' },
        ],
      },
      {
        heading: 'Günlük iş fiilleri: limpiar ve lavar',
        body: [
          'limpiar (temizlemek) ve lavar (yıkamak) düzenli -ar fiilleridir: limpio (temizlerim), lavo (yıkarım). Geçmişleri limpié, lavé.',
          'İş yapmak deyimleri kalıplaşır: hacer la cama (yatağı toplamak, kelimesi kelimesine yatak yapmak), lavar la ropa (çamaşır yıkamak).',
        ],
        examples: [
          { target: 'Hago la cama todos los días.', tr: 'Her gün yatağımı toplarım.' },
          { target: 'Lavo la ropa los sábados.', tr: 'Cumartesileri çamaşır yıkarım.' },
          { target: 'Ayer limpié el baño.', tr: 'Dün banyoyu temizledim.' },
        ],
      },
      {
        heading: 'Temiz mi kirli mi: sıfat uyumu',
        body: [
          'limpio (temiz), sucio (kirli), ordenado (düzenli) sıfatları isimle cinsiyet bakımından uyumlu olur: la cocina está sucia ama el baño está limpio.',
          'Durum bildirmek için está (estar), kalıcı nitelik için es (ser) kullanılır; temiz/kirli gibi değişebilir durumlar genellikle está ile kurulur.',
        ],
        examples: [
          { target: 'El suelo está sucio.', tr: 'Yer kirli.' },
          { target: 'Mi dormitorio es ordenado.', tr: 'Yatak odam düzenli.' },
          { target: 'La ropa está sucia.', tr: 'Çamaşırlar kirli.' },
        ],
      },
    ],
  },
  'tr-es.u11': {
    unitId: 'tr-es.u11',
    title: 'Sağlık ve vücut',
    sections: [
      {
        heading: 'Vücut bölümleri ve artikeller',
        body: [
          'Vücut kelimeleri: el cuerpo (vücut), la cabeza (baş), el brazo (kol), la pierna (bacak), la mano (el). Dikkat: mano -a ile bitse de dişildir (el mano değil, la mano doğrudur).',
          'Bu ünitede mano dişil (la mano) olarak öğren; İspanyolcada bazı -a ile biten kelimeler eril olsa da mano dişildir.',
        ],
        examples: [
          { target: 'Me duele la cabeza.', tr: 'Başım ağrıyor.' },
          { target: 'Me duele el brazo.', tr: 'Kolum ağrıyor.' },
          { target: 'Me duele la mano.', tr: 'Elim ağrıyor.' },
        ],
      },
      {
        heading: 'Doler ile ağrı bildirme',
        body: [
          'Ağrımak için doler fiili kullanılır ama yapı Türkçeden farklıdır: Me duele la cabeza kelimesi kelimesine başım ağrıyor demek değil, bana ağrıyor baş anlamındadır; ağrıyan şey asıl öznedir.',
          'Ağrıyan şey tekilse duele, çoğulsa duelen kullanılır: Me duele la cabeza (başım ağrıyor), Me duelen los brazos (kollarım ağrıyor).',
        ],
        examples: [
          { target: 'Me duele el cuerpo.', tr: 'Vücudum ağrıyor.' },
          { target: '¿Te duele el brazo también?', tr: 'Kolun da mı ağrıyor?' },
          { target: 'Me duele la pierna.', tr: 'Bacağım ağrıyor.' },
        ],
      },
      {
        heading: 'Hastalık ve şikâyet kalıpları',
        body: [
          'Hasta olmak: estar enfermo (hastayım). Soğuk algınlığı: tengo un resfriado (kelimesi kelimesine bir soğuk algınlığım var). Ateş: tengo fiebre.',
          'İlaç almak tomo la medicina; eczane la farmacia, hastane el hospital. La familia es importante derken öğrendiğin kalıplarla birleştir: la salud es importante (sağlık önemli).',
        ],
        examples: [
          { target: 'Tengo un resfriado.', tr: 'Soğuk algınlığım var.' },
          { target: 'Tengo fiebre.', tr: 'Ateşim var.' },
          { target: 'Estoy enfermo, tomo la medicina.', tr: 'Hastayım, ilaç alıyorum.' },
        ],
      },
    ],
  },
  'tr-es.u12': {
    unitId: 'tr-es.u12',
    title: 'Ulaşım ve yön tarifi',
    sections: [
      {
        heading: 'Şehir içi ulaşım',
        body: [
          'Ulaşım araçları ve duraklar: la calle (sokak), el autobús (otobüs), el metro (metro), la parada (durak), el mapa (harita).',
          'Bir araçta olmak için en edatı kullanılır: el autobús está en la parada (otobüs durakta).',
        ],
        examples: [
          { target: 'El autobús está en la parada.', tr: 'Otobüs durakta.' },
          { target: 'El metro es rápido.', tr: 'Metro hızlı.' },
          { target: 'La parada está cerca.', tr: 'Durak yakın.' },
        ],
      },
      {
        heading: 'Emir kipi: yön tarifinde',
        body: [
          'Yön tarifi verirken emir kipi kullanılır: sigue recto (düz devam et), gira a la derecha (sağa dön), cruza la calle (sokağı karşıya geç). Bu kalıplar tek başına bile yaygındır.',
          'Fiiller bu ünitede düzenlidir: seguir → sigue, girar → gira, cruzar → cruza. Uzun tariflerde fiilleri bağlamak için luego (sonra) ve y (ve) kullanılır.',
        ],
        examples: [
          { target: 'Sigue recto dos calles.', tr: 'İki sokak düz devam et.' },
          { target: 'Gira a la izquierda en la esquina.', tr: 'Köşeden sola dön.' },
          { target: 'Cruza la calle.', tr: 'Sokağı karşıya geç.' },
        ],
      },
      {
        heading: 'Nasıl varırım ve konum',
        body: [
          'Varmak için llegar kullanılır: ¿Cómo llego a la estación? (İstasyona nasıl varırım?). A edatı varış noktasından önce gelir.',
          'Karşısında demek için enfrente de kalıbı kullanılır: el hospital está enfrente de la farmacia (hastane eczanenin karşısında).',
        ],
        examples: [
          { target: '¿Cómo llego al hotel?', tr: 'Otele nasıl varırım?' },
          { target: 'La estación está enfrente.', tr: 'İstasyon karşıda.' },
          { target: 'El parque está enfrente del hotel.', tr: 'Park otelin karşısında.' },
        ],
      },
    ],
  },
  'tr-es.u13': {
    unitId: 'tr-es.u13',
    title: 'Gelecek planları ve tatil',
    sections: [
      {
        heading: 'Gelecek: ir a + fiil',
        body: [
          'İspanyolcada gelecek için en yaygın yapı ir a + mastar kalıbıdır: voy a viajar (seyahat edeceğim), vamos a llevar (götüreceğiz). Türkçedeki -ecek/-acak ekine benzer.',
          'Bu kalıp hem kesin plan hem niyet bildirir: mañana voy a estudiar yarın ders çalışacağım anlamına gelir.',
        ],
        examples: [
          { target: 'El próximo mes voy a España.', tr: 'Gelecek ay İspanya’ya gideceğim.' },
          { target: 'Voy a llevar una maleta.', tr: 'Bir bavul götüreceğim.' },
          { target: 'Vamos juntos a la playa.', tr: 'Birlikte plaja gideceğiz.' },
        ],
      },
      {
        heading: 'Pensar ile niyet bildirme',
        body: [
          'Pensar fiili hem düşünmek hem de niyet etmek demektir: pienso viajar (seyahat etmeyi düşünüyorum/niyetim). Fiilden sonra mastar gelir.',
          'Pienso que ... kalıbı ise bence ... anlamına gelir: pienso que sí (bence öyle/evet).',
        ],
        examples: [
          { target: 'Pienso viajar el próximo mes.', tr: 'Gelecek ay seyahat etmeyi düşünüyorum.' },
          { target: '¿Qué piensas hacer este verano?', tr: 'Bu yaz ne yapmayı düşünüyorsun?' },
          { target: 'Pienso visitar la montaña.', tr: 'Dağı ziyaret etmeyi düşünüyorum.' },
        ],
      },
      {
        heading: 'Tatil kelimeleri ve zaman zarfları',
        body: [
          'Tatil kelimeleri: la playa (plaj), el mar (deniz), la montaña (dağ), el verano (yaz), las vacaciones (tatil). Hepsi bu ünitede geçiyor; artikellerine dikkat et.',
          'Zaman için: el próximo mes (gelecek ay), el próximo fin de semana (gelecek hafta sonu), pronto (yakında), juntos (birlikte).',
        ],
        examples: [
          { target: 'En verano voy a la playa.', tr: 'Yazın plaja giderim/gideceğim.' },
          { target: 'Nos vemos pronto.', tr: 'Yakında görüşürüz.' },
          { target: 'Viajamos juntos.', tr: 'Birlikte seyahat ederiz.' },
        ],
      },
    ],
  },
  'tr-es.u14': {
    unitId: 'tr-es.u14',
    title: 'Karşılaştırma: daha ve en',
    sections: [
      {
        heading: 'más ... que ile karşılaştırma',
        body: [
          'Daha ... anlamı için más + sıfat/fiil + que kalıbı kullanılır: más rápido (daha hızlı), más caro (daha pahalı). Karşılaştırılan şey que den sonra gelir.',
          'Daha az için menos ... que kullanılır: menos caro (daha az pahalı/daha ucuz). Türkçedeki -den/-dan ekinin karşılığı que edatıdır.',
        ],
        examples: [
          { target: 'El tren es más rápido que el coche.', tr: 'Tren arabadan daha hızlı.' },
          { target: 'El autobús es menos rápido que el coche.', tr: 'Otobüs arabadan daha yavaş.' },
          { target: 'El café es más caro que el té.', tr: 'Kahve çaydan daha pahalı.' },
        ],
      },
      {
        heading: 'Düzensiz karşılaştırmalar: mejor, peor, mayor, menor',
        body: [
          'Bazı sıfatlar düzensiz karşılaştırılır: bueno → mejor (daha iyi), malo → peor (daha kötü). Bu kalıplarda más kullanılmaz: más bueno yanlıştır.',
          'Yaş ve büyüklük karşılaştırması için mayor (daha büyük/yaşça büyük) ve menor (daha küçük/yaşça küçük) kullanılır: mi hermano es mayor que yo (erkek kardeşim benden büyük).',
        ],
        examples: [
          { target: 'Mi equipo es mejor que tu equipo.', tr: 'Takımım seninkinden iyi.' },
          { target: 'Mi hermano es mayor que yo.', tr: 'Erkek kardeşim benden yaşça büyük.' },
          { target: 'Hoy estoy peor.', tr: 'Bugün daha kötüyüm.' },
        ],
      },
      {
        heading: 'tan ... como ve en üstünlük',
        body: [
          'Eşit karşılaştırma için tan + sıfat + como kullanılır: tan difícil como (kadar zor). Olumsuzda no es tan ... como (kadar ... değil).',
          'En üstünlük için artikel + en üstünlük biçimi: el más rápido de todos (hepsinin en hızlısı), el mejor (en iyi). Türkçedeki en eki için ayrı bir kelime gerekmez.',
        ],
        examples: [
          { target: 'Este examen no es tan difícil como piensas.', tr: 'Bu sınav düşündüğün kadar zor değil.' },
          { target: 'El avión es el más rápido de todos.', tr: 'Uçak hepsinin en hızlısı.' },
          { target: 'Este examen es más fácil.', tr: 'Bu sınav daha kolay.' },
        ],
      },
    ],
  },
  'tr-es.u15': {
    unitId: 'tr-es.u15',
    title: 'Duygular ve kişilik',
    sections: [
      {
        heading: 'Duyguları bildirmek',
        body: [
          'Duygular geçici durum olduğu için estar ile kurulur: estoy feliz (mutluyum), estoy triste (üzgünüm), estoy nervioso (gerginim).',
          'İspanyolcada feliz ve contento yakın anlamlıdır; feliz biraz daha güçlü mutluluk, contento memnuniyet ve hafif sevinç bildirir. Genellikle birbirinin yerine kullanılabilir.',
        ],
        examples: [
          { target: 'Hoy estoy muy feliz.', tr: 'Bugün çok mutluyum.' },
          { target: 'No estoy triste, estoy contento.', tr: 'Üzgün değilim, memnunum.' },
          { target: 'Estoy nervioso por el examen.', tr: 'Sınav yüzünden gerginim.' },
        ],
      },
      {
        heading: 'Kişilik sıfatları',
        body: [
          'Kişilik kalıcı olduğu için ser ile kurulur: mi padre es tranquilo (babam sakindir), mi hermano es fuerte (erkek kardeşim güçlüdür).',
          'Bu ünitede: tranquilo (sakin), fuerte (güçlü), amable (nazik), tímido (utangaç), importante (önemli). Bu sıfatlar hem eril hem dişil isimlerle aynı biçimde kullanılır.',
        ],
        examples: [
          { target: 'Mi padre es tranquilo y amable.', tr: 'Babam sakin ve naziktir.' },
          { target: 'El niño es tímido.', tr: 'Çocuk utangaçtır.' },
          { target: 'El profesor es muy amable.', tr: 'Öğretmen çok naziktir.' },
        ],
      },
      {
        heading: 'Fikir bildirme: creer ve tener razón',
        body: [
          'Bence ... için creo que ... kalıbı kullanılır: creo que sí (bence öyle/evet), creo que es difícil (bence zor). Fiil creer düzenlidir: creo, crees.',
          'Haklı olmak İspanyolcada tener razón kalıbıdır: tienes razón (haklısın). Türkçedeki gibi tek kelime değil, sahip olmak + haklılık yapısıdır.',
        ],
        examples: [
          { target: 'Creo que tienes razón.', tr: 'Bence haklısın.' },
          { target: '¿Quieres estudiar conmigo?', tr: 'Benimle çalışmak ister misin?' },
          { target: 'La familia es muy importante.', tr: 'Aile çok önemlidir.' },
        ],
      },
    ],
  },
  'tr-es.u16': {
    unitId: 'tr-es.u16',
    title: 'Kibar istekler',
    sections: [
      {
        heading: 'Quisiera ve me gustaría',
        body: [
          'İspanyolcada sipariş ve isteklerde quisiera (isterdim) ve me gustaría (isterim) kalıpları quiero’dan (istiyorum) daha kibar kabul edilir: quisiera un té (bir çay isterdim).',
          'Restoranda masa istemek için: quisiera una mesa para dos (iki kişilik bir masa isterdim). para + sayı kalıbı kişi sayısını bildirir.',
        ],
        examples: [
          { target: 'Quisiera una mesa para dos.', tr: 'İki kişilik bir masa isterdim.' },
          { target: 'Me gustaría un té.', tr: 'Bir çay isterim.' },
          { target: '¿Qué te gustaría tomar?', tr: 'Ne içmek istersin?' },
        ],
      },
      {
        heading: '¿Podría ...? ile kibar soru',
        body: [
          'Podría (yapabilir miyim / yapabilir misiniz) kibar soruların temelidir: ¿podría traer la cuenta? (hesabı getirebilir misiniz?), ¿podría repetir? (tekrar edebilir misiniz?).',
          'Podría tek başına da kullanılabilir: podría ser (olabilir). Türkçedeki olabilir mi yapısına çok benzer.',
        ],
        examples: [
          { target: '¿Podría traer la cuenta?', tr: 'Hesabı getirebilir misiniz?' },
          { target: '¿Podría repetir, por favor?', tr: 'Tekrar edebilir misiniz, lütfen?' },
          { target: '¿Podría reservar una mesa?', tr: 'Masa rezerve edebilir miyim?' },
        ],
      },
      {
        heading: 'Telefonda ve restoranda',
        body: [
          'Telefon etmek llamar fiilidir: voy a llamar a mi madre (annemi arayacağım). Rezervasyon yapmak reservar: quiero reservar una mesa (masa rezerve etmek istiyorum).',
          'Bahşiş propina, garson camarero, boş/müsait libre (¿está libre esta mesa? bu masa boş mu?). Teşekküre karşılık con gusto (memnuniyetle) sık duyulur.',
        ],
        examples: [
          { target: 'Voy a llamar al restaurante.', tr: 'Restoranı arayacağım.' },
          { target: '¿Está libre esta mesa?', tr: 'Bu masa boş mu?' },
          { target: 'Dejo una propina en la mesa.', tr: 'Masada bahşiş bırakıyorum.' },
        ],
      },
    ],
  },
};
