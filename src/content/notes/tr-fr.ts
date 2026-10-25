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
          'Türkçede artikel yoktur; Fransızca\'da her neredeyse her ismin önünde le (eril) veya la (dişil) vardır. Ünlüyle başlayan kelimelerde ikisi de kısalır: l\'homme, l\'enfant.',
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
          "Fransızca hava durumu 'il' (o) zamiriyle anlatılır: 'Il fait soleil' (güneşli), 'Il fait froid' (soğuk), 'Il fait chaud' (sıcak). Türkçe 'hava güneşli' derken 'hava' kelimesini kullanırken Fransızca 'il fait + sıfat' kalıbı yeterlidir.",
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
};
