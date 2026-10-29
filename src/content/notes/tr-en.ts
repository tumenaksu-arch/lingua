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
          "'Saat kaç?' = What time is it? Tam saatler 'It is three o'clock' biçiminde söylenir; o'clock kısaltması 'of the clock'tan gelir. Süre bildiren 'saat' (hour) ile saati gösteren 'saat kaç' (what time) farklıdır.",
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
          "Ateş, öksürük, grip gibi belirtiler 'have a' ile söylenir: I have a fever, I have a bad cough. 'I am sick' ise genel olarak hastayım demektir; Türkçedeki 'hastayım' gibi.",
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
  'tr-en.u13': {
    unitId: 'tr-en.u13',
    title: 'Geçmiş zaman: günlük rutin',
    sections: [
      {
        heading: "'didn't' ile olumsuz ve 'did' ile sorular",
        body: [
          "Geçmiş zamanda olumsuz cümle 'did not' (kısaca didn't) ile kurulur ve asıl fiil yalın kalır: I didn't watch TV. Sorular 'Did you...?' biçimindedir ve fiil yine yalındır: Did you sleep well? 'What did you do?' kalıbında da fiil do biçiminde yalın kalır.",
        ],
        examples: [
          { target: "I didn't watch TV last night.", tr: 'Dün gece televizyon izlemedim.' },
          { target: 'What did you do yesterday?', tr: 'Dün ne yaptın?' },
        ],
      },
      {
        heading: 'Yeni düzensiz fiiller',
        body: [
          "buy → bought (satın aldı), come → came (geldi), take → took (aldı/götürdü), make → made (yaptı), spend → spent (harcadı/geçirdi). Bu fiillere -ed gelmez; geçmiş biçimleri ezberlenir.",
        ],
        examples: [
          { target: 'We bought bread this morning.', tr: 'Bu sabah ekmek aldık.' },
          { target: 'She made a cake for my birthday.', tr: 'Doğum günüm için pasta yaptı.' },
        ],
      },
      {
        heading: "'got up' ve 'woke up'",
        body: [
          "Türkçedeki 'kalkmak (yataktan)' için get up, 'uyanmak' için wake up kullanılır; ikisi de geçmişte düzensizdir: got up, woke up. 'I woke up at seven' = saat yedide uyandım.",
        ],
        examples: [
          { target: 'I got up late yesterday.', tr: 'Dün geç kalktım.' },
          { target: 'I woke up at seven.', tr: 'Saat yedide uyandım.' },
        ],
      },
    ],
  },
  'tr-en.u14': {
    unitId: 'tr-en.u14',
    title: 'Ev ve ev işleri',
    sections: [
      {
        heading: "Ev işleri için 'do' ve 'wash'",
        body: [
          "Türkçedeki 'çamaşır yıkamak, bulaşık yıkamak' kalıpları İngilizcede do ve wash fiilleriyle kurulur: do the laundry, wash the dishes. 'the' ekini unutmayın; chores ve housework ev işlerinin bütününü anlatır.",
        ],
        examples: [
          { target: 'She does the laundry on Saturdays.', tr: 'Cumartesi günleri çamaşır yıkar.' },
          { target: 'He helps with the housework.', tr: 'Ev işlerine yardım eder.' },
        ],
      },
      {
        heading: "'want you to' ile istek",
        body: [
          "Birinden bir şey yapmasını istemek için 'I want you to + fiil' kalıbı kullanılır: I want you to tidy your room. Türkçedeki '-manı istiyorum' ekinin karşılığıdır ve kişi değiştiğinde you da değişir.",
        ],
        examples: [
          { target: 'I want you to tidy your room.', tr: 'Odanı toplamanı istiyorum.' },
          { target: 'We share the chores at home.', tr: 'Evde ev işlerini paylaşırız.' },
        ],
      },
      {
        heading: 'Yer bildiren edatlar: behind, next to, between',
        body: [
          "'Arkasında' behind, 'bitişiğinde' next to, 'arasında' between kelimeleriyle söylenir. Between her zaman iki şey arasında anlamı verir ve and ile birlikte kullanılır: between the bank and the pharmacy.",
        ],
        examples: [
          { target: 'The garden is behind the house.', tr: 'Bahçe evin arkasında.' },
          { target: 'The post office is between the bank and the pharmacy.', tr: 'Postane banka ile eczanenin arasında.' },
        ],
      },
    ],
  },
  'tr-en.u15': {
    unitId: 'tr-en.u15',
    title: 'Doktorda ve hastanede',
    sections: [
      {
        heading: "Şikâyet: 'What is the matter?'",
        body: [
          "Doktor 'Neyiniz var?' demek için 'What is the matter?' sorusunu sorar; hasta da 'I do not feel well' (kendimi iyi hissetmiyorum) diyerek başlar. 'the matter' kalıbı bir bütün olarak ezberlenmelidir.",
        ],
        examples: [
          { target: 'What is the matter?', tr: 'Neyiniz var?' },
          { target: 'I do not feel well.', tr: 'Kendimi iyi hissetmiyorum.' },
        ],
      },
      {
        heading: "Belirtiler: 'a sore throat', 'dizzy'",
        body: [
          "'Boğazım ağrıyor' I have a sore throat kalıbıyla söylenir; sore (ağrılı) sıfatı throat'dan önce gelir. 'Başım dönüyor' ise I feel dizzy demektir ve feel fiili duygu/his bildirirken to be ile birlikte kullanılır.",
        ],
        examples: [
          { target: 'I have a sore throat.', tr: 'Boğazım ağrıyor.' },
          { target: 'I feel dizzy.', tr: 'Başım dönüyor.' },
        ],
      },
      {
        heading: "Muayenede: 'take one's temperature' ve check-up",
        body: [
          "Ateş ölçmek 'take someone's temperature' kalıbıdır: The nurse took my temperature. Düzenli sağlık kontrolü ise check-up'dır ve 'I have a check-up every year' gibi söylenir.",
        ],
        examples: [
          { target: 'The nurse took my temperature.', tr: 'Hemşire ateşimi ölçtü.' },
          { target: 'I have a check-up every year.', tr: 'Her yıl kontrole giderim.' },
        ],
      },
    ],
  },
  'tr-en.u16': {
    unitId: 'tr-en.u16',
    title: 'Şehirde yön tarifi',
    sections: [
      {
        heading: "Yol tarifinde fiil kalıpları: go, turn, walk, cross",
        body: [
          "İngilizce yol tarifi kısa fiil cümleleriyle verilir: Go straight (düz git), Turn left/right (sola/sağa dön), Walk two blocks (iki blok yürü), Cross the street (sokaktan karşıya geç). Emir kipinde fiil yalın başlar.",
        ],
        examples: [
          { target: 'Go straight, then turn left.', tr: 'Düz git, sonra sola dön.' },
          { target: 'Cross the street at the lights.', tr: 'Işıklardan karşıya geç.' },
        ],
      },
      {
        heading: "'at' ile köşe ve ışıklar",
        body: [
          "Köşe ve trafik ışığı gibi 'nokta' kabul edilen yerlerde at kullanılır: at the corner, at the traffic lights. Türkçedeki '-da, -de' ekinin tek karşılığı yoktur; nokta ise at, çevre ise in/on tercih edilir.",
        ],
        examples: [
          { target: 'The bank is at the corner.', tr: 'Banka köşede.' },
          { target: 'Turn right at the traffic lights.', tr: 'Trafik ışıklarında sağa dön.' },
        ],
      },
      {
        heading: "Konum edatları: opposite, next to, between, behind",
        body: [
          "'Karşısında' opposite (the pharmacy is opposite the bank), 'bitişiğinde' next to, 'arkasında' behind, 'arasında' between. Bu edatlar isim öbeğinden önce gelir ve cümlede fiille birlikte kullanılır.",
        ],
        examples: [
          { target: 'The cafe is next to the library.', tr: 'Kafe kütüphanenin bitişiğinde.' },
          { target: 'The bus stop is behind our house.', tr: 'Otobüs durağı evimizin arkasında.' },
        ],
      },
    ],
  },
  'tr-en.u17': {
    unitId: 'tr-en.u17',
    title: 'Tatil planları ve seyahat',
    sections: [
      {
        heading: "'be going to' ile tatil planları",
        body: [
          "Önceden kararlaştırılmış tatil planları 'be going to' ile anlatılır: We are going on holiday in July. 'Tatile gitmek' go on holiday kalıbıdır; tek başına go holiday denmez.",
        ],
        examples: [
          { target: 'We are going on holiday in July.', tr: 'Temmuzda tatile gideceğiz.' },
          { target: 'We are going to book a hotel.', tr: 'Bir otel ayırtacağız.' },
        ],
      },
      {
        heading: "'book' fiili: yer ayırtmak",
        body: [
          "Book kelimesi kitap dışında 'yer ayırtmak' anlamında da çok kullanılır: book a hotel, book a table, book a flight. Türkçedeki 'ayırtmak' karşılığıdır; nesne her zaman rezerve edilen şeydir.",
        ],
        examples: [
          { target: 'We are going to book a hotel near the beach.', tr: 'Plaja yakın bir otel ayırtacağız.' },
          { target: 'Could I book by phone?', tr: 'Telefonla rezervasyon yapabilir miyim?' },
        ],
      },
      {
        heading: "'ready', 'pack' ve seyahat kelimeleri",
        body: [
          "'Hazır' ready sıfatı to be ile kullanılır: I am ready. Bavul hazırlamak pack (bir) suitcase demektir; 'pack' burada eşya toplamak anlamındadır. Uçuş kalkış saati için 'Our flight leaves at nine' denir.",
        ],
        examples: [
          { target: 'I am packing my suitcase.', tr: 'Bavulumu hazırlıyorum.' },
          { target: 'Our flight leaves at nine.', tr: 'Uçuşumuz saat dokuzda kalkıyor.' },
        ],
      },
    ],
  },
  'tr-en.u18': {
    unitId: 'tr-en.u18',
    title: 'Karşılaştırmalar',
    sections: [
      {
        heading: "Karşılaştırma: '-er' ve 'than'",
        body: [
          "Türkçedeki '-den daha' yapısı İngilizcede sıfata -er + than ile kurulur: taller than, faster than. Kısa sıfatlara -er gelir; 'than' karşılaştırmanın iki tarafını birleştirir ve atlanmaz.",
        ],
        examples: [
          { target: 'My brother is taller than me.', tr: 'Erkek kardeşim benden uzun.' },
          { target: 'The train is faster than the bus.', tr: 'Tren otobüsten daha hızlı.' },
        ],
      },
      {
        heading: "'more' ile uzun sıfatlar",
        body: [
          "Uzun sıfatlarda -er gelmez; more + sıfat kullanılır: more expensive than. 'Daha pahalı' = more expensive; 'expensiver' diye bir biçim yoktur.",
        ],
        examples: [
          { target: 'This hotel is more expensive than the other one.', tr: 'Bu otel diğerinden daha pahalı.' },
          { target: 'Winter is colder than autumn.', tr: 'Kış sonbahardan daha soğuk.' },
        ],
      },
      {
        heading: "Üstünlük: 'the -est' ve 'the most'",
        body: [
          "En üstün derece the + -est (the biggest) ya da the most + sıfat (the most expensive) ile kurulur. 'En iyi' ve 'en kötü' düzensizdir: the best, the worst; goodest/badder denmez.",
        ],
        examples: [
          { target: 'This is the best pizza in town.', tr: 'Bu şehirdeki en iyi pizza bu.' },
          { target: 'The blue whale is the biggest animal.', tr: 'Mavi balina en büyük hayvandır.' },
        ],
      },
    ],
  },
  'tr-en.u19': {
    unitId: 'tr-en.u19',
    title: 'Duygular, kişilik ve fikir bildirme',
    sections: [
      {
        heading: "Duygular: 'I am + sıfat'",
        body: [
          "Duygular to be + sıfat ile söylenir: I am happy, she is sad. 'Hissetmek' anlamındaki feel fiili de aynı yapıyı alır: I feel dizzy. Türkçedeki gibi fiile ek gelmez.",
        ],
        examples: [
          { target: 'She is happy today.', tr: 'O bugün mutlu.' },
          { target: 'I am nervous before the exam.', tr: 'Sınavdan önce gerginim.' },
        ],
      },
      {
        heading: "'-ed' ve '-ing' sıfatları: bored / boring",
        body: [
          "Duyan kişiyi anlatan sıfat -ed ile biter (bored = sıkılmış), şeyi anlatan -ing ile (boring = sıkıcı). 'Film sıkıcıydı, ben sıkıldım' = The movie was boring, I was bored.",
        ],
        examples: [
          { target: 'The children are bored.', tr: 'Çocukların canı sıkılıyor.' },
          { target: 'The movie was boring, I was bored.', tr: 'Film sıkıcıydı, sıkıldım.' },
        ],
      },
      {
        heading: "Fikir bildirme: 'I think', 'in my opinion', 'I agree'",
        body: [
          "Görüş bildirirken 'I think + cümle' (bence...) ya da cümle başında 'In my opinion' kullanılır. Aynı fikirdeyseniz 'I agree with you' dersiniz; 'I am agree' denmez.",
        ],
        examples: [
          { target: 'I think English is useful.', tr: 'Bence İngilizce faydalı.' },
          { target: 'I agree with you.', tr: 'Sana katılıyorum.' },
        ],
      },
    ],
  },
  'tr-en.u20': {
    unitId: 'tr-en.u20',
    title: 'Kibar istekler: restoran, telefon, resmî durumlar',
    sections: [
      {
        heading: 'Restoranda: rezervasyon ve sipariş',
        body: [
          "Restoranda 'I have a reservation for two' (iki kişilik rezervasyonum var) ve 'A table for two, please' (iki kişilik masa, lütfen) kalıpları kullanılır. Garson sipariş için 'Are you ready to order?' diye sorar.",
        ],
        examples: [
          { target: 'I have a reservation for two.', tr: 'İki kişilik rezervasyonum var.' },
          { target: 'Are you ready to order?', tr: 'Sipariş vermeye hazır mısınız?' },
        ],
      },
      {
        heading: "Telefonda: 'hold on', 'spell', 'repeat'",
        body: [
          "Telefonda bekletmek için 'hold on', adı harf harf söyletmek için 'spell', anlamadığınızı belirtmek için 'Could you repeat that?' kullanılır. Heceleme isteği çok yaygındır: Could you spell your name, please?",
        ],
        examples: [
          { target: 'Could you hold on, please?', tr: 'Hatta bekleyebilir misiniz?' },
          { target: 'Could you spell your name, please?', tr: 'Adınızı heceleyebilir misiniz?' },
        ],
      },
      {
        heading: "Resmî durumlarda: 'fill in', 'sign', 'available'",
        body: [
          "Resmî yerlerde form doldurmak 'fill in a form', imzalamak 'sign' demektir. Birinin müsait olup olmadığını 'available' ile sorarsınız: Is this seat available? / The doctor is not available now.",
        ],
        examples: [
          { target: 'Please fill in this form.', tr: 'Lütfen bu formu doldurun.' },
          { target: 'Is this seat available?', tr: 'Bu koltuk boş mu?' },
        ],
      },
    ],
  },
};
