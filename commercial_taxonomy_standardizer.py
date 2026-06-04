import sqlite3
import re

DB_PATH = "../Titan_Main_System/Titan_Unified_PROD_CLEAN_2026.db"

# قاموس التصنيف القياسي الرسمي (Standard Taxonomy Mapping)
# يحول الكلمات الدارجة في الشارع إلى تصنيفات مهنية وتجارية قانونية ورسمية
TAXONOMY_RULES = [
    (r"ميكانيكي|عفشه|سمكري|بوجيهات|رادياتير|كاوتش|زيت سيارات|غيار", "Automotive_Services"),
    (r"سوبرماركت|ماركت|بقاله|بقال|مواد غذائية|البان|ماركت", "Retail_Grocery"),
    (r"مطعم|اكل|كبابجي|حواوشي|بيتزا|كريب|فول وفلافل", "Food_And_Beverage"),
    (r"كافيه|مقهى|قهوه|كوفي شوب", "Cafes_And_Lounges"),
    (r"جمله|مورد|مخزن|تجار جملة|توزيع", "Wholesale_And_Distribution"),
    (r"شحن|توصيل|لوجستي|نقل بضائع|مرسول", "Logistics_And_Delivery"),
    (r"محامي|محاماه|استشارات قانونية|قضايا", "Legal_Services"),
    (r"صيدليه|اجزاخانه|دواء|صيدليات", "Pharmacy_Services"),
    (r"عياده|مستشفي|مركز طبي|دكتور|طبيب|مستوصف", "Medical_Clinics")
]

def normalize_text(text):
    if not text: return ""
    text = re.sub(r'[أإآا]', 'ا', text)
    text = re.sub(r'[يى]', 'ي', text)
    text = re.sub(r'ة', 'ه', text)
    return text.strip().lower()

def standardize_commercial_data():
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        tables = ["unified_commercial", "unified_clinics"]
        print("📊 [System Progress]: Starting System Taxonomy Standardization Process...")
        
        for table in tables:
            # جلب السجلات لقراءة الاسم والتخصص والعنوان لتحديد التصنيف بدقة
            cursor.execute(f"SELECT id, name, category, specialty FROM {table};")
            rows = cursor.fetchall()
            
            updated_records = 0
            for row in rows:
                row_id, name, cat, spec = row
                
                # دمج النصوص المتاحة للبحث في سياق النشاط بالكامل
                full_context = normalize_text(f"{name or ''} {cat or ''} {spec or ''}")
                matched_category = None
                
                for pattern, standard_name in TAXONOMY_RULES:
                    if re.search(pattern, full_context):
                        matched_category = standard_name
                        break
                
                # تحديث خانة التصنيف إذا تم العثور على مطابقة قياسية
                if matched_category:
                    cursor.execute(
                        f"UPDATE {table} SET category = ?, classified_by = 'Core_Taxonomy_Normalizer' WHERE id = ?;",
                        (matched_category, row_id)
                    )
                    updated_records += 1
                    
            print(f"✅ Table [{table}]: Successfully standardized {updated_records} records to official industrial categories.")
            
        conn.commit()
        print("\n✨ [Success]: Database Taxonomy Standardization completed cleanly.")
        
    except Exception as e:
        print(f"❌ [Error] Failed to execute database update: {e}")
    finally:
        if 'conn' in locals(): conn.close()

if __name__ == "__main__":
    standardize_commercial_data()
