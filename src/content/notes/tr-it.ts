import type { CourseNotes } from './types';

/** Türkçe → İtalyanca kursu için ünite notları. */
export const trItNotes: CourseNotes = {
  'tr-it.u1': {
    unitId: 'tr-it.u1',
    title: 'Selamlaşma ve "olmak" fiili',
    sections: [
      {
        heading: 'Selamlaşma ve kibarlık',
        body: [
          'İtalyancada "merhaba" ve "hoşça kal" için aynı kelime olan "ciao" kullanılabilir; "arrivederci" ise yalnızca ayrılırken söylenir. Türkçeden farklı olarak İtalyanca rica cümlesinde "per favore" (lütfen) hem başa hem sona gelebilir.',
          '"Sì" kelimesindeki kesme işaretine dikkat: sì (evet) ile si (kendisi) ayrı kelimelerdir. "Buongiorno" gün boyunca kullanılır, "buonanotte" ise yalnızca yatmadan önce.',
        ],
        examples: [
          { target: 'Ciao, sono Ayşe.', tr: 'Merhaba, ben Ayşe.' },
          { target: 'Sì, per favore.', tr: 'Evet, lütfen.' },
          { target: 'Buonanotte.', tr: 'İyi geceler.' },
        ],
      },
      {
        heading: 'Io sono, tu sei',
        body: [
          'Türkçedeki "ben öğrenciyim" gibi cümlelerde ek (-im) kullanılır; İtalyancada ise "io sono" (ben ...-im) ve "tu sei" (sen ...-sin) kalıplarıyla ayrı bir fiil kullanılır. Pronoun (io, tu) genellikle düşer ama vurgu için kalabilir.',
          'İtalyancada "bir" için artikel gerekir: "un uomo" (bir adam), "una ragazza" (bir kız). Eril isimler "un", dişil isimler "una" alır; Türkçede böyle bir cinsiyet ayrımı yoktur.',
        ],
        examples: [
          { target: 'Io sono uno studente.', tr: 'Ben bir öğrenciyim.' },
          { target: 'Tu sei una ragazza.', tr: 'Sen bir kızsın.' },
          { target: 'Il mio nome è Ali.', tr: 'Benim ismim Ali.' },
        ],
      },
      {
        heading: 'Sorular ve tanışma',
        body: [
          'Türkçedeki gibi soru eki cümle sonuna gelmez; "Come stai?" (Nasılsın?) kelime sırası aynen kalır, yalnızca soru işareti eklenir ve konuşmada ses yükselir.',
          '"Sto bene" (iyiyim) cevabında "stare" fiili kullanılır; bu fiil sağlık ve hâl bildirir. Tanışmada "Piacere di conoscerti" (tanıştığıma memnun oldum) kalıbı hazır olarak öğrenilir.',
        ],
        examples: [
          { target: 'Come stai?', tr: 'Nasılsın?' },
          { target: 'Sto bene, grazie.', tr: 'İyiyim, teşekkürler.' },
          { target: 'Piacere di conoscerti.', tr: 'Tanıştığıma memnun oldum.' },
        ],
      },
    ],
  },
  'tr-it.u2': {
    unitId: 'tr-it.u2',
    title: 'Yemekler, artikeller ve yemek fiilleri',
    sections: [
      {
        heading: 'Artikeller ve cinsiyet',
        body: [
          'Türkçede artikel yoktur; İtalyancada hemen her isim bir artikel alır: il pane (ekmek), il caffè, la mela (elma). Ünlüyle başlayan isimlerde kısaltma olur: l\'acqua, l\'uovo.',
          'Artikel ismin cinsiyetine göre değişir ve bu cümle boyunca sıfatları da etkiler. Yemek kelimelerini öğrenirken artikeliyle birlikte ezberlemek en kolayıdır.',
        ],
        examples: [
          { target: "L'acqua è deliziosa.", tr: 'Su lezzetli.' },
          { target: 'La mela è rossa.', tr: 'Elma kırmızı.' },
          { target: 'Il pane è delizioso.', tr: 'Ekmek lezzetli.' },
        ],
      },
      {
        heading: 'Mangiare ve bere: yemek ve içmek',
        body: [
          'Türkçedeki "-ırım, -ersin" ekleri yerine İtalyancada fiil çekimi kullanılır: io mangio (yerim), tu mangi (yersin), io bevo (içerim), lei beve (içer). Fiil özneden hemen sonra gelir.',
          'Genel nesnelerde artikel kullanılmaz: "Mangio pane" (ekmek yerim), "Bevo acqua" (su içerim). Ama belirli nesnelerde artikel gerekir: "Mangio la mela" (elmayı yerim).',
        ],
        examples: [
          { target: 'Io bevo acqua.', tr: 'Ben su içerim.' },
          { target: 'Tu mangi pane.', tr: 'Sen ekmek yersin.' },
          { target: 'Lei beve tè.', tr: 'O (bayan) çay içer.' },
        ],
      },
      {
        heading: 'Ho fame ve restoran kalıpları',
        body: [
          '"Ben açım" İtalyancada sıfatla değil, "avere" (sahip olmak) fiiliyle kurulur: "Ho fame" (kelimesi kelimesine "açlığım var"). Aynı kalıp "Ho sete" (susadım) için de geçerlidir.',
          'Restoranda "Il menù, per favore" (menü lütfen) ve "Il conto, per favore" (hesap lütfen) kalıpları hazırdır; her ikisinde de artikel unutulmaz.',
        ],
        examples: [
          { target: 'Ho fame.', tr: 'Ben açım.' },
          { target: 'Mangio uova a colazione.', tr: 'Kahvaltıda yumurta yerim.' },
          { target: 'Il conto, per favore.', tr: 'Hesap, lütfen.' },
        ],
      },
    ],
  },
  'tr-it.u3': {
    unitId: 'tr-it.u3',
    title: 'Seyahatte yön sormak',
    sections: [
      {
        heading: "Dov'è: nerede sorusu",
        body: [
          'Türkçedeki "nerede" eki gibi cümle sonuna gelen bir parça yoktur; soru kelimesi "dove" (nerede) cümle başında durur. "Dove" + "è" birleşince "dov\'è" olur: "Dov\'è l\'albergo?" (Otel nerede?).',
          'Mekân isimlerinde artikel zorunludur ve ünlüyle başlayanlarda kısalır: l\'albergo (otel), l\'aeroporto (havalimanı), il treno (tren).',
        ],
        examples: [
          { target: "Dov'è l'albergo?", tr: 'Otel nerede?' },
          { target: "Dov'è il treno?", tr: 'Tren nerede?' },
          { target: "Scusi, dov'è il taxi?", tr: 'Affedersiniz, taksi nerede?' },
        ],
      },
      {
        heading: 'Yönler ve yer edatları',
        body: [
          '"Sinistra" (sol) ve "destra" (sağ) sık karıştırılır; yön bildirirken edat kullanılır: "a destra" (sağda), "sulla destra" (sağ tarafta). "Nel parco" (parkta) gibi yerlerde "in" edatı isimle birleşir.',
          'Sıfat fiilden sonra gelir: "L\'albergo è vicino" (Otel yakın), "L\'aeroporto è lontano" (Havalimanı uzak).',
        ],
        examples: [
          { target: "L'albergo è vicino.", tr: 'Otel yakın.' },
          { target: "L'aeroporto è lontano.", tr: 'Havalimanı uzak.' },
          { target: 'La via è a destra.', tr: 'Sokak sağda.' },
        ],
      },
      {
        heading: 'Kibar yardım isteme',
        body: [
          'Yabancılardan yardım isterken "Scusi" (affedersiniz) ile başlanır; bu resmî hitaptır. "Mi può aiutare?" (Bana yardım edebilir misiniz?) kalıbında "mi" edatı fiilden önce gelir, Türkçeden farklı olarak soru parçası kullanılmaz.',
          '"Tardi" (geç) ve "presto" (erken) zıt çiftidir; tren gecikince "Il treno è in ritardo" (tren rötarlı) denir, tek başına "tardi" fiil olarak kullanılmaz.',
        ],
        examples: [
          { target: 'Mi può aiutare?', tr: 'Bana yardım edebilir misiniz?' },
          { target: 'Il treno è in ritardo.', tr: 'Tren geç (rötarlı).' },
          { target: "Scusi, dov'è l'albergo?", tr: 'Affedersiniz, otel nerede?' },
        ],
      },
    ],
  },
  'tr-it.u4': {
    unitId: 'tr-it.u4',
    title: 'Aile ve sahiplik',
    sections: [
      {
        heading: 'Aile kelimeleri ve cinsiyet',
        body: [
          'Aile kelimeleri cinsiyete göre ayrılır: madre (anne) / padre (baba), sorella (kız kardeş) / fratello (erkek kardeş), nonna (büyükanne) / nonno (büyükbaba). Son harf çoğu zaman cinsiyeti verir: -o eril, -a dişil.',
          'Türkçedeki "kız kardeş", "erkek kardeş" gibi bileşik sözcükler İtalyancada tek kelimedir ve iki ayrı kelime vardır; hangisini kullanacağınıza karşı tarafın cinsiyeti karar verir.',
        ],
        examples: [
          { target: 'Ho una sorella.', tr: 'Bir kız kardeşim var.' },
          { target: 'Ho un fratello.', tr: 'Bir erkek kardeşim var.' },
          { target: 'Mio nonno beve tè.', tr: 'Büyükbabam çay içer.' },
        ],
      },
      {
        heading: 'Ho ... : sahiplik',
        body: [
          'Türkçedeki "-ım var" yapısının İtalyanca karşılığı "avere" (sahip olmak) fiilidir: "Ho una sorella" (bir kız kardeşim var). Fiil kişiye göre çekimlenir: ho (benim var), ha (onun var), abbiamo (bizim var).',
          '"Ho fame" (açım) ve "Ho ottant\'anni" (seksen yaşındayım) gibi kalıplarda da aynı fiil kullanılır; Türkçede "var" ya da sıfat kullanılan yerlerde İtalyanca çoğu zaman "ho" ile başlar.',
        ],
        examples: [
          { target: 'Ho un figlio e una figlia.', tr: 'Bir oğlum ve bir kızım var.' },
          { target: 'Il mio amico ha un bambino.', tr: 'Arkadaşımın bir çocuğu var.' },
          { target: 'Noi abbiamo tre bambini.', tr: 'Bizim üç çocuğumuz var.' },
        ],
      },
      {
        heading: 'İyelik sıfatları: mio, mia',
        body: [
          'Aile üyelerinden önce artikel kullanılmaz: "Mia madre" (annem), "Mio padre" (babam). Aile üyesi değilse artikel gerekir: "Il mio amico" (arkadaşım). Türkçedeki "benim" sözcüğü tek başına yeterlidir ama İtalyancada "il/la" + "mio/mia" ikilisi unutulmamalıdır.',
          '"Amo" (seviyorum) fiilinden sonra belirli nesnelerde artikel kalır: "Amo la mia famiglia" (ailemi seviyorum).',
        ],
        examples: [
          { target: "Mia madre è un'insegnante.", tr: 'Annem bir öğretmen.' },
          { target: 'Amo la mia famiglia.', tr: 'Ailemi seviyorum.' },
          { target: 'La mia famiglia è grande.', tr: 'Ailem büyük.' },
        ],
      },
    ],
  },
  'tr-it.u5': {
    unitId: 'tr-it.u5',
    title: 'Alışveriş: fiyat, renk ve "mi piace"',
    sections: [
      {
        heading: 'Fiyat sormak: quanto costa?',
        body: [
          'Tek bir nesne için "Quanto costa?" (ne kadar?), çoğul nesneler için "Quanto costano?" kullanılır: "Quanto costano le scarpe?" (Ayakkabılar ne kadar?). Fiil, nesnenin tekil ya da çoğul olmasına göre değişir; Türkçede bu ayrım yoktur.',
          '"Caro" (pahalı) ve "economico" (ucuz) sıfatları ismin cinsiyetine uyar: "Questo è molto caro" (bu çok pahalı), "La camicia rossa è cara" (kırmızı gömlek pahalı).',
        ],
        examples: [
          { target: 'Quanto costa questo?', tr: 'Bu ne kadar?' },
          { target: 'Questo è molto caro.', tr: 'Bu çok pahalı.' },
          { target: 'Non ho soldi.', tr: 'Param yok.' },
        ],
      },
      {
        heading: 'Renkler ve sıfat uyumu',
        body: [
          'Renk sıfatları isimden sonra gelir ve cinsiyete uyar: "il vestito blu" (mavi elbise), "la camicia rossa" (kırmızı gömlek). "Blu" gibi bazı renkler her iki cinsiyette de aynı kalır.',
          '"Le scarpe" (ayakkabılar) her zaman çoğuldur; bu yüzden artikel "le", fiil "sono" ve sıfat "grandi" (büyük) çoğul olur: "Le scarpe sono troppo grandi" (Ayakkabılar çok büyük).',
        ],
        examples: [
          { target: 'Mi piace il vestito blu.', tr: 'Mavi elbiseyi beğeniyorum.' },
          { target: 'La camicia rossa è cara.', tr: 'Kırmızı gömlek pahalı.' },
          { target: 'Le scarpe sono troppo grandi.', tr: 'Ayakkabılar çok büyük.' },
        ],
      },
      {
        heading: 'Mi piace: hoşlanmak',
        body: [
          '"Beğeniyorum / seviyorum" demenin yaygın yolu "piacere" fiilidir ve yapı Türkçenin tersine işler: "Mi piace la musica" (müzik hoşuma gidiyor), kelimesi kelimesine "(bana) müzik hoş geliyor". Edat "mi" fiilden önce gelir.',
          'Nesne tekilse "piace", çoğulsa "piacciono" kullanılır: "Mi piace questo vestito" (bu elbiseyi beğeniyorum), "Mi piacciono le scarpe blu" (mavi ayakkabıları beğeniyorum).',
        ],
        examples: [
          { target: 'Mi piace questo vestito.', tr: 'Bu elbiseyi beğeniyorum.' },
          { target: 'Mi piacciono le scarpe blu.', tr: 'Mavi ayakkabıları beğeniyorum.' },
        ],
      },
    ],
  },
  'tr-it.u6': {
    unitId: 'tr-it.u6',
    title: 'İş ve okul: meslekler ve -are fiilleri',
    sections: [
      {
        heading: '-are fiilleri çekimi',
        body: [
          'Türkçedeki "çalışırım, okurum" ekleri yerine İtalyanca fiil köküne kişi eki gelir: lavoro (çalışırım), imparo (öğrenirim), leggo (okurum), scrivo (yazarım), parla (konuşur). Birinci tekil kişi hep -o ile biter; Türkçeden farklı olarak öznenin çekimi zorunlu değildir.',
          '"Lavoro in un ufficio" cümlesinde hem "ofiste çalışırım" hem "ofiste çalışıyorum" anlamı vardır; şimdiki zaman için "sto lavorando" da kullanılabilir ama basit zaman genellikle yeterlidir.',
        ],
        examples: [
          { target: 'Lavoro in un ufficio.', tr: 'Bir ofiste çalışıyorum.' },
          { target: "Imparo l'italiano.", tr: 'İtalyanca öğreniyorum.' },
          { target: 'Leggo un libro.', tr: 'Bir kitap okuyorum.' },
        ],
      },
      {
        heading: 'Mesleklerde artikel yok',
        body: [
          'Meslek söylerken İtalyancada "bir" kullanılmaz: "Mio padre è ingegnere" (babam mühendis), "Io sono dottore" (ben doktorum). Türkçedeki "bir mühendis" ifadesinin karşılığı yalnızca meslek adıdır.',
          'Aile üyesi + meslek birleşiminde iyelik artikelsiz kalır: "Mia madre è un\'insegnante" yerine daha doğal olanı "Mia madre è insegnante".',
        ],
        examples: [
          { target: 'Mio padre è ingegnere.', tr: 'Babam bir mühendis.' },
          { target: "L'insegnante parla italiano.", tr: 'Öğretmen İtalyanca konuşur.' },
        ],
      },
      {
        heading: 'Yer ve nesne edatları',
        body: [
          'Yer bildirirken okul ve ofis farklı edat alır: "a scuola" (okulda) ama "in ufficio" (ofiste), "al computer" (bilgisayar başında). Bu edatları kelimeyle birlikte ezberlemek en kolayıdır.',
          'Çoğul özne "gli studenti" (öğrenciler) erkekler için "gli", fiil de çoğul olur: "Gli studenti leggono a scuola" (Öğrenciler okulda okur).',
        ],
        examples: [
          { target: 'Gli studenti leggono a scuola.', tr: 'Öğrenciler okulda okur.' },
          { target: 'Il computer è in ufficio.', tr: 'Bilgisayar ofiste.' },
        ],
      },
    ],
  },
  'tr-it.u7': {
    unitId: 'tr-it.u7',
    title: 'Hava durumu ve saat',
    sections: [
      {
        heading: 'Hava: fa freddo, fa caldo',
        body: [
          'Sıcak ve soğuk için İtalyancada "fare" (yapmak) fiili kullanılır: "Fa freddo" (hava soğuk, kelimesi kelimesine "soğuk yapar"), "Fa caldo" (hava sıcak). Güneşli ve yağmurlu için "è soleggiato", "è piovoso" denir ve burada "è" kullanılır.',
          '"Il tempo" hem "hava" hem "zaman" demektir; bağlama göre anlaşılır. "Il tempo è caldo oggi" (bugün hava sıcak).',
        ],
        examples: [
          { target: 'Oggi è soleggiato.', tr: 'Bugün hava güneşli.' },
          { target: 'Fa freddo.', tr: 'Hava soğuk.' },
          { target: 'Domani fa freddo.', tr: 'Yarın hava soğuk.' },
        ],
      },
      {
        heading: 'Saat sormak: che ore sono?',
        body: [
          '"Saat kaç?" İtalyancada "Che ore sono?"dır; cevap da hep çoğuldur: "Sono le tre" (saat üç), "Sono le dieci" (saat on). Türkçedeki "saat üç" gibi tekil kullanım yoktur.',
          'Süre bildiren "saat" kelimesi "ora"dır: "un\'ora" (bir saat). "La riunione dura un\'ora" (toplantı bir saat sürer).',
        ],
        examples: [
          { target: 'Che ore sono?', tr: 'Saat kaç?' },
          { target: 'Sono le tre.', tr: 'Saat üç.' },
          { target: "La riunione dura un'ora.", tr: 'Toplantı bir saat sürer.' },
        ],
      },
      {
        heading: 'Günler ve zaman zarfları',
        body: [
          'Gün adları küçük harfle yazılır ve önlerinde artikel olur: "lunedì" (pazartesi), "domenica" (pazar). Tekrarlanan eylemlerde "di" kullanılır: "di domenica" (pazar günleri).',
          '"Oggi" (bugün), "domani" (yarın), "adesso" (şimdi) cümle başına gelir: "Domani è lunedì" (yarın pazartesi). Ayrılırken "A domani!" (yarın görüşürüz) denir.',
        ],
        examples: [
          { target: 'Domani è lunedì.', tr: 'Yarın pazartesi.' },
          { target: 'Lavoro cinque giorni a settimana.', tr: 'Haftada beş gün çalışırım.' },
          { target: 'Domenica fa caldo.', tr: 'Pazar günü hava sıcak.' },
        ],
      },
    ],
  },
  'tr-it.u8': {
    unitId: 'tr-it.u8',
    title: 'Hobiler: mi piace ve oynamak fiilleri',
    sections: [
      {
        heading: 'Mi piace ile hobi anlatmak',
        body: [
          'Hobi sevdiğini söylerken "mi piace" + isim ya da mastar kullanılır: "Mi piace la musica" (müziği severim), "Mi piace ballare" (dans etmeyi severim). Yapı Türkçenin tersinedir; özne cümlenin sonundadır.',
          'Nesne çoğulsa "piacciono" olur: "Mi piacciono i film" (filmleri severim). "Mi piace fare fotografie" (fotoğraf çekmeyi severim) kalıbında eylem "fare" ile kurulur.',
        ],
        examples: [
          { target: 'Mi piace la musica.', tr: 'Müziği severim.' },
          { target: 'Mi piace ballare.', tr: 'Dans etmeyi severim.' },
          { target: 'Mi piace fare fotografie.', tr: 'Fotoğraf çekmeyi severim.' },
        ],
      },
      {
        heading: 'Giocare mı, suonare mı?',
        body: [
          'Spor ve oyunlar "giocare a" ile kurulur: "Gioco a calcio" (futbol oynarım). Enstrümanlar "suonare" fiiliyle ve artikelle söylenir: "Suono la chitarra" (gitar çalarım). Türkçedeki "çalmak/oynamak" ayrımına dikkat!',
          '"Guardare" (izlemek) fiili ekran içindir: "Stasera guardiamo un film" (bu akşam bir film izliyoruz).',
        ],
        examples: [
          { target: 'Gioco a calcio.', tr: 'Futbol oynarım.' },
          { target: 'Suono la chitarra.', tr: 'Gitar çalarım.' },
          { target: 'Il mio amico ama guardare i film.', tr: 'Arkadaşım film izlemeyi sever.' },
        ],
      },
      {
        heading: 'Hobi fiilleri ve hafta sonu',
        body: [
          'Hobi fiilleri -are grubundandır ve birinci tekil -o ile biter: nuoto (yüzerim), corro (koşarım), ballo (dans ederim), cucino (pişiririm), viaggio (seyahat ederim).',
          '"Il fine settimana" (hafta sonu) zaman zarflarıyla başta kullanılır: "Il fine settimana corro nel parco" (hafta sonu parkta koşarım). "Nel parco" kalıbında "nel" = "in + il" birleşimidir.',
        ],
        examples: [
          { target: 'Il fine settimana corro nel parco.', tr: 'Hafta sonu parkta koşarım.' },
          { target: 'Domenica andiamo al parco.', tr: 'Pazar günü parka gidiyoruz.' },
          { target: 'Io nuoto nel mare.', tr: 'Denizde yüzerim.' },
        ],
      },
    ],
  },
};
