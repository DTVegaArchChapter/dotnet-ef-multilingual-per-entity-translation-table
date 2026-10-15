# EF Core ile Entity Başına Çeviri Tabloları

## Amaç ve kapsam

Birden fazla dilde sunulan verilerde, dile bağlı alanları ana kayıttan ayrı tablolarda tutmak; ortak alanları tek kez saklamayı, çevirileri ise dil bazında yönetmeyi sağlar. Bu yazı, depodaki .NET 10, EF Core 10, PostgreSQL ve Dapper örneğini açıklar; uygulanmamış özellikler ayrıca öneri olarak işaretlenir.

Örnekte ürünün SKU, fiyat ve kategori ilişkisi dilden bağımsızdır. Ürün adı ve açıklaması dile bağlıdır. Kategori de aynı ayrımı izler: `code` ortaktır; ad ve açıklama çeviridir.

## Tablo yapısı

| Tablo | Dil bağımsız alanlar | İlişkiler |
|---|---|---|
| `languages` | `code`, `display_name` | Çeviri tablolarının dil referansı |
| `categories` | `id`, `code` | Ürünler ve kategori çevirileri |
| `category_translations` | `category_id`, `language_code`, `name`, `description` | Kategori ve dil |
| `products` | `id`, `sku`, `price`, `category_id` | Kategori ve ürün çevirileri |
| `product_translations` | `product_id`, `language_code`, `name`, `description` | Ürün ve dil |

İlişki özeti:

```text
languages 1 ─── * category_translations * ─── 1 categories 1 ─── * products
languages 1 ─── * product_translations  * ─── 1 products
```

Çeviri tablolarında bileşik anahtar kullanılır: `(category_id, language_code)` ve `(product_id, language_code)`. Böylece aynı entity için aynı dilde birden fazla çeviri satırı eklenemez. Bu anahtarlar, entity kimliği üzerinden çeviri aramalarını da destekler.

## Bu depodaki şema ve kurallar

`AppDbContext` şu kuralları tanımlar:

- `categories.code` ve `products.sku` benzersizdir.
- Her iki çeviri tablosunun birincil anahtarı entity kimliği ile `language_code` bileşimidir.
- `category_id` ve `product_id`, ilgili ana tabloya yabancı anahtardır; entity silinince çevirileri `CASCADE` ile silinir.
- `products.category_id` için silme davranışı `RESTRICT`'tir; ürün kullanan kategori doğrudan silinemez.
- Çevirilerin dil referansı `languages.code` alanına bağlıdır ve silme davranışı `RESTRICT`'tir.
- Başlangıç verisi `tr`, `en` ve `fr` dillerini ekler.

EF Core eşlemesi ile SQL adlandırması snake_case kullanır. Migration'ların ürettiği gerçek DDL için `src/api/Data/Migrations` altındaki migration dosyaları esas alınmalıdır; aşağıdaki ilişki özeti tasarımı anlatır, migration çıktısının yerine geçmez.

## EF Core yapılandırması ve veri erişimi

`AppDbContext.OnModelCreating` her entity'yi açıkça tabloya ve kolon adlarına eşler. Örneğin ürün çevirisinin kimliği ve ilişkileri şu şekilde tanımlanır:

```csharp
modelBuilder.Entity<ProductTranslation>(entity =>
{
	entity.ToTable("product_translations");
	entity.HasKey(translation => new { translation.ProductId, translation.LanguageCode });
	entity.Property(translation => translation.ProductId).HasColumnName("product_id");
	entity.Property(translation => translation.LanguageCode).HasColumnName("language_code").HasMaxLength(2);
	entity.Property(translation => translation.Name).HasColumnName("name").HasMaxLength(160).IsRequired();
	entity.Property(translation => translation.Description).HasColumnName("description").HasMaxLength(1000).IsRequired();
	entity.HasOne(translation => translation.Language)
		.WithMany()
		.HasForeignKey(translation => translation.LanguageCode)
		.OnDelete(DeleteBehavior.Restrict);
});
```

Kategori ve ürün çevirilerinde aynı desen kullanılır; kategori çevirisindeki metin sınırları ürün çevirisinden farklıdır. `Product` ayrıca `Price` için `numeric(12, 2)` hassasiyeti, SKU için benzersiz indeks ve kategori yabancı anahtarı tanımlar. EF modelinde kuralları açıkça eşlemek, tablo adlandırması, bütünlük ve migration farklarının kod incelemesinde görülebilmesini sağlar.

Uygulama yazma ve okuma yollarını ayırır:

- **Yazma: EF Core.** `ProductService` yeni ürünü ve seçilmiş dildeki çevirisini tek graph olarak ekler. Güncellemede ortak ürün alanlarını günceller; seçilen dilin çevirisini bulup değiştirir veya yoksa ekler. `CategoryService` ise kategoriyle birlikte üç desteklenen dil için çevirileri doğrular ve kaydeder. Her iki servis de `SaveChangesAsync` kullanır.
- **Okuma: Dapper.** Liste ve detay sorguları parametreli SQL ile `NpgsqlDataSource` üzerinden çalışır. Listelerde seçilen dilin çevirisi `LEFT JOIN` edilir; çeviri yoksa satır yine döner ve yerelleştirilmiş değer null kalabilir. Otomatik dil yedeği uygulanmaz.

EF Core'un change tracking'i yüklenmiş entity'lerde hangi alanların değiştiğini takip eder. Dapper sorguları ise entity takibi oluşturmaz; SQL projeksiyonunu ve join'i açıkça belirlemek gerekir. İki yaklaşımı birlikte kullanmak geçerlidir, ancak sorgu ve yazma kurallarının iki ayrı erişim yolunda tutarlı kalması gerekir.

## Listeleme ve arama

Ürün API'si `languageCode` ile tüm ürünleri SKU'ya göre sıralı döndürür. Dapper sorgusu kategori ve istenen dildeki ürün çevirisini `LEFT JOIN` ile getirir. Web istemcisi dil değişince liste isteğini tekrar yapar; arama alanındaki filtre ise API çağrısından sonra tarayıcıda SKU, ürün adı ve kategori adına uygulanır. Açıklama arama kapsamına dahil değildir. Bu yaklaşım örnek veri için basittir, ancak her aramada veri tabanına yalnızca eşleşen satırları değil, tüm listeyi taşır; sayfalama da yoktur.

Veri büyüdüğünde API tarafında arama ve sayfalama eklenebilir. Örneğin parametreli bir sorgu yerelleştirilmiş satırı koruyarak SKU veya ada göre arayabilir:

```sql
select p.id, p.sku, p.price, pt.name
from products p
left join product_translations pt
  on pt.product_id = p.id and pt.language_code = @LanguageCode
where (@Pattern is null
	   or p.sku ilike @Pattern
	   or pt.name ilike @Pattern)
order by p.sku, p.id
limit @PageSize offset @Offset;
```

`@Pattern` gibi değerler parametre olarak aktarılmalı; sıralama alanı gibi SQL parçaları kullanıcı girdisinden doğrudan birleştirilmemelidir. Büyük offset'lerde keyset pagination (`sku`, `id` son görülen değerlerinden devam etme) daha kararlı olabilir. PostgreSQL'de `%terim%` araması için sıradan B-tree indeksi genellikle yeterli değildir; tam metin araması, prefix araması veya `pg_trgm` indeksi ihtiyaca göre karşılaştırılmalı, `EXPLAIN (ANALYZE, BUFFERS)` ile doğrulanmalıdır. İndeks yazma maliyetini de artırır.

## Ekleme ve güncelleme

Ürün oluşturma isteği ortak alanları (`sku`, `price`, `categoryId`) ve tek bir `languageCode` için çeviri alanlarını içerir. Servis dili ve kategori varlığını doğrular; entity ile çeviriyi birlikte ekleyip tek `SaveChangesAsync` çağrısı yapar. Ürün güncellemesi ortak alanları değiştirir ve sadece seçilen dilin çevirisini günceller veya yoksa ekler. Başka dillerdeki çeviriler bu akışta değiştirilmez.

Kategori oluşturma ve güncelleme akışı farklıdır: istek tam olarak `tr`, `en`, `fr` çevirilerini içermelidir. Güncelleme mevcut çevirileri yükler, istektekileri günceller veya ekler; istekteki her dilin verilmesi doğrulanır.

Bu davranış arayüzün düzenleme diline göre çalışır. Aynı ürün farklı dillerde eşzamanlı düzenlenirse her istek ortak SKU/fiyat/kategori alanlarını da yazdığı için son kayıt öncekinin ortak alan değişikliklerini ezebilir. Çok kullanıcılı kullanımda, alan bazlı güncelleme veya concurrency token ile çakışmayı algılama tercih edilebilir. Birden çok ayrı `SaveChangesAsync` çağrısına yayılan tek bir iş kuralı varsa, bütün adımların birlikte başarılı/başarısız olması için açık transaction değerlendirilmelidir.

## Silme: soft delete ve kalıcı silme

Mevcut `ProductService`, `CategoryService` ve endpoint gruplarında silme işlemi yoktur. Aşağıdaki seçenekler öneridir; uygulamanın mevcut davranışı değildir.

| Seçenek | Davranış | Uygun olduğu durumlar | Temel maliyet/risk |
|---|---|---|---|
| Soft delete (silindi olarak işaretleme) | Satır tutulur; örneğin `is_deleted` ve `deleted_at` güncellenir. | Geri alma, denetim izi veya ilişkili kayıtları koruma gerekiyorsa. | Okuma sorguları silinmiş satırları dışlamalı; benzersizlik ve geri yükleme kuralları tasarlanmalı. |
| Hard delete (kalıcı silme) | Satır veritabanından kaldırılır; yabancı anahtar kuralları uygulanır. | Veri saklama gereği yoksa ve silme kalıcı olmalıysa. | Geri alma/denetim daha zordur; yanlışlıkla silme kalıcı olabilir. |

Bu şemada hard delete edilen ürünün `product_translations` satırları cascade ile silinir. Kategorinin çevirileri de cascade ile silinir; ancak ürünler kategoriye `RESTRICT` ile bağlı olduğundan önce ürünlerin ilişkisinin çözülmesi veya ürünlerin silinmesi gerekir. Bu kısıtlar veritabanı bütünlüğünü korur; servis ve API'nin beklenen hata yanıtını ayrıca belirlemesi gerekir.

Soft delete'te satır silinmediği için cascade tetiklenmez ve çeviriler korunur. `is_deleted` alanı eklemek tek başına yeterli değildir: bu projedeki Dapper sorguları EF Core global query filter'larını kullanmadığından, her ilgili SQL sorgusunda etkin kayıt koşulu eklenmelidir. Ürün oluşturma ve güncellemede de silinmiş kategoriye bağlanma politikası açıkça kontrol edilmelidir. `sku` ve kategori `code` üzerindeki mevcut benzersizlik kısıtları silinmiş satırlarda da geçerli kalır; silinen değerin yeniden kullanımına izin verilecekse PostgreSQL partial unique index gibi bir kural ve buna uygun migration gerekir. Geri yükleme sırasında aynı SKU/code'un yeniden kullanılmış olma ihtimali de ele alınmalıdır.

Soft delete geri alma ve operasyonel iz sağlar; fakat mevzuat gereği verinin tamamen silinmesi gerekiyorsa tek başına yeterli olmayabilir. Hard delete ise ayrıcalıklı bir işlem, audit kaydı, onay veya saklama politikasıyla sınırlandırılabilir. API sözleşmesi arşivleme/geri yükleme ile kalıcı silmeyi açıkça ayırmalı; cascade etkisi kullanıcıya anlaşılır olmalıdır.

## Transaction ve deadlock yönetimi

Bu depodaki oluşturma/güncelleme akışları değişiklikleri bir `SaveChangesAsync` çağrısında kaydeder. PostgreSQL gibi transaction destekleyen sağlayıcılarda EF Core, tek bir `SaveChanges` işleminin değişikliklerini varsayılan olarak transaction içinde yürütür; hata olursa bu kayıt grubu tamamlanmış sayılmaz. Kategori varlığı gibi `SaveChangesAsync` öncesi yapılan kontroller aynı transaction'a dahil değildir. Aradaki yarış durumlarına karşı son sözü yabancı anahtar ve benzersiz kısıtlar söyler; servis beklenen veritabanı hatalarını uygun API yanıtlarına çevirmelidir.

Bir iş kuralı birden fazla `SaveChangesAsync` çağrısını veya EF Core ile Dapper üzerinden yapılan birden çok komutu tek atomik işlem olarak gerektiriyorsa açık transaction gerekir:

```csharp
await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);

// Birden fazla ilişkili veritabanı işlemi
await dbContext.SaveChangesAsync(cancellationToken);

await transaction.CommitAsync(cancellationToken);
```

Örnekteki gibi EF Core transaction'ı yalnızca o `DbContext` bağlantısındaki komutları kapsar. Bu projedeki Dapper sorguları `NpgsqlDataSource` üzerinden ayrı bağlantı açar; aynı atomik işleme dahil edilmeleri gerekiyorsa aynı `DbConnection` ve `DbTransaction` paylaşılmalı, Dapper komutuna transaction açıkça verilmelidir. Harici HTTP çağrıları veya kullanıcı etkileşimi transaction içinde bekletilmemelidir; transaction'ı kısa tutmak kilit süresini azaltır.

PostgreSQL varsayılan `READ COMMITTED` izolasyonunda çalışır. Transaction kullanmak tek başına kayıp güncellemeyi önlemez; eşzamanlı güncelleme önemliyse concurrency token, sürüm sütunu veya koşullu update ile çakışma algılanmalıdır. Deadlock riskini azaltmak için:

1. Aynı satırlara dokunan işlemlerde kaynakları tutarlı sırayla kilitleyin (ör. önce entity, ardından çeviri satırları).
2. Transaction içinde mümkün olduğunca az iş yapın; gereksiz okuma, kullanıcı/servis bekleme ve geniş taramalardan kaçının.
3. Filtre ve join koşullarına uygun indeksleri ölçümle seçin; gereksiz kilitlenen satır sayısını azaltın.
4. Deadlock veya serialization hatasında tüm atomik işlemi sınırlı sayıda, gecikme/jitter ile yeniden deneyin. PostgreSQL SQLSTATE `40P01` deadlock, `40001` serialization failure anlamına gelir. Yalnızca geçici hata sınıflarını yeniden deneyin; işlem yan etkileri idempotent olmalı veya tekrar güvenli hale getirilmelidir.

Retry ekleniyorsa yarım transaction'ı sürdürmek yerine tüm transaction birimi baştan çalıştırılmalıdır. EF Core sağlayıcı retry stratejisi kullanılıyorsa explicit transaction bu stratejinin yürütme bloğuna alınmalıdır. Bu depoda özel retry politikası veya çoklu komut transaction örneği bulunmuyor; bunlar üretim gereksinimine göre tasarlanmalıdır.

## Performans değerlendirmesi ve ölçüm

### Mevcut koddan görülebilenler

- Çeviri tablolarının bileşik birincil anahtarları `(entity_id, language_code)` aramasını destekler; `languages.code`, kategori `code` ve ürün `sku` için de anahtar/benzersiz indeks bulunur.
- Ürün listeleme sorgusu ürün, kategori ve seçilen dildeki çeviriyi tek SQL sorgusunda birleştirir. Dapper yanıt alanlarını doğrudan projekte eder; EF entity graph'ı yüklemez.
- Liste uç noktası tüm eşleşen kayıtları döndürür, sıralar ve sayfalama yapmaz. Arama tarayıcıda olduğundan liste hacmi büyüdükçe ağ yanıtı ve istemci belleği artar.
- `products.category_id` için `AppDbContext` içinde açık bir `HasIndex` çağrısı yoktur; ancak EF Core yabancı anahtar indeksi konvansiyonu nedeniyle model snapshot'ında bu kolon için indeks bulunur. PostgreSQL yabancı anahtar kolonuna kendiliğinden indeks eklemez. Bu indeksin sorgu planlarında kullanılıp kullanılmadığı ve maliyeti, gerçek iş yüküyle ölçülmelidir.
- Yazma tarafındaki `SaveChangesAsync` ve sorgu tarafındaki Dapper farklı kullanım ihtiyaçlarına göre seçilmiştir. Bu ayrım otomatik olarak daha hızlı olduğu anlamına gelmez; gerçek veri, bağlantı havuzu, SQL ve yük belirleyicidir.

Bu kaynak incelemesinden performans sonucu çıkarılamaz: depoda kıyaslama verisi veya benchmark sonucu yoktur. Aşağıdaki adımlar ölçüm planıdır, sonuç değildir.

### Tekrarlanabilir ölçüm planı

1. **Temsilî veri hazırlayın.** Ürün/kategori sayısı, çeviri başına dil kapsamı, eksik çeviri oranı ve SKU/ad dağılımını kaydedin. Test verisinin anonim veya sentetik olduğundan emin olun.
2. **Başlangıç değerlerini alın.** Aynı PostgreSQL ve .NET sürümünde API yanıt süresi (p50/p95), istek/saniye, hata oranı, dönen satır ve yanıt boyutu; uygulama CPU/bellek/GC; veritabanı CPU ve I/O değerlerini kaydedin. Soğuk ve ısınmış çalıştırmaları ayırın.
3. **Sorgu planını inceleyin.** Gerçek sorgu ve temsilî dil/değerlerle PostgreSQL'de `EXPLAIN (ANALYZE, BUFFERS)` kullanın. Örneğin:

   ```sql
   EXPLAIN (ANALYZE, BUFFERS)
   select p.id, p.sku, p.price, ct.name, pt.name
   from products p
   join categories c on c.id = p.category_id
   left join category_translations ct
	 on ct.category_id = c.id and ct.language_code = 'en'
   left join product_translations pt
	 on pt.product_id = p.id and pt.language_code = 'en'
   order by p.sku;
   ```

   `ANALYZE` sorguyu gerçekten çalıştırır. Üretimde maliyetli sorgular için önce staging veya benzer veriyle çalışın. Planın gerçek satır sayısı tahminlerini, tarama türlerini, buffer hit/read değerlerini ve toplam süreyi gözden geçirin.
4. **Tek değişkeni değiştirin.** Sayfalama, sunucu tarafı filtre, indeks stratejisi veya farklı sorgu şeklini tek tek deneyin. Örneğin mevcut `products.category_id` indeksinin plan üzerindeki etkisini inceleyin; bileşik indeks ancak sorgu deseni gerekçe sağlıyorsa deneyin. Aynı veri ve yük profiliyle önce/sonra karşılaştırın.
5. **Yük testini tekrarlayın.** Aynı endpoint, dil, arama terimi, eşzamanlılık ve test süresini kullanın. Sonuçları sürüm, veri hacmi, indeks seti ve yapılandırmayla birlikte saklayın; ortalama tek başına kuyruk gecikmesini gizleyebilir.

Ölçüm sonunda p95 gecikmesi veya veritabanı I/O'su baskınsa sorgu planı/indeksleri; ağ boyutu ya da istemci belleği baskınsa sayfalama ve sunucu tarafı arama önceliklendirilebilir. Önce ölçüm, sonra değişiklik, ardından aynı koşullarda yeniden ölçüm yapılmalıdır.

## Ne zaman bu model?

Entity başına çeviri tablosu, dil bağımlı alanların ayrı sorgulanmasına, çevrilmemiş dillerin eksik kalabilmesine ve ortak verinin tekrarlanmamasına uygundur. Karşılığında her dil için ek tablo, join ve çeviri yaşam döngüsünün yönetimi gelir. Tek bir dilde kullanılan küçük uygulamalarda ya da çeviri alanları sık değişen şemalarda JSON tabanlı yaklaşımlar da değerlendirilebilir; seçim sorgu, bütünlük ve indeks gereksinimleriyle yapılmalıdır.
