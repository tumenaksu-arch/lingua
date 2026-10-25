import type { CourseExplanations } from './types';

/**
 * "Neden yanlış?" açıklamaları (tr-de): her sel/fill/build alıştırması için kısa Türkçe ipucu.
 * Doğru cevabı açıkça söyler ve tipik hatayı açıklar.
 */
export const trDeExplanations: CourseExplanations = {
  // Ünite 1 — Temeller
  'tr-de.u1.l1.e1': "Doğru cevap 'hallo'. 'Merhaba' Almancada Hallo'dur; tschüss hoşça kal, danke teşekkürler demektir.",
  'tr-de.u1.l1.e3': "Doğru cevap 'Ja, bitte'. Evet ja, lütfen bittedir. Almancada virgülle ayrılan iki kelimeyi aynen sırayla kur.",
  'tr-de.u1.l1.e5': "Boşluğa 'Ja' gelir: 'Ja, danke.' (Evet, teşekkürler). Hallo danke ile anlamlı bir kalıp oluşturmaz.",
  'tr-de.u1.l1.e7': "Doğru cevap 'hoşça kal'. Tschüss ayrılışta söylenir; merhaba karşılığı Hallo'dur.",
  'tr-de.u1.l1.e8': "Doğru cevap 'Nein, danke'. Hayır nein, teşekkürler danke demektir; tipik hatayı unutma.",

  'tr-de.u1.l2.e1': "Doğru cevap 'die Frau'. Frau kadındır ve dişil olduğu için die alır; Mann der, Brot das alır.",
  'tr-de.u1.l2.e3': "Doğru cevap 'Ich bin ein Mann'. 'Ben …-im' = ich bin; Türkçedeki gibi fiili sona koyma, bin özneden hemen sonra gelir.",
  'tr-de.u1.l2.e4': "Doğru cevap 'Du bist eine Frau'. Sen du bist demektir; Frau dişil olduğu için ein değil eine kullanılır.",
  'tr-de.u1.l2.e6': "Boşluğa 'bist' gelir: 'Du bist ein Mann.' du ile bist eşleşir; bin yalnız ich ile kullanılır.",
  'tr-de.u1.l2.e8': "Boşluğa 'bin' gelir: 'Ich bin eine Frau.' ich bin kalıbını ezberle; du bist, ich bin.",

  'tr-de.u1.l3.e1': "Doğru cevap 'das Kind'. Kind çocuktur ve nötr olduğu için das alır; Freund der, Frau die alır.",
  'tr-de.u1.l3.e3': "Doğru cevap 'Wie geht's?'. 'Nasılsın?' Almancada fiil başa gelir: Wie geht's? Tipik hata kelime sırasını Türkçe gibi kurmaktır.",
  'tr-de.u1.l3.e4': "Doğru cevap 'Gut, danke'. İyiyim demenin kısa yolu gut + danke'dir; Türkçedeki gibi ayrı bir ben iyiyim kalıbı gerekmez.",
  'tr-de.u1.l3.e6': "Boşluğa 'Freund' gelir: 'Er ist mein Freund.' (O benim arkadaşım). gut ve Kind bu kalıpta anlamsızdır.",
  'tr-de.u1.l3.e8': "Doğru cevap 'iyi'. gut iyi demektir; kötü karşılığı schlecht, büyük karşılığı groß'tur.",

  'tr-de.u1.l4.e1': "Doğru cevap 'der Schüler'. Schüler öğrencidir; Lehrer öğretmen, Freund arkadaştır — sonekleri karıştırma.",
  'tr-de.u1.l4.e2': "Doğru cevap 'zwei'. eins bir, zwei iki, drei üç; sırayı ezberle.",
  'tr-de.u1.l4.e4': "Doğru cevap 'Ich bin ein Schüler'. 'Ben …-im' = ich bin; Schüler eril olduğu için ein kullanılır.",
  'tr-de.u1.l4.e5': "Doğru cevap 'Du bist mein Freund'. Sen du bist demektir; mein Freund 'benim arkadaşım' kalıbını aynen taşı.",
  'tr-de.u1.l4.e7': "Boşluğa 'zwei' gelir: 'Ich habe zwei Brüder.' (İki erkek kardeşim var). Brüder çoğul olduğu için iki (zwei) doğrudur.",
  'tr-de.u1.l4.e9': "Doğru cevap 'öğretmen'. der Lehrer öğretmendir; Schüler öğrenci, Freund arkadaştır.",

  // Ünite 2 — Yemek
  'tr-de.u2.l1.e1': "Doğru cevap 'das Wasser'. Wasser sudur ve nötr olduğu için das alır; Tee der, Brot das alır ama su Wasser'tir.",
  'tr-de.u2.l1.e3': "Doğru cevap 'Ich trinke Wasser'. içmek trinken, yemek essen'dir; içmek için trinke kullan. Fiil özneden hemen sonra gelir.",
  'tr-de.u2.l1.e4': "Doğru cevap 'Du isst Brot'. yemek du kişisinde isst olur (essen → isst); trinkst içmek içindir.",
  'tr-de.u2.l1.e6': "Boşluğa 'esse' gelir: 'Ich esse Brot.' ekmek yenir, içilmez; trinke yanlıştır.",
  'tr-de.u2.l1.e8': "Doğru cevap 'kahve'. der Kaffee kahvedir; Tee çay, Milch süttür.",

  'tr-de.u2.l2.e1': "Doğru cevap 'der Apfel'. Apfel elmadır ve eril olduğu için der alır; Milch die, Brot das alır.",
  'tr-de.u2.l2.e3': "Doğru cevap 'Ich esse einen Apfel'. Nesneye yönelik belirsiz artikel erillerde einen olur: einen Apfel. ein değil!",
  'tr-de.u2.l2.e4': "Doğru cevap 'Du trinkst Milch'. süt içilir: trinkst; isst yemek içindir. Fiil du ile: trinkst.",
  'tr-de.u2.l2.e6': "Boşluğa 'trinkst' gelir: 'Du trinkst Milch.' Milch içilir, yenmez; du ile isst değil trinkst.",
  'tr-de.u2.l2.e8': "Doğru cevap 'süt'. die Milch süttür; Apfel elma, Wasser su demektir.",

  'tr-de.u2.l3.e1': "Doğru cevap 'der Käse'. Käse peynirdir ve eril olduğu için der alır; Ei das, Brot das alır.",
  'tr-de.u2.l3.e3': "Doğru cevap 'Ich habe Hunger'. 'Açım' = Hunger haben kalıbıyla kurulur; ayrı bir sıfat gibi çevrilemez.",
  'tr-de.u2.l3.e4': "Doğru cevap 'Die Rechnung, bitte'. hesap die Rechnung'dur; Speisekarte menüdür — karıştırma.",
  'tr-de.u2.l3.e6': "Boşluğa 'Speisekarte' gelir: 'Die Speisekarte, bitte.' (Menü, lütfen). Hesap isteseydin Rechnung derdin.",
  'tr-de.u2.l3.e8': "Doğru cevap 'menü'. die Speisekarte menüdür; Rechnung hesap demektir.",
  'tr-de.u2.l3.e9': "Boşluğa 'Ei' gelir: 'Ich esse ein Ei.' (Bir yumurta yerim). Hunger ve lecker burada isim olamaz.",

  'tr-de.u2.l4.e1': "Doğru cevap 'der Fisch'. Fisch balıktır ve eril olduğu için der alır; Hähnchen das, Reis der alır.",
  'tr-de.u2.l4.e2': "Doğru cevap 'das Salz'. Salz tuzdur ve nötr olduğu için das alır; Zucker der, Salat der alır — karıştırma.",
  'tr-de.u2.l4.e4': "Doğru cevap 'Ich esse Hähnchen und Reis'. 've' und'dur; und ile bağlanan iki yiyeceği aynı fiille kur.",
  'tr-de.u2.l4.e5': "Doğru cevap 'Ist Zucker im Tee?'. Soruda fiil başa gelir: Ist…? '…-de/-da' için im kullanılır (im Tee).",
  'tr-de.u2.l4.e7': "Boşluğa 'Fisch' gelir: 'Ich esse keinen Fisch.' (Balık yemem). keinen eril/çoğul nesnelerle kullanılır.",
  'tr-de.u2.l4.e9': "Doğru cevap 'şeker'. der Zucker şekerdir; Salz tuz, Salat salata demektir.",

  // Ünite 3 — Aile
  'tr-de.u3.l1.e1': "Doğru cevap 'die Mutter'. Mutter annedir ve dişil olduğu için die alır; Vater der, Schwester die alır.",
  'tr-de.u3.l1.e3': "Doğru cevap 'Ich habe eine Schwester'. '…-im var' = ich habe kalıbıdır; Schwester dişil olduğu için eine kullanılır.",
  'tr-de.u3.l1.e4': "Doğru cevap 'Mein Vater ist ein Mann'. mein Vater 'babam' demektir; iyelik eki yerine ayrı kelime gelir.",
  'tr-de.u3.l1.e6': "Boşluğa 'Mutter' gelir: 'Meine Mutter trinkt Tee.' Meine + dişil isim; habe burada fiil olamaz.",
  'tr-de.u3.l1.e8': "Doğru cevap 'erkek kardeş'. der Bruder erkek kardeş, die Schwester kız kardeştir.",

  'tr-de.u3.l2.e1': "Doğru cevap 'die Familie'. Familie ailedir ve dişil olduğu için die alır; Kind das, Freund der alır.",
  'tr-de.u3.l2.e3': "Doğru cevap 'Meine Familie ist groß'. 'Ailem büyük' = aile özne, büyük yüklem; meine Familie dişil olduğu için meine.",
  'tr-de.u3.l2.e4': "Doğru cevap 'Ich liebe meine Familie'. 'Ailemi seviyorum' — meine Familie aynen taşınır, fiil ikinci sırada: liebe.",
  'tr-de.u3.l2.e6': "Boşluğa 'liebe' gelir: 'Ich liebe meine Mutter.' (Annemi seviyorum). bin ve esse bu cümlede anlamsızdır.",
  'tr-de.u3.l2.e8': "Doğru cevap 'büyük'. groß büyüktür; klein küçük, gut iyi demektir.",

  'tr-de.u3.l3.e1': "Doğru cevap 'haben'. sahip olmak = haben; lieben sevmek, essen yemek demektir.",
  'tr-de.u3.l3.e3': "Doğru cevap 'Ich habe zwei Brüder'. 'İki erkek kardeşim var' — var için habe kullan; Brüder çoğul olduğu için keine değil.",
  'tr-de.u3.l3.e4': "Doğru cevap 'Mein Freund hat ein Kind'. o/er kişisinde haben → hat olur; habe yalnız ich içindir.",
  'tr-de.u3.l3.e6': "Boşluğa 'hast' gelir: 'Du hast eine Schwester.' du kişisinde haben → hast; habe ich içindir.",
  'tr-de.u3.l3.e8': "Doğru cevap 'çocuk'. das Kind çocuktur; Freund arkadaş, Familie aile demektir.",
  'tr-de.u3.l3.e9': "Boşluğa 'hat' gelir: 'Mein Freund hat ein Kind.' (Arkadaşımın bir çocuğu var). hat, o/er için kullanılır.",

  'tr-de.u3.l4.e1': "Doğru cevap 'der Ehemann'. Ehemann kocadır ve eril olduğu için der alır; Ehefrau die (eş-kadın), Bruder der alır.",
  'tr-de.u3.l4.e3': "Doğru cevap 'Ich liebe meine Ehefrau'. eş-kadın için Ehefrau + meine; meinen Ehemann koca için olur — meine/meinen karıştırma.",
  'tr-de.u3.l4.e4': "Doğru cevap 'Ich habe zwei Kinder'. çocuklar çoğul: Kinder; 'İki çocuğum var' = ich habe zwei Kinder.",
  'tr-de.u3.l4.e6': "Boşluğa 'Freund' gelir: 'Das ist mein Freund.' (Bu benim arkadaşım). liebe ve habe burada isim olamaz.",
  'tr-de.u3.l4.e8': "Doğru cevap 'eş (kadın)'. die Ehefrau kadın eştir; Ehemann koca, Schwester kız kardeştir.",
  'tr-de.u3.l4.e9': "Boşluğa 'hat' gelir: 'Mein Bruder hat ein Kind.' o/er için haben → hat; habe yalnız ich içindir.",

  // Ünite 4 — Seyahat
  'tr-de.u4.l1.e1': "Doğru cevap 'der Zug'. Zug trendir ve eril olduğu için der alır; Bahnhof istasyon, Hotel otel demektir.",
  'tr-de.u4.l1.e3': "Doğru cevap 'Wo ist das Hotel?'. nerede = Wo; soruda fiil hemen sonra: ist. das Hotel nötr olduğu için das.",
  'tr-de.u4.l1.e4': "Doğru cevap 'Wo ist der Zug?'. Zug eril olduğu için der Zug; 'Tren nerede?' sorusunda da Wo ist kalıbı kullanılır.",
  'tr-de.u4.l1.e6': "Boşluğa 'Fahrkarte' gelir: 'Ich habe eine Fahrkarte.' (Bir biletim var). eine + dişil isim.",
  'tr-de.u4.l1.e8': "Doğru cevap 'nerede'. wo nerede demektir; ne was, kim wer demektir.",

  'tr-de.u4.l2.e1': "Doğru cevap 'links'. links sol, rechts sağ, nah yakın demektir; sağ/sol karıştırma.",
  'tr-de.u4.l2.e3': "Doğru cevap 'Das Hotel ist nah'. yakın = nah; weit uzak demektir. Sıfat cümlesinde ist kullanılır.",
  'tr-de.u4.l2.e4': "Doğru cevap 'Der Bahnhof ist weit'. uzak = weit; nah yakın demektir. Bahnhof eril olduğu için der.",
  'tr-de.u4.l2.e6': "Boşluğa 'rechts' gelir: 'Das Hotel ist rechts.' (Otel sağda). wo ve Zug bu kalıpta sıfat olamaz.",
  'tr-de.u4.l2.e8': "Doğru cevap 'uzak'. weit uzaktır; nah yakın, links sol, rechts sağ demektir.",

  'tr-de.u4.l3.e1': "Doğru cevap 'Entschuldigung'. affedersiniz = Entschuldigung; Hilfe yardım, danke teşekkürler demektir.",
  'tr-de.u4.l3.e3': "Doğru cevap 'Entschuldigung, wo ist der Bahnhof?'. yol sormada önce Entschuldigung, sonra Wo ist kalıbı; Bahnhof eril: der.",
  'tr-de.u4.l3.e4': "Doğru cevap 'Können Sie mir helfen?'. kibar istekte Sie kullanılır ve fiil başa gelir: Können…? 'bana yardım' = mir helfen.",
  'tr-de.u4.l3.e6': "Boşluğa 'Hilfe' gelir: 'Ich brauche Hilfe.' (Yardıma ihtiyacım var). wo ve links buraya uymaz.",
  'tr-de.u4.l3.e8': "Doğru cevap 'yardım'. die Hilfe yardımdır; Fahrkarte bilet, Bahnhof istasyon demektir.",

  'tr-de.u4.l4.e1': "Doğru cevap 'das Flugzeug'. Flugzeug uçaktır ve nötr olduğu için das alır; Auto das, Zug der alır.",
  'tr-de.u4.l4.e2': "Doğru cevap 'spät'. geç = spät; früh erken, nah yakın demektir. S ile başlayan spät = geç diye ezberle.",
  'tr-de.u4.l4.e4': "Doğru cevap 'Der Zug ist spät'. 'Tren geç' = Zug özne + ist + spät; früh erken demektir, anlam ters.",
  'tr-de.u4.l4.e5': "Doğru cevap 'Meine Tasche ist im Auto'. 'arabada' = im Auto (in dem kısaltması); meine Tasche çantam demektir.",
  'tr-de.u4.l4.e7': "Boşluğa 'spät' gelir: 'Das Flugzeug ist spät.' (Uçak geç). Tasche ve wo bu kalıpta sıfat olamaz.",
  'tr-de.u4.l4.e9': "Doğru cevap 'erken'. früh erkendir; spät geç, weit uzak, nah yakın demektir.",

  // Ünite 5 — Alışveriş
  'tr-de.u5.l1.e1': "Doğru cevap 'teuer'. pahalı = teuer; billig ucuz, Preis fiyat demektir.",
  'tr-de.u5.l1.e2': "Doğru cevap 'das Geld'. Geld paradır ve nötr olduğu için das alır; Laden dükkân, Preis fiyat demektir.",
  'tr-de.u5.l1.e4': "Doğru cevap 'Wie viel kostet das?'. ne kadar = wie viel; tek nesne için fiil tekil: kostet. Fiil cümle sonunda değil, özneden sonra.",
  'tr-de.u5.l1.e5': "Doğru cevap 'Das ist sehr teuer'. 'Bu çok pahalı' — das ist + sehr + sıfat; çok için sehr kullanılır.",
  'tr-de.u5.l1.e7': "Boşluğa 'Preis' gelir: 'Der Preis ist zehn Euro.' (Fiyat on Euro). Euro ile fiyat söylenir, Geld/Laden değil.",
  'tr-de.u5.l1.e9': "Doğru cevap 'ucuz'. billig ucuzdur; teuer pahalı, Preis fiyat demektir.",

  'tr-de.u5.l2.e1': "Doğru cevap 'das Hemd'. Hemd gömlektir ve nötr olduğu için das alır; Schuhe çoğul, Kleid das alır.",
  'tr-de.u5.l2.e3': "Doğru cevap 'Ich kaufe ein Hemd'. satın almak = kaufen; Hemd nötr olduğu için ein. Fiil ikinci sırada: kaufe.",
  'tr-de.u5.l2.e4': "Doğru cevap 'Die Schuhe sind zu groß'. Schuhe çoğul olduğu için sind kullanılır; 'çok büyük' = zu groß ya da sehr groß.",
  'tr-de.u5.l2.e6': "Boşluğa 'klein' gelir: 'Dieses Hemd ist zu klein.' (Bu gömlek çok küçük). kaufe fiil, Schuhe uymaz.",
  'tr-de.u5.l2.e8': "Doğru cevap 'elbise'. das Kleid elbisedir; Hemd gömlek, Schuhe ayakkabı demektir.",
  'tr-de.u5.l2.e9': "Boşluğa 'Kleid' gelir: 'Ich will ein Kleid kaufen.' (Bir elbise almak istiyorum). ein + nötr isim.",

  'tr-de.u5.l3.e1': "Doğru cevap 'rot'. kırmızı = rot; blau mavi, groß büyük demektir.",
  'tr-de.u5.l3.e3': "Doğru cevap 'Ich mag das blaue Kleid'. 'beğeniyorum' = ich mag; das + sıfat kalıbında -e eki: das blaue Kleid.",
  'tr-de.u5.l3.e4': "Doğru cevap 'Das rote Hemd ist teuer'. das rote kalıbında -e; 'kırmızı gömlek' = das rote Hemd.",
  'tr-de.u5.l3.e6': "Boşluğa 'blauen' gelir: 'Ich mag die blauen Schuhe.' die + sıfat çoğulda -en alır: die blauen Schuhe.",
  'tr-de.u5.l3.e8': "Doğru cevap 'mavi'. blau mavidir; rot kırmızı, groß büyük, klein küçük demektir.",
  'tr-de.u5.l3.e9': "Boşluğa 'Hemd' gelir: 'Das Hemd ist rot.' (Gömlek kırmızı). mögen ve kaufen fiildir, özne olamaz.",

  'tr-de.u5.l4.e1': "Doğru cevap 'der Laden'. Laden dükkândır ve eril olduğu için der alır; Geld das, Preis der alır.",
  'tr-de.u5.l4.e3': "Doğru cevap 'Ich habe kein Geld'. 'param yok' = kein Geld; Geld nötr olduğu için kein (kein'e gerek yok).",
  'tr-de.u5.l4.e4': "Doğru cevap 'Wie viel kosten die Schuhe?'. Schuhe çoğul olduğu için fiil kosten olur; tek şey olsaydı kostet derdin.",
  'tr-de.u5.l4.e6': "Boşluğa 'kaufen' gelir: 'Ich will ein Kleid kaufen.' (Bir elbise almak istiyorum). will + fiil kökü kalıbı.",
  'tr-de.u5.l4.e8': "Doğru cevap 'ne kadar'. wie viel ne kadar demektir; nerede wo, ne zaman wann demektir.",
  'tr-de.u5.l4.e9': "Doğru cevap 'Das ist sehr billig'. 'Bu çok ucuz' — das ist + sehr + billig; teuer tam tersi anlamdadır.",

  // Ünite 6 — İş ve Okul
  'tr-de.u6.l1.e1': "Doğru cevap 'der Arzt'. Arzt doktordur ve eril olduğu için der alır; Ingenieur der, Lehrer der alır ama doktor Arzt'tır.",
  'tr-de.u6.l1.e2': "Doğru cevap 'die Schule'. Schule okuldur ve dişil olduğu için die alır; Büro das, Laden der alır.",
  'tr-de.u6.l1.e4': "Doğru cevap 'Ich arbeite in einem Büro'. 'bir ofiste' = in einem Büro (in + ein → einem); arbeite ikinci sırada gelir.",
  'tr-de.u6.l1.e5': "Doğru cevap 'Mein Vater ist Ingenieur'. Almancada mesleklerden önce ein konmaz: ist Ingenieur, ist ein Ingenieur de kabul edilir ama 'ist Arzt' daha doğal.",
  'tr-de.u6.l1.e7': "Boşluğa 'beschäftigt' gelir: 'Er ist heute sehr beschäftigt.' (O bugün çok meşgul). Büro/arbeiten buraya uymaz.",
  'tr-de.u6.l1.e9': "Doğru cevap 'meşgul'. beschäftigt meşguldür; boş karşılığı frei, yorgun karşılığı müde demektir.",

  'tr-de.u6.l2.e1': "Doğru cevap 'das Buch'. Buch kitaptır ve nötr olduğu için das alır; Stift der, Computer der alır.",
  'tr-de.u6.l2.e3': "Doğru cevap 'Ich lerne Deutsch'. öğrenmek = lernen, okumak = lesen; 'Almanca öğreniyorum' ich lerne Deutsch'tür.",
  'tr-de.u6.l2.e4': "Doğru cevap 'Ich lese ein Buch'. okumak = lesen → ich lese; lerne öğrenmek demektir. ein Buch: nötr isimle ein.",
  'tr-de.u6.l2.e6': "Boşluğa 'lerne' gelir: 'Ich lerne Deutsch in der Schule.' (Okulda Almanca öğreniyorum). fiil ikinci sırada.",
  'tr-de.u6.l2.e8': "Doğru cevap 'yazmak'. schreiben yazmaktır; lesen okumak, lernen öğrenmek demektir — telaffuzları karıştırma.",
  'tr-de.u6.l2.e9': "Boşluğa 'Buch' gelir: 'Das Buch liegt auf dem Tisch.' (Kitap masanın üstünde). lesen/lernen fiildir, isim olamaz.",

  'tr-de.u6.l3.e1': "Doğru cevap 'die Besprechung'. Besprechung toplantıdır ve dişil olduğu için die alır; Computer der, Büro das alır.",
  'tr-de.u6.l3.e3': "Doğru cevap 'Ich habe heute eine Besprechung'. 'bir toplantım var' = ich habe eine Besprechung; heute fiilden sonra gelir.",
  'tr-de.u6.l3.e4': "Doğru cevap 'Der Computer ist im Büro'. 'ofiste' = im Büro; Computer eril olduğu için der Computer.",
  'tr-de.u6.l3.e6': "Boşluğa 'Computer' gelir: 'Ich arbeite an meinem Computer.' (Bilgisayarımda çalışıyorum). meinem + eril isim.",
  'tr-de.u6.l3.e8': "Doğru cevap 'bilgisayar'. der Computer bilgisayardır; Besprechung toplantı, Büro ofis demektir.",
  'tr-de.u6.l3.e9': "Boşluğa 'Heute' gelir: 'Heute habe ich eine Besprechung.' (Bugün bir toplantım var). Zaman öbeği başa gelince fiil ikinci sırada kalır.",

  'tr-de.u6.l4.e1': "Doğru cevap 'lernen'. öğrenmek = lernen; lesen okumak, schreiben yazmaktır. Telaffuz benzer, anlam farklı.",
  'tr-de.u6.l4.e3': "Doğru cevap 'Der Lehrer spricht Deutsch'. konuşmak = sprechen → spricht; 'öğretmen konuşur' der Lehrer + spricht.",
  'tr-de.u6.l4.e4': "Doğru cevap 'Die Schüler lesen in der Schule'. okumak = lesen; 'okulda' = in der Schule (die → der).",
  'tr-de.u6.l4.e6': "Boşluğa 'Lehrer' gelir: 'Der Lehrer schreibt an die Tafel.' (Öğretmen tahtaya yazıyor). lernen fiildir, isim olamaz.",
  'tr-de.u6.l4.e8': "Doğru cevap 'öğrenmek'. lernen öğrenmektir; lesen okumak, çalışmak arbeiten demektir.",
  'tr-de.u6.l4.e9': "Boşluğa 'lernen' gelir: 'Die Schüler lernen Deutsch.' (Öğrenciler Almanca öğreniyor). Çoğul özneyle fiil kökü aynı kalır.",

  // Ünite 7 — Hava ve Zaman
  'tr-de.u7.l1.e1': "Doğru cevap 'sonnig'. güneşli = sonnig; regnerisch yağmurlu, kalt soğuk demektir.",
  'tr-de.u7.l1.e2': "Doğru cevap 'kalt'. soğuk = kalt; heiß sıcak, Wetter hava demektir — sıfatları karıştırma.",
  'tr-de.u7.l1.e4': "Doğru cevap 'Heute ist es sonnig'. hava için sahte özne 'es' kullanılır: ist es sonnig; 'bugün' heute başta ya da es'ten sonra gelir.",
  'tr-de.u7.l1.e5': "Doğru cevap 'Es ist kalt'. 'Hava soğuk' = es ist kalt; Das Wetter ist kalt da kabul edilir ama es kalıbı daha doğal.",
  'tr-de.u7.l1.e7': "Boşluğa 'Wetter' gelir: 'Das Wetter ist heute heiß.' (Bugün hava sıcak). regnerisch/kalt sıfattır, özne olamaz.",
  'tr-de.u7.l1.e9': "Doğru cevap 'yağmurlu'. regnerisch yağmurludur; sonnig güneşli, kalt soğuk demektir.",

  'tr-de.u7.l2.e1': "Doğru cevap 'morgen'. yarın = morgen; heute bugün, jetzt şimdi demektir.",
  'tr-de.u7.l2.e3': "Doğru cevap 'Morgen ist Montag'. 'Yarın pazartesi' — zaman öbeği başta, fiil ikinci sırada: ist; morgen küçük harfle başlar.",
  'tr-de.u7.l2.e4': "Doğru cevap 'Ich bin jetzt beschäftigt'. meşgul bir sıfat: ich bin + beschäftigt; jetzt 'şimdi' demektir.",
  'tr-de.u7.l2.e6': "Boşluğa 'Woche' gelir: 'Ich arbeite fünf Tage pro Woche.' (Haftada beş gün çalışıyorum). pro Woche kalıbını ezberle.",
  'tr-de.u7.l2.e8': "Doğru cevap 'hafta'. die Woche haftadır; der Gün değil, ay der Mond karşılığıdır — Woche hafta demektir.",
  'tr-de.u7.l2.e9': "Boşluğa 'Heute' gelir: 'Heute ist Montag.' (Bugün pazartesi). Jetzt (şimdi) ve Woche buraya uymaz.",

  'tr-de.u7.l3.e1': "Doğru cevap 'Wie spät ist es'. saat kaç = Wie spät ist es?; Wie weit ne kadar uzak, Wie alt kaç yaş demektir.",
  'tr-de.u7.l3.e3': "Doğru cevap 'Wie spät ist es?'. saat kaç sorusunda bu kalıp kullanılır; Stunde (süre) saat sormak için değildir.",
  'tr-de.u7.l3.e4': "Doğru cevap 'Es ist drei Uhr'. saat söylerken: es ist + sayı + Uhr; 'Saat üç' Türkçedeki gibi tek kelimeyle kurulmaz.",
  'tr-de.u7.l3.e6': "Boşluğa 'Stunde' gelir: 'Die Besprechung dauert eine Stunde.' (Toplantı bir saat sürüyor). Süre için Stunde, saat için Uhr.",
  'tr-de.u7.l3.e8': "Doğru cevap 'saat (süre)'. die Stunde süre birimidir; Uhr kadran/saat, dakika Minute demektir.",
  'tr-de.u7.l3.e9': "Boşluğa 'spät' gelir: 'Der Zug ist spät.' (Tren geç). Uhr ve Woche bu kalıpta sıfat olamaz.",

  'tr-de.u7.l4.e1': "Doğru cevap 'das Wetter'. Wetter havadır ve nötr olduğu için das alır; Woche hafta, Stunde saat (süre) demektir.",
  'tr-de.u7.l4.e3': "Doğru cevap 'Morgen ist es kalt'. hava için es kullanılır: ist es kalt; morgen yarın demektir, bugün heute olurdu.",
  'tr-de.u7.l4.e4': "Doğru cevap 'Am Sonntag ist es heiß'. 'pazar günü' = am Sonntag (an dem kısaltması); sıcak = heiß.",
  'tr-de.u7.l4.e6': "Boşluğa 'kalt' gelir: 'Im Winter ist es kalt.' (Kışın hava soğuktur). Im Winter + kalt kalıbını ezberle.",
  'tr-de.u7.l4.e8': "Doğru cevap 'yarın'. morgen yarın demektir; heute bugün, jetzt şimdi demektir.",
  'tr-de.u7.l4.e9': "Boşluğa 'Sonntag' gelir: 'Heute ist Sonntag.' (Bugün pazar). Woche ve Wetter buraya uymaz.",

  // Ünite 8 — Hobiler
  'tr-de.u8.l1.e1': "Doğru cevap 'die Musik'. Musik müziktir ve dişil olduğu için die alır; Film der, Gitarre die alır.",
  'tr-de.u8.l1.e2': "Doğru cevap 'der Fußball'. Fußball futboldur ve eril olduğu için der alır; Gitarre/Musik die alır.",
  'tr-de.u8.l1.e4': "Doğru cevap 'Ich spiele Fußball'. oynamak = spielen → ich spiele; enstrüman ve spor aynı fiille kurulur ama 'oynarım' fiili ikinci sırada.",
  'tr-de.u8.l1.e5': "Doğru cevap 'Ich mag Musik'. hoşlanmak = mögen → ich mag; 'müziği severim' için ayrı bir fiil gerekmez, mag yeterli.",
  'tr-de.u8.l1.e7': "Boşluğa 'Film' gelir: 'Wir sehen heute einen Film.' (Bugün film izliyoruz). sehen + einen Film kalıbı.",
  'tr-de.u8.l1.e9': "Doğru cevap 'oynamak / çalmak'. spielen hem oynamak hem çalmaktır; izlemek sehen, dinlemek hören demektir.",

  'tr-de.u8.l2.e1': "Doğru cevap 'schwimmen'. yüzmek = schwimmen; laufen koşmak, tanzen dans etmek demektir.",
  'tr-de.u8.l2.e3': "Doğru cevap 'Am Wochenende laufe ich im Park'. zaman öbeği başta olunca fiil ikinci sırada kalır ve ich fiilden sonra gelir: laufe ich.",
  'tr-de.u8.l2.e4': "Doğru cevap 'Ich tanze gern'. 'sevmek' için gern zarfi fiilden sonra gelir: tanze gern; ayrı bir sevmek fiili gerekmez.",
  'tr-de.u8.l2.e6': "Boşluğa 'Wochenende' gelir: 'Am Wochenende gehen wir in den Park.' (Hafta sonu parka gideriz). am Wochenende kalıbı.",
  'tr-de.u8.l2.e8': "Doğru cevap 'hafta sonu'. das Wochenende hafta sonudur; Woche hafta, Montag pazartesi demektir.",
  'tr-de.u8.l2.e9': "Boşluğa 'schwimme' gelir: 'Ich schwimme im Meer.' (Denizde yüzerim). ich + schwimme; tanze dans etmektir.",

  'tr-de.u8.l3.e1': "Doğru cevap 'reisen'. seyahat etmek = reisen; kochen yemek pişirmek, Foto fotoğraf demektir.",
  'tr-de.u8.l3.e3': "Doğru cevap 'Am Wochenende koche ich'. zaman başta → fiil ikinci sırada → özne fiilden sonra: koche ich.",
  'tr-de.u8.l3.e4': "Doğru cevap 'Ich mache gern Fotos'. fotoğraf çekmek = Fotos machen; 'severim' için gern fiilden sonra gelir.",
  'tr-de.u8.l3.e6': "Boşluğa 'Foto' gelir: 'Das ist ein Foto von meiner Familie.' (Bu ailemin bir fotoğrafı). ein + nötr isim.",
  'tr-de.u8.l3.e8': "Doğru cevap 'yemek pişirmek'. kochen yemek pişirmektir; reisen seyahat etmek, tanzen dans etmek demektir.",
  'tr-de.u8.l3.e9': "Boşluğa 'reisen' gelir: 'Wir reisen am Wochenende.' (Hafta sonu seyahat ediyoruz). wir + fiil kökü (reisen).",

  'tr-de.u8.l4.e1': "Doğru cevap 'der Film'. Film filmdir ve eril olduğu için der alır; Musik die, Foto das alır.",
  'tr-de.u8.l4.e3': "Doğru cevap 'Am Wochenende spiele ich Gitarre'. zaman öbeği başta olunca sıra: Am Wochenende + spiele + ich; Gitarre artikelsiz de kullanılır.",
  'tr-de.u8.l4.e4': "Doğru cevap 'Mein Freund sieht gern Filme'. film izlemek = Filme sehen; gern zarfi fiilden sonra: sieht gern.",
  'tr-de.u8.l4.e6': "Boşluğa 'spiele' gelir: 'Ich spiele Fußball.' (Futbol oynarım). ich + spiele; spielst du içindir, spielen köktür.",
  'tr-de.u8.l4.e8': "Doğru cevap 'gitar'. die Gitarre gitardır; Musik müzik, Film film demektir.",
  'tr-de.u8.l4.e9': "Doğru cevap 'Wir spielen am Wochenende'. 'biz oynarız' = wir spielen; wir ile fiil kökü kullanılır (oynarız = spielen).",
};
