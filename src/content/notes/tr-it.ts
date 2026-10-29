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
          'Türkçedeki "ben öğrenciyim" gibi cümlelerde ek (-im) kullanılır; İtalyancada ise "io sono" (ben ...-im) ve "tu sei" (sen ...-sin) kalıplarıyla ayrı bir fiil kullanılır. Zamir (io, tu) genellikle düşer ama vurgu için kalabilir.',
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
          'Yabancılardan yardım isterken "Scusi" (affedersiniz) ile başlanır; bu resmî hitaptır. "Mi può aiutare?" (Bana yardım edebilir misiniz?) kalıbında "mi" nesne zamiri fiilden önce gelir, Türkçeden farklı olarak soru parçası kullanılmaz.',
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
          '"Beğeniyorum / seviyorum" demenin yaygın yolu "piacere" fiilidir ve yapı Türkçenin tersine işler: "Mi piace la musica" (müzik hoşuma gidiyor), kelimesi kelimesine "(bana) müzik hoş geliyor". Nesne zamiri "mi" fiilden önce gelir.',
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
          'Türkçedeki "çalışırım, okurum" ekleri yerine İtalyanca fiil köküne kişi eki gelir: lavoro (çalışırım), imparo (öğrenirim), leggo (okurum), scrivo (yazarım), parlo (konuşurum). Birinci tekil kişi hep -o ile biter; Türkçeden farklı olarak öznenin çekimi zorunlu değildir.',
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
          'Gün adları küçük harfle yazılır ve artikelsiz kullanılır: "lunedì" (pazartesi), "domenica" (pazar); artikel yalnızca tekrarlanan günlerde eklenir ("il lunedì" = her pazartesi). Tekrarlanan eylemlerde "di" kullanılır: "di domenica" (pazar günleri).',
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
  'tr-it.u9': {
    unitId: 'tr-it.u9',
    title: 'Geçmiş zaman: passato prossimo',
    sections: [
      {
        heading: 'Ho fatto: yardımcı fiil + mastar',
        body: [
          'Geçmiş zamanı anlatmak için "passato prossimo" kullanılır: "ho fatto" (yaptım), "ho visto" (gördüm), "ho dormito" (uyudum). Yapı, "avere" (sahip olmak) fiilinin çekimi + fiilin özel geçmiş hâlidir (fatto, visto, dormito). Türkçedeki "-dı, -di" ekinin karşılığı bu iki parçadır.',
          'Soru ve olumsuzda "hai fatto?" (yaptın mı?), "non ho dormito" (uyumadım) gibi kısa yardımcı fiil öne çıkar: "Cosa hai fatto ieri?" (Dün ne yaptın?).',
        ],
        examples: [
          { target: 'Ieri ho fatto i compiti.', tr: 'Dün ödevimi yaptım.' },
          { target: 'Ieri sera ho visto un film.', tr: 'Dün akşam bir film izledim.' },
          { target: 'Stamattina ho dormito bene.', tr: 'Bu sabah iyi uyudum.' },
        ],
      },
      {
        heading: 'Hareket fiilleri essere ile kurulur',
        body: [
          '"Andare" (gitmek) ve "stare" gibi hareket/hâl fiilleri "avere" değil "essere" (olmak) ile kurulur ve son ek kişiye göre değişir: "sono andato" (erkek için gittim), "sono andata" (kadın için gittim), "è andata" (o gitti - kadın).',
          'Türkçede bu ayrım yoktur; İtalyancada gitmek, gelmek, kalmak gibi fiillerde yardımcı fiil hep "sono" biçimidir.',
        ],
        examples: [
          { target: 'Ieri sono andato al parco.', tr: 'Dün parka gittim.' },
          { target: 'Ieri sera sono andata a letto presto.', tr: 'Dün akşam erken yattım.' },
          { target: 'La festa è stata divertente.', tr: 'Parti eğlenceliydi.' },
        ],
      },
      {
        heading: 'Zaman zarfları: ieri, stamattina, poi',
        body: [
          'Geçmiş cümlelerinde zaman bilgisi başa gelir: "ieri" (dün), "ieri sera" (dün akşam), "stamattina" (bu sabah). "Poi" (sonra) iki eylemi sıralar: "Pranzo e poi esco" (Öğle yemeği yerim ve sonra çıkarım).',
          'Süre bildirmek için "per" kullanılır: "Ho dormito per otto ore" (Sekiz saat uyudum).',
        ],
        examples: [
          { target: 'Ieri sono andato al parco.', tr: 'Dün parka gittim.' },
          { target: 'Pranzo e poi esco.', tr: 'Öğle yemeği yerim ve sonra çıkarım.' },
          { target: 'Ho dormito per otto ore.', tr: 'Sekiz saat uyudum.' },
        ],
      },
    ],
  },
  'tr-it.u10': {
    unitId: 'tr-it.u10',
    title: 'Ev, odalar ve günlük işler',
    sections: [
      {
        heading: 'Ev ve oda kelimeleri',
        body: [
          'Ev "casa", oda "stanza" demektir; özel odaların kendi adları vardır: "cucina" (mutfak), "bagno" (banyo), "camera" (yatak odası), "soggiorno" (oturma odası). "La mia casa" (benim evim) kalıbında iyelikte artikel korunur, çünkü ev aile üyesi değildir.',
          'Sahiplik yine "avere" ile kurulur ve cevap "ha" (vardır) fiilini kullanır: "La casa ha tre stanze" (Evin üç odası var).',
        ],
        examples: [
          { target: 'La mia casa è piccola ma pulita.', tr: 'Evim küçük ama temiz.' },
          { target: 'La casa ha tre stanze.', tr: 'Evin üç odası var.' },
          { target: 'La mia camera ha un balcone.', tr: 'Yatak odamda bir balkon var.' },
        ],
      },
      {
        heading: 'Günlük iş fiilleri: pulire, lavare',
        body: [
          '"Pulire" (temizlemek) ve "lavare" (yıkamak) -ire ve -are fiilleridir; birinci tekil kişi: "pulisco" (temizlerim), "lavo" (yıkarım). Nesne belirliyse artikel gerekir: "lavo i piatti" (bulaşıkları yıkarım), "pulisco la cucina" (mutfağı temizlerim).',
          'Zaman sıklığı sonda gelir: "ogni giorno" (her gün), "ogni settimana" (her hafta), "dopo cena" (akşam yemeğinden sonra).',
        ],
        examples: [
          { target: 'Pulisco la cucina ogni giorno.', tr: 'Her gün mutfağı temizlerim.' },
          { target: 'Lavo i piatti dopo cena.', tr: 'Akşam yemeğinden sonra bulaşıkları yıkarım.' },
          { target: 'Nel soggiorno guardiamo la televisione.', tr: 'Salonda televizyon izliyoruz.' },
        ],
      },
      {
        heading: 'Faccio la doccia gibi kalıplar',
        body: [
          'Bazı günlük işler "fare" (yapmak) fiiliyle kurulur: "faccio la doccia" (duş alırım), "faccio la valigia" (bavul hazırlarım). Türkçedeki "almak" eyleminin karşılığı İtalyancada "fare" + isim kalıbıdır.',
          'Sıfat cinsiyete uyar: temiz ev "la casa è pulita", temiz banyo "il bagno è pulito".',
        ],
        examples: [
          { target: 'La mattina faccio la doccia.', tr: 'Sabah duş alırım.' },
          { target: 'Il bagno è pulito.', tr: 'Banyo temiz.' },
          { target: 'Stasera faccio la valigia.', tr: 'Bu akşam bavul hazırlıyorum.' },
        ],
      },
    ],
  },
  'tr-it.u11': {
    unitId: 'tr-it.u11',
    title: 'Sağlıkta avere fiili ve vücut',
    sections: [
      {
        heading: 'Ho la febbre: hastalık bildirme',
        body: [
          'Hasta olmak İtalyancada "essere" ile değil "avere" ile söylenir: "sono malato" (hastayım) kişinin hâlini, "ho la febbre" (ateşim var) belirtiyi bildirir. Belirtiler hep "ho + artikel + isim" kalıbıyla kurulur: ho mal di testa (baş ağrım var), ho mal di gola (boğazım ağrıyor).',
          'Türkçedeki "-ım var" yapısına benzeyen bu kalıpta isimden önce artikel bulunur: "la febbre", "la medicina".',
        ],
        examples: [
          { target: 'Ho la febbre.', tr: 'Ateşim var.' },
          { target: 'Oggi sono malato.', tr: 'Bugün hastayım.' },
          { target: 'Ho mal di testa.', tr: 'Baş ağrım var.' },
        ],
      },
      {
        heading: 'Mi fa male: ağrı bildirme',
        body: [
          '"Bir yerim ağrıyor" için "mi fa male" (bana ağrı yapar) kalıbı kullanılır ve vücut parçasından önce artikel gelir: "Mi fa male la testa" (Başım ağrıyor). Türkçenin tersine parça cümlenin sonundadır.',
          'Vücut parçalarının cinsiyeti önemlidir: la testa (dişil), il dente (eril), la mano (dişil), il piede (eril), il naso (eril), la gola (dişil).',
        ],
        examples: [
          { target: 'Mi fa male la testa.', tr: 'Başım ağrıyor.' },
          { target: 'Mi fa male un dente.', tr: 'Dişim ağrıyor.' },
          { target: 'Mi fa male il piede.', tr: 'Ayağım ağrıyor.' },
        ],
      },
      {
        heading: 'Ho bisogno di: ihtiyaç bildirme',
        body: [
          '"İhtiyacım var" kalıbı "avere bisogno di"dır: "Ho bisogno di riposo" (Dinlenmeye ihtiyacım var). "Riposo" (dinlenme) isimdir; dinlenmek fiili "riposare"dır: "Devo riposare" (Dinlenmeliyim).',
          'İlaç almak "prendere" (almak) fiiliyle söylenir: "Prendo la medicina" (İlaç alıyorum).',
        ],
        examples: [
          { target: 'Ho bisogno di riposo.', tr: 'Dinlenmeye ihtiyacım var.' },
          { target: 'Prendo la medicina.', tr: 'İlaç alıyorum.' },
          { target: 'Se sei malato, devi riposare.', tr: 'Hastaysan dinlenmelisin.' },
        ],
      },
    ],
  },
  'tr-it.u12': {
    unitId: 'tr-it.u12',
    title: 'Şehirde yer edatları ve yön tarifi',
    sections: [
      {
        heading: 'Yönlerin ilerisi: dritto, girare',
        body: [
          'Yön tarifinde "vai dritto" (düz git), "gira a destra/sinistra" (sağa/sola dön) kalıpları kullanılır. "Girare" fiili -are grubundadır: "gira" (dön), "girare" (dönmek). Kavşak ve köşe için edat birleşir: "all\'incrocio" (kavşakta), "all\'angolo" (köşede).',
          'Emir kipleri "vai" (git) ve "gira" (dön) kısa biçimlerdir; "per" + süre uzaklık bildirir: "per cinque minuti" (beş dakika boyunca).',
        ],
        examples: [
          { target: 'Vai dritto e poi gira a destra.', tr: 'Düz git ve sonra sağa dön.' },
          { target: "Gira a sinistra all'incrocio.", tr: 'Kavşakta sola dön.' },
          { target: 'Vai dritto per cinque minuti.', tr: 'Beş dakika düz git.' },
        ],
      },
      {
        heading: 'Konum edatları: davanti, dietro, tra',
        body: [
          'Üç temel konum edatı vardır: "davanti a" (önünde), "dietro" (arkasında), "tra/fra" (arasında). İsimle birleşirler: "davanti alla scuola" (okulun önünde), "dietro la stazione" (istasyonun arkasında), "tra la scuola e la banca" (okul ile banka arasında).',
          '"Alla" = a + la birleşimidir; "davanti a" + "la scuola" → "davanti alla scuola". Türkçeden farklı olarak iki yön sözcüğü ard arda kullanılmaz, tek edat yeterlidir.',
        ],
        examples: [
          { target: "Davanti alla scuola c'è una banca.", tr: 'Okulun önünde bir banka var.' },
          { target: "L'albergo è dietro la stazione.", tr: 'Otel istasyonun arkasında.' },
          { target: 'Il bar è tra la scuola e la banca.', tr: 'Kafe okul ile banka arasında.' },
        ],
      },
      {
        heading: 'Şehir ulaşımı: fermata, metro, semaforo',
        body: [
          'Otobüs durağı "fermata"dır ve "aspettare" (beklemek) fiiliyle birlikte kullanılır: "Aspetto il bus alla fermata" (Durakta otobüsü bekliyorum). "Prendere" (binmek) kalıbı: "prendo la metro" (metroya binerim).',
          'Trafik ışığı "semaforo"dur; rengi cümleyi belirler: "Il semaforo è rosso" (ışık kırmızı) → aspetta; "è verde" → attraversiamo (karşıya geçiyoruz).',
        ],
        examples: [
          { target: 'Prendo la metro per andare al centro.', tr: 'Merkeze gitmek için metroya binerim.' },
          { target: 'Il semaforo è rosso.', tr: 'Trafik ışığı kırmızı.' },
          { target: 'Attraverso la strada qui.', tr: 'Buradan karşıya geçiyorum.' },
        ],
      },
    ],
  },
  'tr-it.u13': {
    unitId: 'tr-it.u13',
    title: 'Gelecek planları: prossimo ve andare a',
    sections: [
      {
        heading: 'Prossimo: gelecek zaman zarfları',
        body: [
          'Gelecek için İtalyancada "domani" (yarın), "la settimana prossima" (gelecek hafta) gibi zaman zarfları şimdiki zamana eklenir: "Domani parto" (Yarın yola çıkıyorum). "Prossimo" (gelecek/sıradaki) isimden önce gelir ve cinsiyete uyar: "la settimana prossima" (dişil), "il mese prossimo" (eril).',
          'Türkçedeki "-ecek, -acak" ekinin karşılığı çoğu zaman bu zaman zarflarıdır; fiil biçimi değişmez.',
        ],
        examples: [
          { target: 'Domani parto per il mare.', tr: 'Yarın denize doğru yola çıkıyorum.' },
          { target: 'La settimana prossima vado a Roma.', tr: 'Gelecek hafta Roma\'ya gidiyorum.' },
          { target: 'Torno domenica sera.', tr: 'Pazar akşamı dönüyorum.' },
        ],
      },
      {
        heading: 'Andare a + mastar: gitmek üzere olmak',
        body: [
          'Plan bildiren "andare a + mastar" kalıbı çok yaygındır: "Vado a vedere il mare" (Denizi görmeye gidiyorum). Türkçedeki gibi amaç bildirir ve doğrudan mastarla kurulur.',
          'Tatil bağlamında: "vado in vacanza" (tatile gidiyorum), "vado al mare" (denize gidiyorum), "vado in piscina" (havuza gidiyorum). Edat isme göre değişir: al mare (denize), in piscina (havuza).',
        ],
        examples: [
          { target: 'D\'estate vado al mare.', tr: 'Yazın denize giderim.' },
          { target: 'In vacanza vado in piscina.', tr: 'Tatilde havuza giderim.' },
          { target: 'Andiamo insieme al mare.', tr: 'Birlikte denize gidiyoruz.' },
        ],
      },
      {
        heading: 'Tatil fiilleri: partire, tornare, prenotare',
        body: [
          '"Partire" (yola çıkmak) ve "tornare" (dönüş yapmak) "essere" ile kurulur: "sono partito" (yola çıktım), "sono tornata" (döndüm). Git-gel çiftini birlikte ezberlemek kolaydır: "Parto sabato, torno domenica" (Cumartesi çıkarım, pazar dönerim).',
          '"Prenotare" (rezervasyon yapmak) turistik kalıptır: "Prenoto l\'albergo" (Otel rezervasyonu yapıyorum). "Fare la valigia" (bavul hazırlamak) kalıbında yine "fare" kullanılır.',
        ],
        examples: [
          { target: 'Parto domani mattina.', tr: 'Yarın sabah yola çıkıyorum.' },
          { target: 'Stasera faccio la valigia.', tr: 'Bu akşam bavul hazırlıyorum.' },
          { target: "Prenoto l'albergo.", tr: 'Otel rezervasyonu yapıyorum.' },
        ],
      },
    ],
  },
  'tr-it.u14': {
    unitId: 'tr-it.u14',
    title: 'Karşılaştırma: più, meno ve üstünlük',
    sections: [
      {
        heading: 'Più ve meno: daha',
        body: [
          'Karşılaştırma "più" (daha fazla) ve "meno" (daha az) ile kurulur: "più veloce" (daha hızlı), "meno caro" (daha az pahalı). Edat olarak "di" kullanılır: "più alto di me" (benden daha uzun).',
          'Sıfat cinsiyete ve tekil/çoğula uyar: "il treno è più veloce" (tren daha hızlı), "le scarpe sono più grandi" (ayakkabılar daha büyük).',
        ],
        examples: [
          { target: "Il treno è più veloce dell'autobus.", tr: 'Tren otobüsten daha hızlı.' },
          { target: 'Mio padre è più alto di me.', tr: 'Babam benden daha uzun.' },
          { target: 'Questo libro è meno caro.', tr: 'Bu kitap daha az pahalı.' },
        ],
      },
      {
        heading: 'Migliore ve peggiore: düzensiz karşılaştırma',
        body: [
          '"Buono" (iyi) ve "cattivo" (kötü) karşılaştırmada düzensizdir: "migliore" (daha iyi), "peggiore" (daha kötü). "Più buono" denmez; doğal olanı "migliore"dır.',
          'İsim niteleniyorsa artikel alır: "Questo ristorante è migliore" (Bu restoran daha iyi), "la pizza migliore" (en iyi pizza).',
        ],
        examples: [
          { target: 'La pizza qui è migliore.', tr: 'Buradaki pizza daha iyi.' },
          { target: 'Questo film è peggiore.', tr: 'Bu film daha kötü.' },
          { target: 'Per me la metro è migliore.', tr: 'Bence metro daha iyi.' },
        ],
      },
      {
        heading: 'Il più: en üstünlük',
        body: [
          'En üstünlük için "il/la più + sıfat" kullanılır: "il più alto" (en uzun), "la più bella" (en güzel). "Della città" (şehrin), "della classe" (sınıfın) gibi belirtmeler cümleye eklenir.',
          'Kişi zamirleriyle: "Sono il più alto della classe" (Sınıftaki en uzun benim). Türkçedeki "en" ekinin yerini bu kalıp alır.',
        ],
        examples: [
          { target: 'Questo è il più grande.', tr: 'Bu en büyük.' },
          { target: 'Sono il più alto della classe.', tr: 'Sınıftaki en uzun benim.' },
          { target: 'Questa è la pizza migliore della città.', tr: 'Bu şehrin en iyi pizzası.' },
        ],
      },
    ],
  },
  'tr-it.u15': {
    unitId: 'tr-it.u15',
    title: 'Duygu sıfatları ve fikir bildirme',
    sections: [
      {
        heading: 'Essere + duygu sıfatı',
        body: [
          'Duygular "essere" (olmak) fiiliyle kurulur: "sono felice" (mutluyum), "sono triste" (üzgünüm). Sıfat kişiye göre cinsiyet alır: "sono arrabbiato" (erkek), "sono arrabbiata" (kadın).',
          'Neden belirtirken "perché" (çünkü) kullanılır: "Sono felice perché domani parto" (Yarın çıktığım için mutluyum).',
        ],
        examples: [
          { target: 'Oggi sono molto felice.', tr: 'Bugün çok mutluyum.' },
          { target: 'Perché sei triste?', tr: 'Neden üzgünsün?' },
          { target: "Prima dell'esame sono nervoso.", tr: 'Sınavdan önce gerginim.' },
        ],
      },
      {
        heading: 'Kişilik sıfatları ve cinsiyet uyumu',
        body: [
          'Kişilik sıfatları da -o/-a eki alır: "gentile" (kibar - iki cinsiyette de aynı), "timido/timida" (utangaç), "coraggioso/coraggioso" (cesur), "simpatico/simpatica" (sevimli).',
          'Nitelenen kişinin cinsiyetine göre sıfatı seçmek gerekir: "Marco è simpatico" (Marco sevimli), "Anna è simpatica" (Anna sevimli).',
        ],
        examples: [
          { target: 'Sei molto gentile.', tr: 'Çok naziksin.' },
          { target: 'Mia sorella è timida.', tr: 'Kız kardeşim utangaç.' },
          { target: 'Il mio cane è coraggioso.', tr: 'Köpeğim cesur.' },
        ],
      },
      {
        heading: 'Secondo me: fikir bildirme',
        body: [
          'Fikir bildirmenin en yaygın yollarından biri "secondo me" (bence) kalıbıdır; cümle başına gelir: "Secondo me è giusto" (Bence bu doğru). "Che ne pensi?" (Ne düşünüyorsun?) sorusuna bu kalıpla cevap verilir.',
          'Olumsuz duygularda "non" fiilden önce gelir ve duygu sıfatı kalır: "non essere triste" (üzgün olma).',
        ],
        examples: [
          { target: "Secondo me è giusto.", tr: 'Bence bu doğru.' },
          { target: 'Che ne pensi di questo film?', tr: 'Bu film hakkında ne düşünüyorsun?' },
          { target: "Secondo me imparare l'italiano è facile.", tr: 'Bence İtalyanca öğrenmek kolay.' },
        ],
      },
    ],
  },
  'tr-it.u16': {
    unitId: 'tr-it.u16',
    title: 'Kibar istekler: vorrei ve potrebbe',
    sections: [
      {
        heading: 'Vorrei: kibar istek',
        body: [
          '"Vorrei" (isterdim/istiyorum), "voglio" (istiyorum) kelimesinin kibar hâlidir ve restoran, otel gibi yerlerde tercih edilir: "Vorrei un caffè" (Bir kahve istiyorum). Türkçedeki "... istiyorum / ... rica etsem" tonunu verir.',
          'İstek nesnesi belirsizse "un/una" alır: "Vorrei un\'informazione" (Bir bilgi almak istiyorum), "Vorrei un tavolo per due" (İki kişilik masa istiyorum).',
        ],
        examples: [
          { target: 'Vorrei un caffè, per favore.', tr: 'Bir kahve istiyorum, lütfen.' },
          { target: 'Vorrei un tavolo per due.', tr: 'İki kişilik bir masa istiyorum.' },
          { target: "Vorrei un'informazione.", tr: 'Bir bilgi almak istiyorum.' },
        ],
      },
      {
        heading: 'Potrebbe ve potrei: kibar soru',
        body: [
          '"Potrebbe" (edebilir miydiniz/olabilir mi) karşıdakine saygılı soru kurar: "Potrebbe aiutarmi?" (Bana yardım edebilir misiniz?). Kendi talebimiz için "potrei" (ebilir miyim): "Potrei avere il conto?" (Hesabı alabilir miyim?).',
          'Telefonda da aynı kalıplar kullanılır: "Pronto, vorrei parlare con il dottore" (Alo, doktorla görüşmek istiyorum).',
        ],
        examples: [
          { target: 'Potrebbe aiutarmi?', tr: 'Bana yardım edebilir misiniz?' },
          { target: 'Potrei avere il conto?', tr: 'Hesabı alabilir miyim?' },
          { target: 'Potrei usare il telefono?', tr: 'Telefonu kullanabilir miyim?' },
        ],
      },
      {
        heading: 'Resmî karşılıklar: desidera, il posto',
        body: [
          'Garsonlar ve resmî yerler "desidera?" (ister mi?) diye sorar: "Desidera qualcos\'altro?" (Başka bir şey ister mi?). Cevap olarak "il conto" (hesap) ya da "il tavolo" (masa) istenebilir.',
          '"Il posto" (yer) mekân anlamında kullanılır: "C\'è un posto libero?" (Boş yer var mı?). "Occupato" (dolu/meşgul) zıt anlamlısıdır; bekleme için "aspettare" kullanılır: "aspetto cinque minuti" (beş dakika bekliyorum).',
        ],
        examples: [
          { target: "Desidera qualcos'altro?", tr: 'Başka bir şey ister mi?' },
          { target: "C'è un posto libero?", tr: 'Boş yer var mı?' },
          { target: 'Il tavolo è occupato.', tr: 'Masa dolu.' },
        ],
      },
    ],
  },
};
