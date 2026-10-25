import type { CourseNotes } from './types';

/** Ünite notları: Türkçe konuşanlar için Almanca dilbilgisi özetleri (tr-de). */
export const trDeNotes: CourseNotes = {
  'tr-de.u1': {
    unitId: 'tr-de.u1',
    title: "Selamlaşma, artikeller ve 'to be'",
    sections: [
      {
        heading: 'Selamlaşma ve kısa ifadeler',
        body: [
          'Almanca günlük selamlaşmalar çoğu zaman Türkçedeki gibi kısa ve doğrudandır. Hallo yalnızca "merhaba" demektir; "hâllo" diye okunmaz, ağza "halo" gibi gelir. Tschüss gibi yazılan kelimelerde ü/ä/ö seslerine dikkat et: tschüss yaklaşık "çüss" diye okunur.',
          'Bitte çok yönlü bir kelimedir: hem lütfen hem de rica ederim anlamına gelir. Danke schön ise güzel teşekkür demenin kibar biçimidir; tek parça olarak öğren.',
        ],
        examples: [
          { target: 'Hallo, ich bin Ayşe.', tr: 'Merhaba, ben Ayşe.' },
          { target: 'Tschüss, bis morgen!', tr: 'Hoşça kal, yarın görüşürüz!' },
          { target: 'Ein Kaffee, bitte.', tr: 'Bir kahve, lütfen.' },
        ],
      },
      {
        heading: 'Artikeller: der, die, das',
        body: [
          'Türkçede artikel yoktur; Almancada ise her ismin bir cinsiyeti vardır: der (eril), die (dişil), das (nötr). Cinsiyeti tahmin etmeye çalışma; kelimeyi artikeliyle birlikte ezberle: das Wasser, der Kaffee, die Frau.',
          'Önünde ein/a bir olan kelimelerde cinsiyet yine de belirleyicidir: eril der Mann → ein Mann, dişil die Frau → eine Frau. Bu yüzden Mann ve Frau cümlelerinde ein ile eine seçenekleri farklıdır.',
        ],
        examples: [
          { target: 'Der Mann trinkt Tee.', tr: 'Adam çay içiyor.' },
          { target: 'Das Brot ist lecker.', tr: 'Ekmek lezzetli.' },
          { target: 'Die Frau isst Brot.', tr: 'Kadın ekmek yiyor.' },
        ],
      },
      {
        heading: "'to be' fiili: ich bin, du bist",
        body: [
          "Türkçede fiil cümlenin sonuna gider (ben bir adamım); Almancada ise çekimli fiil hemen özneden sonra gelir: ich bin (ben -im), du bist (sen -sin). 'Ben bir adamım' = Ich bin ein Mann demektir; sıra asla Ich ein Mann bin olmaz.",
          'Soru sormak için fiil özneden önceye gelir: Du bist mein Freund → Bist du mein Freund? Bu ünitede ayrıca Nasılsın? sorusuna dikkat: Wie geht es dir? ve kısa hali Wie geht\'s?',
        ],
        examples: [
          { target: 'Ich bin Ayşe.', tr: 'Ben Ayşe\'yim.' },
          { target: 'Du bist mein Freund.', tr: 'Sen benim arkadaşımsın.' },
          { target: "Wie geht's dir?", tr: 'Nasılsın?' },
        ],
      },
    ],
  },
  'tr-de.u2': {
    unitId: 'tr-de.u2',
    title: 'Yemek fiilleri ve artikel değişimi',
    sections: [
      {
        heading: 'essen ve trinken: çekim',
        body: [
          'Türkçede içmek ve yemek fiilleri özneye göre biçim değiştirmez (ben içerim, sen içersin). Almancada fiil her kişide farklıdır: ich trinke, du trinkst, ich esse, du isst. Dikkat: du biçiminde essen → isst olur (e sesi i olur), ama trinken → trinkst.',
          "Fiil her zaman cümlede ikinci sırada gelir. 'Ben su içerim' = Ich trinke Wasser; Türkçedeki gibi nesneyi fiilden önce koyma, suyu sonda söyle.",
        ],
        examples: [
          { target: 'Ich trinke Wasser.', tr: 'Ben su içerim.' },
          { target: 'Du isst Brot.', tr: 'Sen ekmek yersin.' },
          { target: 'Du trinkst Tee.', tr: 'Sen çay içersin.' },
        ],
      },
      {
        heading: 'Bir şey yemek: einen Apfel',
        body: [
          "Türkçede nesnenin belirliliği olmaz: bir elma yerim der geçersin. Almancada belirsiz artikel (ein) nesneye yönelikse değişir: Ich esse einen Apfel. Eril der → einen, dişil die → eine, nötr das → ein olarak kalır.",
          'Olumsuzlamada kein kullanılır: Ich esse keinen Fisch (balık yemem). kein, ein kelimesinin olumsuzu gibidir; Türkçedeki gibi yalnızca hayır demek yetmez.',
        ],
        examples: [
          { target: 'Ich esse einen Apfel.', tr: 'Bir elma yerim.' },
          { target: 'Ich esse keinen Fisch.', tr: 'Balık yemem.' },
          { target: 'Du trinkst Milch.', tr: 'Sen süt içersin.' },
        ],
      },
      {
        heading: 'Restoranda: Rechnung, Speisekarte, Hunger',
        body: [
          "Türkçede aç olmak bir sıfattır (ben açım); Almancada ise Hunger haben (açlık sahibi olmak) kalıbı kullanılır: Ich habe Hunger. Yani aç değilim diyemezsin, açlığım yok dersin.",
          'Restoranda iki kelimeyi karıştırma: die Speisekarte menüdür, die Rechnung ise hesaptır. Hesap istemek için Die Rechnung, bitte dersin; menü için Die Speisekarte, bitte.',
        ],
        examples: [
          { target: 'Ich habe Hunger.', tr: 'Açım.' },
          { target: 'Die Rechnung, bitte.', tr: 'Hesap, lütfen.' },
          { target: 'Der Käse ist lecker.', tr: 'Peynir lezzetli.' },
        ],
      },
    ],
  },
  'tr-de.u3': {
    unitId: 'tr-de.u3',
    title: 'Aile, iyelikler ve haben fiili',
    sections: [
      {
        heading: "Aile sözcükleri ve 'mein'",
        body: [
          "Türkçede iyelik eki isme yapışır (annem, babam); Almancada ayrı bir kelime gelir: mein (benim), dein (senin) / meine. Eril ve nötr isimlerde mein, dişil ve çoğulda meine kullanılır: mein Vater ama meine Mutter.",
          'Aile üyelerinde cinsiyete dikkat: die Mutter (dişil), der Vater (eril), die Schwester (dişil), der Bruder (eril). Artikeliyle birlikte öğren.',
        ],
        examples: [
          { target: 'Meine Mutter kocht gern.', tr: 'Annem yemek pişirmeyi sever.' },
          { target: 'Mein Vater trinkt Kaffee.', tr: 'Babam kahve içer.' },
          { target: 'Meine Familie ist groß.', tr: 'Ailem büyük.' },
        ],
      },
      {
        heading: 'haben: var demenin yolu',
        body: [
          "Türkçede -im var eki ile sahiplik kurarsın (kız kardeşim var). Almancada bunun için haben fiili kullanılır ve fiil ikinci sırada gelir: Ich habe eine Schwester (kız kardeşim var).",
          "haben fiili du ve o kişilerinde düzensizdir: ich habe, du hast, er hat. 'Arkadaşımın bir çocuğu var' = Mein Freund hat ein Kind; burada hat, habe değildir.",
        ],
        examples: [
          { target: 'Ich habe eine Schwester.', tr: 'Bir kız kardeşim var.' },
          { target: 'Mein Freund hat ein Kind.', tr: 'Arkadaşımın bir çocuğu var.' },
          { target: 'Ich habe zwei Brüder.', tr: 'İki erkek kardeşim var.' },
        ],
      },
      {
        heading: 'groß ve klein',
        body: [
          'Türkçede büyük hem boyut hem yaş için kullanılır; Almancada groß ikisini de karşılar ama bağlama göre yorumlanır: Das Haus ist groß (ev büyük), Meine Familie ist groß (aile kalabalık).',
          'Tersi klein küçük demektir: das Kind ist klein (çocuk küçük). Bu iki sıfatı cinsiyet değiştirmeden kullanırsın: der große Bruder gibi ekler daha ileri seviyededir, şimdilik groß/klein yeterli.',
        ],
        examples: [
          { target: 'Das Kind ist klein.', tr: 'Çocuk küçük.' },
          { target: 'Mein Bruder ist groß.', tr: 'Erkek kardeşim büyük (uzun boylu).' },
          { target: 'Ich liebe meine Familie.', tr: 'Ailemi seviyorum.' },
        ],
      },
    ],
  },
  'tr-de.u4': {
    unitId: 'tr-de.u4',
    title: 'Yol sorma ve kibar istekler',
    sections: [
      {
        heading: 'Yol sorma: wo ist…?',
        body: [
          "Soru kelimesi cümlenin başına gelir ve fiil hemen ardından ikinci sırada yer alır: Wo ist das Hotel? (Otel nerede?). Türkçedeki gibi nerede otel diye kelime sırası kurmazsın.",
          'Yön tariflerinde links (sol) ve rechts (sağ) tek başına kullanılır: Das Hotel ist links. Uzaklık için weit (uzak) ve nah (yakın) zıt çiftidir.',
        ],
        examples: [
          { target: 'Wo ist das Hotel?', tr: 'Otel nerede?' },
          { target: 'Der Bahnhof ist weit.', tr: 'İstasyon uzak.' },
          { target: 'Das Hotel ist nah.', tr: 'Otel yakın.' },
        ],
      },
      {
        heading: 'Kibarlık: Entschuldigung ve Sie',
        body: [
          "Entschuldigung hem affedersiniz hem de birinin dikkatini çekmek için kullanılır; yol sormadan önce söylemen kibardır. Türkçedeki 'affedersiniz, nerede' kalıbının birebir karşılığıdır.",
          "Yabancılarla konuşurken du yerine Sie kullanılır ve fiil Sie ile çekimlenir: Können Sie mir helfen? (Bana yardım edebilir misiniz?). Türkçedeki tek bir kibar siz ekinin karşılığı bu ayrı zamirdir.",
        ],
        examples: [
          { target: 'Entschuldigung, wo ist der Bahnhof?', tr: 'Affedersiniz, istasyon nerede?' },
          { target: 'Können Sie mir helfen?', tr: 'Bana yardım edebilir misiniz?' },
          { target: 'Ich brauche Hilfe.', tr: 'Yardıma ihtiyacım var.' },
        ],
      },
      {
        heading: "Kısaltmalar: im, am",
        body: [
          "im = in dem (içinde, -da/-de), am = an dem (yanında, üzerinde) demektir. 'Çantam arabada' = Meine Tasche ist im Auto; Türkçedeki gibi tek bir -de eki yerine in + artikel gerekir.",
          'Trenin geç kalması için spät kullanılır: Der Zug ist spät. Tersi früh (erken) — sp ile başlayan spät kelimesini geç diye, früh ile başlayan früh kelimesini erken diye ezberle.',
        ],
        examples: [
          { target: 'Meine Tasche ist im Auto.', tr: 'Çantam arabada.' },
          { target: 'Der Zug ist spät.', tr: 'Tren geç.' },
          { target: 'Der Flughafen ist weit.', tr: 'Havalimanı uzak.' },
        ],
      },
    ],
  },
  'tr-de.u5': {
    unitId: 'tr-de.u5',
    title: 'Alışveriş: fiyat, olumsuzluk, renkler',
    sections: [
      {
        heading: 'Fiyat sorma: Wie viel kostet das?',
        body: [
          "Tek bir şeyin fiyatını sorarken fiil tekil kalır: Wie viel kostet das? (Bu ne kadar?). Çoğul bir şeyin fiyatını sorarsan fiil çoğullaşır: Wie viel kosten die Schuhe? (Ayakkabılar ne kadar?). fiil ile özne sayısı uymalıdır.",
          'der Preis fiyat demektir; fiyat yüksek (hoch) ya da düşük olur ama bu ünitede fiyatı sormak ve teuer (pahalı) / billig (ucuz) demek yeterli.',
        ],
        examples: [
          { target: 'Wie viel kostet das?', tr: 'Bu ne kadar?' },
          { target: 'Wie viel kosten die Schuhe?', tr: 'Ayakkabılar ne kadar?' },
          { target: 'Das ist sehr teuer.', tr: 'Bu çok pahalı.' },
        ],
      },
      {
        heading: "kein: 'yok' demenin yolu",
        body: [
          "Türkçede yok kelimesi ile olumsuz kurarsın (param yok). Almancada isimleri olumsuzlamak için kein kullanılır: Ich habe kein Geld. kein, ein kelimesinin olumsuzu gibidir; Geld nötr olduğu için kein kalır; belirtme durumundaki eril bir isim olsaydı keinen olurdu.",
          'Ayakkabılar çoğul olduğundan fiil çoğul olur: Die Schuhe sind billig. Türkçedeki ayakkabı ucuz ifadesindeki tekil algıya dikkat; Almancada die Schuhe daima çoğuldur.',
        ],
        examples: [
          { target: 'Ich habe kein Geld.', tr: 'Param yok.' },
          { target: 'Die Schuhe sind billig.', tr: 'Ayakkabılar ucuz.' },
          { target: 'Der Preis ist hoch.', tr: 'Fiyat yüksek.' },
        ],
      },
      {
        heading: 'Renkler ve sıfat ekleri',
        body: [
          "Türkçede renk isme yapışmaz ek alır (mavi elbise); Almancada renk sıfatı artikelden ipucu alır: das blaue Kleid, das rote Hemd. das + sıfat kalıbında sona -e eklenir. çoğul die ile kullanınca -en görürsün: die blauen Schuhe.",
          'mögen hoşlanmak demektir ve fiil ikinci sırada gelir: Ich mag das blaue Kleid. Türkçedeki beğeniyorum fiilini cümle sonuna koyma; Almancada fiil özneden hemen sonra.',
        ],
        examples: [
          { target: 'Ich mag das blaue Kleid.', tr: 'Mavi elbiseyi beğeniyorum.' },
          { target: 'Das rote Hemd ist teuer.', tr: 'Kırmızı gömlek pahalı.' },
          { target: 'Ich mag die blauen Schuhe.', tr: 'Mavi ayakkabıları beğeniyorum.' },
        ],
      },
    ],
  },
  'tr-de.u6': {
    unitId: 'tr-de.u6',
    title: 'İş, okul ve meslekler',
    sections: [
      {
        heading: 'Meslekler artikelsiz söylenir',
        body: [
          "Türkçede babam bir mühendis dersin; Almancada meslek unvanlarından önce bir/ein konmaz: Mein Vater ist Ingenieur. Yani Ich bin ein Arzt yerine Ich bin Arzt doğrudur.",
          'Buna karşılık bir ofiste çalışmak gibi yer bildirimlerinde artikel gerekir: Ich arbeite in einem Büro. Meslek söylerken at, yer söylerken bir kullan.',
        ],
        examples: [
          { target: 'Mein Vater ist Ingenieur.', tr: 'Babam bir mühendis.' },
          { target: 'Ich bin Arzt.', tr: 'Ben doktorum.' },
          { target: 'Ich arbeite in einem Büro.', tr: 'Bir ofiste çalışıyorum.' },
        ],
      },
      {
        heading: 'lesen, schreiben, lernen: karıştırma',
        body: [
          "Türkçede okumak tek kelimedir; Almancada lesen okumak, lernen öğrenmektir — telaffuzu benzer ama anlamı farklı: Ich lerne Deutsch (Almanca öğreniyorum), Ich lese ein Buch (kitap okuyorum).",
          'schreiben yazmak demektir. Üç fiilin ich biçimi düzenlidir: ich lese, ich schreibe, ich lerne; ama du biçiminde lesen → liest olur.',
        ],
        examples: [
          { target: 'Ich lerne Deutsch.', tr: 'Almanca öğreniyorum.' },
          { target: 'Ich lese ein Buch.', tr: 'Bir kitap okuyorum.' },
          { target: 'Ich schreibe einen Brief.', tr: 'Bir mektup yazıyorum.' },
        ],
      },
      {
        heading: 'beschäftigt ve bugün',
        body: [
          "Türkçede meşgul bir sıfattır; Almancada da öyledir ve ich bin ile kullanılır: Ich bin heute beschäftigt (Bugün meşgulüm). Zaman zarfları (heute, jetzt) fiilden hemen sonra veya cümle başında gelir.",
          'die Besprechung toplantı demektir; Ich habe heute eine Besprechung diyerek bugün bir toplantım var demiş olursun.',
        ],
        examples: [
          { target: 'Ich bin heute beschäftigt.', tr: 'Bugün meşgulüm.' },
          { target: 'Ich habe heute eine Besprechung.', tr: 'Bugün bir toplantım var.' },
          { target: 'Der Lehrer spricht Deutsch.', tr: 'Öğretmen Almanca konuşuyor.' },
        ],
      },
    ],
  },
  'tr-de.u7': {
    unitId: 'tr-de.u7',
    title: 'Hava, günler ve saat',
    sections: [
      {
        heading: "Hava için 'es': Es ist kalt",
        body: [
          "Türkçede hava soğuk dersin ve özne belli olur; Almancada havayı gösteren sahte bir özne kullanılır: Es ist kalt (hava soğuk). 'Es ist' kalıbı hava ve genel durumlar için standarttır.",
          'Hava durumu sıfatları doğrudan es ist ile kullanılır: es ist sonnig (güneşli), es ist regnerisch (yağmurlu), es ist heiß (sıcak). Das Wetter kelimesini özne yaparak da kurabilirsin: Das Wetter ist gut.',
        ],
        examples: [
          { target: 'Es ist heute sonnig.', tr: 'Bugün hava güneşli.' },
          { target: 'Es ist kalt.', tr: 'Hava soğuk.' },
          { target: 'Im Sommer ist es heiß.', tr: 'Yazın hava sıcaktır.' },
        ],
      },
      {
        heading: 'Günler ve hafta',
        body: [
          'Almanca gün adları büyük harfle yazılır ve Türkçeden farklı olarak önlerinde bir kelime olmadan kullanılır: Heute ist Montag (Bugün pazartesi). Türkçedeki gün eki (- günü) yoktur; am Sonntag (pazar günü) gibi an ile kurulur.',
          "die Woche haftadır: Die Woche hat sieben Tage. 'Yarın pazartesi' demek için Morgen ist Montag dersin; morgen hem yarın hem sabah demek olabilir ama bu kalıpta yarın anlamındadır.",
        ],
        examples: [
          { target: 'Heute ist Montag.', tr: 'Bugün pazartesi.' },
          { target: 'Morgen ist Montag.', tr: 'Yarın pazartesi.' },
          { target: 'Bis morgen!', tr: 'Yarın görüşürüz!' },
        ],
      },
      {
        heading: 'Saat: Uhr mu Stunde mi?',
        body: [
          "Türkçede saat hem kadranı hem süreyi gösterir; Almancada ikiye ayrılır: die Uhr saat/kadran demektir ('Saat kaç?' = Wie spät ist es?); die Stunde ise süre birimidir (bir saat boyunca). 'Saat kaç?' = Wie spät ist es?; 'Saat üç' = Es ist drei Uhr.",
          'Bir toplantının süresi için Stunde kullanılır: Die Besprechung dauert eine Stunde. Saati sorarken Wie spät, süreyi sorarken Wie lange dersin.',
        ],
        examples: [
          { target: 'Wie spät ist es?', tr: 'Saat kaç?' },
          { target: 'Es ist drei Uhr.', tr: 'Saat üç.' },
          { target: 'Die Besprechung dauert eine Stunde.', tr: 'Toplantı bir saat sürüyor.' },
        ],
      },
    ],
  },
  'tr-de.u8': {
    unitId: 'tr-de.u8',
    title: 'Hobiler, gern ve cümle sırası',
    sections: [
      {
        heading: "spielen ve 'gern'",
        body: [
          "Türkçede severim eki fiile yapışır (dans etmeyi severim); Almancada gern zarfi fiilden sonra gelir: Ich tanze gern (dans etmeyi severim). gern, fiilin yanında severek yapıldığını söyler.",
          "spielen hem oynamak hem çalmaktır: Ich spiele Fußball (futbol oynarım), Ich spiele Gitarre (gitar çalarım). Enstrüman adları artikelsiz de kullanılabilir: Ich spiele Gitarre ya da Ich spiele die Gitarre.",
        ],
        examples: [
          { target: 'Ich spiele Fußball.', tr: 'Futbol oynarım.' },
          { target: 'Ich tanze gern.', tr: 'Dans etmeyi severim.' },
          { target: 'Ich spiele Gitarre.', tr: 'Gitar çalarım.' },
        ],
      },
      {
        heading: "am Wochenende: zaman başta, özne fiilden sonra",
        body: [
          "Türkçede hafta sonu parkta koşarım dersin; Almancada zaman bildiren ifade cümleyi açarsa fiil yine ikinci sırada kalır ve özne fiilin arkasına geçer: Am Wochenende laufe ich im Park. Sıra asla Am Wochenende ich laufe... olamaz.",
          'am Wochenende hafta sonu demektir (am = an dem kısaltması). Zaman öbeği cümle başındaysa bu ters sıra zorunludur; cümle Ich laufe am Wochenende im Park diye de kurulabilir, o zaman özne başta kalır.',
        ],
        examples: [
          { target: 'Am Wochenende laufe ich im Park.', tr: 'Hafta sonu parkta koşarım.' },
          { target: 'Am Wochenende koche ich.', tr: 'Hafta sonu yemek pişiririm.' },
          { target: 'Am Wochenende spiele ich Gitarre.', tr: 'Hafta sonu gitar çalarım.' },
        ],
      },
      {
        heading: 'mögen, sehen ve hobi fiilleri',
        body: [
          'mögen hoşlanmak demektir: Ich mag Musik (Müzik severim / müziği severim). Cümlenin öznesi ich ise fiil ikinci sırada olur; Türkçedeki gibi nesneyi özneden hemen sonra koyman gerekmez, Ich mag Musik yeterlidir.',
          "Film izlemek için sehen fiili kullanılır: Mein Freund sieht gern Filme (Arkadaşım film izlemeyi sever). reisen seyahat etmek, schwimmen yüzmek, laufen koşmak — bu fiillerin ich biçimi fiil köküyle aynı kalır: ich reise, ich schwimme, ich laufe.",
        ],
        examples: [
          { target: 'Ich mag Musik.', tr: 'Müziği severim.' },
          { target: 'Mein Freund sieht gern Filme.', tr: 'Arkadaşım film izlemeyi sever.' },
          { target: 'Wir reisen nach Berlin.', tr: 'Berlin\'e seyahat ediyoruz.' },
        ],
      },
    ],
  },
};
