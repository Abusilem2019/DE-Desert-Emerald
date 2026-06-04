import { Router } from "express";
import { pool } from "@workspace/db";
import { DeSearchBody, DeSuggestQueryParams } from "@workspace/api-zod";

const router = Router();

// 1. القاموس القياسي والتصنيفات المهنية (Standard Taxonomy Mapping)
const TAXONOMY_ROUTES = [
  { pattern: /ميكانيكي|عفشه|سمكري|سيارات|بوجيهات|كاوتش|زيت/, category: 'Automotive_Services', table: 'unified_commercial' },
  { pattern: /سوبرماركت|ماركت|بقاله|بقال|مواد غذائية|البان/, category: 'Retail_Grocery', table: 'unified_commercial' },
  { pattern: /مطعم|اكل|كبابجي|حواوشي|بيتزا|كريب/, category: 'Food_And_Beverage', table: 'unified_commercial' },
  { pattern: /كافيه|مقهى|قهوه|كوفي شوب/, category: 'Cafes_And_Lounges', table: 'unified_commercial' },
  { pattern: /جمله|مورد|مخزن|تجار|توزيع/, category: 'Wholesale_And_Distribution', table: 'unified_commercial' },
  { pattern: /شحن|توصيل|لوجستي|نقل|مرسول/, category: 'Logistics_And_Delivery', table: 'unified_commercial' },
  { pattern: /محامي|محاماه|قانون|قضايا/, category: 'Legal_Services', table: 'unified_commercial' },
  { pattern: /صيدليه|اجزاخانه|دواء|صيدليات/, category: 'Pharmacy_Services', table: 'unified_pharmacies' },
  { pattern: /عياده|مركز طبي|دكتور|طبيب|مستوصف|اسنان|جلديه|ليزر/, category: 'Medical_Clinics', table: 'unified_clinics' },
  { pattern: /مستشفي|رعايه مركزه|طوارئ/, category: 'Hospitals_And_Care', table: 'unified_hospitals' }
];

function normalizeText(text: string): string {
  return text
    .replace(/[أإآا]/g, "ا")
    .replace(/[يى]/g, "ي")
    .replace(/ة/g, "ه")
    .toLowerCase()
    .trim();
}

// 2. مهندس الردود القومية والذكية (Smart Response Formatter)
function buildNationalAnswer(
  query: string, 
  count: number, 
  results: any[], 
  expandedAreas: string[] = []
): string {
  if (count === 0) {
    return `🕵️‍♂️ عذراً، بحثنا بدقة في سجلات المنظومة ولم نجد نتائج مباشرة لـ "${query}". يرجى محاولة استخدام كلمات أو تخصصات مختلفة.`;
  }

  const top = results[0];
  const targetCategory = top.category || top.specialty || "نشاط تجاري/خدمي";
  const area = top.area || top.address || "غير محدد";

  let intro = `📊 **بيانات المنظومة القومية:** عثرنا على **${count}** مقراً موثقاً مطابقاً لبحثك.\n`;
  
  if (expandedAreas.length > 0) {
    intro = `💡 **توسيع النطاق الجغرافي:** نظراً لعدم توفر نتائج كافية في النطاق المطلوب، قمنا بتوسيع دائرة البحث آلياً لتشمل المناطق المجاورة: (${expandedAreas.join('، ')}).\n\n` + intro;
  }

  intro += `🎯 **أفضل ترشيح موثق لك:**\n`;
  let entityDetails = `🏢 **الاسم:** ${top.name}\n🛠️ **التصنيف:** ${targetCategory}\n📍 **العنوان:** ${area} ${top.address && top.address !== area ? '- ' + top.address : ''}\n`;
  
  if (top.doctor) {
    entityDetails += `👨‍⚕️ **المدير/المشرف:** ${top.doctor}\n`;
  }

  if (top.phone && top.phone !== '-' && top.phone !== '') {
    entityDetails += `📞 **هاتف التواصل:** ${top.phone}\n`;
  } else {
    entityDetails += `⚠️ **حالة الهاتف:** غير مسجل رسمياً في السجلات الحالية.\n`;
  }

  if (top.whatsapp && top.whatsapp !== '-' && top.whatsapp !== '') {
    entityDetails += `💬 **واتساب الأعمال:** ${top.whatsapp}\n`;
  }

  return `${intro}${entityDetails}\n✨ *تم استخراج هذه البيانات عبر محرك الفلترة والتصنيف الموحد لدعم أعمالك.*`;
}

// 3. مسار البحث الرئيسي (Main Search API)
router.post("/de/search", async (req, res) => {
  const parsed = DeSearchBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request formatting" });
    return;
  }

  let { query, region, limit = 20 } = parsed.data;
  const normQuery = normalizeText(query);
  const safeLimit = Math.min(limit ?? 20, 50);

  // تحليل النية (Intent Analysis) لتحديد الجدول المستهدف
  let targetTable = null;
  let targetCategory = null;

  for (const rule of TAXONOMY_ROUTES) {
    if (rule.pattern.test(normQuery)) {
      targetTable = rule.table;
      targetCategory = rule.category;
      break;
    }
  }

  let expandedAreasUsed: string[] = [];
  let results: any[] = [];
  let totalCount = 0;

  // دالة البحث الديناميكية الداعمة للاستعلام الآمن
  async function executeDatabaseSearch(targetAreas: string[]) {
    let sqlQuery = "";
    let params: any[] = [];
    let paramIndex = 1;

    const baseSelect = `SELECT id, name, category, specialty, address, area, phone, whatsapp, doctor, source_table`;
    const orderClause = `ORDER BY CASE WHEN phone IS NOT NULL AND phone != '' THEN 0 ELSE 1 END LIMIT $1`;
    params.push(safeLimit);
    paramIndex++;

    const areaCondition = targetAreas.length > 0 
      ? `AND (${targetAreas.map((_, i) => `area ILIKE $${paramIndex + i} OR address ILIKE $${paramIndex + i}`).join(' OR ')})` 
      : "";
    
    if (targetAreas.length > 0) {
      targetAreas.forEach(area => {
        params.push(`%${area}%`);
        params.push(`%${area}%`);
      });
      paramIndex += (targetAreas.length * 2);
    }

    let keywordCondition = "";
    if (normQuery) {
      keywordCondition = `AND (name ILIKE $${paramIndex} OR specialty ILIKE $${paramIndex} OR category ILIKE $${paramIndex})`;
      params.push(`%${targetCategory || normQuery}%`);
      paramIndex++;
    }

    if (targetTable) {
      // بحث موجه بدقة لجدول معين بناءً على التصنيف
      sqlQuery = `${baseSelect} FROM ${targetTable} WHERE 1=1 ${areaCondition} ${keywordCondition} ${orderClause}`;
    } else {
      // بحث شامل (Hybrid Fallback) في حالة النية العامة المجهولة
      const tables = ['unified_commercial', 'unified_clinics', 'unified_pharmacies'];
      const unionQueries = tables.map(t => `SELECT id, name, category, specialty, address, area, phone, whatsapp, doctor, source_table FROM ${t} WHERE 1=1 ${areaCondition} ${keywordCondition}`);
      sqlQuery = `SELECT * FROM (${unionQueries.join(' UNION ALL ')}) AS combined_results ${orderClause}`;
    }

    const dataResult = await pool.query(sqlQuery, params);
    return { count: dataResult.rowCount || 0, rows: dataResult.rows };
  }

  try {
    // المحاولة الأولى: النطاق الجغرافي المباشر
    const initialAreas = region ? [region] : [];
    let searchAttempt = await executeDatabaseSearch(initialAreas);
    totalCount = searchAttempt.count;
    results = searchAttempt.rows;

    // التمدد الجغرافي الذكي (Geographic Expansion)
    if (totalCount === 0 && region) {
      const geoResult = await pool.query(
        `SELECT adjacent_area FROM geographic_relations WHERE primary_area ILIKE $1`,
        [`%${region}%`]
      );

      if (geoResult.rows.length > 0) {
        const neighbors = geoResult.rows.map(r => r.adjacent_area);
        expandedAreasUsed = neighbors;
        
        searchAttempt = await executeDatabaseSearch(neighbors);
        totalCount = searchAttempt.count;
        results = searchAttempt.rows;
      }
    }

    const smartAnswer = buildNationalAnswer(query, totalCount, results, expandedAreasUsed);
    res.json({ results, total: totalCount, query, answer: smartAnswer });

  } catch (error) {
    req.log.error({ err: error }, "System encountered an error during search execution");
    res.status(500).json({ error: "Search Execution Failed" });
  }
});

export default router;
