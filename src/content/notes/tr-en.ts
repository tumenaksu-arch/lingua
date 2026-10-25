import type { CourseNotes } from './types';

/** Grammar notes for Turkish speakers, keyed by unit id. */
export const trEnNotes: CourseNotes = {
  'tr-en.u1': {
    unitId: 'tr-en.u1',
    title: "Selamlaşma ve 'to be'",
    sections: [
      {
        heading: "'to be': am, is, are",
        body: [
          "Türkçede 'ben öğrenciyim' derken fiil ekinden (öğrenci-yim) haberdarız. İngilizcede bu ek yoktur; özneye göre değişen bir 'to be' fiili kullanılır: I am, you are, he/she/it is.",
          "Türkçedeki 'Ben ... -im' yapısını kurarken İngilizcede özne + am/are sırası sabittir, fiil cümlenin sonuna gitmez: 'I am a student'. 'You are my friend' gibi.",
        ],
        examples: [
          { target: 'I am a student.', tr: 'Ben bir öğrenciyim.' },
          { target: 'You are my friend.', tr: 'Sen benim arkadaşımsın.' },
          { target: 'She is my sister.', tr: 'O benim kız kardeşim.' },
        ],
      },
      {
        heading: 'Tanımlıklar: a / the',
        body: [
          "Türkçede 'bir' ve '-ı, -i' ekleri vardır ama İngilizcede bunlar ayrı kelimelerle söylenir: 'bir öğrenci' = a student, belliyse 'the student'. İngilizcede her isimden önce a, an ya da the gerekir; hiçbir şey koymamak yaygın bir hatadır.",
        ],
        examples: [
          { target: 'The woman is a doctor.', tr: 'Kadın bir doktordur.' },
          { target: 'I am a man.', tr: 'Ben bir adamım.' },
        ],
      },
      {
        heading: 'Selamlaşma kalıpları',
        body: [
          "'Good morning' sadece sabah, 'good night' ise vedalaşırken (uyumadan önce) söylenir; 'iyi günler' için 'good afternoon' denir. 'How are you?' soru sorma kalıbıdır, fiil özneden önce gelir.",
        ],
        examples: [
          { target: 'Good morning, how are you?', tr: 'Günaydın, nasılsın?' },
          { target: 'Nice to meet you, Ali.', tr: "Tanıştığımıza memnun oldum, Ali." },
        ],
      },
    ],
  },
  'tr-en.u2': {
    unitId: 'tr-en.u2',
    title: 'Yemekler ve basit fiiller',
    sections: [
      {
        heading: 'Geniş zamanda fiil çekimi',
        body: [
          "Türkçede 'içerim, içersin, içer' aynı kalır; İngilizcede 3. tekil şahısta fiile -s/-es gelir: I drink, she drinks. Bu -s'i unutmak en yaygın hatalardan biridir.",
        ],
        examples: [
          { target: 'I drink water every day.', tr: 'Her gün su içerim.' },
          { target: 'She drinks tea.', tr: 'O çay içer.' },
        ],
      },
      {
        heading: 'Yemek fiilleri: eat ve drink',
        body: [
          "İki temel fiili karıştırmayın: eat (yemek) katı yiyecekler için, drink (içmek) sıvılar için kullanılır. Türkçedeki 'yemek (fiil)' karşılığı her zaman eat'tir.",
        ],
        examples: [
          { target: 'You eat bread.', tr: 'Sen ekmek yersin.' },
          { target: 'I eat fish for dinner.', tr: 'Akşam yemeğinde balık yerim.' },
        ],
      },
      {
        heading: 'Restoranda kullanışlı ifadeler',
        body: [
          "Sipariş verirken nesne + please kalıbı işe yarar: 'Two coffees, please.' Hesap istemek için 'the bill' denir; Türkçedeki gibi tek kelime yeterli değil, the ekini unutmayın.",
        ],
        examples: [
          { target: 'The bill, please.', tr: 'Hesap, lütfen.' },
          { target: 'Is there sugar in the tea?', tr: 'Çayda şeker var mı?' },
        ],
      },
    ],
  },
  'tr-en.u3': {
    unitId: 'tr-en.u3',
    title: 'Seyahatte yön sormak',
    sections: [
      {
        heading: 'Where ile sorular',
        body: [
          "Türkçede 'Otel nerede?' derken soru eki (-de, -mi) kullanılır; İngilizcede soru kelimesi cümlenin başına gelir ve fiil ile yer değiştirir: 'Where is the hotel?'",
        ],
        examples: [
          { target: 'Where is the hotel?', tr: 'Otel nerede?' },
          { target: 'Where is the taxi?', tr: 'Taksi nerede?' },
        ],
      },
      {
        heading: 'Yer bildiren edatlar',
        body: [
          "Türkçede 'yakın, uzak' sıfatlardır ve -DA eki alır ('otelde'). İngilizcede near/far edattır ve isimle birlikte kalır: near the hotel, far from the airport. 'in the car' gibi içinde kalıplarını da not edin.",
        ],
        examples: [
          { target: 'The airport is far from here.', tr: 'Havalimanı buradan uzak.' },
          { target: 'The bus is near the hotel.', tr: 'Otobüs otelin yakınında.' },
          { target: 'My bag is in the car.', tr: 'Çantam arabada.' },
        ],
      },
      {
        heading: 'Yardım isteme',
        body: [
          "'Can you help me?' Türkçedeki '-abilir misiniz?' kalıbının en nazik karşılığıdır. Yabancı biriyle konuşmaya 'Excuse me' ile başlamak kibarlık gösterir.",
        ],
        examples: [
          { target: 'Can you help me?', tr: 'Bana yardım edebilir misiniz?' },
          { target: 'Excuse me, where is the station?', tr: 'Affedersiniz, istasyon nerede?' },
        ],
      },
    ],
  },
  'tr-en.u4': {
    unitId: 'tr-en.u4',
    title: "Aile ve 'have'",
    sections: [
      {
        heading: "'have': sahip olmak",
        body: [
          "Türkçedeki 'var' yapısını İngilizcede have ile kurarsınız: 'Bir kız kardeşim var' = I have a sister. 'My friend has a child' gibi 3. tekil şahısta have → has olur.",
        ],
        examples: [
          { target: 'I have two brothers.', tr: 'İki erkek kardeşim var.' },
          { target: 'My friend has a child.', tr: 'Arkadaşımın bir çocuğu var.' },
        ],
      },
      {
        heading: 'Aile üyeleri',
        body: [
          "İngilizcede kardeş için cinsiyet ayrımı vardır: brother (erkek), sister (kız). Son, daughter, husband, wife gibi kelimeleri de cinsiyete göre seçin; Türkçedeki 'eş' tek kelime, İngilizcede iki ayrı kelimedir.",
        ],
        examples: [
          { target: 'My brother plays football.', tr: 'Erkek kardeşim futbol oynar.' },
          { target: 'His wife is a teacher.', tr: 'Eşi (kadın) öğretmendir.' },
        ],
      },
      {
        heading: "'my': benim / -ım, -im",
        body: [
          "Türkçede iyelik eki isme bitişiktir (annem, arabam). İngilizcede ek yoktur; my, your, his gibi iyelik sözcükleri kullanılır ve isim aynen kalır: my mother, my car.",
        ],
        examples: [
          { target: 'My mother is a teacher.', tr: 'Annem öğretmendir.' },
          { target: 'I love my family.', tr: 'Ailemi seviyorum.' },
        ],
      },
    ],
  },
  'tr-en.u5': {
    unitId: 'tr-en.u5',
    title: 'Alışveriş ve fiyat sormak',
    sections: [
      {
        heading: "'How much' ile fiyat sormak",
        body: [
          "'Ne kadar?' sorusu İngilizcede how much ile kurulur ve fiil öne geçer: 'How much is this?' Çoğul nesnede are kullanın: 'How much are the shoes?'",
        ],
        examples: [
          { target: 'How much is it?', tr: 'Bu ne kadar?' },
          { target: 'How much are the shoes?', tr: 'Ayakkabılar ne kadar?' },
        ],
      },
      {
        heading: 'Sıfatların yeri',
        body: [
          "Türkçede sıfat çoğu zaman isimden sonra gelmez; İngilizcede ise her zaman isimden önce gelir: 'red dress', 'small hotel', 'big family'. 'the blue dress' gibi tanımlık + sıfat + isim sırasını koruyun.",
        ],
        examples: [
          { target: 'The red shirt is expensive.', tr: 'Kırmızı gömlek pahalı.' },
          { target: 'This shirt is too small.', tr: 'Bu gömlek çok küçük.' },
        ],
      },
      {
        heading: "'too' ve 'very'",
        body: [
          "'Çok' kelimesi İngilizcede bağlama göre very (oldukça) ya da too (aşırı, olumsuz anlam) olur. 'Ayakkabılar çok büyük' şikâyetse 'The shoes are too big' dersiniz.",
        ],
        examples: [
          { target: 'The shoes are too big.', tr: 'Ayakkabılar çok büyük.' },
          { target: 'This dress is very expensive.', tr: 'Bu elbise çok pahalı.' },
        ],
      },
    ],
  },
  'tr-en.u6': {
    unitId: 'tr-en.u6',
    title: 'İş ve okul',
    sections: [
      {
        heading: 'Meslek söyleme: a / an',
        body: [
          "Meslekleri söylerken İngilizcede mutlaka a veya an kullanılır: I am a doctor. An, sesli harfle başlayan kelimelerden önce gelir: an engineer. Türkçedeki gibi 'Babam mühendis' demek tek kelimeyle mümkün değildir.",
        ],
        examples: [
          { target: 'My father is an engineer.', tr: 'Babam mühendis.' },
          { target: 'She is a doctor.', tr: 'O doktordur.' },
        ],
      },
      {
        heading: 'Okuma yazma fiilleri',
        body: [
          "Read (okumak) ve write (yazmak) fiillerini karıştırmayın; learn ise 'öğrenmek'tir. 'Ben İngilizce öğreniyorum' = I learn English; dikkat, 'İngilizce okuyorum' değil.",
        ],
        examples: [
          { target: 'I learn English.', tr: 'İngilizce öğreniyorum.' },
          { target: 'I write with a blue pen.', tr: 'Mavi bir kalemle yazarım.' },
        ],
      },
      {
        heading: "'busy' ve 'at/in' edatları",
        body: [
          "Türkçedeki 'meşgul' karşılığı busy'dir ve 'to be' ile birlikte kullanılır: I am busy. 'Ofiste çalışıyorum' için in kullanılır: I work in an office; okul gibi yerlerde de in/at görürsünüz.",
        ],
        examples: [
          { target: 'I work in an office.', tr: 'Bir ofiste çalışıyorum.' },
          { target: 'The doctor is very busy.', tr: 'Doktor çok meşgul.' },
        ],
      },
    ],
  },
  'tr-en.u7': {
    unitId: 'tr-en.u7',
    title: 'Hava ve zaman',
    sections: [
      {
        heading: "Hava için 'it'",
        body: [
          "Türkçede 'Hava güneşli' derken özne bellidir. İngilizcede hava için cansız 'it' kullanılır: It is sunny today. 'It is cold' gibi kalıplarda it'i atlamayın.",
        ],
        examples: [
          { target: 'It is sunny today.', tr: 'Bugün hava güneşli.' },
          { target: 'It is cold in winter.', tr: 'Kışın hava soğuktur.' },
        ],
      },
      {
        heading: 'Günler büyük harfle başlar',
        body: [
          "Türkçede pazartesi küçük harfle yazılır; İngilizcede gün ve ay adları her zaman büyük harfle başlar: Monday, Sunday. Ayrıca 'on Monday' gibi on edatı kullanılır.",
        ],
        examples: [
          { target: 'I work on Monday.', tr: 'Pazartesi çalışırım.' },
          { target: 'We rest on Sunday.', tr: 'Pazar günü dinleniriz.' },
        ],
      },
      {
        heading: 'Saat sormak ve söylemek',
        body: [
          "'Saat kaç?' = What time is it? Tam saatler 'It is three o'clock' biçiminde söylenir; o'clock kısaltması 'of the clock'tan gelir. Süre bildiren 'saat' (hour) ile saat-i gösteren 'saat kaç' (what time) farklıdır.",
        ],
        examples: [
          { target: 'What time is it?', tr: 'Saat kaç?' },
          { target: "It is five o'clock.", tr: 'Saat beş.' },
        ],
      },
    ],
  },
  'tr-en.u8': {
    unitId: 'tr-en.u8',
    title: 'Hobiler ve beğeniler',
    sections: [
      {
        heading: "'like' ile beğeni bildirme",
        body: [
          "'Seviyorum' anlamında like kullanılır ve ardından isim ya da fiilin -ing / to + fiil hali gelir: I like music, I like to dance. Türkçedeki gibi ek kullanılmaz.",
        ],
        examples: [
          { target: 'I like music.', tr: 'Müziği severim.' },
          { target: 'I like to dance.', tr: 'Dans etmeyi severim.' },
        ],
      },
      {
        heading: "'play' ve enstrümanlarda 'the'",
        body: [
          "Spor oynamak için play doğrudan kullanılır: play football. Ama enstrüman çalarken araya the girer: play the guitar. Bu ayrım Türkçede yoktur, ezberleyin.",
        ],
        examples: [
          { target: 'We play football at the weekend.', tr: 'Hafta sonu futbol oynarız.' },
          { target: 'She plays the guitar.', tr: 'O gitar çalar.' },
        ],
      },
      {
        heading: "'at the weekend' gibi kalıplar",
        body: [
          "Türkçede 'hafta sonu' zarf gibidir; İngilizcede at the weekend (Britanya) ya da on the weekend (Amerika) denir. 'Parkta koşarım' gibi cümlelerde in kullanılır: I run in the park.",
        ],
        examples: [
          { target: 'I run in the park at the weekend.', tr: 'Hafta sonu parkta koşarım.' },
          { target: 'I cook at the weekend.', tr: 'Hafta sonu yemek pişiririm.' },
        ],
      },
    ],
  },
  'tr-en.u9': {
    unitId: 'tr-en.u9',
    title: 'Geçmiş zaman',
    sections: [
      {
        heading: 'Simple past: -ed',
        body: [
          "Türkçedeki '-dı, -di' geçmiş ekine karşılık İngilizcede çoğu fiile -ed gelir: visit → visited, watch → watched. 'Dün film izledim' = I watched a movie yesterday; geçmiş zaman belirten dün, geçen hafta gibi zarflar cümlede bulunur.",
        ],
        examples: [
          { target: 'I watched a movie last night.', tr: 'Dün akşam bir film izledim.' },
          { target: 'We stayed at a hotel.', tr: 'Bir otelde kaldık.' },
        ],
      },
      {
        heading: 'Düzensiz fiiller',
        body: [
          "Yaygın fiiller düzensizdir ve kendi geçmiş biçimlerini alır: go → went, see → saw, eat → ate, have → had. 'He went to London' gibi; -ed eki bu fiillere gelmez.",
        ],
        examples: [
          { target: 'He went to London.', tr: 'Londra\'ya gitti.' },
          { target: 'I saw a good movie.', tr: 'İyi bir film gördüm.' },
        ],
      },
      {
        heading: "'did' ile sorular ve 'ago'",
        body: [
          "Geçmiş zaman sorularında did kullanılır ve asıl fiil yalın kalır: 'Did you sleep well?' '-din mi?' sorusunun karşılığı did'dir. '-önce' zaman zarfları için ago kullanılır ve isimden sonra gelir: two days ago.",
        ],
        examples: [
          { target: 'Did you have a good weekend?', tr: 'İyi bir hafta sonu geçirdin mi?' },
          { target: 'We met two days ago.', tr: 'İki gün önce buluştuk.' },
        ],
      },
    ],
  },
  'tr-en.u10': {
    unitId: 'tr-en.u10',
    title: 'Gelecek planları',
    sections: [
      {
        heading: "'going to' ile plan",
        body: [
          "Önceden planlanmış gelecek için 'be going to + fiil' kullanılır: I am going to study English. Türkçedeki '-ecek, -acak' karşılığıdır. Özneye göre am/is/are değişir: She is going to...",
        ],
        examples: [
          { target: 'I am going to Istanbul next week.', tr: "Gelecek hafta İstanbul'a gideceğim." },
          { target: 'She is going to study English.', tr: 'İngilizce çalışacak.' },
        ],
      },
      {
        heading: "'will' ile tahmin ve söz",
        body: [
          "Anlık tahmin ve vaatlerde will kullanılır: It will rain tomorrow. will her özneyle aynı kalır, ek almaz; olumsuzu won't, sorusu Will it...? biçimindedir.",
        ],
        examples: [
          { target: 'It will rain tomorrow.', tr: 'Yarın yağmur yağacak.' },
          { target: 'I will help you.', tr: 'Sana yardım edeceğim.' },
        ],
      },
      {
        heading: 'Şimdiki zamanla gelecek ve davetler',
        body: [
          "Yakın gelecekteki randevular için şimdiki zaman da kullanılır: I am meeting Ali tonight. Nazik davet ve isteklerde ise 'Would you like...?' kalıbı vardır; Türkçedeki 'ister misiniz?'nun kibar halidir.",
        ],
        examples: [
          { target: 'I am meeting the doctor tomorrow.', tr: 'Yarın doktorla randevum var.' },
          { target: 'Would you like some tea?', tr: 'Çay ister misiniz?' },
        ],
      },
    ],
  },
  'tr-en.u11': {
    unitId: 'tr-en.u11',
    title: 'Sağlık',
    sections: [
      {
        heading: "Şikâyet: 'have a' ve 'hurts'",
        body: [
          "Türkçedeki 'ağrım var' iki yolla kurulur: I have a headache (bir ağrım var) ya da My head hurts (başım ağrıyor). 'My head hurts' kalıbında özne vücut parçasıdır ve fiil 3. tekil olur (hurts).",
        ],
        examples: [
          { target: 'My head hurts.', tr: 'Kafam ağrıyor.' },
          { target: 'I have a bad headache.', tr: 'Kötü bir baş ağrım var.' },
        ],
      },
      {
        heading: 'Belirtileri anlatma',
        body: [
          "Ateş, öksürük, grip gibi belirtiler 'have a ile söylenir: I have a fever, I have a bad cough. 'I am sick' ise genel olarak hastayım demektir; Türkçedeki 'hastayım' gibi.",
        ],
        examples: [
          { target: 'I have a high fever.', tr: 'Yüksek ateşim var.' },
          { target: 'He has the flu.', tr: 'Gribi var.' },
        ],
      },
      {
        heading: "'should' ile tavsiye",
        body: [
          "Türkçedeki '-meli, -malı' ekinin karşılığı should + fiil kalıbıdır: You should rest. should her özneyle aynı kalır ve ardından fiilin yalın hali gelir.",
        ],
        examples: [
          { target: 'You should rest.', tr: 'Dinlenmelisin.' },
          { target: 'You should see a doctor.', tr: 'Doktora gitmelisin.' },
        ],
      },
    ],
  },
  'tr-en.u12': {
    unitId: 'tr-en.u12',
    title: 'İş hayatı ve nazik istekler',
    sections: [
      {
        heading: 'Present perfect: have worked',
        body: [
          "Şu ana kadar süren bir deneyimi anlatmak için have/has + fiilin geçmiş ortaçı kullanılır: I have worked here for two years. Türkçedeki 'iki yıldır çalışıyorum' ifadesi buna karşılık gelir; geçmiş zaman (worked) burada olmaz.",
        ],
        examples: [
          { target: 'I have worked at this company for two years.', tr: 'İki yıldır bu şirkette çalışıyorum.' },
          { target: 'I have been a teacher since 2019.', tr: "2019'dan beri öğretmenim." },
        ],
      },
      {
        heading: "'since' ve 'for'",
        body: [
          "Bir başlangıç noktası için since (since 2020, since Monday), bir süre için for (for two years) kullanılır. Türkçedeki '-den beri' since, '-dır, -dir' (süre) for ile karşılanır.",
        ],
        examples: [
          { target: 'I have lived here since 2020.', tr: "2020'den beri burada yaşıyorum." },
          { target: 'I have worked here for two years.', tr: 'İki yıldır burada çalışıyorum.' },
        ],
      },
      {
        heading: "'Could you...?' ve 'would like'",
        body: [
          "Nazik isteklerde 'Could you...?' kullanılır ve ardından fiilin yalın hali gelir: Could you help me? 'İstiyorum' yerine 'I would like...' demek daha kibar ve iş hayatında yaygındır.",
        ],
        examples: [
          { target: 'Could you call me later?', tr: 'Beni daha sonra arayabilir misiniz?' },
          { target: 'I would like to speak to the manager.', tr: 'Müdürle görüşmek istiyorum.' },
        ],
      },
    ],
  },
};
