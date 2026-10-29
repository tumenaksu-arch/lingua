import type { CourseNotes } from './types';

/** Türkçe → Fransızca ünite notları (yol haritası madde 1). */
export const trFrNotes: CourseNotes = {
  'tr-fr.u1': {
    unitId: 'tr-fr.u1',
    title: "Selamlaşma, 'être' fiili ve artikeller",
    sections: [
      {
        heading: 'Selamlaşma ve kibarlık kalıpları',
        body: [
          "Fransızca 'bonjour' hem 'merhaba' hem 'günaydın' demektir; 'au revoir' ise yalnızca vedalaşırken kullanılır. Türkçede 'günaydın' sabaha özgüyken Fransızca'da 'bonjour' gün boyunca işler.",
          "'Merci' teşekkürler, 's'il vous plaît' ise lütfen demektir. 'S'il vous plaît' kelimesi kelimesine 'lütfen ederseniz' anlamındadır ve kibar isteklerin sonuna eklenir.",
        ],
        examples: [
          { target: 'Bonjour, madame.', tr: 'Merhaba, hanımefendi.' },
          { target: "Un café, s'il vous plaît.", tr: 'Bir kahve, lütfen.' },
        ],
      },
      {
        heading: "'Je suis', 'tu es': 'to be' fiili",
        body: [
          "Türkçe 'ben ...-im' tek kelimeyle söylenir; Fransızca'da zamir (je, tu) ve fiil (suis, es) ayrı kelimelerdir. 'Je' küçük harfle yazılır, cümle başında bile.",
          "'Je suis' = 'ben ...-im', 'tu es' = 'sen ...-sin'. Fiil özneden hemen sonra gelir ve özne değişince fiil de değişir: je suis ama tu es.",
        ],
        examples: [
          { target: 'Je suis une femme.', tr: 'Ben bir kadınım.' },
          { target: 'Tu es mon ami.', tr: 'Sen benim arkadaşımsın.' },
        ],
      },
      {
        heading: "Kelimelerin önündeki küçük parçacıklar: le, la, l', un, une",
        body: [
          'Türkçede artikel yoktur; Fransızca\'da neredeyse her ismin önünde le (eril) veya la (dişil) vardır. Ünlüyle başlayan kelimelerde ikisi de kısalır: l\'homme, l\'enfant.',
          "'Un' eril 'bir', 'une' dişil 'bir' demektir. Cinsiyet genelde kelimenin sonundan anlaşılmaz, bu yüzden artikeliyle birlikte ezberlemek en iyisidir.",
        ],
        examples: [
          { target: "L'homme boit du café.", tr: 'Adam kahve içiyor.' },
          { target: "C'est un ami.", tr: 'Bu bir arkadaş.' },
        ],
      },
    ],
  },
  'tr-fr.u2': {
    unitId: 'tr-fr.u2',
    title: "Yemek fiilleri ve 'du' partitifi",
    sections: [
      {
        heading: "'Manger' ve 'boire' çekimi",
        body: [
          "Fransızca fiiller özneye göre değişir: je mange (yerim), tu manges (sen yersin), je bois (içerim), tu bois (sen içersin). Türkçe 'yerim/yersin' tek fiil köküyle hallederken Fransızca'da son ek değişir.",
          "'Manger' ve 'boire' en sık kullanılan iki fiildir; özneleri 'je' ve 'tu' olarak bu ünitede çalışılır.",
        ],
        examples: [
          { target: 'Je mange une pomme.', tr: 'Bir elma yerim.' },
          { target: 'Tu bois du lait.', tr: 'Süt içersin.' },
        ],
      },
      {
        heading: "'Du' ve 'de l': sayılamayan yiyecekler",
        body: [
          "Sayılamayan yiyeceklerin önünde Fransızca 'du' veya 'de l'' kullanılır: du pain (biraz ekmek), de l'eau (biraz su). Türkçe 'ekmek yerim' derken hiçbir parçacık kullanılmaz, bu yaygın bir karışıklık kaynağıdır.",
          "Sayılabilenler 'un/une' alır: une pomme (bir elma). Kural basit: tek tek sayabiliyorsan un/une, sayamıyorsan du/de l'.",
        ],
        examples: [
          { target: "Je bois de l'eau.", tr: 'Su içerim.' },
          { target: 'Tu manges du pain.', tr: 'Ekmek yersin.' },
        ],
      },
      {
        heading: "'J'ai faim' ve 'il y a' kalıpları",
        body: [
          "Fransızca 'açım' = 'J'ai faim', yani kelimesi kelimesine 'açlığım var'. Duygular 'avoir' (sahip olmak) fiiliyle kurulur; 'je ai' ünlü çakışması yüzünden kısaltılıp 'j'ai' olur.",
          "'Il y a' = 'var': 'Il y a du sucre dans le thé' (Çayda şeker var). Bu kalıp Türkçe 'var/yok' ile birebir örtüşür.",
        ],
        examples: [
          { target: "J'ai faim.", tr: 'Açım.' },
          { target: 'Il y a du sucre dans le thé.', tr: 'Çayda şeker var.' },
        ],
      },
    ],
  },
  'tr-fr.u3': {
    unitId: 'tr-fr.u3',
    title: "'Avoir' fiili ve aile",
    sections: [
      {
        heading: "'Avoir': sahip olmak fiili ve çekimi",
        body: [
          "'Avoir' fiili Türkçe 'var' ile karşılanır: 'Bir kız kardeşim var' = 'J'ai une sœur'. Çekimi önemlidir: j'ai (ben ...-im var), tu as (sen ...-in var), il/elle a (onun ... var), nous avons (biz ...-iz var).",
          "'Avoir' ve 'être' karıştırılmamalıdır: 'var' kavramı her zaman 'avoir' ile kurulur, 'être' (-mek/-im) ile değil.",
        ],
        examples: [
          { target: "J'ai une sœur.", tr: 'Bir kız kardeşim var.' },
          { target: 'Mon ami a un enfant.', tr: 'Arkadaşımın bir çocuğu var.' },
        ],
      },
      {
        heading: "'Mon' ve 'ma': iyelik sıfatları",
        body: [
          "Türkçe 'babam', 'annem' gibi tek kelimeler Fransızca'da iki kelimeye açılır: mon père (benim babam), ma mère (benim annem). 'Mon' eril, 'ma' dişil isimlerle kullanılır.",
          "'Famille' dişildir: ma famille = ailem. 'Frère' erildir: mon frère = erkek kardeşim. Artikelsiz kullanılırlar çünkü iyelik zaten belli eder.",
        ],
        examples: [
          { target: 'Mon père est grand.', tr: 'Babam uzun boylu.' },
          { target: 'Ma mère boit du thé.', tr: 'Annem çay içer.' },
        ],
      },
      {
        heading: 'Cinsiyet uyumu: grand / grande',
        body: [
          "Fransızca sıfatlar niteledikleri ismin cinsiyetine ve sayısına uyar. 'Grand' (büyük/uzun) erilde 'grand', dişilde 'grande' olur; 'petit' ise 'petite'.",
          "'Ma famille est grande' = 'Ailem büyük'; 'aile' dişil olduğu için 'grande'. Türkçe'de böyle bir uyum yoktur, bu yüzden sıfat biçimine dikkat et.",
        ],
        examples: [
          { target: 'Ma famille est grande.', tr: 'Ailem büyük.' },
          { target: "L'enfant est petit.", tr: 'Çocuk küçük.' },
        ],
      },
    ],
  },
  'tr-fr.u4': {
    unitId: 'tr-fr.u4',
    title: 'Yol sorma ve yönler',
    sections: [
      {
        heading: "'Où est ... ?': yer sorma",
        body: [
          "'Où' = nerede (üzerindeki aksan önemli, yazarken atma). Fransızca soruda Türkçe gibi özneyi öne alıp sonda sorma yoktur: 'Où est l'hôtel ?' kelime sırasıyla 'nerededir otel?' demektir.",
          "Soru cümlelerinde Fransızca, yazılı dilde soru işareti öncesi boşluk kullanır: 'Où est le taxi ?'",
        ],
        examples: [
          { target: "Où est l'hôtel ?", tr: 'Otel nerede?' },
          { target: "Où est l'aéroport ?", tr: 'Havalimanı nerede?' },
        ],
      },
      {
        heading: "Yön ve uzaklık: 'à droite', 'près de', 'loin'",
        body: [
          "Yönler 'à' edatıyla birlikte kullanılır: à gauche (solda), à droite (sağda). 'Droite' ve 'gauche' sık karıştırılır; 'La gare est à droite' (İstasyon sağda).",
          "'Près de' = yakınında, 'loin' = uzak. Fransızca 'otel yakın' derken bile fiil gerekir: 'L'hôtel est proche'; Türkçe gibi fiilsiz cümle kurulmaz.",
        ],
        examples: [
          { target: "L'hôtel est proche.", tr: 'Otel yakın.' },
          { target: "L'aéroport est loin.", tr: 'Havalimanı uzak.' },
        ],
      },
      {
        heading: "'En retard' ve seyahat deyimleri",
        body: [
          "'En retard' = geç (kalmış). 'Le train est en retard' (Tren gecikti). Tek başına 'tard' geç anlamına gelir ama bu kalıpta 'en retard' birlikte kullanılır.",
          "'Voici' = işte/buyurun (gösterirken): 'Voici mon passeport' (İşte pasaportum). 'Excusez-moi' dikkat çekmek için kibar bir giriştir.",
        ],
        examples: [
          { target: 'Le train est en retard.', tr: 'Tren gecikti.' },
          { target: 'Voici mon passeport.', tr: 'İşte pasaportum.' },
        ],
      },
    ],
  },
  'tr-fr.u5': {
    unitId: 'tr-fr.u5',
    title: 'Alışveriş kalıpları ve cinsiyet uyumu',
    sections: [
      {
        heading: "Fiyat sorma: 'combien' ve 'c'est'",
        body: [
          "'Combien ça coûte ?' veya 'C'est combien ?' = 'Bu ne kadar?'. 'Combien' fiyat ve miktar sorusudur.",
          "'C'est' = 'bu ...-dır' ve günlük dilde çok kullanılır: 'C'est très cher' (Bu çok pahalı), 'C'est pas cher' (Pahalı değil/Ucuz).",
        ],
        examples: [
          { target: 'Combien ça coûte ?', tr: 'Bu ne kadar?' },
          { target: "C'est très cher.", tr: 'Bu çok pahalı.' },
        ],
      },
      {
        heading: "Olumsuzluk: 'ne ... pas'",
        body: [
          "Fransızca olumsuz cümle 'ne' ve 'pas' arasında kurulur: 'Je n'ai pas d'argent' (Param yok). 'Je' ile 'ne' kısalır: 'je n'ai'.",
          "'Pas cher' = ucuz, kelimesi kelimesine 'pahalı değil'. 'Cher' pahalı, 'le prix' fiyat, 'l'argent' para demektir.",
        ],
        examples: [
          { target: "Je n'ai pas d'argent.", tr: 'Param yok.' },
          { target: "Ce n'est pas cher.", tr: 'Pahalı değil.' },
        ],
      },
      {
        heading: "Renklerde cinsiyet uyumu: bleu / bleue / bleues",
        body: [
          "Renk sıfatları Fransızca'da isimden sonra gelir: 'la robe bleue' (mavi elbise), 'la chemise rouge' (kırmızı gömlek). Türkçe'nin tersine sıfat önce gelmez.",
          "Sıfat cinsiyete ve sayıya uyar: 'bleue' dişil, 'bleues' dişil çoğul, 'chères' dişil çoğul pahalı. 'J'aime les chaussures bleues' (Mavi ayakkabıları severim).",
        ],
        examples: [
          { target: "J'aime la robe bleue.", tr: 'Mavi elbiseyi severim.' },
          { target: 'La chemise rouge est chère.', tr: 'Kırmızı gömlek pahalı.' },
        ],
      },
    ],
  },
  'tr-fr.u6': {
    unitId: 'tr-fr.u6',
    title: 'Fiiller, meslekler ve yer edatları',
    sections: [
      {
        heading: "-er fiilleri: 'travailler', 'acheter'",
        body: [
          "Fransızca en düzenli fiil grubu '-er' ile biter: travailler (çalışmak), acheter (satın almak). Birinci tekil kişi '-e' alır: je travaille (çalışıyorum), j'achète (alıyorum).",
          "'J'achète' yazılırken 'è' aksanına dikkat; telaffuzda da 'ete' gibi okunur.",
        ],
        examples: [
          { target: 'Je travaille dans un bureau.', tr: 'Bir ofiste çalışıyorum.' },
          { target: "J'achète une chemise.", tr: 'Bir gömlek alıyorum.' },
        ],
      },
      {
        heading: "Meslek söyleme: 'être' + meslek, artikelsiz",
        body: [
          "Meslek veya statü söylerken Fransızca 'un/une' kullanmaz: 'Mon père est ingénieur' (Babam mühendis). Türkçe 'bir mühendis' demezsin, Fransızca da demez.",
          "'Je suis docteur', 'Je suis professeur' kalıpları da böyledir; ancak 'ben bir öğrenciyim' gibi genel tanımlarda 'un/une' kullanılabilir.",
        ],
        examples: [
          { target: 'Mon père est ingénieur.', tr: 'Babam mühendis.' },
          { target: "Je travaille à l'école.", tr: 'Okulda çalışıyorum.' },
        ],
      },
      {
        heading: "Yer edatları: 'à', 'dans', 'sur'",
        body: [
          "'À' (bir yerde/-e) ve 'dans' (içinde) Türkçe'nin tek '-de' ekinin işini görür: 'à l'école' (okulda), 'dans un bureau' (bir ofiste).",
          "'Sur' = üzerinde: 'L'ordinateur est sur le bureau' (Bilgisayar masanın üzerinde). Yer edatları Türkçe'den farklı olarak ayrı kelimelerdir ve isimle birleşmez.",
        ],
        examples: [
          { target: "L'ordinateur est dans le bureau.", tr: 'Bilgisayar ofiste.' },
          { target: "J'apprends le français à l'école.", tr: 'Okulda Fransızca öğreniyorum.' },
        ],
      },
    ],
  },
  'tr-fr.u7': {
    unitId: 'tr-fr.u7',
    title: 'Hava, günler ve saat',
    sections: [
      {
        heading: "Hava için 'il' kullanılır",
        body: [
          "Fransızca hava durumu 'il' (o) zamiriyle anlatılır: 'Il fait soleil' (güneşli), 'Il fait froid' (soğuk), 'Il fait chaud' (sıcak). Türkçe 'hava güneşli' derken 'hava' kelimesi kullanılır; Fransızca'da 'il fait + sıfat' kalıbı yeterlidir.",
          "'Il pleut' = yağmur yağıyor; tek başına bir fiildir, 'il fait pleut' denmez.",
        ],
        examples: [
          { target: "Il fait soleil aujourd'hui.", tr: 'Bugün hava güneşli.' },
          { target: 'Il fait froid en hiver.', tr: 'Kışın hava soğuk olur.' },
        ],
      },
      {
        heading: "Günler ve 'la semaine'",
        body: [
          "Gün adları Fransızca'da küçük harfle yazılır: lundi (pazartesi), dimanche (pazar). Türkçe'de günler büyük harfle başlar, bu fark yazarken önemlidir.",
          "'La semaine' = hafta; 'Je travaille cinq jours par semaine' (Haftada beş gün çalışıyorum) kalıbında 'par' = 'başına' anlamı verir.",
        ],
        examples: [
          { target: "Demain c'est lundi.", tr: 'Yarın pazartesi.' },
          { target: 'Je travaille cinq jours par semaine.', tr: 'Haftada beş gün çalışıyorum.' },
        ],
      },
      {
        heading: "Saat sorma: 'Quelle heure est-il ?'",
        body: [
          "Saat sormanın kalıbı 'Quelle heure est-il ?' (kelimesi kelimesine 'hangi saattir-o?') ve cevap 'Il est ... heures' ile verilir: 'Il est trois heures' (Saat üç).",
          "Soruda 'est-il' dizilişi dikkat çekicidir: fiil (est) özneden (il) önce gelir, bu Fransızca yazılı soruların işaretidir.",
        ],
        examples: [
          { target: 'Quelle heure est-il ?', tr: 'Saat kaç?' },
          { target: 'Il est dix heures.', tr: 'Saat on.' },
        ],
      },
    ],
  },
  'tr-fr.u8': {
    unitId: 'tr-fr.u8',
    title: "Hobiler ve 'aimer + fiil'",
    sections: [
      {
        heading: "'Aimer' + fiil: sevmek",
        body: [
          "'Aimer' fiilinden sonra fiil sözlük biçiminde gelir: 'J'aime danser' (Dans etmeyi severim), 'J'aime nager' (Yüzmeyi severim). Türkçe '-meyi' eki Fransızca'da yoktur, fiil doğrudan eklenir.",
          "'J'aime' yazılırken 'je' ünlü çakışması yüzünden kısalır. Olumsuzu 'Je n'aime pas' biçimindedir.",
        ],
        examples: [
          { target: "J'aime danser.", tr: 'Dans etmeyi severim.' },
          { target: "Mon ami aime regarder des films.", tr: 'Arkadaşım film izlemeyi sever.' },
        ],
      },
      {
        heading: "'Jouer à' ve 'jouer de': spor mu, enstrüman mı?",
        body: [
          "Spor oynamak 'jouer à' ile kurulur: 'Je joue au football' (Futbol oynarım). 'Au', 'à + le' birleşimidir.",
          "Enstrüman çalmak 'jouer de' ile kurulur: 'Je joue de la guitare' (Gitar çalarım). Ayrımı ezberle: spor 'à', enstrüman 'de'.",
        ],
        examples: [
          { target: 'Je joue au football.', tr: 'Futbol oynarım.' },
          { target: 'Je joue de la guitare le week-end.', tr: 'Hafta sonu gitar çalarım.' },
        ],
      },
      {
        heading: "Hafta sonu ve düzenli etkinlikler",
        body: [
          "'Le week-end' = hafta sonu; Fransızca'ya İngilizce'den giren bir kelimedir ve 'le' artikeliyle kullanılır.",
          "Zaman zarfları cümle başında veya sonunda yer alır: 'Le week-end je nage' (Hafta sonu yüzerim), 'Je cours le matin' (Sabah koşarım). Türkçe gibi fiile bitişik bir ek yoktur.",
        ],
        examples: [
          { target: 'Le week-end je nage.', tr: 'Hafta sonu yüzerim.' },
          { target: 'Je cuisine le week-end.', tr: 'Hafta sonu yemek pişiririm.' },
        ],
      },
    ],
  },
  'tr-fr.u9': {
    unitId: 'tr-fr.u9',
    title: "Geçmiş zaman: passé composé",
    sections: [
      {
        heading: "Passé composé: geçmişi 'avoir' ile kur",
        body: [
          "Türkçede 'dün yaptım' demek için fiile geçmiş ekini getirirsin; Fransızca'da ise cümle iki parçadan kurulur: avoir (j'ai, tu as, il a, nous avons) + fiilin geçmiş ortaç biçimi. 'Dün ev ödevimi yaptım' = Hier j'ai fait mes devoirs.",
          "Ortaç çoğu fiilde köke -é/-i eklenerek yapılır: regarder → regardé, finir → fini. Bu ortaç tek başına kullanılmaz, mutlaka j'ai / tu as gibi bir parçacık ister.",
        ],
        examples: [
          { target: "Hier j'ai fait mes devoirs.", tr: 'Dün ev ödevimi yaptım.' },
          { target: "J'ai regardé un film.", tr: 'Bir film izledim.' },
          { target: "Qu'est-ce que tu as fait hier ?", tr: 'Dün ne yaptın?' },
        ],
      },
      {
        heading: 'Sık kullanılan düzensiz ortaçlar',
        body: [
          "Bazı fiillerin ortacı düzensizdir ve fiille birlikte ezberlenir: faire → fait (yapmak), voir → vu (görmek), prendre → pris (almak), dormir → dormi (uyumak), lire → lu (okumak), boire → bu (içmek).",
          "'J'ai pris un café' = 'kahve aldım/içtim'. Türkçe'de 'kahve içtim' denirken Fransızca'da yiyecek ve içecek için 'prendre' (almak) fiili çok kullanılır.",
        ],
        examples: [
          { target: "J'ai vu un film.", tr: 'Bir film gördüm (izledim).' },
          { target: "J'ai pris un café ce matin.", tr: 'Bu sabah kahve içtim.' },
          { target: "Elle a lu un livre.", tr: 'Bir kitap okudu.' },
        ],
      },
      {
        heading: "Soru ve olumsuz: 'Qu'est-ce que' ve 'ne ... pas'",
        body: [
          "Geçmişte 'ne yaptın?' sorusu 'Qu'est-ce que tu as fait ?' biçimindedir; 'qu'est-ce que' kalıbı nesne sorularında kullanılır. Kelime sırası değişmez: qu'est-ce que + özne + avoir.",
          "Olumsuzda 'ne ... pas' ortacın önüne gelir: 'Je n'ai pas dormi' (Uyumadım). 'Ne' ünlüden önce kısalır: 'je n'ai pas'.",
        ],
        examples: [
          { target: "Qu'est-ce que tu as fait hier ?", tr: 'Dün ne yaptın?' },
          { target: "Je n'ai pas bien dormi.", tr: 'İyi uyuyamadım.' },
          { target: "Nous avons mangé ensemble.", tr: 'Birlikte yedik.' },
        ],
      },
    ],
  },
  'tr-fr.u10': {
    unitId: 'tr-fr.u10',
    title: "Ev, eşyalar ve 'faire' kalıpları",
    sections: [
      {
        heading: 'Ev ve odalar: cinsiyetleriyle ezberle',
        body: [
          "Türkçe 'evinde' tek kelimeyle söylenir; Fransızca'da ev eşyalarının cinsiyeti vardır: la maison (ev), la chambre (oda), la cuisine (mutfak), la table (masa) dişil; le lit (yatak) erildir. Artikeliyle birlikte ezberlemek en güvenlisidir.",
          "'Benim evim' gibi iyelikler için 'ma maison' denir; Türkçe'deki '-ım' eki Fransızca'da ayrı bir kelimeyle karşılanır.",
        ],
        examples: [
          { target: 'Ma maison est grande.', tr: 'Evim büyük.' },
          { target: 'Ma chambre est propre.', tr: 'Odam temiz.' },
          { target: 'Je dors dans mon lit.', tr: 'Yatağımda uyurum.' },
        ],
      },
      {
        heading: "'Faire' kalıpları: ev işleri",
        body: [
          "Fransızca'da ev işleri 'faire' (yapmak) fiiliyle kurulur: faire le ménage (evi temizlemek), faire la vaisselle (bulaşık yıkamak). Türkçe 'temizlik yaparım' der gibi düşün; 'faire' + ev işi kalıbı sabittir.",
          "'Laver' (yıkamak) fiili de benzer şekilde kullanılır: laver le linge (çamaşır yıkamak). 'Ranger' ise toplamak/düzenlemek demektir: ranger sa chambre (odasını toplamak).",
        ],
        examples: [
          { target: 'Le samedi je fais le ménage.', tr: 'Cumartesi evi temizlerim.' },
          { target: 'Je fais la vaisselle tous les jours.', tr: 'Her gün bulaşık yıkarım.' },
          { target: 'Ma mère lave le linge.', tr: 'Annem çamaşır yıkar.' },
        ],
      },
      {
        heading: "'Propre' ve 'sale': temiz mi kirli mi?",
        body: [
          "'Propre' temiz, 'sale' kirli demektir. 'La maison est propre' (Ev temiz). 'Propre' kelimesini İngilizce 'proper' ile karıştırma; Fransızca'da anlamı 'temiz'tir.",
          "Sıfat cinsiyete uyar: 'les chambres ne sont pas propres' (Odalar temiz değil) — 'chambres' dişil çoğul olduğu için 'propres' dişil çoğul alır ve fiil de 'sont' olur.",
        ],
        examples: [
          { target: 'La cuisine est propre.', tr: 'Mutfak temiz.' },
          { target: 'Les chambres ne sont pas propres.', tr: 'Odalar temiz değil.' },
          { target: 'Ta chambre est propre ou sale ?', tr: 'Odan temiz mi kirli mi?' },
        ],
      },
    ],
  },
  'tr-fr.u11': {
    unitId: 'tr-fr.u11',
    title: "Sağlık: 'avoir mal à' kalıbı",
    sections: [
      {
        heading: "'Avoir mal à': ağrıyor demek",
        body: [
          "Fransızca 'başım ağrıyor' için 'j'ai mal à la tête' denir; kelimesi kelimesine 'başta ağrım var'. 'Avoir' fiiliyle kurulur ve beden parçasının artikeli 'à' edatına uyum sağlar.",
          "'à la' dişillerle (à la tête), 'au' (= à + le) erillerle (au ventre), 'aux' (= à + les) çoğullarla (aux dents) kullanılır. Hangi artikel gerektiğini kelimeyi öğrenirken ezberle.",
        ],
        examples: [
          { target: "J'ai mal à la tête.", tr: 'Başım ağrıyor.' },
          { target: "J'ai mal au ventre.", tr: 'Karnım ağrıyor.' },
          { target: "Elle a mal aux dents.", tr: 'Dişleri ağrıyor.' },
        ],
      },
      {
        heading: 'Hastalık ve şikâyet sözcükleri',
        body: [
          "'Être malade' hasta olmak demektir; 'avoir un rhume' (nezle/soğuk algınlığı olmak) ve 'avoir de la fièvre' (ateşi olmak) 'avoir' ile kurulur. 'J'ai un gros rhume' (Fena halde üşütmüşüm).",
          "Şikâyetler: 'tousser' öksürmek, 'je tousse beaucoup' çok öksürüyorum. Doktora gitmek 'aller chez le médecin' — 'chez' + kişi, '...nın yanına' demektir.",
        ],
        examples: [
          { target: "J'ai un gros rhume.", tr: 'Fena halde nezle oldum.' },
          { target: 'Il tousse beaucoup la nuit.', tr: 'Geceleri çok öksürüyor.' },
          { target: 'Je vais chez le médecin demain.', tr: 'Yarın doktora gideceğim.' },
        ],
      },
      {
        heading: "Tavsiye ve iyileşme: 'devoir', 'se reposer', 'aller mieux'",
        body: [
          "'Tu dois te reposer' (Dinlenmelisin) — 'devoir' zorunluluk bildirir ve ardından fiil sözlük biçiminde gelir. 'Se reposer' dinlenmek demektir; 'se' ile başlayan fiillerin kişiye göre biçimi değişir: je me repose, tu te reposes.",
          "İyileşmek için 'aller mieux' (daha iyi olmak) kalıbı kullanılır: 'Je vais mieux' (Daha iyiyim). İlaç 'prendre' fiiliyle alınır: 'prendre un médicament' (ilaç almak).",
        ],
        examples: [
          { target: 'Tu dois te reposer.', tr: 'Dinlenmelisin.' },
          { target: "Aujourd'hui je vais mieux.", tr: 'Bugün daha iyiyim.' },
          { target: 'Je prends un médicament.', tr: 'İlaç alıyorum.' },
        ],
      },
    ],
  },
  'tr-fr.u12': {
    unitId: 'tr-fr.u12',
    title: 'Yol tarifi: emir kipi ve yer edatları',
    sections: [
      {
        heading: "Emir kipi: 'Tournez', 'Allez', 'Traversez'",
        body: [
          "Yol tarifinde fiiller emir kipinde kullanılır: allez (gidin), tournez (dönün), traversez (karşıya geçin), continuez (devam edin). '-ez' eki 'siz' anlamındaki emri verir ve fiil cümle başında kalır.",
          "Türkçe 'dümdüz git' derken fiil başta; Fransızca'da da öyle: 'Allez tout droit'. 'Tout droit' dümdüz demektir ve cümle sonunda da durabilir.",
        ],
        examples: [
          { target: 'Allez tout droit.', tr: 'Dümdüz gidin.' },
          { target: 'Tournez à gauche au coin.', tr: 'Köşeden sola dönün.' },
          { target: 'Traversez la rue.', tr: 'Sokağı karşıdan karşıya geçin.' },
        ],
      },
      {
        heading: "'Jusqu'à': -e kadar",
        body: [
          "'Jusqu'à' yere kadar anlamı verir: 'marchez jusqu'au pont' (köprüye kadar yürüyün). 'Au', 'à + le' birleşimidir; 'jusqu'au' yazılırken 'à' düşer.",
          "'Continuer jusqu'au bout de la rue' (Sokağın sonuna kadar devam edin) — 'le bout' son/uç demektir ve 'de la rue' ile 'sokağın' anlamı tamamlanır.",
        ],
        examples: [
          { target: "Marchez jusqu'au pont.", tr: 'Köprüye kadar yürüyün.' },
          { target: "Continuez jusqu'au bout de la rue.", tr: 'Sokağın sonuna kadar devam edin.' },
          { target: "Allez jusqu'au coin, puis à droite.", tr: 'Köşeye kadar gidin, sonra sağa.' },
        ],
      },
      {
        heading: 'Toplu taşıma ve duraklar',
        body: [
          "'Prendre le métro' metroya binmek demektir; 'prendre + araç' kalıbı sabittir. İnmek için 'descendre': 'Je descends à la station République' (République istasyonunda iniyorum).",
          "'L'arrêt' otobüs durağı, 'la station' metro/tren istasyonudur. 'C'est loin d'ici ?' (Buradan uzak mı?) sorusuna 'Non, pas loin' (Hayır, uzak değil) diye yanıt verilir; 'd'ici' buradan demektir.",
        ],
        examples: [
          { target: 'Je prends le métro tous les jours.', tr: 'Her gün metroya binerim.' },
          { target: "Descendez à l'arrêt numéro trois.", tr: 'Üç numaralı durakta inin.' },
          { target: "C'est loin d'ici ? — Non, pas loin.", tr: 'Buradan uzak mı? — Hayır, uzak değil.' },
        ],
      },
    ],
  },
  'tr-fr.u13': {
    unitId: 'tr-fr.u13',
    title: 'Gelecek zaman: futur proche',
    sections: [
      {
        heading: "'Aller + fiil': gelecek planları",
        body: [
          "Günlük dilde gelecek için en yaygın yapı 'aller' (gitmek) fiili + fiilin sözlük biçimidir: 'je vais partir' (yola çıkacağım / çıkıyorum), 'nous allons voyager' (seyahat edeceğiz). Türkçe '-ecek' ekinin karşılığı bu iki kelimelik yapıdır.",
          "'Aller' cümlede çekimlenir, ikinci fiil olduğu gibi kalır: je vais, tu vas, il va, nous allons, vous allez, ils vont. 'Je vais aller à la mer' (Denize gideceğim) — 'aller' iki kez üst üste gelebilir, doğrudur.",
        ],
        examples: [
          { target: 'Je vais aller à la mer cet été.', tr: 'Bu yaz denize gideceğim.' },
          { target: 'Nous allons réserver un hôtel.', tr: 'Bir otel ayırtacağız.' },
          { target: 'Je pars demain.', tr: 'Yarın yola çıkıyorum.' },
        ],
      },
      {
        heading: 'Zaman ifadeleri: cet été, le mois prochain, bientôt',
        body: [
          "'Cet été' bu yaz demektir; 'été' eril olduğu için 'ce' kısalır ve 'cet' olur. 'Le mois prochain' gelecek ay, 'la semaine prochaine' gelecek hafta — 'prochain' (sıradaki/gelecek) isimden sonra gelir.",
          "'Bientôt' yakında demektir ve cümle sonunda yer alır: 'Je pars bientôt' (Yakında çıkıyorum). 'Demain' yarın, 'le week-end prochain' ise gelecek hafta sonu demektir.",
        ],
        examples: [
          { target: 'Cet été je vais voyager.', tr: 'Bu yaz seyahat edeceğim.' },
          { target: 'Le mois prochain nous allons en France.', tr: 'Gelecek ay Fransa\'ya gideceğiz.' },
          { target: 'Bientôt ce sont les vacances.', tr: 'Yakında tatil başlıyor.' },
        ],
      },
      {
        heading: "Tatil kelimeleri ve 'réserver'",
        body: [
          "'Les vacances' tatil demektir ve Fransızca'da çoğul olarak kullanılır; 'les vacances commencent' (tatil başlar). 'La plage' plaj, 'la mer' deniz, 'le pays' ülke demektir.",
          "Otel veya masa ayırtmak 'réserver' fiiliyle söylenir: 'réserver une chambre' (oda ayırtmak), 'réserver une table' (masa ayırtmak). 'J'ai réservé' geçmişi 'ayırtmışım' demektir.",
        ],
        examples: [
          { target: 'Je vais réserver une chambre.', tr: 'Oda ayırtacağım.' },
          { target: "J'ai réservé une table pour ce soir.", tr: 'Bu akşam için masa ayırttım.' },
          { target: 'Les vacances commencent en juillet.', tr: 'Tatil temmuzda başlıyor.' },
        ],
      },
    ],
  },
  'tr-fr.u14': {
    unitId: 'tr-fr.u14',
    title: "Karşılaştırma: 'plus ... que' ve üstünlük",
    sections: [
      {
        heading: "'Plus / moins ... que': daha fazla / daha az",
        body: [
          "Karşılaştırma 'plus' (daha fazla) veya 'moins' (daha az) + sıfat + 'que' (-den) ile kurulur: 'le train est plus rapide que le bus' (tren otobüsten daha hızlı). Türkçe '-den' ekinin karşılığı 'que'dir.",
          "'Plus ... que' ile 'moins ... que' zıt anlamlıdır; hangisini kullandığına dikkat et: 'moins cher' daha ucuz, 'plus cher' daha pahalı.",
        ],
        examples: [
          { target: 'Le train est plus rapide que le bus.', tr: 'Tren otobüsten daha hızlıdır.' },
          { target: 'Cette robe est moins chère.', tr: 'Bu elbise daha ucuz.' },
          { target: "Le français est plus facile que l'allemand.", tr: 'Fransızca Almancadan daha kolaydır.' },
        ],
      },
      {
        heading: "'Aussi ... que' ve 'le meilleur / le pire'",
        body: [
          "Eşitlik 'aussi ... que' ile kurulur: 'aussi grand que' (kadar büyük). Üstünlük ve aşırı üstünlük: 'le plus rapide' (en hızlı), 'le moins cher' (en ucuz).",
          "'Meilleur' (daha iyi/en iyi) ve 'pire' (daha kötü/en kötü) sık kullanılan düzensiz karşılaştırmalardır: 'cette pizza est la meilleure' (bu pizza en iyisi). Cinsiyete uyar: 'meilleure' dişil, 'meilleures' dişil çoğul.",
        ],
        examples: [
          { target: 'Cette pizza est la meilleure.', tr: 'Bu pizza en iyisi.' },
          { target: 'Ce temps est le pire.', tr: 'Bu hava en kötüsü.' },
          { target: 'Le bus est le moins rapide de tous.', tr: 'Otobüs hepsinin en yavaşıdır.' },
        ],
      },
      {
        heading: 'Karşılaştırma sıfatlarında uyum',
        body: [
          "Karşılaştırma sıfatları da niteledikleri isme uyar: 'ma sœur est plus grande' (kız kardeşim daha uzun) — 'sœur' dişil olduğu için 'grande'. Eril olsaydı 'grand' kalırdı.",
          "'Mieux' (daha iyi, zarf) fiillerle kullanılır: 'ma mère cuisine mieux que moi' (Annem benden daha iyi yemek pişirir). 'Mieux' ile 'meilleur' farklıdır: ilki zarftır, ikincisi sıfattır.",
        ],
        examples: [
          { target: 'Ma sœur est plus grande que moi.', tr: 'Kız kardeşim benden daha uzun.' },
          { target: 'Ma mère cuisine mieux que moi.', tr: 'Annem benden daha iyi yemek pişirir.' },
          { target: 'Le bleu est la meilleure couleur.', tr: 'Mavi en iyi renktir.' },
        ],
      },
    ],
  },
  'tr-fr.u15': {
    unitId: 'tr-fr.u15',
    title: "Duygular, kişilik ve 'penser que'",
    sections: [
      {
        heading: "'Être' + duygu sıfatları",
        body: [
          "Duygular 'être' fiiliyle kurulur: 'je suis content' (mutluyum), 'elle est triste' (üzgün), 'je suis fatigué' (yorgunum). Türkçe gibi tek kelime değil, 'zamir + être + sıfat' üçlüsüdür.",
          "Sıfat cinsiyete uyar: eril 'content', dişil 'contente'; 'fatigué' → 'fatiguée'. 'Marie est contente' (Marie mutlu) — özne dişilse sıfat da dişil olur.",
        ],
        examples: [
          { target: "Aujourd'hui je suis très content.", tr: 'Bugün çok mutluyum.' },
          { target: 'Ma sœur est triste parce que son chat est malade.', tr: 'Kız kardeşim üzgün çünkü kedisi hasta.' },
          { target: 'Après le sport, je suis fatigué.', tr: 'Spor sonrası yorgunum.' },
        ],
      },
      {
        heading: 'Kişilik sıfatları: drôle, timide, curieux, gentil',
        body: [
          "Kişilik anlatmak için yaygın sıfatlar: 'drôle' komik, 'timide' utangaç, 'curieux' meraklı, 'gentil' kibar/iyi kalpli. 'Comment est ton professeur ?' (Öğretmenin nasıl biri?) sorusuyla kullanılır.",
          "'Gentil' dişil ve çoğulda 'gentille / gentils / gentilles' olur: 'mon grand-père est très gentil' (Büyükbabam çok kibar).",
        ],
        examples: [
          { target: 'Mon professeur est drôle.', tr: 'Öğretmenim komik.' },
          { target: 'Ma sœur est timide mais très gentille.', tr: 'Kız kardeşim utangaç ama çok iyi kalpli.' },
          { target: 'Les enfants sont curieux.', tr: 'Çocuklar meraklıdır.' },
        ],
      },
      {
        heading: "Fikir bildirme: 'penser / croire / trouver que'",
        body: [
          "'Je pense que' (bence/düşünüyorum ki), 'je crois que' (sanıyorum ki) ve 'je trouve que' (bana göre) fikir bildirir ve ardından 'que' + tam cümle gelir: 'je pense que le français est facile'.",
          "Katılmak için 'être d'accord' (aynı fikirde olmak) kullanılır: 'je suis d'accord' (katılıyorum). 'À mon avis' (benim görüşüme göre) cümle başında gelir: 'à mon avis, le bleu est plus joli'.",
        ],
        examples: [
          { target: "Je pense que le français est facile.", tr: 'Bence Fransızca kolay.' },
          { target: "Je ne suis pas d'accord.", tr: 'Katılmıyorum.' },
          { target: 'À mon avis, le métro est mieux.', tr: 'Bence metro daha iyi.' },
        ],
      },
    ],
  },
  'tr-fr.u16': {
    unitId: 'tr-fr.u16',
    title: "Kibar istekler: 'je voudrais' ve 'vous pourriez'",
    sections: [
      {
        heading: "'Je voudrais' / 'j'aimerais': kibar istek",
        body: [
          "Restoranda, dükkânda ve resmî yerlerde 'je veux' (istiyorum) kaba kaçar; bunun yerine 'je voudrais' (isterdim) veya 'j'aimerais' (çok isterdim) kullanılır: 'je voudrais un café' (Bir kahve alırdım / lütfen bir kahve).",
          "'Je voudrais' ve 'j'aimerais' isteği yumuşatır ama anlam aynıdır; ardından isim veya fiil gelebilir: 'je voudrais commander' (sipariş vermek istiyorum). 'S'il vous plaît' ile bitirmek daha da kibarlaştırır.",
        ],
        examples: [
          { target: "Je voudrais un café, s'il vous plaît.", tr: 'Bir kahve alırdım, lütfen.' },
          { target: "J'aimerais une table pour deux.", tr: 'İki kişilik bir masa istiyorum.' },
          { target: 'Je voudrais commander.', tr: 'Sipariş vermek istiyorum.' },
        ],
      },
      {
        heading: "'Vous pourriez ... ?': kibar soru",
        body: [
          "Birinden bir şey yapmasını kibarca rica etmek için 'vous pourriez' (yapabilir misiniz?) kullanılır: 'vous pourriez répéter, s'il vous plaît ?' (Lütfen tekrar edebilir misiniz?). 'Pourriez' fiili 'pouvoir' fiilinin kibar biçimidir.",
          "'Pouvoir' yetenek ve izin bildirir: 'je peux parler français' (Fransızca konuşabilirim). 'Est-ce que je peux parler à Madame Martin ?' (Madame Martin'le konuşabilir miyim?) telefonda yaygın bir kalıptır.",
        ],
        examples: [
          { target: "Pourriez-vous répéter, s'il vous plaît ?", tr: 'Lütfen tekrar edebilir misiniz?' },
          { target: 'Pourriez-vous parler plus lentement ?', tr: 'Daha yavaş konuşabilir misiniz?' },
          { target: "Est-ce que je peux parler à Madame Martin ?", tr: 'Madame Martin ile konuşabilir miyim?' },
        ],
      },
      {
        heading: "Telefonda ve restoranda kalıplar",
        body: [
          "Telefonda 'allô' (alo) ile başlanır. Karşıdaki yoksa 'il n'est pas là' (burada değil) denir ve 'je vais rappeler' (geri arayacağım) kalıbı kullanılır; 'la ligne est occupée' hat meşgul demektir.",
          "Restoranda 'le menu' menü, 'la réservation' rezervasyon, 'le rendez-vous' randevu demektir. 'On sert le dîner à huit heures' (Akşam yemeği sekizde servis edilir) — 'servir' servis etmek, 'on' ise belirsiz öznedir ve Türkçe'deki '-lır/-ilir'e benzer.",
        ],
        examples: [
          { target: 'La ligne est occupée, je vais rappeler plus tard.', tr: 'Hat meşgul, daha sonra geri arayacağım.' },
          { target: "J'ai réservé une table pour quatre personnes.", tr: 'Dört kişilik masa ayırttım.' },
          { target: "J'ai rendez-vous chez le médecin.", tr: 'Doktorda randevum var.' },
        ],
      },
    ],
  },
};
