import sqlite3
import re

DB_PATH = "../Titan_Main_System/Titan_Unified_PROD_CLEAN_2026.db"

# قاموس فك التشفير الجغرافي للشارع المصري (كلمات مفتاحية متوقعة في العنوان -> المنطقة، المحافظة)
GEO_KEYWORDS = [
    # الجيزة وضواحيها
    (r"فيصل|العشرين|العشرين من فيصل|المساحه|العريش|حسن محمد|الطالبية", "فيصل", "الجيزة"),
    (r"الهرم|المطبعه|مشعل|التعاون|الاربعين", "الهرم", "الجيزة"),
    (r"بولاق|بولاق الدكرور|شوربجي|ناهيا", "بولاق الدكرور", "الجيزة"),
    (r"العمرانيه|ترسا|ساقية مكي", "العمرانية", "الجيزة"),
    (r"الدقي|بين السرايات|التحرير", "الدقي", "الجيزة"),
    (r"المهندسين|جامعة الدول|جزيرة العرب|لبنان", "المهندسين", "الجيزة"),
    (r"امبابه|المنيرة|القومية", "إمبابة", "الجيزة"),
    (r"اكتوبر|6 اكتوبر|الشيخ زايد|الحي المتميز|الحي السابع", "6 أكتوبر", "الجيزة"),
    (r"المعادي|زهراء المعادي|ثكنات المعادي|حدائق المعادي|دجلة", "المعادي", "القاهرة"),
    
    # القاهرة وضواحيها
    (r"مصر الجديده|روكسي|الكوربة|تريامف|النزهه|شيراتون", "مصر الجديدة", "القاهرة"),
    (r"مدينة نصر|عباس العقاد|مكرم عبيد|مصطفى النحاس|الحي الثامن", "مدينة نصر", "القاهرة"),
    (r"التجمع|الخامس|التجمع الخامس|النرجس|الياسمين|القاهره الجديده", "القاهرة الجديدة", "القاهرة"),
    (r"حلوان|المعصره|حدائق حلوان", "حلوان", "القاهرة"),
    (r"شبرا|شبرا مصر|شبرا الخيمة|الخلفاوي|دوران شبرا", "شبرا", "القاهرة")
]

def normalize(text):
    if not text: return ""
    text = re.sub(r'[أإآا]', 'ا', text)
    text = re.sub(r'[يى]', 'ي', text)
    text = re.sub(r'ة', 'ه', text)
    return text.strip()

def fix_missing_areas():
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        tables_to_fix = ["unified_commercial", "unified_clinics"]
        
        print("🚀 [بدء معركة الفرز]: جاري فحص وتفكيك عناوين الكاميرا المصورة...")
        
        for table in tables_to_fix:
            print(f"\n📊 فحص جدول [{table}]...")
            
            # جلب الصفوف التي تكون فيها خانة المنطقة فارغة أو غير محددة
            cursor.execute(f"SELECT id, address FROM {table} WHERE area IS NULL OR area = '' OR area = 'غير محدد';")
            rows = cursor.fetchall()
            print(f"🔍 وجدنا {len(rows)} صف يحتاج إلى إعادة هيكلة وتحليل جغرافي.")
            
            updates_count = 0
            for row in rows:
                row_id, address = row
                if not address: continue
                
                norm_address = normalize(address)
                detected_area = None
                detected_gov = None
                
                # مطابقة القاموس الجغرافي الذكي
                for pattern, area_name, gov_name in GEO_KEYWORDS:
                    if re.search(pattern, norm_address):
                        detected_area = area_name
                        detected_gov = gov_name
                        break
                
                # إذا لقطنا المنطقة، نقوم بتحديث السجل فوراً
                if detected_area:
                    cursor.execute(
                        f"UPDATE {table} SET area = ?, classified_by = 'DE_Smart_Parser' WHERE id = ?;",
                        (detected_area, row_id)
                    )
                    updates_count += 1
            
            print(f"✅ تم إنقاذ وحقن {updates_count} سجل بنجاح بالمنطقة الصحيحة آلياً!")
            
        conn.commit()
        print("\n✨ [المرحلة 1 اكتملت]: تم حفظ التعديلات وتثبيت جغرافية الشارع المصري في قاعدة البيانات.")
        
    except Exception as e:
        print(f"❌ حدث خطأ أثناء تصفية البيانات: {e}")
    finally:
        if 'conn' in locals(): conn.close()

if __name__ == "__main__":
    fix_missing_areas()
